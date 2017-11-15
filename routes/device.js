/* Handle device requests 
   - Advertise onboard availability
   - CSR
   - Reset device
 */

var express = require('express');
var router = express.Router();
var deviceMap = require('../lib/device-map.js');

deviceMap.debug = true

//router.get('/', function(req, res, next) {
//  res.send('respond with a resource');
//});

router.get('/list', function(req, res, next) {
  res.send(JSON.stringify(deviceMap.list()));
});

// This is a long poll operation. When we are selected by the subscriber, we will return a CSR template
// to be executed by the device
router.post('/advertise', function(req, res) {

  // Give device some time to repost advertisement if timed out
  req.on("close", function() {
    console.log(" - request closed unexpectedly");
    const now = Date.now();
    setTimeout(function(){
      deviceMap.release(req.body.UID, now);
    },1000);
  });

  req.on("end", function() {
    console.log(" - request ended normally");
    deviceMap.release(req.body.UID)
  });

  console.log("received /advertise");

  deviceMap.advertise(req.body);
  //res.send("completed");
});

module.exports = router;
