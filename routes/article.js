// article router
var db = require('../lib/db'),
  _ = require('underscore'),
  KEYS = {
    CURSOR: 'cursor:article',
    CREATE_TIME: 'create_time:article',
    UPDATE_TIME: 'update_time:article',
    id: function(id) {
      return 'article:' + id;
    },
    uri2id: function(uri) {
      return 'uri:article:' + uri;
    },
    tag: function(tag) {
      return 'tag:' + tag;
    }
  };

exports.list = function(req, res, next) {
  next();
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

/*
hmset article:{id} {
  id: {id},
  uri: {uri},
  title: {title},
  content: {content},
  author: {author},
  create_time: {create_time},
  update_time: {update_time}
}

set article:uri:{uri} {id}

zadd article:create_time {create_time} {id}
zadd article:update_time {update_time} {id}

rpush article:{id}:tags {tag}
sadd tag:{tag} {article_id}
*/

function loadArticleByUri(uri, callback) {
  db.get(KEYS.uri2id(uri), function(err, id){
    if (err) {
      return callback(err);
    }
    if (! id) {
      return callback('article id not found');
    }
    db.hgetall(KEYS.id(id), callback);
  });
}

function createArticle(args, callback) {
  var data = _.pick(args, 'uri', 'title', 'content', 'author', 'tags')
    , tags = data.tags && data.tags.split(',');
  data.update_time = data.create_time = Date.now();
  db.incr(KEYS.CURSOR, function(err, id){
    if (err) {
      return callback(err);
    }
    var keyId = KEYS.id(id);
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
      multi.zadd(KEYS.CREATE_TIME, data.create_time, id);
      multi.zadd(KEYS.UPDATE_TIME, data.update_time, id);
      if (tags && tags.length > 0) {
        tags.forEach(function(tag, i){
          multi.sadd(KEYS.tag(tag), id);
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
  var data = _.pick(args, 'uri', 'title', 'content', 'author', 'tags')
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
    var keyId = KEYS.id(id);
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
          multi.srem(KEYS.tag(tag), id);
        });
      }
      if (tags && tags.length > 0) {
        tags.forEach(function(tag, i){
          multi.sadd(KEYS.tag(tag), id);
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