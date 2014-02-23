// router article

/*
INCR article:cursor [next_id]
HMSET article:id:[id] {
  id: [id],
  uri: [uri],
  author: [author],
  title: [title],
  content: [content],
  html: [html],
  tags: [tags],
  create_time: [create_time],
  update_time: [update_time]
}
SET article:uri:[uri] [id]
LPUSH article:list [id]
ZADD article:update_time [update_time] [id]
SADD article:tag:[tag] [id]
*/

var db = require('../lib/db')
  , _ = require('underscore')
  , marked = require('marked')
  , hljs = require('highlight.js')
  , summary_max_chars = 90
  , KEYS = {
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
      return 'article:tag:' + encodeURIComponent(tag);
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

exports.post = function(req, res, next) {
  create(res.locals.user, req.body, function(err, article){
    if (err) {
      return next(err);
    }
    res.locals.article = article;
    next();
  });
};

exports.put = function(req, res, next) {
  update(res.locals.user, res.locals.article, req.body, function(err, article){
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

var renderer = new marked.Renderer();
renderer.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '"><code>'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

function process(data, callback) {
  // Translate markdown to html
  marked(data.content, {
    renderer: renderer,
    langPrefix: 'hljs ',
    highlight: function(code, lang){
      return lang ? hljs.highlight(lang, code).value : hljs.highlightAuto(code).value;
    }
  }, function(err, html){
    if (err) {
      return callback(err);
    }
    data.html = html;
    // Cut out the summary of article
    var cleaned = html.replace(/<[^>]*>/g, '')
      // Treat the Chinese char as double
      , count = summary_max_chars * 2
      , index = -1;
    while (count > 0) {
      if (cleaned.charCodeAt(index += 1) > 0x4dff) {
        count -= 2;
      } else {
        count -= 1;
      }
    }
    data.summary = cleaned.substr(0, index);
    callback();
  });
}

function create(user, args, callback) {
  var data = _.pick(args, 'uri', 'title', 'content', 'tags')
    , tags = data.tags && data.tags.split(',');
  data.user_id = user.id;
  data.update_time = data.create_time = Date.now();
  process(data, function(err){
    if (err) {
      return callback(err);
    }
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
        data.id = id;
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
  });
}

function update(user, old, args, callback) {
  var data = _.pick(args, 'uri', 'title', 'content', 'tags')
    , tags = data.tags && data.tags.split(',')
    , id = old.id
    , keyOldUri2id = KEYS.uri2id(old.uri);
  data.user_id = user.id;
  data.update_time = Date.now();
  process(data, function(err){
    if (err) {
      return callback(err);
    }
    var keyId = KEYS.id2article(id);
    var multi = db.multi()
      , keyNewUri2id = KEYS.uri2id(data.uri)
      , oldTags = old.tags && old.tags.split(',');
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
}
