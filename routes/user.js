// router user
/*
INCR user:cursor [next_id]
HMSET user:id:[id] {
  id: [id],
  email: [email],
  username: [username],
  fullname: [fullname],
  from: [from],
  is_admin: [is_admin]
}
HMSET user:more:[id] {
  avatar: {avatar},
  avatar_sm: {avatar_sm},
  avatar_lg: {avatar_lg},
  gender: {gender},
  create_time: [create_time],
  last_login_time: [last_login_time],
}
HMSET user:auth:[id] {
  pswd: [pswd],
  salt: [salt],
  sign: [sign],
  sign_salt: [sign_salt],
  token: [token],
  from_uid: {from_uid},
  expires_at: [expire_id]
}
SET user:email:[email] [id]
SET user:name:[username] [id]
# SET user:domain:[domain] [id]
LPUSH user:list [id]
SADD user:from:[from] [id]
ZADD user:last_login_time [last_login_time] [id]
*/

var db = require('../lib/db')
  , _ = require('underscore')
  , weibo = require('../lib/weibo')
  , tqq = require('../lib/tqq')
  , qq = require('../lib/qq')
  , github = require('../lib/github')
  , instagram = require('../lib/instagram')
  , FIELDS = {
    BASE: ['id', 'email', 'username', 'fullname', 'from', 'is_admin'],
    MORE: ['avatar', 'avatar_sm', 'avatar_lg', 'gender', 'create_time', 'last_login_time'],
    AUTH: ['pswd', 'salt', 'sign', 'sign_salt', 'token', 'from_uid', 'expires_at']
  }
  , KEYS = {
    CURSOR: 'user:cursor',
    LIST: 'user:list',
    LAST_LOGIN_TIME: 'user:last_login_time',
    id2user: function(id) {
      return 'user:id:' + id;
    },
    id2more: function(id){
      return 'user:more:' + id;
    },
    id2auth: function(id){
      return 'user:auth:' + id;
    },
    email2id: function(email) {
      return 'user:email:' + encodeURIComponent(email);
    },
    name2id: function(username) {
      return 'user:name:' + encodeURIComponent(username);
    },
    from2id: function(from) {
      return 'user:from:' + from;
    }
  };

exports.fromWeibo = function(req, res, next){
  var token = req.token
    , expires_at = Math.floor(Date.now() / 1e3) + token.expires_in * 1e3;
  weibo.api('users/show', _.pick(token, 'access_token', 'uid'), function(err, data) {
    if (err) {
      return next(err);
    }
    var user = {
      from: 'weibo',
      token: token.access_token,
      from_uid: data.idstr,
      expires_at: expires_at,
      username: data.domain,
      fullname: data.name,
      gender: data.gender,
      avatar: data.avatar_large,
      avatar_sm: data.profile_image_url,
      avatar_lg: data.avatar_hd
    };
    create(user, function(err, replies){
      if (err) {
        return next(err);
      }
      delete req.token;
      req.user = user;
      next();
    });
  });
};

exports.fromQq = function(req, res, next){
  var token = req.token
    , expires_at = Math.floor(Date.now() / 1e3) + (+ token.expires_in) * 1e3,
    args = _.pick(token, 'access_token');
  qq.api('me', args, function(err, data){
    if (err) {
      return next(err);
    }
    args.openid = data.openid;
    qq.api('user/get_user_info', args, function(err, data) {
      if (err) {
        return next(err);
      }
      var user = {
        from: 'qq',
        token: token.access_token,
        from_uid: args.openid,
        expires_at: expires_at,
        // username: data.name,
        fullname: data.nickname,
        gender: data.gender === '男' ? 'm' : 'f',
        avatar: data.figureurl_qq_1,
        avatar_lg: data.figureurl_qq_2
      };
      create(user, function(err, replies){
        if (err) {
          return next(err);
        }
        delete req.token;
        req.user = user;
        next();
      });
    });
  });
};

exports.fromTqq = function(req, res, next){
  var token = req.token
    , expires_at = Math.floor(Date.now() / 1e3) + (+ token.expires_in) * 1e3;
  tqq.api('user/info', _.pick(token, 'access_token', 'openid'), function(err, data) {
    if (err) {
      return next(err);
    }
    var user = {
      from: 'tqq',
      token: token.access_token,
      from_uid: data.openid,
      expires_at: expires_at,
      username: data.name,
      fullname: data.nick,
      gender: data.sex === 1 ? 'm' : 'f',
      avatar: data.head + '/50',
      avatar_sm: data.head + '/30',
      avatar_lg: data.head + '/100'
    };
    create(user, function(err, replies){
      if (err) {
        return next(err);
      }
      delete req.token;
      req.user = user;
      next();
    });
  });
};

exports.fromGithub = function(req, res, next){
  var token = req.token;
  github.api('user', _.pick(token, 'access_token'), function(err, data) {
    if (err) {
      return next(err);
    }
    var user = {
      from: 'github',
      token: token.access_token,
      from_uid: data.id,
      username: data.login,
      fullname: data.name,
      email: data.email,
      avatar: data.avatar_url
    };
    create(user, function(err, replies){
      if (err) {
        return next(err);
      }
      delete req.token;
      req.user = user;
      next();
    });
  });
};

exports.fromInstagram = function(req, res, next){
  var token = req.token,
    data = token.user,
    user = {
      from: 'instagram',
      token: token.access_token,
      from_uid: data.id,
      username: data.username,
      fullname: data.full_name,
      avatar: data.profile_picture
    };
  create(user, function(err, replies){
    if (err) {
      return next(err);
    }
    delete req.token;
    req.user = user;
    next();
  });
};

function create(user, callback) {
  db.incr(KEYS.CURSOR, function(err, id){
    user.id = id;
    var base = _.pick(user, FIELDS.BASE)
      , more = _.pick(user, FIELDS.MORE)
      , auth = _.pick(user, FIELDS.AUTH)
      , multi = db.multi();
    multi.hmset(KEYS.id2user(id), base);
    multi.hmset(KEYS.id2more(id), more);
    multi.hmset(KEYS.id2auth(id), auth);
    multi.lpush(KEYS.LIST, id);
    if (user.email) {
      multi.set(KEYS.email2id(user.email), id);
    }
    if (user.username) {
      multi.set(KEYS.name2id(user.username), id);
    }
    if (user.from) {
      multi.sadd(KEYS.from2id(user.from), id);
    }
    multi.exec(function(err, replies){
      if (err) {
        return callback(err);
      }
      callback(null, replies);
    });
  });
}
