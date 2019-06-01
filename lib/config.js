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
				"auth-server": "https://mycable.co/auth"
			}
		},
		{
			"name": "HomerVision",
			"urls": {
				"mso-portal": "https://homervision/micronets",
				"auth-server": "https://homervision/auth"
			}
		},
		{
			"name": "LocalHost",
			"urls": {
				"mso-portal": "http://localhost:3010",
				"auth-server": "http://localhost:3020"
			}
		}
	],
	msoIndex: 0,
	mudServer: function() {
		if (self.mudserver) {
			// specified in the reg-server configuration file
			return self.mudserver;			
		}
		else {
			return "https://alpineseniorcare.com/micronets-mud";
		}
	}
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
			var config = JSON.parse(data);
			self.msos = config.msos;
			self.mudserver = config.mudserver;
			console.log("reg-server.conf: MSO List: " + JSON.stringify(self.msos));
			console.log("reg-server.conf: MUD Server: " + JSON.stringify(self.mudserver));
		} catch(e) {
			console.log("config file parse error: "+e);
		}
	});
}
