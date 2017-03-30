###############################################################################
# Dependencies
###############################################################################

from flask import Flask, request, send_from_directory, make_response, stream_with_context, Response
from flask.ext.pymongo import PyMongo, MongoClient
from bson.objectid import ObjectId # solve bug: string ID =/= object ID
from bson import json_util

import sys
import json
import pprint
import os
import requests
import csv
# for compressed storage in mongo
import base64
import zlib
# for handling time
import datetime
import pytz
from dateutil import parser
from copy import deepcopy

###############################################################################
# App initialization
###############################################################################

app = Flask(__name__, static_url_path='/', static_folder='')
auth_token = os.getenv('AUTH_TOKEN').strip() # fix bug relating to trailing
mongo_uri = os.getenv('MONGODB_URI').strip() # whitespace on env variables
db_name = os.getenv('MONGODB_NAME').strip()
db = None

# TODO FIX FOR DEBUGGING PURPOSES
# this is in seconds
TIME_TO_STALE = 60 # 600 seconds / 10 minutes before data becomes stale
# prevent multiple calls to refresh data - return a helpful notice to clients
# requesting fresh data while the refresh is locked
DATA_REFRESH_LOCK = 0
# facebook gives 25 items in pagination
FB_LIMIT = 25
# standard dictionary for tallying Facebook reactions
# TODO handle additional cases
REACTION_DICT = {'LIKE': 0, 'LOVE': 0, 'HAHA': 0, 'WOW': 0, 'SAD': 0, 'ANGRY': 0}
# Timezone pre-allocations
TZ_US_EASTERN = pytz.timezone('US/Eastern')
# Whether to anonymize data
# Will always be true in production
ANONYMIZE = (os.getenv('ANONYMIZE').strip() == '1')
# Running environment
RUNNING_ENVIRONMENT = os.getenv('RUNNING_ENVIRONMENT').strip()


# if we are running in a heroku environment, or have a shared db, connect to that
if (mongo_uri and RUNNING_ENVIRONMENT == 'production'):
    with app.app_context():
        assert db_name is not None # I'll eat a sock if this throws an error
        db = MongoClient(mongo_uri)[db_name]
# else try to connect to local mongo instance
else:
    with app.app_context():
        db = PyMongo(app).db

###############################################################################
# Resource access definitions
###############################################################################

@app.route('/', methods=['GET'])
def index():
    sys.stdout.flush() # debugging heroku issue where stdout is buffered
    return app.send_static_file('static/index.html')


@app.route('/js/<path:path>', methods=['GET'])
def send_js(path):
    return send_from_directory('js', path)


@app.route('/css/<path:path>', methods=['GET'])
def send_css(path):
    return send_from_directory('css', path)


###############################################################################
# Data management definitions
###############################################################################

# preliminary check to first return data immediately
# will return an update token if data needs to be updated
# program is then intended to make a call to data-refresh
@app.route('/data-check', methods=['GET'])
def check_data():
    global DATA_REFRESH_LOCK
    retry = (request.args.get('retry') or False)
    print request.args.get('retry')
    print str(retry)

    # don't send data if this is a retry and we are still fetching data
    if (retry and DATA_REFRESH_LOCK):
        return make_response(json.dumps(
            {
                'stale': '1'
            }, default=json_util.default),
            200, {'ContentType': 'application/json'})

    mydata = db.fbdata.find()
    # if we have a recorded previous update time...
    if (mydata.count()):
        # double-check to make sure we have the proper key in the DB response
        if 'updated_time' in mydata[0]:
            # check to see if data is stale
            # I understand this is convoluted, and I should be using unix time instead, but I'm sick
            # of reading documentation on timestamps and want to move on
            # This will cause data-staleness at daylight savings time
            # Like come on, a 1/3760 failure rate is pretty forgivable

            data = decompress_data(mydata[0]['data'])

            # data is not stale
            if (datetime.datetime.now() - parser.parse(mydata[0]['updated_time'])).total_seconds() < TIME_TO_STALE:
                return make_response(json.dumps(
                    {
                        'data': data,
                        'updated_time': mydata[0]['updated_time'],
                        'stale': '0'
                    }, default=json_util.default),
                    200, {'ContentType': 'application/json'})
            # data is stale, send a hint to client so it can wait a backoff time and make a new request
            else:
                if RUNNING_ENVIRONMENT == 'development':
                    write_to_csv(json.loads(data))
                return make_response(json.dumps(
                    {
                        'data': data,
                        'updated_time': mydata[0]['updated_time'],
                        'stale': '1'
                    }, default=json_util.default),
                    200, {'ContentType': 'application/json'})

    # something is wrong - database may be uninitialized or corrupted, requires sysadmin intervention
    return make_response(json.dumps({'error': 'An error occurred fetching data'}), 404, {'ContentType': 'application/json'})


# initiate a request to get new data or notify server of busy state
@app.route('/data-refresh', methods=['GET'])
def refresh_data():
    global DATA_REFRESH_LOCK
    print str(DATA_REFRESH_LOCK)
    # avoid refreshing data multiple times, running into race conditions
    if (DATA_REFRESH_LOCK):
        return make_response(json.dumps({'lock': '1', 'error': 'Server is busy fetching data'}),
                             202, {'ContentType': 'application/json'})
    else:
        DATA_REFRESH_LOCK = 1

        return Response(stream_with_context(fetch_data()))


###############################################################################
# API access and parsing
###############################################################################

# fetch data from FB
# TODO complete the fetch by using the cursors
# TODO reset the expiry timer
# TODO add a retry in case of failures
# TODO send partial data to the users in chunks? maybe? worth it? it does take a while to refresh data
"""
    perhaps I can send the old data to the users while initiating the request for
    new data on the backend, ensuring via locks that only one request is initiated at
    a time. don't store data in the DB until it's all there.
    find a way to invalidate cache is also useful
"""
def fetch_data():
    url_to_get = "https://graph.facebook.com/v2.8/1850066501928133/feed?fields=id,type,from,link,message,message_tags,name,object_id,picture,status_type,story,updated_time,created_time,comments.limit(50){id,from,like_count,message,message_tags},reactions.limit(500){id,name,type},full_picture,parent_id,attachments{url,type,description,media}&limit=50&access_token=" + auth_token
    # url_to_get = ("https://graph.facebook.com/v2.8/1850066501928133/feed?fields="
    #               "id,type,from,link,message,message_tags,name,object_id,picture,"
    #               "status_type,story,updated_time,created_time,comments{id,from,"
    #               "like_count,message,message_tags},reactions{id,name,type},"
    #               "full_picture,parent_id,attachments{url,type,description,media}"
    #               "&access_token=") + auth_token
    data = None
    posts = None
    print url_to_get
    # try:
    print 'making a request'
    response = requests.get(url_to_get)
    print response

    if (response.ok):
        posters = dict()
        posters['num_posters'] = 0 # storing length here to avoid 1500+ lookups
        fields = ['comments', 'reactions']
        data = json.loads(response.text)
        posts = data['data']
        posts_fully_loaded = 0 # start index for depth-loading operations
        n_posts = len(posts) # end index
        yield '{"data":['
        while (n_posts != posts_fully_loaded):
            print n_posts
            print posts_fully_loaded
            # new method: load full data for an individual post, then yield it, and then load more when we need to
            for i in xrange(posts_fully_loaded, n_posts):
                load_likes_for_post(posts[i])
                if (ANONYMIZE):
                    anonymize_post(posts[i], posters_dict)
                preprocess_post(posts[i])
                yield json.dumps(posts[i], default=json_util.default).decode('utf-8')
                yield ','

            print posts[n_posts - 1]
            load_more_posts(data, posts)
            posts_fully_loaded = n_posts
            n_posts = len(posts)

        yield '],'

        data_string = json.dumps(posts, default=json_util.default)
        to_insert = {
            'updated_time': str(datetime.datetime.now()),
            'data': compress_data(data_string),
        }
        # either insert new data or update old if it exists
        # try to minimize db size by replacing old data
        db.fbdata.update({},
                         {'$set': to_insert},
                         upsert=True)
        yield '"updated_time": "' + to_insert['updated_time'] + '"}'

    else:
        yield '{"error":"something went wrong"}'

    DATA_REFRESH_LOCK = 0
    print 'done'


def preprocess_post(post):
    fields = ['comments', 'reactions']
    if 'created_time' in post:
        post['created_time'] = str(parser.parse(post['created_time']).astimezone(TZ_US_EASTERN))
    # remove pagination fields from related entries
    for field in fields:
        if field in post:
            if 'paging' in post[field]:
                del post[field]['paging']

# loads all posts by using the pagination cursor
# posts is an empty object modified by this function
def load_more_posts(myData, posts):
    print 'loading more posts'
    if ('paging' in myData and 'next' in myData['paging']):
        print 'found more to load'
        response = requests.get(myData['paging']['next'])
        newData = json.loads(response.text)
        if 'data' not in newData: # response is bad, may need new token
            print "Something went wrong while loading new response"
            print response
        posts += newData['data']
        if 'paging' not in newData:
            print newData
            del myData['paging']
        else:
            myData['paging'] = newData['paging']


# convoluted method of loading likes for a post using the pagination object
# post_object is a single post modified by this function
def load_likes_for_post(post_object):
    global REACTION_DICT
    call_count = 0
    reactions = deepcopy(REACTION_DICT)

    # catch posts which have no reactions
    if 'reactions' not in post_object:
        post_object['reaction_data'] = reactions
        post_object['total_reactions'] = 0
        return

    reactions_object = post_object['reactions']
    total_reactions = len(reactions_object['data'])

    # increment the reaction count for each reaction object we find
    for r in reactions_object['data']:
        reactions[r['type']] += 1

    # fetch the rest of the reactions from facebook
    while ('next' in reactions_object['paging']):
        call_count += 1 # for debugging purposes
        # get the next 25 reactions
        response = requests.get(reactions_object['paging']['next'])
        # load the JSON
        reactions_object = json.loads(response.text)
        # handle errors
        if 'data' not in reactions_object: # response is bad, may need new token
            print "Something went wrong while loading new response"
            print response
            break
        # with no errors, we can safely add our new data to the total counts
        total_reactions += len(reactions_object['data'])
        post_object['reactions']['data'] += reactions_object['data']
        for r in reactions_object['data']:
            reactions[r['type']] += 1
        # handle another error
        if 'paging' not in reactions_object:
            print reactions_object
            break

    # store our counts along with our post
    post_object['reaction_data'] = reactions
    post_object['total_reactions'] = total_reactions


def compress_data(data):
    return base64.b64encode(zlib.compress(data))


def decompress_data(data_string):
    return zlib.decompress(base64.b64decode(data_string))


# if we're going to make interactive visualizations we will need to expose the data
#   to the client-side, which is dangerous without first anonymizing it
def anonymize_post(d, posters):
    if 'comments' in d:
        del d['comments'] # TODO whenever I get around to adding comments, fix this
    if 'message_tags' in d:
        del d['message_tags']
    # anonymize poster names while keeping references intact
    # turns out that IDs are actually scoped within groups, so it is safe to leave IDs
    #   since the only people who can cross-reference them would already have access to
    #   all the data, not just this data that I'm getting
    d['from']['name'] = 'Private'
    # however I wouldn't want people to be able to cross-reference posters with the posts
    #   they've liked so easily, so let's make that more anonymous by using serial IDs
    from_id = d['from']['id']
    if from_id in posters:
        d['from']['id'] = posters[from_id]
    else:
        posters[from_id] = posters['num_posters']
        d['from']['id'] = posters['num_posters']
        posters['num_posters'] += 1
    # anonymize reactions
    if ('reactions' in d and 'data' in d['reactions']):
        for r in d['reactions']['data']:
            r['name'] = 'Private'


def write_to_csv(data):
    with open('post_data.csv', 'w') as f:
        for d in data:
            if 'attachments' in d:
                del d['attachments']
            if 'comments' in d:
                del d['comments']
            if 'from' in d:
                d['from'] = d['from']['name']
            if 'reactions' in d:
                del d['reactions']
            if 'reaction_data' in d:
                for r_type in d['reaction_data']:
                    d[r_type] = d['reaction_data'][r_type]
                del d['reaction_data']
            if 'message_tags' in d:
                del d['message_tags']
            if 'story' in d:
                del d['story']
            if 'name' in d:
                del d['name']
            if 'parent_id' in d:
                del d['parent_id']

        print data[0]
        dw = csv.DictWriter(f, data[0].keys())
        dw.writeheader()
        for d in data:
            for field in d:
                if isinstance(d[field], basestring):
                    d[field] = d[field].encode('utf-8')
                else:
                    d[field] = str(d[field])
            dw.writerow(d)




###############################################################################
# Misc.
###############################################################################

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
