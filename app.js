var express = require('express')
  , fs = require('fs')
  , Promise = require('bluebird')
  , _ = require('underscore')
  , moment = require('moment')
  , AuthController = require('./controllers/auth')
  , UserController = require('./controllers/user')
  , ArticleController = require('./controllers/article')
  , ArticleModel = require('./models/article')
  , db = require('./lib/db')
  , errors = require('./lib/errors')
  , ClientError = errors.ClientError
  , conf = require('./config')
  , app = express()
  , main = express()
  , mainLog = fs.createWriteStream('./log/main.log', {flags: 'a'})
  , staticLog = fs.createWriteStream('./log/static.log', {flags: 'a'})
  , dev = app.get('env') === 'development'
  , format = 'YYYY/MM/DD HH:mm:ss';

var startedAt = moment().format(format);

var RedisStore = require('connect-redis')(express);

main.locals.DEV = dev;

main.enable('case sensitive routing');

// log
var logFormat = ':remote-addr - - [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" ":req[X-Forwarded-For]"';
if (dev) {
  logFormat = 'dev';
  Promise.longStackTraces();
  // main.locals.pretty = true;
}
main.use(express.logger({
  format: logFormat,
  stream: mainLog
}));

moment.lang('zh-cn');

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

// Hijax render
main.use(function(req, res, next){
  res.renderHijax = function(view){
    if (req.query.hijax) {
      res.render(view + '-raw', function(err, html){
        if (err) {
          throw err;
        }
        var data = _.pick(res.locals, ['title', 'nav', 'script', 'datum', 'error']);
        data.html = html;
        // data.originalUrl = req.originalUrl;
        res.send(data);
      });
    } else {
      res.render(view);
    }
  };
  next();
});

main.set('views', __dirname + '/views');
main.set('view engine', 'jade');

main.get('/', function(req, res, next){
  ArticleModel.list()
  .then(function(list){
    res.locals.title = '你好，世界，我是王沈伟';
    res.locals.script = 'index';
    res.locals.articleList = list;
    res.renderHijax('index');
  }).catch(next);
});

// 文章
ArticleController.use(main);

// 登录/验证
AuthController.use(main);

main.get('/robots.txt', function(req, res){
  res.sendfile(__dirname + '/robots.txt', {
    maxAge: 8.64e7 // 1天
  });
});

main.get('/README', function(req, res){
  res.sendfile(__dirname + '/README.md');
});

main.get('/thanks', function(req, res){
  res.locals.title = 'Thanks to them' + conf.title_suffix;
  res.renderHijax('thanks');
});

main.get('/uptime', function(req, res){
  var usage = process.memoryUsage()
    , duration = moment.duration(process.uptime() * 1e3)
    , uptime = []
    , days = Math.floor(duration.asDays())
    , hours = duration.hours()
    , minutes = duration.minutes()
    , seconds = duration.seconds();
  if (days > 0) {
    uptime.push(days + 'd');
  }
  if (hours > 0 || days > 0) {
    uptime.push(hours + 'h');
  }
  if (minutes > 0 || hours > 0 || days > 0) {
    uptime.push(minutes + 'm');
  }
  uptime.push(seconds + 's');
  usage.startedAt = startedAt;
  usage.now = moment().format(format);
  usage.uptime = uptime.join(' ');
  res.send(usage);
});

// Google site verification
/*main.get('/google040d868833adfa0a.html', function(req, res){
  res.send('google-site-verification: google040d868833adfa0a.html');
});*/

// 404
main.use(function(req, res, next){
  next(new ClientError(404));
});

// Error handling
main.use(errors);

// 静态文件服务
var staticServer = express();
staticServer.enable('case sensitive routing');
staticServer.use(express.logger({
  format: logFormat,
  stream: staticLog
}));
staticServer.use(express.compress());
// @font-face access control
staticServer.use(function(req, res, next){
  if (req.headers.origin) {
    res.header('Access-Control-Allow-Origin', 'http://wangshenwei.com');
    if (req.method === 'OPTIONS') {
      res.header('Access-Control-Allow-Methods', 'GET');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.header('Access-Control-Allow-Max-Age', '2592000');
      return res.send(200);
    }
  }
  next();
});
staticServer.use(express.static(__dirname + '/public', {
  maxAge: dev ? 0 : 2.592e9 // 30天
}));

var wwwServer = express();
wwwServer.all('*', function(req, res){
  res.redirect(301, 'http://wangshenwei.com' + req.originalUrl);
});

// app.enable('trust proxy');
app.use(express.vhost('wangshenwei.com', main));
app.use(express.vhost('weihub.com', staticServer));
app.use(express.vhost('www.wangshenwei.com', wwwServer));

app.listen(conf.port, conf.host);
console.log('[%s] Express started listen on %s:%s, in %s mode',
    startedAt, conf.host, conf.port, app.get('env'));
