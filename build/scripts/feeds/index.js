'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _union = require('lodash/union');

var _union2 = _interopRequireDefault(_union);

var _flatten = require('lodash/flatten');

var _flatten2 = _interopRequireDefault(_flatten);

var _sortBy = require('lodash/sortBy');

var _sortBy2 = _interopRequireDefault(_sortBy);

var _countryData = require('country-data');

var _twitter = require('./twitter');

var _facebook = require('./facebook');

var _contentful = require('./contentful');

var _instagram = require('./instagram');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

exports.default = function () {
  var page = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'index';

  var codes = _countryData.countries.all.map(function (country) {
    if (Array.isArray(country.countryCallingCodes)) {
      return country.countryCallingCodes[0];
    } else {
      // eslint-disable-line
      return country.countryCallingCodes;
    }
  }).sort().filter(function (value, index, self) {
    return self.indexOf(value) === index;
  });

  codes.unshift('+23');

  if (page === 'magazine') {
    return Promise.all([(0, _facebook.facebookFeed)(), (0, _twitter.twitterFeed)(), (0, _contentful.contentfulFeed)(), (0, _instagram.instagramFeed)()]).then(function (feeds) {
      return _union2.default.apply(undefined, _toConsumableArray(feeds));
    }).then(function (feeds) {
      return (0, _flatten2.default)(feeds);
    }).then(function (feeds) {
      return (0, _sortBy2.default)(feeds, 'createdAt').reverse();
    }).then(function (feeds) {
      return { feeds: feeds, codes: codes };
    });
  } else {
    // eslint-disable-line
    return Promise.resolve({ codes: codes });
  }
};