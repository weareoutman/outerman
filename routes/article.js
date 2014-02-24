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
  , Q = require('q')
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

// enable long stack
Q.longStackSupport = true;

// get article list
exports.list = function(req, res, next) {
  Q.ninvoke(db, 'lrange', KEYS.LIST, 0, -1)
  .then(function(ids){
    if (ids.length === 0) {
      return [];
    }
    var multi = db.multi();
    ids.forEach(function(id){
      multi.hgetall(KEYS.id2article(id));
    });
    return Q.ninvoke(multi, 'exec');
  })
  .fail(next)
  .done(function(list){
    res.locals.list = list;
    next();
  });
};

// load an article by the uri in request params
exports.load = function(req, res, next) {
  Q.ninvoke(db, 'get', KEYS.uri2id(req.params.uri))
  .then(function(id){
    if (! id) {
      throw new Error('article not found');
    }
    return Q.ninvoke(db, 'hgetall', KEYS.id2article(id));
  })
  .fail(next)
  .done(function(article){
    res.locals.article = article;
    next();
  });
};

// post an article
exports.post = function(req, res, next) {
  var user = res.locals.user
    , data = _.pick(req.body, 'uri', 'title', 'content', 'tags')
    , tags = data.tags && data.tags.split(',');
  data.user_id = user.id;
  data.update_time = data.create_time = Date.now();

  // markdown to html, and cut out the summary
  process(data)
  .then(function(){
    // incr id cursor
    return Q.ninvoke(db, 'incr', KEYS.CURSOR);
  })
  .then(function(id){
    data.id = id;
    // check if uri existed
    return Q.ninvoke(db, 'get', KEYS.uri2id(data.uri));
  })
  .then(function(exist){
    if (exist) {
      throw new Error('uri existed');
    }
    // save
    var multi = db.multi()
      , id = data.id;
    multi.hmset(KEYS.id2article(id), data);
    multi.set(KEYS.uri2id(data.uri), id);
    multi.lpush(KEYS.LIST, id);
    multi.zadd(KEYS.UPDATE_TIME, data.update_time, id);
    if (tags && tags.length > 0) {
      tags.forEach(function(tag, i){
        multi.sadd(KEYS.tag2id(tag), id);
      });
    }
    return Q.ninvoke(multi, 'exec');
  })
  .then(function(){
    // get article from db
    return Q.ninvoke(db, 'hgetall', KEYS.id2article(data.id));
  })
  .fail(next)
  .done(function(article){
    res.locals.article = article;
    next();
  });
};

// update an article
exports.put = function(req, res, next) {
  var user = res.locals.user
    , old = res.locals.article
    , data = _.pick(req.body, 'uri', 'title', 'content', 'tags')
    , tags = data.tags && data.tags.split(',')
    , id = old.id;
  data.user_id = user.id;
  data.update_time = Date.now();

  delete res.locals.article;

  // markdown to html, and cut out the summary
  process(data)
  .then(function(){
    var multi = db.multi()
      , keyOldUri2id = KEYS.uri2id(old.uri)
      , keyNewUri2id = KEYS.uri2id(data.uri)
      , oldTags = old.tags && old.tags.split(',');
    if (keyOldUri2id !== keyNewUri2id) {
      // rename uri
      multi.rename(keyOldUri2id, keyNewUri2id);
    }
    multi.hmset(KEYS.id2article(id), data);
    multi.zadd(KEYS.UPDATE_TIME, data.update_time, id);
    if (oldTags && oldTags.length > 0) {
      // remove old tags
      oldTags.forEach(function(tag, i){
        multi.srem(KEYS.tag2id(tag), id);
      });
    }
    if (tags && tags.length > 0) {
      // save new tags
      tags.forEach(function(tag, i){
        multi.sadd(KEYS.tag2id(tag), id);
      });
    }
    return Q.ninvoke(multi, 'exec');
  })
  .then(function(){
    // get article from db
    return Q.ninvoke(db, 'hgetall', KEYS.id2article(id));
  })
  .fail(next)
  .done(function(article){
    res.locals.article = article;
    next();
  });
};

// redefine marked renderer
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

// use highlight.js
var markedOptions = {
  renderer: renderer,
  langPrefix: 'hljs ',
  highlight: function(code, lang){
    return lang ? hljs.highlight(lang, code).value : hljs.highlightAuto(code).value;
  }
};

// markdown to html, and cut out the summary
function process(data) {
  // Translate markdown to html
  return Q.nfcall(marked, data.content, markedOptions)
  .then(function(html){
    data.html = html;
    // Cut out the summary
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
  });
}
