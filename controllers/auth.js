// Controller Auth

var util = require('util')
  , _ = require('underscore')
  , conf = require('../config')
  , UserController = require('./user')
  , regPath = /^\/($|[^\/]+)/
  , oauthMap = {
    weibo: 'https://api.weibo.com/oauth2/authorize?client_id=%s&response_type=code&redirect_uri=%s&state=%s',
    qq: 'https://graph.qq.com/oauth2.0/authorize?client_id=%s&response_type=code&redirect_uri=%s&state=%s',
    github: 'https://github.com/login/oauth/authorize?scope=user:email&client_id=%s&redirect_uri=%s&state=%s',
    instagram: 'https://api.instagram.com/oauth/authorize/?client_id=%s&response_type=code&redirect_uri=%s&state=%s'
  };

function before(req, res, next){
  if (req.query.error) {
    // access_denied
    return next(req.query.error);
  }
  if (! req.query.code) {
    return next('need a code');
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
  return next('Forbidden');
}

exports.use = function(app){
  // 登录页
  app.get('/auth', function auth(req, res, next) {
    var path = req.query.path;
    if (! regPath.test(path)) {
      path = '/';
    }
    res.locals.path = encodeURIComponent(path);
    res.render('auth');
  });

  // 登录中转
  app.get('/auth/redirect/:site', function(req, res, next){
    var site = req.params.site;
    if (oauthMap.hasOwnProperty(site) === -1) {
      return next();
    }
    var path = req.query.path
      , state = Math.random().toString(36).replace('.', '');
    if (! regPath.test(path)) {
      path = '/';
    }
    req.session.state = state;
    state = encodeURIComponent(state + '.' + path);
    res.redirect(util.format(oauthMap[site], conf[site].client_id, conf[site].redirect_uri, state));
  });

  // 登录回调
  _.each(oauthMap, function(item, site){
    app.get('/auth/' + site, before, require('../lib/' + site).auth, UserController.authed, function(req, res){
        var url = req.redirectUrl;
        if (/^\/auth($|[\/\?#])/.test(url)) {
          url = '/';
        }
        res.redirect(url);
    });
  });

  // 退出登录
  app.get('/signout', function(req, res){
    var path = req.query.path;
    if (! regPath.test(path)) {
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
};