(function(){
	global_data = {'data': null, 'updated_time': null}

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
				global_data['data'] = JSON.parse(data['data']);
				if ('updated_time' in data) {
					global_data['updated_time'] = data['updated_time'];
				}
				// if this data is stale, initiate a request for new data
				if ('stale' in data) {
					if (data['stale'] === '1') {
						console.log('refreshSuccess stale')
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
						console.log('refreshSuccess success')
						displayMessage('success', 'Success', 'Successfully fetched data.');
						// TODO
						// notifyUserOfDataUpdate(); // could also just force the data to display at this point
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
			refreshPending = false;
			console.log('refreshError')
			displayMessage('danger', 'Error', 'Something went wrong while fetching the data.');
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
				refreshPending = false;
				console.log('newDataReqSuccess no lock')
				displayMessage('success', 'Success', 'Successfully fetched data.');
				// TODO
				// notifyUserOfDataUpdate(); // could also just force the data to display at this point
			}
		}

		function newDataReqFailure(jqXHR, textStatus, errorThrown) {
			refreshPending = false;
			console.log('newDataReqFailure')
			displayMessage('danger', 'Error', 'Something went wrong while fetching the data.');
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