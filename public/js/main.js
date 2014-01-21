require.config({
  baseUrl: 'http://c.weihub.com/js/',
  paths: {
    jquery: 'jquery-1.10.2'/*,
    jquery: 'jquery-1.10.2.min',
    bootstrap: 'bootstrap.min',
    backbone: 'backbone-min',
    underscore: 'underscore-min'*/
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
require(['bootstrap', 'backbone']);