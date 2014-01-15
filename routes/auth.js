// router auth

var db = require('../lib/db')
  , weibo = require('../lib/weibo')
  , qq = require('../lib/qq')
  , tqq = require('../lib/tqq')
  , instagram = require('../lib/instagram');

exports.weibo = weibo.auth;
exports.qq = qq.auth;
exports.tqq = tqq.auth;
exports.instagram = instagram.auth;