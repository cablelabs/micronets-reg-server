// device-list.js

'use strict'

var newStatus = "waiting";
var deviceTimer;
var authTimer;
var deviceSelected = false;
var authWindow;
var deviceID;
var deviceInfo;

const clientID = "clinic-858";
	
// This is not the MSO portal
let msoAuthServer;

// Must match route in routes/portal.js
let baseURL = location.href.substring(0,location.href.indexOf('portal/device-list'));

// popup checker
var childWindow;
var cookieName = "popups-enabled";
function popupCallback() {
	console.log("child called back");
	Cookies.set(cookieName, "true");
	setTimeout(function(){
		childWindow.close();
	}, 3000);
}

function onLoad() {

	// !! Need to download MSO configuration array
	// !! MSO Selection screen determines msoAuthServer
	// !! Need to pass selected MSO to pair-device

	msoAuthServer = $('#auth-server-url').html();

	// Initial load has device list populated, but devices are hidden.
	setTimeout(function(){
		$('.device').addClass("magictime magic-in");
	}, 500);

	//  Use menu as test buttons (debug).
	$('#prescriptions').on("click", function(){
		//modalError({"code": 404,"message": "Resource Not Found", "description": "An error occurred during device authorization"});
	});

	$('#administration').on("click", function(){
	});

	$('#appointments').on("click", function(){
	});

	updateStatus();

	// Poll for changes
	deviceTimer = setInterval(updateList, 1000);

	$('#modalCurtain').on('click', function(){
		endModal();
		approveCancel();
	});

	$('#modalCurtain').on('focus', function(){
		endModal();
		approveCancel();
	});

	$(window).focus(function(){
		if (authWindow) {
			endModal();
			approveCancel();
		}
	});

	// Ensure user has popups enabled for this site.
	function popupCheck() {
		console.log("onLoad");

		if (!Cookies.get(cookieName)) {
			console.log("popup cookie not set yet");

			childWindow = window.open("/portal/popup-check", "", "width=400, height=10" );

			var timer = setTimeout(function(){
				if (!Cookies.get(cookieName)) {
					alert("Please Allow Popups for this site (Micronets Demo)");
				}
			}, 3000);
		}
	}
	popupCheck();

}

function setStatus() {
	switch (newStatus) {
	case "select":
		$('#working').addClass('hidden');
		$('#status-msg').html("Please select a device");
		break;
	case "waiting":
		$('#working').removeClass('hidden');
		$('#status-msg').html("Waiting for devices");
		break;
	default:
		$('#working').addClass('hidden');
		$('#status-msg').html("");
		break;

	}
}

function addDevice(UID) {
	const url = baseURL + "portal/device-html/"+UID;
    const request = new XMLHttpRequest();
    request.issue(url, function(response){
        if (response.httpStatus === 200) {
        	$('#device-list').append(response.responseText);
        	$('#'+UID).one('transitionend animationend',  function(e) {
				updateStatus();
  			});

        	$('#'+UID).addClass("magictime magic-in");
        }
        else {
            const msg = response.error ? response.error : "HTTP 1.0 "+response.httpStatus;
            console.log("Failed to retrieve device-list/update - "+ msg + " - "+response.responseText);
        }
    });
}

function removeDevice(elemID) {
	const element = $('#'+elemID);

  	$(element).one('transitionend animationend',  function(e) {
  		//console.log("animation ended");
  		$(element).remove();
		updateStatus();
  	});

  	$(element).css("opacity", 1);		// Keep visible after magic-in removed
  	$(element).removeClass("magic-in");
  	$(element).addClass("begone");
}

function selectMSO() {
	// Tell server we selected the mso
	console.log("selectMSO()");
    const request = new XMLHttpRequest();
    var msoIndex = $(".selector select")[0].selectedIndex;
    const url = baseURL + 'portal/select-mso/' + msoIndex;
    request.issue(url, function(response){
        if (response.httpStatus === 200) {
        	msoAuthServer = response.responseText;
        	console.log("Selected MSO: "+msoIndex+" - authServerURL: " + msoAuthServer);

        	$('#mso-select').removeClass("topmost");
			$('#mso-select').removeClass("arrive").addClass("begone");


        	setTimeout(function(){
				showModalPopUp(deviceInfo.device);
				// Remove before authenticating. If we cancel, or encounter an error, we will see the device reappearing.
				removeDevice(deviceID);
			},500);

        }
        else {
            const msg = response.error ? response.error : "HTTP 1.0 "+response.httpStatus;
            var errmsg = "Failed to select MSO - "+ msg + " - "+response.responseText;
            console.log(errmsg);
            alert(errmsg);
        }
    });

}

function clickDevice(element) {

	console.log("clickDevice");

	// disable device updates
	deviceSelected = true;
	deviceID = $(element).attr("id");

    // Remove all but selected
	$('.device').each(function(i, elem){
		if (elem.id != deviceID) {
			removeDevice(elem.id);
		}
	});

	// Tell server we selected the device
    const request = new XMLHttpRequest();
    const url = baseURL + 'portal/select-device/' + deviceID;
    request.issue(url, function(response){
        if (response.httpStatus === 200) {
        	console.log("Selected device: "+deviceID);
			const json = $('#'+deviceID+' .json').html();
			deviceInfo = JSON.parse(json);

			// TODO: Need to select MSO here, and then call a function that calls the code below.
			$('#'+deviceID).removeClass("magic-in").addClass("begone")
			$('#'+deviceID).css('z-index', -10);

			setTimeout(function(){
				$('#mso-select').addClass("magictime arrive");
				$('#mso-select').addClass("topmost");

			}, 500);
        }
        else {
            const msg = response.error ? response.error : "HTTP 1.0 "+response.httpStatus;
            console.log("Failed to select device - "+ msg + " - "+response.responseText);
        }
    });
}

function updateList() {

	if (!deviceSelected) {
	    const request = new XMLHttpRequest();
	    let url = location.href;
	    if (url.slice(-1) == '#') {
	    	url = url.slice(0, -1);
	    }
	    url += "/update";
	    request.issue(url, function(response){
	        if (response.httpStatus === 200) {
	        	if(!deviceSelected) {
		        	const deviceList = JSON.parse(response.responseText);

		        	// Check for removed devices
		        	$('.device').each(function(i, elem){
		        		
		        		let found = false;
		        		deviceList.forEach(function(dev, j) {
		        			if (dev.device.deviceID == elem.id) {
		        				found = true;
		        			}
		        		});

		        		if (!found) {
		        			removeDevice(elem.id);
		        		}
		        	});

		        	// Check for new devices
		        	deviceList.forEach(function(dev, i){
		        	
		        		let found = false;
		        		$('.device').each(function(j, elem) {
		        			if (elem.id == dev.device.deviceID) {
		        				found = true;
		        			}
		        		});

		        		if (!found) {
		        			addDevice(dev.device.deviceID);
		        		}
		        	});
	        	}
	        }
	        else {
	            const msg = response.error ? response.error : "HTTP 1.0 "+response.httpStatus;
	            console.log("Failed to retrieve device-list/update - "+ msg + " - "+response.responseText);
	        }
	    });
	}
}

function updateStatus() {

	const count = $('.device').length;
	if (count) {
		$('#status-msg').html("Please select a device to register");
		$('#working').addClass('hidden');
	}
	else {
		$('#status-msg').html("Waiting for devices..");
		$('#working').removeClass('hidden');		
	}
}

/*
 http://10.70.16.158:9001/register-device
	?client_id=clinic-858
	&vendor=Panasonic
	&model=Accu-Pulse
	&type=Heart%20Monitor
	&serial=PHM-00001234

device-map:
{
  "9C5DBA55-48E7-449F-ABD0-B449FFF5EF90": {
    "device": {
      "UID": "9C5DBA55-48E7-449F-ABD0-B449FFF5EF90",
      "SN": "AMHM-00121",
      "MFG": "AcmeMeds",
      "TYPE": "Heartrate Monitor",
      "MAC": "4C:32:75:90:33:B3,08:00:69:02:01:FC,B8:27:EB:BC:23:E5",
      "MODEL": "Heart-Assure"
    },
    "timestamp": 1512146515967
  }
}
*/

function modalError(error) {
	$('#errorDescription').html(error.description);
	$('#errorStatus').html(error.code);
	$('#errorMessage').html(error.message);
	$('#modalError').css("display", "block");
	$('#modalError').removeClass("invisible");

}
// Here to logically redirect to the authorization server (not an actual redirect, but a modal popup browser window)
function showModalPopUp(deviceInfo) {
	console.log("showModalPopup");
	const query = {
		"clientID": clientID,
		"deviceID": deviceInfo.deviceID,
		"vendor": deviceInfo.vendor,
		"model": deviceInfo.model,
		"type": deviceInfo.type,
		"macAddress": deviceInfo.macAddress,
		"deviceConnection": deviceInfo.deviceConnection,
		"deviceName": deviceInfo.deviceName,
		"serial": deviceInfo.serial,
		"class": deviceInfo.class,
		"modelUID64": deviceInfo.modelUID64,
		"mudURL": deviceInfo.mudURL,
		// This needs to be relative as it will be added to baseURL later using URL()
		"redirect_uri": "portal/pair-device"
	};

	const popupWidth = 500;
	const left = (window.screen.availWidth - popupWidth) / 2;

	const authUrl = msoAuthServer+"/register-device?" + $.param(query);
	console.log("authUrl: "+authUrl);

    authWindow = window.open(authUrl,
	    "AuthorizeDevice-"+Math.random().toString().replace(/[^a-z0-9]+/g, ''),
	    "toolbar=no," +
	    "scrollbars=no," +
	    "location=no," +
	    "statusbar=no," +
	    "menubar=no," +
	    "resizable=0," +
	    "width=" + popupWidth + "," +
	    "height=575," +
	    "left=" + left + "," +
	    "top=100"
	);
	
    authWindow.focus();
    $('#modalCurtain').css("display", "block");

    postRobot.on('deviceApproved', function(event) {
    	deviceApproved(event.data, deviceInfo.deviceID);
	});

    postRobot.on('error', function(event) {
    	approveError(event.data);
	});

    // Failsafe in case user closes popup window
    authTimer = setInterval(function(){
    	if (authWindow.closed !== false) { // !== is required for compatibility with Opera
    		// User closed auth window
    		clearInterval(authTimer);
        	approveCancel();
    	}
    },500);
}

// Redirect to pairing screen
function deviceApproved(response, deviceUID) {
	console.log("deviceApproved: "+JSON.stringify(response));
	endModal();
	let u = new URL(response.redirectURI, baseURL);
	const delim = (u.search == "") ? "?" : "&";
    location.href = u.href + delim + 
    	"uid=" + deviceUID + 
    	"&token=" + response.registrationToken + 
    	"&subscriber=" + response.subscriberID +
    	"&ssid=" + response.ssid;
}

// Display error message
function approveError(error) {
	endModal();

	if (error.status == 0) {
		// User closed the window
		approveCancel();
	}
	else {
		// display error	
		modalError({"status": error.status,"message": error.message, "description": "An error occurred during device authorization"});
		$('#modalCurtain').css("display", "none");
	}
}

// User dismissed error message
function dismissError() {
	// hide error box
	console.log("dismissError()");

	$('#modalError').addClass("invisible");

	$('#modalError').one('transitionend', function(e){
		$('#modalError').css("display", "none");
		deviceSelected = false;		// resume device updates
	});
}

// User dismissed MSO approval window.
function approveCancel() {
	console.log("approveCancel()");
	deviceSelected = false;		// resume device updates
	$('#modalCurtain').css("display", "none");
}

function endModal() {
	if (authTimer) {
		clearInterval(authTimer);
		authTimer = null;		
	}
	if (authWindow) {
		if (authWindow.closed === false) {
			authWindow.close();
		}
		authWindow = undefined;
	}
}
