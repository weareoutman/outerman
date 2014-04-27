// Controller Article

var _ = require('underscore')
  , express = require('express')
  , conf = require('../config')
  , ArticleModel = require('../models/article')
  , CommentModel = require('../models/comment')
  , UserController = require('./user')
  , router = express.Router();

exports.index = router;

router.route('/')

  // Article list
  .get(list, function(req, res){
    res.locals.title = '文章列表' + conf.title_suffix;
    res.locals.nav = 'article';
    res.renderHijax('article/list');
  })

  // Do post an article
  .post(UserController.restrict, post, function(req, res){
    if (req.xhr) {
      return res.send(res.locals.article);
    }
    res.redirect('/article/' + res.locals.article.uri);
  });

// To write an article
router.get('/edit', UserController.restrict, function(req, res){
  res.locals.title = '写一篇文章' + conf.title_suffix;
  res.locals.nav = 'article';
  res.locals.datum = {};
  res.locals.script = 'edit';
  res.renderHijax('article/edit');
});

router.route('/:uri')

  // View an article
  .get(get, function(req, res){
    res.locals.title = res.locals.article.title + conf.title_suffix;
    var script = res.locals.article.script;
    res.locals.nav = 'article';
    res.locals.script = script ? ['article', script] : 'article';
    res.locals.datum = _.pick(res.locals.article, 'uri');
    res.renderHijax('article/article');
  })

  // Do update an article
  .put(UserController.restrict, get, put, function(req, res){
    if (req.xhr) {
      return res.send(res.locals.article);
    }
    res.redirect('/article/' + res.locals.article.uri);
  })

  // Do delete an article
  .delete(UserController.restrict, get, remove, function(req, res){
    res.send({});
  });

// To update an article
router.get('/:uri/edit', UserController.restrict, get, function(req, res){
  var article = res.locals.article;
  res.locals.title = '修改文章: ' + article.title + conf.title_suffix;
  res.locals.nav = 'article';
  res.locals.datum = {
    id: article.id,
    uri: article.uri,
    update: true
  };
  res.locals.script = 'edit';
  res.renderHijax('article/edit');
});

// Article raw markdown content
router.get('/:uri/raw', get, function(req, res){
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.send(res.locals.article.content);
});

router.route('/:uri/comment')

  // Comment list
  .get(get, listComments, function(req, res){
    res.send(res.locals.commentList);
  })

  // Do post a comment
  .post(get, postComment, function(req, res){
    // res.send(res.locals.comment);
    res.send(res.locals.comment);
  });

// Do delete a comment
router.delete('/:uri/comment/:cid', UserController.restrict, get, getComment, removeComment, function(req, res){
  res.send({});
});

// Router comments
exports.comments = express.Router();

// Get all comments
exports.comments.get('/', UserController.restrict, listAllComments, function(req, res){
  res.locals.title = '评论列表' + conf.title_suffix;
  res.locals.nav = 'comments';
  res.locals.script = 'comments';
  res.renderHijax('article/comments');
});

// Router tag
exports.tag = express.Router();

// Get article list by tag
exports.tag.get('/:tag', listByTag, function(req, res){
  res.locals.title = '文章列表 #' + res.locals.tag + conf.title_suffix;
  res.locals.nav = 'article';
  res.renderHijax('article/list');
});

// Feed
/*exports.feed = express.Router();

exports.feed.get('/', list, function(req, res){
  res.type('text/plain');
  res.locals.pretty = true;
  res.render('feed');
});*/

function list(req, res, next) {
  ArticleModel.list()
  .then(function(list){
    res.locals.list = list;
    next();
  }).catch(next);
}

function listByTag(req, res, next) {
  var tag = req.params.tag;
  ArticleModel.listByTag(tag)
  .then(function(list){
    res.locals.tag = tag;
    res.locals.list = list;
    next();
  }).catch(next);
}

function get(req, res, next) {
  ArticleModel.get(req.params.uri)
  .then(function(article){
    res.locals.article = article;
    next();
  }).catch(next);
}

function post(req, res, next) {
  ArticleModel.post(req.body, res.locals.user)
  .then(function(article){
    res.locals.article = article;
    next();
  }).catch(next);
}

function put(req, res, next) {
  ArticleModel.put(res.locals.article, req.body, res.locals.user)
  .then(function(article){
    res.locals.article = article;
    next();
  }).catch(next);
}

function remove(req, res, next) {
  ArticleModel.remove(res.locals.article, res.locals.user)
  .then(function(replies){
    next();
  }).catch(next);
}

function listComments(req, res, next) {
  CommentModel.list(res.locals.article.id)
  .then(function(commentList){
    res.locals.commentList = commentList;
    next();
  }).catch(next);
}

function listAllComments(req, res, next) {
  CommentModel.listAll()
  .then(function(commentList){
    res.locals.commentList = commentList;
    next();
  }).catch(next);
}

function postComment(req, res, next) {
  CommentModel.post(res.locals.article.id, req.body, res.locals.user, req.ip)
  .then(function(comment){
    res.locals.comment = comment;
    next();
  }).catch(next);
}

function getComment(req, res, next) {
  CommentModel.get(req.params.cid, res.locals.article.id)
  .then(function(comment){
    res.locals.comment = comment;
    next();
  }).catch(next);
}

function removeComment(req, res, next) {
  CommentModel.remove(res.locals.comment, res.locals.user)
  .then(function(){
    next();
  }).catch(next);
}
