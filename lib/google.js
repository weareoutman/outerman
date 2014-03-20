// google api

var request = require('request')
  , Promise = require('bluebird')
  , querystring = require('querystring')
  , _ = require('underscore')
  , RequestError = require('./errors').RequestError
  , getAsync = Promise.promisify(request.get)
  , postAsync = Promise.promisify(request.post)
  , conf = require('../config.json').google;

function accessToken(code) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  form.grant_type = 'authorization_code';
  return postAsync({
    url: 'https://accounts.google.com/o/oauth2/token',
    form: form
  }).spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    var data = JSON.parse(body);
    return data;
  });
}

function api(name, access_token, args) {
  var method = 'get'
    , options = {
      url: 'https://www.googleapis.com/plus/v1/' + name,
      headers: {
        // 'User-Agent': 'Wang Shenwei',
        // 'Accept': 'application/json',
        'Authorization': 'Bearer ' + access_token
      }
    };
  if (args) {
    if (method === 'get') {
      options.url += '?' + querystring.stringify(args);
    } else {
      options.form = args;
    }
  }
  return (method === 'get' ? getAsync : postAsync)(options)
  .spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    var data = JSON.parse(body);
    return data;
  });
}

function getUser(access_token) {
  return api('people/me', access_token);
}

function auth(req, res, next) {
  accessToken(req.query.code)
  .then(function(token){
    var expires_at = Math.floor(Date.now() / 1e3) + token.expires_in * 1e3;
    return getUser(token.access_token)
    .then(function(data){
      req.user = {
        from: 'google',
        token: token.access_token,
        from_uid: data.id,
        expires_at: expires_at,
        // username: data.domain,
        fullname: data.displayName,
        gender: data.gender === 'male' ? 'm' : data.gender === 'female' ? 'f' : 'n',
        avatar: data.image.url.replace(/([\?&]sz=)\d+/, '$164'),
        profile_url: data.url
      };
      var email = _.findWhere(data.emails, {type: 'account'});
      if (email) {
        req.user.email = email.value;
      }
      next();
    });
  }).catch(next);
}

exports.auth = auth;
