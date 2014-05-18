var mongoose = require('mongoose'),
    express = require('express'),
    fmt = require('sprintf-js'),
    vhost = require('vhost'),
    path = require('path'),
    fs = require('fs');

var now = new Date;

var app = express();

// Config

var exiting = false;

if(3 > process.argv.length) {
  console.error("Please specify a config file as an additional parameter");
  process.exit(1);
}

var config;
require('xml2js').parseString(fs.readFileSync(process.argv[2]), { explicitArray: false }, function(err, data) {
  if(err) {
    console.error("Could not parse config file \" + process.argv[2] + \". Exiting.");
    process.exit(1);
  }
  
  config = data.server;
});

// Logging

var logDir = path.normalize(__dirname + '/../log/access/');
var fileName = fmt.sprintf("%04d-%02d-%02d_%02d-%02d-%02d.log", now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());

if(!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

var log = fs.createWriteStream(logDir + fileName);

log.write("#Version: 1.0\n");
log.write(fmt.sprintf("#Date: %04d-%02d-%02d %02d:%02d:%02d.log\n", now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()));
log.write(fmt.sprintf("#Fields: date time c-ip sc-status cs-method cs-uri cs(User-Agent)\n", now.getFullYear(), now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()));

app.use(function(req, res, next) {
  function logTransaction() {
    res.removeListener('finish', logTransaction);
    res.removeListener('close', logTransaction);

    var timestamp = new Date();
    
    log.write(fmt.sprintf("%04d-%02d-%02d ", timestamp.getFullYear(), timestamp.getMonth() + 1, timestamp.getDate()));
    log.write(fmt.sprintf("%02d:%02d:%02d ", timestamp.getHours(), timestamp.getMinutes(), timestamp.getSeconds()));
    log.write(fmt.sprintf("%15s ", req.ip));
    log.write(fmt.sprintf("%3s ", res.statusCode));
    log.write(fmt.sprintf("%7s ", req.method));
    log.write(fmt.sprintf("%-24s\t\t", req.originalUrl));
    log.write(fmt.sprintf("\"%s\"\n", req.get("User-Agent")));
  };
  
  res.on('finish', logTransaction);
  res.on('close', logTransaction);
  
  next();
});

// Database

mongoose.connect(config.db);

var db = mongoose.connection;
db.on('error', function(err) {
  console.error("Could not connect to database");
  process.exit(2);
});

// Modules

app.use(express.static(path.normalize(__dirname + '/../www/public/')));
app.use(express.json());
app.use(express.urlencoded());
app.use(require('./session.js'));
app.use(vhost('admin.' + config.name, require('./admin.js')));
app.use(vhost(config.name, require('./redirect.js')));

app.use(function(req, res, next) {
  var errorDoc = path.normalize(__dirname + '/../www/public/404.html');
  
  if(fs.existsSync(errorDoc)) {
    res.status(404).sendfile(errorDoc);
  } else {
    next();
  }
});

// Run

var server = app.listen(config.port, function() {
    console.log('Started server %s on port %d', config.name, server.address().port);
});
