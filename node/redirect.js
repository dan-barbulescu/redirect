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
      log.write("Error fetching a random redirect: " + err);
      return next();
    }
    
    if(!redirect) {
      return next();
    }
    
    var use = new model.Use({ ip: req.ip, hash: redirect.hash, agent: req.get("User-Agent") });
    use.save();
    
    res.redirect(302, redirect.url);
  });
});

router.get('/:hash', function(req, res, next) {
  model.Redirect.findOne({ hash: req.params.hash }, function(err, redirect) { 
    if(err) {
      log.write("Error fetching a redirect\"" + req.params.hash + "\": " + err);
      return next();
    }
    
    if(!redirect) {
      return next();
    }
    
    var use = new model.Use({ ip: req.ip, hash: redirect.hash, agent: req.get("User-Agent") });
    use.save();
    
    res.redirect(302, redirect.url);
  });
});

// Exports

module.exports = router.middleware;
