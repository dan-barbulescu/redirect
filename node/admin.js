var path = require('path'),
    fs = require('fs');

// Exports

module.exports = function(req, res, next) {
  if(req.path.substr(0, 6) == "/json/") {
    require('./json.js')(req, res, function() { } );
    return;
  }
  
  if(req.path.substr(0, 5) == "/soap") {
    require('./soap.js')(req, res, function() { } );
    return;
  }
  
  var file = path.normalize(__dirname + '/../www/public' + req.path);
    
  req.loggedIn(function(isLoggedIn) {
    if((req.path != '/login.html') && !isLoggedIn) {
      res.redirect(302, '/login.html');
      return;
    }

    if(req.path == '/login.html' && isLoggedIn) {
      res.redirect(302, '/');
      return;
    }

    file = path.normalize(__dirname + '/../www/admin/' + req.path);

    if(fs.existsSync(file)) {
      res.status(200).sendfile(file);
    } else {
      return next();
    }
  });
};
