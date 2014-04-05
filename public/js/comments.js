define(function(require, exports, module){
  var $ = require('jquery')
    , _ = require('underscore')
    , Pagelet = require('pagelet');
  module.exports = _.extend(new Pagelet(), {
    initialize: function(){
      var btns = $('#comments').find('a[data-action=delete]');
      btns.click(function(){
        if (confirm('确认删除这条评论吗？')) {
          var btn = $(this)
            , id = btn.data('id')
            , uri = btn.data('uri')
            , tr = btn.closest('tr');
          $.ajax({
            url: '/article/' + uri + '/comment/' + id,
            type: 'DELETE',
            dataType: 'json'
          }).done(function(d){
            tr.remove();
          }).fail(function(xhr, status){
            alert(status);
          });
        }
      });
      return this;
    }
  });
});