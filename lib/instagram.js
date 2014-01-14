// instagram api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').instagram;

function api(name, args, callback) {
  var url, method, options = null;
  switch (name) {
    case 'access_token':
      url = 'https://api.instagram.com/oauth/access_token';
      method = 'post';
      break;
    case 'users':
      url = 'https://api.instagram.com/v1/users/' + args.uid;
      method = 'get';
      delete args.uid;
      break;
  }
  if (method === 'get') {
    url += '?' + querystring.stringify(args);
  } else {
    options = {form: args};
  }
  request[method](url, options, function(err, res, body){
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
    req.token = data;
    next();
  });
}

// exports.conf = conf;
exports.api = api;
exports.auth = auth;