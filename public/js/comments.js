define(function(require, exports, module){
  var $ = require('jquery')
    , Pagelet = require('pagelet')
    , btns;
  module.exports = Pagelet.factory({
    initialize: function(){
      var app = this;
      btns = $('#comments').find('a[data-action=delete]');
      btns.click(function(){
        if (confirm('确认删除这条评论吗？')) {
          var btn = $(this)
            , id = btn.data('id')
            , uri = btn.data('uri')
            , tr = btn.closest('tr');
          var xhr = $.ajax({
            url: '/article/' + uri + '/comment/' + id,
            type: 'DELETE',
            dataType: 'json'
          }).done(function(d){
            tr.remove();
          }).fail(function(res, error){
            if (error === 'abort') {
              return;
            }
            alert(error);
          });
          app.collect(xhr);
        }
      });
    },
    destroy: function(){
      btns.off('click');
      this.clear();
    }
  });
});