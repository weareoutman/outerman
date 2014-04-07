define(function(require, exports, module){
  var _ = require('underscore')
    , map = {};
  function Pagelet(){
    this.requests = [];
  }
  Pagelet.prototype.initialize = function(){};
  Pagelet.prototype.destroy = function(){};
  Pagelet.prototype.collect = function(xhr){
    var requests = this.requests;
    requests.push(xhr);
    xhr.always(function(){
      var index = _.indexOf(requests, xhr);
      if (index !== -1) {
        requests.splice(index, 1);
      }
    });
  };
  Pagelet.prototype.clear = function(){
    _.each(this.requests, function(xhr){
      xhr.abort();
    });
    this.requests = [];
  };
  Pagelet.defaults = function(path){
    var key = 'prefix-' + path;
    if (! map[key]) {
      map[key] = new Pagelet();
    }
    return map[key];
  };
  Pagelet.factory = function(options){
    return _.extend(new Pagelet(), options);
  };
  module.exports = Pagelet;
});