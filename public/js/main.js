require(['jquery', 'bootstrap'/*, 'backbone'*/], function($){
  var path = location.pathname
    , search = location.search;
  if (/^\/auth($|\/)/.test(location.pathname)) {
    path = '/';
    search = '';
  }
  path = encodeURIComponent(path + search);
  $('#top-sign-in').attr('href', '/auth?path=' + path);
  $('#top-sign-out').attr('href', '/signout?path=' + path);
});