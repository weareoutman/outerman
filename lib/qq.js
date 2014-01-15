// qq api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').qq;

function api(name, args, callback) {
  var url, method, options = null;
  switch (name) {
    case 'access_token':
      url = 'https://graph.qq.com/oauth2.0/token';
      method = 'post';
      break;
    case 'me':
      url = 'https://graph.qq.com/oauth2.0/me';
      method = 'get';
      break;
    case 'user/get_user_info':
      url = 'https://graph.qq.com/user/get_user_info';
      method = 'get';
      _.extend(args, {
        oauth_consumer_key: conf.client_id
      });
      break;
  }
  if (method === 'get') {
    url += '?' + querystring.stringify(args);
  } else {
    options = {form: args};
  }
  request[method](url, options, function(err, res, body){
    if (err) {
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(res.statusCode);
    }
    if (name === 'access_token') {
      return callback(null, querystring.parse(body));
    }
    if (name === 'me') {
      body = body.trim().replace(/^callback\(|\);?$/g, '');
    }
    var data;
    try {
      data = JSON.parse(body);
    } catch (e) {}
    if (! data) {
      return callback('json parse failed');
    }
    if (name === 'me') {
      return callback(null, data);
    }
    if (data.ret !== 0) {
      return callback(data.ret);
    }
    callback(null, data);
  });
}

function auth(req, res, next) {
  var code = req.query.code
    , args = _.pick(conf, 'client_id', 'client_secret', 'redirect_uri');
  args.code = code;
  args.grant_type = 'authorization_code';
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