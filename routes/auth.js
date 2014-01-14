// router auth

var db = require('../lib/db')
  , weibo = require('../lib/weibo')
  , instagram = require('../lib/instagram');

exports.weibo = weibo.auth;
exports.instagram = instagram.auth;