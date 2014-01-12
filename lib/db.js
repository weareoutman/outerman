// redis db

var redis = require('redis'),
  config = require('../config');

module.exports = redis.createClient(config.redis_port, config.redis_host);