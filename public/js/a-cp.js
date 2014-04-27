require.config({
  paths: {
    clockpicker: '../clockpicker/bootstrap-clockpicker.min'
  }
});
define(function(require, exports, module){
  var $ = require('jquery')
    , Pagelet = require('pagelet');
  module.exports = Pagelet.factory({
    initialize: function(datum){
      $('.article-container').append('<link rel="stylesheet" type="text/css" href="http://weihub.com/clockpicker/bootstrap-clockpicker.min.css">');
      require(['clockpicker'], function(){
        $('#cp-demo').clockpicker()
          .find('input').prop('readOnly', true);
      });
    },
    destroy: function(){
      $('#cp-demo').clockpicker('remove');
    }
  });
});