(function(){
	$(document).ready(function() {
		getData('post_similarity_matrix', function(matrix) {
			getData('post_similarity_postdata', function(postdata) {
				postdata = postdata.filter(function(d) { return d['total_reactions'] > 500; });
				displaySimilarityGraph(matrix, postdata);
			});
		});

		function getData(field, callback, error=refreshError) {
			return $.ajax({
				url: '/get_data?field=' + field,
				contentType: 'text/plain',
				dataType: 'json',
				method: 'GET',
				success: function(data) { console.log(data); callback(data['data']); },
				error: function(a, b, c) { error(a, b, c); }
			});
		}

		function refreshError(jqXHR, textStatus, errorThrown) {
			refreshPending = false;
			console.log('newDataReqFailure');
			console.log(jqXHR, textStatus, errorThrown);
			displayMessage('danger', 'Error', 'Something went wrong while fetching the data.');
		}

		///////////////
		// Essential UI updates
		///////////////

		function displaySimilarityGraph(simmatrix, postdata) {
			console.log("Displaying similarity graph");
			visualizeSocialNetwork(simmatrix, postdata);
			force.on('end', function(d) { force.nodes().forEach(function(v) {
				v.fixed = true;
				});
				force.alpha(-1);
			});
		}

		///////////////
		// Helper functions for similarity
		///////////////

		// Invariant: matrix first term is smaller than matrix second term
		function similarity(simmatrix, i, j) {
			if (i < j) {
				return simmatrix[i][j];
			}
			return simmatrix[j][i];
		}

		function convertPostsToNodesInPlace(postdata, node_radius) {
			for (var i = postdata.length - 1; i >= 0; --i) {
				postdata[i]['nid'] = i;
				postdata[i]['fixed'] = false;
				postdata[i]['vis'] = true;
				postdata[i]['r'] = node_radius //* (postdata[i]['total_reactions'] / 500); // NODE_RADIUS
			}
			// postdata[i]['r'] = node_radius;
		}

		function getMaxSimilarityConnectionIdx(simmatrix, postdata, i) {
			var maxSim = 0;
			var maxIdx = -1;
			for (var k = postdata.length - 1; k >= 0; k-- ) {
				if (i > k) {
					if (simmatrix[k][i] > maxSim) {
						maxSim = simmatrix[k][i];
						maxIdx = k;
					}
				}
				else if (i < k) {
					if (simmatrix[i][k] > maxSim) {
						maxSim = simmatrix[i][k];
						maxIdx = k;
					}
				}
			}
			return maxIdx;
		}

		function getMinSimilarityConnectionIdx(simmatrix, postdata, i) {
			var minSim = 100;
			var minIdx = -1;
			for (var k = postdata.length - 1; k >= 0; k-- ) {
				if (i > k) {
					if (simmatrix[k][i] < minSim) {
						minSim = simmatrix[k][i];
						minIdx = k;
					}
				}
				else if (i < k) {
					if (simmatrix[i][k] < minSim) {
						minSim = simmatrix[i][k];
						minIdx = k;
					}
				}
			}
			return minIdx;
		}

		function similaritiesToEdges(simmatrix, postdata) {
			var edges = [];
			var len = postdata.length;
			var id = 0;
			for (var i = 0; i < len; i++) {
				var maxIdx = getMaxSimilarityConnectionIdx(simmatrix, postdata, i);
				edges.push({'source': postdata[i], 
							'target': postdata[maxIdx],
							'id': id,
							'value': similarity(simmatrix, i, maxIdx),
							'vis': true
						});
				id += 1;
			}
			return edges;
		}

		var colorarr = ["#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", 
		                    "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", 
		                    "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#7f7f7f", 
		                    "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5"];
		nodecolorfun = function(idx) { return colorarr[idx%20]};

		function visualizeSocialNetwork(simmatrix, postdata) {
			var NODE_RADIUS = 18;
			var LINK_ARROW_OFFSET = 9;
			var LINK_ARROW_RADIUS_RATIO = 1.2;
			var nodeFillColor = nodecolorfun;

			var boundingbox = d3.select('#simvis').node().getBoundingClientRect();
			var width = boundingbox.width;
			var height = boundingbox.height;

			var svg = d3.select('#simvis').append('svg')
			    .attr('width', width)
			    .attr('height', height);

			var container = svg.append('rect')
			    .attr('width', width)
			    .attr('height', height)
			    .style('fill', 'none')
			    .style('pointer-events', 'all');

			var group = svg.append('g');
			var linkgroup = group.append('g');

    		var imagegroup = group.append('g');
			// var nodegroup = group.append('g');

			var nodes = postdata;
			convertPostsToNodesInPlace(nodes, NODE_RADIUS);
			var links = similaritiesToEdges(simmatrix, nodes);

			var n = nodes.length;
			nodes.forEach(function(d, i) {
			  d.x = d.y = height - width / n * i;
			});

			force = d3.layout.force()
			    .nodes(nodes) // the nodes in the force object
			    .links(links) // the links in the force object
			    .size([width, height]) // the size of the force diagram
			                             // height is longer so gravity drags out graph
			    // .linkStrength(2) // not useful
			    // .friction(0.3) // default value is best
			    .linkDistance(function(d) { return 150; })
			    // helps nodes with lots of children keep clear of clutter
			    .charge(function(d) { return -300 * (d['total_reactions'] / 500); })
			    .chargeDistance(500)
			    .gravity(0.01)
			    .theta(0.8)
			    // .alpha(0.1)

			var defs = svg.append('svg:defs');
			defs.selectAll('marker')
			    .data([0])      // Different link/path types can be defined here
			  .enter().append('svg:marker')    // This section adds in the arrows
			    .attr('id', function(d) { return d; })
			    .attr('viewBox', '0 -5 10 10')
			    .attr('refX', function(d) { 
			        return 2 * NODE_RADIUS *
			            LINK_ARROW_RADIUS_RATIO + 
			            LINK_ARROW_OFFSET
			     })
			    .attr('refY', 0)
			    .attr('markerWidth', 6)
			    .attr('markerHeight', 6)
			    .attr('orient', 'auto')
			    .attr('fill',function(d) { return nodeFillColor(0); })
			  .append('svg:path')
			    .attr('d', 'M0,-5L10,0L0,5');

			/*** Drag handlers section ***/
			var dragStart = function(d) {
			    // noop
			}

			// sets fixed state after drag
			var dragEnd = function(d) { 
			    var e = d3.event.sourceEvent;
			    if (e.defaultPrevented || e.which == 3) return;
			    e.stopPropagation();
			    currentlySelectedResource = d3.select(this).data()[0];

			    if (e.ctrlKey || e.shiftKey) {
			        d3.select(this).classed('fixed', d.fixed = true)
			    } else {
			        d3.select(this).classed('fixed', d.fixed = true)
			    }
			}

			// create drag handler (for nodes)
			var drag = force.drag()
			    .on('dragstart', dragStart)
			    .on('dragend', dragEnd);

			var nodeClick = function(d) {
			    if (d3.event.defaultPrevented) return;

			    var e = d3.event;
			    console.log(e);
			    e.stopPropagation();
			    currentlySelectedResource = d3.select(this).data()[0];
			    if (e.ctrlKey || e.shiftKey) {
			      d3.select(this).classed('fixed', d.fixed = true);
			      return;
			    }
			}

			// good zoom/pan function
			var zoomHandler = function(newScale) {
			    scale = d3.event.scale;
			    translation = d3.event.translate;
			    zoom.translate(translation);
			    zoom.scale(scale);
			    d3.select('svg g')
			        .attr('transform', 'translate(' + translation + ')' + ' scale(' + scale + ')');
			};

			// zoom listener
			var zoom = d3.behavior.zoom()
			    .center([width/2,height/2])
			    .scaleExtent([0.001, 10])
			    .on('zoom', zoomHandler);
			container.call(zoom);

			var tip = d3.tip()
			  .attr('class', 'd3-tip')
			  .offset([-10, 0])
			  .html(function(d) {
			  	if (d['message']) {
			    	return "<div style='text-align:center;max-width:400px;'><p style='font-weight:initial;'>" + d['message'] + "</p><strong>Total likes:</strong> <span style='color:red'>" + d['total_reactions'] + "</span>";
			    }
			    else {
			    	return "<div style='text-align:center;max-width:400px;'><strong>Total likes:</strong> <span style='color:red'>" + d['total_reactions'] + "</span>";
			    }
			  });

			container.call(tip);

			/***
			    Force tick
			                ***/
			// todo add collision handling
			force.on('tick', function() {

			    link.attr('x1', function(d) { return d.source.x; })
			        .attr('y1', function(d) { return d.source.y; })
			        .attr('x2', function(d) { return d.target.x; })
			        .attr('y2', function(d) { return d.target.y; });

			    // tip.attr()

			    // node.attr('transform', function(d) { return "translate(" + d.x + "," + d.y + ")"; });
            	image.attr('transform', function(d) { return "translate(" + d.x + "," + d.y + ")"; });
			});

			// var node = nodegroup.selectAll('.node');
			var link = linkgroup.selectAll('.link');
    		var image = imagegroup.selectAll('.node.node-image');

			init = function() { 
			    // node = nodegroup.selectAll('.node').data(force.nodes());
			    link = linkgroup.selectAll('.link').data(force.links());
        		image = imagegroup.selectAll('.node.node-image').data(force.nodes());

			    // .enter() - the new objects added to data
			    // .exit() - the old objects removed from data
			    link.enter().append('line')
			        .attr('class','link')
			        .attr('marker-end', function(d) { return 'url(#0)' })
			        .style('stroke', function (d) { return nodeFillColor(1); })
			        .style('display', 'inline')
			        .style('pointer-events','none');

			    // node.enter().append('circle')
			    //     .attr('r', function(d) { return d.r; })
			    //     .style('fill', function(d) { return nodeFillColor(0); })
			    //     .style('display', 'inline')
			    //     .call(drag)
			    //     .on('click', nodeClick)
			    //     .attr('class', function(d) { if (d.fixed) return 'node fixed context-menu-node'; else return 'node context-menu-node'; });

			    image.enter().append('svg:image')
			        .attr('xlink:href', function(d) { return d['full_picture']; })
			        .attr('width', function(d) { return d.r*3 })
			        .attr('height', function(d) { return d.r*3 })
			        .attr('x', function(d) { return -d.r*1.5 })
			        .attr('y', function(d) { return -d.r*1.5 })
			        .style('display','none')
			        .call(drag)
			        .on('click', nodeClick)
			        .on('mouseover', tip.show)
			        .on('mouseout', tip.hide)
			        .attr('class', function(d) { if (d.fixed) return 'node node-image fixed context-menu-node'; else return 'node node-image context-menu-node'; });

			    start();
			}

			start = function() {
			    var linkVis = [];
			    var linkNoVis = [];
			    var nodeVis = [];
			    var nodeNoVis = [];

			    // link[0].forEach(function(d) {
			    //     ((d.__data__.vis && 
			    //         (d.__data__.target.vis && !d.__data__.target.visLock) && 
			    //         (d.__data__.source.vis && !d.__data__.source.visLock)) ? 
			    //     linkVis : linkNoVis).push(d);
			    // });

			    d3.selectAll(linkVis)
			        .style('display','inline')
			        .attr('marker-end', function(d) { 
			            return 'url(#0)';
			        });
			    // d3.selectAll(linkNoVis).style('display','none');

		        // force.linkDistance(60)
		        //     // normal
		        //     .charge(function(d) { return -30*d.weight - 300; })
		        //     .chargeDistance(5000)
		        // nodegroup.style('display','inline');
		        imagegroup.style('display','inline');
		        // node[0].forEach(function(d) {
		        //     ((d.__data__.vis && !d.__data__.visLock) ? nodeVis : nodeNoVis).push(d);
		        // });
		        image[0].forEach(function(d) {
		            ((d.__data__.vis && !d.__data__.visLock) ? nodeVis : nodeNoVis).push(d);
		        });
		        d3.selectAll(nodeVis)
		            .attr('r', function(d) { return d.r; })
		            .classed('fixed', function(d) { return d.fixed; })
		            .style('display','inline');
		        d3.selectAll(nodeNoVis).style('display','none');

			    // apply our visibility changes to the nodes in the force object
			    force.nodes(nodes.filter(function(d) { return d.vis; }))
			        .links(links.filter(function(d) { 
			            return (d.vis && 
			                (d.target.vis && !d.target.visLock) && 
			                (d.source.vis && !d.source.visLock)); 
			            }));

			    // restart the force
			    force.start();
			}
			init();
		}
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