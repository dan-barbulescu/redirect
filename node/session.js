var model = require('./model.js'),
    path = require('path'),
    fs = require('fs');
    
// Logging

var log = fs.createWriteStream(path.normalize(__dirname + '/../log/admin.log'));

// Init

setInterval(function () {
  model.Session.remove({ exp: { "$lt": new Date() } }, function() { });
}, 1 * 60 * 1000);

// Exports

module.exports = function(req, res, next) {
  return require('cookie-parser')()(req, res, function() {
    req.loggedIn = function(callback) {
      if(req.cookies.sid) {
	model.Session.findOne({ sid: req.cookies.sid }, function(err, session) {
	  if(err) {
	    log.write('Error retrieving a session\n');
	    return;
	  }
	  
	  if(session)
	  {
	    var now = new Date();
	    if(now < session.exp)
	    {
	      callback(true);
	      return;
	    }
	  }
	  callback(false);
	});
      } else {
	callback(false);
      }
    };
    
    res.logOn = function() {
      var session = require('./randomstring.js')(24);
      var now = new Date(),
	  future = new Date();
      
      future.setHours(now.getHours() + 1);
      
      model.Session.findOneAndUpdate({ sid: session }, { exp: future }, { upsert: true }, function (err) {
	if (err) {
	  log.write('Error storing a session\n');
	}
      });
      
      this.cookie('sid', session, { httpOnly: false });
    }
    
    return next();
  });
};