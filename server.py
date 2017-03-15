###############################################################################
# Dependencies
###############################################################################

from flask import Flask, request, send_from_directory, make_response
from flask.ext.pymongo import PyMongo, MongoClient
from bson.objectid import ObjectId # solve bug: string ID =/= object ID
from bson import json_util

import sys
import json
import pprint
import os
import datetime
import requests
import base64
import zlib
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
TIME_TO_STALE = 600000 # 600 seconds / 10 minutes before data becomes stale
# prevent multiple calls to refresh data - return a helpful notice to clients
# requesting fresh data while the refresh is locked
DATA_REFRESH_LOCK = 0
# facebook gives 25 items in pagination
FB_LIMIT = 25
# standard dictionary for tallying Facebook reactions
# TODO handle additional cases
REACTION_DICT = {'LIKE': 0, 'LOVE': 0, 'HAHA': 0, 'WOW': 0, 'SAD': 0, 'ANGRY': 0}


# if we are running in a heroku environment, or have a shared db, connect to that
if (mongo_uri):
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
        new_data = fetch_data()
        data_string = json.dumps(new_data, default=json_util.default)
        if (new_data):
            to_insert = {
                'updated_time': str(datetime.datetime.now()),
                'data': compress_data(data_string)
            }
            # either insert new data or update old if it exists
            # try to minimize db size by replacing old data
            db.fbdata.update({},
                             {'$set': to_insert},
                             upsert=True)
            DATA_REFRESH_LOCK = 0
            return make_response(json.dumps(
                {
                    'data': data_string,
                    'updated_time': to_insert['updated_time']
                }, default=json_util.default),
                200, {'ContentType': 'application/json'})
        # welp, something went wrong
        else:
            DATA_REFRESH_LOCK = 0
            return make_response(json.dumps({'error': 'An error occurred fetching data'}), 404, {'ContentType': 'application/json'})


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
    posts = []
    print url_to_get
    # try:
    print 'making a request'
    response = requests.get(url_to_get)
    print response
    assert response.ok
    data = json.loads(response.text)
    load_all_posts(posts, data)
    load_likes_for_all_posts(posts, 0)
    clean_posts_of_tokens(posts)
    # except:
        # print 'An error occurred'
        # print sys.exc_info()

    print posts[0]
    print

    return posts


# removes pagination links, which contain access tokens, which is no bueno
def clean_posts_of_tokens(posts):
    fields = ['comments', 'reactions']
    for post in posts:
        for field in fields:
            if field in post:
                if 'paging' in post[field]:
                    if 'next' in post[field]['paging']:
                        post[field]['paging']['next'] = ''
                    if 'previous' in post[field]['paging']:
                        post[field]['paging']['previous'] = ''

# loads all posts by using the pagination cursor
# posts is an empty object modified by this function
def load_all_posts(posts, myData):
    print 'loading all posts'
    print myData['data'][0]
    posts += myData['data']
    call_count = 0
    while ('next' in myData['paging']):
        call_count += 1
        print call_count
        response = requests.get(myData['paging']['next'])
        myData = json.loads(response.text)
        if 'data' not in myData: # response is bad, may need new token
            print "Something went wrong while loading new response"
            print response
            break
        posts += myData['data']
        if 'paging' not in myData:
            print myData
            break


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
        for r in reactions_object['data']:
            reactions[r['type']] += 1
        # handle another error
        if 'paging' not in reactions_object:
            print reactions_object
            break

    print call_count
    # store our counts along with our post
    post_object['reaction_data'] = reactions
    post_object['total_reactions'] = total_reactions


# Load likes for all posts given post object and starting index
# TODO figure out how to run these in parallel
def load_likes_for_all_posts(posts, start_index=0):
    for i, p in enumerate(posts):
        if (i < start_index):
            continue
        print "Post #" + str(i + 1)
        load_likes_for_post(p)


def compress_data(data):
    return base64.b64encode(zlib.compress(data))


def decompress_data(data_string):
    return zlib.decompress(base64.b64decode(data_string))




###############################################################################
# Misc.
###############################################################################

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
