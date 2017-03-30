(function(){
	global_data = {'posts': null, 'people': null, 'updated_time': null}

	$(document).ready(function() {
		console.log('hello, world');

		var refreshPending = false;
		$('#data-refresh').on('click', function(e) {
			console.log(e);
			if (!refreshPending) {
				refreshPending = true;
				makeDataRequest(false);
			}
		});

		function makeDataRequest(is_retry) {
			console.log(is_retry);
			additional_text = (is_retry ? "?retry=1" : "");
			return $.ajax({
				url: '/data-check' + additional_text,
				contentType: 'text/plain',
				dataType: 'json',
				method: 'GET',
				success: function(data) { refreshSuccess(data); },
				error: function(a, b, c) { refreshError(a, b, c); }
			});
		}

		// handle data successfully loaded
		function refreshSuccess(data) {
			// refreshPending = false;
			console.log(data);
			if ('data' in data) {
				// handle the new data
				global_data['posts'] = JSON.parse(data['data']);
				if ('updated_time' in data) {
					global_data['updated_time'] = data['updated_time'];
				}
				// if this data is stale, initiate a request for new data
				if ('stale' in data) {
					if (data['stale'] === '1') {
						console.log('refreshSuccess stale');
						$.ajax({
							url: '/data-refresh',
							contentType: 'text/plain',
							dataType: 'json',
							method: 'GET',
							success: function(data) { newDataReqSuccess(data); },
							error: function(a, b, c) { newDataReqFailure(a, b, c); }
						});
					}
					else {
						refreshPending = false;
						console.log('refreshSuccess success');
						displayMessage('success', 'Success', 'Successfully fetched data.');
						updateInterface();
					}
				}

			}
			else {
				// we are not receiving data because this is a request for data we already possess
				setTimeout(function() {
					makeDataRequest(true);
				}, 15000); // wait 15 seconds before trying again
			}

		}

		// handle error TODO add retries
		function refreshError(jqXHR, textStatus, errorThrown) {
			console.log(jqXHR, textStatus, errorThrown);
			$.ajax({
				url: '/data-refresh',
				contentType: 'text/plain',
				dataType: 'json',
				method: 'GET',
				success: function(data) { newDataReqSuccess(data); },
				error: function(a, b, c) { newDataReqFailure(a, b, c); }
			});
		}

		function newDataReqSuccess(data) {
			// someone else has initiated a request for data already
			console.log(data);
			if ('lock' in data) {
				console.log('newDataReqSuccess lock')
				setTimeout(function() {
					makeDataRequest(true);
				}, 15000); // wait 15 seconds before trying again
			}
			else {
				global_data['posts'] = JSON.parse(data['data']);
				if ('updated_time' in data) {
					global_data['updated_time'] = data['updated_time'];
				}
				refreshPending = false;
				console.log('newDataReqSuccess no lock');
				displayMessage('success', 'Success', 'Successfully fetched data.');
				updateInterface();
			}
		}

		function newDataReqFailure(jqXHR, textStatus, errorThrown) {
			refreshPending = false;
			console.log('newDataReqFailure');
			console.log(jqXHR, textStatus, errorThrown);
			displayMessage('danger', 'Error', 'Something went wrong while fetching the data.');
		}

		///////////////
		// Essential UI updates
		///////////////

		function updateInterface() {
			console.log("Updating interface");
			// critical preprocessing elements to make the data cleaner and easier to work with
			clientSidePreprocessing();
			getSomeCoolStats();
			// visualizeSocialNetwork();
		}

		function clientSidePreprocessing() {
			global_data['people'] = {};
			$.map(global_data['posts'], function(d, k) {
				// replace timestamp with date object
				// could also do this for updated_time but eh
				d['created_time'] = new Date(d['created_time']);

				// add this post to a person entry
				var id = d['from']['id'];
				var name = d['from']['name'];
				var person = createOrGetPerson(id, name);
				person['posts'].push(d);

				// add reactions to people
				if ('reactions' in d) { // fix silly bug
					$.map(d['reactions']['data'], function(r) {
							var id = r['id'];
							var name = r['name'];
							var person = createOrGetPerson(id, name);
							person['reactions'][r['type']].push(d);
					});
				}
			});
			console.log("Preprocessing done");
		}

		function getSomeCoolStats() {
			// stats we want to get
			var most_frequent_poster = null;
			var most_liked_poster = null;
			var top_liked_post = null;
			var average_likes_per_post = 0;
			var posts_per_day = 0;
			var total_people_involved = 0;
			var total_people_posting = 0;

			// helper values
			var most_frequent_poster_post_count = 0;
			var most_liked_poster_like_count = 0;
			var top_liked_post_like_count = 0;
			var earliest_post_time = new Date();
			var latest_post_time = new Date(0);
			var total_likes = 0;
			var total_posts = 0;
			var milliseconds_per_day = 86400000;

			// compute stats for posts
			total_posts = global_data['posts'].length;
			for (var i = 0; i < total_posts; i++) {
				var curPost = global_data['posts'][i];
				total_likes += curPost['total_reactions'];

				if (curPost['total_reactions'] > top_liked_post_like_count) {
					top_liked_post_like_count = curPost['total_reactions'];
					top_liked_post = curPost;
				}

				if (curPost['created_time'] < earliest_post_time) {
					earliest_post_time = curPost['created_time'];
				}
				if (curPost['created_time'] > latest_post_time) {
					latest_post_time = curPost['created_time'];
				}
			}
			average_likes_per_post = Math.round(total_likes / total_posts);
			console.log(latest_post_time);
			console.log(earliest_post_time);
			posts_per_day = Math.round(total_posts / ((latest_post_time - earliest_post_time) / milliseconds_per_day));

			// compute stats for individuals
			total_people_involved = Object.keys(global_data['people']).length;
			var people_posting = Object.keys(global_data['people']).filter(function(d) { 
				return global_data['people'][d]['posts'].length; });
			total_people_posting = people_posting.length;
			for (var i = 0; i < total_people_posting; i++) {
				var curPerson = global_data['people'][people_posting[i]];
				var nPosts = curPerson['posts'].length;

				if (nPosts > most_frequent_poster_post_count) {
					most_frequent_poster_post_count = nPosts;
					most_frequent_poster = curPerson;
				}

				var likes = 0;
				for (var j = 0; j < nPosts; j++) {
					likes += curPerson['posts'][j]['total_reactions'];
				}
				if (likes > most_liked_poster_like_count) {
					most_liked_poster_like_count = likes;
					most_liked_poster = curPerson;
				}
			}


			// Output stats
			// TODO
			console.log("Most frequent poster");
			console.log(most_frequent_poster);
			console.log("Posts: " + most_frequent_poster_post_count);
			console.log("Most liked poster");
			console.log(most_liked_poster);
			console.log("Likes: " + most_liked_poster_like_count);
			console.log("Top liked post");
			console.log(top_liked_post);
			console.log("Likes: " + top_liked_post_like_count);
			console.log("Average likes per post");
			console.log(average_likes_per_post);
			console.log("Posts per day");
			console.log(posts_per_day);
			console.log("Total people involved");
			console.log(total_people_involved);
			console.log("Total people posting");
			console.log(total_people_posting);
			console.log("Total posts");
			console.log(total_posts);
			console.log("Total likes");
			console.log(total_likes);
		}

		function createOrGetPerson(id, name) {
			if (!(id in global_data['people'])) {
				global_data['people'][id] = new Person(id, name);
			}
			return global_data['people'][id];
		}

		function Person(id, name) {
			this.id = id;
			this.name = name;
			this.posts = []; // list of posts
			this.reactions = {'LIKE': [], 'LOVE': [], 'HAHA': [], 'WOW': [], 'SAD': [], 'ANGRY': []}; // list of reactions as [reactionType] postIdx}
			// this.taggedin = []; // list of posts where they are tagged
			// this.tags = []; // list of people they tag in posts as {personID, postIdx}
			// TODO add more fields
		}

		var colorarr = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", 
		                    "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", 
		                    "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", 
		                    "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];
		nodecolorfun = function(idx) { return colorarr[idx%20]};

		// function visualizeSocialNetwork() {
		// 	var NODE_RADIUS = 12;
		// 	var LINK_ARROW_OFFSET = 9;
		// 	var LINK_ARROW_RADIUS_RATIO = 1.2;
		// 	var nodeFillColor = nodecolorfun;

		// 	var boundingbox = d3.select('#canvas').node().getBoundingClientRect();
		// 	var width = boundingbox.width;
		// 	var height = boundingbox.height;

		// 	var svg = d3.select('#canvas').append('svg')
		// 	    .attr('width', width)
		// 	    .attr('height', height);

		// 	var container = svg.append('rect')
		// 	    .attr('width', width)
		// 	    .attr('height', height)
		// 	    .style('fill', 'none')
		// 	    .style('pointer-events', 'all');

		// 	var group = svg.append('g');
		// 	var linkgroup = group.append('g');
		// 	var nodeHighlight = group.append('rect')
		// 	    .attr('width',NODE_RADIUS*4)
		// 	    .attr('height',NODE_RADIUS*4)
		// 	    .attr('fill-opacity', 0)
		// 	    .style('fill', function(d) { return nodeFillColor(0)});
		// 	var nodegroup = group.append('g');

		// 	var links = [];
		// 	var nodes = [];

		// 	var root;

		// 	d3.entries(global_data['people']).forEach(function(v,k) {
		// 		nodes.push({
		// 			name: v.value.name,
		// 			id: v.value.id,
		// 			fixed: false,
		// 			person: global_data['people'][v.value.id], 
		// 			r: NODE_RADIUS,
		// 			children_links: [],
		// 			parent_links: [],
		// 		});
		// 	});

		// 	root = nodes[0];

		// 	// TODO fix this
		// 	d3.entries(global_data['people']).forEach(function(v,k) {
		// 		var sourceNode = nodes.filter(function (n) {
		// 		    return n.name === v.value.Source;
		// 		})[0];
		// 		var targetNode = nodes.filter(function (n) {
		// 		    return n.name === v.value.Target;
		// 		})[0];
		// 		var newLink = {
		// 		    id: v.value.ID,
		// 		    source: sourceNode, 
		// 		    target: targetNode, 
		// 		    type: v.value.Type, 
		// 		    relationship_element: Globals.RelationshipElements[v.value.ID],
		// 		    vis: true
		// 		};
		// 		links.push(newLink);
		// 		sourceNode.children_links.push(newLink);
		// 		targetNode.parents_links.push(newLink);
		// 	});

		// 	var n = nodes.length;
		// 	nodes.forEach(function(d, i) {
		// 	  d.x = d.y = height - width / n * i;
		// 	});

		// 	var force = d3.layout.force()
		// 	    .nodes(nodes) // the nodes in the force object
		// 	    .links(links) // the links in the force object
		// 	    .size([width, height]) // the size of the force diagram
		// 	                             // height is longer so gravity drags out graph
		// 	    // .linkStrength(2) // not useful
		// 	    // .friction(0.3) // default value is best
		// 	    .linkDistance(function(d) { if (d.source.fixed || d.target.fixed) {
		// 	            return 100; // pop the children out
		// 	        }   else return 60;
		// 	    })
		// 	    // helps nodes with lots of children keep clear of clutter
		// 	    .charge(function(d) { return -30*d.weight - 300; })
		// 	    .chargeDistance(5000)
		// 	    .gravity(0.01)
		// 	    .theta(0.8)
		// 	    // .alpha(0.1)

		// 	var defs = svg.append('svg:defs');
		// 	defs.selectAll('marker')
		// 	    .data([1])      // Different link/path types can be defined here
		// 	  .enter().append('svg:marker')    // This section adds in the arrows
		// 	    .attr('id', function(d) { return d; })
		// 	    .attr('viewBox', '0 -5 10 10')
		// 	    .attr('refX', function(d) { 
		// 	        return d[1] * NODE_RADIUS *
		// 	            LINK_ARROW_RADIUS_RATIO + 
		// 	            LINK_ARROW_OFFSET
		// 	     })
		// 	    .attr('refY', 0)
		// 	    .attr('markerWidth', 6)
		// 	    .attr('markerHeight', 6)
		// 	    .attr('orient', 'auto')
		// 	    .attr('fill',function(d) { return linkStrokeColor(Globals.RelationshipTypes.indexOf(d[0]))})
		// 	  .append('svg:path')
		// 	    .attr('d', 'M0,-5L10,0L0,5');

		// 	/*** Drag handlers section ***/
		// 	var dragStart = function(d) {
		// 	    // noop
		// 	}

		// 	// sets fixed state after drag
		// 	var dragEnd = function(d) { 
		// 	    var e = d3.event.sourceEvent;
		// 	    if (e.defaultPrevented || e.which == 3) return;
		// 	    e.stopPropagation();
		// 	    NodeView.currentlySelectedResource = d3.select(this).data()[0];

		// 	    if (e.ctrlKey || e.shiftKey) {
		// 	        d3.select(this).classed('fixed', d.fixed = true)
		// 	    } else {
		// 	        d3.select(this).classed('fixed', d.fixed = false)
		// 	    }
		// 	}

		// 	// create drag handler (for nodes)
		// 	var drag = force.drag()
		// 	    .on('dragstart', dragStart)
		// 	    .on('dragend', dragEnd);
		// }
	});

	/***
	    General interface control
	                            ***/
	// Message display control
	// alert_type: success (green), info (blue), warning (yellow), danger (red)
	function displayMessage(alert_type,header,text) {
	    $('<div class="alert alert-'+alert_type+' alert-dismissible"><h4><strong>' +
	        header + ': </strong>' + text + 
	        '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true"></span></button></h4></div>')
	        .hide().appendTo('.message').fadeIn(500).delay(3000).fadeOut(500)
	        .queue(function () { $(this).remove() });
	}

})(window);