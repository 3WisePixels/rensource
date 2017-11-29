'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.screenName = undefined;
exports.twitterFeed = twitterFeed;

var _twitter = require('twitter');

var _twitter2 = _interopRequireDefault(_twitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var client = new _twitter2.default({
  consumer_key: 'RGSBzqmD1B8yKJEndLAp6OP2Y',
  consumer_secret: 'sIihnif160vvLFiBWXZeKTejdpYBurGpGHAOFqhyOuePtVhA07',
  access_token_key: '129433615-sJCQpejLvg9ix7eWKVtxDpc8oMF6zCQmZg31Z1o2',
  access_token_secret: 'e2zVdBVcEqKTZafopUADx8gB565pLNWQjQ9romqakGFUp'
});

var screenName = exports.screenName = 'rensourceenergy'; // eslint-disable-line

function malformStream(stream) {
  return stream.map(function (obj) {
    return {
      type: 'twitter',
      text: obj.text,
      createdAt: new Date(obj.created_at),
      link: 'https://twitter.com/' + screenName + '/status/' + obj.id_str
      // origin: obj,
    };
  });
}

function twitterFeed() {
  return new Promise(function (resolve, reject) {
    client.get('statuses/user_timeline', { screen_name: screenName }, function (error, tweets, response) {
      if (error) reject(error);

      var parsedBody = JSON.parse(response.body);
      var resp = malformStream(parsedBody);
      resolve(resp);
    });
  });
}