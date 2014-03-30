// Controller Article

var ArticleModel = require('../models/article')
  , CommentModel = require('../models/comment')
  , UserController = require('./user');

exports.use = function(app) {
  // Article list
  app.get('/article', list, function(req, res){
    res.render('article/list');
  });

  // To post an article
  app.get('/article/edit', UserController.restrict, function(req, res){
    res.render('article/edit');
  });

  // View an article
  app.get('/article/:uri', get, function(req, res){
    res.render('article/article');
  });

  // To update an article
  app.get('/article/:uri/edit', UserController.restrict, get, function(req, res){
    res.locals.update = true;
    res.render('article/edit');
  });

  // Do post an article
  app.post('/article', UserController.restrict, post, function(req, res){
    res.redirect('/article/' + res.locals.article.uri);
  });

  // Do update an article
  app.put('/article/:uri', UserController.restrict, get, put, function(req, res){
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
    res.render('article/comments');
  });

  // Do delete a comment
  app.delete('/article/:uri/comment/:cid', UserController.restrict, get, getComment, removeComment, function(req, res){
    res.send({});
  });

  // Article raw markdown content
  app.get('/article/:uri/raw', get, function(req, res){
    res.charset = 'utf-8';
    res.type('txt').send(res.locals.article.content);
  });
};

function list(req, res, next) {
  ArticleModel.list()
  .then(function(list){
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
