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
import requests
import csv
# for compressed storage in mongo
import base64
import zlib

###############################################################################
# App initialization
###############################################################################

app = Flask(__name__, static_url_path='/', static_folder='')
auth_token = os.getenv('AUTH_TOKEN').strip() # fix bug relating to trailing
mongo_uri = os.getenv('MONGODB_URI').strip() # whitespace on env variables
db_name = os.getenv('MONGODB_NAME').strip()
db = None

# Whether to anonymize data
# Will always be true in production
ANONYMIZE = (os.getenv('ANONYMIZE').strip() == '1')
# Running environment
RUNNING_ENVIRONMENT = os.getenv('RUNNING_ENVIRONMENT').strip()


# if we are running in a heroku environment, or have a shared db, connect to that
if (mongo_uri):
    with app.app_context():
        assert db_name is not None # I'll eat a sock if this throws an error
        db = MongoClient(mongo_uri)[db_name]
# # else try to connect to local mongo instance
# else:
# with app.app_context():
#     db = PyMongo(app).db

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
    if (RUNNING_ENVIRONMENT == 'development'): # disabling data in prod for now
        mydata = db.fbdata.find()
        namedata = db.namedata.find({}, {'_id': False})
        # grab our data
        if (mydata.count()):
            data = decompress_data(mydata[0]['data'])
            scrapedata = dict()
            for i in namedata:
                scrapedata[i['id']] = i

            return make_response(json.dumps(
                {
                    'data': data,
                    'updated_time': mydata[0]['updated_time'],
                    'namedata': scrapedata
                }, default=json_util.default),
                200, {'ContentType': 'application/json'})

    # something is wrong - database may be uninitialized or corrupted, requires sysadmin intervention
    return make_response(json.dumps({'error': 'An error occurred fetching data'}), 404, {'ContentType': 'application/json'})


# preliminary check to first return data immediately
# will return an update token if data needs to be updated
# program is then intended to make a call to data-refresh
@app.route('/get_data', methods=['GET'])
def get_data():
    field = request.args.get('field')
    mydata = db.results.find({'title': field}, {'_id': False})
    # grab our data
    if (mydata.count()):
        return make_response(json.dumps(mydata[0], default=json_util.default),
            200, {'ContentType': 'application/json'})

    # something is wrong - database may be uninitialized or corrupted, requires sysadmin intervention
    return make_response(json.dumps({'error': 'An error occurred fetching data'}), 404, {'ContentType': 'application/json'})


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
    app.run(host='0.0.0.0', port=5000, debug=True or (RUNNING_ENVIRONMENT != "production"))
