'use strict'

/* Handle device requests 
   - Advertise onboard availability, CSR  template returned.
   - Request Certificate
   - Reset device
 */

const express = require('express');
const router = express.Router();
const deviceMap = require('../lib/device-map.js');

//deviceMap.debug = true;

router.get('/list', function(req, res, next) {
    res.send(JSON.stringify(deviceMap.devices()));
});

// This is a long poll operation. When the device is selected/authorized by the subscriber, we will return a CSR template
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
        deviceMap.release(req.body.UID);
    });

    console.log("received /advertise: " + res);

    // request terminates in deviceMap when CSR is returned or an error is encountered.
    deviceMap.advertise(req, res);
});

// Cancel the advertisement (long poll), if present.
router.post('/cancel', function(req, res) {
    console.log("/cancel: "+JSON.stringify(req.body));
    deviceMap.cancel(req, res);
});

// The device has created and signed a CSR (using the template returned from advertise)
// Forward this to the mso portal, along with the registration token.
router.post('/cert', function(req, res) {
    console.log("/cert: headers: "+JSON.stringify(req.headers));
    deviceMap.requestCert(req, res);
});

// Device has received and stored the wifi cert
router.post('/pair-complete', function(req, res) {
    deviceMap.pairComplete(req, res);
});

module.exports = router;
