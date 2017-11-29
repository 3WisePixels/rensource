'use strict';

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _path = require('path');

var _find = require('lodash/find');

var _find2 = _interopRequireDefault(_find);

var _feeds = require('./feeds');

var _feeds2 = _interopRequireDefault(_feeds);

var _sendError = require('./utils/sendError');

var _sendError2 = _interopRequireDefault(_sendError);

var _renderDynamic = require('./utils/renderDynamic');

var _renderDynamic2 = _interopRequireDefault(_renderDynamic);

var _contentful = require('./feeds/contentful');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var app = (0, _express2.default)();
var PORT = process.env.PORT || 3002;

app.set('views', (0, _path.join)(__dirname, '..', '..', 'source', 'html'));
app.set('view engine', 'ejs');

app.use(_express2.default.static((0, _path.join)(__dirname, '..', '..', 'dist')));

app.get('/', function (req, res) {
  (0, _feeds2.default)('index').then(function (options) {
    return (0, _renderDynamic2.default)(res, 'index', options);
  }).catch(function (error) {
    return (0, _sendError2.default)(res, error);
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.get('/feed', function (req, res) {
    (0, _feeds2.default)().then(function (feeds) {
      return res.send(feeds);
    }).catch(function (error) {
      return (0, _sendError2.default)(res, error);
    });
  });
}

app.get('/magazine/:slug', function (req, res) {
  (0, _contentful.contentfulFeed)().then(function (response) {
    return (0, _find2.default)(response, { slug: req.params.slug });
  }).then(function (response) {
    return res.render('magazine-show', response);
  });
});

app.get('/(:page)', function (req, res) {
  var _req$params$page = req.params.page,
      page = _req$params$page === undefined ? 'index' : _req$params$page;


  (0, _feeds2.default)(page).then(function (options) {
    return (0, _renderDynamic2.default)(res, page, options);
  }).catch(function (error) {
    return (0, _sendError2.default)(res, error);
  });
});

app.listen(PORT, function () {
  return console.log('Server running on ' + PORT);
}); // eslint-disable-line