
# coding: utf-8

# In[1]:

import requests
import json
import pprint
import os
from copy import deepcopy

# def get_url(url):

access_token = os.environ['ACCESS_TOKEN']
FB_LIMIT = 25 # facebook gives 25 items in pagination
REACTION_DICT = {'LIKE':0,'LOVE':0,'HAHA':0,'WOW':0,'SAD':0,'ANGRY':0}


url_to_get = "https://graph.facebook.com/v2.8/1850066501928133/feed?fields=id,type,from,link,message,message_tags,name,object_id,picture,status_type,story,updated_time,created_time,comments{id,from,like_count,message,message_tags},reactions{id,name,type},full_picture,parent_id,attachments{url,type,description,media}&access_token=" + access_token
#url_to_get = "https://graph.facebook.com/v2.3/1850066501928133/feed?format=json&icon_size=16&access_token=" + access_token
# get_url(url_to_get)

response = requests.get(url_to_get)
print response
data = json.loads(response.text)


# In[138]:




# In[2]:

data['data'][0]['comments']['data'][0]


# In[3]:

sorted(data['data'][0].keys())

# Schema:
#     actions
#         array of link/name objects
#     caption: caption of linked item (e.g. media.giphy.com)
#     commments
#         data: array of comment objects
#             can_remove: useless
#             created_time: time posted
#             from: user object
#                 id
#                 name
#             id: comment id
#             like_count: summary of likes, doesn't say who liked it
#                 (( can figure out who liked it by looking up /version/commentID/likes ))
#             message: the comment
#             message_tags: array of message tag objects
#                 id: id of the tagged thing
#                 length: how long the tag is
#                 name: who/what is tagged
#                 offset: distance of tag from start of comment
#                 type: seems to indicate whether it's a user or a page or idk what else
#             user_likes: whether you have liked it or not
#         paging
        
#     created_time: created time, in GMT+0
#     from: user object
#         id
#         name
#     icon: useless
#     id: first part is group id, after underscore is post id
#     is_expired: useless
#     is_hidden: useless
#     likes
#         data: array of user truncs
#             id
#             name
#         paging
#     link: link to picture
#     message: the text of the post
#     name: name of the linked site (e.g. giphy.com)
#     picture: preview image for link
#     privacy: useless
#     status_type: useless
#     story: useless
#     story_tags: tags in the story
#     type: type of post
#     updated_time: time the post was updated
    


# In[4]:

data['data'][0]


# In[33]:

posts = []


# In[35]:

def load_all_posts(myData):
    global posts
    posts = []
    posts += myData['data']
    call_count = 0
    while ('next' in myData['paging']):
        call_count += 1
        print call_count
        response = requests.get(myData['paging']['next'])
        myData = json.loads(response.text)
        if not 'data' in myData: # response is bad, may need new token
            print "Something went wrong while loading new response"
            print response
            break
        posts += myData['data']
        if (not 'paging' in myData):
            print myData
            break


# In[36]:

load_all_posts(data)



# In[43]:

len(posts)


# In[8]:

is_a_meme_post = lambda x: x['type'] == 'link' or x['type'] == 'photo' or x['type'] == 'video' or ('attachments' in x and 'data' in x['attachments'])


# In[44]:

memes_only = filter(is_a_meme_post, posts)


# In[45]:

non_memes = filter(lambda x: not is_a_meme_post(x), posts)


# In[46]:

for nm in sorted(non_memes, key=lambda x: x['created_time']):
    print '------------------------------------------------------------------------------'
    print nm['created_time']
    if ('story' in nm):
        print nm['story']
    else:
        print '--'
    if ('message' in nm):
        print nm['message']
    else:
        print nm
    


# In[54]:

def load_likes_for_post(post_object):
    call_count = 0
    reactions = deepcopy(REACTION_DICT)
    
    # catch posts which have no reactions
    if not 'reactions' in post_object:
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
        if not 'data' in reactions_object: # response is bad, may need new token
            print "Something went wrong while loading new response"
            print response
            break
        # with no errors, we can safely add our new data to the total counts
        total_reactions += len(reactions_object['data'])
        for r in reactions_object['data']:
            reactions[r['type']] += 1
        # handle another error
        if (not 'paging' in reactions_object):
            print reactions_object
            break
    
    print call_count
    # store our counts along with our post
    post_object['reaction_data'] = reactions
    post_object['total_reactions'] = total_reactions


# In[52]:

def load_likes_for_all_posts(start_index=0):
    for i,p in enumerate(posts):
        if (i < start_index):
            continue
        print "Post #" + str(i+1)
        load_likes_for_post(p)


# In[55]:

load_likes_for_all_posts(664)


# In[59]:

sorted_posts = sorted(memes_only, key=lambda x: x['total_reactions'])


# In[75]:

sorted_posts[650]['id']


# In[76]:

def dump_data_to_file():
    with open('post_data.json','w') as outfile:
        json.dump(posts, outfile)


# In[16]:

def load_data_from_file():
    with open('post_data.json','r') as test:
        d = json.load(test)
        print d[0]

