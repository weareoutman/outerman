var express = require('express')
  , fs = require('fs')
  , util = require('util')
  , Promise = require('bluebird')
  , ArticleController = require('./controllers/article')
  , UserController = require('./controllers/user')
  // , user = require('./routes/user')
  , oauth = require('./lib/oauth')
  // , article = require('./routes/article')
  // , comment = require('./routes/comment')
  , db = require('./lib/db')
  , conf = require('./config')
  , app = express()
  , main = express()
  , mainLog = fs.createWriteStream('./log/main.log', {flags: 'a'})
  , staticLog = fs.createWriteStream('./log/static.log', {flags: 'a'})
  , dev = app.get('env') === 'development'
  , regPath = /^\/($|[^\/]+)/;

var RedisStore = require('connect-redis')(express);

main.locals.DEV = dev;

main.enable('case sensitive routing');

// log
var logFormat = ':req[X-Real-IP] - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" ":req[X-Forwarded-For]"';
if (dev) {
  logFormat = 'dev';
  Promise.longStackTraces();
}
main.use(express.logger({
  format: logFormat,
  stream: mainLog
}));

main.use(express.compress());

main.use(express.favicon(__dirname + '/public/favicon.ico'));

main.use(express.cookieParser(conf.cookie_secret));
main.use(express.session({
  key: 'ssid',
  store: new RedisStore({
    client: db,
    ttl: 21600 // 6小时
  }),
  secret: conf.cookie_secret
}));

// main.use(express.bodyParser());
main.use(express.json());
main.use(express.urlencoded());
// main.use(express.multipart());
main.use(express.methodOverride());
// user auth
main.use(UserController.auth);

main.set('views', __dirname + '/views');
main.set('view engine', 'jade');

main.get('/', function(req, res){
  res.render('index');
});

main.get('/robots.txt', function(req, res){
  res.sendfile(__dirname + '/public/robots.txt', {
    maxAge: 8.64e7 // 1天
  });
});

main.get('/auth', function(req, res){
  var path = req.query.path;
  if (! regPath.test(path)) {
    path = '/';
  }
  res.locals.path = encodeURIComponent(path);
  res.render('auth');
});

main.get('/auth/redirect/:site', function(req, res, next){
  var site = req.params.site;
  if (oauth.list.indexOf(site) === -1) {
    return next();
  }
  var path = req.query.path
    , state = Math.random().toString(36).replace('.', '');
  if (! regPath.test(path)) {
    path = '/';
  }
  req.session.state = state;
  state = encodeURIComponent(state + '.' + path);
  var url;
  switch (site) {
    case 'weibo':
      url = util.format('https://api.weibo.com/oauth2/authorize?client_id=%s&response_type=code&redirect_uri=%s&state=%s', conf.weibo.client_id, conf.weibo.redirect_uri, state);
      break;
    case 'qq':
      url = util.format('https://graph.qq.com/oauth2.0/authorize?client_id=%s&response_type=code&redirect_uri=%s&state=%s', conf.qq.client_id, conf.qq.redirect_uri, state);
      break;
    case 'github':
      url = util.format('https://github.com/login/oauth/authorize?scope=user:email&client_id=%s&redirect_uri=%s&state=%s', conf.github.client_id, conf.github.redirect_uri, state);
      break;
    case 'instagram':
      url = util.format('https://api.instagram.com/oauth/authorize/?client_id=%s&response_type=code&redirect_uri=%s&state=%s', conf.instagram.client_id, conf.instagram.redirect_uri, state);
      break;
    default:
      next();
      return;
  }
  res.redirect(url);
});

oauth.list.forEach(function(site){
  main.get('/auth/' + site, oauth.before, oauth[site].auth, UserController.authed, function(req, res){
      var url = req.redirectUrl;
      if (/^\/auth($|[\/\?#])/.test(url)) {
        url = '/';
      }
      res.redirect(url);
  });
});

main.get('/signout', function(req, res){
  var path = req.query.path;
  if (! regPath.test(path)) {
    path = '/';
  }
  req.session.destroy(function(err){
    if (err) {
      console.error(err);
    }
    res.clearCookie('uid');
    res.clearCookie('usign');
    res.clearCookie('usalt');
    res.redirect(path);
  });
});

ArticleController(main);

// 文章列表
/*main.get('/article', article.list, function(req, res){
  res.locals.list.forEach(function(article){
    var date = new Date(+ article.create_time);
    article.str_create_time = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
  });
  res.render('article/list');
});

// 发表新文章
main.get('/article/edit', user.restrict, function(req, res){
  res.render('article/edit');
});

// 查看单篇文章
main.get('/article/:uri', article.load, comment.list, function(req, res){
  var article = res.locals.article
    , date = new Date(+ article.create_time);
  article.str_create_time = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
  res.locals.list.forEach(function(comment){
    var date = new Date(+ comment.create_time);
    comment.str_create_time = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
  });
  res.render('article/article');
});*/
/*
// 修改文章
main.get('/article/:uri/edit', user.restrict, article.load, function(req, res){
  res.locals.update = true;
  res.render('article/edit');
});

// 提交发表新文章
main.post('/article', user.restrict, article.post, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

// 提交修改文章
main.put('/article/:uri', user.restrict, article.load, article.put, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

// 评论列表
main.get('/article/:uri/comment', article.load, comment.list, function(req, res){
  res.send(res.locals.list);
});

// 提交评论
main.post('/article/:uri/comment', user.restrict, article.load, comment.post, function(req, res){
  // res.send(res.locals.comment);
  res.redirect('/article/' + req.params.uri + '#comments');
});*/

// Google site verification
main.get('/google040d868833adfa0a.html', function(req, res){
  res.send('google-site-verification: google040d868833adfa0a.html');
});

main.use(main.router);
// 404
main.use(function(req, res, next){
  console.log('Not Found');
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
// Error handler
main.use(function(err, req, res, next){
  console.log(err.stack);
  var status = err.status || 500;
  console.log(status);
  res.status(status);
  res.render('error/4xx', {error: err});
  // res.end(status);
});

// 静态文件服务
var staticServer = express();
staticServer.enable('case sensitive routing');
staticServer.use(express.logger({
  format: logFormat,
  stream: staticLog
}));
staticServer.use(express.compress());
staticServer.use(express.static(__dirname + '/public', {
  maxAge: 8.64e7 // 1天
}));

var wwwServer = express();
wwwServer.all('*', function(req, res){
  res.redirect(301, 'http://weihub.com' + req.originalUrl);
});

app.enable('trust proxy');
app.use(express.vhost('weihub.com', main));
app.use(express.vhost('c.weihub.com', staticServer));
app.use(express.vhost('www.weihub.com', wwwServer));

app.listen(conf.port, conf.host);
console.log('[%s] Express started listen on %s:%s, in %s mode',
  new Date().toUTCString(), conf.host, conf.port, app.get('env'));
