// instagram api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').instagram;

function accessToken(code, callback) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  form.grant_type = 'authorization_code';
  request.post({
    url: 'https://api.instagram.com/oauth/access_token',
    form: form
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

/*function api(name, args, callback) {
  var method = 'get'
    , options = {
      url: 'https://api.instagram.com/v1/' + name
    };
  if (method === 'get') {
    options.url += '?' + querystring.stringify(args);
  } else {
    options.form = args;
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
    callback(null, data);
  });
}*/

function auth(req, res, next) {
  if (! req.query.code) {
    return next('need a code');
  }
  accessToken(req.query.code, function(err, token){
    if (err) {
      return next(err);
    }
    var data = token.user;
    req.user = {
      from: 'instagram',
      token: token.access_token,
      from_uid: data.id,
      username: data.username,
      fullname: data.full_name,
      avatar: data.profile_picture
    };
    next();
  });
}

exports.auth = auth;
