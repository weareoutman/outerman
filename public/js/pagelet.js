define(function(require, exports, module){
  var map = {};
  function Pagelet(){}
  Pagelet.prototype.initialize = function(){ return this; };
  Pagelet.prototype.destroy = function(){};
  Pagelet.defaults = function(path){
    var key = 'prefix-' + path;
    if (! map[key]) {
      map[key] = new Pagelet();
    }
    return map[key];
  };
  module.exports = Pagelet;
});