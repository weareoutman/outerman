define(function(require, exports, module){
  var has = require('has');
  // Detect if the browser supports JSON
  has.add('json', function(g){
    return typeof JSON === 'object' &&
        typeof JSON.parse === 'function' &&
        typeof JSON.stringify === 'function';
  });
  // Detect if the browser supports localStorage and sessionStorage
  function hasStorage(g, storage) {
    var bool = has.isHostType(g, storage);
    if (bool) {
      try {
        var key = 'has-storage'
          , val = g[storage].getItem(key);
        g[storage].setItem(key, key);
        if (val !== null) {
          g[storage].setItem(key, val);
        } else {
          g[storage].removeItem(key);
        }
      } catch(e) {
        bool = false;
      }
    }
    return bool;
  }
  has.add('storage', function(g){
    return has('json') && hasStorage(g, 'localStorage') &&
        hasStorage(g, 'sessionStorage');
  });

  function defineStorage(name) {
    var storage = window[name];
    exports[name] = {
      getItem: function(key) {
        var value = storage.getItem(key);
        if (typeof value !== 'string' || value === '') {
          value = 'null';
        }
        return JSON.parse(value);
      },
      setItem: function(key, value) {
        return storage.setItem(key, JSON.stringify(value));
      },
      removeItem: function(key) {
        return storage.removeItem(key);
      },
      clear: function() {
        return storage.clear();
      }
    };
  }

  if (has('storage')) {
    exports.supported = true;
    defineStorage('localStorage');
    defineStorage('sessionStorage');
  } else {
    exports.supported = false;
  }
});