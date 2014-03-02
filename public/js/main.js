require.config({
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
require(['jquery', 'bootstrap'/*, 'backbone'*/], function($){
  var path = encodeURIComponent(location.pathname + location.search);
  $('#top-sign-in').attr('href', '/auth?path=' + path);
  $('#top-sign-out').attr('href', '/signout?path=' + path);
});