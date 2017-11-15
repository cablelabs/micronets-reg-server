/* Shared device map for advertising and onboarding */

'use strict';

// Private
var devices = {}

let deviceIndex = 0;

/*
DEV="{ \"UID\" : \"$ID\",\
       \"SN\" : \"$SN\",\
       \"MFG\" : \"${VENDORS[$INDEX]}\",\
       \"TYPE\" : \"${TYPES[$INDEX]}\",\
       \"MODEL\" : \"${MODELS[$INDEX]}\"\
    }"
*/


// Public. 
var self = module.exports = {
     
    advertise: function(meta, callback) {

        console.log("advertise: "+JSON.stringify(meta));

        if (devices[meta.UID] != undefined) {
            devices[meta.UID].timestamp = Date.now();
        }
        else {
            //console.log("new device");
            var ad = {};
            ad.index = "DEV"+deviceIndex++;
            ad.device = meta;
            ad.timestamp = Date.now();
            ad.callback = callback;

            console.log("adding "+ad.index);

            devices[ad.device.UID] = ad;
            if (self.debug) {
                self.dump()
            }
        }
    },
    pair: function(UID, subscriber) {

        ad = devices[UID];
        if (ad != undefined) {
            // Create CSR Template
            csrData = {};
            csrData.subscriberID = subscriber.subscriberID;
            csrData.SSID = subscriber.SSID;

            // End the advertisement
            self.release(UID);

            // This will end the HTTP request
            ad.callback(csrData);
        }
        else {
            // 
        }
    }, 
    release: function(UID, closeTime) {
        // End the advertisement
        if (devices[UID] != undefined) {

            if (closeTime && closeTime < devices[UID].timestamp) {
                // Reposted, don't release.
                return;
            }
        }
        devices[UID] = undefined;
    },
    dump: function() {
        console.log("device-map:");
        console.log(JSON.stringify(devices, null, 2));
    },
    list: function() {
        return Object.values(devices);
    },
    debug: false
 }