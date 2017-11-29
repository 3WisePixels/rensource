'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.client = undefined;
exports.contentfulFeed = contentfulFeed;

var _contentful = require('contentful');

var _contentful2 = _interopRequireDefault(_contentful);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var client = exports.client = _contentful2.default.createClient({
  space: 'hsz45wzlj2xc',
  accessToken: '551e90a7eb6dccfe0569e11211eb029fb60881b8765a7dd7253b470909f28a34'
});

function malformStream(stream) {
  return stream.map(function (obj) {
    var sys = obj.sys,
        fields = obj.fields;

    var date = new Date(sys.createdAt);

    return {
      type: 'magazine',
      title: fields.title,
      text: fields.content,
      slug: fields.slug,
      createdAt: date,
      createdAtFormatted: (0, _moment2.default)(date).format("MMM Do YYYY"),
      link: '/magazine/' + fields.slug
    };
  });
}

function contentfulFeed() {
  return new Promise(function (resolve, reject) {
    client.getEntries().then(function (entries) {
      return malformStream(entries.items);
    }).then(function (entries) {
      return resolve(entries);
    }).catch(function (error) {
      return reject(error);
    });
  });
}