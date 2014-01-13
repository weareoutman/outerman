// router user
/*
SET user:cursor [next_id]
HMSET user:id:[id] {
  id: [id],
  email: [email],
  name: [name],
  # pswd: [pswd],
  # salt: [salt],
  create_time: [create_time],
  last_login_time: [last_login_time],
  from: [from],
  is_admin: [is_admin]
}
HMSET user:auth:[id] {
  pswd: [pswd],
  salt: [salt],
  sign: [sign],
  sign_salt: [sign_salt],
  token: [token],
  expires_in: [expire_id]
}
SET user:email:[email] [id]
SET user:name:[name] [id]
LPUSH user:list [id]
SADD user:from:[from] [id]
ZADD user:last_login_time [last_login_time] [id]
*/

var db = require('../lib/db'),
  _ = require('underscore'),
  KEYS = {
    CURSOR: 'user:cursor',
    LIST: 'user:list',
    LAST_LOGIN_TIME: 'user:last_login_time',
    id2user: function(id) {
      return 'user:id:' + id;
    },
    id2auth: function(id){
      return 'user:auth:' + id;
    },
    email2id: function(email) {
      return 'user:email:' + email;
    },
    name2id: function(name) {
      return 'user:name:' + name;
    },
    from2id: function(from) {
      return 'user:from:' + from;
    }
  };
