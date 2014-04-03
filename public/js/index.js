define(function(require, exports, module){
  exports.initialize = function(){
    if (document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect) {
      var img = new Image();
      img.src = 'http://weihub.com/images/run.svg';
      img.setAttribute('width', '100%');
      document.getElementById('running-car').appendChild(img);
    }
    return exports;
  };
  exports.destroy = function(){};
});