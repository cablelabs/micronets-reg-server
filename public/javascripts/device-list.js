// device-list.js

var newStatus = "waiting";

function onLoad() {

	var effect = "twisterInDown";

	setStatus();

	// testing
	//$('#device-1').addClass("magictime "+effect);

	setTimeout(function(){
		//console.log("tinRightIn");
		//$('#testdiv').addClass("magictime magic-in");
		$('.device').addClass("magictime magic-in");
	}, 500);

	$('#prescriptions').on("click", function(){
		newStatus = "select";
		$('#device-1').addClass("magictime "+effect);
	});

	$('#administration').on("click", function(){
		newStatus = "select";
		$('#device-2').addClass("magictime "+effect);
	});

	$('#appointments').on("click", function(){
		newStatus = "waiting";
		$('#device-1').removeClass("magictime "+effect);
		$('#device-2').removeClass("magictime "+effect);
		setStatus();
	});

	// All animations. Set newStatus first.
	$('#device-1').on('animationend',  function(e) {
		setStatus();
  	});
	$('#device-2').on('animationend',  function(e) {
		setStatus();
  	});
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

function removeDevice(elemID) {
	var element = $('#'+elemID);

  	$(element).on('transitionend animationend',  function(e) {
  		console.log("animation ended");
  		$(element).remove();
		updateStatus();
  	});

  	$(element).css("opacity", 1);
  	$(element).removeClass("magic-in");
  	$(element).addClass("begone");

  	//setTimeout(function(){
  	//	console.log("timeout");
  	//	$('#'+elemID).remove();
  	//},1000);
}

function clickDevice(element) {

	// testing
	removeDevice($(element).attr("id"));
}

function updateList() {

}

function updateStatus() {

}
