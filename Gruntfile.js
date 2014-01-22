var requirejs = require('requirejs')
  , fs = require('fs')
  , confList = ['main', 'style']
  , confPaths = confList.map(function(key){
    return 'tools/' + key + '-build.json';
  });

module.exports = function(grunt) {
  var confs = confPaths.map(grunt.file.readJSON);

  // Replace bust url args
  grunt.registerTask('bust', 'Replace the bust url arg', function(target){
    console.log('--- bust now');
    var path = 'views/layout.jade'
      , text = fs.readFileSync(path).toString('utf8')
      , reg = new RegExp('\\b(bust=' + target + ')(\\.\\w+)?\\b');
    if (reg.test(text)) {
      text = text.replace(reg, '$1.' + Date.now().toString(36));
      fs.writeFileSync(path, text);
      grunt.log.ok('Bust of "' + target + '" replaced.');
    } else {
      grunt.log.ok('Bust of "' + target + '" not found.');
    }
  });

  // Run the r.js build script
  grunt.registerTask('build', 'Run the r.js build script', function(target){
    if (target) {
      confs = confs[confList.indexOf(target)];
      if (! confs) {
        grunt.fail.fatal('Config not found "' + target + '".');
        return;
      }
      confs = [confs];
    }
    var done = this.async()
      , left = confs.length;
    function one() {
      left -= 1;
      if (left <= 0) {
        done();
      }
    }
    confs.forEach(function(conf, index){
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