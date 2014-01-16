// github api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').github;

function api(name, args, callback) {
  var url, method, options = {
    headers: {
      'User-Agent': 'WeiHub',
      'Accept': 'application/json'
    }
  };
  switch (name) {
    case 'access_token':
      url = 'https://github.com/login/oauth/access_token';
      method = 'post';
      break;
    case 'user':
      url = 'https://api.github.com/user';
      method = 'get';
      options.headers.Authorization = 'token ' + args.access_token;
      args = null;
      break;
  }
  if (method === 'get') {
    if (args) {
      url += '?' + querystring.stringify(args);
    }
  } else {
    options.form = args;
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
    } catch (e) {}
    if (! data) {
      return callback('json parse failed');
    }
    if (data.error) {
      return callback(data.error);
    }
    callback(null, data);
  });
}

function auth(req, res, next) {
  var code = req.query.code
    , args = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  args.code = code;
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