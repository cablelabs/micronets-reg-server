'use strict'
const express = require('express');
const router = express.Router();

// Home page
router.get('/', function(req, res, next) {
  res.redirect('/portal/device-list');
});

// Test route for adhoc pug pages. Add query params as view variables as needed. (query js object passed to template)
// usage: http://localhost:3010/pug/<myPugFile>
router.get('/pug/:view', function(req, res){
    if (req.params.view) {
        res.render(req.params.view, req.query);
    }
    else {
       let err = new Error('Bad Request: Missing view parameter '+req.url);
       err.status = 400;
       res.render('error', {
         message: err.message,
         error: err
       });
    }
});

// Same but for partials
router.get('/pug/partial/:view', function(req, res){
    if (req.params.view) {
        res.render("partials/"+req.params.view, req.query);
    }
    else {
       let err = new Error('Bad Request: Missing view parameter '+req.url);
       err.status = 400;
       res.render('error', {
         message: err.message,
         error: err
       });
    }
});

module.exports = router;
