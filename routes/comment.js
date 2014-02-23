// router comment

/*
INCR comment:cursor [next_id]
HMSET comment:id:[id] {
  id: [id],
  article_id: [article_id],
  # reply_id: [reply_id],
  user_id: [user_id],
  content: [content],
  html: [html],
  create_time: [create_time]
}
LPUSH comment:list:[article_id] [id]
# ZADD comment:vote:[article_id] [update_time] [id]
*/

var db = require('../lib/db')
  , _ = require('underscore')
  , marked = require('marked')
  , KEYS = {
    CURSOR: 'comment:cursor',
    id2comment: function(id) {
      return 'comment:id:' + id;
    },
    list: function(articleId) {
      return 'comment:list:' + articleId;
    },
    vote: function(articleId) {
      return 'comment:vote:' + articleId;
    }
  };

exports.list = function(req, res, next){
  getCommentList(res.locals.article, function(err, list){
    if (err) {
      return next(err);
    }
    res.locals.list = list;
    next();
  });
};

exports.post = function(req, res, next) {
  create(res.locals.user, res.locals.article, req.body, function(err, comment){
    if (err) {
      return next(err);
    }
    res.locals.comment = comment;
    next();
  });
};

function getCommentList(article, callback) {
  db.lrange(KEYS.list(article.id), 0, -1, function(err, list){
    if (err) {
      return callback(err);
    }
    if (list.length === 0) {
      return callback(null, []);
    }
    var multi = db.multi();
    list.forEach(function(id){
      multi.hgetall(KEYS.id2comment(id));
    });
    multi.exec(function(err, replies){
      if (err) {
        return callback(err);
      }
      callback(null, replies);
    });
  });
}

function process(data, callback) {
  // Translate markdown to html
  marked(data.content, {
    sanitize: true
  }, function(err, html){
    if (err) {
      return callback(err);
    }
    data.html = html;
    callback();
  });
}

function create(user, article, args, callback) {
  var data = _.pick(args, 'content');
  data.article_id = article.id;
  data.user_id = user.id;
  data.create_time = Date.now();
  process(data, function(err){
    if (err) {
      return callback(err);
    }
    db.incr(KEYS.CURSOR, function(err, id){
      if (err) {
        return callback(err);
      }
      var keyId = KEYS.id2comment(id);
      db.hgetall(keyId, function(err, exist){
        if (err) {
          return callback(err);
        }
        if (exist) {
          return callback('id existed');
        }
        var multi = db.multi();
        multi.hmset(keyId, data);
        multi.lpush(KEYS.list(data.article_id), id);
        // multi.zadd(KEYS.vote(articleId), 0, id);
        multi.exec(function(err){
          if (err) {
            return callback(err);
          }
          callback(null, data);
        });
      });
    });
  });
}
