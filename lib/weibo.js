// weibo api

var request = require('request')
  , _ = require('underscore')
  , conf = require('../config.json').weibo;

function api(name, args, callback) {
  request.post('https://api.weibo.com/oauth2/access_token', {
    form: args
  }, function(err, res, body){
    if (err) {
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(res.statusCode);
    }
    var data;
    try {
      data = JSON.parse(body);
    } catch (e) {
    }
    if (! data) {
      return callback('json parse failed');
    }
    callback(null, data);
  });
}

function auth(req, res, next) {
  var code = req.query.code
    , args = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  args.code = code;
  args.grant_type = 'authorization_code';
  api('access_token', args, function(err, data){
    if (err) {
      return next(err);
    }
    res.locals.token = data;
    next();
  });
}

// exports.conf = conf;
exports.api = api;
exports.auth = auth;