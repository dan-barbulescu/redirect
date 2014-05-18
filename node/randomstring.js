module.exports = function(size) {
  var string;
  
  try {
    var buf = require('crypto').randomBytes(Math.ceil(size / 2));
    string = buf.toString('hex').substr(0, size);
  } catch (ex) {
    string = '';
  }
  
  return string;
}