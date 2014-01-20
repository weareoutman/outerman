var express = require('express')
  , app = express()
  , main = express()
  , staticServer = express()
  , user = require('./routes/user')
  , oauth = require('./lib/oauth')
  , article = require('./routes/article')
  , db = require('./lib/db')
  , conf = require('./config');

var RedisStore = require('connect-redis')(express);

main.enable('case sensitive routing');
main.use(express.logger('dev'));
main.use(express.compress());

main.use(express.favicon(__dirname + '/public/favicon.ico'));

main.use(express.cookieParser(conf.cookie_secret));
main.use(express.session({
  key: 'usid',
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

main.set('views', __dirname + '/views');
main.set('view engine', 'jade');

main.get('/', user.load, function(req, res){
  res.render('index');
});

main.use(user.load);

main.get('/auth', function(req, res){
  res.render('auth');
});

oauth.list.forEach(function(from){
  main.get('/auth/' + from, oauth[from].auth, user.check, function(req, res){
    // res.send(req.user);
    res.redirect('/');
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
main.get('/article/edit', function(req, res){
  res.render('article/edit');
});

// 修改文章
main.get('/article/edit/:uri', article.load, function(req, res){
  res.locals.update = true;
  res.render('article/edit');
});

// 查看单篇文章
main.get('/article/:uri', article.load, function(req, res){
    res.render('article/article');
});

// 提交发表新文章
main.post('/article', article.create, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

// 提交修改文章
main.put('/article/:uri', article.update, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

// 静态文件服务
staticServer.enable('case sensitive routing');
staticServer.use(express.logger('dev'));
staticServer.use(express.compress());
staticServer.use(express.static(__dirname + '/public', {
  maxAge: 8.64e7 // 1天
}));

// app.enable('trust proxy');
app.use(express.vhost('weihub.com', main));
app.use(express.vhost('c.weihub.com', staticServer));

app.listen(conf.port, conf.host);
console.log('[%s] Express started listen on %s:%s', new Date().toUTCString(), conf.host, conf.port);
