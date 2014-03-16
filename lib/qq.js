// qq api

var request = require('request')
  , Promise = require('bluebird')
  , querystring = require('querystring')
  , _ = require('underscore')
  , RequestError = require('./errors').RequestError
  , getAsync = Promise.promisify(request.get)
  , postAsync = Promise.promisify(request.post)
  , conf = require('../config.json').qq;

function accessToken(code) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  form.grant_type = 'authorization_code';
  return postAsync({
    url: 'https://graph.qq.com/oauth2.0/token',
    form: form
  }).spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    return getMe(querystring.parse(body));
  });
}

function getMe(token) {
  return getAsync('https://graph.qq.com/oauth2.0/me?' + querystring.stringify({
    access_token: token.access_token
  })).spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    body = body.trim().replace(/^callback\(|\);?$/g, '');
    var data = JSON.parse(body);
    token.openid = data.openid;
    return token;
  });
}

function api(name, args) {
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
  return (method === 'get' ? getAsync : postAsync)(options)
  .spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    var data = JSON.parse(body);
    if (data.ret !== 0) {
      throw new RequestError(data.ret);
    }
    return data;
  });
}

function getUser(args) {
  return api('user/get_user_info', args);
}

function auth(req, res, next) {
  accessToken(req.query.code)
  .then(function(token){
    var expires_at = Math.floor(Date.now() / 1e3) + token.expires_in * 1e3;
    return getUser(_.pick(token, 'access_token', 'openid'))
    .then(function(data){
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
  }).catch(next);
}

exports.auth = auth;
