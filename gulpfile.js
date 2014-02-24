var gulp = require('gulp')
  // , fs = require('fs')
  , requirejs = require('requirejs')
  , crypto = require('crypto')
  , through = require('through2')
  , replace = require('gulp-replace')
  , PluginError = require('gulp-util/lib/PluginError');

gulp.task('watch', function(){
  gulp.watch(['public/js/main.js'], ['scripts']);
  gulp.watch(['public/css/style.css'], ['bust']);
});

gulp.task('scripts', function(){
  requirejs.optimize({
    "baseUrl": "public/js",
    "mainConfigFile": "public/js/main.js",
    "optimize": "uglify2",
    "preserveLicenseComments": false,
    "name": "main",
    "out": "public/js/main-built.js"
  }, function(out){
    console.log('requirejs optimized: ', out);
  }, function(err){
    console.warn('requirejs optimize js error: ', err);
  });
});

gulp.task('styles', function(){
  requirejs.optimize({
    "cssIn": "public/css/style.css",
    "out": "public/css/style-built.css"
  }, function(out){
    console.log('requirejs optimized: ', out);
  }, function(err){
    console.warn('requirejs optimize css error: ', err);
  });
});

function bustError() {
  var Factory = PluginError.bind.apply(PluginError, [].concat(null, 'bust', Array.prototype.slice.call(arguments)));
  return new Factory();
}

function bust() {
  function a(file, encoding, callback) {
    if (file.isNull()) {
      this.push(file);
      return callback();
    }
    if (file.isStream()) {
      return callback(bustError('Streaming not supported'));
    }
    var sha1 = crypto.createHash('sha1').update(file.contents).digest('hex').substr(0,10);
    gulp.src('views/layout.jade')
      .pipe(replace(new RegExp('\\b(bust=style)(?:\\.(\\w+))?\\b'), '$1.' + sha1))
      .pipe(gulp.dest('views'));
    return callback();
  }
  return through.obj(a);
}

gulp.task('bust', ['styles'], function(){
  gulp.src(['public/css/style-built.css'])
    .pipe(bust());
});

gulp.task('default', ['watch']);
