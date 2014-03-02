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

var Promise = require('bluebird')
  , _ = require('underscore')
  , marked = require('marked')
  , db = require('../lib/db')
  , markedAsync = Promise.promisify(marked)
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
  db.lrangeAsync(KEYS.list(res.locals.article.id), 0, -1)
  .then(function(list){
    if (list.length === 0) {
      return Promise.resolve([]);
    }
    var multi = db.multi();
    list.forEach(function(id){
      multi.hgetall(KEYS.id2comment(id));
    });
    return Promise.promisify(multi.exec, multi)();
  })
  .then(function(list){
    res.locals.list = list;
    next();
  })
  .catch(next);
};

exports.post = function(req, res, next) {
  var user = res.locals.user
    , article = res.locals.article
    , data = _.pick(req.body, 'content');
  data.article_id = article.id;
  data.user_id = user.id;
  data.create_time = Date.now();
  processAsync(data)
  .then(function(html){
    data.html = html;
    return db.incrAsync(KEYS.CURSOR);
  })
  .then(function(id){
    var multi = db.multi();
    data.id = id;
    multi.hmset(KEYS.id2comment(id), data);
    multi.lpush(KEYS.list(data.article_id), id);
    // multi.zadd(KEYS.vote(articleId), 0, id);
    return Promise.promisify(multi.exec, multi)();
  })
  .then(function(exist){
    return db.hgetallAsync(KEYS.id2comment(data.id));
  })
  .then(function(comment){
    res.locals.comment = comment;
    next();
  })
  .catch(next);
};

function processAsync(data, callback) {
  // Translate markdown to html
  return markedAsync(data.content, { sanitize: true });
}
