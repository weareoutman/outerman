// router article

/*
SET article:cursor [next_id]
HMSET article:id:[id] {
  id: [id],
  uri: [uri],
  author: [author],
  title: [title],
  content: [content],
  tags: [tags],
  create_time: [create_time],
  update_time: [update_time]
}
SET article:uri:[uri] [id]
LPUSH article:list [id]
ZADD article:update_time [update_time] [id]
SADD tag:[tag] [id]
*/

var db = require('../lib/db'),
  _ = require('underscore'),
  KEYS = {
    CURSOR: 'article:cursor',
    LIST: 'article:list',
    UPDATE_TIME: 'article:update_time',
    id2article: function(id) {
      return 'article:id:' + id;
    },
    uri2id: function(uri) {
      return 'article:uri:' + uri;
    },
    tag2id: function(tag) {
      return 'article:tag:' + tag;
    }
  };

exports.list = function(req, res, next) {
  getArticleList(function(err, list){
    if (err) {
      return next(err);
    }
    res.locals.list = list;
    next();
  });
};

exports.load = function(req, res, next) {
  loadArticleByUri(req.params.uri, function(err, article){
    if (err) {
      return next(err);
    }
    if (! article) {
      return next('article not found');
    }
    res.locals.article = article;
    next();
  });
};

exports.create = function(req, res, next) {
  createArticle(req.body, function(err, article){
    if (err) {
      return next(err);
    }
    res.locals.article = article;
    next();
  });
};

exports.update = function(req, res, next) {
  updateArticle(req.params.uri, req.body, function(err, article){
    if (err) {
      return next(err);
    }
    res.locals.article = article;
    next();
  });
};

function getArticleList(callback) {
  db.lrange(KEYS.LIST, 0, -1, function(err, list){
    if (err) {
      return callback(err);
    }
    if (list.length === 0) {
      return callback(null, []);
    }
    var multi = db.multi();
    list.forEach(function(id){
      multi.hgetall(KEYS.id2article(id));
    });
    multi.exec(function(err, replies){
      if (err) {
        return callback(err);
      }
      callback(null, replies);
    });
  });
}

function loadArticleByUri(uri, callback) {
  db.get(KEYS.uri2id(uri), function(err, id){
    if (err) {
      return callback(err);
    }
    if (! id) {
      return callback('article id not found');
    }
    db.hgetall(KEYS.id2article(id), callback);
  });
}

function createArticle(args, callback) {
  var data = _.pick(args, 'uri', 'author', 'title', 'content', 'tags')
    , tags = data.tags && data.tags.split(',');
  data.update_time = data.create_time = Date.now();
  db.incr(KEYS.CURSOR, function(err, id){
    if (err) {
      return callback(err);
    }
    var keyId = KEYS.id2article(id);
    db.hgetall(keyId, function(err, exist){
      if (err) {
        return callback(err);
      }
      if (exist) {
        return callback('id existed');
      }
      var multi = db.multi();
      multi.hmset(keyId, data);
      multi.set(KEYS.uri2id(data.uri), id);
      multi.lpush(KEYS.LIST, id);
      multi.zadd(KEYS.UPDATE_TIME, data.update_time, id);
      if (tags && tags.length > 0) {
        tags.forEach(function(tag, i){
          multi.sadd(KEYS.tag2id(tag), id);
        });
      }
      multi.exec(function(err){
        if (err) {
          return callback(err);
        }
        callback(null, data);
      });
    });
  });
}

function updateArticle(oldUri, args, callback) {
  var data = _.pick(args, 'uri', 'author', 'title', 'content', 'tags')
    , tags = data.tags && data.tags.split(',')
    , keyOldUri2id = KEYS.uri2id(oldUri);
  data.update_time = Date.now();
  db.get(keyOldUri2id, function(err, id){
    if (err) {
      return callback(err);
    }
    if (! id) {
      return callback('article id not found');
    }
    var keyId = KEYS.id2article(id);
    db.hgetall(keyId, function(err, exist){
      if (err) {
        return callback(err);
      }
      if (! exist) {
        return callback('article not found');
      }
      var multi = db.multi()
        , keyNewUri2id = KEYS.uri2id(data.uri)
        , oldTags = exist.tags && exist.tags.split(',');
      if (keyOldUri2id !== keyNewUri2id) {
        multi.rename(keyOldUri2id, keyNewUri2id);
      }
      multi.hmset(keyId, data);
      multi.zadd(KEYS.UPDATE_TIME, data.update_time, id);
      if (oldTags && oldTags.length > 0) {
        oldTags.forEach(function(tag, i){
          multi.srem(KEYS.tag2id(tag), id);
        });
      }
      if (tags && tags.length > 0) {
        tags.forEach(function(tag, i){
          multi.sadd(KEYS.tag2id(tag), id);
        });
      }
      multi.exec(function(err){
        if (err) {
          return callback(err);
        }
        callback(null, data);
      });
    });
  });
}