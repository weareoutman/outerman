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
require(['bootstrap', 'backbone']);