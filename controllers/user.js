// Controller User

var Promise = require('bluebird')
  , UserModel = require('../models/user');

exports.auth = function(req, res, next){
  if (req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }
  var uid = req.cookies.uid
    , usign = req.cookies.usign
    , usalt = req.cookies.usalt;
  UserModel.auth(uid, usign, usalt)
  .then(function(user){
    if (user) {
      res.locals.user = req.session.user = user;
    }
    next();
  }).catch(next);
};

exports.restrict = function(req, res, next) {
  if (! req.session.user || ! req.session.user.admin) {
    return next('Forbidden');
  }
  next();
};

exports.authed = function(req, res, next){
  var user = req.user;
  UserModel.post(user)
  .then(function(){
    return UserModel.sign(user)
    .spread(function(pswd, salt){
      var month = 2.592e9;
      res.cookie('uid', '' + user.id, { maxAge: month });
      res.cookie('usign', pswd, { maxAge: month });
      res.cookie('usalt', salt, { maxAge: month });
      return Promise.resolve();
    });
  }).then(function(){
    next();
  }).catch(next);
};
