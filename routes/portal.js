/* Handle subscriber requests 
    - Select device to be onboarded (send CSR template to device)
 */

var express = require('express');
var router = express.Router();

//router.get('/', function(req, res, next) {
//  res.send('respond with a resource');
//});

var deviceMap = require('../lib/device-map.js');

router.get('/device-list', function(req, res) {
    console.log(JSON.stringify(deviceMap.list()));
    res.render('device-list', {devices: deviceMap.list()});
});

// This is a long poll operation. When we are selected by the subscriber, we will return a CSR template
// to be executed by the device
router.post('/pair', function(req, res) {

    req.on("close", function() {
        console.log(" - request closed unexpectedly");
        deviceMap.release(req.body.deviceID)
    });

    req.on("end", function() {
        console.log(" - request ended normally");
        deviceMap.release(req.body.deviceID)
   });
   
    console.log("received /advertise");

    deviceMap.advertise(req.body);
    //res.send("completed");
});


module.exports = router;
