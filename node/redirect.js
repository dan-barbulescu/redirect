var model = require('./model.js'),
    express = require('express'),
    path = require('path'),
    fs = require('fs');
    
// Logging

var log = fs.createWriteStream(path.normalize(__dirname + '/../log/redirect.log'));

// Init

var router = new express.Router();

router.get('/', function(req, res, next) {
  model.Redirect.random(function(err, redirect) {
    if(err) {
      log.write('Error fetching a random redirect: ' + err);
      return;
    }
    
    if(!redirect) {
      return next();
    }
    
    res.redirect(302, redirect.url);
  });
});

router.get('/:hash', function(req, res, next) {
  model.Redirect.findOne({ hash: req.params.hash }, function(err, redirect) { 
    if(err) {
      log.write('Error fetching a random redirect: ' + err);
      return;
    }
    
    if(!redirect) {
      return next();
    }
    
    res.redirect(302, redirect.url);
  });
});

// Exports

module.exports = router.middleware;
