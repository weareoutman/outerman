// Model Comment

/*
INCR comment:cursor [next_id]
HMSET comment:id:[id] {
  id: [id],
  article_id: [article_id],
  reply_id: [reply_id],
  user_id: [user_id],
  guest_name: [guest_name],
  guest_ip: [guest_ip],
  content: [content],
  html: [html],
  create_time: [create_time]
}
SADD comment:set:[article_id] [id]
RPUSH comment:list:[article_id] [id]
LPUSH comment:user:list:[user_id] [id]
SET comment:hash:user:[user_id] [content_hash]
INCR comment:limit:user:[user_id]
EXPIRE comment:limit:user:[user_id] 60
SET comment:hash:ip:[ip] [content_hash]
EXPIRE comment:hash:ip:[ip] 600
INCR comment:limit:ip:[ip]
EXPIRE comment:limit:ip:[ip] 60
# ZADD comment:vote:[article_id] [create_time] [id]

LREM comment:list:[article_id] 0 [id]
LPUSH trash:comment:list [id]
RENAMENX comment:id:[id] trash:comment:id:[id]
SREM comment:set:[article_id]
SADD trash:comment:set:[article_id]
LREM comment:user:list:[user_id] 0 [id]
LPUSH trash:comment:user:list:[user_id] [id]
*/

var Promise = require('bluebird')
  , _ = require('underscore')
  , marked = require('marked')
  , crypto = require('crypto')
  , dateformat = require('dateformat')
  , db = require('../lib/db')
  , ClientError = require('../lib/errors').ClientError
  , ArticleModel = require('./article')
  , UserModel = require('./user')
  , markedAsync = Promise.promisify(marked)
  , HASH_IP_EXPIRE = 600
  , LIMIT_IP_EXPIRE = 600
  , LIMIT_IP_COUNT = 2
  , LIMIT_USER_EXPIRE = 300
  , LIMIT_USER_COUNT = 2
  , MAX_CONTENT_LENGTH = 500
  , MAX_GUEST_NAME_LENGTH = 32
  , KEYS = {
    ALL: 'comment:all',
    CURSOR: 'comment:cursor',
    id2comment: function(id) {
      return 'comment:id:' + id;
    },
    list: function(articleId) {
      return 'comment:list:' + articleId;
    },
    set: function(articleId){
      return 'comment:set:' + articleId;
    },
    /*vote: function(articleId) {
      return 'comment:vote:' + articleId;
    },*/
    userList: function(userId) {
      return 'comment:user:list:' + userId;
    },
    hashUser: function(userId) {
      return 'comment:hash:user:' + userId;
    },
    hashIp: function(ip) {
      return 'comment:hash:ip:' + ip;
    },
    limitUser: function(userId) {
      return 'comment:limit:user:' + userId;
    },
    limitIp: function(ip) {
      return 'comment:limit:ip:' + ip;
    }
  }
  , TRASH = {
    ALL: 'trash:comment:all',
    id2comment: function(id) {
      return 'trash:comment:id:' + id;
    },
    list: function(articleId) {
      return 'trash:comment:list:' + articleId;
    },
    set: function(articleId){
      return 'trash:comment:set:' + articleId;
    },
    /*vote: function(articleId) {
      return 'trash:comment:vote:' + articleId;
    },*/
    userList: function(userId) {
      return 'trash:comment:user:list:' + userId;
    }
  };

function fillUser(ids) {
  return Promise.resolve(ids)
  .then(function(ids){
    if (ids.length === 0) {
      return [];
    }
    var multi = db.multi();
    ids.forEach(function(id){
      multi.hgetall(KEYS.id2comment(id));
    });
    return Promise.promisify(multi.exec, multi)();
  }).then(function(commentList){
    var userIdList = _.chain(commentList).map(function(c){
      return c.user_id;
    }).compact().uniq().value();
    return Promise.map(userIdList, UserModel.get)
    .then(function(userList){
      var userMap = {};
      userList.forEach(function(user){
        userMap[user.id] = user;
      });
      commentList.forEach(function(comment){
        var userId = comment.user_id;
        if (userId) {
          comment.user = userMap[userId];
        } else {
          comment.user = {
            fullname: comment.guest_name
          };
        }
        format(comment);
      });
      return commentList;
    });
  });
}

// get an article's comment list
exports.list = function(articleId){
  return db.lrangeAsync(KEYS.list(articleId), 0, -1)
  .then(fillUser);
};

exports.listAll = function() {
  return db.lrangeAsync(KEYS.ALL, 0, -1)
  .then(fillUser)
  .then(function(commentList){
    var articleIdList = _.chain(commentList).map(function(c){
      return c.article_id;
    }).compact().uniq().value();
    return Promise.map(articleIdList, ArticleModel.getById)
    .then(function(articleList){
      var articleMap = {};
      articleList.forEach(function(article){
        articleMap[article.id] = article;
      });
      commentList.forEach(function(comment){
        comment.article = articleMap[comment.article_id];
      });
      return commentList;
    });
  });
};

// get a comment of an article
exports.get = function(id, articleId) {
  return db.sismemberAsync(KEYS.set(articleId), id)
  .then(function(isMember){
    if (! isMember) {
      throw new ClientError(400);
    }
    return db.hgetallAsync(KEYS.id2comment(id));
  });
};

// post a comment on an article
exports.post = function(articleId, body, user, ip) {
  var data = {
      content: ('' + (body.content || '')).trim()
    }
    , replyId = '' + (body.reply_id || '')
    , guestName = ('' + (body.user || '')).trim().substr(0, MAX_GUEST_NAME_LENGTH)
    , hash
    , hashKey
    , limitKey
    , limitExpire
    , limitCount;
  data.article_id = articleId;
  data.guest_ip = ip;
  if (user) {
    data.user_id = user.id;
    hashKey = KEYS.hashUser(user.id);
    limitKey = KEYS.limitUser(user.id);
    limitExpire = LIMIT_USER_EXPIRE;
    limitCount = LIMIT_USER_COUNT;
  } else {
    // limit the guest name char length
    data.guest_name = guestName;
    hashKey = KEYS.hashIp(ip);
    limitKey = KEYS.limitIp(ip);
    limitExpire = LIMIT_IP_EXPIRE;
    limitCount = LIMIT_IP_COUNT;
  }
  data.create_time = Date.now();
  if (replyId) {
    data.reply_id = replyId;
  }
  if (! data.content || (! user && ! data.guest_name)) {
    return Promise.reject(new ClientError(400));
  }
  if (data.content.length > MAX_CONTENT_LENGTH) {
    return Promise.reject(new ClientError(413));
  }
  return process(data)
  .then(function(html){
    data.html = html;
    if (data.reply_id) {
      // check if the reply is member of the article comments
      return db.sismemberAsync(KEYS.set(articleId), data.reply_id);
    }
    return true;
  }).then(function(isMember){
    if (! isMember) {
      throw new ClientError(400);
    }
    // user should not post comments too frequently
    return db.getAsync(limitKey)
    .then(function(count){
      if (+ count >= limitCount) {
        throw new ClientError(403);
      }
      return db.getAsync(hashKey);
    });
  }).then(function(sign){
    // user should not post the same comment twice
    hash = sha1(data.content);
    if (hash === sign) {
      throw new ClientError(409);
    }
  }).then(function(){
    // incr id cursor
    return db.incrAsync(KEYS.CURSOR);
  }).then(function(id){
    var multi = db.multi();
    data.id = id;
    multi.hmset(KEYS.id2comment(id), data);
    multi.lpush(KEYS.ALL, id);
    multi.rpush(KEYS.list(data.article_id), id);
    multi.sadd(KEYS.set(articleId), id);
    if (user) {
      multi.lpush(KEYS.userList(user.id), id);
    }
    return Promise.promisify(multi.exec, multi)();
  }).then(function(){
    // set content hash
    return db.setAsync(hashKey, hash);
  }).then(function(){
    var multi = db.multi();
    if (! user) {
      // expire content hash for unsignedin users
      multi.expire(hashKey, HASH_IP_EXPIRE);
    }
    // limit the comment frequency
    multi.incr(limitKey);
    multi.expire(limitKey, limitExpire);
    return Promise.promisify(multi.exec, multi)();
  }).then(function(){
    return db.hgetallAsync(KEYS.id2comment(data.id));
  }).then(function(comment){
    if (user) {
      comment.user = user;
    } else {
      comment.user = {
        fullname: comment.guest_name
      };
    }
    return format(comment);
  });
};

/*
remove a comment

LREM comment:all 0 [id]
LPUSH trash:comment:all [id]
LREM comment:list:[article_id] 0 [id]
LPUSH trash:comment:list [id]
RENAMENX comment:id:[id] trash:comment:id:[id]
SREM comment:set:[article_id] [id]
SADD trash:comment:set:[article_id] [id]
LREM comment:user:list:[user_id] 0 [id]
LPUSH trash:comment:user:list:[user_id] [id]
*/
exports.remove = function(comment, user) {
  var multi = db.multi()
    , id = comment.id
    , articleId = comment.article_id
    , userId = comment.user_id;
  multi.lrem(KEYS.ALL, 0, id);
  multi.lpush(TRASH.ALL, id);
  multi.lrem(KEYS.list(articleId), 0, id);
  multi.lpush(TRASH.list(articleId), id);
  multi.renamenx(KEYS.id2comment(id), TRASH.id2comment(id));
  multi.srem(KEYS.set(articleId), id);
  multi.sadd(TRASH.set(articleId), id);
  if (userId) {
    multi.lrem(KEYS.userList(userId), 0, id);
    multi.lpush(TRASH.userList(userId), id);
  }
  return Promise.promisify(multi.exec, multi)();
};

function sha1(data) {
  var hash = crypto.createHash('sha1');
  hash.update(data);
  return hash.digest('hex');
}

// markdown to html, do sanitize
function process(data) {
  return markedAsync(data.content, { sanitize: true });
}

function format(comment) {
  var date = new Date(+ comment.create_time);
  comment.str_create_time = dateformat(date, 'yyyy/m/d HH:MM');
  return comment;
}
