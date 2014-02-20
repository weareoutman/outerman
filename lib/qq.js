// qq api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').qq;

function accessToken(code, callback) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  form.grant_type = 'authorization_code';
  request.post({
    url: 'https://graph.qq.com/oauth2.0/token',
    form: form
  }, function(err, res, body){
    if (err) {
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(res.statusCode);
    }
    var token = querystring.parse(body);
    me(token.access_token, function(err, data){
      if (err) {
        return callback(err);
      }
      token.openid = data.openid;
      callback(null, token);
    });
  });
}

function me(access_token, callback) {
  request.get('https://graph.qq.com/oauth2.0/me?' + querystring.stringify({
    access_token: access_token
  }), function(err, res, body){
    if (err) {
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(res.statusCode);
    }
    body = body.trim().replace(/^callback\(|\);?$/g, '');
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
      url: 'https://graph.qq.com/' + name
    };
  _.extend(args, {
    oauth_consumer_key: conf.client_id
  });
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
    if (data.ret !== 0) {
      return callback(data.ret);
    }
    callback(null, data);
  });
}

function getUser(args, callback) {
  api('user/get_user_info', args, callback);
}

function auth(req, res, next) {
  accessToken(req.query.code, function(err, token){
    if (err) {
      return next(err);
    }
    var expires_at = Math.floor(Date.now() / 1e3) + token.expires_in * 1e3;
    getUser(_.pick(token, 'access_token', 'openid'), function(err, data){
      if (err) {
        return next(err);
      }
      req.user = {
        from: 'qq',
        token: token.access_token,
        from_uid: token.openid,
        expires_at: expires_at,
        // username: data.name,
        fullname: data.nickname,
        gender: data.gender === '男' ? 'm' : (data.gender === '女' ? 'f' : 'n'),
        avatar: data.figureurl_qq_1,
        avatar_lg: data.figureurl_qq_2
      };
      next();
    });
  });
}

exports.auth = auth;
