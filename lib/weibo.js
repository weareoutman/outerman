// weibo api

var request = require('request')
  , Promise = require('bluebird')
  , querystring = require('querystring')
  , _ = require('underscore')
  , errors = require('./errors')
  , RequestError = errors.RequestError
  , getAsync = Promise.promisify(request.get)
  , postAsync = Promise.promisify(request.post)
  , conf = require('../config.json').weibo;

function accessToken(code) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  form.grant_type = 'authorization_code';
  return postAsync({
    url: 'https://api.weibo.com/oauth2/access_token',
    form: form
  }).spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode, res.status);
    }
    var data = JSON.parse(body);
    return Promise.resolve(data);
  });
}

function api(name, args) {
  var method = 'get'
    , options = {
      url: 'https://api.weibo.com/2/' + name + '.json'
    };
  if (method === 'get') {
    options.url += '?' + querystring.stringify(args);
  } else {
    options.form = args;
  }
  return (method === 'get' ? getAsync : postAsync)(options)
  .spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode, res.status);
    }
    var data = JSON.parse(body);
    return Promise.resolve(data);
  });
}

function getUser(args) {
  return api('users/show', args);
}

function auth(req, res, next) {
  accessToken(req.query.code)
  .then(function(token){
    var expires_at = Math.floor(Date.now() / 1e3) + token.expires_in * 1e3;
    return getUser(_.pick(token, 'access_token', 'uid'))
    .then(function(data){
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
  }).catch(next);
}

exports.auth = auth;
