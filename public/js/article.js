require(['main'], function(){
  require(['jquery', 'underscore', 'backbone'], function($, _, Backbone){
    var Comment = Backbone.Model.extend({
      initialize: function(){}
    });
    var CommentList = Backbone.Collection.extend({
      model: Comment,
      url: window.location.pathname + '/comment'
    });
    var CommentView = Backbone.View.extend({
      tagName: 'li',
      template: _.template($('#tpl-comment').html()),
      render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.addClass('media');
        return this;
      }
    });
    var comments = new CommentList();
    var AppView = Backbone.View.extend({
      el: $('#comments'),
      events: {
        'click #comment-submit': 'createOnClick'
      },
      createOnClick: function(){
        var that = this
          , content = $.trim(this.$text.val())
          , user = $.trim(this.$user.val() || '');
        if (! content) {
          var textParent = this.$text.parent();
          textParent.addClass('has-error has-feedback')
              .append('<span class="glyphicon glyphicon-warning-sign form-control-feedback" style="bottom:0"></span>');
          this.$text.one('change input', function(){
            textParent.removeClass('has-error has-feedback')
                .children('.form-control-feedback').remove();
          }).focus();
          return;
        }
        if (this.$user.length > 0 && ! user) {
          var userParent = this.$user.parent();
          userParent.addClass('has-error has-feedback')
              .append('<span class="glyphicon glyphicon-warning-sign form-control-feedback" style="top:0"></span>');
          this.$user.one('change input', function(){
            userParent.removeClass('has-error has-feedback')
                .children('.form-control-feedback').remove();
          }).focus();
          return;
        }
        this.$submit.prop('disabled', true);
        this.$text.prop('readOnly', true);
        this.$user.prop('readOnly', true);
        comments.create({
          content: content,
          html: content,
          user: user
        }, {
          wait: true,
          success: function(){
            that.$text.val('');
            window.scrollTo(window.scrollX || 0, 99999);
          },
          error: function(col, res){
            var msg;
            switch (res.status) {
              case 403:
                msg = '你消停点！';
                break;
              case 409:
                msg = '你是复读机吗？';
                break;
              case 413:
                msg = '你的话太多了！';
                break;
              default:
                msg = res.statusText || 'Unknow Error';
            }
            alert(msg);
          },
          complete: function(){
            that.$text.prop('readOnly', false);
            that.$user.prop('readOnly', false);
            that.$submit.prop('disabled', false);
          }
        });
      },
      initialize: function(){
        this.listenTo(comments, 'add', this.addOne);
        this.listenTo(comments, 'reset', this.addAll);
        this.listenTo(comments, 'all', this.render);
        this.$list = $('#comment-list');
        this.$text = $('#comment-text');
        this.$user = $('#comment-user');
        this.$submit = $('#comment-submit');
        this.$text.one('focus', function(){
          $('#comment-btns').removeClass('hidden');
        });
        comments.fetch({
          success: function(){
            // alert('success');
          },
          error: function(col, res){
            // alert(res.statusText || 'Unknow Error');
          },
          complete: function(){
            $('#comment-loading').hide();
          }
        });
      },
      render: function(){
        var length = comments.length;
        $('#comment-badge').html(length || '').toggleClass('hidden', length === 0);
      },
      addOne: function(comment){
        var view = new CommentView({model: comment});
        this.$list.append(view.render().el);
        view.$el.prop('id', 'comment-' + comment.id);
      },
      addAll: function(){
        comments.each(this.addOne, this);
      }
    });
    var app = new AppView();

    $('#btn-delete').click(function(){
      if (confirm('确认删除这篇文章吗？')) {
        $.ajax({
          url: window.location.pathname,
          type: 'DELETE',
          dataType: 'json'
        }).done(function(d){
          window.location.href = '/article';
        }).fail(function(xhr, status){
          alert(status);
        });
      }
    });
  });
});