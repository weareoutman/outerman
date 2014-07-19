define(function(require, exports, module){
  var $ = require('jquery'), inited;
  function ready() {
    var wx = window.WeixinJSBridge;
    if (! (wx && wx.on && wx.invoke)) {
      return;
    }
    wx.on('menu:share:timeline', function(){
      var image = $('div.article-container').find('img')
        , s = image.prop('src')
        , w = image.prop('width')
        , h = image.prop('height');
      wx.invoke('shareTimeline', {
        img_url: s || 'http://weihub.com/images/code.png',
        img_width: w || 128,
        img_height: h || 128,
        link: location.toString(),
        title: document.title,
        desc: document.title.replace(' - WangShenwei.com', '')
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
