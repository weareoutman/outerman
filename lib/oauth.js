// OAUTH api

var list = ['weibo', 'qq', 'github', 'instagram'];

exports.list = list;

exports.before = function(req, res, next){
  if (req.query.error) {
    // access_denied
    return next(req.query.error);
  }
  if (! req.query.code) {
    return next('need a code');
  }
  var temp = req.query.state || ''
    , index = temp.indexOf('.');
  if (index !== -1) {
    var state = temp.substr(0, index)
      , url = temp.substr(index + 1) || '/';
    if (state === req.session.state) {
      req.session.state = null;
      req.redirectUrl = url;
      return next();
    }
  }
  return next('Forbidden');
};

list.forEach(function(from){
  exports[from] = require('./' + from);
});
