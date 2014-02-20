var express = require('express')
  , fs = require('fs')
  , app = express()
  , main = express()
  , user = require('./routes/user')
  , oauth = require('./lib/oauth')
  , article = require('./routes/article')
  , db = require('./lib/db')
  , conf = require('./config')
  , mainLog = fs.createWriteStream('./log/main.log', {flags: 'a'})
  , staticLog = fs.createWriteStream('./log/static.log', {flags: 'a'});

var RedisStore = require('connect-redis')(express);

main.enable('case sensitive routing');
main.use(express.logger({
  format: ':req[X-Real-IP] - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" ":req[X-Forwarded-For]"',
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
main.use(user.load);

main.use(main.router);
// 404
main.use(function(req, res, next){
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
// Error handler
main.use(function(err, req, res, next){
  var status = err.status || 500;
  res.status(status);
  res.render('error/4xx', {error: err});
});

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
  var url = req.query.url || '/'
    , state = Math.random().toString(36).replace('.', '');
  req.session.state = state;
  res.locals.state = encodeURIComponent(state + '.' + url);
  res.render('auth');
});

oauth.list.forEach(function(from){
  main.get('/auth/' + from, oauth.before, oauth[from].auth, user.check, function(req, res){
    res.redirect(req.redirectUrl);
  });
});

main.get('/signout', function(req, res){
  req.session.destroy(function(err){
    if (err) {
      console.error(err);
    }
    res.clearCookie('uid');
    res.clearCookie('usign');
    res.clearCookie('usalt');
    res.redirect('/');
  });
});

// 文章列表
main.get('/article', article.list, function(req, res){
  res.render('article/list');
});

// 发表新文章
main.get('/article/edit', user.restrict, function(req, res){
  res.render('article/edit');
});

// 修改文章
main.get('/article/edit/:uri', user.restrict, article.load, function(req, res){
  res.locals.update = true;
  res.render('article/edit');
});

// 查看单篇文章
main.get('/article/:uri', article.load, function(req, res){
    res.render('article/article');
});

// 提交发表新文章
main.post('/article', user.restrict, article.create, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

// 提交修改文章
main.put('/article/:uri', user.restrict, article.update, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

// 静态文件服务
var staticServer = express();
staticServer.enable('case sensitive routing');
staticServer.use(express.logger({
  format: ':req[X-Real-IP] - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" ":req[X-Forwarded-For]"',
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
console.log('[%s] Express started listen on %s:%s', new Date().toUTCString(), conf.host, conf.port);
