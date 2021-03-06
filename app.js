'use strict'
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
//app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/index'));
app.use('/device/v1/', require('./routes/device'));
// backward compatibility
app.use('/device/', require('./routes/device'));

// Not an API, so no versioning.
app.use('/portal/', require('./routes/portal'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found: '+req.protocol + '://' + req.get('host') + req.originalUrl);
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};



  console.log("Error: "+err.status+" Message: "+err.message);
  console.log("req.rawBody: "+req.rawBody);
  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
