(function(){
	GlobalData = {'posts': null, 'people': null, 'updated_time': null, 'metadata': {}}

	WeekdayEnum = {
		6: 'Sunday',
		0: 'Monday',
		1: 'Tuesday',
		2: 'Wednesday',
		3: 'Thursday',
		4: 'Friday',
		5: 'Saturday'
	};
	ReverseWeekdayEnum = {
		'Sunday':6,
		'Monday':0,
		'Tuesday':1,
		'Wednesday':2,
		'Thursday':3,
		'Friday':4,
		'Saturday':5
	};
	MajorTo2016Count = {
		'ACS Certified Chemistry Major': 8,
		'Africana Studies': 3,
		'American Studies': 29,
		'Anthropology': 17,
		'Applied Mathematics': 7,
		'Applied Physics': 1,
		'Arabic': 3,
		'Archaeology': 4,
		'Architectural Studies': 4,
		'Art History': 17,
		'Asian Studies': 2,
		'Astrophysics': 2,
		'Biochemistry': 31,
		'Biology': 112,
		'Biomedical Engineering': 21,
		'Biopsychology': 54,
		'Chemical Engineering': 34,
		'Chemical Physics': 1,
		'Chemistry': 10,
		'Child Study and Human Development': 45,
		'Chinese': 6,
		'Civil Engineering': 16,
		'Classics': 8,
		'Cognitive and Brain Sciences': 26,
		'Community Health': 72,
		'Computer Engineering': 11,
		'Computer Science': 116,
		'Drama': 15,
		'Economics': 144,
		'Electrical Engineering': 25,
		'Engineering Physics': 1,
		'Engineering Psychology': 12,
		'English': 73,
		'Environmental Engineering': 6,
		'Environmental Studies': 34,
		'Film & Media Studies': 5,
		'French': 20,
		'Geological Sciences': 3,
		'Geology': 4,
		'German Language and Literature': 1,
		'German Studies': 3,
		'Greek': 0,
		'Greek & Latin': 2,
		'History': 39,
		'International Letters & Visual Studies': 12,
		'International Relations': 172,
		'Italian Studies': 5,
		'Japanese': 1,
		'Judaic Studies': 3,
		'Latin': 1,
		'Latin American Studies': 0,
		'Mathematics': 32,
		'Mechanical Engineering': 54,
		'Middle Eastern Studies': 1,
		'Music': 13,
		'Other Engineering': 2,
		'Peace and Justice Studies': 19,
		'Philosophy': 23,
		'Physics': 12,
		'Plan of Study/Interdisciplinary Studies': 6,
		'Political Science': 67,
		'Psychology': 77,
		'Psychology - Clinical': 29,
		'Quantitative Economics': 44,
		'Religion': 2,
		'Russian and East European Studies': 6,
		'Russian Language and Literature': 0,
		'Sociology': 34,
		'Spanish': 30,
		'Women\'s, Gender, and Sexuality Studies': 9,
		'Undecided': 0,
		'Fine Arts': 88,
	};
	MajorToCategory = {
		'ACS Certified Chemistry Major': 'Math & Science',
		'Africana Studies': 'Interdisciplinary',
		'American Studies': 'Interdisciplinary',
		'Anthropology': 'Social Sciences',
		'Applied Mathematics': 'Math & Science',
		'Applied Physics': 'Math & Science',
		'Arabic': 'Languages',
		'Archaeology': 'Social Sciences',
		'Architectural Studies': 'Arts',
		'Art History': 'Arts',
		'Asian Studies': 'Interdisciplinary',
		'Astrophysics': 'Math & Science',
		'Biochemistry': 'Math & Science',
		'Biology': 'Math & Science',
		'Biomedical Engineering': 'Engineering',
		'Biopsychology': 'Interdisciplinary',
		'Chemical Engineering': 'Engineering',
		'Chemical Physics': 'Math & Science',
		'Chemistry': 'Math & Science',
		'Child Study and Human Development': 'Social Sciences',
		'Chinese': 'Languages',
		'Civil Engineering': 'Engineering',
		'Classics': 'Humanities',
		'Cognitive and Brain Sciences': 'Interdisciplinary',
		'Community Health': 'Social Sciences',
		'Computer Engineering': 'Engineering',
		'Computer Science': 'Engineering',
		'Drama': 'Arts',
		'Economics': 'Social Sciences',
		'Electrical Engineering': 'Engineering',
		'Engineering Physics': 'Engineering',
		'Engineering Psychology': 'Interdisciplinary',
		'English': 'Humanities',
		'Environmental Engineering': 'Engineering',
		'Environmental Studies': 'Interdisciplinary',
		'Film & Media Studies': 'Interdisciplinary',
		'French': 'Languages',
		'Geological Sciences': 'Math & Science',
		'Geology': 'Math & Science',
		'German Language and Literature': 'Languages',
		'German Studies': 'Interdisciplinary',
		'Greek': 'Languages',
		'Greek & Latin': 'Languages',
		'History': 'Humanities',
		'International Letters & Visual Studies': 'Interdisciplinary',
		'International Relations': 'Interdisciplinary',
		'Italian Studies': 'Interdisciplinary',
		'Japanese': 'Languages',
		'Judaic Studies': 'Interdisciplinary',
		'Latin': 'Languages',
		'Latin American Studies': 'Interdisciplinary',
		'Mathematics': 'Math & Science',
		'Mechanical Engineering': 'Engineering',
		'Middle Eastern Studies': 'Interdisciplinary',
		'Music': 'Arts',
		'Other Engineering': 'Engineering',
		'Peace and Justice Studies': 'Interdisciplinary',
		'Philosophy': 'Humanities',
		'Physics': 'Math & Science',
		'Plan of Study/Interdisciplinary Studies': 'Interdisciplinary',
		'Political Science': 'Social Sciences',
		'Psychology': 'Social Sciences',
		'Psychology - Clinical': 'Social Sciences',
		'Quantitative Economics': 'Social Sciences',
		'Religion': 'Humanities',
		'Russian and East European Studies': 'Interdisciplinary',
		'Russian Language and Literature': 'Languages',
		'Sociology': 'Social Sciences',
		'Spanish': 'Languages',
		'Women\'s, Gender, and Sexuality Studies': 'Interdisciplinary',
		'Undecided': 'Undecided',
		'Fine Arts': 'Special Studies',
	};

	$(document).ready(function() {
		var refreshPending = false;
		makeDataRequest();

		$('#data-refresh').on('click', function(e) {
			console.log(e);
			if (!refreshPending) {
				makeDataRequest();
			}
		});

		function makeDataRequest() {
			displayTimeData();
			// TODO update prod to show other data
			// refreshPending = true;
			// return $.ajax({
			// 	url: '/data-check',
			// 	contentType: 'text/plain',
			// 	dataType: 'json',
			// 	method: 'GET',
			// 	success: function(data) { refreshSuccess(data); },
			// 	error: function(a, b, c) { refreshError(a, b, c); }
			// });
		}

		function getData(field, callback, error=refreshError) {
			return $.ajax({
				url: '/get_data?field=' + field,
				contentType: 'text/plain',
				dataType: 'json',
				method: 'GET',
				success: function(data) { callback(data['data']); },
				error: function(a, b, c) { error(a, b, c); }
			});
		}

		// handle data successfully loaded
		function refreshSuccess(data) {
			// refreshPending = false;
			console.log(data);
			if ('data' in data) {
				// handle the new data
				GlobalData['posts'] = JSON.parse(data['data']);
				if ('updated_time' in data) {
					GlobalData['updated_time'] = data['updated_time'];
				}
				if ('namedata' in data) {
					GlobalData['namedata'] = data['namedata'];
				}
				// if this data is stale, initiate a request for new data
				refreshPending = false;
				console.log('refreshSuccess success');
				dataReceived();
			}
			else {
				// we are not receiving data somehow
				setTimeout(function() {
					makeDataRequest();
				}, 15000); // wait 15 seconds before trying again
			}

		}

		// handle error TODO add retries
		function refreshError(jqXHR, textStatus, errorThrown) {
			refreshPending = false;
			console.log('newDataReqFailure');
			console.log(jqXHR, textStatus, errorThrown);
			displayMessage('danger', 'Error', 'Something went wrong while fetching the data.');
		}

		///////////////
		// Essential UI updates
		///////////////

		function dataReceived(data) {
			displayMessage('success', 'Success', 'Successfully fetched data.');
			updateInterface();
		}

		function updateInterface() {
			console.log("Updating interface");
			// critical preprocessing elements to make the data cleaner and easier to work with
			clientSidePreprocessing();
			getSomeCoolStats();
			displayTimeData();
			// visualizeSocialNetwork();
		}

		function clientSidePreprocessing() {
			GlobalData['people'] = {};
			$.map(GlobalData['posts'], function(d, k) {
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
			total_posts = GlobalData['posts'].length;
			for (var i = 0; i < total_posts; i++) {
				var curPost = GlobalData['posts'][i];
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
			total_people_involved = Object.keys(GlobalData['people']).length;
			var people_posting = Object.keys(GlobalData['people']).filter(function(d) { 
				return GlobalData['people'][d]['posts'].length; });
			total_people_posting = people_posting.length;
			for (var i = 0; i < total_people_posting; i++) {
				var curPerson = GlobalData['people'][people_posting[i]];
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

			GlobalData['metadata']['earliest_post_time'] = earliest_post_time
			GlobalData['metadata']['latest_post_time'] = latest_post_time


			// Output stats
			// In retrospect I could've done this so much more neatly using
			// an array of objects containing key and value, iteratively
			// adding them to the DOM
			console.log("Most frequent poster");
			console.log(most_frequent_poster);
			console.log("Posts: " + most_frequent_poster_post_count);
			$('#most-frequent-poster').text(most_frequent_poster['name']);
			$('#most-frequent-poster-post-count').text("Posts: " + most_frequent_poster_post_count);
			console.log("Most liked poster");
			console.log(most_liked_poster);
			console.log("Likes: " + most_liked_poster_like_count);
			$('#most-liked-poster').text(most_liked_poster['name']);
			$('#most-liked-poster-like-count').text("Likes: " + most_liked_poster_like_count);
			console.log("Top liked post");
			console.log(top_liked_post);
			console.log("Likes: " + top_liked_post_like_count);
			$('#top-liked-post').empty();
			$('#top-liked-post').append($('<img src="'+top_liked_post['full_picture']+'">)'));
			$('#top-liked-post-like-count').html("Likes: " + top_liked_post_like_count + "<br/><a href='" + top_liked_post['link'] + "'>Direct link to post</a>");
			console.log("Average likes per post");
			console.log(average_likes_per_post);
			$('#average-likes-per-post').text(average_likes_per_post);
			console.log("Posts per day");
			console.log(posts_per_day);
			$('#posts-per-day').text(posts_per_day);
			console.log("Total people involved");
			console.log(total_people_involved);
			$('#total-people-involved').text(total_people_involved);
			console.log("Total people posting");
			console.log(total_people_posting);
			$('#total-people-posting').text(total_people_posting);
			console.log("Total posts");
			console.log(total_posts);
			$('#total-posts').text(total_posts);
			console.log("Total likes");
			console.log(total_likes);
			$('#total-likes').text(total_likes);
		}


		//////////////
		// Helper functions for UI operations
		var parseTimeSimple = d3.timeParse("%m/%d");
		var parseTimeYear = d3.timeParse("%m/%d/%Y");

		function sortByDate(a, b) {
			return parseTimeSimple(a['key']) - parseTimeSimple(b['key']);
		}

		function simpleKeySort(a, b) {
			return a['key'] - b['key'];
		}

		function weekdaySort(a, b) {
			// return ReverseWeekdayEnum[a['key']] - ReverseWeekdayEnum[b['key']];
			return hourSort(a, b); // stored as numbers now
		}

		function hourSort(a, b) {
			return (+a['key']) - b['key'];
		}

		function stringifyHour(a) {
			return formatAMPM(a);
		}

		function stringifyWeekday(a) {
			return WeekdayEnum[a];
		}

		function noop(a) {
			return a;
		}
		
		// update: this function is now beautiful
		function displayTimeData() {
			console.log('displaytimedata')

			// display XX chart: 
			// function(data, title, keySortMethod, keyStringifyMethod, bRotateLabels)
			getData('dates_to_counts', function(data) { 
				displayBarChart(data, "Posts per day", sortByDate, noop, true); 
			});
			getData('dates_to_like_counts', function(data) { 
				displayBarChart(data, "Likes per day", sortByDate, noop, true); 
			});
			getData('dates_to_avg_likes', function(data) { 
				displayLineGraph(data, "Average likes per day", simpleKeySort, noop); 
			});
			getData('weekday_to_counts', function(data) { 
				displayBarChart(data, "Posts by day of the week", weekdaySort, stringifyWeekday); 
			});
			getData('weekday_to_like_counts', function(data) { 
				displayBarChart(data, "Likes by day of the week", weekdaySort, stringifyWeekday); 
			});
			getData('weekday_to_avg_likes', function(data) { 
				displayBarChart(data, "Average likes per day of the week", weekdaySort, stringifyWeekday); 
			});
			getData('hour_to_counts', function(data) { 
				displayBarChart(data, "Posts by hour", hourSort, stringifyHour, true);
			});
			getData('hour_to_like_counts', function(data) { 
				displayBarChart(data, "Total likes by hour", hourSort, stringifyHour, true); 
			});
			getData('hour_to_avg_likes', function(data) { 
				displayBarChart(data, "Average likes per hour", hourSort, stringifyHour, true); 
			});
		}

		// modular function to create and display a bar chart
		// entry data is data, duh
		// data_name is chart title
		// sort_fun is function to sort the keys in order, make it a noop if you want
		// to_string is a function to convert keys to strings
		function displayBarChart(entry_data, data_name, sort_fun, to_string, rotate_labels=false) {
			console.log(data_name);
			console.log('displaybarchart');

			var div = d3.select('#charts');
			var title = $('#charts').append($('<h3 class="chart-title">').text(data_name));
			var svg = div.append("svg")
				.attr('name', data_name)
				.attr('width', 1200)
				.attr('height', 500);

			var margin = {top: 20, right: 20, bottom: 30, left: 40},
			    width = +svg.attr("width") - margin.left - margin.right,
			    height = +svg.attr("height") - margin.top - margin.bottom;

			var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
			    y = d3.scaleLinear().rangeRound([height, 0]);

			var g = svg.append("g")
			    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var tip = d3.tip()
			  .attr('class', 'd3-tip')
			  .offset([-10, 0])
			  .html(function(d) {
			    return "<strong>" + to_string(d['key']) + ":</strong> <span style='color:red'>" + d['value'] + "</span>";
			  });

			svg.call(tip);

			var data = []
			$.each(entry_data, function(k, v) {
				data.push({'value': v, 'key': k});
			});

			data.sort(function(a,b) { return sort_fun(a, b); })

			x.domain(data.map(function(d) { return d['key']; }));
			y.domain([0, d3.max(data, function(d) { return d['value']; })]);

			g.append("g")
			  .attr("class", "axis axis--x")
			  .attr("transform", "translate(0," + height + ")")
			  .call(d3.axisBottom(x).tickFormat(to_string));

			g.append("g")
			  .attr("class", "axis axis--y")
			  .call(d3.axisLeft(y).ticks(10))
			.append("text")
			  .attr("transform", "rotate(-90)")
			  .attr("y", 6)
			  .attr("dy", "0.71em")
			  .attr("text-anchor", "end")
			  .text("Frequency");

			g.selectAll(".bar")
			.data(data)
			.enter()
			.append("rect")
			  .attr("class", "bar")
			  .attr("x", function(d) { return x(d['key']); })
			  .attr("y", function(d) { return y(d['value']); })
			  .attr("width", x.bandwidth())
			  .attr("height", function(d) { return height - y(d['value']); })
			  .on('mouseover', tip.show)
			  .on('mouseout', tip.hide);

			if (rotate_labels) {
				g.selectAll(".axis--x text")  // select all the text elements for the xaxis
		          .attr("transform", function(d) {
		             return "translate(" + this.getBBox().height + "," + this.getBBox().height + ")rotate(45)";
		          });
		    }
			    
		}

		function displayLineGraph(entry_data, data_name, sort_fun, to_string) {
			var div = d3.select('#charts');
			var title = $('#charts').append($('<h3 class="chart-title">').text(data_name));
			var svg = div.append("svg")
				.attr('name', data_name)
				.attr('width', 1200)
				.attr('height', 500);

			var margin = {top: 20, right: 20, bottom: 30, left: 50},
			    width = +svg.attr("width") - margin.left - margin.right,
			    height = +svg.attr("height") - margin.top - margin.bottom,
			    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

			var parseTime = d3.timeParse("%m/%d/%Y");

			var x = d3.scaleTime()
			    .rangeRound([0, width]);

			var y = d3.scaleLinear()
			    .rangeRound([height, 0]);

			var line = d3.line()
			    .x(function(d) { return x(d['key']); })
			    .y(function(d) { return y(d['value']); });

			var tip = d3.tip()
			  .attr('class', 'd3-tip')
			  .offset([-10, 0])
			  .html(function(d) {
			    return "<strong>" + to_string(d['key']) + ":</strong> <span style='color:red'>" + d['value'] + "</span>";
			  });

			svg.call(tip);

			var data = [];
			$.each(entry_data, function(k, v) {
				data.push({'value':v, 'key':parseTime(k)});
			});

			data.sort(function(a,b) { return sort_fun(a, b); })
			console.log(data);

			x.domain(d3.extent(data, function(d) { return d['key']; }));
			y.domain(d3.extent(data, function(d) { return d['value']; }));

			g.append("g")
			  .attr("transform", "translate(0," + height + ")")
			  .call(d3.axisBottom(x))
			.select(".domain")
			  .remove();

			g.append("g")
			  .call(d3.axisLeft(y))
			.append("text")
			  .attr("fill", "#000")
			  .attr("transform", "rotate(-90)")
			  .attr("y", 6)
			  .attr("dy", "0.71em")
			  .attr("text-anchor", "end")
			  .text("Average");

			g.append("path")
			  .datum(data)
			  .attr("fill", "none")
			  .attr("stroke", "steelblue")
			  .attr("stroke-linejoin", "round")
			  .attr("stroke-linecap", "round")
			  .attr("stroke-width", 1.5)
			  .attr("d", line);

			g.selectAll(".circle")
			     .data(data)
			     .enter()
			     .append("svg:circle")
			     .attr("class", "circle")
			     .attr("cx", function (d) {
			        return x(d['key']);
			     })
			     .attr("cy", function (d) {
			       return y(d['value']);
			     })
			     .attr("r", 5)
			     .on('mouseover', tip.show)
			     .on('mouseout', tip.hide)
		}

		function createOrGetPerson(id, name) {
			if (!(id in GlobalData['people'])) {
				GlobalData['people'][id] = new Person(id, name);
			}
			return GlobalData['people'][id];
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

		// http://stackoverflow.com/questions/4413590/javascript-get-array-of-dates-between-2-dates
		Date.prototype.addDays = function(days) {
		    var dat = new Date(this.valueOf())
		    dat.setDate(dat.getDate() + days);
		    return dat;
		}

		function getDates(startDate, stopDate) {
		    var dateArray = new Array();
		    var currentDate = startDate;
		    while (currentDate <= stopDate) {
		        dateArray.push( new Date (currentDate) )
		        currentDate = currentDate.addDays(1);
		    }
		    return dateArray;
		}

		// http://stackoverflow.com/questions/8888491/how-do-you-display-javascript-datetime-in-12-hour-am-pm-format
		// modified because idgaf about minutes
		function formatAMPM(hours) {
		  var ampm = hours >= 12 ? 'pm' : 'am';
		  hours = hours % 12;
		  hours = hours ? hours : 12; // the hour '0' should be '12'
		  return hours + ':00 ' + ampm;
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

		// 	d3.entries(GlobalData['people']).forEach(function(v,k) {
		// 		nodes.push({
		// 			name: v.value.name,
		// 			id: v.value.id,
		// 			fixed: false,
		// 			person: GlobalData['people'][v.value.id], 
		// 			r: NODE_RADIUS,
		// 			children_links: [],
		// 			parent_links: [],
		// 		});
		// 	});

		// 	root = nodes[0];

		// 	// TODO fix this
		// 	d3.entries(GlobalData['people']).forEach(function(v,k) {
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