/* Shared device map for advertising and onboarding */

'use strict'
const msoPortalUrl = require('../lib/config.js').msoPortalUrl;
const CircularJSON = require('circular-json');
const request = require('request-promise');

// Private
var devices = {};
var sessions = {};  // Long poll requests from devices

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
    /* Device sent an advertise message. This is a long poll and does not return until:
        - the device has been selected
        - the device has been associated with a subscriber (QRCode scanned)
        - a CSRT has been obtained
    */
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
    selectDevice: function(UID, callback) {
        let dev = devices[UID];
        if (dev == undefined) {
            callback({error: "Device not found", status: 410});
        }
        else if (dev.state != PAIR_STATE_ADVERTISED) {
            callback({error: "Invalid state: "+dev.state, status: 500});
        }
        else {
            // Success
            dev.state = PAIR_STATE_SELECTED;
            callback(null);
        }
    },
    // Clinic browser (subscriber) authorized device. (e.g. QRCode was scanned)
    pairDevice: function(UID, token, subscriberID, callback) {
        (async () => {

            let dev = devices[UID];
            let session = sessions[UID];
            let http_status = 500;  // Default error status

            try {
                if (dev == undefined ) {
                    http_status = 410;
                    throw "Device not found: "+UID;
                }
                if (dev.state != PAIR_STATE_SELECTED) {
                    http_status = 500;
                    throw "Invalid device state: "+ dev.state;
                }
                if (session == undefined) {
                    http_status = 410;
                    throw "Session not found for device: "+UID;
                }

                // Save token, we'll need it later
                dev.token = token;
                dev.state = PAIR_STATE_CSRT_REQUESTED;

                // Request CSRT from MSO Portal
                const response = await request({
                    uri: msoPortalUrl+"/ca/csrt",
                    method: "POST",
                    headers: {"authorization": token},
                    json: {"subscriberID": subscriberID}
                });

                // json: above ensures response is also json
                //var reply = JSON.parse(response);

                // Success. Add the registration token to the CSRT response and pass the message back to the device
                dev.state = PAIR_STATE_CSRT_RECEIVED;
                response.token = token;
                session.res.send(JSON.stringify(response, null, 2));
                callback(null, dev);
            } 
            catch (e) {
                console.log("pair-device failed: "+JSON.stringify(e));
                const err = { error: e, status: http_status};
                if (dev) {
                    dev.state = PAIR_STATE_FAILED;
                    dev.error = err;
                }
                if (session) {
                    session.res.status(err.status);
                    session.res.send(JSON.stringify(err, null, 2));
                }
                callback(err);
            }
            finally {
                // End of device long poll
                delete sessions[UID];
            }
        })();
    },
    // Device has created and submitted a CSR 
    requestCert: function(req, res) {

        (async () => {

            let dev = devices[req.body.UID];
            let http_status = 500;  // Default error status

            try {
                if (dev == undefined ) {
                    http_status = 410;
                    throw "Device not found: "+UID;
                }
                if (dev.state != PAIR_STATE_CSRT_RECEIVED) {
                    http_status = 500;
                    throw "Invalid device state: "+ dev.state;
                }
                if (req.headers.authorization != dev.token) {
                    http_status = 403;
                    throw "Forbidden";
                }

                dev.state = PAIR_STATE_CERT_REQUESTED;

                var uri = msoPortalUrl+"/ca/cert";

                // Request CERT from MSO Portal
                const response = await request({
                    uri: uri,
                    method: "POST",
                    headers: {"authorization": req.headers.authorization},
                    json: {"csr": req.body.csr}
                });

                // Success. Just pass the message back to the device
                dev.state = PAIR_STATE_CERT_RECEIVED;
                res.send(JSON.stringify(response, null, 2));
            } 
            catch (e) {
                const err = { error: e, status: http_status};
                if (dev) {
                    dev.state = PAIR_STATE_FAILED;
                    dev.error = err;
                }
                res.status(err.status);
                res.send(JSON.stringify(err, null, 2));

                console.log("requestCert failed: "+JSON.stringify(e));
            }
        })();
    },
    // Device has received and stored the certificates
    pairComplete: function(req, res){
        let dev = devices[req.body.UID];
        let http_status = 500;  // Default error status
        try {
            if (dev == undefined ) {
                http_status = 410;
                throw "Device not found: "+UID;
            }
            if (dev.state != PAIR_STATE_CERT_RECEIVED) {
                http_status = 500;
                throw "Invalid device state: "+ dev.state;
            }
            if (req.headers.authorization != dev.token) {
                http_status = 403;
                throw "Forbidden";
            }

            dev.state = PAIR_STATE_COMPLETE;
            res.send("Device Pairing Complete");
        }
        catch(e) {
            const err = { error: e, status: http_status};
            if (dev) {
                dev.state = PAIR_STATE_FAILED;
                dev.error = err;
            }
            res.status(err.status);
            res.send(JSON.stringify(err, null, 2));
            console.log("pair-complete failed: "+JSON.stringify(e));
        }
    },
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