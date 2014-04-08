define(function(require, exports, module){
  var $ = require('jquery'), inited;
  function ready() {
    var wx = window.WeixinJSBridge;
    if (! (wx && wx.on && wx.invoke)) {
      return;
    }
    wx.on('menu:share:timeline', function(){
      wx.invoke('shareTimeline', {
        img_url: 'http://weihub.com/images/code.png',
        img_width: 128,
        img_height: 128,
        link: location.toString(),
        title: document.title.replace(' - Wang Shenwei', ''),
        desc: document.title
      });
    });
  }
  module.exports = function(){
    if (inited) {
      return;
    }
    inited = true;
    if (window.WeixinJSBridge && window.WeixinJSBridge.invoke) {
      ready();
    } else {
      $(document).one('WeixinJSBridgeReady', ready);
    }
  };
});