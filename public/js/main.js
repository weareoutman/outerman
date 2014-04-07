require.config({
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
    , NProgress = require('nprogress')
    , Pagelet = require('pagelet')
    , has = require('has')
    , index = require('index');

  // Detect if the browser supports svg animation
  has.add('dom-createelementns', function(g, d){
    return has('dom') && has.isHostType(d, 'createElementNS');
  });
  has.add('svg-smil', function(g, d){
    return has('dom-createelementns') &&
        /SVG/.test(Object.prototype.toString.call(
        d.createElementNS('http://www.w3.org/2000/svg', 'animate')));
  });
  // Detect if the browser supports input event
  has.add('oninput', function(g){
    return 'oninput' in g;
  });
  // Detect if the browser supports history management
  has.add('history-state', function(g){
    return ('history' in g) && ('pushState' in history);
  });
  // Detect if the browser supports console
  has.add('console', function(g){
    return has.isHostType(window, 'console') &&
        has.isHostType(window.console, 'log');
  });
  if (! has('console')) {
    window.console = {
      log: function(){}
    };
  }

  var main = {}, current;
  module.exports = main;

  main.log = function(){
    window.console.log.apply(window.console, arguments);
  };

  main.setCurrent = function(pagelet){
    current = pagelet;
    return current;
  };

  var origin = location.origin ||
      location.protocol + '//' + location.host;

  // Set auth callback url
  function setAuthUrl() {
    // TODO: test IE8 if enable hashChange
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

  // Set active nav bar
  var navbar = $('#navbar').find('li[data-nav]');
  function setNavbar(nav) {
    navbar.removeClass('active');
    if (nav) {
      navbar.filter('[data-nav=' + nav + ']').addClass('active');
    }
  }

  // Enable hijax
  var enableHijax = has('history-state');

  // Intercept links
  if (enableHijax) {
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
  }

  var $win = $(window)
    , container = $('#container')
    , popping = true
    , hijaxReq;

  var Router = Backbone.Router.extend({
    routes: {
      '*path': 'any',
    },
    any: function(path){
      // TODO: test IE8
      path = path || '';
      hijax('/' + path + location.search);
    }
  });

  function navigate(frag) {
    if (! enableHijax) {
      location.href = frag;
      return;
    }
    popping = false;
    router.navigate(frag, {trigger: true});
  }

  function hijax(path) {
    var popped = popping;
    popping = true;
    NProgress.start();
    if (current) {
      current.destroy();
      current = null;
    }
    if (hijaxReq) {
      hijaxReq.abort();
    }
    hijaxReq = $.ajax({
      url: path,
      data: {
        hijax: 1
      },
      dataType: 'json'
    }).done(function(d){
      render(d, path, popped);
    }).fail(function(xhr, error){
      if (error === 'abort') {
        return;
      }
      if (xhr.responseJSON) {
        return render(xhr.responseJSON, path, popped);
      }
      main.log('unexpected error', error);
    }).always(function(){
      NProgress.done();
      hijaxReq = null;
    });
  }

  function render(d, path, popped) {
    document.title = d.title;
    container.html(d.html);
    setNavbar(d.nav);
    setAuthUrl();
    $('#navbar-collapse').removeClass('in');
    if (d.script) {
      require([].concat(d.script), function(pagelet){
        (current = pagelet).initialize(d.datum);
      });
    } else {
      current = Pagelet.defaults(path);
    }
    if (! popped) {
      // Scroll to top if not from popstate
      scrollTo(0, 0);
    }
    if (typeof window.ga === 'function') {
      window.ga('send', 'pageview', path);
    }
  }

  var router = new Router();
  if (enableHijax) {
    Backbone.history.start({
      pushState: true,
      hashChange: false,
      silent: true
    });
  }
  setAuthUrl();

  main.navigate = navigate;
});
