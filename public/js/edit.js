define(function(require, exports, module){
  var $ = require('jquery')
    , _ = require('underscore')
    , Backbone = require('backbone')
    , main = require('main')
    , Pagelet = require('pagelet')
    , has = require('has')
    , inputEvent = has('oninput') ? 'input' : 'change';

  var Article = Backbone.Model.extend({
    url: function(){
      return '/article' + (this.isNew() ? '' : '/' + this.datum.uri);
    },
    validate: function(attributes){
      if (! attributes.title) {
        return 'title';
      }
      if (! attributes.content) {
        return 'content';
      }
      if (! attributes.summary) {
        return 'summary';
      }
      if (! /^[\w\-]+$/.test(attributes.uri)) {
        return 'uri';
      }
      if (attributes.tags && ! /^[\w\-]+(\,[\w\-]+)*$/.test(attributes.tags)) {
        return 'tags';
      }
    },
    initialize: function(){}
  });

  var ArticleView = Backbone.View.extend({
    el: '#form-article',
    events: {
      'submit': 'submit',
      'invalid': 'invalid'
    },
    names: ['title', 'content', 'summary', 'tags', 'uri'],
    initialize: function(options){
      var that = this;
      this.$elements = {};
      _.each(this.names, function(name){
        that.$elements[name] = $(that.el[name]);
      });

      var attr = this.getAttibutes();
      if (options.datum.update) {
        attr.id = options.datum.id;
      }
      this.model = new Article(attr);
      this.model.datum = options.datum;


      this.$submit = $('#btn-save');
      this.listenTo(this.model, 'invalid', this.invalid);
    },
    invalid: function(model, error){
      var $elem = this.$elements[error]
        , group = $elem.parent();
      group.addClass('has-error has-feedback')
          .append('<span class="glyphicon glyphicon-warning-sign form-control-feedback" style="bottom:0"></span>');
      $elem.one(inputEvent, function(){
        group.removeClass('has-error has-feedback')
            .children('.form-control-feedback').remove();
      }).focus();
    },
    submit: function(e){
      var that = this;
      var xhr = this.model.save(this.getAttibutes(), {
        wait: true,
        beforeSend: function(){
          that.$submit.button('loading');
          _.each(that.$elements, function($elem){
            $elem.prop('readOnly', true);
          });
        }
      });
      if (! xhr) {
        return false;
      }
      xhr.done(function(){
        main.navigate('/article/' + that.model.attributes.uri);
      }).fail(function(res, error){
        if (error === 'abort') {
          return;
        }
        var msg;
        switch (res.status) {
          case 400:
            msg = '提交的数据有误！';
            break;
          case 403:
            msg = '你没有权限！';
            break;
          case 404:
            msg = '要更新的文章不存在！';
            break;
          case 409:
            msg = '链接名重复了！';
            break;
          default:
            msg = res.statusText || 'Unknow Error';
        }
        alert(msg);
      }).always(function(){
        that.$submit.button('reset');
        _.each(that.$elements, function($elem){
          $elem.prop('readOnly', false);
        });
      });
      app.collect(xhr);
      return false;
    },
    getAttibutes: function(){
      var attr = {}
        , that = this;
      _.each(this.names, function(name){
        attr[name] = that.$elements[name].val();
      });
      return attr;
    }
  });

  var view;
  var app = module.exports = Pagelet.factory({
    initialize: function(datum){
      view = new ArticleView({
        datum: datum
      });
    },
    destroy: function(){
      view.stopListening();
      this.clear();
    }
  });
});