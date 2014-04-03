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