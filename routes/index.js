var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  res.redirect('/portal/device-list');
});


// Test route for adhoc pug pages. Add query params as view variables as needed. (query js object passed to template)
// usage: http://localhost:3000/pug/myPugFile
router.get('/pug/:view', function(req, res){
    if (req.params.view) {
        res.render(req.params.view, req.query);
    }
    else {
       var err = new Error('Bad Request: Missing view parameter '+req.url);
       err.status = 400;
       res.render('error', {
         message: err.message,
         error: err
       });
    }
});

router.get('/pug/partial/:view', function(req, res){
    if (req.params.view) {
        res.render("partials/"+req.params.view, req.query);
    }
    else {
       var err = new Error('Bad Request: Missing view parameter '+req.url);
       err.status = 400;
       res.render('error', {
         message: err.message,
         error: err
       });
    }
});

module.exports = router;
