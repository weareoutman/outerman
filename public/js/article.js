define(function(require, exports, module){
  var $ = require('jquery')
    , _ = require('underscore')
    , Backbone = require('backbone')
    , main = require('main')
    , Pagelet = require('pagelet')
    , has = require('has')
    , inputEvent = has('oninput') ? 'input' : 'change';

  var uri;
  var Comment = Backbone.Model.extend({
    initialize: function(){}
  });
  var CommentList = Backbone.Collection.extend({
    model: Comment,
    url: function(){
      return '/article/' + uri + '/comment';
    }
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
  var AppView = Backbone.View.extend({
    el: '#comments',
    createOnClick: function(){
      var that = this
        , content = $.trim(this.$text.val())
        , user = $.trim(this.$user.val() || '');
      if (! content) {
        var textParent = this.$text.parent();
        textParent.addClass('has-error has-feedback')
            .append('<span class="glyphicon glyphicon-warning-sign form-control-feedback" style="bottom:0"></span>');
        this.$text.one(inputEvent, function(){
          textParent.removeClass('has-error has-feedback')
              .children('.form-control-feedback').remove();
        }).focus();
        return;
      }
      if (this.$user.length > 0 && ! user) {
        var userParent = this.$user.parent();
        userParent.addClass('has-error has-feedback')
            .append('<span class="glyphicon glyphicon-warning-sign form-control-feedback" style="top:0"></span>');
        this.$user.one(inputEvent, function(){
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
          scrollTo(0, 99999);
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
      var that = this;
      this.listenTo(comments, 'add', this.addOne);
      this.listenTo(comments, 'reset', this.addAll);
      this.listenTo(comments, 'all', this.render);
      this.$list = $('#comment-list');
      this.$text = $('#comment-text');
      this.$user = $('#comment-user');
      this.$submit = $('#comment-submit');
      this.$submit.click(function(){
        that.createOnClick();
      });
      this.$text.one('focus', function(){
        $('#comment-btns').removeClass('hidden');
      });
      comments.fetch({
        success: function(){
          // alert('success');
          that.updateMinutes();
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
      $('#comment-badge').html(comments.length || '');
    },
    addOne: function(comment){
      var view = new CommentView({model: comment});
      this.$list.append(view.render().el);
      view.$el.prop('id', 'comment-' + comment.id);
    },
    addAll: function(){
      comments.each(this.addOne, this);
    },
    updateMinutes: function(){
      var that = this;
      this._updateMinutesTimer = setInterval(function(){
        var spans = that.$list.find('span[data-minutes]');
        spans.each(function(){
          var span = $(this)
            , minutes = + span.data('minutes') + 1;
          if (minutes < 45) {
            span.html(minutes + '分钟前');
            span.data('minutes', minutes);
          } else {
            if (minutes < 90) {
              span.html('1小时前');
            }
            span.removeAttr('data-minutes');
            span.removeData('minutes');
          }
        });
      }, 6e4);
    },
    stopUpdateMinutes: function(){
      if (this._updateMinutesTimer) {
        clearInterval(this._updateMinutesTimer);
        delete this._updateMinutesTimer;
      }
    }
  });

  function toDeleteArticle() {
    if (confirm('确认删除这篇文章吗？')) {
      $.ajax({
        url: '/article/' + uri,
        type: 'DELETE',
        dataType: 'json'
      }).done(function(d){
        main.navigate('/article');
      }).fail(function(xhr, status){
        alert(status);
      });
    }
  }

  var btnDelete = $('#btn-delete');

  var app, comments;

  module.exports = Pagelet.factory({
    initialize: function(datum){
      uri = datum.uri;
      comments = new CommentList();
      app = new AppView();
      btnDelete.click(toDeleteArticle);
      return this;
    },
    destroy: function(){
      app.stopListening();
      app.stopUpdateMinutes();
      comments.stopListening();
      btnDelete.off('click');
    }
  });

});
