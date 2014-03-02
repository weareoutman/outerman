// Controller Article

var Promise = require('bluebird')
  , ArticleModel = require('../models/article')
  , UserController = require('./user');

module.exports = function(app) {
  // 文章列表
  app.get('/article', list, function(req, res){
    res.render('article/list');
  });

  // 发表新文章
  app.get('/article/edit', UserController.restrict, function(req, res){
    res.render('article/edit');
  });

  // 查看单篇文章
  app.get('/article/:uri', get, function(req, res){
    res.render('article/article');
  });

  // 修改文章
  app.get('/article/:uri/edit', UserController.restrict, get, function(req, res){
    res.locals.update = true;
    res.render('article/edit');
  });

  // 提交发表新文章
  app.post('/article', UserController.restrict, post, function(req, res){
    res.redirect('/article/' + res.locals.article.uri);
  });

  // 提交修改文章
  app.put('/article/:uri', UserController.restrict, get, put, function(req, res){
    res.redirect('/article/' + res.locals.article.uri);
  });

  // TODO: Comments
  // 评论列表
  /*main.get('/article/:uri/comment', get, comment.list, function(req, res){
    res.send(res.locals.list);
  });

  // 提交评论
  main.post('/article/:uri/comment', UserController.restrict, get, comment.post, function(req, res){
    // res.send(res.locals.comment);
    res.redirect('/article/' + req.params.uri + '#comments');
  });*/
};

function list(req, res, next) {
  ArticleModel.list()
  .then(function(list){
    list.forEach(function(article){
      var date = new Date(+ article.create_time);
      article.str_create_time = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
    });
    res.locals.list = list;
    next();
  })
  .catch(next);
}

function get(req, res, next) {
  ArticleModel.get(req.params.uri)
  .then(function(article){
    var date = new Date(+ article.create_time);
    article.str_create_time = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
    res.locals.article = article;
    next();
  })
  .catch(next);
}

function post(req, res, next) {
  ArticleModel.post(res.locals.user, req.body)
  .then(function(article){
    res.locals.article = article;
    next();
  })
  .catch(next);
}

function put(req, res, next) {
  ArticleModel.put(res.locals.article, req.body, res.locals.user)
  .then(function(article){
    res.locals.article = article;
    next();
  })
  .catch(next);
}
