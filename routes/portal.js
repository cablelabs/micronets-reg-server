/* Handle clinic UI requests 
 */

'use strict'

const express = require('express');
const router = express.Router();

const deviceMap = require('../lib/device-map.js');


// Full UI
router.get('/device-list', function(req, res) {
    console.log(JSON.stringify(deviceMap.advertisedDevices()));
    res.render('device-list', {devices: deviceMap.advertisedDevices()});
});

// Browser client has received notification that the subscriber has accepted the device.
// Request a CSR templete, and return it to the device.
router.get('/pair-device', function(req, res) {
    const device = deviceMap.get(req.query.uid);
    if ( device != undefined) {
        deviceMap.pairDevice(req.query.uid, req.query.token, req.query.subscriber, function(error) {
            if (error) {
                let err = new Error(error.error + ": "+error.status);
                res.render('error', {
                    message: err.message,
                    error: err
                });
            }
            else {
                res.render('pair-device', {device: device, ssid: req.query.ssid});
            }
        });
    }
    else {
       let err = new Error('Bad Request: Device Not Found: '+req.query.uid);
       err.status = 400;
       res.render('error', {
         message: err.message,
         error: err
       });
    }
});

// Subscriber has selected the device (we don't know who subscriber is yet) (XHR)
router.get('/select-device/:uid', function(req, res) {
    const device = deviceMap.get(req.params.uid);
    if (deviceMap.selectDevice(req.params.uid) == true) {
        console.log("device selected: "+JSON.stringify(device));
        res.status(200);
        res.send("Ok\n");                
    }
    else {
        res.status(400);
        res.send("Device not found\n");                
    }
});

// List of devices (XHR)
router.get('/device-list/update', function(req, res) {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(deviceMap.advertisedDevices(), null, 2));
});

// Device HTML
router.get('/device-html/:uid', function(req, res) {
    res.set('Content-Type', 'application/html');
    const device = deviceMap.get(req.params.uid);
    if (device == undefined) {
        device = {"device":{"TYPE": req.params.uid, "UID": req.params.uid, "SN": "Not found", "MFG": "Not found", "MODEL": "Not found"}}
    }
    console.log(JSON.stringify(device));

    res.render('partials/device-update', {device: device});
});

// Get the status of the pairing operation (XHR)
router.get('/pair-status/:uid', function(req, res) {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(deviceMap.getStatus(req.params.uid), null, 2));
});

module.exports = router;
