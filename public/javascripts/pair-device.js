'use strict'

function onLoad() {

	const searchParams = new URLSearchParams(location.search)
	const uid = searchParams.get("uid");

	//return;
	// Make device details visible (reusing mixin from device list)
	$('.device').css('opacity', 1);
	$('.device').off('click');


	let state = 0;
	let limit = 0;

	let timer;

	// Poll registration server for status as pairing progresses.
	function getStatus() {
	    const request = new XMLHttpRequest();
	    const url = location.origin + '/portal/pair-status/' + uid;
	    request.issue(url, function(response){
	        if (response.httpStatus === 200) {
	        	let status = JSON.parse(response.responseText);
	        	if (status.state == status.complete) {
	        		limit = 100.0;
	        	}
	        	else {
	        		limit = status.state / status.complete * 100;
		        	setTimeout(function(){
		        		getStatus();
		        	}, 1000);
		        	if ( status.state != state) {
		        		state = status.state;
		        		console.log("pair-state: "+state);
		        	}
	        	}
	        }
	    });
	}

	getStatus();

	let value = 5.0;
	let incr = 2;
	let cycle = 0;

	timer = setInterval(function() {
		if (incr > .5 || cycle > 100) {
			incr = Math.random() * 3.5 + .1;
			cycle = 0;
		} else {
			cycle++;
		}

		if (value < limit) {
			value += incr;
		}

		if (value >= 100.0) {
			value = 100.0;
			clearInterval(timer);
			$('#progress').css("opacity", 0);
			$('.modal-body').addClass("finished");
			$('#modal-header-text').html("Device Registration Complete")
			$('.device-registered').css("display", "block");
			$('.boxclose').css("display", "block");
		}
		document.getElementById("progress").value = value;
	}, 30);
}

function endPairing() {
	location.href = "/portal/device-list";
}