var model = require('./model.js');

// Exports

module.exports = function(req, res) {
  var buf = '';
  
  req.setEncoding('utf8');
  req.on('data', function(chunk) { buf += chunk })
  req.on('end', function() {
    require('xml2js').parseString(buf, { explicitArray: false }, function(err, data) {
      if(err) {
	res.status(400).send("Bad request");
	return;
      }
      
      if(data["soap:Envelope"]["soap:Body"])
      {
	var del = data["soap:Envelope"]["soap:Body"]["api:delete"];
	
	if(Array.isArray(del)) {
	  del.forEach(function(delOp) {
	    if(delOp.hash) {
	       model.Redirect.remove({ hash: delOp.hash }, function() { });
	    }
	  });
	}
	else if(del) {
	  model.Redirect.remove({ hash: del.hash }, function() { });
	}
	
	res.send(
	  '<?xml version="1.0" encoding="utf-8"?>' +
	  '<soap:Envelope ' + 
	    'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
	    'soap:encodingStyle="http://www.w3.org/2001/12/soap-encoding">' +
	      '<soap:Body xmlns:api="http://api.likes.to/">' +
		'<api:redirect soap:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">' +
		  '<href>/</href>' +
		'</api:redirect>' +
	      '</soap:Body>' +
	  '</soap:Envelope>'
	);
      } else {
	res.status(400).send("Bad request");
      }
    });
  });
};
