// tqq api

var request = require('request')
  , querystring = require('querystring')
  , _ = require('underscore')
  , conf = require('../config.json').tqq;

function api(name, args, callback) {
  var url, method, options = null;
  switch (name) {
    case 'access_token':
      url = 'https://open.t.qq.com/cgi-bin/oauth2/access_token';
      method = 'post';
      break;
    case 'user/info':
      url = 'https://open.t.qq.com/api/user/info';
      method = 'get';
      _.extend(args, {
        format: 'json',
        oauth_consumer_key: conf.client_id,
        oauth_version: '2.a'
      });
      break;
  }
  if (method === 'get') {
    url += '?' + querystring.stringify(args);
  } else {
    options = {form: args};
  }
  request[method](url, options, function(err, res, body){
    console.log(err);
    console.log(body);
    if (err) {
      return callback(err);
    }
    if (res.statusCode !== 200) {
      return callback(res.statusCode);
    }
    if (name === 'access_token') {
      return callback(null, querystring.parse(body));
    }
    var data;
    try {
      data = JSON.parse(body);
    } catch (e) {}
    if (! data) {
      return callback('json parse failed');
    }
    if (data.ret !== 0) {
      return callback(data.errcode);
    }
    callback(null, data.data);
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