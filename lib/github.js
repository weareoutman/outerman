// github api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').github;

function accessToken(code, callback) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  request.post({
    url: 'https://github.com/login/oauth/access_token',
    form: form,
    headers: {
      'User-Agent': 'WeiHub',
      'Accept': 'application/json'
    }
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
    } catch (e) {}
    if (! data) {
      return callback('json parse failed');
    }
    callback(null, data);
  });
}

function api(name, access_token, args, callback) {
  var method = 'get'
    , options = {
      url: 'https://api.github.com/' + name,
      headers: {
        'User-Agent': 'WeiHub',
        'Accept': 'application/json',
        'Authorization': 'token ' + access_token
      }
    };
  if (args) {
    if (method === 'get') {
      options.url += '?' + querystring.stringify(args);
    } else {
      options.form = args;
    }
  }
  request[method](options, function(err, res, body){
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

function getUser(access_token, callback) {
  api('user', access_token, null, callback);
}

function auth(req, res, next) {
  accessToken(req.query.code, function(err, token){
    if (err) {
      return next(err);
    }
    getUser(token.access_token, function(err, data){
      if (err) {
        return next(err);
      }
      req.user = {
        from: 'github',
        token: token.access_token,
        from_uid: data.id,
        username: data.login,
        fullname: data.name,
        email: data.email,
        avatar: data.avatar_url
      };
      next();
    });
  });
}

exports.auth = auth;
