'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.accessToken = exports.userId = undefined;
exports.instagramFeed = instagramFeed;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * When the integration is failing, please check for a valid accessToken or
 * generate a new one on the following url: http://instagram.pixelunion.net/
 */

var apiRoot = 'https://api.instagram.com/v1';
var userId = exports.userId = '4185757212';
var accessToken = exports.accessToken = '4185757212.1677ed0.bd0cbc99e48946d48b9f5c479deb25d8';

function generateDate(secs) {
  var t = new Date(1970, 0, 1);
  t.setSeconds(secs);
  return t;
}

function malformStream(str) {
  return str.map(function (obj) {
    return {
      type: 'instagram',
      image: obj.images.standard_resolution.url,
      text: obj.caption ? obj.caption.text : '',
      createdAt: generateDate(obj.created_time),
      link: obj.link
    };
  });
}

function instagramFeed() {
  return new Promise(function (resolve, reject) {
    _axios2.default.get(apiRoot + '/users/' + userId + '/media/recent?access_token=' + accessToken).then(function (res) {
      return res.data;
    }).then(function (res) {
      return malformStream(res.data);
    }).then(function (res) {
      return resolve(res);
    }).catch(function (err) {
      return reject(err);
    });
  });
}