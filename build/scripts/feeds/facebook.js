'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.client = undefined;
exports.facebookFeed = facebookFeed;

var _fb = require('fb');

var client = exports.client = new _fb.Facebook({
  version: 'v2.8',
  appId: '237903663330575',
  appSecret: '7f1bd716371355156e755beee0ef7854'
});

function prepareMessage(obj) {
  var message = '';

  if (obj.message) {
    var preparedMessage = obj.message.split(' ').slice(0, 10).join(' ');
    message = preparedMessage + ' ...';
  } else if (obj.story) {
    message = obj.story;
  }

  return message.replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
}

// client.setAccessToken('EAADYX0NX9Q8BADQIw76HXdmoPg8DVmPvItl004vs6J9S4ttyWNVrZC57YrBqfABU4TUkEvrZAmLZC7fVFNWbKBAXFH7yPCPIDZBlD104jYOLTcM1y3gbW2fVysmA5Nv2AxNxwj630lB4ER7Tq4LMqtwft1kA4hsZD');

function malformStream(stream) {
  return stream.map(function (obj) {
    return {
      type: 'facebook',
      text: prepareMessage(obj),
      createdAt: new Date(obj.created_time),
      link: 'https://facebook.com/' + obj.id,
      origin: obj
    };
  });
}

function facebookFeed() {
  return new Promise(function (resolve, reject) {
    client.api('rensource/feed', {
      access_token: '1421693634736130|BDbt6t0Y6bsHX4jdsmjMfz97Olg'
    }, function (res) {
      if (!res || res.error) {
        return reject(res.error);
      }

      var preparedStream = malformStream(res.data);
      return resolve(preparedStream);
    });
  });
}

// 1421693634736130|BDbt6t0Y6bsHX4jdsmjMfz97Olg