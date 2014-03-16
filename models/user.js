// Model User

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
  , FIELDS = {
    BASE: ['id', 'email', 'username', 'fullname'],
    MORE: ['from', 'profile_url', 'gender', 'avatar', 'avatar_sm', 'avatar_lg', 'create_time'],
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

function auth(uid, usign, usalt) {
  if (! (uid && usign && usalt)) {
    return Promise.resolve(null);
  }
  return db.hgetallAsync(KEYS.id2auth(uid))
  .then(function(data){
    if (! data || data.salt !== usalt) {
      return null;
    }
    var sha1 = crypto.createHmac('sha1', usalt);
    sha1.update(usign);
    if (data.hash !== sha1.digest('base64')) {
      return null;
    }
    return get(uid);
  });
}

function sign(user) {
  return Promise.join(randomBytes(SIGN_LEN), randomBytes(SIGN_LEN))
  .spread(function(pswd, salt){
    pswd = pswd.toString('base64');
    salt = salt.toString('base64');
    var hash = crypto.createHmac('sha1', salt);
    hash.update(pswd);
    return db.hmsetAsync(KEYS.id2auth(user.id), {
      hash: hash.digest('base64'),
      salt: salt
    }).then(function(){
      return Promise.join(pswd, salt);
    });
  });
}

function post(user) {
  return db.getAsync(KEYS.fromUid2id(user.from, user.from_uid))
  .then(function(id){
    if (id !== null) {
      user.id = id;
      return put(user);
    }
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
  });
}

function put(user) {
  var id = user.id
    , base = _.pick(user, FIELDS.BASE)
    , more = _.pick(user, FIELDS.MORE)
    , from = _.pick(user, FIELDS.FROM)
    , multi = db.multi();
  multi.hmset(KEYS.id2user(id), base);
  multi.hmset(KEYS.id2more(id), more);
  multi.hmset(KEYS.id2from(id), from);
  return Promise.promisify(multi.exec, multi)();
}

function get(id) {
  var multi = db.multi();
  multi.hgetall(KEYS.id2user(id));
  multi.hgetall(KEYS.id2more(id));
  return Promise.promisify(multi.exec, multi)()
  .then(function(replies){
    return _.extend.apply(_, replies);
  });
}

var UserModel = {
  auth: auth,
  sign: sign,
  post: post,
  get: get
};

module.exports = UserModel;
