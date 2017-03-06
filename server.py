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
from dateutil import parser

app = Flask(__name__, static_url_path='/', static_folder='')
auth_token = os.getenv('AUTH_TOKEN').strip() # fix bug relating to trailing
mongo_uri = os.getenv('MONGODB_URI').strip() # whitespace on env variables
db_name = os.getenv('MONGODB_NAME').strip()
db = None

# TODO FIX FOR DEBUGGING PURPOSES
TIME_TO_STALE = 1 # 10 minutes before data becomes stale


# if we are running in a heroku environment, or have a shared db, connect to that
if (mongo_uri):
    with app.app_context():
        assert db_name is not None # I'll eat a sock if this throws an error
        db = MongoClient(mongo_uri)[db_name]
# else try to connect to local mongo instance
else:
    with app.app_context():
        db = PyMongo(app).db


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


@app.route('/data-refresh', methods=['GET'])
def refresh_data():
    mydata = db.fbdata.find()
    # if we have a recorded previous update time...
    if (mydata.count()):
        # double-check to make sure we have the proper key in the DB response
        if 'updated_time' in mydata[0]:
            # check to see if data is stale
            if (datetime.datetime.now() - parser.parse(mydata[0]['updated_time'])).total_seconds() < TIME_TO_STALE:
                return make_response(json.dumps(
                    {
                        'data': mydata[0]['data'],
                        'updated_time': mydata[0]['updated_time']
                    }, default=json_util.default),
                    200, {'ContentType': 'application/json'})

    # fallback: fetch new data
    new_data = fetch_data()
    if (new_data):
        to_insert = {
            'updated_time': str(datetime.datetime.now()),
            'data': json.dumps(new_data, default=json_util.default)
        }
        # either insert new data or update old if it exists
        # try to minimize db size by replacing old data
        db.fbdata.update({},
                         {'$set': to_insert},
                         upsert=True)
        return make_response(json.dumps(
            {
                'data': to_insert['data'],
                'updated_time': to_insert['updated_time']
            }, default=json_util.default),
            200, {'ContentType': 'application/json'})
    # welp, something went wrong
    else:
        return make_response(json.dumps({'error': 'An error occurred fetching data'}), 500, {'ContentType': 'application/json'})


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
    url_to_get = ("https://graph.facebook.com/v2.8/1850066501928133/feed?fields="
                  "id,type,from,link,message,message_tags,name,object_id,picture,"
                  "status_type,story,updated_time,created_time,comments{id,from,"
                  "like_count,message,message_tags},reactions{id,name,type},"
                  "full_picture,parent_id,attachments{url,type,description,media}"
                  "&access_token=") + auth_token
    data = None
    print url_to_get
    try:
        print 'making a request'
        response = requests.get(url_to_get)
        print response
        data = json.loads(response.text)
        # assert response.ok
    except:
        print 'An error occurred'
        print sys.exc_info()

    return data


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
