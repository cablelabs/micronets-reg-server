/* xhr.js
 * 
 * Convenience methods for AJAX calls. 
 *
 * Copyright © CableLabs 2013. All Rights Reserved
 *
 * Usage: 
 *   var xhr = new XMLHttpRequest();
 *   xhr.issue("http://mydomain.com/file.txt", function(reply){} [,options]);
 *
 *   - callbackFunc is called with a reply object:
 *         {
 *             error : errorStr  // ONLY present on error
 *         }  
 *         otherwise:
 *         { 
 *             httpStatus: code, 
 *             responseText : text, 
 *             responseHeaders: {header : value, ...}
 *         }
 *   - options is an (optional) object containing:
 *         {
 *              method : <GET,POST,..>,     // default is GET
 *              headers : {header : value, ...},
 *              async : <true,false>        // default is true
 *         }
 */

 // JSHint 
 /*global XMLHttpRequest*/ 

 'use strict'

 (function (){

    //console.log("executing xhr.js")

    "use strict";

    // Add response header parser to all XmlHttpRequest objects.
    // Parses raw response header text into keyword/value pairs.
    XMLHttpRequest.prototype.responseHeaders = function(){
        const headerStr = this.getAllResponseHeaders();
        let headers = {};
        const headerPairs = headerStr.split('\u000d\u000a');
        
        for (let i = 0; i < headerPairs.length; i++) {
            const headerPair = headerPairs[i];
            // Can't use split() here because it does the wrong thing
            // if the header value has the string ": " in it.
            const index = headerPair.indexOf('\u003a\u0020');
            if (index > 0) {
                const key = headerPair.substring(0, index);
                const val = headerPair.substring(index + 2);
                headers[key] = val;
            }
        }
        return headers;
    };

    // Convenience method to configure, open, send and call back when complete
    XMLHttpRequest.prototype.issue = function(url, callbackFunc, options) {

        let reply = {};
        reply.request = this;

        this.onreadystatechange = function() {

            //console.log(" - onreadystatechange: "+this.readyState);

            if (this.readyState === 4) { // Ready State Complete

                reply.httpStatus = this.status;
                reply.responseText = this.responseText;
                reply.responseHeaders = this.responseHeaders(); //XmlHttpRequest augmentation

                //console.log("xhr::issue - reply: " + JSON.stringify(reply));
                    
                callbackFunc(reply);
            }
        };

        try {

            // Provide default options, allow for override
            let xhrOptions = options;
            if (xhrOptions === undefined) {
                xhrOptions = { 
                    method : 'GET', 
                    headers : {
                        'Accept' : '*/*', 
                        'Content-Type' : 'text/plain', 
                        'Cache-Control' : 'no-cache',
                        'Pragma' : 'no-cache',
                        'If-Modified-Since' : 'Sat, 1 Jan 2000 00:00:00 GMT'
                    },
                    async : "true"
                };
            } 

            const method = xhrOptions.method ? xhrOptions.method : 'GET';
            const async = xhrOptions.async !== false;
            const body = this.body ? this.body : "";
            let headers = xhrOptions.headers ? xhrOptions.headers : {};

            // Note: post parameters in body should be in the for param1=xxx&param2=yyy
            if (method == 'POST') {
                 headers["Content-type"] = "application/x-www-form-urlencoded";
            }

            if (headers.Accept == undefined) {
                headers.Accept = '*/*';
            }

            if (headers["Content-type"] == undefined) {
                headers["Content-type"] = 'text/plain';
            }

            this.open(method, url, async);

            for(let header in headers) {
                const value = headers[header];
                this.setRequestHeader(header, value);
            }

            //console.log("xhr::issue - url: "+url+"  options: "+JSON.stringify(xhrOptions));

            this.send(body);
        }
        catch(e) {
            
            console.log("xhr.request - exception: " + e.message);
            callbackFunc({error: e.message});
        }
    };

 }());



