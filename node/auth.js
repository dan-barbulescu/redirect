var model = require('./model.js'),
    crypto = require('crypto'),
    path = require('path'),
    fs = require('fs');
    
// Logging

var log = fs.createWriteStream(path.normalize(__dirname + '/../log/auth.log'));


// Exports

module.exports = {
  logIn : function(username, password, callback) {
    var success = false;
    
    model.Auth.findOne({ user: username }, function(err, auth) {
      if(err) {
	log.write('Error fetching credentials for "' + username + '": ' + err);
	return;
      }
      
      if(!auth) {
	callback("No such user");
	return;
      }
      
      var md5sum = crypto.createHash('md5');

      md5sum.update(password + auth.salt);
      
      if(auth.pass != md5sum.digest('hex')) {
	callback("Wrong password");
   	return;
      }
      
      callback();
    });
  },
  
  create : function(username, password) {
    var success = true;
    var s = require('./randomstring.js')(8);
    
    var md5sum = crypto.createHash('md5');
    
    md5sum.update(password + s);
    
    model.Auth.findOneAndUpdate({ user: username }, { pass: md5sum.digest('hex'), salt: s }, { upsert: true }, function (err) {
      if (err) {
	log.write('Error creating credentials: ' + err + '\n');
	success = false;
      }
    });
    
    return success;
  }
};
