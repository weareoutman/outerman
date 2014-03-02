// redis db

var redis = require('redis')
  , Promise = require('bluebird')
  , config = require('../config');

// Wrapped with bluebird promise
module.exports = Promise.promisifyAll(redis.createClient(config.redis_port, config.redis_host));