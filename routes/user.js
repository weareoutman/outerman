// router user
/*
INCR user:cursor [next_id]
HMSET user:id:[id] {
  id: [id],
  email: [email],
  username: [username],
  fullname: [fullname]
}
HMSET user:more:[id] {
  gender: {gender},
  avatar: {avatar},
  avatar_sm: {avatar_sm},
  avatar_lg: {avatar_lg},
  create_time: [create_time]
}
HMSET user:auth:[id] {
  hash: [hash],
  salt: [salt]
}
HMSET user:from:[id] {
  token: [token],
  from_uid: [from_uid],
  expires_at: [exprires_at]
}
# SET user:email:[email] [id]
# SET user:name:[username] [id]
# SET user:(weibo|qq|github|instagram):[from_uid] [id]
LPUSH user:list [id]
SADD user:from:[from] [id]
SET user:from:[id] [from]
# SADD user:admin [id]
*/

var Promise = require('bluebird')
  , _ = require('underscore')
  , crypto = require('crypto')
  , db = require('../lib/db')
  , randomBytes = Promise.promisify(crypto.randomBytes)
  , SIGN_LEN = 128
  , SIGN_ITE = 10000
  , FIELDS = {
    BASE: ['id', 'email', 'username', 'fullname'],
    MORE: ['gender', 'avatar', 'avatar_sm', 'avatar_lg', 'create_time'],
    FROM: ['token', 'from_uid', 'expires_at']
  }
  , KEYS = {
    CURSOR: 'user:cursor',
    LIST: 'user:list',
    id2user: function(id) {
      return 'user:id:' + id;
    },
    id2more: function(id){
      return 'user:more:' + id;
    },
    id2auth: function(id){
      return 'user:auth:' + id;
    },
    id2from: function(id){
      return 'user:from:' + id;
    },
    /*email2id: function(email) {
      return 'user:email:' + encodeURIComponent(email);
    },
    name2id: function(name) {
      return 'user:name:' + encodeURIComponent(name);
    },*/
    from2id: function(from) {
      return 'user:from:' + from;
    },
    fromUid2id: function(from, uid) {
      return 'user:' + from + ':' + uid;
    }
  };

exports.check = function(req, res, next){
  var user = req.user;
  db.getAsync(KEYS.fromUid2id(user.from, user.from_uid))
  .then(function(id){
    if (id === null) {
      return createAsync(user);
    } else {
      user.id = id;
      return Promise.resolve();
    }
  })
  .then(function(){
    return signAsync(req, res);
  })
  .then(function(){
    next();
  })
  .catch(next);
};

exports.load = function(req, res, next){
  if (req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }
  var uid = req.cookies.uid
    , usign = req.cookies.usign
    , usalt = req.cookies.usalt;
  if (! (uid && usign && usalt)) {
    return next();
  }
  db.hgetallAsync(KEYS.id2auth(uid))
  .then(function(data){
    var resolved = Promise.resolve();
    if (! data || data.salt !== usalt) {
      return resolved;
    }
    var sha1 = crypto.createHmac('sha1', usalt);
    sha1.update(usign);
    if (data.hash !== sha1.digest('base64')) {
      return resolved;
    }
    return getUserAsync(uid)
    .then(function(replies){
      var user = _.extend.apply(_, replies);
      req.session.user = user;
      res.locals.user = user;
      return resolved;
    });
  })
  .then(function(){
    next();
  })
  .catch(next);
};

exports.restrict = function(req, res, next) {
  if (! req.session.user || ! req.session.user.admin) {
    return next('Forbidden');
  }
  next();
};

function signAsync(req, res) {
  var id = req.user.id
    , salt
    , pswd;
  return randomBytes(SIGN_LEN)
  .then(function(buf){
    salt = buf.toString('base64');
    return randomBytes(SIGN_LEN);
  })
  .then(function(buf){
    pswd = buf.toString('base64');
    var sha1 = crypto.createHmac('sha1', salt);
    sha1.update(pswd);
    return db.hmsetAsync(KEYS.id2auth(id), {
      hash: sha1.digest('base64'),
      salt: salt
    });
  })
  .then(function(){
    var month = 2.592e9;
    res.cookie('uid', '' + id, { maxAge: month });
    res.cookie('usign', pswd, { maxAge: month });
    res.cookie('usalt', salt, { maxAge: month });
    return Promise.resolve();
  });
}

function createAsync(user) {
  return db.incrAsync(KEYS.CURSOR)
  .then(function(id){
    id = '' + id;
    user.id = id;
    var base = _.pick(user, FIELDS.BASE)
      , more = _.pick(user, FIELDS.MORE)
      , from = _.pick(user, FIELDS.FROM)
      , multi = db.multi();
    multi.hmset(KEYS.id2user(id), base);
    multi.hmset(KEYS.id2more(id), more);
    multi.lpush(KEYS.LIST, id);
    /*if (user.email) {
      multi.set(KEYS.email2id(user.email), id);
    }
    if (user.username) {
      multi.set(KEYS.name2id(user.username), id);
    }*/
    // if (user.from) {
    multi.hmset(KEYS.id2from(id), from);
    multi.set(KEYS.fromUid2id(user.from, user.from_uid), id);
    multi.sadd(KEYS.from2id(user.from), id);
    // }
    return Promise.promisify(multi.exec, multi)();
  });
}

function getUserAsync(id) {
  var multi = db.multi();
  multi.hgetall(KEYS.id2user(id));
  multi.hgetall(KEYS.id2more(id));
  return Promise.promisify(multi.exec, multi)();
}
