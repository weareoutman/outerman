define(function(require, exports, module){
  var Pagelet = require('pagelet')
    , has = require('has');
  module.exports = Pagelet.factory({
    initialize: function(){
      if (has('svg-smil')) {
        var img = new Image();
        img.src = 'http://weihub.com/images/run.svg';
        img.setAttribute('width', '100%');
        document.getElementById('running-car').appendChild(img);
      }
    }
  });
});