var express = require('express')
  , multipart = require('connect-multiparty')
  , Promise = require('bluebird')
  , fs = require('fs')
  , path = require('path')
  , conf = require('../config')
  , UserController = require('./user')
  , unlink = Promise.promisify(fs.unlink, fs)
  , rename = Promise.promisify(fs.rename, fs)
  , router = express.Router()
  , uploadsDir = __dirname + '/../uploads'
  , allowTypes = ['image/jpeg', 'image/png'];

fs.exists(uploadsDir, function(exists){
  if (! exists) {
    fs.mkdir(uploadsDir, 0755, function(err){
      if (err) {
        console.log(err);
      }
    });
  }
});

exports.index = router;

router.use(UserController.restrict);

router.route('/')

  .get(function(req, res){
    res.locals.title = '上传' + conf.title_suffix;
    res.locals.nav = 'upload';
    res.renderHijax('upload/index');
  })

  .post(multipart({
    maxFields: 100,
    maxFilesSize: 1e7 // 10MB
  }), function(req, res, next){
    var files = [].concat(req.files.files)
      , tasks = [];
    files.forEach(function(file){
      if (! file) {
        return;
      }
      if (allowTypes.indexOf(file.type) !== -1) {
        tasks.push(rename(file.path, uploadsDir + '/' + path.basename(file.path)));
      } else {
        tasks.push(unlink(file.path));
      }
    });
    return Promise.all(tasks)
    .then(function(){
      res.redirect('http://weihub.com/uploads');
    }).catch(next);
  });