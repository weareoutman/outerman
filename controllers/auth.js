// Controller Auth

var util = require('util')
  , _ = require('underscore')
  , express = require('express')
  , conf = require('../config')
  , UserController = require('./user')
  , ClientError = require('../lib/errors').ClientError
  , router = express.Router()
  , regPath = /^\/($|[^\/]+)/
  , regAuth = /^\/auth($|[\/\?#])/
  , oauthMap = {
    weibo: 'https://api.weibo.com/oauth2/authorize?client_id=%s&response_type=code&redirect_uri=%s&state=%s',
    qq: 'https://graph.qq.com/oauth2.0/authorize?client_id=%s&response_type=code&redirect_uri=%s&state=%s',
    github: 'https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&state=%s',
    instagram: 'https://api.instagram.com/oauth/authorize/?client_id=%s&response_type=code&redirect_uri=%s&state=%s',
    google: 'https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=%s&redirect_uri=%s&state=%s&&access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile'
  };

function before(req, res, next){
  if (req.query.error) {
    // access_denied
    return next(new ClientError(400));
  }
  if (! req.query.code) {
    return next(new ClientError(400));
  }
  var temp = req.query.state || ''
    , index = temp.indexOf('.');
  if (index !== -1) {
    var state = temp.substr(0, index)
      , url = temp.substr(index + 1) || '/';
    if (state === req.session.state) {
      req.session.state = null;
      req.redirectUrl = url;
      return next();
    }
  }
  return next(new ClientError(400));
}

// Auth page
router.get('/', function auth(req, res, next) {
  var path = req.query.path;
  if (! regPath.test(path) || regAuth.test(path)) {
    path = '/';
  }
  res.locals.path = encodeURIComponent(path);
  res.locals.title = '登录' + conf.title_suffix;
  res.locals.nav = 'auth';
  res.renderHijax('auth');
});

// Auth redirect
router.get('/redirect/:site', function(req, res, next){
  var site = req.params.site;
  if (oauthMap.hasOwnProperty(site) === -1) {
    return next();
  }
  var path = req.query.path
    , state = Math.random().toString(36).replace('.', '');
  if (! regPath.test(path) || regAuth.test(path)) {
    path = '/';
  }
  req.session.state = state;
  state = encodeURIComponent(state + '.' + path);
  res.redirect(util.format(oauthMap[site], conf[site].client_id, conf[site].redirect_uri, state));
});

// Auth callback
_.each(oauthMap, function(item, site){
  router.get('/' + site, before, require('../lib/' + site).auth, UserController.authed, function(req, res){
      var url = req.redirectUrl;
      if (regAuth.test(url)) {
        url = '/';
      }
      res.redirect(url);
  });
});

exports.index = router;

exports.signout = express.Router();

// Sign out
exports.signout.get('/', function(req, res){
  var path = req.query.path;
  if (! regPath.test(path) || regAuth.test(path)) {
    path = '/';
  }
  req.session.destroy(function(err){
    if (err) {
      console.error(err);
    }
    res.clearCookie('uid');
    res.clearCookie('usign');
    res.clearCookie('usalt');
    res.redirect(path);
  });
});
