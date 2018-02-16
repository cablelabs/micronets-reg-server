'use strict'
var self = module.exports = {
    msoPortalUrl: "http://localhost:3010",
    authServerUrl: "http://localhost:3020"
}

// ENV overrides
if (process.env.mso_portal_url) {
	self.msoPortalUrl = process.env.mso_portal_url;
}

if (process.env.auth_server_url) {
	self.authServerUrl = process.env.auth_server_url;
}