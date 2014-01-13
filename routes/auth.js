// router auth

var db = require('../lib/db')
  , weibo = require('../lib/weibo');

exports.weibo = weibo.auth;