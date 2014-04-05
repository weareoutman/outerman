define(function(require, exports, module){
  var Pagelet = require('pagelet')
    , _ = require('underscore')
    , has = require('has');
  module.exports = _.extend(new Pagelet(), {
    initialize: function(){
      if (has('svg-smil')) {
        var img = new Image();
        img.src = 'http://weihub.com/images/run.svg';
        img.setAttribute('width', '100%');
        document.getElementById('running-car').appendChild(img);
      }
      return this;
    }
  });
});