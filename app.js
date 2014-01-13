var express = require('express')
  , app = express()
  , article = require('./routes/article')
  , auth = require('./routes/auth')
  , config = require('./config');

// app.enable('trust proxy');
app.enable('case sensitive routing');

app.use(express.logger('dev'));
app.use(express.compress());
// app.use(express.cookieParser());
// app.use(express.bodyParser());
app.use(express.json());
app.use(express.urlencoded());
// app.use(express.multipart());

app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.get('/', function(req, res){
  res.render('index');
});

app.get('/auth/weibo', auth.weibo, function(req, res){
  res.send(res.locals.token);
});

// 文章列表
app.get('/article', article.list, function(req, res){
  res.render('article/list');
});

// 发表新文章
app.get('/article/edit', function(req, res){
  res.render('article/edit');
});

// 修改文章
app.get('/article/edit/:uri', article.load, function(req, res){
  res.locals.update = true;
  res.render('article/edit');
});

// 查看单篇文章
app.get('/article/:uri', article.load, function(req, res){
    res.render('article/article');
});

// 提交发表新文章
app.post('/article', article.create, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

// 提交修改文章
app.put('/article/:uri', article.update, function(req, res){
  res.redirect('/article/' + res.locals.article.uri);
});

/*app.get('/hello.txt', function(req, res){
  var body = 'Hello World';
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
});*/

app.listen(config.port, config.host);
console.log('[%s] Express started listen on %s:%s', new Date().toUTCString(), config.host, config.port);
