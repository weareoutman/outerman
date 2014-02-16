// OAUTH api

var list = ['weibo', 'qq', 'github', 'instagram'];

exports.list = list;

list.forEach(function(from){
  exports[from] = require('./' + from);
});
