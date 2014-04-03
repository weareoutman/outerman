require.config({
  baseUrl: 'http://weihub.com/js/',
  paths: {
    jquery: 'jquery-1.10.2'
  },
  shim: {
    'bootstrap': ['jquery'],
    backbone: {
      deps: ['underscore', 'jquery'],
      exports: 'Backbone'
    },
    underscore: {
      exports: '_'
    }
  }
});
define(function(require, exports, module){
  var $ = require('jquery')
    , bs = require('bootstrap')
    , Backbone = require('backbone')
    , NProgress = require('nprogress');

  window.console = window.console || {};
  if (! window.console.log) {
    window.console.log = function(){};
  }

  var canPushState = !! history.pushState;

  var origin = location.origin ||
      location.protocol + '//' + location.host;

  function setAuthUrl() {
    // TODO: test IE8
    var path = location.pathname
      , search = location.search;
    if (/^\/auth($|\/)/.test(location.pathname)) {
      path = '/';
      search = '';
    }
    path = encodeURIComponent(path + search);
    $('#top-sign-in').attr('href', '/auth?path=' + path);
    $('#top-sign-out').attr('href', '/signout?path=' + path);
  }

  var navbar = $('#navbar').find('li[data-nav]');
  function setNavbar(nav) {
    navbar.removeClass('active');
    if (nav) {
      navbar.filter('[data-nav=' + nav + ']').addClass('active');
    }
  }

  $(document).on('click', 'a.hijax', function(e){
    if (e.ctrlKey || e.metaKey) {
      return;
    }
    e.preventDefault();
    var frag = this.href;
    if (frag.indexOf(origin) === 0) {
      frag = frag.substr(origin.length);
    }
    navigate(frag);
  });

  var container = $('#container');

  var Router = Backbone.Router.extend({
    routes: {
      '*path': 'any',
    },
    any: function(path){
      // TODO: test IE8
      path = path || "";
      var jump = _jump;
      _jump = false;
      hijax('/' + path + location.search, jump);
    }
  });

  var _jump, _state = {};
  var $win = $(window);
  function navigate(frag) {
    _jump = true;
    if (canPushState) {
      history.replaceState({
        x: $win.scrollLeft(),
        y: $win.scrollTop()
      }, document.title, location.toString());
      console.log('replaceState', history.state.x, history.state.y);
    }
    app.navigate(frag, {trigger: true});
  }

  function hijax(path, jump) {
    NProgress.start();
    if (exports.current) {
      exports.current.destroy();
      exports.current = null;
    }
    $.ajax({
      url: path,
      data: {
        hijax: 1
      },
      dataType: 'json'
    }).done(function(d){
      scrollTo(0, 0);
      document.title = d.title;
      container.html(d.html);
      setNavbar(d.nav);
      if (d.script) {
        require([].concat(d.script), function(script){
          exports.current = script.initialize(d.datum);
          /*if (! jump) {
            console.log(exports.current.pageXOffset || 0, exports.current.pageYOffset || 0);
            scrollTo(exports.current.pageXOffset || 0, exports.current.pageYOffset || 0);
          }*/
        });
      }
      console.log('scrollTo', _x, _y);
      scrollTo(_x, _y);
      _x = _y = 0;
      setAuthUrl();
    }).always(function(){
      NProgress.done();
    });
    // TODO: fail
  }

  /*var $win = $(window).scroll(function(){
    if (exports.current) {
      exports.current.pageXOffset = $win.scrollLeft();
      exports.current.pageYOffset = $win.scrollTop();
    }
  });*/

  var app = new Router();
  Backbone.history.start({
    pushState: true,
    silent: true
  });
  setAuthUrl();

  var _x = 0, _y = 0;
  var _a = 0, _b = 0;
  window.onpopstate = function(e){
    if (e.state) {
      console.log('on popstate', e.state, e.state === history.state);
      if (! e.state.hasOwnProperty('x')) {
        _x = _a;
        _y = _b;
      } else {
        _x = e.state.x;
        _y = e.state.y;
        delete history.state.x;
        delete history.state.y;
        history.replaceState({}, document.title, location.toString());
      }
      _a = $win.scrollLeft();
      _b = $win.scrollTop();
      console.log('after popstate', history.state);
    }
  };

  app.on('route', function(){
    console.log('on route');
  });

  exports.navigate = navigate;
  // exports.Pagelet = Pagelet;
});
