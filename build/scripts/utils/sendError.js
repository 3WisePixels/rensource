"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = sendError;
function sendError(res, e) {
  return res.status(404).send(e + " <a href=\"/\">Back.</a>");
}