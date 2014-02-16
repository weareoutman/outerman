// weibo api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').weibo;

function accessToken(code, callback) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  form.grant_type = 'authorization_code';
  request.post({
    url: 'https://api.weibo.com/oauth2/access_token',
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

function api(name, args, callback) {
  var method = 'get'
    , options = {
      url: 'https://api.weibo.com/2/' + name + '.json'
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
}

function getUser(args, callback) {
  api('users/show', args, callback);
}

function auth(req, res, next) {
  if (! req.query.code) {
    return next('need a code');
  }
  accessToken(req.query.code, function(err, token){
    if (err) {
      return next(err);
    }
    var expires_at = Math.floor(Date.now() / 1e3) + token.expires_in * 1e3;
    getUser(_.pick(token, 'access_token', 'uid'), function(err, data){
      if (err) {
        return next(err);
      }
      req.user = {
        from: 'weibo',
        token: token.access_token,
        from_uid: data.idstr,
        expires_at: expires_at,
        username: data.domain,
        fullname: data.screen_name,
        gender: data.gender,
        avatar: data.profile_image_url,
        avatar_lg: data.avatar_large
      };
      next();
    });
  });
}

exports.auth = auth;
