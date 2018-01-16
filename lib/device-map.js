/* Shared device map for advertising and onboarding */

'use strict'
const http_post = require('../lib/http_request.js').http_post;
const msoPortalUrl = require('../lib/config.js').msoPortalUrl;
const CircularJSON = require('circular-json');

// Private
var devices = {};
var sessions = {};

const PAIR_STATE_ADVERTISED = 0;
const PAIR_STATE_SELECTED = 1;
const PAIR_STATE_CSRT_REQUESTED = 2;  
const PAIR_STATE_CSRT_RECEIVED = 3;
const PAIR_STATE_CERT_REQUESTED = 4;
const PAIR_STATE_CERT_RECEIVED = 5;
const PAIR_STATE_COMPLETE = 6;
const PAIR_STATE_FAILED = -1;
const PAIR_STATE_NOTFOUND = -2;

// Public. 
const self = module.exports = {
    // Device sent an advertise message
    advertise: function(req, res) {

        var meta = req.body;
        const uid = meta.UID;

        // Preserve request/response for this long poll. 
        sessions[uid] = {};
        sessions[uid].req = req;
        sessions[uid].res = res;

        if (devices[uid] != undefined) {
            // We have been re-advertised. Try not to delete/add as it will reflect on the UI. Likely 
            // the long poll has timed out and reissued
            devices[uid].timestamp = Date.now();
            devices[uid].state = PAIR_STATE_ADVERTISED;
            delete devices[uid].error;
        }
        else {
            // New device
            let dev = {};
            dev.device = meta;
            dev.timestamp = Date.now();
            dev.state = PAIR_STATE_ADVERTISED;

            devices[uid] = dev;
            if (self.debug) {
                self.dump();
            }
        }
    },
    // Clinic browser selected device
    selectDevice: function(UID) {
        let dev = devices[UID];
        if (dev != undefined && dev.state == PAIR_STATE_ADVERTISED) {
            dev.state = PAIR_STATE_SELECTED;
            return true;
        }
        else {
            return false;
        }
    },
    // Clinic browser (subscriber) authorized device. (e.g. QRCode was scanned)
    pairDevice: function(UID, token, subscriberID, callback) {

        let dev = devices[UID];
        if (dev != undefined && dev.state == PAIR_STATE_SELECTED) {

            // Save token, we'll need it later
            dev.token = token;
            dev.state = PAIR_STATE_CSRT_REQUESTED;

            const headers = {
                "authorization": token,
                "content-type": "application/json"
            };

            const body = {
                "subscriberID": subscriberID
            };

            // Request CSRT from MSO Portal
            http_post(msoPortalUrl+"/ca/csrt", headers, body, function(error, response) {
                
                if (error != null || response.error != null) {
                    let err = {};
                    err.error = error ? error : response.error;
                    err.status = 400;
                    dev.error = err;

                    sessions[UID].res.status(err.status);
                    sessions[UID].res.send(JSON.stringify(err, null, 2));

                    callback(err);
                }
                else {
                    dev.state = PAIR_STATE_CSRT_RECEIVED;

                    // Success. Add the registration token to the CSRT response and pass the message back to the device
                    response.token = token;

                    sessions[UID].res.send(JSON.stringify(response, null, 2));
                    callback(null);
                }
                // End of device long poll
                delete sessions[UID];
            });
        }
        else {
            // Device not found or invalid state. End of device long poll
            let err = {};

            if (dev == undefined) {
                err.error = "Device not found: "+UID;
            }
            else {
                err.error = "Invalid Device State. Expected: "+PAIR_STATE_SELECTED+ ", Got: "+dev.state;
                dev.error = err;
                dev.state = PAIR_STATE_FAILED;
            }
            err.status = 400;

            if (sessions[UID]) {
                sessions[UID].res.status(err.status);
                sessions[UID].res.send(JSON.stringify(err, null, 2));
                delete sessions[UID];
            }
            else {
                console.log("session not found for : "+UID);
            }


            callback(err);
        }
    },
    // Device has created and submitted a CSR 
    requestCert: function(req, res){
        let dev = devices[req.body.UID];
        if (dev != undefined && dev.state == PAIR_STATE_CSRT_RECEIVED
            && req.headers.authorization == dev.token) {

            dev.state = PAIR_STATE_CERT_REQUESTED;

            const headers = {
                "authorization": req.headers.authorization,
                "content-type": "application/json"
            };

            const body = {
                "csr": req.body.csr
            };

            // Request signed certificate from MSO Portal
            // Return this certificate plus CA certificate and subscriber SSID
            http_post(msoPortalUrl+"/ca/cert", headers, body, function(error, response) {
                
                if (error != null || response.error != null) {
                    let err = {};
                    err.error = error ? error : response.error;
                    err.status = 400;
                    dev.error = err;

                    res.status(err.status);
                    res.send(JSON.stringify(err, null, 2));
                }
                else {
                    // Success. Just pass the message back to the device
                    dev.state = PAIR_STATE_CERT_RECEIVED;
                    res.send(JSON.stringify(response, null, 2));
                }
            });
        }
        else {
            let err = {};
            if (dev == undefined) {
                err.error = "Device not found: "+req.body.UID;
            }
            else {
                err.error = "Invalid Token: "+req.headers.authorization+" Expected: "+dev.token;
            }
            err.status = 400;

            res.status(err.status);
            res.send(JSON.stringify(err, null, 2));
        }
    },
    // Device has received and stored the certificates
    pairComplete: function(req, res){
        let dev = devices[req.body.UID];
        if (dev != undefined && dev.state == PAIR_STATE_CERT_RECEIVED
            && req.headers.authorization == dev.token) {
            dev.state = PAIR_STATE_COMPLETE;
            res.send("Device Pairing Complete");
        }
        else {
            let err = {};
            if (dev == undefined) {
                err.error = "Device not found: "+req.body.UID;
            }
            else {
                err.error = "Invalid Token: "+req.headers.authorization+" Expected: "+dev.token;
            }
            err.status = 400;

            res.status(err.status);
            res.send(JSON.stringify(err, null, 2));
        }

        // Comment out for debugging.
        self.release(req.body.UID);
    }
    // Pairing operation has completed, failed, or aborted
    release: function(UID, closeTime) {

        // End the advertisement
        if (devices[UID] != undefined) {

            if (closeTime && closeTime < devices[UID].timestamp) {
                // Reposted, don't release.
                return;
            }
        }
        delete devices[UID];
    },
    // Debug
    dump: function() {
        console.log("device-map:");
        console.log(JSON.stringify(devices, null, 2));
    },
    devices: function() {
        return devices;
    },
    // Clinic browser requested an array of advertised devices for UI
    advertisedDevices: function() {
        let ads = [];
        // Filter by state
        const keys = Object.keys(devices);
        for (let i=0; i<keys.length; i++) {
            const key = keys[i];
            const dev = devices[key];
            if (dev.state == PAIR_STATE_ADVERTISED) {
                ads.push(dev);
            }
        }
        return ads;
    },
    // Local request for device record
    get: function(UID) {
        return devices[UID];
    },
    // Clinic browser needs to update progress bar for pairing operation
    getStatus: function(UID) {
        let status = {};
        let dev = devices[UID];
        status.state = dev ? dev.state : PAIR_STATE_NOTFOUND;
        status.error = dev.error;
        status.complete = PAIR_STATE_COMPLETE;  // Upper bound
        return status;
    },
    debug: false
 }