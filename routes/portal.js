/* Handle clinic UI requests 
 */

'use strict'

const express = require('express');
const router = express.Router();
const config = require('../lib/config.js');
const deviceMap = require('../lib/device-map.js');

// Full UI
router.get('/device-list', function(req, res) {
    console.log(JSON.stringify(deviceMap.advertisedDevices()));
    //console.log("auth-server-url: "+config.authServerUrl);
    res.render('device-list', {devices: deviceMap.advertisedDevices(), 'auth_server_url': config.authServerUrl});
});

// Browser client has received notification that the subscriber has accepted the device (scanned QRCode).
// Request a CSR templete, and return it to the device, and render device pairing screen to browser.
router.get('/pair-device', function(req, res) {    
    deviceMap.pairDevice(req.query.uid, req.query.token, req.query.subscriber, function(error, device) {
        if (!error && device) {
            res.render('pair-device', {device: device, ssid: req.query.ssid});                
        }
        else {
            let err = new Error(error.error + ": "+error.status);
            res.render('error', {
                message: err.message,
                error: err
            });
        }
    });
});

// Subscriber has selected the device (we don't know who subscriber is yet) (XHR)
router.get('/select-device/:uid', function(req, res) {
    deviceMap.selectDevice(req.params.uid, function(err) {
        if (!err) {
            res.status(200).end();                 
        }
        else {
            res.status(err.status);
            res.send(err.message);                
        }
    });
});

// List of devices (XHR)
router.get('/device-list/update', function(req, res) {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(deviceMap.advertisedDevices(), null, 2));
});

// Device HTML (XHR)
router.get('/device-html/:uid', function(req, res) {
    res.set('Content-Type', 'application/html');
    let device = deviceMap.get(req.params.uid);
    if (device == undefined) {
        device = {"device":{"TYPE": req.params.uid, "UID": req.params.uid, "SN": "Not found", "MFG": "Not found", "MODEL": "Not found"}}
    }
    res.render('partials/device-update', {device: device});
});

// Get the status of the pairing operation (XHR). Browser polls for status until complete or error
router.get('/pair-status/:uid', function(req, res) {
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(deviceMap.getStatus(req.params.uid), null, 2));
});

module.exports = router;
