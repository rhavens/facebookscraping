(function(){
	$(document).ready(function() {
		console.log('hello, world');

		var refreshPending = false;
		$('#data-refresh').on('click', function(e) {
			console.log(e);
			if (!refreshPending) {
				refreshPending = true;
				$.ajax({
					url: '/data-refresh',
					contentType: 'text/plain',
					dataType: 'json',
					method: 'GET',
					success: function(data) { refreshSuccess(data); },
					error: function(a, b, c) { refreshError(a, b, c); }
				});
			}
		});

		// handle data successfully loaded
		function refreshSuccess(data) {
			refreshPending = false;
			displayMessage('success', 'Success', 'Successfully fetched data.');
		}

		// handle error TODO add retries
		function refreshError(jqXHR, textStatus, errorThrown) {
			refreshPending = false;
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