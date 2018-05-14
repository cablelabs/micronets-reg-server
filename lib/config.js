'use strict'

const fs = require('fs');
const configPath = '/etc/micronets/config';

// Defaults if not passed in docker run
var self = module.exports = {
    //msoPortalUrl: "http://localhost:3010",
    //authServerUrl: "http://localhost:3020",
    msoPortalUrl: function() {return self.msos[self.msoIndex].urls["mso-portal"];},
    authServerUrl: function() {return self.msos[self.msoIndex].urls["auth-server"];},
    msos: [
		{
			"name": "MyCable",
			"urls": {
				"mso-portal": "http://35.163.217.238:3210",
				"auth-server": "https://mycable.co/auth2"
			}
		},
		{
			"name": "HomerVision",
			"urls": {
				"mso-portal": "https://homervision/micronets",
				"auth-server": "https://homervision/auth2"
			}
		}
	],
	msoIndex: 0
}

// ENV overrides
/*
if (process.env.mso_portal_url) {
	self.msoPortalUrl = process.env.mso_portal_url;
}

if (process.env.auth_server_url) {
	self.authServerUrl = process.env.auth_server_url;
}
*/

if (fs.existsSync(configPath)) {
	fs.readFile(configPath + '/reg-server.conf', (err, data) => {
		if (err) throw err;
		//console.log(data);
		try {
			self.msos = JSON.parse(data).msos;
			console.log("reg-server.conf: " + JSON.stringify(self.msos));
		} catch(e) {
			console.log("config file parse error: "+e);
		}
	});
}
