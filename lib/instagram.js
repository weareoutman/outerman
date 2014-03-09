// instagram api

var request = require('request')
  , Promise = require('bluebird')
  , querystring = require('querystring')
  , _ = require('underscore')
  , RequestError = require('./errors').RequestError
  , getAsync = Promise.promisify(request.get)
  , postAsync = Promise.promisify(request.post)
  , conf = require('../config.json').instagram;

function accessToken(code) {
  var form = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  form.code = code;
  form.grant_type = 'authorization_code';
  return postAsync({
    url: 'https://api.instagram.com/oauth/access_token',
    form: form
  }).spread(function(res, body){
    if (res.statusCode !== 200) {
      throw new RequestError(res.statusCode);
    }
    var data = JSON.parse(body);
    return Promise.resolve(data);
  });
}

/*function api(name, args) {
  var method = 'get'
    , options = {
      url: 'https://api.instagram.com/v1/' + name
    };
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
    return Promise.resolve(data);
  });
}*/

function auth(req, res, next) {
  accessToken(req.query.code)
  .then(function(token){
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
  }).catch(next);
}

exports.auth = auth;
