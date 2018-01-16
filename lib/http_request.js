/* http_request.js
 * Make an external http request while processing one.
 * TODO: Promisify this.
 * TODO: https support
 */

'use strict'
const http = require('http');
const URL = require('url');

const self = module.exports = {

    http_get: function(url, callback) {

        http.get(url, (res) => {
            let data = '';
         
            // A chunk of data has been recieved.
            res.on('data', (chunk) => {
                data += chunk;
            });
         
            // The whole response has been received.
            res.on('end', () => {
                const json = JSON.parse(data);
                //console.log("http_request: "+json);
                callback(null, json);
            });
         
        }).on("error", (err) => {
            console.log("Error: " + err.message);
            callback(err.message, null);
        });
    },

    // url MUST be complete (including protocol)
    http_post: function(url, headers, body, callback) {

        var urlObj = URL.parse(url);

        // An object of options to indicate where to post to
        var post_options = {
          host: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.path,
          method: 'POST',
          headers: headers
        };

        console.log("http_post: "+JSON.stringify(post_options));
        console.log("http_post body: "+JSON.stringify(body));

        var data = '';

        // Set up the request
        var post_req = http.request(post_options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                data += chunk;
            });

            // The whole response has been received.
            res.on('end', function() {
                const json = JSON.parse(data);
                //console.log("http_request: "+json);
                callback(null, json);
            });
        });

        // post the data
        post_req.write(JSON.stringify(body));
        post_req.end();
    }
}
