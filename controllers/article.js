// Controller Article

var _ = require('underscore')
  , conf = require('../config')
  , ArticleModel = require('../models/article')
  , CommentModel = require('../models/comment')
  , UserController = require('./user');

exports.use = function(app) {
  // Article list
  app.get('/article', list, function(req, res){
    res.locals.title = '文章列表' + conf.title_suffix;
    res.locals.nav = 'article';
    res.renderHijax('article/list');
  });

  // To write an article
  app.get('/article/edit', UserController.restrict, function(req, res){
    res.locals.title = '写一篇文章' + conf.title_suffix;
    res.locals.nav = 'article';
    res.locals.datum = {};
    res.locals.script = 'edit';
    res.renderHijax('article/edit');
  });

  // View an article
  app.get('/article/:uri', get, function(req, res){
    res.locals.title = res.locals.article.title + conf.title_suffix;
    var script = res.locals.article.script;
    res.locals.nav = 'article';
    res.locals.script = script ? ['article', script] : 'article';
    res.locals.datum = _.pick(res.locals.article, 'uri');
    res.renderHijax('article/article');
  });

  // To update an article
  app.get('/article/:uri/edit', UserController.restrict, get, function(req, res){
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

  // Do post an article
  app.post('/article', UserController.restrict, post, function(req, res){
    if (req.xhr) {
      return res.send(res.locals.article);
    }
    res.redirect('/article/' + res.locals.article.uri);
  });

  // Do update an article
  app.put('/article/:uri', UserController.restrict, get, put, function(req, res){
    if (req.xhr) {
      return res.send(res.locals.article);
    }
    res.redirect('/article/' + res.locals.article.uri);
  });

  // Do delete an article
  app.delete('/article/:uri', UserController.restrict, get, remove, function(req, res){
    res.send({});
  });

  // Comment list
  app.get('/article/:uri/comment', get, listComments, function(req, res){
    res.send(res.locals.commentList);
  });

  // Do post a comment
  app.post('/article/:uri/comment', get, postComment, function(req, res){
    // res.send(res.locals.comment);
    res.send(res.locals.comment);
  });

  // Get all comments
  app.get('/comments', UserController.restrict, listAllComments, function(req, res){
    res.locals.title = '评论列表' + conf.title_suffix;
    res.locals.nav = 'comments';
    res.locals.script = 'comments';
    res.renderHijax('article/comments');
  });

  // Do delete a comment
  app.delete('/article/:uri/comment/:cid', UserController.restrict, get, getComment, removeComment, function(req, res){
    res.send({});
  });

  // Article raw markdown content
  app.get('/article/:uri/raw', get, function(req, res){
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(res.locals.article.content);
  });

  // Get article list by tag
  app.get('/tag/:tag', listByTag, function(req, res){
    res.locals.title = '文章列表 #' + res.locals.tag + conf.title_suffix;
    res.locals.nav = 'article';
    res.renderHijax('article/list');
  });
};

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
