var requirejs = require('requirejs')
  , fs = require('fs')
  , crypto = require('crypto')
  , confList = ['main', 'style']
  , confPaths = confList.map(function(key){
    return 'tools/' + key + '-build.json';
  });

module.exports = function(grunt) {
  var confs = confPaths.map(grunt.file.readJSON);

  // Replace bust url args
  grunt.registerTask('bust', 'Replace the bust url arg', function(target){
    if (! target) {
      return grunt.fail.fatal('Need a target.');
    }
    var done = this.async()
      , path = 'views/layout.jade'
      , out = confs[confList.indexOf(target)].out
      , reg = new RegExp('\\b(bust=' + target + ')(?:\\.(\\w+))?\\b');
    fs.readFile(path, {encoding: 'utf8'}, function(err, text){
      if (err) {
        return grunt.fail.fatal(err);
      }
      var match = text.match(reg);
      if (match) {
        fs.readFile(out, function(err, data){
          if (err) {
            return grunt.fail.fatal(err);
          }
          var sha1 = crypto.createHash('sha1').update(data).digest('hex').substr(0,10);
          if (match[2] === sha1) {
            grunt.log.ok('Bust of "' + target + '" not modified.');
            return done();
          }
          text = text.replace(reg, '$1.' + sha1);
          fs.writeFile(path, text, function(err){
            if (err) {
              return grunt.fail.fatal(err);
            }
            grunt.log.ok('Bust of "' + target + '" replaced.');
            done();
          });
        });
      } else {
        grunt.log.ok('Bust of "' + target + '" not found.');
        done();
      }
    });
  });

  // Run the r.js build script
  grunt.registerTask('build', 'Run the r.js build script', function(target){
    var conf;
    if (target) {
      conf = confs[confList.indexOf(target)];
      if (! conf) {
        return grunt.fail.fatal('Config not found "' + target + '".');
      }
      conf = [conf];
    } else {
      conf = confs;
    }
    var done = this.async()
      , left = conf.length;
    function one() {
      left -= 1;
      if (left <= 0) {
        done();
      }
    }
    conf.forEach(function(conf, index){
      requirejs.optimize(conf, function(out){
        var name = (target || confList[index]);
        grunt.log.writeln(out);
        grunt.log.ok('Build "' + name + '" ok.');
        grunt.task.run(['bust:' + name]);
        one();
      }, function(err){
        grunt.fail.fatal(err);
      });
    });
  });
};