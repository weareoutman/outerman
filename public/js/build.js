({
  baseUrl: '.',
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
  },
  optimize: 'uglify2',
  name: 'main',
  out: 'main-built.js'
})