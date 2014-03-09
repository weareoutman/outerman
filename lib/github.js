// github api

var request = require('request')
  , Promise = require('bluebird')
  , querystring = require('querystring')
  , _ = require('underscore')
  , RequestError = require('./errors').RequestError
  , getAsync = Promise.promisify(request.get)
  , postAsync = Promise.promisify(request.post)
  , conf = require('../config.json').github;

function accessToken(code) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  return postAsync({
    url: 'https://github.com/login/oauth/access_token',
    form: form,
    headers: {
      'User-Agent': 'WeiHub',
      'Accept': 'application/json'
    }
  }).spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    var data = JSON.parse(body);
    return Promise.resolve(data);
  });
}

function api(name, access_token, args) {
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
  return (method === 'get' ? getAsync : postAsync)(options)
  .spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    var data = JSON.parse(body);
    if (data.error) {
      return Promise.reject(data.error);
    }
    return Promise.resolve(data);
  });
}

function getUser(access_token) {
  return api('user', access_token);
}

function auth(req, res, next) {
  accessToken(req.query.code)
  .then(function(token){
    return getUser(token.access_token)
    .then(function(data){
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
  }).catch(next);
}

exports.auth = auth;
