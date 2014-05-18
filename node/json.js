var model = require('./model.js'),
    express = require('express'),
    path = require('path'),
    fs = require('fs');
    
// Logging

var log = fs.createWriteStream(path.normalize(__dirname + '/../log/json.log'));
	
// Init

var router = new express.Router();

router.get('/json/all', function(req, res) {
  model.Redirect.find({ })
    .select('hash url')
    .exec(function (err, redirects) {
    if(err) {
      log.write("Error retrieving all redirects\n");
      return;
    }
    
    var ret = new Array(redirects.length),
	index = 0;
    
    redirects.forEach(function(redirect) {
      var obj = redirect.toObject();
      delete obj._id;
      ret[index++] = obj;
    });
    
    res.json(ret);
  });
});

router.post('/json/new', function(req, res) {
  if(req.body.url){
    var redirect = new model.Redirect({ hash : require('./randomstring.js')(12), url: req.body.url });
    
    redirect.save(function (err) {
      if(err) {
	log.write("Error storing a redirect for \"" + req.body.url + "\"\n");
	res.json({ });
	return;
      }
      
      res.json({ hash: redirect.hash });
    });
  } else {
    res.json({ });
  }
});

router.post('/json/info', function(req, res) {
  if(req.body.hash){
    model.Redirect.findOne({ hash: req.body.hash }, function (err, redirect) {
      if(err) {
	log.write("Error retrieving redirect with hash \"" + req.body.hash + "\"\n");
	res.json({ });
	return;
      }
      
      if(!redirect) {
	res.json({ });
	return;
      }
      
      res.json({ url: redirect.url });
    });
  } else {
    res.json({ });
  }
});

router.post('/json/edit', function(req, res) {
  if(req.body.hash) {
     model.Redirect.findOneAndUpdate({ hash: req.body.hash }, { url: req.body.url }, { upsert: true }, function (err) {
      if (err) {
	log.write("Error updating redirect with hash \"" + req.body.hash + "\"\n");
      }
      
      res.json({ });
    });
  } else {
    res.json({ });
  }
});

router.post('/json/login', function(req, res) {
  require('./auth.js').logIn(req.body.user, req.body.pass, function(err) {
    var redirect = '/';
    
    if(err) {
      redirect = '/login.html?error'
    } else {
      res.logOn();
    }
    
    res.json({ go: redirect });
  });
});

// Exports

module.exports = router.middleware;
