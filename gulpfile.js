var gulp = require('gulp')
  , _ = require('underscore')
  , requirejs = require('requirejs')
  , crypto = require('crypto')
  , through = require('through2')
  , replace = require('gulp-replace');

var confList = ['main', 'style']
  , confs = {};
confList.forEach(function(name){
  confs[name] = require('./tools/' + name + '-build.json');
});

var scripts = ['article', 'comments', 'edit'];

_.each(confs, function(conf, name){
  gulp.task('rjs:' + name, function(){
    requirejs.optimize(conf, function(out){
      console.log('requirejs optimized: ', out);
    }, function(err){
      console.warn('requirejs optimize js error: ', err);
    });
  });
  gulp.task('bust:' + name, ['rjs:' + name], function(){
    gulp.src([conf.out]).pipe(bust(name));
  });
});

scripts.forEach(function(name){
  gulp.task('bust:' + name, function(){
    gulp.src(['public/js/' + name + '.js']).pipe(bust(name));
  });
});

gulp.task('watch', function(){
  _.each(confs, function(conf, name){
    var path = conf.cssIn;
    if (! path) {
      path = conf.baseUrl + '/' + name + '.js';
    }
    var paths = [path];
    if (conf.related) {
      paths = paths.concat(conf.related);
    }
    gulp.watch(paths, ['bust:' + name]);
  });
  scripts.forEach(function(name){
    gulp.watch(['public/js/' + name + '.js'], ['bust:' + name]);
  });
});

function bust(name) {
  function a(file, encoding, callback) {
    if (file.isNull()) {
      this.push(file);
      return callback();
    }
    if (file.isStream()) {
      return callback(new Error('Streaming not supported'));
    }
    var sha1 = crypto.createHash('sha1').update(file.contents).digest('hex').substr(0,10);
    gulp.src('views/layout.jade')
      .pipe(replace(new RegExp('\\b(' + name + '(?:-built)?\\.(?:js|css)\\?bust=)(?:\\w+)?'), '$1' + sha1))
      .pipe(gulp.dest('views'));
    return callback();
  }
  return through.obj(a);
}

gulp.task('default', ['watch']);
