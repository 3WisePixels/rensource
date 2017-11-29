'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = renderDynamic;

var _sendError = require('./sendError');

var _sendError2 = _interopRequireDefault(_sendError);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderDynamic(response, templateName) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return response.render(templateName, options, function (err, html) {
    if (err) {
      return (0, _sendError2.default)(response, err);
    }
    return response.send(html);
  });
}