// Errors

var util = require('util')
  , fs = require('fs')
  , text = {
    400: 'Bad Request',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    413: 'Request Entity Too Large'
  };

function errors(err, req, res, next) {
  if (! (err instanceof Error)) {
    console.log(err);
    err = new ClientError(404);
  }
  var code = err.code || 500
    , page = 'error';
  res.locals.title = code >= 500 ? '系统出错了' : '请求出错了';
  res.locals.error = err;
  if (code >= 500) {
    fs.appendFile('log/error.log', util.format(
      '%s - - [%s] "%s %s HTTP/%s" %d "%s"\n',
      req.ip || '-',
      new Date().toUTCString(),
      req.method,
      req.originalUrl,
      req.httpVersion,
      code,
      (err.stack || '-').replace(/^ {4}/m, '').split('\n').slice(0, 2).join(' - ')
    ), function(err){
      console.log('log errors failed', err);
    });
  }
  res.status(code);
  if (req.query.hijax) {
    return res.renderHijax(page);
  }
  if (req.xhr && req.accepts('json')) {
    return res.send(err);
  }
  if (req.accepts('html')) {
    return res.render(page);
  }
  if (req.accepts('json')) {
    return res.send(err);
  }
  res.type('txt').send(JSON.stringify(err));
}

// Request Error
function RequestError(code) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = 'Request failed: ' + code;
  this.code = 500;
}
util.inherits(RequestError, Error);

// Client Error
function ClientError(code) {
  Error.call(this);
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = text[code] || 'Unknown';
  this.code = code;
}
util.inherits(ClientError, Error);

errors.RequestError = RequestError;
errors.ClientError = ClientError;

module.exports = errors;
