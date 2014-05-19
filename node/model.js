var mongoose = require('mongoose');

// Redirect

var redirectSchema = new mongoose.Schema({
    hash: { type: String, index: true, unique: true },
    url: String
  });

redirectSchema.statics.random = function(callback) {
    this.count(function(err, count) {
      if (err) {
	return callback(err);
      }
      
      this.findOne().skip(Math.floor(Math.random() * count)).exec(callback);
    }.bind(this));
  };

// Session

var sessionSchema = new mongoose.Schema({
    sid: String,
    exp: Date
  });

// Auth

var authSchema = new mongoose.Schema({
    user: String,
    pass: String,
    salt: String
  });

// Use

var useSchema = new mongoose.Schema({
    ip: String,
    hash: String,
    agent: String
  });

// Exports

module.exports = {
  Redirect: mongoose.model('Redirect', redirectSchema),
  Session: mongoose.model('Session', sessionSchema),
  Auth: mongoose.model('Auth', authSchema),
  Use: mongoose.model('Use', useSchema)
};
