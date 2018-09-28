(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":3}],2:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var buildURL = require('./../helpers/buildURL');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var createError = require('../core/createError');
var btoa = (typeof window !== 'undefined' && window.btoa && window.btoa.bind(window)) || require('./../helpers/btoa');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();
    var loadEvent = 'onreadystatechange';
    var xDomain = false;

    // For IE 8/9 CORS support
    // Only supports POST and GET calls and doesn't returns the response headers.
    // DON'T do this for testing b/c XMLHttpRequest is mocked, not XDomainRequest.
    if (process.env.NODE_ENV !== 'test' &&
        typeof window !== 'undefined' &&
        window.XDomainRequest && !('withCredentials' in request) &&
        !isURLSameOrigin(config.url)) {
      request = new window.XDomainRequest();
      loadEvent = 'onload';
      xDomain = true;
      request.onprogress = function handleProgress() {};
      request.ontimeout = function handleTimeout() {};
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request[loadEvent] = function handleLoad() {
      if (!request || (request.readyState !== 4 && !xDomain)) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        // IE sends 1223 instead of 204 (https://github.com/axios/axios/issues/201)
        status: request.status === 1223 ? 204 : request.status,
        statusText: request.status === 1223 ? 'No Content' : request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies = require('./../helpers/cookies');

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
          cookies.read(config.xsrfCookieName) :
          undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

}).call(this,require('_process'))

},{"../core/createError":9,"./../core/settle":12,"./../helpers/btoa":16,"./../helpers/buildURL":17,"./../helpers/cookies":19,"./../helpers/isURLSameOrigin":21,"./../helpers/parseHeaders":23,"./../utils":25,"_process":30}],3:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(utils.merge(defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"./cancel/Cancel":4,"./cancel/CancelToken":5,"./cancel/isCancel":6,"./core/Axios":7,"./defaults":14,"./helpers/bind":15,"./helpers/spread":24,"./utils":25}],4:[function(require,module,exports){
'use strict';

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

module.exports = Cancel;

},{}],5:[function(require,module,exports){
'use strict';

var Cancel = require('./Cancel');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./Cancel":4}],6:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],7:[function(require,module,exports){
'use strict';

var defaults = require('./../defaults');
var utils = require('./../utils');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = utils.merge({
      url: arguments[0]
    }, arguments[1]);
  }

  config = utils.merge(defaults, this.defaults, { method: 'get' }, config);
  config.method = config.method.toLowerCase();

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;

},{"./../defaults":14,"./../utils":25,"./InterceptorManager":8,"./dispatchRequest":10}],8:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":25}],9:[function(require,module,exports){
'use strict';

var enhanceError = require('./enhanceError');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
module.exports = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

},{"./enhanceError":11}],10:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var isAbsoluteURL = require('./../helpers/isAbsoluteURL');
var combineURLs = require('./../helpers/combineURLs');

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/isCancel":6,"../defaults":14,"./../helpers/combineURLs":18,"./../helpers/isAbsoluteURL":20,"./../utils":25,"./transformData":13}],11:[function(require,module,exports){
'use strict';

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
module.exports = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }
  error.request = request;
  error.response = response;
  return error;
};

},{}],12:[function(require,module,exports){
'use strict';

var createError = require('./createError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  // Note: status is not exposed by XDomainRequest
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

},{"./createError":9}],13:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

},{"./../utils":25}],14:[function(require,module,exports){
(function (process){
'use strict';

var utils = require('./utils');
var normalizeHeaderName = require('./helpers/normalizeHeaderName');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  } else if (typeof process !== 'undefined') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this,require('_process'))

},{"./adapters/http":2,"./adapters/xhr":2,"./helpers/normalizeHeaderName":22,"./utils":25,"_process":30}],15:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],16:[function(require,module,exports){
'use strict';

// btoa polyfill for IE<10 courtesy https://github.com/davidchambers/Base64.js

var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function E() {
  this.message = 'String contains an invalid character';
}
E.prototype = new Error;
E.prototype.code = 5;
E.prototype.name = 'InvalidCharacterError';

function btoa(input) {
  var str = String(input);
  var output = '';
  for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)
  ) {
    charCode = str.charCodeAt(idx += 3 / 4);
    if (charCode > 0xFF) {
      throw new E();
    }
    block = block << 8 | charCode;
  }
  return output;
}

module.exports = btoa;

},{}],17:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      }

      if (!utils.isArray(val)) {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":25}],18:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],19:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
        return (match ? decodeURIComponent(match[3]) : null);
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })() :

  // Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() { return null; },
      remove: function remove() {}
    };
  })()
);

},{"./../utils":25}],20:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

},{}],21:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
  (function standardBrowserEnv() {
    var msie = /(msie|trident)/i.test(navigator.userAgent);
    var urlParsingNode = document.createElement('a');
    var originURL;

    /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
    function resolveURL(url) {
      var href = url;

      if (msie) {
        // IE needs attribute set twice to normalize properties
        urlParsingNode.setAttribute('href', href);
        href = urlParsingNode.href;
      }

      urlParsingNode.setAttribute('href', href);

      // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
      return {
        href: urlParsingNode.href,
        protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
        host: urlParsingNode.host,
        search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
        hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
        hostname: urlParsingNode.hostname,
        port: urlParsingNode.port,
        pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                  urlParsingNode.pathname :
                  '/' + urlParsingNode.pathname
      };
    }

    originURL = resolveURL(window.location.href);

    /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
    return function isURLSameOrigin(requestURL) {
      var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
      return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
    };
  })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return function isURLSameOrigin() {
      return true;
    };
  })()
);

},{"./../utils":25}],22:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":25}],23:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":25}],24:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],25:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');
var isBuffer = require('is-buffer');

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim
};

},{"./helpers/bind":15,"is-buffer":27}],26:[function(require,module,exports){
// get successful control from form and assemble into object
// http://www.w3.org/TR/html401/interact/forms.html#h-17.13.2

// types which indicate a submit action and are not successful controls
// these will be ignored
var k_r_submitter = /^(?:submit|button|image|reset|file)$/i;

// node names which could be successful controls
var k_r_success_contrls = /^(?:input|select|textarea|keygen)/i;

// Matches bracket notation.
var brackets = /(\[[^\[\]]*\])/g;

// serializes form fields
// @param form MUST be an HTMLForm element
// @param options is an optional argument to configure the serialization. Default output
// with no options specified is a url encoded string
//    - hash: [true | false] Configure the output type. If true, the output will
//    be a js object.
//    - serializer: [function] Optional serializer function to override the default one.
//    The function takes 3 arguments (result, key, value) and should return new result
//    hash and url encoded str serializers are provided with this module
//    - disabled: [true | false]. If true serialize disabled fields.
//    - empty: [true | false]. If true serialize empty fields
function serialize(form, options) {
    if (typeof options != 'object') {
        options = { hash: !!options };
    }
    else if (options.hash === undefined) {
        options.hash = true;
    }

    var result = (options.hash) ? {} : '';
    var serializer = options.serializer || ((options.hash) ? hash_serializer : str_serialize);

    var elements = form && form.elements ? form.elements : [];

    //Object store each radio and set if it's empty or not
    var radio_store = Object.create(null);

    for (var i=0 ; i<elements.length ; ++i) {
        var element = elements[i];

        // ingore disabled fields
        if ((!options.disabled && element.disabled) || !element.name) {
            continue;
        }
        // ignore anyhting that is not considered a success field
        if (!k_r_success_contrls.test(element.nodeName) ||
            k_r_submitter.test(element.type)) {
            continue;
        }

        var key = element.name;
        var val = element.value;

        // we can't just use element.value for checkboxes cause some browsers lie to us
        // they say "on" for value when the box isn't checked
        if ((element.type === 'checkbox' || element.type === 'radio') && !element.checked) {
            val = undefined;
        }

        // If we want empty elements
        if (options.empty) {
            // for checkbox
            if (element.type === 'checkbox' && !element.checked) {
                val = '';
            }

            // for radio
            if (element.type === 'radio') {
                if (!radio_store[element.name] && !element.checked) {
                    radio_store[element.name] = false;
                }
                else if (element.checked) {
                    radio_store[element.name] = true;
                }
            }

            // if options empty is true, continue only if its radio
            if (val == undefined && element.type == 'radio') {
                continue;
            }
        }
        else {
            // value-less fields are ignored unless options.empty is true
            if (!val) {
                continue;
            }
        }

        // multi select boxes
        if (element.type === 'select-multiple') {
            val = [];

            var selectOptions = element.options;
            var isSelectedOptions = false;
            for (var j=0 ; j<selectOptions.length ; ++j) {
                var option = selectOptions[j];
                var allowedEmpty = options.empty && !option.value;
                var hasValue = (option.value || allowedEmpty);
                if (option.selected && hasValue) {
                    isSelectedOptions = true;

                    // If using a hash serializer be sure to add the
                    // correct notation for an array in the multi-select
                    // context. Here the name attribute on the select element
                    // might be missing the trailing bracket pair. Both names
                    // "foo" and "foo[]" should be arrays.
                    if (options.hash && key.slice(key.length - 2) !== '[]') {
                        result = serializer(result, key + '[]', option.value);
                    }
                    else {
                        result = serializer(result, key, option.value);
                    }
                }
            }

            // Serialize if no selected options and options.empty is true
            if (!isSelectedOptions && options.empty) {
                result = serializer(result, key, '');
            }

            continue;
        }

        result = serializer(result, key, val);
    }

    // Check for all empty radio buttons and serialize them with key=""
    if (options.empty) {
        for (var key in radio_store) {
            if (!radio_store[key]) {
                result = serializer(result, key, '');
            }
        }
    }

    return result;
}

function parse_keys(string) {
    var keys = [];
    var prefix = /^([^\[\]]*)/;
    var children = new RegExp(brackets);
    var match = prefix.exec(string);

    if (match[1]) {
        keys.push(match[1]);
    }

    while ((match = children.exec(string)) !== null) {
        keys.push(match[1]);
    }

    return keys;
}

function hash_assign(result, keys, value) {
    if (keys.length === 0) {
        result = value;
        return result;
    }

    var key = keys.shift();
    var between = key.match(/^\[(.+?)\]$/);

    if (key === '[]') {
        result = result || [];

        if (Array.isArray(result)) {
            result.push(hash_assign(null, keys, value));
        }
        else {
            // This might be the result of bad name attributes like "[][foo]",
            // in this case the original `result` object will already be
            // assigned to an object literal. Rather than coerce the object to
            // an array, or cause an exception the attribute "_values" is
            // assigned as an array.
            result._values = result._values || [];
            result._values.push(hash_assign(null, keys, value));
        }

        return result;
    }

    // Key is an attribute name and can be assigned directly.
    if (!between) {
        result[key] = hash_assign(result[key], keys, value);
    }
    else {
        var string = between[1];
        // +var converts the variable into a number
        // better than parseInt because it doesn't truncate away trailing
        // letters and actually fails if whole thing is not a number
        var index = +string;

        // If the characters between the brackets is not a number it is an
        // attribute name and can be assigned directly.
        if (isNaN(index)) {
            result = result || {};
            result[string] = hash_assign(result[string], keys, value);
        }
        else {
            result = result || [];
            result[index] = hash_assign(result[index], keys, value);
        }
    }

    return result;
}

// Object/hash encoding serializer.
function hash_serializer(result, key, value) {
    var matches = key.match(brackets);

    // Has brackets? Use the recursive assignment function to walk the keys,
    // construct any missing objects in the result tree and make the assignment
    // at the end of the chain.
    if (matches) {
        var keys = parse_keys(key);
        hash_assign(result, keys, value);
    }
    else {
        // Non bracket notation can make assignments directly.
        var existing = result[key];

        // If the value has been assigned already (for instance when a radio and
        // a checkbox have the same name attribute) convert the previous value
        // into an array before pushing into it.
        //
        // NOTE: If this requirement were removed all hash creation and
        // assignment could go through `hash_assign`.
        if (existing) {
            if (!Array.isArray(existing)) {
                result[key] = [ existing ];
            }

            result[key].push(value);
        }
        else {
            result[key] = value;
        }
    }

    return result;
}

// urlform encoding serializer
function str_serialize(result, key, value) {
    // encode newlines as \r\n cause the html spec says so
    value = value.replace(/(\r)?\n/g, '\r\n');
    value = encodeURIComponent(value);

    // spaces should be '+' rather than '%20'.
    value = value.replace(/%20/g, '+');
    return result + (result ? '&' : '') + encodeURIComponent(key) + '=' + value;
}

module.exports = serialize;

},{}],27:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
}

function isBuffer (obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer (obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
}

},{}],28:[function(require,module,exports){
/**
 * isMobile.js v0.4.1
 *
 * A simple library to detect Apple phones and tablets,
 * Android phones and tablets, other mobile devices (like blackberry, mini-opera and windows phone),
 * and any kind of seven inch device, via user agent sniffing.
 *
 * @author: Kai Mallea (kmallea@gmail.com)
 *
 * @license: http://creativecommons.org/publicdomain/zero/1.0/
 */
(function (global) {

    var apple_phone         = /iPhone/i,
        apple_ipod          = /iPod/i,
        apple_tablet        = /iPad/i,
        android_phone       = /(?=.*\bAndroid\b)(?=.*\bMobile\b)/i, // Match 'Android' AND 'Mobile'
        android_tablet      = /Android/i,
        amazon_phone        = /(?=.*\bAndroid\b)(?=.*\bSD4930UR\b)/i,
        amazon_tablet       = /(?=.*\bAndroid\b)(?=.*\b(?:KFOT|KFTT|KFJWI|KFJWA|KFSOWI|KFTHWI|KFTHWA|KFAPWI|KFAPWA|KFARWI|KFASWI|KFSAWI|KFSAWA)\b)/i,
        windows_phone       = /Windows Phone/i,
        windows_tablet      = /(?=.*\bWindows\b)(?=.*\bARM\b)/i, // Match 'Windows' AND 'ARM'
        other_blackberry    = /BlackBerry/i,
        other_blackberry_10 = /BB10/i,
        other_opera         = /Opera Mini/i,
        other_chrome        = /(CriOS|Chrome)(?=.*\bMobile\b)/i,
        other_firefox       = /(?=.*\bFirefox\b)(?=.*\bMobile\b)/i, // Match 'Firefox' AND 'Mobile'
        seven_inch = new RegExp(
            '(?:' +         // Non-capturing group

            'Nexus 7' +     // Nexus 7

            '|' +           // OR

            'BNTV250' +     // B&N Nook Tablet 7 inch

            '|' +           // OR

            'Kindle Fire' + // Kindle Fire

            '|' +           // OR

            'Silk' +        // Kindle Fire, Silk Accelerated

            '|' +           // OR

            'GT-P1000' +    // Galaxy Tab 7 inch

            ')',            // End non-capturing group

            'i');           // Case-insensitive matching

    var match = function(regex, userAgent) {
        return regex.test(userAgent);
    };

    var IsMobileClass = function(userAgent) {
        var ua = userAgent || navigator.userAgent;

        // Facebook mobile app's integrated browser adds a bunch of strings that
        // match everything. Strip it out if it exists.
        var tmp = ua.split('[FBAN');
        if (typeof tmp[1] !== 'undefined') {
            ua = tmp[0];
        }

        // Twitter mobile app's integrated browser on iPad adds a "Twitter for
        // iPhone" string. Same probable happens on other tablet platforms.
        // This will confuse detection so strip it out if it exists.
        tmp = ua.split('Twitter');
        if (typeof tmp[1] !== 'undefined') {
            ua = tmp[0];
        }

        this.apple = {
            phone:  match(apple_phone, ua),
            ipod:   match(apple_ipod, ua),
            tablet: !match(apple_phone, ua) && match(apple_tablet, ua),
            device: match(apple_phone, ua) || match(apple_ipod, ua) || match(apple_tablet, ua)
        };
        this.amazon = {
            phone:  match(amazon_phone, ua),
            tablet: !match(amazon_phone, ua) && match(amazon_tablet, ua),
            device: match(amazon_phone, ua) || match(amazon_tablet, ua)
        };
        this.android = {
            phone:  match(amazon_phone, ua) || match(android_phone, ua),
            tablet: !match(amazon_phone, ua) && !match(android_phone, ua) && (match(amazon_tablet, ua) || match(android_tablet, ua)),
            device: match(amazon_phone, ua) || match(amazon_tablet, ua) || match(android_phone, ua) || match(android_tablet, ua)
        };
        this.windows = {
            phone:  match(windows_phone, ua),
            tablet: match(windows_tablet, ua),
            device: match(windows_phone, ua) || match(windows_tablet, ua)
        };
        this.other = {
            blackberry:   match(other_blackberry, ua),
            blackberry10: match(other_blackberry_10, ua),
            opera:        match(other_opera, ua),
            firefox:      match(other_firefox, ua),
            chrome:       match(other_chrome, ua),
            device:       match(other_blackberry, ua) || match(other_blackberry_10, ua) || match(other_opera, ua) || match(other_firefox, ua) || match(other_chrome, ua)
        };
        this.seven_inch = match(seven_inch, ua);
        this.any = this.apple.device || this.android.device || this.windows.device || this.other.device || this.seven_inch;

        // excludes 'other' devices and ipods, targeting touchscreen phones
        this.phone = this.apple.phone || this.android.phone || this.windows.phone;

        // excludes 7 inch devices, classifying as phone or tablet is left to the user
        this.tablet = this.apple.tablet || this.android.tablet || this.windows.tablet;

        if (typeof window === 'undefined') {
            return this;
        }
    };

    var instantiate = function() {
        var IM = new IsMobileClass();
        IM.Class = IsMobileClass;
        return IM;
    };

    if (typeof module !== 'undefined' && module.exports && typeof window === 'undefined') {
        //node
        module.exports = IsMobileClass;
    } else if (typeof module !== 'undefined' && module.exports && typeof window !== 'undefined') {
        //browserify
        module.exports = instantiate();
    } else if (typeof define === 'function' && define.amd) {
        //AMD
        define('isMobile', [], global.isMobile = instantiate());
    } else {
        global.isMobile = instantiate();
    }

})(this);

},{}],29:[function(require,module,exports){
/*!
 * JavaScript Cookie v2.2.0
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader = false;
	if (typeof define === 'function' && define.amd) {
		define(factory);
		registeredInModuleLoader = true;
	}
	if (typeof exports === 'object') {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function init (converter) {
		function api (key, value, attributes) {
			var result;
			if (typeof document === 'undefined') {
				return;
			}

			// Write

			if (arguments.length > 1) {
				attributes = extend({
					path: '/'
				}, api.defaults, attributes);

				if (typeof attributes.expires === 'number') {
					var expires = new Date();
					expires.setMilliseconds(expires.getMilliseconds() + attributes.expires * 864e+5);
					attributes.expires = expires;
				}

				// We're using "expires" because "max-age" is not supported by IE
				attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

				try {
					result = JSON.stringify(value);
					if (/^[\{\[]/.test(result)) {
						value = result;
					}
				} catch (e) {}

				if (!converter.write) {
					value = encodeURIComponent(String(value))
						.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);
				} else {
					value = converter.write(value, key);
				}

				key = encodeURIComponent(String(key));
				key = key.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent);
				key = key.replace(/[\(\)]/g, escape);

				var stringifiedAttributes = '';

				for (var attributeName in attributes) {
					if (!attributes[attributeName]) {
						continue;
					}
					stringifiedAttributes += '; ' + attributeName;
					if (attributes[attributeName] === true) {
						continue;
					}
					stringifiedAttributes += '=' + attributes[attributeName];
				}
				return (document.cookie = key + '=' + value + stringifiedAttributes);
			}

			// Read

			if (!key) {
				result = {};
			}

			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all. Also prevents odd result when
			// calling "get()"
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var rdecode = /(%[0-9A-Z]{2})+/g;
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (!this.json && cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = parts[0].replace(rdecode, decodeURIComponent);
					cookie = converter.read ?
						converter.read(cookie, name) : converter(cookie, name) ||
						cookie.replace(rdecode, decodeURIComponent);

					if (this.json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					if (key === name) {
						result = cookie;
						break;
					}

					if (!key) {
						result[name] = cookie;
					}
				} catch (e) {}
			}

			return result;
		}

		api.set = api;
		api.get = function (key) {
			return api.call(api, key);
		};
		api.getJSON = function () {
			return api.apply({
				json: true
			}, [].slice.call(arguments));
		};
		api.defaults = {};

		api.remove = function (key, attributes) {
			api(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));

},{}],30:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],31:[function(require,module,exports){
'use strict';

var _ismobilejs = require('ismobilejs');

var _ismobilejs2 = _interopRequireDefault(_ismobilejs);

var _formSerialize = require('form-serialize');

var _formSerialize2 = _interopRequireDefault(_formSerialize);

var _jsCookie = require('js-cookie');

var _jsCookie2 = _interopRequireDefault(_jsCookie);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

$(document).ready(function () {
  var headers = {};
  var clientKey = _jsCookie2.default.get('client');
  var uid = _jsCookie2.default.get('uid');
  var token = _jsCookie2.default.get('token');

  if (clientKey && uid && token) {
    headers['access-token'] = token;
    headers.uid = uid;
    headers.client = clientKey;
  }

  /**
   * Contact form selector
   */

  $('[data-select-product]').on('click', function (event) {
    var product = $(event.currentTarget).data('select-product');

    // Scroll to registration form
    zenscroll.to(document.getElementById('product_interest'), 500);

    // Set the value of the product interest dropdown
    $('#product_interest').val(product);
    $('#product_interest').trigger('change');

    // Autofocus the first input
    $('#name').focus();
  });

  var customCountryCode = false;
  $('[name="first_name"], [name="middle_name"], [name="last_name"]').on('change', function (event) {
    if ($(event.currentTarget).val() && $(event.currentTarget).val().match(/\d+/g)) {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your name should not include numbers.');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    }
  });

  $('[name="password_confirmation"]').on('change', function (event) {
    // $(event.currentTarget).val() === $('[name="password"]').val()
    // const currentLength = $(event.currentTarget).val().length;
    // console.log(currentLength);
    if ($(event.currentTarget).val() === $('[name="password"]').val()) {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="password"]').css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="password"]').css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your passwords must match.');
    }

    if ($(event.currentTarget).val().length <= 7) {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="password"]').css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your password should have at least 8 characters.');
    } else if ($(event.currentTarget).val() !== $('[name="password"]').val()) {
      $('.error-field-last').html('<div class="error-icon">!</div>Your passwords must match.');
    }
  });

  $('[name="email_confirmation"]').on('change', function (event) {
    function validateEmail(mail) {
      if (/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(mail)) {
        return true;
      }
      return false;
    }

    if ($(event.currentTarget).val() === $('[name="email"]').val() && validateEmail($(event.currentTarget).val())) {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="email"]').css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="email"]').css('border-bottom', '1px solid red');
      $('.error-field-last').html('<div class="error-icon">!</div>Your emails must match.');
    }
  });
  // Counter
  $('.WPKpiRow').waypoint(function (direction) {
    $('.count').each(function () {
      $(this).prop('Counter', 0).animate({
        Counter: $(this).text()
      }, {
        duration: 4000,
        easing: 'swing',
        step: function step(now) {
          $(this).text(Math.ceil(now));
        }
      });
    });
    this.destroy();
  }, {
    //bottom-in-view will ensure event is thrown when the element's bottom crosses
    //bottom of viewport.
    offset: 'bottom-in-view'
  });
  /* Video */
  $("#headSlider").each(function () {
    var e,
        n = $(this),
        i = n.find(".slide_group"),
        t = n.find(".slide"),
        c = 0;function l(e) {
      var n, l;s(), i.is(":animated") || c === e || (e > c ? (l = "100%", n = "-100%") : (l = "-100%", n = "100%"), t.eq(e).css({ display: "block", left: l }), i.animate({ left: n }, function () {
        t.eq(c).css({ display: "none" }), t.eq(e).css({ left: 0 }), i.css({ left: 0 }), c = e;
      }));
    }function s() {
      clearTimeout(e), e = setTimeout(function () {
        c < t.length - 1 ? l(c + 1) : l(0);
      }, 4e3);
    }$(".headSlider.next_btn").on("click", function () {
      c < t.length - 1 ? l(c + 1) : l(0);
    }), $(".headSlider.previous_btn").on("click", function () {
      l(0 !== c ? c - 1 : 3);
    }), s();
  });

  $("#whatSlider").each(function () {
    var e,
        n = $(this),
        i = n.find(".slide_group"),
        t = n.find(".slide"),
        c = 0;function l(e) {
      var n, l;s(), i.is(":animated") || c === e || (e > c ? (l = "100%", n = "-100%") : (l = "-100%", n = "100%"), t.eq(e).css({ display: "block", left: l }), i.animate({ left: n }, function () {
        t.eq(c).css({ display: "none" }), t.eq(e).css({ left: 0 }), i.css({ left: 0 }), c = e;
      }));
    }function s() {
      clearTimeout(e), e = setTimeout(function () {
        c < t.length - 1 ? l(c + 1) : l(0);
      }, 4e3);
    }$(".whatSlider.next_btn").on("click", function () {
      c < t.length - 1 ? l(c + 1) : l(0);
    }), $(".whatSlider.previous_btn").on("click", function () {
      l(0 !== c ? c - 1 : 3);
    }), s();
  });

  $("#projSlider").each(function () {
    var e,
        n = $(this),
        i = n.find(".slide_group"),
        t = n.find(".slide"),
        c = 0;function l(e) {
      var n, l;s(), i.is(":animated") || c === e || (e > c ? (l = "100%", n = "-100%") : (l = "-100%", n = "100%"), t.eq(e).css({ display: "block", left: l }), i.animate({ left: n }, function () {
        t.eq(c).css({ display: "none" }), t.eq(e).css({ left: 0 }), i.css({ left: 0 }), c = e;
      }));
    }function s() {
      clearTimeout(e), e = setTimeout(function () {
        c < t.length - 1 ? l(c + 1) : l(0);
      }, 4e3);
    }$(".projSlider.next_btn").on("click", function () {
      c < t.length - 1 ? l(c + 1) : l(0);
    }), $(".projSlider.previous_btn").on("click", function () {
      l(0 !== c ? c - 1 : 3);
    }), s();
  });

  $("#opsSlider").each(function () {
    var e,
        n = $(this),
        i = n.find(".slide_group"),
        t = n.find(".slide"),
        c = 0;function l(e) {
      var n, l;s(), i.is(":animated") || c === e || (e > c ? (l = "100%", n = "-100%") : (l = "-100%", n = "100%"), t.eq(e).css({ display: "block", left: l }), i.animate({ left: n }, function () {
        t.eq(c).css({ display: "none" }), t.eq(e).css({ left: 0 }), i.css({ left: 0 }), c = e;
      }));
    }function s() {
      clearTimeout(e), e = setTimeout(function () {
        c < t.length - 1 ? l(c + 1) : l(0);
      }, 4e3);
    }$(".opsSlider.next_btn").on("click", function () {
      c < t.length - 1 ? l(c + 1) : l(0);
    }), $(".opsSlider.previous_btn").on("click", function () {
      l(0 !== c ? c - 1 : 3);
    }), s();
  });

  $("#utilSlider").each(function () {
    var e,
        n = $(this),
        i = n.find(".slide_group"),
        t = n.find(".slide"),
        c = 0;function l(e) {
      var n, l;s(), i.is(":animated") || c === e || (e > c ? (l = "100%", n = "-100%") : (l = "-100%", n = "100%"), t.eq(e).css({ display: "block", left: l }), i.animate({ left: n }, function () {
        t.eq(c).css({ display: "none" }), t.eq(e).css({ left: 0 }), i.css({ left: 0 }), c = e;
      }));
    }function s() {
      clearTimeout(e), e = setTimeout(function () {
        c < t.length - 1 ? l(c + 1) : l(0);
      }, 4e3);
    }$(".utilSlider.next_btn").on("click", function () {
      c < t.length - 1 ? l(c + 1) : l(0);
    }), $(".utilSlider.previous_btn").on("click", function () {
      l(0 !== c ? c - 1 : 3);
    }), s();
  });

  $('[name="email"]').on('change', function (event) {
    function validateEmail(mail) {
      if (/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(mail)) {
        return true;
      }
      return false;
    }

    if ($(event.currentTarget).val() === $('[name="email"]').val()) {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="email"]').css('border-bottom', '1px solid #eee');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="email"]').css('border-bottom', '1px solid red');
    }

    if (!validateEmail($(event.currentTarget).val())) {
      $('.error-field-last').html('<div class="error-icon">!</div>Please enter a valid email.');
      $(event.currentTarget).css('border-bottom', '1px solid red');
      $('[name="email"]').css('border-bottom', '1px solid red');
    } else {
      $(event.currentTarget).css('border-bottom', '1px solid #eee');
      $('[name="email"]').css('border-bottom', '1px solid #eee');
      $('.error-field-last').html('');
    }
  });

  $('[name="country_code"]').on('change', function (event) {
    var $target = $(event.currentTarget);
    var value = $target.val();
    var value2 = $target.parent().next().find('input');

    if (value === 'other') {
      $(event.currentTarget).parent().removeClass('col-sm-12').addClass('col-sm-6');

      $(event.currentTarget).parent().next().removeClass('hidden');

      value2.focus().val(value2.val());

      customCountryCode = true;
    } else {
      if (!customCountryCode) return;

      $(event.currentTarget).parent().addClass('col-sm-12').removeClass('col-sm-6');

      $(event.currentTarget).parent().next().addClass('hidden');

      value2.val('');

      customCountryCode = false;
    }
  });

  $('#product_interest').on('change', function (event) {
    var $target = $(event.currentTarget);
    var value = $target.val();

    if (value === 'Go') {
      $('.registration-submit').html('Get Started');
    } else {
      // $('.registration-submit').html('Join waiting list')
      $('.registration-submit').html('Get Started');
    }
  });

  /**
   * Contact Form Slider
   */

  var $contactSlider = $('.rs-section-registration-slider');
  var $contactForm = $('.rs-section-registration-form');
  var $contactSuccess = $('.rs-section-registration-success');

  $contactSlider.slick({
    // initialSlide: 1,
    arrows: false,
    draggable: false,
    adaptiveHeight: true
  });

  $('.registration-resend').on('click', function () {
    var redirectUrl = '/onboarding/verified';

    // if (Cookies.get('skipOnboarding')) {
    //   redirectUrl = '/onboarding/finish';
    // }

    (0, _axios2.default)({
      method: 'post',
      url: 'https://rensource-api-eu.herokuapp.com/v1/onboarding/resend_email_token',
      headers: {
        'Content-Type': 'application/json',
        'access-token': _jsCookie2.default.get('token'),
        client: _jsCookie2.default.get('client'),
        uid: _jsCookie2.default.get('uid')
      },
      data: {
        redirect_url: 'http://staging.rs.testgebiet.com' + redirectUrl
      }
    }).then(function (data) {
      $('.rs-section-registration-success button').attr('disabled', true);
      $('.rs-section-registration-success button').html('Email has been resent');
    }).catch(function (error) {
      alert('Something went wrong. Please try again later.');
    });
  });

  $('.rs-section-registration-slider input, .rs-section-registration-slider select').on('change', function () {
    var formEl = document.querySelector('.rs-section-registration-form');
    var form = (0, _formSerialize2.default)(formEl, true);
    var errors = validateLastStep(form);

    if (errors.length) {
      return false;
    } else {
      $('.registration-submit').attr('disabled', false);
    }
  });

  var wrongReferral = false;
  $contactSlider.on('click', '.registration-submit', function (event) {
    event.preventDefault();

    $('.rs-section-registration-form button').attr('disabled', true);

    var formEl = document.querySelector('.rs-section-registration-form');
    var form = (0, _formSerialize2.default)(formEl, true);
    var errors = validateLastStep(form);

    var formString = Object.keys(form).map(function (key) {
      var escapedValue = form[key].replace(/\+/g, '%2B');
      return key + '=' + escapedValue;
    }).join('&');

    function URLToArray(url) {
      var request = {};
      var pairs = url.substring(url.indexOf('?') + 1).split('&');
      for (var i = 0; i < pairs.length; i++) {
        if (!pairs[i]) continue;
        var pair = pairs[i].split('=');
        request[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
      }
      return request;
    }

    var formArray = URLToArray(formString);

    function validateEmail(mail) {
      if (/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test(mail)) {
        return true;
      }
      return false;
    }

    var redirectUrl = '/onboarding/verified';

    // if (typeof formArray.referral_token !== 'undefined' && formArray.referral_token) {
    //   Cookies.set('skipOnboarding', true);
    //   redirectUrl = '/onboarding/finish';
    // }

    var referralReg = /REN\d+\$/g;

    if (!validateEmail(formArray.email)) {
      $('.error-field-last').html('<div class="error-icon">!</div>Please enter a valid email address.');
    } else if (formArray.email !== formArray.email_confirmation) {
      $('.error-field-last').html('<div class="error-icon">!</div>It seems like your emails dont match.');
    } else if (formArray.password !== formArray.password_confirmation) {
      $('.error-field-last').html('<div class="error-icon">!</div>It seems like your password dont match.');
    } else if (errors.length) {
      $('.error-field-last').html('<div class="error-icon">!</div>Some fields are not properly filled.');
    } else if (!referralReg.test($('[name="referral_token"]').val()) && !wrongReferral && $('[name="referral_token"]').val() !== '') {
      $('.error-field-last').html('<div class="error-icon">!</div>Your referral code is wrong.');
      $('.rs-section-registration-form button').html('Proceed to questionaire');
      $('.rs-section-registration-form button').attr('disabled', false);
      wrongReferral = true;
      return;
    } else {
      (0, _axios2.default)({
        method: 'post',
        url: 'https://rensource-api-eu.herokuapp.com/v1/onboarding',
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          user: formArray,
          redirect_url: 'http://staging.rs.testgebiet.com' + redirectUrl
        }
      }).then(function (data) {
        _jsCookie2.default.set('client', data.headers.client);
        _jsCookie2.default.set('uid', data.headers.uid);
        _jsCookie2.default.set('token', data.headers['access-token']);

        console.log(data);
        $contactForm.hide();
        $contactSuccess.show();

        var userWidth = $(window).outerWidth();

        if (userWidth < 767) {
          var formOffset = $('.rs-section-registration-success').offset().top;
          $('html, body').animate({
            scrollTop: formOffset - 100
          }, 800);
        }
      }).catch(function (error) {
        if (/\bEmail has already been taken\b/i.test(error.response.data.error)) {
          $('.error-field-last').html('<div class="error-icon">!</div>Email has already been taken.');
        } else {
          alert('Something went wrong. Please try again later.');
        }
      });
    }
  });

  function validateLastStep(fields) {
    var requiredFields = ['first_name', 'last_name', 'gender', 'email', 'email_confirmation', 'password', 'password_confirmation', 'subscription_tier'];
    var err = [];

    requiredFields.forEach(function (field) {
      if (!fields.hasOwnProperty(field)) {
        err.push(field);
      } // eslint-disable-line
    });

    return err;
  }

  /**
   * Dynamic GIF repeatition
   */
  var scrollPoints = [];
  $('.prevent').on('click', function (event) {
    return event.preventDefault();
  });

  if (!_ismobilejs2.default.any) {
    skrollr.init({ forceHeight: false });

    $('[data-gif-src]').each(function (i, el) {
      var element = $(el);
      var src = element.data('gif-src');
      var position = element.offset().top - 900;
      var config = { position: position, element: element, src: src };

      element.attr('src', src);
      element.css('display', 'none');

      scrollPoints.push(config);
    });
  } else {
    $('[data-gif-src]').each(function (i, el) {
      var element = $(el);
      var src = element.data('gif-src');

      element.attr('src', src);
      element.css('display', 'block');
    });
  }

  $(window).on('scroll', function () {
    var scrollTop = $(window).scrollTop();

    scrollPoints.forEach(function (_ref) {
      var position = _ref.position,
          src = _ref.src,
          element = _ref.element;

      if (scrollTop >= position) {
        element.css('display', 'block');
        if (element.attr('src') !== src) {
          element.attr('src', src);
        }
      } else {
        element.fadeOut(500, function () {
          return element.attr('src', src);
        });
      }
    });
  });

  /**
   * Collapse via Data attribute
   */

  $('[data-collapse]').each(function (index, element) {
    $(element).on('click', function (event) {
      event.stopPropagation();
      event.preventDefault();

      var currentTarget = event.currentTarget;

      var collapseClass = $(currentTarget).data('collapse');
      var condition = $(currentTarget).data('collapse-only');

      var hasCondition = function hasCondition() {
        return typeof condition !== 'undefined';
      };
      var metCondition = function metCondition() {
        return hasCondition() && $('body').width() < condition;
      };

      if (metCondition() || !hasCondition()) {
        $(element).toggleClass('active');
        $(collapseClass).slideToggle(250);
      }
    });
  });

  var currentHeadline = 0;
  var $headline = $('.rs-headline > span');
  $headline.css('display', 'inline-block');
  var headlines = ['Petrol & diesel bill keeps going up?', 'Want your fridge to run all day?', 'Inverter batteries dying quickly?', 'Solar systems are too expensive?', 'Worried about generator fumes?'];

  setInterval(function () {
    ++currentHeadline; // eslint-disable-line

    if (currentHeadline >= headlines.length) {
      currentHeadline = 0;
    }

    tickHeadline();
  }, 5000);

  function tickHeadline() {
    function step(now) {
      $headline.css('transform', 'rotateX(' + (90 - now * 90) + 'deg)');
    }

    function complete() {
      $headline.html(headlines[currentHeadline]);
      $headline.animate({ opacity: 1 }, { duration: 500, step: step });
    }

    $headline.animate({ opacity: 0 }, { duration: 500, step: step, complete: complete });
  }

  setTimeout(function () {
    $('.preloader').addClass('preloader--hidden');

    if ('hash' in window.location && window.location.hash !== '') {
      setTimeout(function () {
        var hash = window.location.hash;

        var element = document.querySelector(hash);

        if (element !== null) {
          zenscroll.to(element, 500);
        }
      }, 500);
    }
  }, 1300);

  var $teaser = $('.rs-section-teaser');
  var lightsClass = 'lights-turned-on';

  $('#turn-lights-on').waypoint({
    handler: function handler(dir) {
      $teaser.toggleClass(lightsClass, dir === 'down');
    }
  });

  $('.rs-section-distribution').waypoint({
    offset: 300,
    handler: function handler(dir) {
      $('.rs-section-distribution').toggleClass('in-viewport', dir === 'down');
    }
  });

  if ('devicePixelRatio' in window && window.devicePixelRatio === 2) {
    $('[data-retina]').each(function (index, element) {
      var src = element.src;
      src = src.replace(/\.(png|jpg|gif)+$/i, '@2x.$1');
      element.src = src; // eslint-disable-line
    });
  }

  $('#is_night').on('change', function daytimeChange() {
    var isNight = $(this).is(':checked');

    $('.rs-section-teaser').toggleClass('rs-section-teaser--night', isNight);
  });

  $('.iphone-slick').slick({
    fade: true,
    autoplay: true,
    autoplaySpeed: 2000,
    arrows: false
  });

  $('.rs-section-stories .slider').slick({
    dots: true,
    infinite: true,
    arrows: true,
    appendDots: $('.rs-section-stories .dots-container .container')
  });

  $('a:not([href^="http"], [href^="#"], [href^="mailto"])').on('click', function linkClick(event) {
    event.preventDefault();

    var $this = $(this);
    var link = $this.attr('href');

    $('.preloader').removeClass('preloader--hidden');
    zenscroll.toY(0, 500, function () {
      window.location.href = link;
    });
  });

  $(window).scroll(function scroll() {
    var st = $(this).scrollTop();
    $('.rs-header').toggleClass('rs-header--sticky', st > 0);
  });

  var subscriptionText = ['', '', '', ''];

  $('[data-overlay]').on('click', function onClick() {
    if (window.location.pathname === '/subscription') {
      var index = $(this).data('index');
      if (index === 0) {
        $('.Overlay p').html(subscriptionText[0]);
      } else if (index === 1) {
        $('.Overlay p').html(subscriptionText[1]);
      } else if (index === 2) {
        $('.Overlay p').html(subscriptionText[2]);
      } else if (index === 3) {
        $('.Overlay p').html(subscriptionText[3]);
      }
      // $('.Overlay p').html(subscriptionText[index]);
      $('.Overlay').addClass('active');
    } else {
      var image = $(this).find('div').attr('style');
      var name = $(this).find('b').html();
      var job = $(this).find('span').html();
      var text = $(this).find('p').html();

      $('.Overlay').addClass('active');

      $('.Overlay-Avatar').attr('style', image);
      $('.Overlay b').html(name);
      $('.Overlay span').html(job);
      $('.Overlay p').html(text);
    }
  });

  $('.Overlay-Close, .Overlay-BG').on('click', function () {
    $('.Overlay').removeClass('active');
  });

  $('.Filter-Item').on('click', function onClick() {
    var filterValue = $(this).attr('data-filter');
    filter.isotope({ filter: filterValue });

    $(this).addClass('active').siblings().removeClass('active');
  });

  var filter = $('.filter-content').isotope();

  $('.rs-header-nav_dropdown_holder span').on('mouseover', function () {
    $('.rs-header-nav_dropdown').addClass('active');
  });

  $('.rs-header-nav_dropdown_holder span').on('mouseleave', function () {
    $('.rs-header-nav_dropdown').removeClass('active');
  });

  if ($('.rs-section-interactive')) {
    var $interactiveSlider = $('.rs-section-interactive-slider');
    $interactiveSlider.slick({
      arrows: false,
      fade: true,
      speed: 800,
      initialSlide: 0,
      draggable: false,
      adaptiveHeight: true
    });

    $('.rs-section-interactive-item button[data-index="0"]').removeClass('button--outlineborder');
    $('.rs-section-interactive-item button[data-index="0"]').addClass('button--greenborder');
    $('.rs-section-interactive-item button[data-index="0"]').parent().next().css('opacity', 1);

    $('.rs-section-interactive-item button').on('click', function (event) {
      if (!$(event.currentTarget).hasClass('button--greenborder')) {
        $('.rs-section-interactive-item button').removeClass('button--greenborder');
        $('.rs-section-interactive-item button').addClass('button--outlineborder');
        $(event.currentTarget).removeClass('button--outlineborder');
        $(event.currentTarget).addClass('button--greenborder');
        $('.rs-section-interactive-item button').parent().next().css('opacity', 0.5);
        $(event.currentTarget).parent().next().css('opacity', 1);
      }

      var index = $(event.currentTarget).data('index');
      $interactiveSlider.slick('slickGoTo', index);
    });
  }
});

},{"axios":1,"form-serialize":26,"ismobilejs":28,"js-cookie":29}]},{},[31])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2FkYXB0ZXJzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWxUb2tlbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL2lzQ2FuY2VsLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0F4aW9zLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0ludGVyY2VwdG9yTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9jcmVhdGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9kaXNwYXRjaFJlcXVlc3QuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvZW5oYW5jZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3NldHRsZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS90cmFuc2Zvcm1EYXRhLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9iaW5kLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2J0b2EuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnVpbGRVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29tYmluZVVSTHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29va2llcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9pc0Fic29sdXRlVVJMLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3BhcnNlSGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9zcHJlYWQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2Zvcm0tc2VyaWFsaXplL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pc21vYmlsZWpzL2lzTW9iaWxlLmpzIiwibm9kZV9tb2R1bGVzL2pzLWNvb2tpZS9zcmMvanMuY29va2llLmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNvdXJjZS9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkxBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFQSxFQUFFLFFBQUYsRUFBWSxLQUFaLENBQWtCLFlBQU07QUFDdEIsTUFBTSxVQUFVLEVBQWhCO0FBQ0EsTUFBTSxZQUFZLG1CQUFRLEdBQVIsQ0FBWSxRQUFaLENBQWxCO0FBQ0EsTUFBTSxNQUFNLG1CQUFRLEdBQVIsQ0FBWSxLQUFaLENBQVo7QUFDQSxNQUFNLFFBQVEsbUJBQVEsR0FBUixDQUFZLE9BQVosQ0FBZDs7QUFFQSxNQUFJLGFBQWEsR0FBYixJQUFvQixLQUF4QixFQUErQjtBQUM3QixZQUFRLGNBQVIsSUFBMEIsS0FBMUI7QUFDQSxZQUFRLEdBQVIsR0FBYyxHQUFkO0FBQ0EsWUFBUSxNQUFSLEdBQWlCLFNBQWpCO0FBQ0Q7O0FBR0Q7Ozs7QUFJQSxJQUFFLHVCQUFGLEVBQTJCLEVBQTNCLENBQThCLE9BQTlCLEVBQXVDLFVBQUMsS0FBRCxFQUFXO0FBQ2hELFFBQU0sVUFBVSxFQUFFLE1BQU0sYUFBUixFQUF1QixJQUF2QixDQUE0QixnQkFBNUIsQ0FBaEI7O0FBRUE7QUFDQSxjQUFVLEVBQVYsQ0FBYSxTQUFTLGNBQVQsQ0FBd0Isa0JBQXhCLENBQWIsRUFBMEQsR0FBMUQ7O0FBRUE7QUFDQSxNQUFFLG1CQUFGLEVBQXVCLEdBQXZCLENBQTJCLE9BQTNCO0FBQ0EsTUFBRSxtQkFBRixFQUF1QixPQUF2QixDQUErQixRQUEvQjs7QUFFQTtBQUNBLE1BQUUsT0FBRixFQUFXLEtBQVg7QUFDRCxHQVpEOztBQWNBLE1BQUksb0JBQW9CLEtBQXhCO0FBQ0EsSUFBRSwrREFBRixFQUFtRSxFQUFuRSxDQUFzRSxRQUF0RSxFQUFnRixVQUFDLEtBQUQsRUFBVztBQUN6RixRQUFJLEVBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLE1BQWdDLEVBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLEdBQTZCLEtBQTdCLENBQW1DLE1BQW5DLENBQXBDLEVBQWdGO0FBQzlFLFFBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLENBQTJCLGVBQTNCLEVBQTRDLGVBQTVDO0FBQ0EsUUFBRSxtQkFBRixFQUF1QixJQUF2QixDQUE0QixzRUFBNUI7QUFDRCxLQUhELE1BR087QUFDTCxRQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixDQUEyQixlQUEzQixFQUE0QyxnQkFBNUM7QUFDQSxRQUFFLG1CQUFGLEVBQXVCLElBQXZCLENBQTRCLEVBQTVCO0FBQ0Q7QUFDRixHQVJEOztBQVVBLElBQUUsZ0NBQUYsRUFBb0MsRUFBcEMsQ0FBdUMsUUFBdkMsRUFBaUQsVUFBQyxLQUFELEVBQVc7QUFDMUQ7QUFDQTtBQUNBO0FBQ0EsUUFBSSxFQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixPQUFpQyxFQUFFLG1CQUFGLEVBQXVCLEdBQXZCLEVBQXJDLEVBQW1FO0FBQ2pFLFFBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLENBQTJCLGVBQTNCLEVBQTRDLGdCQUE1QztBQUNBLFFBQUUsbUJBQUYsRUFBdUIsR0FBdkIsQ0FBMkIsZUFBM0IsRUFBNEMsZ0JBQTVDO0FBQ0EsUUFBRSxtQkFBRixFQUF1QixJQUF2QixDQUE0QixFQUE1QjtBQUNELEtBSkQsTUFJTztBQUNMLFFBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLENBQTJCLGVBQTNCLEVBQTRDLGVBQTVDO0FBQ0EsUUFBRSxtQkFBRixFQUF1QixHQUF2QixDQUEyQixlQUEzQixFQUE0QyxlQUE1QztBQUNBLFFBQUUsbUJBQUYsRUFBdUIsSUFBdkIsQ0FBNEIsMkRBQTVCO0FBQ0Q7O0FBRUQsUUFBSSxFQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixHQUE2QixNQUE3QixJQUF1QyxDQUEzQyxFQUE4QztBQUM1QyxRQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixDQUEyQixlQUEzQixFQUE0QyxlQUE1QztBQUNBLFFBQUUsbUJBQUYsRUFBdUIsR0FBdkIsQ0FBMkIsZUFBM0IsRUFBNEMsZUFBNUM7QUFDQSxRQUFFLG1CQUFGLEVBQXVCLElBQXZCLENBQTRCLGlGQUE1QjtBQUNELEtBSkQsTUFJTyxJQUFJLEVBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLE9BQWlDLEVBQUUsbUJBQUYsRUFBdUIsR0FBdkIsRUFBckMsRUFBbUU7QUFDeEUsUUFBRSxtQkFBRixFQUF1QixJQUF2QixDQUE0QiwyREFBNUI7QUFDRDtBQUNGLEdBckJEOztBQXVCQSxJQUFFLDZCQUFGLEVBQWlDLEVBQWpDLENBQW9DLFFBQXBDLEVBQThDLFVBQUMsS0FBRCxFQUFXO0FBQ3ZELGFBQVMsYUFBVCxDQUF1QixJQUF2QixFQUE2QjtBQUM1QixVQUFJLDZhQUE2YSxJQUE3YSxDQUFrYixJQUFsYixDQUFKLEVBQTZiO0FBQzFiLGVBQVEsSUFBUjtBQUNEO0FBQ0QsYUFBUSxLQUFSO0FBQ0Q7O0FBR0QsUUFBSyxFQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixPQUFpQyxFQUFFLGdCQUFGLEVBQW9CLEdBQXBCLEVBQWxDLElBQWdFLGNBQWMsRUFBRSxNQUFNLGFBQVIsRUFBdUIsR0FBdkIsRUFBZCxDQUFwRSxFQUFpSDtBQUMvRyxRQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixDQUEyQixlQUEzQixFQUE0QyxnQkFBNUM7QUFDQSxRQUFFLGdCQUFGLEVBQW9CLEdBQXBCLENBQXdCLGVBQXhCLEVBQXlDLGdCQUF6QztBQUNBLFFBQUUsbUJBQUYsRUFBdUIsSUFBdkIsQ0FBNEIsRUFBNUI7QUFDRCxLQUpELE1BSU87QUFDTCxRQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixDQUEyQixlQUEzQixFQUE0QyxlQUE1QztBQUNBLFFBQUUsZ0JBQUYsRUFBb0IsR0FBcEIsQ0FBd0IsZUFBeEIsRUFBeUMsZUFBekM7QUFDQSxRQUFFLG1CQUFGLEVBQXVCLElBQXZCLENBQTRCLHdEQUE1QjtBQUNEO0FBQ0YsR0FsQkQ7QUFtQkE7QUFDQSxJQUFFLFdBQUYsRUFBZSxRQUFmLENBQXdCLFVBQVMsU0FBVCxFQUFtQjtBQUN6QyxNQUFFLFFBQUYsRUFBWSxJQUFaLENBQWlCLFlBQVk7QUFDM0IsUUFBRSxJQUFGLEVBQVEsSUFBUixDQUFhLFNBQWIsRUFBdUIsQ0FBdkIsRUFBMEIsT0FBMUIsQ0FBa0M7QUFDOUIsaUJBQVMsRUFBRSxJQUFGLEVBQVEsSUFBUjtBQURxQixPQUFsQyxFQUVHO0FBQ0Msa0JBQVUsSUFEWDtBQUVDLGdCQUFRLE9BRlQ7QUFHQyxjQUFNLGNBQVUsR0FBVixFQUFlO0FBQ2pCLFlBQUUsSUFBRixFQUFRLElBQVIsQ0FBYSxLQUFLLElBQUwsQ0FBVSxHQUFWLENBQWI7QUFDSDtBQUxGLE9BRkg7QUFTRCxLQVZEO0FBV0EsU0FBSyxPQUFMO0FBQ0QsR0FiRCxFQWFFO0FBQ0Q7QUFDQTtBQUNBLFlBQVE7QUFIUCxHQWJGO0FBa0JBO0FBQ0YsSUFBRSxhQUFGLEVBQWlCLElBQWpCLENBQXNCLFlBQVU7QUFBQyxRQUFJLENBQUo7QUFBQSxRQUFNLElBQUUsRUFBRSxJQUFGLENBQVI7QUFBQSxRQUFnQixJQUFFLEVBQUUsSUFBRixDQUFPLGNBQVAsQ0FBbEI7QUFBQSxRQUF5QyxJQUFFLEVBQUUsSUFBRixDQUFPLFFBQVAsQ0FBM0M7QUFBQSxRQUE0RCxJQUFFLENBQTlELENBQWdFLFNBQVMsQ0FBVCxDQUFXLENBQVgsRUFBYTtBQUFDLFVBQUksQ0FBSixFQUFNLENBQU4sQ0FBUSxLQUFJLEVBQUUsRUFBRixDQUFLLFdBQUwsS0FBbUIsTUFBSSxDQUF2QixLQUEyQixJQUFFLENBQUYsSUFBSyxJQUFFLE1BQUYsRUFBUyxJQUFFLE9BQWhCLEtBQTBCLElBQUUsT0FBRixFQUFVLElBQUUsTUFBdEMsR0FBOEMsRUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsT0FBVCxFQUFpQixNQUFLLENBQXRCLEVBQVosQ0FBOUMsRUFBb0YsRUFBRSxPQUFGLENBQVUsRUFBQyxNQUFLLENBQU4sRUFBVixFQUFtQixZQUFVO0FBQUMsVUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsTUFBVCxFQUFaLEdBQThCLEVBQUUsRUFBRixDQUFLLENBQUwsRUFBUSxHQUFSLENBQVksRUFBQyxNQUFLLENBQU4sRUFBWixDQUE5QixFQUFvRCxFQUFFLEdBQUYsQ0FBTSxFQUFDLE1BQUssQ0FBTixFQUFOLENBQXBELEVBQW9FLElBQUUsQ0FBdEU7QUFBd0UsT0FBdEcsQ0FBL0csQ0FBSjtBQUE0TixjQUFTLENBQVQsR0FBWTtBQUFDLG1CQUFhLENBQWIsR0FBZ0IsSUFBRSxXQUFXLFlBQVU7QUFBQyxZQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixPQUEvQyxFQUFnRCxHQUFoRCxDQUFsQjtBQUF1RSxPQUFFLHNCQUFGLEVBQTBCLEVBQTFCLENBQTZCLE9BQTdCLEVBQXFDLFlBQVU7QUFBQyxVQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixLQUF6RSxHQUEyRSxFQUFFLDBCQUFGLEVBQThCLEVBQTlCLENBQWlDLE9BQWpDLEVBQXlDLFlBQVU7QUFBQyxRQUFFLE1BQUksQ0FBSixHQUFNLElBQUUsQ0FBUixHQUFVLENBQVo7QUFBZSxLQUFuRSxDQUEzRSxFQUFnSixHQUFoSjtBQUFvSixHQUEzakI7O0FBRUksSUFBRSxhQUFGLEVBQWlCLElBQWpCLENBQXNCLFlBQVU7QUFBQyxRQUFJLENBQUo7QUFBQSxRQUFNLElBQUUsRUFBRSxJQUFGLENBQVI7QUFBQSxRQUFnQixJQUFFLEVBQUUsSUFBRixDQUFPLGNBQVAsQ0FBbEI7QUFBQSxRQUF5QyxJQUFFLEVBQUUsSUFBRixDQUFPLFFBQVAsQ0FBM0M7QUFBQSxRQUE0RCxJQUFFLENBQTlELENBQWdFLFNBQVMsQ0FBVCxDQUFXLENBQVgsRUFBYTtBQUFDLFVBQUksQ0FBSixFQUFNLENBQU4sQ0FBUSxLQUFJLEVBQUUsRUFBRixDQUFLLFdBQUwsS0FBbUIsTUFBSSxDQUF2QixLQUEyQixJQUFFLENBQUYsSUFBSyxJQUFFLE1BQUYsRUFBUyxJQUFFLE9BQWhCLEtBQTBCLElBQUUsT0FBRixFQUFVLElBQUUsTUFBdEMsR0FBOEMsRUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsT0FBVCxFQUFpQixNQUFLLENBQXRCLEVBQVosQ0FBOUMsRUFBb0YsRUFBRSxPQUFGLENBQVUsRUFBQyxNQUFLLENBQU4sRUFBVixFQUFtQixZQUFVO0FBQUMsVUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsTUFBVCxFQUFaLEdBQThCLEVBQUUsRUFBRixDQUFLLENBQUwsRUFBUSxHQUFSLENBQVksRUFBQyxNQUFLLENBQU4sRUFBWixDQUE5QixFQUFvRCxFQUFFLEdBQUYsQ0FBTSxFQUFDLE1BQUssQ0FBTixFQUFOLENBQXBELEVBQW9FLElBQUUsQ0FBdEU7QUFBd0UsT0FBdEcsQ0FBL0csQ0FBSjtBQUE0TixjQUFTLENBQVQsR0FBWTtBQUFDLG1CQUFhLENBQWIsR0FBZ0IsSUFBRSxXQUFXLFlBQVU7QUFBQyxZQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixPQUEvQyxFQUFnRCxHQUFoRCxDQUFsQjtBQUF1RSxPQUFFLHNCQUFGLEVBQTBCLEVBQTFCLENBQTZCLE9BQTdCLEVBQXFDLFlBQVU7QUFBQyxVQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixLQUF6RSxHQUEyRSxFQUFFLDBCQUFGLEVBQThCLEVBQTlCLENBQWlDLE9BQWpDLEVBQXlDLFlBQVU7QUFBQyxRQUFFLE1BQUksQ0FBSixHQUFNLElBQUUsQ0FBUixHQUFVLENBQVo7QUFBZSxLQUFuRSxDQUEzRSxFQUFnSixHQUFoSjtBQUFvSixHQUEzakI7O0FBRUEsSUFBRSxhQUFGLEVBQWlCLElBQWpCLENBQXNCLFlBQVU7QUFBQyxRQUFJLENBQUo7QUFBQSxRQUFNLElBQUUsRUFBRSxJQUFGLENBQVI7QUFBQSxRQUFnQixJQUFFLEVBQUUsSUFBRixDQUFPLGNBQVAsQ0FBbEI7QUFBQSxRQUF5QyxJQUFFLEVBQUUsSUFBRixDQUFPLFFBQVAsQ0FBM0M7QUFBQSxRQUE0RCxJQUFFLENBQTlELENBQWdFLFNBQVMsQ0FBVCxDQUFXLENBQVgsRUFBYTtBQUFDLFVBQUksQ0FBSixFQUFNLENBQU4sQ0FBUSxLQUFJLEVBQUUsRUFBRixDQUFLLFdBQUwsS0FBbUIsTUFBSSxDQUF2QixLQUEyQixJQUFFLENBQUYsSUFBSyxJQUFFLE1BQUYsRUFBUyxJQUFFLE9BQWhCLEtBQTBCLElBQUUsT0FBRixFQUFVLElBQUUsTUFBdEMsR0FBOEMsRUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsT0FBVCxFQUFpQixNQUFLLENBQXRCLEVBQVosQ0FBOUMsRUFBb0YsRUFBRSxPQUFGLENBQVUsRUFBQyxNQUFLLENBQU4sRUFBVixFQUFtQixZQUFVO0FBQUMsVUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsTUFBVCxFQUFaLEdBQThCLEVBQUUsRUFBRixDQUFLLENBQUwsRUFBUSxHQUFSLENBQVksRUFBQyxNQUFLLENBQU4sRUFBWixDQUE5QixFQUFvRCxFQUFFLEdBQUYsQ0FBTSxFQUFDLE1BQUssQ0FBTixFQUFOLENBQXBELEVBQW9FLElBQUUsQ0FBdEU7QUFBd0UsT0FBdEcsQ0FBL0csQ0FBSjtBQUE0TixjQUFTLENBQVQsR0FBWTtBQUFDLG1CQUFhLENBQWIsR0FBZ0IsSUFBRSxXQUFXLFlBQVU7QUFBQyxZQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixPQUEvQyxFQUFnRCxHQUFoRCxDQUFsQjtBQUF1RSxPQUFFLHNCQUFGLEVBQTBCLEVBQTFCLENBQTZCLE9BQTdCLEVBQXFDLFlBQVU7QUFBQyxVQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixLQUF6RSxHQUEyRSxFQUFFLDBCQUFGLEVBQThCLEVBQTlCLENBQWlDLE9BQWpDLEVBQXlDLFlBQVU7QUFBQyxRQUFFLE1BQUksQ0FBSixHQUFNLElBQUUsQ0FBUixHQUFVLENBQVo7QUFBZSxLQUFuRSxDQUEzRSxFQUFnSixHQUFoSjtBQUFvSixHQUEzakI7O0FBRUEsSUFBRSxZQUFGLEVBQWdCLElBQWhCLENBQXFCLFlBQVU7QUFBQyxRQUFJLENBQUo7QUFBQSxRQUFNLElBQUUsRUFBRSxJQUFGLENBQVI7QUFBQSxRQUFnQixJQUFFLEVBQUUsSUFBRixDQUFPLGNBQVAsQ0FBbEI7QUFBQSxRQUF5QyxJQUFFLEVBQUUsSUFBRixDQUFPLFFBQVAsQ0FBM0M7QUFBQSxRQUE0RCxJQUFFLENBQTlELENBQWdFLFNBQVMsQ0FBVCxDQUFXLENBQVgsRUFBYTtBQUFDLFVBQUksQ0FBSixFQUFNLENBQU4sQ0FBUSxLQUFJLEVBQUUsRUFBRixDQUFLLFdBQUwsS0FBbUIsTUFBSSxDQUF2QixLQUEyQixJQUFFLENBQUYsSUFBSyxJQUFFLE1BQUYsRUFBUyxJQUFFLE9BQWhCLEtBQTBCLElBQUUsT0FBRixFQUFVLElBQUUsTUFBdEMsR0FBOEMsRUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsT0FBVCxFQUFpQixNQUFLLENBQXRCLEVBQVosQ0FBOUMsRUFBb0YsRUFBRSxPQUFGLENBQVUsRUFBQyxNQUFLLENBQU4sRUFBVixFQUFtQixZQUFVO0FBQUMsVUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsTUFBVCxFQUFaLEdBQThCLEVBQUUsRUFBRixDQUFLLENBQUwsRUFBUSxHQUFSLENBQVksRUFBQyxNQUFLLENBQU4sRUFBWixDQUE5QixFQUFvRCxFQUFFLEdBQUYsQ0FBTSxFQUFDLE1BQUssQ0FBTixFQUFOLENBQXBELEVBQW9FLElBQUUsQ0FBdEU7QUFBd0UsT0FBdEcsQ0FBL0csQ0FBSjtBQUE0TixjQUFTLENBQVQsR0FBWTtBQUFDLG1CQUFhLENBQWIsR0FBZ0IsSUFBRSxXQUFXLFlBQVU7QUFBQyxZQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixPQUEvQyxFQUFnRCxHQUFoRCxDQUFsQjtBQUF1RSxPQUFFLHFCQUFGLEVBQXlCLEVBQXpCLENBQTRCLE9BQTVCLEVBQW9DLFlBQVU7QUFBQyxVQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixLQUF4RSxHQUEwRSxFQUFFLHlCQUFGLEVBQTZCLEVBQTdCLENBQWdDLE9BQWhDLEVBQXdDLFlBQVU7QUFBQyxRQUFFLE1BQUksQ0FBSixHQUFNLElBQUUsQ0FBUixHQUFVLENBQVo7QUFBZSxLQUFsRSxDQUExRSxFQUE4SSxHQUE5STtBQUFrSixHQUF4akI7O0FBRUEsSUFBRSxhQUFGLEVBQWlCLElBQWpCLENBQXNCLFlBQVU7QUFBQyxRQUFJLENBQUo7QUFBQSxRQUFNLElBQUUsRUFBRSxJQUFGLENBQVI7QUFBQSxRQUFnQixJQUFFLEVBQUUsSUFBRixDQUFPLGNBQVAsQ0FBbEI7QUFBQSxRQUF5QyxJQUFFLEVBQUUsSUFBRixDQUFPLFFBQVAsQ0FBM0M7QUFBQSxRQUE0RCxJQUFFLENBQTlELENBQWdFLFNBQVMsQ0FBVCxDQUFXLENBQVgsRUFBYTtBQUFDLFVBQUksQ0FBSixFQUFNLENBQU4sQ0FBUSxLQUFJLEVBQUUsRUFBRixDQUFLLFdBQUwsS0FBbUIsTUFBSSxDQUF2QixLQUEyQixJQUFFLENBQUYsSUFBSyxJQUFFLE1BQUYsRUFBUyxJQUFFLE9BQWhCLEtBQTBCLElBQUUsT0FBRixFQUFVLElBQUUsTUFBdEMsR0FBOEMsRUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsT0FBVCxFQUFpQixNQUFLLENBQXRCLEVBQVosQ0FBOUMsRUFBb0YsRUFBRSxPQUFGLENBQVUsRUFBQyxNQUFLLENBQU4sRUFBVixFQUFtQixZQUFVO0FBQUMsVUFBRSxFQUFGLENBQUssQ0FBTCxFQUFRLEdBQVIsQ0FBWSxFQUFDLFNBQVEsTUFBVCxFQUFaLEdBQThCLEVBQUUsRUFBRixDQUFLLENBQUwsRUFBUSxHQUFSLENBQVksRUFBQyxNQUFLLENBQU4sRUFBWixDQUE5QixFQUFvRCxFQUFFLEdBQUYsQ0FBTSxFQUFDLE1BQUssQ0FBTixFQUFOLENBQXBELEVBQW9FLElBQUUsQ0FBdEU7QUFBd0UsT0FBdEcsQ0FBL0csQ0FBSjtBQUE0TixjQUFTLENBQVQsR0FBWTtBQUFDLG1CQUFhLENBQWIsR0FBZ0IsSUFBRSxXQUFXLFlBQVU7QUFBQyxZQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixPQUEvQyxFQUFnRCxHQUFoRCxDQUFsQjtBQUF1RSxPQUFFLHNCQUFGLEVBQTBCLEVBQTFCLENBQTZCLE9BQTdCLEVBQXFDLFlBQVU7QUFBQyxVQUFFLEVBQUUsTUFBRixHQUFTLENBQVgsR0FBYSxFQUFFLElBQUUsQ0FBSixDQUFiLEdBQW9CLEVBQUUsQ0FBRixDQUFwQjtBQUF5QixLQUF6RSxHQUEyRSxFQUFFLDBCQUFGLEVBQThCLEVBQTlCLENBQWlDLE9BQWpDLEVBQXlDLFlBQVU7QUFBQyxRQUFFLE1BQUksQ0FBSixHQUFNLElBQUUsQ0FBUixHQUFVLENBQVo7QUFBZSxLQUFuRSxDQUEzRSxFQUFnSixHQUFoSjtBQUFvSixHQUEzakI7O0FBRUYsSUFBRSxnQkFBRixFQUFvQixFQUFwQixDQUF1QixRQUF2QixFQUFpQyxVQUFDLEtBQUQsRUFBVztBQUMxQyxhQUFTLGFBQVQsQ0FBdUIsSUFBdkIsRUFBNkI7QUFDNUIsVUFBSSw2YUFBNmEsSUFBN2EsQ0FBa2IsSUFBbGIsQ0FBSixFQUE2YjtBQUMxYixlQUFRLElBQVI7QUFDRDtBQUNELGFBQVEsS0FBUjtBQUNEOztBQUVELFFBQUksRUFBRSxNQUFNLGFBQVIsRUFBdUIsR0FBdkIsT0FBaUMsRUFBRSxnQkFBRixFQUFvQixHQUFwQixFQUFyQyxFQUFnRTtBQUM5RCxRQUFFLE1BQU0sYUFBUixFQUF1QixHQUF2QixDQUEyQixlQUEzQixFQUE0QyxnQkFBNUM7QUFDQSxRQUFFLGdCQUFGLEVBQW9CLEdBQXBCLENBQXdCLGVBQXhCLEVBQXlDLGdCQUF6QztBQUNELEtBSEQsTUFHTztBQUNMLFFBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLENBQTJCLGVBQTNCLEVBQTRDLGVBQTVDO0FBQ0EsUUFBRSxnQkFBRixFQUFvQixHQUFwQixDQUF3QixlQUF4QixFQUF5QyxlQUF6QztBQUNEOztBQUVELFFBQUksQ0FBQyxjQUFjLEVBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLEVBQWQsQ0FBTCxFQUFrRDtBQUNoRCxRQUFFLG1CQUFGLEVBQXVCLElBQXZCLENBQTRCLDREQUE1QjtBQUNBLFFBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLENBQTJCLGVBQTNCLEVBQTRDLGVBQTVDO0FBQ0EsUUFBRSxnQkFBRixFQUFvQixHQUFwQixDQUF3QixlQUF4QixFQUF5QyxlQUF6QztBQUNELEtBSkQsTUFJTztBQUNMLFFBQUUsTUFBTSxhQUFSLEVBQXVCLEdBQXZCLENBQTJCLGVBQTNCLEVBQTRDLGdCQUE1QztBQUNBLFFBQUUsZ0JBQUYsRUFBb0IsR0FBcEIsQ0FBd0IsZUFBeEIsRUFBeUMsZ0JBQXpDO0FBQ0EsUUFBRSxtQkFBRixFQUF1QixJQUF2QixDQUE0QixFQUE1QjtBQUNEO0FBQ0YsR0F6QkQ7O0FBMkJBLElBQUUsdUJBQUYsRUFBMkIsRUFBM0IsQ0FBOEIsUUFBOUIsRUFBd0MsVUFBQyxLQUFELEVBQVc7QUFDakQsUUFBTSxVQUFVLEVBQUUsTUFBTSxhQUFSLENBQWhCO0FBQ0EsUUFBTSxRQUFRLFFBQVEsR0FBUixFQUFkO0FBQ0EsUUFBTSxTQUFTLFFBQVEsTUFBUixHQUFpQixJQUFqQixHQUF3QixJQUF4QixDQUE2QixPQUE3QixDQUFmOztBQUVBLFFBQUksVUFBVSxPQUFkLEVBQXVCO0FBQ3JCLFFBQUUsTUFBTSxhQUFSLEVBQ0csTUFESCxHQUVHLFdBRkgsQ0FFZSxXQUZmLEVBR0csUUFISCxDQUdZLFVBSFo7O0FBS0EsUUFBRSxNQUFNLGFBQVIsRUFDRyxNQURILEdBRUcsSUFGSCxHQUdHLFdBSEgsQ0FHZSxRQUhmOztBQUtBLGFBQU8sS0FBUCxHQUFlLEdBQWYsQ0FBbUIsT0FBTyxHQUFQLEVBQW5COztBQUVBLDBCQUFvQixJQUFwQjtBQUNELEtBZEQsTUFjTztBQUNMLFVBQUksQ0FBQyxpQkFBTCxFQUF3Qjs7QUFFeEIsUUFBRSxNQUFNLGFBQVIsRUFDRyxNQURILEdBRUcsUUFGSCxDQUVZLFdBRlosRUFHRyxXQUhILENBR2UsVUFIZjs7QUFLQSxRQUFFLE1BQU0sYUFBUixFQUNHLE1BREgsR0FFRyxJQUZILEdBR0csUUFISCxDQUdZLFFBSFo7O0FBS0EsYUFBTyxHQUFQLENBQVcsRUFBWDs7QUFFQSwwQkFBb0IsS0FBcEI7QUFDRDtBQUNGLEdBcENEOztBQXNDQSxJQUFFLG1CQUFGLEVBQXVCLEVBQXZCLENBQTBCLFFBQTFCLEVBQW9DLFVBQUMsS0FBRCxFQUFXO0FBQzdDLFFBQU0sVUFBVSxFQUFFLE1BQU0sYUFBUixDQUFoQjtBQUNBLFFBQU0sUUFBUSxRQUFRLEdBQVIsRUFBZDs7QUFFQSxRQUFJLFVBQVUsSUFBZCxFQUFvQjtBQUNsQixRQUFFLHNCQUFGLEVBQTBCLElBQTFCLENBQStCLGFBQS9CO0FBQ0QsS0FGRCxNQUVPO0FBQ0w7QUFDQSxRQUFFLHNCQUFGLEVBQTBCLElBQTFCLENBQStCLGFBQS9CO0FBQ0Q7QUFDRixHQVZEOztBQVlBOzs7O0FBSUEsTUFBTSxpQkFBaUIsRUFBRSxpQ0FBRixDQUF2QjtBQUNBLE1BQU0sZUFBZSxFQUFFLCtCQUFGLENBQXJCO0FBQ0EsTUFBTSxrQkFBa0IsRUFBRSxrQ0FBRixDQUF4Qjs7QUFFQSxpQkFBZSxLQUFmLENBQXFCO0FBQ25CO0FBQ0EsWUFBUSxLQUZXO0FBR25CLGVBQVcsS0FIUTtBQUluQixvQkFBZ0I7QUFKRyxHQUFyQjs7QUFPQSxJQUFFLHNCQUFGLEVBQTBCLEVBQTFCLENBQTZCLE9BQTdCLEVBQXNDLFlBQU07QUFDMUMsUUFBSSxjQUFjLHNCQUFsQjs7QUFFQTtBQUNBO0FBQ0E7O0FBRUEseUJBQU07QUFDSixjQUFRLE1BREo7QUFFSixXQUFLLHlFQUZEO0FBR0osZUFBUztBQUNQLHdCQUFnQixrQkFEVDtBQUVQLHdCQUFnQixtQkFBUSxHQUFSLENBQVksT0FBWixDQUZUO0FBR1AsZ0JBQVEsbUJBQVEsR0FBUixDQUFZLFFBQVosQ0FIRDtBQUlQLGFBQUssbUJBQVEsR0FBUixDQUFZLEtBQVo7QUFKRSxPQUhMO0FBU0osWUFBTTtBQUNKLDJEQUFpRDtBQUQ3QztBQVRGLEtBQU4sRUFhQyxJQWJELENBYU0sVUFBUyxJQUFULEVBQWU7QUFDbkIsUUFBRSx5Q0FBRixFQUE2QyxJQUE3QyxDQUFrRCxVQUFsRCxFQUE4RCxJQUE5RDtBQUNBLFFBQUUseUNBQUYsRUFBNkMsSUFBN0MsQ0FBa0QsdUJBQWxEO0FBQ0QsS0FoQkQsRUFnQkcsS0FoQkgsQ0FnQlMsVUFBUyxLQUFULEVBQWdCO0FBQ3ZCLFlBQU0sK0NBQU47QUFDRCxLQWxCRDtBQW1CRCxHQTFCRDs7QUE0QkEsSUFBRSwrRUFBRixFQUFtRixFQUFuRixDQUFzRixRQUF0RixFQUFnRyxZQUFNO0FBQ3BHLFFBQU0sU0FBUyxTQUFTLGFBQVQsQ0FBdUIsK0JBQXZCLENBQWY7QUFDQSxRQUFNLE9BQU8sNkJBQVUsTUFBVixFQUFrQixJQUFsQixDQUFiO0FBQ0EsUUFBTSxTQUFTLGlCQUFpQixJQUFqQixDQUFmOztBQUVBLFFBQUksT0FBTyxNQUFYLEVBQW1CO0FBQ2pCLGFBQU8sS0FBUDtBQUNELEtBRkQsTUFFTztBQUNMLFFBQUUsc0JBQUYsRUFBMEIsSUFBMUIsQ0FBK0IsVUFBL0IsRUFBMkMsS0FBM0M7QUFDRDtBQUNGLEdBVkQ7O0FBWUEsTUFBSSxnQkFBZ0IsS0FBcEI7QUFDQSxpQkFBZSxFQUFmLENBQWtCLE9BQWxCLEVBQTJCLHNCQUEzQixFQUFtRCxVQUFDLEtBQUQsRUFBVztBQUM1RCxVQUFNLGNBQU47O0FBRUEsTUFBRSxzQ0FBRixFQUEwQyxJQUExQyxDQUErQyxVQUEvQyxFQUEyRCxJQUEzRDs7QUFFQSxRQUFNLFNBQVMsU0FBUyxhQUFULENBQXVCLCtCQUF2QixDQUFmO0FBQ0EsUUFBTSxPQUFPLDZCQUFVLE1BQVYsRUFBa0IsSUFBbEIsQ0FBYjtBQUNBLFFBQU0sU0FBUyxpQkFBaUIsSUFBakIsQ0FBZjs7QUFFQSxRQUFNLGFBQWEsT0FBTyxJQUFQLENBQVksSUFBWixFQUFrQixHQUFsQixDQUFzQixVQUFDLEdBQUQsRUFBUztBQUNoRCxVQUFNLGVBQWUsS0FBSyxHQUFMLEVBQVUsT0FBVixDQUFrQixLQUFsQixFQUF5QixLQUF6QixDQUFyQjtBQUNBLGFBQVUsR0FBVixTQUFpQixZQUFqQjtBQUNELEtBSGtCLEVBR2hCLElBSGdCLENBR1gsR0FIVyxDQUFuQjs7QUFLQSxhQUFTLFVBQVQsQ0FBb0IsR0FBcEIsRUFBeUI7QUFDdkIsVUFBSSxVQUFVLEVBQWQ7QUFDQSxVQUFJLFFBQVEsSUFBSSxTQUFKLENBQWMsSUFBSSxPQUFKLENBQVksR0FBWixJQUFtQixDQUFqQyxFQUFvQyxLQUFwQyxDQUEwQyxHQUExQyxDQUFaO0FBQ0EsV0FBSyxJQUFJLElBQUksQ0FBYixFQUFnQixJQUFJLE1BQU0sTUFBMUIsRUFBa0MsR0FBbEMsRUFBdUM7QUFDbkMsWUFBRyxDQUFDLE1BQU0sQ0FBTixDQUFKLEVBQ0k7QUFDSixZQUFJLE9BQU8sTUFBTSxDQUFOLEVBQVMsS0FBVCxDQUFlLEdBQWYsQ0FBWDtBQUNBLGdCQUFRLG1CQUFtQixLQUFLLENBQUwsQ0FBbkIsQ0FBUixJQUF1QyxtQkFBbUIsS0FBSyxDQUFMLENBQW5CLENBQXZDO0FBQ0g7QUFDRCxhQUFPLE9BQVA7QUFDRDs7QUFFRCxRQUFNLFlBQVksV0FBVyxVQUFYLENBQWxCOztBQUVBLGFBQVMsYUFBVCxDQUF1QixJQUF2QixFQUE2QjtBQUM1QixVQUFJLDZhQUE2YSxJQUE3YSxDQUFrYixJQUFsYixDQUFKLEVBQTZiO0FBQzFiLGVBQVEsSUFBUjtBQUNEO0FBQ0QsYUFBUSxLQUFSO0FBQ0Q7O0FBRUQsUUFBSSxjQUFjLHNCQUFsQjs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxRQUFNLGNBQWMsV0FBcEI7O0FBRUEsUUFBSSxDQUFDLGNBQWMsVUFBVSxLQUF4QixDQUFMLEVBQXFDO0FBQ25DLFFBQUUsbUJBQUYsRUFBdUIsSUFBdkIsQ0FBNEIsb0VBQTVCO0FBQ0QsS0FGRCxNQUVPLElBQUksVUFBVSxLQUFWLEtBQW9CLFVBQVUsa0JBQWxDLEVBQXNEO0FBQzNELFFBQUUsbUJBQUYsRUFBdUIsSUFBdkIsQ0FBNEIsc0VBQTVCO0FBQ0QsS0FGTSxNQUVBLElBQUksVUFBVSxRQUFWLEtBQXVCLFVBQVUscUJBQXJDLEVBQTREO0FBQ2pFLFFBQUUsbUJBQUYsRUFBdUIsSUFBdkIsQ0FBNEIsd0VBQTVCO0FBQ0QsS0FGTSxNQUVBLElBQUksT0FBTyxNQUFYLEVBQW1CO0FBQ3hCLFFBQUUsbUJBQUYsRUFBdUIsSUFBdkIsQ0FBNEIscUVBQTVCO0FBQ0QsS0FGTSxNQUVBLElBQUksQ0FBQyxZQUFZLElBQVosQ0FBaUIsRUFBRSx5QkFBRixFQUE2QixHQUE3QixFQUFqQixDQUFELElBQXlELENBQUMsYUFBMUQsSUFBMkUsRUFBRSx5QkFBRixFQUE2QixHQUE3QixPQUF1QyxFQUF0SCxFQUEwSDtBQUMvSCxRQUFFLG1CQUFGLEVBQXVCLElBQXZCLENBQTRCLDZEQUE1QjtBQUNBLFFBQUUsc0NBQUYsRUFBMEMsSUFBMUMsQ0FBK0MseUJBQS9DO0FBQ0EsUUFBRSxzQ0FBRixFQUEwQyxJQUExQyxDQUErQyxVQUEvQyxFQUEyRCxLQUEzRDtBQUNBLHNCQUFnQixJQUFoQjtBQUNBO0FBQ0QsS0FOTSxNQU1BO0FBQ0wsMkJBQU07QUFDSixnQkFBUSxNQURKO0FBRUosYUFBSyxzREFGRDtBQUdKLGlCQUFTO0FBQ1AsMEJBQWdCO0FBRFQsU0FITDtBQU1KLGNBQU07QUFDSixnQkFBTSxTQURGO0FBRUosNkRBQWlEO0FBRjdDO0FBTkYsT0FBTixFQVdDLElBWEQsQ0FXTSxVQUFTLElBQVQsRUFBZTtBQUNuQiwyQkFBUSxHQUFSLENBQVksUUFBWixFQUFzQixLQUFLLE9BQUwsQ0FBYSxNQUFuQztBQUNBLDJCQUFRLEdBQVIsQ0FBWSxLQUFaLEVBQW1CLEtBQUssT0FBTCxDQUFhLEdBQWhDO0FBQ0EsMkJBQVEsR0FBUixDQUFZLE9BQVosRUFBcUIsS0FBSyxPQUFMLENBQWEsY0FBYixDQUFyQjs7QUFFQSxnQkFBUSxHQUFSLENBQVksSUFBWjtBQUNBLHFCQUFhLElBQWI7QUFDQSx3QkFBZ0IsSUFBaEI7O0FBRUEsWUFBTSxZQUFZLEVBQUUsTUFBRixFQUFVLFVBQVYsRUFBbEI7O0FBRUEsWUFBSSxZQUFZLEdBQWhCLEVBQXFCO0FBQ25CLGNBQU0sYUFBYSxFQUFFLGtDQUFGLEVBQXNDLE1BQXRDLEdBQStDLEdBQWxFO0FBQ0EsWUFBRSxZQUFGLEVBQWdCLE9BQWhCLENBQXdCO0FBQ3RCLHVCQUFXLGFBQWE7QUFERixXQUF4QixFQUVHLEdBRkg7QUFHRDtBQUNGLE9BNUJELEVBNEJHLEtBNUJILENBNEJTLFVBQVMsS0FBVCxFQUFnQjtBQUN2QixZQUFJLG9DQUFvQyxJQUFwQyxDQUF5QyxNQUFNLFFBQU4sQ0FBZSxJQUFmLENBQW9CLEtBQTdELENBQUosRUFBeUU7QUFDdkUsWUFBRSxtQkFBRixFQUF1QixJQUF2QixDQUE0Qiw4REFBNUI7QUFDRCxTQUZELE1BRU87QUFDTCxnQkFBTSwrQ0FBTjtBQUNEO0FBQ0YsT0FsQ0Q7QUFtQ0Q7QUFDRixHQS9GRDs7QUFpR0EsV0FBUyxnQkFBVCxDQUEwQixNQUExQixFQUFrQztBQUNoQyxRQUFNLGlCQUFpQixDQUFDLFlBQUQsRUFBZSxXQUFmLEVBQTRCLFFBQTVCLEVBQXNDLE9BQXRDLEVBQStDLG9CQUEvQyxFQUFxRSxVQUFyRSxFQUFpRix1QkFBakYsRUFBMEcsbUJBQTFHLENBQXZCO0FBQ0EsUUFBTSxNQUFNLEVBQVo7O0FBRUEsbUJBQWUsT0FBZixDQUF1QixVQUFDLEtBQUQsRUFBVztBQUNoQyxVQUFJLENBQUMsT0FBTyxjQUFQLENBQXNCLEtBQXRCLENBQUwsRUFBbUM7QUFBRSxZQUFJLElBQUosQ0FBUyxLQUFUO0FBQWtCLE9BRHZCLENBQ3dCO0FBQ3pELEtBRkQ7O0FBSUEsV0FBTyxHQUFQO0FBQ0Q7O0FBRUQ7OztBQUdBLE1BQU0sZUFBZSxFQUFyQjtBQUNBLElBQUUsVUFBRixFQUFjLEVBQWQsQ0FBaUIsT0FBakIsRUFBMEI7QUFBQSxXQUFTLE1BQU0sY0FBTixFQUFUO0FBQUEsR0FBMUI7O0FBRUEsTUFBSSxDQUFDLHFCQUFTLEdBQWQsRUFBbUI7QUFDakIsWUFBUSxJQUFSLENBQWEsRUFBRSxhQUFhLEtBQWYsRUFBYjs7QUFFQSxNQUFFLGdCQUFGLEVBQW9CLElBQXBCLENBQXlCLFVBQUMsQ0FBRCxFQUFJLEVBQUosRUFBVztBQUNsQyxVQUFNLFVBQVUsRUFBRSxFQUFGLENBQWhCO0FBQ0EsVUFBTSxNQUFNLFFBQVEsSUFBUixDQUFhLFNBQWIsQ0FBWjtBQUNBLFVBQU0sV0FBVyxRQUFRLE1BQVIsR0FBaUIsR0FBakIsR0FBdUIsR0FBeEM7QUFDQSxVQUFNLFNBQVMsRUFBRSxrQkFBRixFQUFZLGdCQUFaLEVBQXFCLFFBQXJCLEVBQWY7O0FBRUEsY0FBUSxJQUFSLENBQWEsS0FBYixFQUFvQixHQUFwQjtBQUNBLGNBQVEsR0FBUixDQUFZLFNBQVosRUFBdUIsTUFBdkI7O0FBRUEsbUJBQWEsSUFBYixDQUFrQixNQUFsQjtBQUNELEtBVkQ7QUFXRCxHQWRELE1BY087QUFDTCxNQUFFLGdCQUFGLEVBQW9CLElBQXBCLENBQXlCLFVBQUMsQ0FBRCxFQUFJLEVBQUosRUFBVztBQUNsQyxVQUFNLFVBQVUsRUFBRSxFQUFGLENBQWhCO0FBQ0EsVUFBTSxNQUFNLFFBQVEsSUFBUixDQUFhLFNBQWIsQ0FBWjs7QUFFQSxjQUFRLElBQVIsQ0FBYSxLQUFiLEVBQW9CLEdBQXBCO0FBQ0EsY0FBUSxHQUFSLENBQVksU0FBWixFQUF1QixPQUF2QjtBQUNELEtBTkQ7QUFPRDs7QUFFRCxJQUFFLE1BQUYsRUFBVSxFQUFWLENBQWEsUUFBYixFQUF1QixZQUFNO0FBQzNCLFFBQU0sWUFBWSxFQUFFLE1BQUYsRUFBVSxTQUFWLEVBQWxCOztBQUVBLGlCQUFhLE9BQWIsQ0FBcUIsZ0JBQWdDO0FBQUEsVUFBN0IsUUFBNkIsUUFBN0IsUUFBNkI7QUFBQSxVQUFuQixHQUFtQixRQUFuQixHQUFtQjtBQUFBLFVBQWQsT0FBYyxRQUFkLE9BQWM7O0FBQ25ELFVBQUksYUFBYSxRQUFqQixFQUEyQjtBQUN6QixnQkFBUSxHQUFSLENBQVksU0FBWixFQUF1QixPQUF2QjtBQUNBLFlBQUksUUFBUSxJQUFSLENBQWEsS0FBYixNQUF3QixHQUE1QixFQUFpQztBQUFFLGtCQUFRLElBQVIsQ0FBYSxLQUFiLEVBQW9CLEdBQXBCO0FBQTJCO0FBQy9ELE9BSEQsTUFHTztBQUNMLGdCQUFRLE9BQVIsQ0FBZ0IsR0FBaEIsRUFBcUI7QUFBQSxpQkFBTSxRQUFRLElBQVIsQ0FBYSxLQUFiLEVBQW9CLEdBQXBCLENBQU47QUFBQSxTQUFyQjtBQUNEO0FBQ0YsS0FQRDtBQVFELEdBWEQ7O0FBYUE7Ozs7QUFJQSxJQUFFLGlCQUFGLEVBQXFCLElBQXJCLENBQTBCLFVBQUMsS0FBRCxFQUFRLE9BQVIsRUFBb0I7QUFDNUMsTUFBRSxPQUFGLEVBQVcsRUFBWCxDQUFjLE9BQWQsRUFBdUIsVUFBQyxLQUFELEVBQVc7QUFDaEMsWUFBTSxlQUFOO0FBQ0EsWUFBTSxjQUFOOztBQUZnQyxVQUl4QixhQUp3QixHQUlOLEtBSk0sQ0FJeEIsYUFKd0I7O0FBS2hDLFVBQU0sZ0JBQWdCLEVBQUUsYUFBRixFQUFpQixJQUFqQixDQUFzQixVQUF0QixDQUF0QjtBQUNBLFVBQU0sWUFBWSxFQUFFLGFBQUYsRUFBaUIsSUFBakIsQ0FBc0IsZUFBdEIsQ0FBbEI7O0FBRUEsVUFBTSxlQUFlLFNBQWYsWUFBZTtBQUFBLGVBQU0sT0FBTyxTQUFQLEtBQXFCLFdBQTNCO0FBQUEsT0FBckI7QUFDQSxVQUFNLGVBQWUsU0FBZixZQUFlO0FBQUEsZUFBTSxrQkFBa0IsRUFBRSxNQUFGLEVBQVUsS0FBVixLQUFvQixTQUE1QztBQUFBLE9BQXJCOztBQUVBLFVBQUksa0JBQWtCLENBQUMsY0FBdkIsRUFBdUM7QUFDckMsVUFBRSxPQUFGLEVBQVcsV0FBWCxDQUF1QixRQUF2QjtBQUNBLFVBQUUsYUFBRixFQUFpQixXQUFqQixDQUE2QixHQUE3QjtBQUNEO0FBQ0YsS0FmRDtBQWdCRCxHQWpCRDs7QUFtQkEsTUFBSSxrQkFBa0IsQ0FBdEI7QUFDQSxNQUFNLFlBQVksRUFBRSxxQkFBRixDQUFsQjtBQUNBLFlBQVUsR0FBVixDQUFjLFNBQWQsRUFBeUIsY0FBekI7QUFDQSxNQUFNLFlBQVksQ0FDaEIsc0NBRGdCLEVBRWhCLGtDQUZnQixFQUdoQixtQ0FIZ0IsRUFJaEIsa0NBSmdCLEVBS2hCLGdDQUxnQixDQUFsQjs7QUFRQSxjQUFZLFlBQU07QUFDaEIsTUFBRSxlQUFGLENBRGdCLENBQ0U7O0FBRWxCLFFBQUksbUJBQW1CLFVBQVUsTUFBakMsRUFBeUM7QUFDdkMsd0JBQWtCLENBQWxCO0FBQ0Q7O0FBRUQ7QUFDRCxHQVJELEVBUUcsSUFSSDs7QUFVQSxXQUFTLFlBQVQsR0FBd0I7QUFDdEIsYUFBUyxJQUFULENBQWMsR0FBZCxFQUFtQjtBQUNqQixnQkFBVSxHQUFWLENBQWMsV0FBZCxnQkFBc0MsS0FBTSxNQUFNLEVBQWxEO0FBQ0Q7O0FBRUQsYUFBUyxRQUFULEdBQW9CO0FBQ2xCLGdCQUFVLElBQVYsQ0FBZSxVQUFVLGVBQVYsQ0FBZjtBQUNBLGdCQUFVLE9BQVYsQ0FBa0IsRUFBRSxTQUFTLENBQVgsRUFBbEIsRUFBa0MsRUFBRSxVQUFVLEdBQVosRUFBaUIsVUFBakIsRUFBbEM7QUFDRDs7QUFFRCxjQUFVLE9BQVYsQ0FBa0IsRUFBRSxTQUFTLENBQVgsRUFBbEIsRUFBa0MsRUFBRSxVQUFVLEdBQVosRUFBaUIsVUFBakIsRUFBdUIsa0JBQXZCLEVBQWxDO0FBQ0Q7O0FBRUQsYUFBVyxZQUFNO0FBQ2YsTUFBRSxZQUFGLEVBQWdCLFFBQWhCLENBQXlCLG1CQUF6Qjs7QUFFQSxRQUFJLFVBQVUsT0FBTyxRQUFqQixJQUE2QixPQUFPLFFBQVAsQ0FBZ0IsSUFBaEIsS0FBeUIsRUFBMUQsRUFBOEQ7QUFDNUQsaUJBQVcsWUFBTTtBQUFBLFlBQ1AsSUFETyxHQUNFLE9BQU8sUUFEVCxDQUNQLElBRE87O0FBRWYsWUFBTSxVQUFVLFNBQVMsYUFBVCxDQUF1QixJQUF2QixDQUFoQjs7QUFFQSxZQUFJLFlBQVksSUFBaEIsRUFBc0I7QUFBRSxvQkFBVSxFQUFWLENBQWEsT0FBYixFQUFzQixHQUF0QjtBQUE0QjtBQUNyRCxPQUxELEVBS0csR0FMSDtBQU1EO0FBQ0YsR0FYRCxFQVdHLElBWEg7O0FBYUEsTUFBTSxVQUFVLEVBQUUsb0JBQUYsQ0FBaEI7QUFDQSxNQUFNLGNBQWMsa0JBQXBCOztBQUVBLElBQUUsaUJBQUYsRUFBcUIsUUFBckIsQ0FBOEI7QUFDNUIsV0FENEIsbUJBQ3BCLEdBRG9CLEVBQ2Y7QUFBRSxjQUFRLFdBQVIsQ0FBb0IsV0FBcEIsRUFBaUMsUUFBUSxNQUF6QztBQUFrRDtBQURyQyxHQUE5Qjs7QUFJQSxJQUFFLDBCQUFGLEVBQThCLFFBQTlCLENBQXVDO0FBQ3JDLFlBQVEsR0FENkI7QUFFckMsV0FGcUMsbUJBRTdCLEdBRjZCLEVBRXhCO0FBQ1gsUUFBRSwwQkFBRixFQUE4QixXQUE5QixDQUEwQyxhQUExQyxFQUF5RCxRQUFRLE1BQWpFO0FBQ0Q7QUFKb0MsR0FBdkM7O0FBT0EsTUFBSSxzQkFBc0IsTUFBdEIsSUFBZ0MsT0FBTyxnQkFBUCxLQUE0QixDQUFoRSxFQUFtRTtBQUNqRSxNQUFFLGVBQUYsRUFBbUIsSUFBbkIsQ0FBd0IsVUFBQyxLQUFELEVBQVEsT0FBUixFQUFvQjtBQUMxQyxVQUFJLE1BQU0sUUFBUSxHQUFsQjtBQUNBLFlBQU0sSUFBSSxPQUFKLENBQVksb0JBQVosRUFBa0MsUUFBbEMsQ0FBTjtBQUNBLGNBQVEsR0FBUixHQUFjLEdBQWQsQ0FIMEMsQ0FHeEI7QUFDbkIsS0FKRDtBQUtEOztBQUVELElBQUUsV0FBRixFQUFlLEVBQWYsQ0FBa0IsUUFBbEIsRUFBNEIsU0FBUyxhQUFULEdBQXlCO0FBQ25ELFFBQU0sVUFBVSxFQUFFLElBQUYsRUFBUSxFQUFSLENBQVcsVUFBWCxDQUFoQjs7QUFFQSxNQUFFLG9CQUFGLEVBQXdCLFdBQXhCLENBQW9DLDBCQUFwQyxFQUFnRSxPQUFoRTtBQUNELEdBSkQ7O0FBTUEsSUFBRSxlQUFGLEVBQW1CLEtBQW5CLENBQXlCO0FBQ3ZCLFVBQU0sSUFEaUI7QUFFdkIsY0FBVSxJQUZhO0FBR3ZCLG1CQUFlLElBSFE7QUFJdkIsWUFBUTtBQUplLEdBQXpCOztBQU9BLElBQUUsNkJBQUYsRUFBaUMsS0FBakMsQ0FBdUM7QUFDckMsVUFBTSxJQUQrQjtBQUVyQyxjQUFVLElBRjJCO0FBR3JDLFlBQVEsSUFINkI7QUFJckMsZ0JBQVksRUFBRSxnREFBRjtBQUp5QixHQUF2Qzs7QUFPQSxJQUFFLHNEQUFGLEVBQTBELEVBQTFELENBQTZELE9BQTdELEVBQXNFLFNBQVMsU0FBVCxDQUFtQixLQUFuQixFQUEwQjtBQUM5RixVQUFNLGNBQU47O0FBRUEsUUFBTSxRQUFRLEVBQUUsSUFBRixDQUFkO0FBQ0EsUUFBTSxPQUFPLE1BQU0sSUFBTixDQUFXLE1BQVgsQ0FBYjs7QUFFQSxNQUFFLFlBQUYsRUFBZ0IsV0FBaEIsQ0FBNEIsbUJBQTVCO0FBQ0EsY0FBVSxHQUFWLENBQWMsQ0FBZCxFQUFpQixHQUFqQixFQUFzQixZQUFNO0FBQzFCLGFBQU8sUUFBUCxDQUFnQixJQUFoQixHQUF1QixJQUF2QjtBQUNELEtBRkQ7QUFHRCxHQVZEOztBQVlBLElBQUUsTUFBRixFQUFVLE1BQVYsQ0FBaUIsU0FBUyxNQUFULEdBQWtCO0FBQ2pDLFFBQU0sS0FBSyxFQUFFLElBQUYsRUFBUSxTQUFSLEVBQVg7QUFDQSxNQUFFLFlBQUYsRUFBZ0IsV0FBaEIsQ0FBNEIsbUJBQTVCLEVBQWlELEtBQUssQ0FBdEQ7QUFDRCxHQUhEOztBQUtBLE1BQU0sbUJBQW1CLENBQ3ZCLEVBRHVCLEVBRXZCLEVBRnVCLEVBR3ZCLEVBSHVCLEVBSXZCLEVBSnVCLENBQXpCOztBQU9BLElBQUUsZ0JBQUYsRUFBb0IsRUFBcEIsQ0FBdUIsT0FBdkIsRUFBZ0MsU0FBUyxPQUFULEdBQW1CO0FBQ2pELFFBQUksT0FBTyxRQUFQLENBQWdCLFFBQWhCLEtBQTZCLGVBQWpDLEVBQWtEO0FBQ2hELFVBQU0sUUFBUSxFQUFFLElBQUYsRUFBUSxJQUFSLENBQWEsT0FBYixDQUFkO0FBQ0EsVUFBSSxVQUFVLENBQWQsRUFBaUI7QUFDZixVQUFFLFlBQUYsRUFBZ0IsSUFBaEIsQ0FBcUIsaUJBQWlCLENBQWpCLENBQXJCO0FBQ0QsT0FGRCxNQUVPLElBQUksVUFBVSxDQUFkLEVBQWlCO0FBQ3RCLFVBQUUsWUFBRixFQUFnQixJQUFoQixDQUFxQixpQkFBaUIsQ0FBakIsQ0FBckI7QUFDRCxPQUZNLE1BRUEsSUFBSSxVQUFVLENBQWQsRUFBaUI7QUFDdEIsVUFBRSxZQUFGLEVBQWdCLElBQWhCLENBQXFCLGlCQUFpQixDQUFqQixDQUFyQjtBQUNELE9BRk0sTUFFQSxJQUFJLFVBQVUsQ0FBZCxFQUFpQjtBQUN0QixVQUFFLFlBQUYsRUFBZ0IsSUFBaEIsQ0FBcUIsaUJBQWlCLENBQWpCLENBQXJCO0FBQ0Q7QUFDRDtBQUNBLFFBQUUsVUFBRixFQUFjLFFBQWQsQ0FBdUIsUUFBdkI7QUFDRCxLQWJELE1BYU87QUFDTCxVQUFNLFFBQVEsRUFBRSxJQUFGLEVBQVEsSUFBUixDQUFhLEtBQWIsRUFBb0IsSUFBcEIsQ0FBeUIsT0FBekIsQ0FBZDtBQUNBLFVBQU0sT0FBTyxFQUFFLElBQUYsRUFBUSxJQUFSLENBQWEsR0FBYixFQUFrQixJQUFsQixFQUFiO0FBQ0EsVUFBTSxNQUFNLEVBQUUsSUFBRixFQUFRLElBQVIsQ0FBYSxNQUFiLEVBQXFCLElBQXJCLEVBQVo7QUFDQSxVQUFNLE9BQU8sRUFBRSxJQUFGLEVBQVEsSUFBUixDQUFhLEdBQWIsRUFBa0IsSUFBbEIsRUFBYjs7QUFFQSxRQUFFLFVBQUYsRUFBYyxRQUFkLENBQXVCLFFBQXZCOztBQUVBLFFBQUUsaUJBQUYsRUFBcUIsSUFBckIsQ0FBMEIsT0FBMUIsRUFBbUMsS0FBbkM7QUFDQSxRQUFFLFlBQUYsRUFBZ0IsSUFBaEIsQ0FBcUIsSUFBckI7QUFDQSxRQUFFLGVBQUYsRUFBbUIsSUFBbkIsQ0FBd0IsR0FBeEI7QUFDQSxRQUFFLFlBQUYsRUFBZ0IsSUFBaEIsQ0FBcUIsSUFBckI7QUFDRDtBQUNGLEdBM0JEOztBQTZCQSxJQUFFLDZCQUFGLEVBQWlDLEVBQWpDLENBQW9DLE9BQXBDLEVBQTZDLFlBQU07QUFDakQsTUFBRSxVQUFGLEVBQWMsV0FBZCxDQUEwQixRQUExQjtBQUNELEdBRkQ7O0FBSUEsSUFBRSxjQUFGLEVBQWtCLEVBQWxCLENBQXFCLE9BQXJCLEVBQThCLFNBQVMsT0FBVCxHQUFtQjtBQUMvQyxRQUFNLGNBQWMsRUFBRSxJQUFGLEVBQVEsSUFBUixDQUFhLGFBQWIsQ0FBcEI7QUFDQSxXQUFPLE9BQVAsQ0FBZSxFQUFFLFFBQVEsV0FBVixFQUFmOztBQUVBLE1BQUUsSUFBRixFQUNHLFFBREgsQ0FDWSxRQURaLEVBRUcsUUFGSCxHQUdHLFdBSEgsQ0FHZSxRQUhmO0FBSUQsR0FSRDs7QUFVQSxNQUFJLFNBQVMsRUFBRSxpQkFBRixFQUFxQixPQUFyQixFQUFiOztBQUVBLElBQUUscUNBQUYsRUFBeUMsRUFBekMsQ0FBNEMsV0FBNUMsRUFBeUQsWUFBTTtBQUM3RCxNQUFFLHlCQUFGLEVBQTZCLFFBQTdCLENBQXNDLFFBQXRDO0FBQ0QsR0FGRDs7QUFJQSxJQUFFLHFDQUFGLEVBQXlDLEVBQXpDLENBQTRDLFlBQTVDLEVBQTBELFlBQU07QUFDOUQsTUFBRSx5QkFBRixFQUE2QixXQUE3QixDQUF5QyxRQUF6QztBQUNELEdBRkQ7O0FBSUEsTUFBSSxFQUFFLHlCQUFGLENBQUosRUFBa0M7QUFDaEMsUUFBTSxxQkFBcUIsRUFBRSxnQ0FBRixDQUEzQjtBQUNBLHVCQUFtQixLQUFuQixDQUF5QjtBQUN2QixjQUFRLEtBRGU7QUFFdkIsWUFBTSxJQUZpQjtBQUd2QixhQUFPLEdBSGdCO0FBSXZCLG9CQUFjLENBSlM7QUFLdkIsaUJBQVcsS0FMWTtBQU12QixzQkFBZ0I7QUFOTyxLQUF6Qjs7QUFTQSxNQUFFLHFEQUFGLEVBQXlELFdBQXpELENBQXFFLHVCQUFyRTtBQUNBLE1BQUUscURBQUYsRUFBeUQsUUFBekQsQ0FBa0UscUJBQWxFO0FBQ0EsTUFBRSxxREFBRixFQUF5RCxNQUF6RCxHQUFrRSxJQUFsRSxHQUF5RSxHQUF6RSxDQUE2RSxTQUE3RSxFQUF3RixDQUF4Rjs7QUFFQSxNQUFFLHFDQUFGLEVBQXlDLEVBQXpDLENBQTRDLE9BQTVDLEVBQXFELFVBQUMsS0FBRCxFQUFXO0FBQzlELFVBQUksQ0FBQyxFQUFFLE1BQU0sYUFBUixFQUF1QixRQUF2QixDQUFnQyxxQkFBaEMsQ0FBTCxFQUE2RDtBQUMzRCxVQUFFLHFDQUFGLEVBQXlDLFdBQXpDLENBQXFELHFCQUFyRDtBQUNBLFVBQUUscUNBQUYsRUFBeUMsUUFBekMsQ0FBa0QsdUJBQWxEO0FBQ0EsVUFBRSxNQUFNLGFBQVIsRUFBdUIsV0FBdkIsQ0FBbUMsdUJBQW5DO0FBQ0EsVUFBRSxNQUFNLGFBQVIsRUFBdUIsUUFBdkIsQ0FBZ0MscUJBQWhDO0FBQ0EsVUFBRSxxQ0FBRixFQUF5QyxNQUF6QyxHQUFrRCxJQUFsRCxHQUF5RCxHQUF6RCxDQUE2RCxTQUE3RCxFQUF3RSxHQUF4RTtBQUNBLFVBQUUsTUFBTSxhQUFSLEVBQXVCLE1BQXZCLEdBQWdDLElBQWhDLEdBQXVDLEdBQXZDLENBQTJDLFNBQTNDLEVBQXNELENBQXREO0FBQ0Q7O0FBRUQsVUFBTSxRQUFRLEVBQUUsTUFBTSxhQUFSLEVBQXVCLElBQXZCLENBQTRCLE9BQTVCLENBQWQ7QUFDQSx5QkFBbUIsS0FBbkIsQ0FBeUIsV0FBekIsRUFBc0MsS0FBdEM7QUFDRCxLQVpEO0FBYUQ7QUFDRixDQXhtQkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL2F4aW9zJyk7IiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgc2V0dGxlID0gcmVxdWlyZSgnLi8uLi9jb3JlL3NldHRsZScpO1xudmFyIGJ1aWxkVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J1aWxkVVJMJyk7XG52YXIgcGFyc2VIZWFkZXJzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL3BhcnNlSGVhZGVycycpO1xudmFyIGlzVVJMU2FtZU9yaWdpbiA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9pc1VSTFNhbWVPcmlnaW4nKTtcbnZhciBjcmVhdGVFcnJvciA9IHJlcXVpcmUoJy4uL2NvcmUvY3JlYXRlRXJyb3InKTtcbnZhciBidG9hID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIHdpbmRvdy5idG9hICYmIHdpbmRvdy5idG9hLmJpbmQod2luZG93KSkgfHwgcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2J0b2EnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB4aHJBZGFwdGVyKGNvbmZpZykge1xuICByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gZGlzcGF0Y2hYaHJSZXF1ZXN0KHJlc29sdmUsIHJlamVjdCkge1xuICAgIHZhciByZXF1ZXN0RGF0YSA9IGNvbmZpZy5kYXRhO1xuICAgIHZhciByZXF1ZXN0SGVhZGVycyA9IGNvbmZpZy5oZWFkZXJzO1xuXG4gICAgaWYgKHV0aWxzLmlzRm9ybURhdGEocmVxdWVzdERhdGEpKSB7XG4gICAgICBkZWxldGUgcmVxdWVzdEhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddOyAvLyBMZXQgdGhlIGJyb3dzZXIgc2V0IGl0XG4gICAgfVxuXG4gICAgdmFyIHJlcXVlc3QgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICB2YXIgbG9hZEV2ZW50ID0gJ29ucmVhZHlzdGF0ZWNoYW5nZSc7XG4gICAgdmFyIHhEb21haW4gPSBmYWxzZTtcblxuICAgIC8vIEZvciBJRSA4LzkgQ09SUyBzdXBwb3J0XG4gICAgLy8gT25seSBzdXBwb3J0cyBQT1NUIGFuZCBHRVQgY2FsbHMgYW5kIGRvZXNuJ3QgcmV0dXJucyB0aGUgcmVzcG9uc2UgaGVhZGVycy5cbiAgICAvLyBET04nVCBkbyB0aGlzIGZvciB0ZXN0aW5nIGIvYyBYTUxIdHRwUmVxdWVzdCBpcyBtb2NrZWQsIG5vdCBYRG9tYWluUmVxdWVzdC5cbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICd0ZXN0JyAmJlxuICAgICAgICB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICB3aW5kb3cuWERvbWFpblJlcXVlc3QgJiYgISgnd2l0aENyZWRlbnRpYWxzJyBpbiByZXF1ZXN0KSAmJlxuICAgICAgICAhaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSB7XG4gICAgICByZXF1ZXN0ID0gbmV3IHdpbmRvdy5YRG9tYWluUmVxdWVzdCgpO1xuICAgICAgbG9hZEV2ZW50ID0gJ29ubG9hZCc7XG4gICAgICB4RG9tYWluID0gdHJ1ZTtcbiAgICAgIHJlcXVlc3Qub25wcm9ncmVzcyA9IGZ1bmN0aW9uIGhhbmRsZVByb2dyZXNzKCkge307XG4gICAgICByZXF1ZXN0Lm9udGltZW91dCA9IGZ1bmN0aW9uIGhhbmRsZVRpbWVvdXQoKSB7fTtcbiAgICB9XG5cbiAgICAvLyBIVFRQIGJhc2ljIGF1dGhlbnRpY2F0aW9uXG4gICAgaWYgKGNvbmZpZy5hdXRoKSB7XG4gICAgICB2YXIgdXNlcm5hbWUgPSBjb25maWcuYXV0aC51c2VybmFtZSB8fCAnJztcbiAgICAgIHZhciBwYXNzd29yZCA9IGNvbmZpZy5hdXRoLnBhc3N3b3JkIHx8ICcnO1xuICAgICAgcmVxdWVzdEhlYWRlcnMuQXV0aG9yaXphdGlvbiA9ICdCYXNpYyAnICsgYnRvYSh1c2VybmFtZSArICc6JyArIHBhc3N3b3JkKTtcbiAgICB9XG5cbiAgICByZXF1ZXN0Lm9wZW4oY29uZmlnLm1ldGhvZC50b1VwcGVyQ2FzZSgpLCBidWlsZFVSTChjb25maWcudXJsLCBjb25maWcucGFyYW1zLCBjb25maWcucGFyYW1zU2VyaWFsaXplciksIHRydWUpO1xuXG4gICAgLy8gU2V0IHRoZSByZXF1ZXN0IHRpbWVvdXQgaW4gTVNcbiAgICByZXF1ZXN0LnRpbWVvdXQgPSBjb25maWcudGltZW91dDtcblxuICAgIC8vIExpc3RlbiBmb3IgcmVhZHkgc3RhdGVcbiAgICByZXF1ZXN0W2xvYWRFdmVudF0gPSBmdW5jdGlvbiBoYW5kbGVMb2FkKCkge1xuICAgICAgaWYgKCFyZXF1ZXN0IHx8IChyZXF1ZXN0LnJlYWR5U3RhdGUgIT09IDQgJiYgIXhEb21haW4pKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gVGhlIHJlcXVlc3QgZXJyb3JlZCBvdXQgYW5kIHdlIGRpZG4ndCBnZXQgYSByZXNwb25zZSwgdGhpcyB3aWxsIGJlXG4gICAgICAvLyBoYW5kbGVkIGJ5IG9uZXJyb3IgaW5zdGVhZFxuICAgICAgLy8gV2l0aCBvbmUgZXhjZXB0aW9uOiByZXF1ZXN0IHRoYXQgdXNpbmcgZmlsZTogcHJvdG9jb2wsIG1vc3QgYnJvd3NlcnNcbiAgICAgIC8vIHdpbGwgcmV0dXJuIHN0YXR1cyBhcyAwIGV2ZW4gdGhvdWdoIGl0J3MgYSBzdWNjZXNzZnVsIHJlcXVlc3RcbiAgICAgIGlmIChyZXF1ZXN0LnN0YXR1cyA9PT0gMCAmJiAhKHJlcXVlc3QucmVzcG9uc2VVUkwgJiYgcmVxdWVzdC5yZXNwb25zZVVSTC5pbmRleE9mKCdmaWxlOicpID09PSAwKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIC8vIFByZXBhcmUgdGhlIHJlc3BvbnNlXG4gICAgICB2YXIgcmVzcG9uc2VIZWFkZXJzID0gJ2dldEFsbFJlc3BvbnNlSGVhZGVycycgaW4gcmVxdWVzdCA/IHBhcnNlSGVhZGVycyhyZXF1ZXN0LmdldEFsbFJlc3BvbnNlSGVhZGVycygpKSA6IG51bGw7XG4gICAgICB2YXIgcmVzcG9uc2VEYXRhID0gIWNvbmZpZy5yZXNwb25zZVR5cGUgfHwgY29uZmlnLnJlc3BvbnNlVHlwZSA9PT0gJ3RleHQnID8gcmVxdWVzdC5yZXNwb25zZVRleHQgOiByZXF1ZXN0LnJlc3BvbnNlO1xuICAgICAgdmFyIHJlc3BvbnNlID0ge1xuICAgICAgICBkYXRhOiByZXNwb25zZURhdGEsXG4gICAgICAgIC8vIElFIHNlbmRzIDEyMjMgaW5zdGVhZCBvZiAyMDQgKGh0dHBzOi8vZ2l0aHViLmNvbS9heGlvcy9heGlvcy9pc3N1ZXMvMjAxKVxuICAgICAgICBzdGF0dXM6IHJlcXVlc3Quc3RhdHVzID09PSAxMjIzID8gMjA0IDogcmVxdWVzdC5zdGF0dXMsXG4gICAgICAgIHN0YXR1c1RleHQ6IHJlcXVlc3Quc3RhdHVzID09PSAxMjIzID8gJ05vIENvbnRlbnQnIDogcmVxdWVzdC5zdGF0dXNUZXh0LFxuICAgICAgICBoZWFkZXJzOiByZXNwb25zZUhlYWRlcnMsXG4gICAgICAgIGNvbmZpZzogY29uZmlnLFxuICAgICAgICByZXF1ZXN0OiByZXF1ZXN0XG4gICAgICB9O1xuXG4gICAgICBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCByZXNwb25zZSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBIYW5kbGUgbG93IGxldmVsIG5ldHdvcmsgZXJyb3JzXG4gICAgcmVxdWVzdC5vbmVycm9yID0gZnVuY3Rpb24gaGFuZGxlRXJyb3IoKSB7XG4gICAgICAvLyBSZWFsIGVycm9ycyBhcmUgaGlkZGVuIGZyb20gdXMgYnkgdGhlIGJyb3dzZXJcbiAgICAgIC8vIG9uZXJyb3Igc2hvdWxkIG9ubHkgZmlyZSBpZiBpdCdzIGEgbmV0d29yayBlcnJvclxuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCdOZXR3b3JrIEVycm9yJywgY29uZmlnLCBudWxsLCByZXF1ZXN0KSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBIYW5kbGUgdGltZW91dFxuICAgIHJlcXVlc3Qub250aW1lb3V0ID0gZnVuY3Rpb24gaGFuZGxlVGltZW91dCgpIHtcbiAgICAgIHJlamVjdChjcmVhdGVFcnJvcigndGltZW91dCBvZiAnICsgY29uZmlnLnRpbWVvdXQgKyAnbXMgZXhjZWVkZWQnLCBjb25maWcsICdFQ09OTkFCT1JURUQnLFxuICAgICAgICByZXF1ZXN0KSk7XG5cbiAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgIHJlcXVlc3QgPSBudWxsO1xuICAgIH07XG5cbiAgICAvLyBBZGQgeHNyZiBoZWFkZXJcbiAgICAvLyBUaGlzIGlzIG9ubHkgZG9uZSBpZiBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciBlbnZpcm9ubWVudC5cbiAgICAvLyBTcGVjaWZpY2FsbHkgbm90IGlmIHdlJ3JlIGluIGEgd2ViIHdvcmtlciwgb3IgcmVhY3QtbmF0aXZlLlxuICAgIGlmICh1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpKSB7XG4gICAgICB2YXIgY29va2llcyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9jb29raWVzJyk7XG5cbiAgICAgIC8vIEFkZCB4c3JmIGhlYWRlclxuICAgICAgdmFyIHhzcmZWYWx1ZSA9IChjb25maWcud2l0aENyZWRlbnRpYWxzIHx8IGlzVVJMU2FtZU9yaWdpbihjb25maWcudXJsKSkgJiYgY29uZmlnLnhzcmZDb29raWVOYW1lID9cbiAgICAgICAgICBjb29raWVzLnJlYWQoY29uZmlnLnhzcmZDb29raWVOYW1lKSA6XG4gICAgICAgICAgdW5kZWZpbmVkO1xuXG4gICAgICBpZiAoeHNyZlZhbHVlKSB7XG4gICAgICAgIHJlcXVlc3RIZWFkZXJzW2NvbmZpZy54c3JmSGVhZGVyTmFtZV0gPSB4c3JmVmFsdWU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQWRkIGhlYWRlcnMgdG8gdGhlIHJlcXVlc3RcbiAgICBpZiAoJ3NldFJlcXVlc3RIZWFkZXInIGluIHJlcXVlc3QpIHtcbiAgICAgIHV0aWxzLmZvckVhY2gocmVxdWVzdEhlYWRlcnMsIGZ1bmN0aW9uIHNldFJlcXVlc3RIZWFkZXIodmFsLCBrZXkpIHtcbiAgICAgICAgaWYgKHR5cGVvZiByZXF1ZXN0RGF0YSA9PT0gJ3VuZGVmaW5lZCcgJiYga2V5LnRvTG93ZXJDYXNlKCkgPT09ICdjb250ZW50LXR5cGUnKSB7XG4gICAgICAgICAgLy8gUmVtb3ZlIENvbnRlbnQtVHlwZSBpZiBkYXRhIGlzIHVuZGVmaW5lZFxuICAgICAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1trZXldO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIE90aGVyd2lzZSBhZGQgaGVhZGVyIHRvIHRoZSByZXF1ZXN0XG4gICAgICAgICAgcmVxdWVzdC5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgdmFsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgLy8gQWRkIHdpdGhDcmVkZW50aWFscyB0byByZXF1ZXN0IGlmIG5lZWRlZFxuICAgIGlmIChjb25maWcud2l0aENyZWRlbnRpYWxzKSB7XG4gICAgICByZXF1ZXN0LndpdGhDcmVkZW50aWFscyA9IHRydWU7XG4gICAgfVxuXG4gICAgLy8gQWRkIHJlc3BvbnNlVHlwZSB0byByZXF1ZXN0IGlmIG5lZWRlZFxuICAgIGlmIChjb25maWcucmVzcG9uc2VUeXBlKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1ZXN0LnJlc3BvbnNlVHlwZSA9IGNvbmZpZy5yZXNwb25zZVR5cGU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEV4cGVjdGVkIERPTUV4Y2VwdGlvbiB0aHJvd24gYnkgYnJvd3NlcnMgbm90IGNvbXBhdGlibGUgWE1MSHR0cFJlcXVlc3QgTGV2ZWwgMi5cbiAgICAgICAgLy8gQnV0LCB0aGlzIGNhbiBiZSBzdXBwcmVzc2VkIGZvciAnanNvbicgdHlwZSBhcyBpdCBjYW4gYmUgcGFyc2VkIGJ5IGRlZmF1bHQgJ3RyYW5zZm9ybVJlc3BvbnNlJyBmdW5jdGlvbi5cbiAgICAgICAgaWYgKGNvbmZpZy5yZXNwb25zZVR5cGUgIT09ICdqc29uJykge1xuICAgICAgICAgIHRocm93IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBIYW5kbGUgcHJvZ3Jlc3MgaWYgbmVlZGVkXG4gICAgaWYgKHR5cGVvZiBjb25maWcub25Eb3dubG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICByZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgY29uZmlnLm9uRG93bmxvYWRQcm9ncmVzcyk7XG4gICAgfVxuXG4gICAgLy8gTm90IGFsbCBicm93c2VycyBzdXBwb3J0IHVwbG9hZCBldmVudHNcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzID09PSAnZnVuY3Rpb24nICYmIHJlcXVlc3QudXBsb2FkKSB7XG4gICAgICByZXF1ZXN0LnVwbG9hZC5hZGRFdmVudExpc3RlbmVyKCdwcm9ncmVzcycsIGNvbmZpZy5vblVwbG9hZFByb2dyZXNzKTtcbiAgICB9XG5cbiAgICBpZiAoY29uZmlnLmNhbmNlbFRva2VuKSB7XG4gICAgICAvLyBIYW5kbGUgY2FuY2VsbGF0aW9uXG4gICAgICBjb25maWcuY2FuY2VsVG9rZW4ucHJvbWlzZS50aGVuKGZ1bmN0aW9uIG9uQ2FuY2VsZWQoY2FuY2VsKSB7XG4gICAgICAgIGlmICghcmVxdWVzdCkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlcXVlc3QuYWJvcnQoKTtcbiAgICAgICAgcmVqZWN0KGNhbmNlbCk7XG4gICAgICAgIC8vIENsZWFuIHVwIHJlcXVlc3RcbiAgICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZiAocmVxdWVzdERhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmVxdWVzdERhdGEgPSBudWxsO1xuICAgIH1cblxuICAgIC8vIFNlbmQgdGhlIHJlcXVlc3RcbiAgICByZXF1ZXN0LnNlbmQocmVxdWVzdERhdGEpO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBiaW5kID0gcmVxdWlyZSgnLi9oZWxwZXJzL2JpbmQnKTtcbnZhciBBeGlvcyA9IHJlcXVpcmUoJy4vY29yZS9BeGlvcycpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi9kZWZhdWx0cycpO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBpbnN0YW5jZSBvZiBBeGlvc1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0Q29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXG4gKiBAcmV0dXJuIHtBeGlvc30gQSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqL1xuZnVuY3Rpb24gY3JlYXRlSW5zdGFuY2UoZGVmYXVsdENvbmZpZykge1xuICB2YXIgY29udGV4dCA9IG5ldyBBeGlvcyhkZWZhdWx0Q29uZmlnKTtcbiAgdmFyIGluc3RhbmNlID0gYmluZChBeGlvcy5wcm90b3R5cGUucmVxdWVzdCwgY29udGV4dCk7XG5cbiAgLy8gQ29weSBheGlvcy5wcm90b3R5cGUgdG8gaW5zdGFuY2VcbiAgdXRpbHMuZXh0ZW5kKGluc3RhbmNlLCBBeGlvcy5wcm90b3R5cGUsIGNvbnRleHQpO1xuXG4gIC8vIENvcHkgY29udGV4dCB0byBpbnN0YW5jZVxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIGNvbnRleHQpO1xuXG4gIHJldHVybiBpbnN0YW5jZTtcbn1cblxuLy8gQ3JlYXRlIHRoZSBkZWZhdWx0IGluc3RhbmNlIHRvIGJlIGV4cG9ydGVkXG52YXIgYXhpb3MgPSBjcmVhdGVJbnN0YW5jZShkZWZhdWx0cyk7XG5cbi8vIEV4cG9zZSBBeGlvcyBjbGFzcyB0byBhbGxvdyBjbGFzcyBpbmhlcml0YW5jZVxuYXhpb3MuQXhpb3MgPSBBeGlvcztcblxuLy8gRmFjdG9yeSBmb3IgY3JlYXRpbmcgbmV3IGluc3RhbmNlc1xuYXhpb3MuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKGluc3RhbmNlQ29uZmlnKSB7XG4gIHJldHVybiBjcmVhdGVJbnN0YW5jZSh1dGlscy5tZXJnZShkZWZhdWx0cywgaW5zdGFuY2VDb25maWcpKTtcbn07XG5cbi8vIEV4cG9zZSBDYW5jZWwgJiBDYW5jZWxUb2tlblxuYXhpb3MuQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsJyk7XG5heGlvcy5DYW5jZWxUb2tlbiA9IHJlcXVpcmUoJy4vY2FuY2VsL0NhbmNlbFRva2VuJyk7XG5heGlvcy5pc0NhbmNlbCA9IHJlcXVpcmUoJy4vY2FuY2VsL2lzQ2FuY2VsJyk7XG5cbi8vIEV4cG9zZSBhbGwvc3ByZWFkXG5heGlvcy5hbGwgPSBmdW5jdGlvbiBhbGwocHJvbWlzZXMpIHtcbiAgcmV0dXJuIFByb21pc2UuYWxsKHByb21pc2VzKTtcbn07XG5heGlvcy5zcHJlYWQgPSByZXF1aXJlKCcuL2hlbHBlcnMvc3ByZWFkJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gYXhpb3M7XG5cbi8vIEFsbG93IHVzZSBvZiBkZWZhdWx0IGltcG9ydCBzeW50YXggaW4gVHlwZVNjcmlwdFxubW9kdWxlLmV4cG9ydHMuZGVmYXVsdCA9IGF4aW9zO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEEgYENhbmNlbGAgaXMgYW4gb2JqZWN0IHRoYXQgaXMgdGhyb3duIHdoZW4gYW4gb3BlcmF0aW9uIGlzIGNhbmNlbGVkLlxuICpcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtzdHJpbmc9fSBtZXNzYWdlIFRoZSBtZXNzYWdlLlxuICovXG5mdW5jdGlvbiBDYW5jZWwobWVzc2FnZSkge1xuICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xufVxuXG5DYW5jZWwucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gIHJldHVybiAnQ2FuY2VsJyArICh0aGlzLm1lc3NhZ2UgPyAnOiAnICsgdGhpcy5tZXNzYWdlIDogJycpO1xufTtcblxuQ2FuY2VsLnByb3RvdHlwZS5fX0NBTkNFTF9fID0gdHJ1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSBDYW5jZWw7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBDYW5jZWwgPSByZXF1aXJlKCcuL0NhbmNlbCcpO1xuXG4vKipcbiAqIEEgYENhbmNlbFRva2VuYCBpcyBhbiBvYmplY3QgdGhhdCBjYW4gYmUgdXNlZCB0byByZXF1ZXN0IGNhbmNlbGxhdGlvbiBvZiBhbiBvcGVyYXRpb24uXG4gKlxuICogQGNsYXNzXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBleGVjdXRvciBUaGUgZXhlY3V0b3IgZnVuY3Rpb24uXG4gKi9cbmZ1bmN0aW9uIENhbmNlbFRva2VuKGV4ZWN1dG9yKSB7XG4gIGlmICh0eXBlb2YgZXhlY3V0b3IgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdleGVjdXRvciBtdXN0IGJlIGEgZnVuY3Rpb24uJyk7XG4gIH1cblxuICB2YXIgcmVzb2x2ZVByb21pc2U7XG4gIHRoaXMucHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIHByb21pc2VFeGVjdXRvcihyZXNvbHZlKSB7XG4gICAgcmVzb2x2ZVByb21pc2UgPSByZXNvbHZlO1xuICB9KTtcblxuICB2YXIgdG9rZW4gPSB0aGlzO1xuICBleGVjdXRvcihmdW5jdGlvbiBjYW5jZWwobWVzc2FnZSkge1xuICAgIGlmICh0b2tlbi5yZWFzb24pIHtcbiAgICAgIC8vIENhbmNlbGxhdGlvbiBoYXMgYWxyZWFkeSBiZWVuIHJlcXVlc3RlZFxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHRva2VuLnJlYXNvbiA9IG5ldyBDYW5jZWwobWVzc2FnZSk7XG4gICAgcmVzb2x2ZVByb21pc2UodG9rZW4ucmVhc29uKTtcbiAgfSk7XG59XG5cbi8qKlxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cbiAqL1xuQ2FuY2VsVG9rZW4ucHJvdG90eXBlLnRocm93SWZSZXF1ZXN0ZWQgPSBmdW5jdGlvbiB0aHJvd0lmUmVxdWVzdGVkKCkge1xuICBpZiAodGhpcy5yZWFzb24pIHtcbiAgICB0aHJvdyB0aGlzLnJlYXNvbjtcbiAgfVxufTtcblxuLyoqXG4gKiBSZXR1cm5zIGFuIG9iamVjdCB0aGF0IGNvbnRhaW5zIGEgbmV3IGBDYW5jZWxUb2tlbmAgYW5kIGEgZnVuY3Rpb24gdGhhdCwgd2hlbiBjYWxsZWQsXG4gKiBjYW5jZWxzIHRoZSBgQ2FuY2VsVG9rZW5gLlxuICovXG5DYW5jZWxUb2tlbi5zb3VyY2UgPSBmdW5jdGlvbiBzb3VyY2UoKSB7XG4gIHZhciBjYW5jZWw7XG4gIHZhciB0b2tlbiA9IG5ldyBDYW5jZWxUb2tlbihmdW5jdGlvbiBleGVjdXRvcihjKSB7XG4gICAgY2FuY2VsID0gYztcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgdG9rZW46IHRva2VuLFxuICAgIGNhbmNlbDogY2FuY2VsXG4gIH07XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbmNlbFRva2VuO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQ2FuY2VsKHZhbHVlKSB7XG4gIHJldHVybiAhISh2YWx1ZSAmJiB2YWx1ZS5fX0NBTkNFTF9fKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkZWZhdWx0cyA9IHJlcXVpcmUoJy4vLi4vZGVmYXVsdHMnKTtcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBJbnRlcmNlcHRvck1hbmFnZXIgPSByZXF1aXJlKCcuL0ludGVyY2VwdG9yTWFuYWdlcicpO1xudmFyIGRpc3BhdGNoUmVxdWVzdCA9IHJlcXVpcmUoJy4vZGlzcGF0Y2hSZXF1ZXN0Jyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGluc3RhbmNlIG9mIEF4aW9zXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGluc3RhbmNlQ29uZmlnIFRoZSBkZWZhdWx0IGNvbmZpZyBmb3IgdGhlIGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIEF4aW9zKGluc3RhbmNlQ29uZmlnKSB7XG4gIHRoaXMuZGVmYXVsdHMgPSBpbnN0YW5jZUNvbmZpZztcbiAgdGhpcy5pbnRlcmNlcHRvcnMgPSB7XG4gICAgcmVxdWVzdDogbmV3IEludGVyY2VwdG9yTWFuYWdlcigpLFxuICAgIHJlc3BvbnNlOiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKClcbiAgfTtcbn1cblxuLyoqXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcgc3BlY2lmaWMgZm9yIHRoaXMgcmVxdWVzdCAobWVyZ2VkIHdpdGggdGhpcy5kZWZhdWx0cylcbiAqL1xuQXhpb3MucHJvdG90eXBlLnJlcXVlc3QgPSBmdW5jdGlvbiByZXF1ZXN0KGNvbmZpZykge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgLy8gQWxsb3cgZm9yIGF4aW9zKCdleGFtcGxlL3VybCdbLCBjb25maWddKSBhIGxhIGZldGNoIEFQSVxuICBpZiAodHlwZW9mIGNvbmZpZyA9PT0gJ3N0cmluZycpIHtcbiAgICBjb25maWcgPSB1dGlscy5tZXJnZSh7XG4gICAgICB1cmw6IGFyZ3VtZW50c1swXVxuICAgIH0sIGFyZ3VtZW50c1sxXSk7XG4gIH1cblxuICBjb25maWcgPSB1dGlscy5tZXJnZShkZWZhdWx0cywgdGhpcy5kZWZhdWx0cywgeyBtZXRob2Q6ICdnZXQnIH0sIGNvbmZpZyk7XG4gIGNvbmZpZy5tZXRob2QgPSBjb25maWcubWV0aG9kLnRvTG93ZXJDYXNlKCk7XG5cbiAgLy8gSG9vayB1cCBpbnRlcmNlcHRvcnMgbWlkZGxld2FyZVxuICB2YXIgY2hhaW4gPSBbZGlzcGF0Y2hSZXF1ZXN0LCB1bmRlZmluZWRdO1xuICB2YXIgcHJvbWlzZSA9IFByb21pc2UucmVzb2x2ZShjb25maWcpO1xuXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlcXVlc3QuZm9yRWFjaChmdW5jdGlvbiB1bnNoaWZ0UmVxdWVzdEludGVyY2VwdG9ycyhpbnRlcmNlcHRvcikge1xuICAgIGNoYWluLnVuc2hpZnQoaW50ZXJjZXB0b3IuZnVsZmlsbGVkLCBpbnRlcmNlcHRvci5yZWplY3RlZCk7XG4gIH0pO1xuXG4gIHRoaXMuaW50ZXJjZXB0b3JzLnJlc3BvbnNlLmZvckVhY2goZnVuY3Rpb24gcHVzaFJlc3BvbnNlSW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XG4gICAgY2hhaW4ucHVzaChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcbiAgfSk7XG5cbiAgd2hpbGUgKGNoYWluLmxlbmd0aCkge1xuICAgIHByb21pc2UgPSBwcm9taXNlLnRoZW4oY2hhaW4uc2hpZnQoKSwgY2hhaW4uc2hpZnQoKSk7XG4gIH1cblxuICByZXR1cm4gcHJvbWlzZTtcbn07XG5cbi8vIFByb3ZpZGUgYWxpYXNlcyBmb3Igc3VwcG9ydGVkIHJlcXVlc3QgbWV0aG9kc1xudXRpbHMuZm9yRWFjaChbJ2RlbGV0ZScsICdnZXQnLCAnaGVhZCcsICdvcHRpb25zJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XG4gIC8qZXNsaW50IGZ1bmMtbmFtZXM6MCovXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KHV0aWxzLm1lcmdlKGNvbmZpZyB8fCB7fSwge1xuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICB1cmw6IHVybFxuICAgIH0pKTtcbiAgfTtcbn0pO1xuXG51dGlscy5mb3JFYWNoKFsncG9zdCcsICdwdXQnLCAncGF0Y2gnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZFdpdGhEYXRhKG1ldGhvZCkge1xuICAvKmVzbGludCBmdW5jLW5hbWVzOjAqL1xuICBBeGlvcy5wcm90b3R5cGVbbWV0aG9kXSA9IGZ1bmN0aW9uKHVybCwgZGF0YSwgY29uZmlnKSB7XG4gICAgcmV0dXJuIHRoaXMucmVxdWVzdCh1dGlscy5tZXJnZShjb25maWcgfHwge30sIHtcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgdXJsOiB1cmwsXG4gICAgICBkYXRhOiBkYXRhXG4gICAgfSkpO1xuICB9O1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gQXhpb3M7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gSW50ZXJjZXB0b3JNYW5hZ2VyKCkge1xuICB0aGlzLmhhbmRsZXJzID0gW107XG59XG5cbi8qKlxuICogQWRkIGEgbmV3IGludGVyY2VwdG9yIHRvIHRoZSBzdGFja1xuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bGZpbGxlZCBUaGUgZnVuY3Rpb24gdG8gaGFuZGxlIGB0aGVuYCBmb3IgYSBgUHJvbWlzZWBcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHJlamVjdGAgZm9yIGEgYFByb21pc2VgXG4gKlxuICogQHJldHVybiB7TnVtYmVyfSBBbiBJRCB1c2VkIHRvIHJlbW92ZSBpbnRlcmNlcHRvciBsYXRlclxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIHVzZShmdWxmaWxsZWQsIHJlamVjdGVkKSB7XG4gIHRoaXMuaGFuZGxlcnMucHVzaCh7XG4gICAgZnVsZmlsbGVkOiBmdWxmaWxsZWQsXG4gICAgcmVqZWN0ZWQ6IHJlamVjdGVkXG4gIH0pO1xuICByZXR1cm4gdGhpcy5oYW5kbGVycy5sZW5ndGggLSAxO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gaW50ZXJjZXB0b3IgZnJvbSB0aGUgc3RhY2tcbiAqXG4gKiBAcGFyYW0ge051bWJlcn0gaWQgVGhlIElEIHRoYXQgd2FzIHJldHVybmVkIGJ5IGB1c2VgXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUuZWplY3QgPSBmdW5jdGlvbiBlamVjdChpZCkge1xuICBpZiAodGhpcy5oYW5kbGVyc1tpZF0pIHtcbiAgICB0aGlzLmhhbmRsZXJzW2lkXSA9IG51bGw7XG4gIH1cbn07XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGFsbCB0aGUgcmVnaXN0ZXJlZCBpbnRlcmNlcHRvcnNcbiAqXG4gKiBUaGlzIG1ldGhvZCBpcyBwYXJ0aWN1bGFybHkgdXNlZnVsIGZvciBza2lwcGluZyBvdmVyIGFueVxuICogaW50ZXJjZXB0b3JzIHRoYXQgbWF5IGhhdmUgYmVjb21lIGBudWxsYCBjYWxsaW5nIGBlamVjdGAuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGZ1bmN0aW9uIHRvIGNhbGwgZm9yIGVhY2ggaW50ZXJjZXB0b3JcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5mb3JFYWNoID0gZnVuY3Rpb24gZm9yRWFjaChmbikge1xuICB1dGlscy5mb3JFYWNoKHRoaXMuaGFuZGxlcnMsIGZ1bmN0aW9uIGZvckVhY2hIYW5kbGVyKGgpIHtcbiAgICBpZiAoaCAhPT0gbnVsbCkge1xuICAgICAgZm4oaCk7XG4gICAgfVxuICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gSW50ZXJjZXB0b3JNYW5hZ2VyO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW5oYW5jZUVycm9yID0gcmVxdWlyZSgnLi9lbmhhbmNlRXJyb3InKTtcblxuLyoqXG4gKiBDcmVhdGUgYW4gRXJyb3Igd2l0aCB0aGUgc3BlY2lmaWVkIG1lc3NhZ2UsIGNvbmZpZywgZXJyb3IgY29kZSwgcmVxdWVzdCBhbmQgcmVzcG9uc2UuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG1lc3NhZ2UgVGhlIGVycm9yIG1lc3NhZ2UuXG4gKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIFRoZSBjb25maWcuXG4gKiBAcGFyYW0ge3N0cmluZ30gW2NvZGVdIFRoZSBlcnJvciBjb2RlIChmb3IgZXhhbXBsZSwgJ0VDT05OQUJPUlRFRCcpLlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXF1ZXN0XSBUaGUgcmVxdWVzdC5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVzcG9uc2VdIFRoZSByZXNwb25zZS5cbiAqIEByZXR1cm5zIHtFcnJvcn0gVGhlIGNyZWF0ZWQgZXJyb3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY3JlYXRlRXJyb3IobWVzc2FnZSwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSkge1xuICB2YXIgZXJyb3IgPSBuZXcgRXJyb3IobWVzc2FnZSk7XG4gIHJldHVybiBlbmhhbmNlRXJyb3IoZXJyb3IsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIHRyYW5zZm9ybURhdGEgPSByZXF1aXJlKCcuL3RyYW5zZm9ybURhdGEnKTtcbnZhciBpc0NhbmNlbCA9IHJlcXVpcmUoJy4uL2NhbmNlbC9pc0NhbmNlbCcpO1xudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi4vZGVmYXVsdHMnKTtcbnZhciBpc0Fic29sdXRlVVJMID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzQWJzb2x1dGVVUkwnKTtcbnZhciBjb21iaW5lVVJMcyA9IHJlcXVpcmUoJy4vLi4vaGVscGVycy9jb21iaW5lVVJMcycpO1xuXG4vKipcbiAqIFRocm93cyBhIGBDYW5jZWxgIGlmIGNhbmNlbGxhdGlvbiBoYXMgYmVlbiByZXF1ZXN0ZWQuXG4gKi9cbmZ1bmN0aW9uIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKSB7XG4gIGlmIChjb25maWcuY2FuY2VsVG9rZW4pIHtcbiAgICBjb25maWcuY2FuY2VsVG9rZW4udGhyb3dJZlJlcXVlc3RlZCgpO1xuICB9XG59XG5cbi8qKlxuICogRGlzcGF0Y2ggYSByZXF1ZXN0IHRvIHRoZSBzZXJ2ZXIgdXNpbmcgdGhlIGNvbmZpZ3VyZWQgYWRhcHRlci5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gY29uZmlnIFRoZSBjb25maWcgdGhhdCBpcyB0byBiZSB1c2VkIGZvciB0aGUgcmVxdWVzdFxuICogQHJldHVybnMge1Byb21pc2V9IFRoZSBQcm9taXNlIHRvIGJlIGZ1bGZpbGxlZFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGRpc3BhdGNoUmVxdWVzdChjb25maWcpIHtcbiAgdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpO1xuXG4gIC8vIFN1cHBvcnQgYmFzZVVSTCBjb25maWdcbiAgaWYgKGNvbmZpZy5iYXNlVVJMICYmICFpc0Fic29sdXRlVVJMKGNvbmZpZy51cmwpKSB7XG4gICAgY29uZmlnLnVybCA9IGNvbWJpbmVVUkxzKGNvbmZpZy5iYXNlVVJMLCBjb25maWcudXJsKTtcbiAgfVxuXG4gIC8vIEVuc3VyZSBoZWFkZXJzIGV4aXN0XG4gIGNvbmZpZy5oZWFkZXJzID0gY29uZmlnLmhlYWRlcnMgfHwge307XG5cbiAgLy8gVHJhbnNmb3JtIHJlcXVlc3QgZGF0YVxuICBjb25maWcuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgY29uZmlnLmRhdGEsXG4gICAgY29uZmlnLmhlYWRlcnMsXG4gICAgY29uZmlnLnRyYW5zZm9ybVJlcXVlc3RcbiAgKTtcblxuICAvLyBGbGF0dGVuIGhlYWRlcnNcbiAgY29uZmlnLmhlYWRlcnMgPSB1dGlscy5tZXJnZShcbiAgICBjb25maWcuaGVhZGVycy5jb21tb24gfHwge30sXG4gICAgY29uZmlnLmhlYWRlcnNbY29uZmlnLm1ldGhvZF0gfHwge30sXG4gICAgY29uZmlnLmhlYWRlcnMgfHwge31cbiAgKTtcblxuICB1dGlscy5mb3JFYWNoKFxuICAgIFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJywgJ2NvbW1vbiddLFxuICAgIGZ1bmN0aW9uIGNsZWFuSGVhZGVyQ29uZmlnKG1ldGhvZCkge1xuICAgICAgZGVsZXRlIGNvbmZpZy5oZWFkZXJzW21ldGhvZF07XG4gICAgfVxuICApO1xuXG4gIHZhciBhZGFwdGVyID0gY29uZmlnLmFkYXB0ZXIgfHwgZGVmYXVsdHMuYWRhcHRlcjtcblxuICByZXR1cm4gYWRhcHRlcihjb25maWcpLnRoZW4oZnVuY3Rpb24gb25BZGFwdGVyUmVzb2x1dGlvbihyZXNwb25zZSkge1xuICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAgIC8vIFRyYW5zZm9ybSByZXNwb25zZSBkYXRhXG4gICAgcmVzcG9uc2UuZGF0YSA9IHRyYW5zZm9ybURhdGEoXG4gICAgICByZXNwb25zZS5kYXRhLFxuICAgICAgcmVzcG9uc2UuaGVhZGVycyxcbiAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZVxuICAgICk7XG5cbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH0sIGZ1bmN0aW9uIG9uQWRhcHRlclJlamVjdGlvbihyZWFzb24pIHtcbiAgICBpZiAoIWlzQ2FuY2VsKHJlYXNvbikpIHtcbiAgICAgIHRocm93SWZDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoY29uZmlnKTtcblxuICAgICAgLy8gVHJhbnNmb3JtIHJlc3BvbnNlIGRhdGFcbiAgICAgIGlmIChyZWFzb24gJiYgcmVhc29uLnJlc3BvbnNlKSB7XG4gICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhID0gdHJhbnNmb3JtRGF0YShcbiAgICAgICAgICByZWFzb24ucmVzcG9uc2UuZGF0YSxcbiAgICAgICAgICByZWFzb24ucmVzcG9uc2UuaGVhZGVycyxcbiAgICAgICAgICBjb25maWcudHJhbnNmb3JtUmVzcG9uc2VcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QocmVhc29uKTtcbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIFVwZGF0ZSBhbiBFcnJvciB3aXRoIHRoZSBzcGVjaWZpZWQgY29uZmlnLCBlcnJvciBjb2RlLCBhbmQgcmVzcG9uc2UuXG4gKlxuICogQHBhcmFtIHtFcnJvcn0gZXJyb3IgVGhlIGVycm9yIHRvIHVwZGF0ZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXG4gKiBAcGFyYW0ge09iamVjdH0gW3JlcXVlc3RdIFRoZSByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXNwb25zZV0gVGhlIHJlc3BvbnNlLlxuICogQHJldHVybnMge0Vycm9yfSBUaGUgZXJyb3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZW5oYW5jZUVycm9yKGVycm9yLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKSB7XG4gIGVycm9yLmNvbmZpZyA9IGNvbmZpZztcbiAgaWYgKGNvZGUpIHtcbiAgICBlcnJvci5jb2RlID0gY29kZTtcbiAgfVxuICBlcnJvci5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgZXJyb3IucmVzcG9uc2UgPSByZXNwb25zZTtcbiAgcmV0dXJuIGVycm9yO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi9jcmVhdGVFcnJvcicpO1xuXG4vKipcbiAqIFJlc29sdmUgb3IgcmVqZWN0IGEgUHJvbWlzZSBiYXNlZCBvbiByZXNwb25zZSBzdGF0dXMuXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVzb2x2ZSBBIGZ1bmN0aW9uIHRoYXQgcmVzb2x2ZXMgdGhlIHByb21pc2UuXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZWplY3QgQSBmdW5jdGlvbiB0aGF0IHJlamVjdHMgdGhlIHByb21pc2UuXG4gKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgVGhlIHJlc3BvbnNlLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHJlc3BvbnNlKSB7XG4gIHZhciB2YWxpZGF0ZVN0YXR1cyA9IHJlc3BvbnNlLmNvbmZpZy52YWxpZGF0ZVN0YXR1cztcbiAgLy8gTm90ZTogc3RhdHVzIGlzIG5vdCBleHBvc2VkIGJ5IFhEb21haW5SZXF1ZXN0XG4gIGlmICghcmVzcG9uc2Uuc3RhdHVzIHx8ICF2YWxpZGF0ZVN0YXR1cyB8fCB2YWxpZGF0ZVN0YXR1cyhyZXNwb25zZS5zdGF0dXMpKSB7XG4gICAgcmVzb2x2ZShyZXNwb25zZSk7XG4gIH0gZWxzZSB7XG4gICAgcmVqZWN0KGNyZWF0ZUVycm9yKFxuICAgICAgJ1JlcXVlc3QgZmFpbGVkIHdpdGggc3RhdHVzIGNvZGUgJyArIHJlc3BvbnNlLnN0YXR1cyxcbiAgICAgIHJlc3BvbnNlLmNvbmZpZyxcbiAgICAgIG51bGwsXG4gICAgICByZXNwb25zZS5yZXF1ZXN0LFxuICAgICAgcmVzcG9uc2VcbiAgICApKTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG4vKipcbiAqIFRyYW5zZm9ybSB0aGUgZGF0YSBmb3IgYSByZXF1ZXN0IG9yIGEgcmVzcG9uc2VcbiAqXG4gKiBAcGFyYW0ge09iamVjdHxTdHJpbmd9IGRhdGEgVGhlIGRhdGEgdG8gYmUgdHJhbnNmb3JtZWRcbiAqIEBwYXJhbSB7QXJyYXl9IGhlYWRlcnMgVGhlIGhlYWRlcnMgZm9yIHRoZSByZXF1ZXN0IG9yIHJlc3BvbnNlXG4gKiBAcGFyYW0ge0FycmF5fEZ1bmN0aW9ufSBmbnMgQSBzaW5nbGUgZnVuY3Rpb24gb3IgQXJyYXkgb2YgZnVuY3Rpb25zXG4gKiBAcmV0dXJucyB7Kn0gVGhlIHJlc3VsdGluZyB0cmFuc2Zvcm1lZCBkYXRhXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdHJhbnNmb3JtRGF0YShkYXRhLCBoZWFkZXJzLCBmbnMpIHtcbiAgLyplc2xpbnQgbm8tcGFyYW0tcmVhc3NpZ246MCovXG4gIHV0aWxzLmZvckVhY2goZm5zLCBmdW5jdGlvbiB0cmFuc2Zvcm0oZm4pIHtcbiAgICBkYXRhID0gZm4oZGF0YSwgaGVhZGVycyk7XG4gIH0pO1xuXG4gIHJldHVybiBkYXRhO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIG5vcm1hbGl6ZUhlYWRlck5hbWUgPSByZXF1aXJlKCcuL2hlbHBlcnMvbm9ybWFsaXplSGVhZGVyTmFtZScpO1xuXG52YXIgREVGQVVMVF9DT05URU5UX1RZUEUgPSB7XG4gICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJ1xufTtcblxuZnVuY3Rpb24gc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsIHZhbHVlKSB7XG4gIGlmICghdXRpbHMuaXNVbmRlZmluZWQoaGVhZGVycykgJiYgdXRpbHMuaXNVbmRlZmluZWQoaGVhZGVyc1snQ29udGVudC1UeXBlJ10pKSB7XG4gICAgaGVhZGVyc1snQ29udGVudC1UeXBlJ10gPSB2YWx1ZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0QWRhcHRlcigpIHtcbiAgdmFyIGFkYXB0ZXI7XG4gIGlmICh0eXBlb2YgWE1MSHR0cFJlcXVlc3QgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gRm9yIGJyb3dzZXJzIHVzZSBYSFIgYWRhcHRlclxuICAgIGFkYXB0ZXIgPSByZXF1aXJlKCcuL2FkYXB0ZXJzL3hocicpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJykge1xuICAgIC8vIEZvciBub2RlIHVzZSBIVFRQIGFkYXB0ZXJcbiAgICBhZGFwdGVyID0gcmVxdWlyZSgnLi9hZGFwdGVycy9odHRwJyk7XG4gIH1cbiAgcmV0dXJuIGFkYXB0ZXI7XG59XG5cbnZhciBkZWZhdWx0cyA9IHtcbiAgYWRhcHRlcjogZ2V0RGVmYXVsdEFkYXB0ZXIoKSxcblxuICB0cmFuc2Zvcm1SZXF1ZXN0OiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVxdWVzdChkYXRhLCBoZWFkZXJzKSB7XG4gICAgbm9ybWFsaXplSGVhZGVyTmFtZShoZWFkZXJzLCAnQ29udGVudC1UeXBlJyk7XG4gICAgaWYgKHV0aWxzLmlzRm9ybURhdGEoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQXJyYXlCdWZmZXIoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQnVmZmVyKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc1N0cmVhbShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNGaWxlKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0Jsb2IoZGF0YSlcbiAgICApIHtcbiAgICAgIHJldHVybiBkYXRhO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNBcnJheUJ1ZmZlclZpZXcoZGF0YSkpIHtcbiAgICAgIHJldHVybiBkYXRhLmJ1ZmZlcjtcbiAgICB9XG4gICAgaWYgKHV0aWxzLmlzVVJMU2VhcmNoUGFyYW1zKGRhdGEpKSB7XG4gICAgICBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZDtjaGFyc2V0PXV0Zi04Jyk7XG4gICAgICByZXR1cm4gZGF0YS50b1N0cmluZygpO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNPYmplY3QoZGF0YSkpIHtcbiAgICAgIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCAnYXBwbGljYXRpb24vanNvbjtjaGFyc2V0PXV0Zi04Jyk7XG4gICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhO1xuICB9XSxcblxuICB0cmFuc2Zvcm1SZXNwb25zZTogW2Z1bmN0aW9uIHRyYW5zZm9ybVJlc3BvbnNlKGRhdGEpIHtcbiAgICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgICBpZiAodHlwZW9mIGRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICB0cnkge1xuICAgICAgICBkYXRhID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHsgLyogSWdub3JlICovIH1cbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1dLFxuXG4gIHRpbWVvdXQ6IDAsXG5cbiAgeHNyZkNvb2tpZU5hbWU6ICdYU1JGLVRPS0VOJyxcbiAgeHNyZkhlYWRlck5hbWU6ICdYLVhTUkYtVE9LRU4nLFxuXG4gIG1heENvbnRlbnRMZW5ndGg6IC0xLFxuXG4gIHZhbGlkYXRlU3RhdHVzOiBmdW5jdGlvbiB2YWxpZGF0ZVN0YXR1cyhzdGF0dXMpIHtcbiAgICByZXR1cm4gc3RhdHVzID49IDIwMCAmJiBzdGF0dXMgPCAzMDA7XG4gIH1cbn07XG5cbmRlZmF1bHRzLmhlYWRlcnMgPSB7XG4gIGNvbW1vbjoge1xuICAgICdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9wbGFpbiwgKi8qJ1xuICB9XG59O1xuXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2ROb0RhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHt9O1xufSk7XG5cbnV0aWxzLmZvckVhY2goWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kV2l0aERhdGEobWV0aG9kKSB7XG4gIGRlZmF1bHRzLmhlYWRlcnNbbWV0aG9kXSA9IHV0aWxzLm1lcmdlKERFRkFVTFRfQ09OVEVOVF9UWVBFKTtcbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlZmF1bHRzO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmQoZm4sIHRoaXNBcmcpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIHdyYXAoKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBhcmdzW2ldID0gYXJndW1lbnRzW2ldO1xuICAgIH1cbiAgICByZXR1cm4gZm4uYXBwbHkodGhpc0FyZywgYXJncyk7XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBidG9hIHBvbHlmaWxsIGZvciBJRTwxMCBjb3VydGVzeSBodHRwczovL2dpdGh1Yi5jb20vZGF2aWRjaGFtYmVycy9CYXNlNjQuanNcblxudmFyIGNoYXJzID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky89JztcblxuZnVuY3Rpb24gRSgpIHtcbiAgdGhpcy5tZXNzYWdlID0gJ1N0cmluZyBjb250YWlucyBhbiBpbnZhbGlkIGNoYXJhY3Rlcic7XG59XG5FLnByb3RvdHlwZSA9IG5ldyBFcnJvcjtcbkUucHJvdG90eXBlLmNvZGUgPSA1O1xuRS5wcm90b3R5cGUubmFtZSA9ICdJbnZhbGlkQ2hhcmFjdGVyRXJyb3InO1xuXG5mdW5jdGlvbiBidG9hKGlucHV0KSB7XG4gIHZhciBzdHIgPSBTdHJpbmcoaW5wdXQpO1xuICB2YXIgb3V0cHV0ID0gJyc7XG4gIGZvciAoXG4gICAgLy8gaW5pdGlhbGl6ZSByZXN1bHQgYW5kIGNvdW50ZXJcbiAgICB2YXIgYmxvY2ssIGNoYXJDb2RlLCBpZHggPSAwLCBtYXAgPSBjaGFycztcbiAgICAvLyBpZiB0aGUgbmV4dCBzdHIgaW5kZXggZG9lcyBub3QgZXhpc3Q6XG4gICAgLy8gICBjaGFuZ2UgdGhlIG1hcHBpbmcgdGFibGUgdG8gXCI9XCJcbiAgICAvLyAgIGNoZWNrIGlmIGQgaGFzIG5vIGZyYWN0aW9uYWwgZGlnaXRzXG4gICAgc3RyLmNoYXJBdChpZHggfCAwKSB8fCAobWFwID0gJz0nLCBpZHggJSAxKTtcbiAgICAvLyBcIjggLSBpZHggJSAxICogOFwiIGdlbmVyYXRlcyB0aGUgc2VxdWVuY2UgMiwgNCwgNiwgOFxuICAgIG91dHB1dCArPSBtYXAuY2hhckF0KDYzICYgYmxvY2sgPj4gOCAtIGlkeCAlIDEgKiA4KVxuICApIHtcbiAgICBjaGFyQ29kZSA9IHN0ci5jaGFyQ29kZUF0KGlkeCArPSAzIC8gNCk7XG4gICAgaWYgKGNoYXJDb2RlID4gMHhGRikge1xuICAgICAgdGhyb3cgbmV3IEUoKTtcbiAgICB9XG4gICAgYmxvY2sgPSBibG9jayA8PCA4IHwgY2hhckNvZGU7XG4gIH1cbiAgcmV0dXJuIG91dHB1dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBidG9hO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIGVuY29kZSh2YWwpIHtcbiAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudCh2YWwpLlxuICAgIHJlcGxhY2UoLyU0MC9naSwgJ0AnKS5cbiAgICByZXBsYWNlKC8lM0EvZ2ksICc6JykuXG4gICAgcmVwbGFjZSgvJTI0L2csICckJykuXG4gICAgcmVwbGFjZSgvJTJDL2dpLCAnLCcpLlxuICAgIHJlcGxhY2UoLyUyMC9nLCAnKycpLlxuICAgIHJlcGxhY2UoLyU1Qi9naSwgJ1snKS5cbiAgICByZXBsYWNlKC8lNUQvZ2ksICddJyk7XG59XG5cbi8qKlxuICogQnVpbGQgYSBVUkwgYnkgYXBwZW5kaW5nIHBhcmFtcyB0byB0aGUgZW5kXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHVybCBUaGUgYmFzZSBvZiB0aGUgdXJsIChlLmcuLCBodHRwOi8vd3d3Lmdvb2dsZS5jb20pXG4gKiBAcGFyYW0ge29iamVjdH0gW3BhcmFtc10gVGhlIHBhcmFtcyB0byBiZSBhcHBlbmRlZFxuICogQHJldHVybnMge3N0cmluZ30gVGhlIGZvcm1hdHRlZCB1cmxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBidWlsZFVSTCh1cmwsIHBhcmFtcywgcGFyYW1zU2VyaWFsaXplcikge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgaWYgKCFwYXJhbXMpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgdmFyIHNlcmlhbGl6ZWRQYXJhbXM7XG4gIGlmIChwYXJhbXNTZXJpYWxpemVyKSB7XG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcmFtc1NlcmlhbGl6ZXIocGFyYW1zKTtcbiAgfSBlbHNlIGlmICh1dGlscy5pc1VSTFNlYXJjaFBhcmFtcyhwYXJhbXMpKSB7XG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcmFtcy50b1N0cmluZygpO1xuICB9IGVsc2Uge1xuICAgIHZhciBwYXJ0cyA9IFtdO1xuXG4gICAgdXRpbHMuZm9yRWFjaChwYXJhbXMsIGZ1bmN0aW9uIHNlcmlhbGl6ZSh2YWwsIGtleSkge1xuICAgICAgaWYgKHZhbCA9PT0gbnVsbCB8fCB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmICh1dGlscy5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAga2V5ID0ga2V5ICsgJ1tdJztcbiAgICAgIH1cblxuICAgICAgaWYgKCF1dGlscy5pc0FycmF5KHZhbCkpIHtcbiAgICAgICAgdmFsID0gW3ZhbF07XG4gICAgICB9XG5cbiAgICAgIHV0aWxzLmZvckVhY2godmFsLCBmdW5jdGlvbiBwYXJzZVZhbHVlKHYpIHtcbiAgICAgICAgaWYgKHV0aWxzLmlzRGF0ZSh2KSkge1xuICAgICAgICAgIHYgPSB2LnRvSVNPU3RyaW5nKCk7XG4gICAgICAgIH0gZWxzZSBpZiAodXRpbHMuaXNPYmplY3QodikpIHtcbiAgICAgICAgICB2ID0gSlNPTi5zdHJpbmdpZnkodik7XG4gICAgICAgIH1cbiAgICAgICAgcGFydHMucHVzaChlbmNvZGUoa2V5KSArICc9JyArIGVuY29kZSh2KSk7XG4gICAgICB9KTtcbiAgICB9KTtcblxuICAgIHNlcmlhbGl6ZWRQYXJhbXMgPSBwYXJ0cy5qb2luKCcmJyk7XG4gIH1cblxuICBpZiAoc2VyaWFsaXplZFBhcmFtcykge1xuICAgIHVybCArPSAodXJsLmluZGV4T2YoJz8nKSA9PT0gLTEgPyAnPycgOiAnJicpICsgc2VyaWFsaXplZFBhcmFtcztcbiAgfVxuXG4gIHJldHVybiB1cmw7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBuZXcgVVJMIGJ5IGNvbWJpbmluZyB0aGUgc3BlY2lmaWVkIFVSTHNcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gYmFzZVVSTCBUaGUgYmFzZSBVUkxcbiAqIEBwYXJhbSB7c3RyaW5nfSByZWxhdGl2ZVVSTCBUaGUgcmVsYXRpdmUgVVJMXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgY29tYmluZWQgVVJMXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY29tYmluZVVSTHMoYmFzZVVSTCwgcmVsYXRpdmVVUkwpIHtcbiAgcmV0dXJuIHJlbGF0aXZlVVJMXG4gICAgPyBiYXNlVVJMLnJlcGxhY2UoL1xcLyskLywgJycpICsgJy8nICsgcmVsYXRpdmVVUkwucmVwbGFjZSgvXlxcLysvLCAnJylcbiAgICA6IGJhc2VVUkw7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKFxuICB1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpID9cblxuICAvLyBTdGFuZGFyZCBicm93c2VyIGVudnMgc3VwcG9ydCBkb2N1bWVudC5jb29raWVcbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGU6IGZ1bmN0aW9uIHdyaXRlKG5hbWUsIHZhbHVlLCBleHBpcmVzLCBwYXRoLCBkb21haW4sIHNlY3VyZSkge1xuICAgICAgICB2YXIgY29va2llID0gW107XG4gICAgICAgIGNvb2tpZS5wdXNoKG5hbWUgKyAnPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpKTtcblxuICAgICAgICBpZiAodXRpbHMuaXNOdW1iZXIoZXhwaXJlcykpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnZXhwaXJlcz0nICsgbmV3IERhdGUoZXhwaXJlcykudG9HTVRTdHJpbmcoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXRpbHMuaXNTdHJpbmcocGF0aCkpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgncGF0aD0nICsgcGF0aCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodXRpbHMuaXNTdHJpbmcoZG9tYWluKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdkb21haW49JyArIGRvbWFpbik7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoc2VjdXJlID09PSB0cnVlKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ3NlY3VyZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgZG9jdW1lbnQuY29va2llID0gY29va2llLmpvaW4oJzsgJyk7XG4gICAgICB9LFxuXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKG5hbWUpIHtcbiAgICAgICAgdmFyIG1hdGNoID0gZG9jdW1lbnQuY29va2llLm1hdGNoKG5ldyBSZWdFeHAoJyhefDtcXFxccyopKCcgKyBuYW1lICsgJyk9KFteO10qKScpKTtcbiAgICAgICAgcmV0dXJuIChtYXRjaCA/IGRlY29kZVVSSUNvbXBvbmVudChtYXRjaFszXSkgOiBudWxsKTtcbiAgICAgIH0sXG5cbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKG5hbWUpIHtcbiAgICAgICAgdGhpcy53cml0ZShuYW1lLCAnJywgRGF0ZS5ub3coKSAtIDg2NDAwMDAwKTtcbiAgICAgIH1cbiAgICB9O1xuICB9KSgpIDpcblxuICAvLyBOb24gc3RhbmRhcmQgYnJvd3NlciBlbnYgKHdlYiB3b3JrZXJzLCByZWFjdC1uYXRpdmUpIGxhY2sgbmVlZGVkIHN1cHBvcnQuXG4gIChmdW5jdGlvbiBub25TdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdyaXRlOiBmdW5jdGlvbiB3cml0ZSgpIHt9LFxuICAgICAgcmVhZDogZnVuY3Rpb24gcmVhZCgpIHsgcmV0dXJuIG51bGw7IH0sXG4gICAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZSgpIHt9XG4gICAgfTtcbiAgfSkoKVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBEZXRlcm1pbmVzIHdoZXRoZXIgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGVcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBVUkwgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHNwZWNpZmllZCBVUkwgaXMgYWJzb2x1dGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGlzQWJzb2x1dGVVUkwodXJsKSB7XG4gIC8vIEEgVVJMIGlzIGNvbnNpZGVyZWQgYWJzb2x1dGUgaWYgaXQgYmVnaW5zIHdpdGggXCI8c2NoZW1lPjovL1wiIG9yIFwiLy9cIiAocHJvdG9jb2wtcmVsYXRpdmUgVVJMKS5cbiAgLy8gUkZDIDM5ODYgZGVmaW5lcyBzY2hlbWUgbmFtZSBhcyBhIHNlcXVlbmNlIG9mIGNoYXJhY3RlcnMgYmVnaW5uaW5nIHdpdGggYSBsZXR0ZXIgYW5kIGZvbGxvd2VkXG4gIC8vIGJ5IGFueSBjb21iaW5hdGlvbiBvZiBsZXR0ZXJzLCBkaWdpdHMsIHBsdXMsIHBlcmlvZCwgb3IgaHlwaGVuLlxuICByZXR1cm4gL14oW2Etel1bYS16XFxkXFwrXFwtXFwuXSo6KT9cXC9cXC8vaS50ZXN0KHVybCk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gKFxuICB1dGlscy5pc1N0YW5kYXJkQnJvd3NlckVudigpID9cblxuICAvLyBTdGFuZGFyZCBicm93c2VyIGVudnMgaGF2ZSBmdWxsIHN1cHBvcnQgb2YgdGhlIEFQSXMgbmVlZGVkIHRvIHRlc3RcbiAgLy8gd2hldGhlciB0aGUgcmVxdWVzdCBVUkwgaXMgb2YgdGhlIHNhbWUgb3JpZ2luIGFzIGN1cnJlbnQgbG9jYXRpb24uXG4gIChmdW5jdGlvbiBzdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gICAgdmFyIG1zaWUgPSAvKG1zaWV8dHJpZGVudCkvaS50ZXN0KG5hdmlnYXRvci51c2VyQWdlbnQpO1xuICAgIHZhciB1cmxQYXJzaW5nTm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICB2YXIgb3JpZ2luVVJMO1xuXG4gICAgLyoqXG4gICAgKiBQYXJzZSBhIFVSTCB0byBkaXNjb3ZlciBpdCdzIGNvbXBvbmVudHNcbiAgICAqXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdXJsIFRoZSBVUkwgdG8gYmUgcGFyc2VkXG4gICAgKiBAcmV0dXJucyB7T2JqZWN0fVxuICAgICovXG4gICAgZnVuY3Rpb24gcmVzb2x2ZVVSTCh1cmwpIHtcbiAgICAgIHZhciBocmVmID0gdXJsO1xuXG4gICAgICBpZiAobXNpZSkge1xuICAgICAgICAvLyBJRSBuZWVkcyBhdHRyaWJ1dGUgc2V0IHR3aWNlIHRvIG5vcm1hbGl6ZSBwcm9wZXJ0aWVzXG4gICAgICAgIHVybFBhcnNpbmdOb2RlLnNldEF0dHJpYnV0ZSgnaHJlZicsIGhyZWYpO1xuICAgICAgICBocmVmID0gdXJsUGFyc2luZ05vZGUuaHJlZjtcbiAgICAgIH1cblxuICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XG5cbiAgICAgIC8vIHVybFBhcnNpbmdOb2RlIHByb3ZpZGVzIHRoZSBVcmxVdGlscyBpbnRlcmZhY2UgLSBodHRwOi8vdXJsLnNwZWMud2hhdHdnLm9yZy8jdXJsdXRpbHNcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhyZWY6IHVybFBhcnNpbmdOb2RlLmhyZWYsXG4gICAgICAgIHByb3RvY29sOiB1cmxQYXJzaW5nTm9kZS5wcm90b2NvbCA/IHVybFBhcnNpbmdOb2RlLnByb3RvY29sLnJlcGxhY2UoLzokLywgJycpIDogJycsXG4gICAgICAgIGhvc3Q6IHVybFBhcnNpbmdOb2RlLmhvc3QsXG4gICAgICAgIHNlYXJjaDogdXJsUGFyc2luZ05vZGUuc2VhcmNoID8gdXJsUGFyc2luZ05vZGUuc2VhcmNoLnJlcGxhY2UoL15cXD8vLCAnJykgOiAnJyxcbiAgICAgICAgaGFzaDogdXJsUGFyc2luZ05vZGUuaGFzaCA/IHVybFBhcnNpbmdOb2RlLmhhc2gucmVwbGFjZSgvXiMvLCAnJykgOiAnJyxcbiAgICAgICAgaG9zdG5hbWU6IHVybFBhcnNpbmdOb2RlLmhvc3RuYW1lLFxuICAgICAgICBwb3J0OiB1cmxQYXJzaW5nTm9kZS5wb3J0LFxuICAgICAgICBwYXRobmFtZTogKHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSA/XG4gICAgICAgICAgICAgICAgICB1cmxQYXJzaW5nTm9kZS5wYXRobmFtZSA6XG4gICAgICAgICAgICAgICAgICAnLycgKyB1cmxQYXJzaW5nTm9kZS5wYXRobmFtZVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBvcmlnaW5VUkwgPSByZXNvbHZlVVJMKHdpbmRvdy5sb2NhdGlvbi5ocmVmKTtcblxuICAgIC8qKlxuICAgICogRGV0ZXJtaW5lIGlmIGEgVVJMIHNoYXJlcyB0aGUgc2FtZSBvcmlnaW4gYXMgdGhlIGN1cnJlbnQgbG9jYXRpb25cbiAgICAqXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gcmVxdWVzdFVSTCBUaGUgVVJMIHRvIHRlc3RcbiAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIFVSTCBzaGFyZXMgdGhlIHNhbWUgb3JpZ2luLCBvdGhlcndpc2UgZmFsc2VcbiAgICAqL1xuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4ocmVxdWVzdFVSTCkge1xuICAgICAgdmFyIHBhcnNlZCA9ICh1dGlscy5pc1N0cmluZyhyZXF1ZXN0VVJMKSkgPyByZXNvbHZlVVJMKHJlcXVlc3RVUkwpIDogcmVxdWVzdFVSTDtcbiAgICAgIHJldHVybiAocGFyc2VkLnByb3RvY29sID09PSBvcmlnaW5VUkwucHJvdG9jb2wgJiZcbiAgICAgICAgICAgIHBhcnNlZC5ob3N0ID09PSBvcmlnaW5VUkwuaG9zdCk7XG4gICAgfTtcbiAgfSkoKSA6XG5cbiAgLy8gTm9uIHN0YW5kYXJkIGJyb3dzZXIgZW52cyAod2ViIHdvcmtlcnMsIHJlYWN0LW5hdGl2ZSkgbGFjayBuZWVkZWQgc3VwcG9ydC5cbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gaXNVUkxTYW1lT3JpZ2luKCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgfSkoKVxuKTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlcnMsIG5vcm1hbGl6ZWROYW1lKSB7XG4gIHV0aWxzLmZvckVhY2goaGVhZGVycywgZnVuY3Rpb24gcHJvY2Vzc0hlYWRlcih2YWx1ZSwgbmFtZSkge1xuICAgIGlmIChuYW1lICE9PSBub3JtYWxpemVkTmFtZSAmJiBuYW1lLnRvVXBwZXJDYXNlKCkgPT09IG5vcm1hbGl6ZWROYW1lLnRvVXBwZXJDYXNlKCkpIHtcbiAgICAgIGhlYWRlcnNbbm9ybWFsaXplZE5hbWVdID0gdmFsdWU7XG4gICAgICBkZWxldGUgaGVhZGVyc1tuYW1lXTtcbiAgICB9XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG4vLyBIZWFkZXJzIHdob3NlIGR1cGxpY2F0ZXMgYXJlIGlnbm9yZWQgYnkgbm9kZVxuLy8gYy5mLiBodHRwczovL25vZGVqcy5vcmcvYXBpL2h0dHAuaHRtbCNodHRwX21lc3NhZ2VfaGVhZGVyc1xudmFyIGlnbm9yZUR1cGxpY2F0ZU9mID0gW1xuICAnYWdlJywgJ2F1dGhvcml6YXRpb24nLCAnY29udGVudC1sZW5ndGgnLCAnY29udGVudC10eXBlJywgJ2V0YWcnLFxuICAnZXhwaXJlcycsICdmcm9tJywgJ2hvc3QnLCAnaWYtbW9kaWZpZWQtc2luY2UnLCAnaWYtdW5tb2RpZmllZC1zaW5jZScsXG4gICdsYXN0LW1vZGlmaWVkJywgJ2xvY2F0aW9uJywgJ21heC1mb3J3YXJkcycsICdwcm94eS1hdXRob3JpemF0aW9uJyxcbiAgJ3JlZmVyZXInLCAncmV0cnktYWZ0ZXInLCAndXNlci1hZ2VudCdcbl07XG5cbi8qKlxuICogUGFyc2UgaGVhZGVycyBpbnRvIGFuIG9iamVjdFxuICpcbiAqIGBgYFxuICogRGF0ZTogV2VkLCAyNyBBdWcgMjAxNCAwODo1ODo0OSBHTVRcbiAqIENvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvblxuICogQ29ubmVjdGlvbjoga2VlcC1hbGl2ZVxuICogVHJhbnNmZXItRW5jb2Rpbmc6IGNodW5rZWRcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBoZWFkZXJzIEhlYWRlcnMgbmVlZGluZyB0byBiZSBwYXJzZWRcbiAqIEByZXR1cm5zIHtPYmplY3R9IEhlYWRlcnMgcGFyc2VkIGludG8gYW4gb2JqZWN0XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gcGFyc2VIZWFkZXJzKGhlYWRlcnMpIHtcbiAgdmFyIHBhcnNlZCA9IHt9O1xuICB2YXIga2V5O1xuICB2YXIgdmFsO1xuICB2YXIgaTtcblxuICBpZiAoIWhlYWRlcnMpIHsgcmV0dXJuIHBhcnNlZDsgfVxuXG4gIHV0aWxzLmZvckVhY2goaGVhZGVycy5zcGxpdCgnXFxuJyksIGZ1bmN0aW9uIHBhcnNlcihsaW5lKSB7XG4gICAgaSA9IGxpbmUuaW5kZXhPZignOicpO1xuICAgIGtleSA9IHV0aWxzLnRyaW0obGluZS5zdWJzdHIoMCwgaSkpLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFsID0gdXRpbHMudHJpbShsaW5lLnN1YnN0cihpICsgMSkpO1xuXG4gICAgaWYgKGtleSkge1xuICAgICAgaWYgKHBhcnNlZFtrZXldICYmIGlnbm9yZUR1cGxpY2F0ZU9mLmluZGV4T2Yoa2V5KSA+PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChrZXkgPT09ICdzZXQtY29va2llJykge1xuICAgICAgICBwYXJzZWRba2V5XSA9IChwYXJzZWRba2V5XSA/IHBhcnNlZFtrZXldIDogW10pLmNvbmNhdChbdmFsXSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXJzZWRba2V5XSA9IHBhcnNlZFtrZXldID8gcGFyc2VkW2tleV0gKyAnLCAnICsgdmFsIDogdmFsO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHBhcnNlZDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogU3ludGFjdGljIHN1Z2FyIGZvciBpbnZva2luZyBhIGZ1bmN0aW9uIGFuZCBleHBhbmRpbmcgYW4gYXJyYXkgZm9yIGFyZ3VtZW50cy5cbiAqXG4gKiBDb21tb24gdXNlIGNhc2Ugd291bGQgYmUgdG8gdXNlIGBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHlgLlxuICpcbiAqICBgYGBqc1xuICogIGZ1bmN0aW9uIGYoeCwgeSwgeikge31cbiAqICB2YXIgYXJncyA9IFsxLCAyLCAzXTtcbiAqICBmLmFwcGx5KG51bGwsIGFyZ3MpO1xuICogIGBgYFxuICpcbiAqIFdpdGggYHNwcmVhZGAgdGhpcyBleGFtcGxlIGNhbiBiZSByZS13cml0dGVuLlxuICpcbiAqICBgYGBqc1xuICogIHNwcmVhZChmdW5jdGlvbih4LCB5LCB6KSB7fSkoWzEsIDIsIDNdKTtcbiAqICBgYGBcbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFja1xuICogQHJldHVybnMge0Z1bmN0aW9ufVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHNwcmVhZChjYWxsYmFjaykge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcChhcnIpIHtcbiAgICByZXR1cm4gY2FsbGJhY2suYXBwbHkobnVsbCwgYXJyKTtcbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kID0gcmVxdWlyZSgnLi9oZWxwZXJzL2JpbmQnKTtcbnZhciBpc0J1ZmZlciA9IHJlcXVpcmUoJ2lzLWJ1ZmZlcicpO1xuXG4vKmdsb2JhbCB0b1N0cmluZzp0cnVlKi9cblxuLy8gdXRpbHMgaXMgYSBsaWJyYXJ5IG9mIGdlbmVyaWMgaGVscGVyIGZ1bmN0aW9ucyBub24tc3BlY2lmaWMgdG8gYXhpb3NcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBBcnJheVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5LCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBBcnJheUJ1ZmZlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlcih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQXJyYXlCdWZmZXJdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEZvcm1EYXRhXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gRm9ybURhdGEsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Zvcm1EYXRhKHZhbCkge1xuICByZXR1cm4gKHR5cGVvZiBGb3JtRGF0YSAhPT0gJ3VuZGVmaW5lZCcpICYmICh2YWwgaW5zdGFuY2VvZiBGb3JtRGF0YSk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSB2aWV3IG9uIGFuIEFycmF5QnVmZmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSB2aWV3IG9uIGFuIEFycmF5QnVmZmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNBcnJheUJ1ZmZlclZpZXcodmFsKSB7XG4gIHZhciByZXN1bHQ7XG4gIGlmICgodHlwZW9mIEFycmF5QnVmZmVyICE9PSAndW5kZWZpbmVkJykgJiYgKEFycmF5QnVmZmVyLmlzVmlldykpIHtcbiAgICByZXN1bHQgPSBBcnJheUJ1ZmZlci5pc1ZpZXcodmFsKTtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQgPSAodmFsKSAmJiAodmFsLmJ1ZmZlcikgJiYgKHZhbC5idWZmZXIgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlcik7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFN0cmluZ1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyaW5nLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTdHJpbmcodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAnc3RyaW5nJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIE51bWJlclxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgTnVtYmVyLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNOdW1iZXIodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAnbnVtYmVyJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyB1bmRlZmluZWRcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgdmFsdWUgaXMgdW5kZWZpbmVkLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNVbmRlZmluZWQodmFsKSB7XG4gIHJldHVybiB0eXBlb2YgdmFsID09PSAndW5kZWZpbmVkJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhbiBPYmplY3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBPYmplY3QsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc09iamVjdCh2YWwpIHtcbiAgcmV0dXJuIHZhbCAhPT0gbnVsbCAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0Jztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIERhdGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIERhdGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0RhdGUodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEZpbGVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZpbGUsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0ZpbGUodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEZpbGVdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEJsb2JcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEJsb2IsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0Jsb2IodmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEJsb2JdJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIEZ1bmN0aW9uXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBGdW5jdGlvbiwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRnVuY3Rpb24odmFsKSB7XG4gIHJldHVybiB0b1N0cmluZy5jYWxsKHZhbCkgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFsdWUgaXMgYSBTdHJlYW1cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFN0cmVhbSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzU3RyZWFtKHZhbCkge1xuICByZXR1cm4gaXNPYmplY3QodmFsKSAmJiBpc0Z1bmN0aW9uKHZhbC5waXBlKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3RcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIFVSTFNlYXJjaFBhcmFtcyBvYmplY3QsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1VSTFNlYXJjaFBhcmFtcyh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiBVUkxTZWFyY2hQYXJhbXMgIT09ICd1bmRlZmluZWQnICYmIHZhbCBpbnN0YW5jZW9mIFVSTFNlYXJjaFBhcmFtcztcbn1cblxuLyoqXG4gKiBUcmltIGV4Y2VzcyB3aGl0ZXNwYWNlIG9mZiB0aGUgYmVnaW5uaW5nIGFuZCBlbmQgb2YgYSBzdHJpbmdcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gc3RyIFRoZSBTdHJpbmcgdG8gdHJpbVxuICogQHJldHVybnMge1N0cmluZ30gVGhlIFN0cmluZyBmcmVlZCBvZiBleGNlc3Mgd2hpdGVzcGFjZVxuICovXG5mdW5jdGlvbiB0cmltKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoL15cXHMqLywgJycpLnJlcGxhY2UoL1xccyokLywgJycpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiB3ZSdyZSBydW5uaW5nIGluIGEgc3RhbmRhcmQgYnJvd3NlciBlbnZpcm9ubWVudFxuICpcbiAqIFRoaXMgYWxsb3dzIGF4aW9zIHRvIHJ1biBpbiBhIHdlYiB3b3JrZXIsIGFuZCByZWFjdC1uYXRpdmUuXG4gKiBCb3RoIGVudmlyb25tZW50cyBzdXBwb3J0IFhNTEh0dHBSZXF1ZXN0LCBidXQgbm90IGZ1bGx5IHN0YW5kYXJkIGdsb2JhbHMuXG4gKlxuICogd2ViIHdvcmtlcnM6XG4gKiAgdHlwZW9mIHdpbmRvdyAtPiB1bmRlZmluZWRcbiAqICB0eXBlb2YgZG9jdW1lbnQgLT4gdW5kZWZpbmVkXG4gKlxuICogcmVhY3QtbmF0aXZlOlxuICogIG5hdmlnYXRvci5wcm9kdWN0IC0+ICdSZWFjdE5hdGl2ZSdcbiAqL1xuZnVuY3Rpb24gaXNTdGFuZGFyZEJyb3dzZXJFbnYoKSB7XG4gIGlmICh0eXBlb2YgbmF2aWdhdG9yICE9PSAndW5kZWZpbmVkJyAmJiBuYXZpZ2F0b3IucHJvZHVjdCA9PT0gJ1JlYWN0TmF0aXZlJykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gKFxuICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gICAgdHlwZW9mIGRvY3VtZW50ICE9PSAndW5kZWZpbmVkJ1xuICApO1xufVxuXG4vKipcbiAqIEl0ZXJhdGUgb3ZlciBhbiBBcnJheSBvciBhbiBPYmplY3QgaW52b2tpbmcgYSBmdW5jdGlvbiBmb3IgZWFjaCBpdGVtLlxuICpcbiAqIElmIGBvYmpgIGlzIGFuIEFycmF5IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcbiAqIHRoZSB2YWx1ZSwgaW5kZXgsIGFuZCBjb21wbGV0ZSBhcnJheSBmb3IgZWFjaCBpdGVtLlxuICpcbiAqIElmICdvYmonIGlzIGFuIE9iamVjdCBjYWxsYmFjayB3aWxsIGJlIGNhbGxlZCBwYXNzaW5nXG4gKiB0aGUgdmFsdWUsIGtleSwgYW5kIGNvbXBsZXRlIG9iamVjdCBmb3IgZWFjaCBwcm9wZXJ0eS5cbiAqXG4gKiBAcGFyYW0ge09iamVjdHxBcnJheX0gb2JqIFRoZSBvYmplY3QgdG8gaXRlcmF0ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm4gVGhlIGNhbGxiYWNrIHRvIGludm9rZSBmb3IgZWFjaCBpdGVtXG4gKi9cbmZ1bmN0aW9uIGZvckVhY2gob2JqLCBmbikge1xuICAvLyBEb24ndCBib3RoZXIgaWYgbm8gdmFsdWUgcHJvdmlkZWRcbiAgaWYgKG9iaiA9PT0gbnVsbCB8fCB0eXBlb2Ygb2JqID09PSAndW5kZWZpbmVkJykge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIEZvcmNlIGFuIGFycmF5IGlmIG5vdCBhbHJlYWR5IHNvbWV0aGluZyBpdGVyYWJsZVxuICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcpIHtcbiAgICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgICBvYmogPSBbb2JqXTtcbiAgfVxuXG4gIGlmIChpc0FycmF5KG9iaikpIHtcbiAgICAvLyBJdGVyYXRlIG92ZXIgYXJyYXkgdmFsdWVzXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBvYmoubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICBmbi5jYWxsKG51bGwsIG9ialtpXSwgaSwgb2JqKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gSXRlcmF0ZSBvdmVyIG9iamVjdCBrZXlzXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSkpIHtcbiAgICAgICAgZm4uY2FsbChudWxsLCBvYmpba2V5XSwga2V5LCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIEFjY2VwdHMgdmFyYXJncyBleHBlY3RpbmcgZWFjaCBhcmd1bWVudCB0byBiZSBhbiBvYmplY3QsIHRoZW5cbiAqIGltbXV0YWJseSBtZXJnZXMgdGhlIHByb3BlcnRpZXMgb2YgZWFjaCBvYmplY3QgYW5kIHJldHVybnMgcmVzdWx0LlxuICpcbiAqIFdoZW4gbXVsdGlwbGUgb2JqZWN0cyBjb250YWluIHRoZSBzYW1lIGtleSB0aGUgbGF0ZXIgb2JqZWN0IGluXG4gKiB0aGUgYXJndW1lbnRzIGxpc3Qgd2lsbCB0YWtlIHByZWNlZGVuY2UuXG4gKlxuICogRXhhbXBsZTpcbiAqXG4gKiBgYGBqc1xuICogdmFyIHJlc3VsdCA9IG1lcmdlKHtmb286IDEyM30sIHtmb286IDQ1Nn0pO1xuICogY29uc29sZS5sb2cocmVzdWx0LmZvbyk7IC8vIG91dHB1dHMgNDU2XG4gKiBgYGBcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqMSBPYmplY3QgdG8gbWVyZ2VcbiAqIEByZXR1cm5zIHtPYmplY3R9IFJlc3VsdCBvZiBhbGwgbWVyZ2UgcHJvcGVydGllc1xuICovXG5mdW5jdGlvbiBtZXJnZSgvKiBvYmoxLCBvYmoyLCBvYmozLCAuLi4gKi8pIHtcbiAgdmFyIHJlc3VsdCA9IHt9O1xuICBmdW5jdGlvbiBhc3NpZ25WYWx1ZSh2YWwsIGtleSkge1xuICAgIGlmICh0eXBlb2YgcmVzdWx0W2tleV0gPT09ICdvYmplY3QnICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnKSB7XG4gICAgICByZXN1bHRba2V5XSA9IG1lcmdlKHJlc3VsdFtrZXldLCB2YWwpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHRba2V5XSA9IHZhbDtcbiAgICB9XG4gIH1cblxuICBmb3IgKHZhciBpID0gMCwgbCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBmb3JFYWNoKGFyZ3VtZW50c1tpXSwgYXNzaWduVmFsdWUpO1xuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbi8qKlxuICogRXh0ZW5kcyBvYmplY3QgYSBieSBtdXRhYmx5IGFkZGluZyB0byBpdCB0aGUgcHJvcGVydGllcyBvZiBvYmplY3QgYi5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gYSBUaGUgb2JqZWN0IHRvIGJlIGV4dGVuZGVkXG4gKiBAcGFyYW0ge09iamVjdH0gYiBUaGUgb2JqZWN0IHRvIGNvcHkgcHJvcGVydGllcyBmcm9tXG4gKiBAcGFyYW0ge09iamVjdH0gdGhpc0FyZyBUaGUgb2JqZWN0IHRvIGJpbmQgZnVuY3Rpb24gdG9cbiAqIEByZXR1cm4ge09iamVjdH0gVGhlIHJlc3VsdGluZyB2YWx1ZSBvZiBvYmplY3QgYVxuICovXG5mdW5jdGlvbiBleHRlbmQoYSwgYiwgdGhpc0FyZykge1xuICBmb3JFYWNoKGIsIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XG4gICAgaWYgKHRoaXNBcmcgJiYgdHlwZW9mIHZhbCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgYVtrZXldID0gYmluZCh2YWwsIHRoaXNBcmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBhW2tleV0gPSB2YWw7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGE7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpc0FycmF5OiBpc0FycmF5LFxuICBpc0FycmF5QnVmZmVyOiBpc0FycmF5QnVmZmVyLFxuICBpc0J1ZmZlcjogaXNCdWZmZXIsXG4gIGlzRm9ybURhdGE6IGlzRm9ybURhdGEsXG4gIGlzQXJyYXlCdWZmZXJWaWV3OiBpc0FycmF5QnVmZmVyVmlldyxcbiAgaXNTdHJpbmc6IGlzU3RyaW5nLFxuICBpc051bWJlcjogaXNOdW1iZXIsXG4gIGlzT2JqZWN0OiBpc09iamVjdCxcbiAgaXNVbmRlZmluZWQ6IGlzVW5kZWZpbmVkLFxuICBpc0RhdGU6IGlzRGF0ZSxcbiAgaXNGaWxlOiBpc0ZpbGUsXG4gIGlzQmxvYjogaXNCbG9iLFxuICBpc0Z1bmN0aW9uOiBpc0Z1bmN0aW9uLFxuICBpc1N0cmVhbTogaXNTdHJlYW0sXG4gIGlzVVJMU2VhcmNoUGFyYW1zOiBpc1VSTFNlYXJjaFBhcmFtcyxcbiAgaXNTdGFuZGFyZEJyb3dzZXJFbnY6IGlzU3RhbmRhcmRCcm93c2VyRW52LFxuICBmb3JFYWNoOiBmb3JFYWNoLFxuICBtZXJnZTogbWVyZ2UsXG4gIGV4dGVuZDogZXh0ZW5kLFxuICB0cmltOiB0cmltXG59O1xuIiwiLy8gZ2V0IHN1Y2Nlc3NmdWwgY29udHJvbCBmcm9tIGZvcm0gYW5kIGFzc2VtYmxlIGludG8gb2JqZWN0XG4vLyBodHRwOi8vd3d3LnczLm9yZy9UUi9odG1sNDAxL2ludGVyYWN0L2Zvcm1zLmh0bWwjaC0xNy4xMy4yXG5cbi8vIHR5cGVzIHdoaWNoIGluZGljYXRlIGEgc3VibWl0IGFjdGlvbiBhbmQgYXJlIG5vdCBzdWNjZXNzZnVsIGNvbnRyb2xzXG4vLyB0aGVzZSB3aWxsIGJlIGlnbm9yZWRcbnZhciBrX3Jfc3VibWl0dGVyID0gL14oPzpzdWJtaXR8YnV0dG9ufGltYWdlfHJlc2V0fGZpbGUpJC9pO1xuXG4vLyBub2RlIG5hbWVzIHdoaWNoIGNvdWxkIGJlIHN1Y2Nlc3NmdWwgY29udHJvbHNcbnZhciBrX3Jfc3VjY2Vzc19jb250cmxzID0gL14oPzppbnB1dHxzZWxlY3R8dGV4dGFyZWF8a2V5Z2VuKS9pO1xuXG4vLyBNYXRjaGVzIGJyYWNrZXQgbm90YXRpb24uXG52YXIgYnJhY2tldHMgPSAvKFxcW1teXFxbXFxdXSpcXF0pL2c7XG5cbi8vIHNlcmlhbGl6ZXMgZm9ybSBmaWVsZHNcbi8vIEBwYXJhbSBmb3JtIE1VU1QgYmUgYW4gSFRNTEZvcm0gZWxlbWVudFxuLy8gQHBhcmFtIG9wdGlvbnMgaXMgYW4gb3B0aW9uYWwgYXJndW1lbnQgdG8gY29uZmlndXJlIHRoZSBzZXJpYWxpemF0aW9uLiBEZWZhdWx0IG91dHB1dFxuLy8gd2l0aCBubyBvcHRpb25zIHNwZWNpZmllZCBpcyBhIHVybCBlbmNvZGVkIHN0cmluZ1xuLy8gICAgLSBoYXNoOiBbdHJ1ZSB8IGZhbHNlXSBDb25maWd1cmUgdGhlIG91dHB1dCB0eXBlLiBJZiB0cnVlLCB0aGUgb3V0cHV0IHdpbGxcbi8vICAgIGJlIGEganMgb2JqZWN0LlxuLy8gICAgLSBzZXJpYWxpemVyOiBbZnVuY3Rpb25dIE9wdGlvbmFsIHNlcmlhbGl6ZXIgZnVuY3Rpb24gdG8gb3ZlcnJpZGUgdGhlIGRlZmF1bHQgb25lLlxuLy8gICAgVGhlIGZ1bmN0aW9uIHRha2VzIDMgYXJndW1lbnRzIChyZXN1bHQsIGtleSwgdmFsdWUpIGFuZCBzaG91bGQgcmV0dXJuIG5ldyByZXN1bHRcbi8vICAgIGhhc2ggYW5kIHVybCBlbmNvZGVkIHN0ciBzZXJpYWxpemVycyBhcmUgcHJvdmlkZWQgd2l0aCB0aGlzIG1vZHVsZVxuLy8gICAgLSBkaXNhYmxlZDogW3RydWUgfCBmYWxzZV0uIElmIHRydWUgc2VyaWFsaXplIGRpc2FibGVkIGZpZWxkcy5cbi8vICAgIC0gZW1wdHk6IFt0cnVlIHwgZmFsc2VdLiBJZiB0cnVlIHNlcmlhbGl6ZSBlbXB0eSBmaWVsZHNcbmZ1bmN0aW9uIHNlcmlhbGl6ZShmb3JtLCBvcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9ICdvYmplY3QnKSB7XG4gICAgICAgIG9wdGlvbnMgPSB7IGhhc2g6ICEhb3B0aW9ucyB9O1xuICAgIH1cbiAgICBlbHNlIGlmIChvcHRpb25zLmhhc2ggPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcHRpb25zLmhhc2ggPSB0cnVlO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQgPSAob3B0aW9ucy5oYXNoKSA/IHt9IDogJyc7XG4gICAgdmFyIHNlcmlhbGl6ZXIgPSBvcHRpb25zLnNlcmlhbGl6ZXIgfHwgKChvcHRpb25zLmhhc2gpID8gaGFzaF9zZXJpYWxpemVyIDogc3RyX3NlcmlhbGl6ZSk7XG5cbiAgICB2YXIgZWxlbWVudHMgPSBmb3JtICYmIGZvcm0uZWxlbWVudHMgPyBmb3JtLmVsZW1lbnRzIDogW107XG5cbiAgICAvL09iamVjdCBzdG9yZSBlYWNoIHJhZGlvIGFuZCBzZXQgaWYgaXQncyBlbXB0eSBvciBub3RcbiAgICB2YXIgcmFkaW9fc3RvcmUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuXG4gICAgZm9yICh2YXIgaT0wIDsgaTxlbGVtZW50cy5sZW5ndGggOyArK2kpIHtcbiAgICAgICAgdmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcblxuICAgICAgICAvLyBpbmdvcmUgZGlzYWJsZWQgZmllbGRzXG4gICAgICAgIGlmICgoIW9wdGlvbnMuZGlzYWJsZWQgJiYgZWxlbWVudC5kaXNhYmxlZCkgfHwgIWVsZW1lbnQubmFtZSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgLy8gaWdub3JlIGFueWh0aW5nIHRoYXQgaXMgbm90IGNvbnNpZGVyZWQgYSBzdWNjZXNzIGZpZWxkXG4gICAgICAgIGlmICgha19yX3N1Y2Nlc3NfY29udHJscy50ZXN0KGVsZW1lbnQubm9kZU5hbWUpIHx8XG4gICAgICAgICAgICBrX3Jfc3VibWl0dGVyLnRlc3QoZWxlbWVudC50eXBlKSkge1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIga2V5ID0gZWxlbWVudC5uYW1lO1xuICAgICAgICB2YXIgdmFsID0gZWxlbWVudC52YWx1ZTtcblxuICAgICAgICAvLyB3ZSBjYW4ndCBqdXN0IHVzZSBlbGVtZW50LnZhbHVlIGZvciBjaGVja2JveGVzIGNhdXNlIHNvbWUgYnJvd3NlcnMgbGllIHRvIHVzXG4gICAgICAgIC8vIHRoZXkgc2F5IFwib25cIiBmb3IgdmFsdWUgd2hlbiB0aGUgYm94IGlzbid0IGNoZWNrZWRcbiAgICAgICAgaWYgKChlbGVtZW50LnR5cGUgPT09ICdjaGVja2JveCcgfHwgZWxlbWVudC50eXBlID09PSAncmFkaW8nKSAmJiAhZWxlbWVudC5jaGVja2VkKSB7XG4gICAgICAgICAgICB2YWwgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB3ZSB3YW50IGVtcHR5IGVsZW1lbnRzXG4gICAgICAgIGlmIChvcHRpb25zLmVtcHR5KSB7XG4gICAgICAgICAgICAvLyBmb3IgY2hlY2tib3hcbiAgICAgICAgICAgIGlmIChlbGVtZW50LnR5cGUgPT09ICdjaGVja2JveCcgJiYgIWVsZW1lbnQuY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgIHZhbCA9ICcnO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBmb3IgcmFkaW9cbiAgICAgICAgICAgIGlmIChlbGVtZW50LnR5cGUgPT09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXJhZGlvX3N0b3JlW2VsZW1lbnQubmFtZV0gJiYgIWVsZW1lbnQuY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICByYWRpb19zdG9yZVtlbGVtZW50Lm5hbWVdID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGVsZW1lbnQuY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICByYWRpb19zdG9yZVtlbGVtZW50Lm5hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGlmIG9wdGlvbnMgZW1wdHkgaXMgdHJ1ZSwgY29udGludWUgb25seSBpZiBpdHMgcmFkaW9cbiAgICAgICAgICAgIGlmICh2YWwgPT0gdW5kZWZpbmVkICYmIGVsZW1lbnQudHlwZSA9PSAncmFkaW8nKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyB2YWx1ZS1sZXNzIGZpZWxkcyBhcmUgaWdub3JlZCB1bmxlc3Mgb3B0aW9ucy5lbXB0eSBpcyB0cnVlXG4gICAgICAgICAgICBpZiAoIXZhbCkge1xuICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gbXVsdGkgc2VsZWN0IGJveGVzXG4gICAgICAgIGlmIChlbGVtZW50LnR5cGUgPT09ICdzZWxlY3QtbXVsdGlwbGUnKSB7XG4gICAgICAgICAgICB2YWwgPSBbXTtcblxuICAgICAgICAgICAgdmFyIHNlbGVjdE9wdGlvbnMgPSBlbGVtZW50Lm9wdGlvbnM7XG4gICAgICAgICAgICB2YXIgaXNTZWxlY3RlZE9wdGlvbnMgPSBmYWxzZTtcbiAgICAgICAgICAgIGZvciAodmFyIGo9MCA7IGo8c2VsZWN0T3B0aW9ucy5sZW5ndGggOyArK2opIHtcbiAgICAgICAgICAgICAgICB2YXIgb3B0aW9uID0gc2VsZWN0T3B0aW9uc1tqXTtcbiAgICAgICAgICAgICAgICB2YXIgYWxsb3dlZEVtcHR5ID0gb3B0aW9ucy5lbXB0eSAmJiAhb3B0aW9uLnZhbHVlO1xuICAgICAgICAgICAgICAgIHZhciBoYXNWYWx1ZSA9IChvcHRpb24udmFsdWUgfHwgYWxsb3dlZEVtcHR5KTtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9uLnNlbGVjdGVkICYmIGhhc1ZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGlzU2VsZWN0ZWRPcHRpb25zID0gdHJ1ZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJZiB1c2luZyBhIGhhc2ggc2VyaWFsaXplciBiZSBzdXJlIHRvIGFkZCB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gY29ycmVjdCBub3RhdGlvbiBmb3IgYW4gYXJyYXkgaW4gdGhlIG11bHRpLXNlbGVjdFxuICAgICAgICAgICAgICAgICAgICAvLyBjb250ZXh0LiBIZXJlIHRoZSBuYW1lIGF0dHJpYnV0ZSBvbiB0aGUgc2VsZWN0IGVsZW1lbnRcbiAgICAgICAgICAgICAgICAgICAgLy8gbWlnaHQgYmUgbWlzc2luZyB0aGUgdHJhaWxpbmcgYnJhY2tldCBwYWlyLiBCb3RoIG5hbWVzXG4gICAgICAgICAgICAgICAgICAgIC8vIFwiZm9vXCIgYW5kIFwiZm9vW11cIiBzaG91bGQgYmUgYXJyYXlzLlxuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5oYXNoICYmIGtleS5zbGljZShrZXkubGVuZ3RoIC0gMikgIT09ICdbXScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHNlcmlhbGl6ZXIocmVzdWx0LCBrZXkgKyAnW10nLCBvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gc2VyaWFsaXplcihyZXN1bHQsIGtleSwgb3B0aW9uLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gU2VyaWFsaXplIGlmIG5vIHNlbGVjdGVkIG9wdGlvbnMgYW5kIG9wdGlvbnMuZW1wdHkgaXMgdHJ1ZVxuICAgICAgICAgICAgaWYgKCFpc1NlbGVjdGVkT3B0aW9ucyAmJiBvcHRpb25zLmVtcHR5KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gc2VyaWFsaXplcihyZXN1bHQsIGtleSwgJycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdCA9IHNlcmlhbGl6ZXIocmVzdWx0LCBrZXksIHZhbCk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGFsbCBlbXB0eSByYWRpbyBidXR0b25zIGFuZCBzZXJpYWxpemUgdGhlbSB3aXRoIGtleT1cIlwiXG4gICAgaWYgKG9wdGlvbnMuZW1wdHkpIHtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHJhZGlvX3N0b3JlKSB7XG4gICAgICAgICAgICBpZiAoIXJhZGlvX3N0b3JlW2tleV0pIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBzZXJpYWxpemVyKHJlc3VsdCwga2V5LCAnJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBwYXJzZV9rZXlzKHN0cmluZykge1xuICAgIHZhciBrZXlzID0gW107XG4gICAgdmFyIHByZWZpeCA9IC9eKFteXFxbXFxdXSopLztcbiAgICB2YXIgY2hpbGRyZW4gPSBuZXcgUmVnRXhwKGJyYWNrZXRzKTtcbiAgICB2YXIgbWF0Y2ggPSBwcmVmaXguZXhlYyhzdHJpbmcpO1xuXG4gICAgaWYgKG1hdGNoWzFdKSB7XG4gICAgICAgIGtleXMucHVzaChtYXRjaFsxXSk7XG4gICAgfVxuXG4gICAgd2hpbGUgKChtYXRjaCA9IGNoaWxkcmVuLmV4ZWMoc3RyaW5nKSkgIT09IG51bGwpIHtcbiAgICAgICAga2V5cy5wdXNoKG1hdGNoWzFdKTtcbiAgICB9XG5cbiAgICByZXR1cm4ga2V5cztcbn1cblxuZnVuY3Rpb24gaGFzaF9hc3NpZ24ocmVzdWx0LCBrZXlzLCB2YWx1ZSkge1xuICAgIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXN1bHQgPSB2YWx1ZTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICB2YXIga2V5ID0ga2V5cy5zaGlmdCgpO1xuICAgIHZhciBiZXR3ZWVuID0ga2V5Lm1hdGNoKC9eXFxbKC4rPylcXF0kLyk7XG5cbiAgICBpZiAoa2V5ID09PSAnW10nKSB7XG4gICAgICAgIHJlc3VsdCA9IHJlc3VsdCB8fCBbXTtcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgICAgICByZXN1bHQucHVzaChoYXNoX2Fzc2lnbihudWxsLCBrZXlzLCB2YWx1ZSkpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgLy8gVGhpcyBtaWdodCBiZSB0aGUgcmVzdWx0IG9mIGJhZCBuYW1lIGF0dHJpYnV0ZXMgbGlrZSBcIltdW2Zvb11cIixcbiAgICAgICAgICAgIC8vIGluIHRoaXMgY2FzZSB0aGUgb3JpZ2luYWwgYHJlc3VsdGAgb2JqZWN0IHdpbGwgYWxyZWFkeSBiZVxuICAgICAgICAgICAgLy8gYXNzaWduZWQgdG8gYW4gb2JqZWN0IGxpdGVyYWwuIFJhdGhlciB0aGFuIGNvZXJjZSB0aGUgb2JqZWN0IHRvXG4gICAgICAgICAgICAvLyBhbiBhcnJheSwgb3IgY2F1c2UgYW4gZXhjZXB0aW9uIHRoZSBhdHRyaWJ1dGUgXCJfdmFsdWVzXCIgaXNcbiAgICAgICAgICAgIC8vIGFzc2lnbmVkIGFzIGFuIGFycmF5LlxuICAgICAgICAgICAgcmVzdWx0Ll92YWx1ZXMgPSByZXN1bHQuX3ZhbHVlcyB8fCBbXTtcbiAgICAgICAgICAgIHJlc3VsdC5fdmFsdWVzLnB1c2goaGFzaF9hc3NpZ24obnVsbCwga2V5cywgdmFsdWUpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgLy8gS2V5IGlzIGFuIGF0dHJpYnV0ZSBuYW1lIGFuZCBjYW4gYmUgYXNzaWduZWQgZGlyZWN0bHkuXG4gICAgaWYgKCFiZXR3ZWVuKSB7XG4gICAgICAgIHJlc3VsdFtrZXldID0gaGFzaF9hc3NpZ24ocmVzdWx0W2tleV0sIGtleXMsIHZhbHVlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIHZhciBzdHJpbmcgPSBiZXR3ZWVuWzFdO1xuICAgICAgICAvLyArdmFyIGNvbnZlcnRzIHRoZSB2YXJpYWJsZSBpbnRvIGEgbnVtYmVyXG4gICAgICAgIC8vIGJldHRlciB0aGFuIHBhcnNlSW50IGJlY2F1c2UgaXQgZG9lc24ndCB0cnVuY2F0ZSBhd2F5IHRyYWlsaW5nXG4gICAgICAgIC8vIGxldHRlcnMgYW5kIGFjdHVhbGx5IGZhaWxzIGlmIHdob2xlIHRoaW5nIGlzIG5vdCBhIG51bWJlclxuICAgICAgICB2YXIgaW5kZXggPSArc3RyaW5nO1xuXG4gICAgICAgIC8vIElmIHRoZSBjaGFyYWN0ZXJzIGJldHdlZW4gdGhlIGJyYWNrZXRzIGlzIG5vdCBhIG51bWJlciBpdCBpcyBhblxuICAgICAgICAvLyBhdHRyaWJ1dGUgbmFtZSBhbmQgY2FuIGJlIGFzc2lnbmVkIGRpcmVjdGx5LlxuICAgICAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQgfHwge307XG4gICAgICAgICAgICByZXN1bHRbc3RyaW5nXSA9IGhhc2hfYXNzaWduKHJlc3VsdFtzdHJpbmddLCBrZXlzLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQgfHwgW107XG4gICAgICAgICAgICByZXN1bHRbaW5kZXhdID0gaGFzaF9hc3NpZ24ocmVzdWx0W2luZGV4XSwga2V5cywgdmFsdWUpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8gT2JqZWN0L2hhc2ggZW5jb2Rpbmcgc2VyaWFsaXplci5cbmZ1bmN0aW9uIGhhc2hfc2VyaWFsaXplcihyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICB2YXIgbWF0Y2hlcyA9IGtleS5tYXRjaChicmFja2V0cyk7XG5cbiAgICAvLyBIYXMgYnJhY2tldHM/IFVzZSB0aGUgcmVjdXJzaXZlIGFzc2lnbm1lbnQgZnVuY3Rpb24gdG8gd2FsayB0aGUga2V5cyxcbiAgICAvLyBjb25zdHJ1Y3QgYW55IG1pc3Npbmcgb2JqZWN0cyBpbiB0aGUgcmVzdWx0IHRyZWUgYW5kIG1ha2UgdGhlIGFzc2lnbm1lbnRcbiAgICAvLyBhdCB0aGUgZW5kIG9mIHRoZSBjaGFpbi5cbiAgICBpZiAobWF0Y2hlcykge1xuICAgICAgICB2YXIga2V5cyA9IHBhcnNlX2tleXMoa2V5KTtcbiAgICAgICAgaGFzaF9hc3NpZ24ocmVzdWx0LCBrZXlzLCB2YWx1ZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICAvLyBOb24gYnJhY2tldCBub3RhdGlvbiBjYW4gbWFrZSBhc3NpZ25tZW50cyBkaXJlY3RseS5cbiAgICAgICAgdmFyIGV4aXN0aW5nID0gcmVzdWx0W2tleV07XG5cbiAgICAgICAgLy8gSWYgdGhlIHZhbHVlIGhhcyBiZWVuIGFzc2lnbmVkIGFscmVhZHkgKGZvciBpbnN0YW5jZSB3aGVuIGEgcmFkaW8gYW5kXG4gICAgICAgIC8vIGEgY2hlY2tib3ggaGF2ZSB0aGUgc2FtZSBuYW1lIGF0dHJpYnV0ZSkgY29udmVydCB0aGUgcHJldmlvdXMgdmFsdWVcbiAgICAgICAgLy8gaW50byBhbiBhcnJheSBiZWZvcmUgcHVzaGluZyBpbnRvIGl0LlxuICAgICAgICAvL1xuICAgICAgICAvLyBOT1RFOiBJZiB0aGlzIHJlcXVpcmVtZW50IHdlcmUgcmVtb3ZlZCBhbGwgaGFzaCBjcmVhdGlvbiBhbmRcbiAgICAgICAgLy8gYXNzaWdubWVudCBjb3VsZCBnbyB0aHJvdWdoIGBoYXNoX2Fzc2lnbmAuXG4gICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGV4aXN0aW5nKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gWyBleGlzdGluZyBdO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXN1bHRba2V5XS5wdXNoKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdFtrZXldID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyB1cmxmb3JtIGVuY29kaW5nIHNlcmlhbGl6ZXJcbmZ1bmN0aW9uIHN0cl9zZXJpYWxpemUocmVzdWx0LCBrZXksIHZhbHVlKSB7XG4gICAgLy8gZW5jb2RlIG5ld2xpbmVzIGFzIFxcclxcbiBjYXVzZSB0aGUgaHRtbCBzcGVjIHNheXMgc29cbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoLyhcXHIpP1xcbi9nLCAnXFxyXFxuJyk7XG4gICAgdmFsdWUgPSBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gICAgLy8gc3BhY2VzIHNob3VsZCBiZSAnKycgcmF0aGVyIHRoYW4gJyUyMCcuXG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC8lMjAvZywgJysnKTtcbiAgICByZXR1cm4gcmVzdWx0ICsgKHJlc3VsdCA/ICcmJyA6ICcnKSArIGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgJz0nICsgdmFsdWU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2VyaWFsaXplO1xuIiwiLyohXG4gKiBEZXRlcm1pbmUgaWYgYW4gb2JqZWN0IGlzIGEgQnVmZmVyXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGh0dHBzOi8vZmVyb3NzLm9yZz5cbiAqIEBsaWNlbnNlICBNSVRcbiAqL1xuXG4vLyBUaGUgX2lzQnVmZmVyIGNoZWNrIGlzIGZvciBTYWZhcmkgNS03IHN1cHBvcnQsIGJlY2F1c2UgaXQncyBtaXNzaW5nXG4vLyBPYmplY3QucHJvdG90eXBlLmNvbnN0cnVjdG9yLiBSZW1vdmUgdGhpcyBldmVudHVhbGx5XG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChvYmopIHtcbiAgcmV0dXJuIG9iaiAhPSBudWxsICYmIChpc0J1ZmZlcihvYmopIHx8IGlzU2xvd0J1ZmZlcihvYmopIHx8ICEhb2JqLl9pc0J1ZmZlcilcbn1cblxuZnVuY3Rpb24gaXNCdWZmZXIgKG9iaikge1xuICByZXR1cm4gISFvYmouY29uc3RydWN0b3IgJiYgdHlwZW9mIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlciA9PT0gJ2Z1bmN0aW9uJyAmJiBvYmouY29uc3RydWN0b3IuaXNCdWZmZXIob2JqKVxufVxuXG4vLyBGb3IgTm9kZSB2MC4xMCBzdXBwb3J0LiBSZW1vdmUgdGhpcyBldmVudHVhbGx5LlxuZnVuY3Rpb24gaXNTbG93QnVmZmVyIChvYmopIHtcbiAgcmV0dXJuIHR5cGVvZiBvYmoucmVhZEZsb2F0TEUgPT09ICdmdW5jdGlvbicgJiYgdHlwZW9mIG9iai5zbGljZSA9PT0gJ2Z1bmN0aW9uJyAmJiBpc0J1ZmZlcihvYmouc2xpY2UoMCwgMCkpXG59XG4iLCIvKipcbiAqIGlzTW9iaWxlLmpzIHYwLjQuMVxuICpcbiAqIEEgc2ltcGxlIGxpYnJhcnkgdG8gZGV0ZWN0IEFwcGxlIHBob25lcyBhbmQgdGFibGV0cyxcbiAqIEFuZHJvaWQgcGhvbmVzIGFuZCB0YWJsZXRzLCBvdGhlciBtb2JpbGUgZGV2aWNlcyAobGlrZSBibGFja2JlcnJ5LCBtaW5pLW9wZXJhIGFuZCB3aW5kb3dzIHBob25lKSxcbiAqIGFuZCBhbnkga2luZCBvZiBzZXZlbiBpbmNoIGRldmljZSwgdmlhIHVzZXIgYWdlbnQgc25pZmZpbmcuXG4gKlxuICogQGF1dGhvcjogS2FpIE1hbGxlYSAoa21hbGxlYUBnbWFpbC5jb20pXG4gKlxuICogQGxpY2Vuc2U6IGh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL3B1YmxpY2RvbWFpbi96ZXJvLzEuMC9cbiAqL1xuKGZ1bmN0aW9uIChnbG9iYWwpIHtcblxuICAgIHZhciBhcHBsZV9waG9uZSAgICAgICAgID0gL2lQaG9uZS9pLFxuICAgICAgICBhcHBsZV9pcG9kICAgICAgICAgID0gL2lQb2QvaSxcbiAgICAgICAgYXBwbGVfdGFibGV0ICAgICAgICA9IC9pUGFkL2ksXG4gICAgICAgIGFuZHJvaWRfcGhvbmUgICAgICAgPSAvKD89LipcXGJBbmRyb2lkXFxiKSg/PS4qXFxiTW9iaWxlXFxiKS9pLCAvLyBNYXRjaCAnQW5kcm9pZCcgQU5EICdNb2JpbGUnXG4gICAgICAgIGFuZHJvaWRfdGFibGV0ICAgICAgPSAvQW5kcm9pZC9pLFxuICAgICAgICBhbWF6b25fcGhvbmUgICAgICAgID0gLyg/PS4qXFxiQW5kcm9pZFxcYikoPz0uKlxcYlNENDkzMFVSXFxiKS9pLFxuICAgICAgICBhbWF6b25fdGFibGV0ICAgICAgID0gLyg/PS4qXFxiQW5kcm9pZFxcYikoPz0uKlxcYig/OktGT1R8S0ZUVHxLRkpXSXxLRkpXQXxLRlNPV0l8S0ZUSFdJfEtGVEhXQXxLRkFQV0l8S0ZBUFdBfEtGQVJXSXxLRkFTV0l8S0ZTQVdJfEtGU0FXQSlcXGIpL2ksXG4gICAgICAgIHdpbmRvd3NfcGhvbmUgICAgICAgPSAvV2luZG93cyBQaG9uZS9pLFxuICAgICAgICB3aW5kb3dzX3RhYmxldCAgICAgID0gLyg/PS4qXFxiV2luZG93c1xcYikoPz0uKlxcYkFSTVxcYikvaSwgLy8gTWF0Y2ggJ1dpbmRvd3MnIEFORCAnQVJNJ1xuICAgICAgICBvdGhlcl9ibGFja2JlcnJ5ICAgID0gL0JsYWNrQmVycnkvaSxcbiAgICAgICAgb3RoZXJfYmxhY2tiZXJyeV8xMCA9IC9CQjEwL2ksXG4gICAgICAgIG90aGVyX29wZXJhICAgICAgICAgPSAvT3BlcmEgTWluaS9pLFxuICAgICAgICBvdGhlcl9jaHJvbWUgICAgICAgID0gLyhDcmlPU3xDaHJvbWUpKD89LipcXGJNb2JpbGVcXGIpL2ksXG4gICAgICAgIG90aGVyX2ZpcmVmb3ggICAgICAgPSAvKD89LipcXGJGaXJlZm94XFxiKSg/PS4qXFxiTW9iaWxlXFxiKS9pLCAvLyBNYXRjaCAnRmlyZWZveCcgQU5EICdNb2JpbGUnXG4gICAgICAgIHNldmVuX2luY2ggPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgJyg/OicgKyAgICAgICAgIC8vIE5vbi1jYXB0dXJpbmcgZ3JvdXBcblxuICAgICAgICAgICAgJ05leHVzIDcnICsgICAgIC8vIE5leHVzIDdcblxuICAgICAgICAgICAgJ3wnICsgICAgICAgICAgIC8vIE9SXG5cbiAgICAgICAgICAgICdCTlRWMjUwJyArICAgICAvLyBCJk4gTm9vayBUYWJsZXQgNyBpbmNoXG5cbiAgICAgICAgICAgICd8JyArICAgICAgICAgICAvLyBPUlxuXG4gICAgICAgICAgICAnS2luZGxlIEZpcmUnICsgLy8gS2luZGxlIEZpcmVcblxuICAgICAgICAgICAgJ3wnICsgICAgICAgICAgIC8vIE9SXG5cbiAgICAgICAgICAgICdTaWxrJyArICAgICAgICAvLyBLaW5kbGUgRmlyZSwgU2lsayBBY2NlbGVyYXRlZFxuXG4gICAgICAgICAgICAnfCcgKyAgICAgICAgICAgLy8gT1JcblxuICAgICAgICAgICAgJ0dULVAxMDAwJyArICAgIC8vIEdhbGF4eSBUYWIgNyBpbmNoXG5cbiAgICAgICAgICAgICcpJywgICAgICAgICAgICAvLyBFbmQgbm9uLWNhcHR1cmluZyBncm91cFxuXG4gICAgICAgICAgICAnaScpOyAgICAgICAgICAgLy8gQ2FzZS1pbnNlbnNpdGl2ZSBtYXRjaGluZ1xuXG4gICAgdmFyIG1hdGNoID0gZnVuY3Rpb24ocmVnZXgsIHVzZXJBZ2VudCkge1xuICAgICAgICByZXR1cm4gcmVnZXgudGVzdCh1c2VyQWdlbnQpO1xuICAgIH07XG5cbiAgICB2YXIgSXNNb2JpbGVDbGFzcyA9IGZ1bmN0aW9uKHVzZXJBZ2VudCkge1xuICAgICAgICB2YXIgdWEgPSB1c2VyQWdlbnQgfHwgbmF2aWdhdG9yLnVzZXJBZ2VudDtcblxuICAgICAgICAvLyBGYWNlYm9vayBtb2JpbGUgYXBwJ3MgaW50ZWdyYXRlZCBicm93c2VyIGFkZHMgYSBidW5jaCBvZiBzdHJpbmdzIHRoYXRcbiAgICAgICAgLy8gbWF0Y2ggZXZlcnl0aGluZy4gU3RyaXAgaXQgb3V0IGlmIGl0IGV4aXN0cy5cbiAgICAgICAgdmFyIHRtcCA9IHVhLnNwbGl0KCdbRkJBTicpO1xuICAgICAgICBpZiAodHlwZW9mIHRtcFsxXSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHVhID0gdG1wWzBdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHdpdHRlciBtb2JpbGUgYXBwJ3MgaW50ZWdyYXRlZCBicm93c2VyIG9uIGlQYWQgYWRkcyBhIFwiVHdpdHRlciBmb3JcbiAgICAgICAgLy8gaVBob25lXCIgc3RyaW5nLiBTYW1lIHByb2JhYmxlIGhhcHBlbnMgb24gb3RoZXIgdGFibGV0IHBsYXRmb3Jtcy5cbiAgICAgICAgLy8gVGhpcyB3aWxsIGNvbmZ1c2UgZGV0ZWN0aW9uIHNvIHN0cmlwIGl0IG91dCBpZiBpdCBleGlzdHMuXG4gICAgICAgIHRtcCA9IHVhLnNwbGl0KCdUd2l0dGVyJyk7XG4gICAgICAgIGlmICh0eXBlb2YgdG1wWzFdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdWEgPSB0bXBbMF07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmFwcGxlID0ge1xuICAgICAgICAgICAgcGhvbmU6ICBtYXRjaChhcHBsZV9waG9uZSwgdWEpLFxuICAgICAgICAgICAgaXBvZDogICBtYXRjaChhcHBsZV9pcG9kLCB1YSksXG4gICAgICAgICAgICB0YWJsZXQ6ICFtYXRjaChhcHBsZV9waG9uZSwgdWEpICYmIG1hdGNoKGFwcGxlX3RhYmxldCwgdWEpLFxuICAgICAgICAgICAgZGV2aWNlOiBtYXRjaChhcHBsZV9waG9uZSwgdWEpIHx8IG1hdGNoKGFwcGxlX2lwb2QsIHVhKSB8fCBtYXRjaChhcHBsZV90YWJsZXQsIHVhKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmFtYXpvbiA9IHtcbiAgICAgICAgICAgIHBob25lOiAgbWF0Y2goYW1hem9uX3Bob25lLCB1YSksXG4gICAgICAgICAgICB0YWJsZXQ6ICFtYXRjaChhbWF6b25fcGhvbmUsIHVhKSAmJiBtYXRjaChhbWF6b25fdGFibGV0LCB1YSksXG4gICAgICAgICAgICBkZXZpY2U6IG1hdGNoKGFtYXpvbl9waG9uZSwgdWEpIHx8IG1hdGNoKGFtYXpvbl90YWJsZXQsIHVhKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLmFuZHJvaWQgPSB7XG4gICAgICAgICAgICBwaG9uZTogIG1hdGNoKGFtYXpvbl9waG9uZSwgdWEpIHx8IG1hdGNoKGFuZHJvaWRfcGhvbmUsIHVhKSxcbiAgICAgICAgICAgIHRhYmxldDogIW1hdGNoKGFtYXpvbl9waG9uZSwgdWEpICYmICFtYXRjaChhbmRyb2lkX3Bob25lLCB1YSkgJiYgKG1hdGNoKGFtYXpvbl90YWJsZXQsIHVhKSB8fCBtYXRjaChhbmRyb2lkX3RhYmxldCwgdWEpKSxcbiAgICAgICAgICAgIGRldmljZTogbWF0Y2goYW1hem9uX3Bob25lLCB1YSkgfHwgbWF0Y2goYW1hem9uX3RhYmxldCwgdWEpIHx8IG1hdGNoKGFuZHJvaWRfcGhvbmUsIHVhKSB8fCBtYXRjaChhbmRyb2lkX3RhYmxldCwgdWEpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMud2luZG93cyA9IHtcbiAgICAgICAgICAgIHBob25lOiAgbWF0Y2god2luZG93c19waG9uZSwgdWEpLFxuICAgICAgICAgICAgdGFibGV0OiBtYXRjaCh3aW5kb3dzX3RhYmxldCwgdWEpLFxuICAgICAgICAgICAgZGV2aWNlOiBtYXRjaCh3aW5kb3dzX3Bob25lLCB1YSkgfHwgbWF0Y2god2luZG93c190YWJsZXQsIHVhKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLm90aGVyID0ge1xuICAgICAgICAgICAgYmxhY2tiZXJyeTogICBtYXRjaChvdGhlcl9ibGFja2JlcnJ5LCB1YSksXG4gICAgICAgICAgICBibGFja2JlcnJ5MTA6IG1hdGNoKG90aGVyX2JsYWNrYmVycnlfMTAsIHVhKSxcbiAgICAgICAgICAgIG9wZXJhOiAgICAgICAgbWF0Y2gob3RoZXJfb3BlcmEsIHVhKSxcbiAgICAgICAgICAgIGZpcmVmb3g6ICAgICAgbWF0Y2gob3RoZXJfZmlyZWZveCwgdWEpLFxuICAgICAgICAgICAgY2hyb21lOiAgICAgICBtYXRjaChvdGhlcl9jaHJvbWUsIHVhKSxcbiAgICAgICAgICAgIGRldmljZTogICAgICAgbWF0Y2gob3RoZXJfYmxhY2tiZXJyeSwgdWEpIHx8IG1hdGNoKG90aGVyX2JsYWNrYmVycnlfMTAsIHVhKSB8fCBtYXRjaChvdGhlcl9vcGVyYSwgdWEpIHx8IG1hdGNoKG90aGVyX2ZpcmVmb3gsIHVhKSB8fCBtYXRjaChvdGhlcl9jaHJvbWUsIHVhKVxuICAgICAgICB9O1xuICAgICAgICB0aGlzLnNldmVuX2luY2ggPSBtYXRjaChzZXZlbl9pbmNoLCB1YSk7XG4gICAgICAgIHRoaXMuYW55ID0gdGhpcy5hcHBsZS5kZXZpY2UgfHwgdGhpcy5hbmRyb2lkLmRldmljZSB8fCB0aGlzLndpbmRvd3MuZGV2aWNlIHx8IHRoaXMub3RoZXIuZGV2aWNlIHx8IHRoaXMuc2V2ZW5faW5jaDtcblxuICAgICAgICAvLyBleGNsdWRlcyAnb3RoZXInIGRldmljZXMgYW5kIGlwb2RzLCB0YXJnZXRpbmcgdG91Y2hzY3JlZW4gcGhvbmVzXG4gICAgICAgIHRoaXMucGhvbmUgPSB0aGlzLmFwcGxlLnBob25lIHx8IHRoaXMuYW5kcm9pZC5waG9uZSB8fCB0aGlzLndpbmRvd3MucGhvbmU7XG5cbiAgICAgICAgLy8gZXhjbHVkZXMgNyBpbmNoIGRldmljZXMsIGNsYXNzaWZ5aW5nIGFzIHBob25lIG9yIHRhYmxldCBpcyBsZWZ0IHRvIHRoZSB1c2VyXG4gICAgICAgIHRoaXMudGFibGV0ID0gdGhpcy5hcHBsZS50YWJsZXQgfHwgdGhpcy5hbmRyb2lkLnRhYmxldCB8fCB0aGlzLndpbmRvd3MudGFibGV0O1xuXG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgdmFyIGluc3RhbnRpYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBJTSA9IG5ldyBJc01vYmlsZUNsYXNzKCk7XG4gICAgICAgIElNLkNsYXNzID0gSXNNb2JpbGVDbGFzcztcbiAgICAgICAgcmV0dXJuIElNO1xuICAgIH07XG5cbiAgICBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgJiYgdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy9ub2RlXG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gSXNNb2JpbGVDbGFzcztcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzICYmIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIC8vYnJvd3NlcmlmeVxuICAgICAgICBtb2R1bGUuZXhwb3J0cyA9IGluc3RhbnRpYXRlKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICAgICAgLy9BTURcbiAgICAgICAgZGVmaW5lKCdpc01vYmlsZScsIFtdLCBnbG9iYWwuaXNNb2JpbGUgPSBpbnN0YW50aWF0ZSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBnbG9iYWwuaXNNb2JpbGUgPSBpbnN0YW50aWF0ZSgpO1xuICAgIH1cblxufSkodGhpcyk7XG4iLCIvKiFcbiAqIEphdmFTY3JpcHQgQ29va2llIHYyLjIuMFxuICogaHR0cHM6Ly9naXRodWIuY29tL2pzLWNvb2tpZS9qcy1jb29raWVcbiAqXG4gKiBDb3B5cmlnaHQgMjAwNiwgMjAxNSBLbGF1cyBIYXJ0bCAmIEZhZ25lciBCcmFja1xuICogUmVsZWFzZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKi9cbjsoZnVuY3Rpb24gKGZhY3RvcnkpIHtcblx0dmFyIHJlZ2lzdGVyZWRJbk1vZHVsZUxvYWRlciA9IGZhbHNlO1xuXHRpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG5cdFx0ZGVmaW5lKGZhY3RvcnkpO1xuXHRcdHJlZ2lzdGVyZWRJbk1vZHVsZUxvYWRlciA9IHRydWU7XG5cdH1cblx0aWYgKHR5cGVvZiBleHBvcnRzID09PSAnb2JqZWN0Jykge1xuXHRcdG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuXHRcdHJlZ2lzdGVyZWRJbk1vZHVsZUxvYWRlciA9IHRydWU7XG5cdH1cblx0aWYgKCFyZWdpc3RlcmVkSW5Nb2R1bGVMb2FkZXIpIHtcblx0XHR2YXIgT2xkQ29va2llcyA9IHdpbmRvdy5Db29raWVzO1xuXHRcdHZhciBhcGkgPSB3aW5kb3cuQ29va2llcyA9IGZhY3RvcnkoKTtcblx0XHRhcGkubm9Db25mbGljdCA9IGZ1bmN0aW9uICgpIHtcblx0XHRcdHdpbmRvdy5Db29raWVzID0gT2xkQ29va2llcztcblx0XHRcdHJldHVybiBhcGk7XG5cdFx0fTtcblx0fVxufShmdW5jdGlvbiAoKSB7XG5cdGZ1bmN0aW9uIGV4dGVuZCAoKSB7XG5cdFx0dmFyIGkgPSAwO1xuXHRcdHZhciByZXN1bHQgPSB7fTtcblx0XHRmb3IgKDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dmFyIGF0dHJpYnV0ZXMgPSBhcmd1bWVudHNbIGkgXTtcblx0XHRcdGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG5cdFx0XHRcdHJlc3VsdFtrZXldID0gYXR0cmlidXRlc1trZXldO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0ZnVuY3Rpb24gaW5pdCAoY29udmVydGVyKSB7XG5cdFx0ZnVuY3Rpb24gYXBpIChrZXksIHZhbHVlLCBhdHRyaWJ1dGVzKSB7XG5cdFx0XHR2YXIgcmVzdWx0O1xuXHRcdFx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBXcml0ZVxuXG5cdFx0XHRpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdFx0YXR0cmlidXRlcyA9IGV4dGVuZCh7XG5cdFx0XHRcdFx0cGF0aDogJy8nXG5cdFx0XHRcdH0sIGFwaS5kZWZhdWx0cywgYXR0cmlidXRlcyk7XG5cblx0XHRcdFx0aWYgKHR5cGVvZiBhdHRyaWJ1dGVzLmV4cGlyZXMgPT09ICdudW1iZXInKSB7XG5cdFx0XHRcdFx0dmFyIGV4cGlyZXMgPSBuZXcgRGF0ZSgpO1xuXHRcdFx0XHRcdGV4cGlyZXMuc2V0TWlsbGlzZWNvbmRzKGV4cGlyZXMuZ2V0TWlsbGlzZWNvbmRzKCkgKyBhdHRyaWJ1dGVzLmV4cGlyZXMgKiA4NjRlKzUpO1xuXHRcdFx0XHRcdGF0dHJpYnV0ZXMuZXhwaXJlcyA9IGV4cGlyZXM7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBXZSdyZSB1c2luZyBcImV4cGlyZXNcIiBiZWNhdXNlIFwibWF4LWFnZVwiIGlzIG5vdCBzdXBwb3J0ZWQgYnkgSUVcblx0XHRcdFx0YXR0cmlidXRlcy5leHBpcmVzID0gYXR0cmlidXRlcy5leHBpcmVzID8gYXR0cmlidXRlcy5leHBpcmVzLnRvVVRDU3RyaW5nKCkgOiAnJztcblxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHZhbHVlKTtcblx0XHRcdFx0XHRpZiAoL15bXFx7XFxbXS8udGVzdChyZXN1bHQpKSB7XG5cdFx0XHRcdFx0XHR2YWx1ZSA9IHJlc3VsdDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHt9XG5cblx0XHRcdFx0aWYgKCFjb252ZXJ0ZXIud3JpdGUpIHtcblx0XHRcdFx0XHR2YWx1ZSA9IGVuY29kZVVSSUNvbXBvbmVudChTdHJpbmcodmFsdWUpKVxuXHRcdFx0XHRcdFx0LnJlcGxhY2UoLyUoMjN8MjR8MjZ8MkJ8M0F8M0N8M0V8M0R8MkZ8M0Z8NDB8NUJ8NUR8NUV8NjB8N0J8N0R8N0MpL2csIGRlY29kZVVSSUNvbXBvbmVudCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFsdWUgPSBjb252ZXJ0ZXIud3JpdGUodmFsdWUsIGtleSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRrZXkgPSBlbmNvZGVVUklDb21wb25lbnQoU3RyaW5nKGtleSkpO1xuXHRcdFx0XHRrZXkgPSBrZXkucmVwbGFjZSgvJSgyM3wyNHwyNnwyQnw1RXw2MHw3QykvZywgZGVjb2RlVVJJQ29tcG9uZW50KTtcblx0XHRcdFx0a2V5ID0ga2V5LnJlcGxhY2UoL1tcXChcXCldL2csIGVzY2FwZSk7XG5cblx0XHRcdFx0dmFyIHN0cmluZ2lmaWVkQXR0cmlidXRlcyA9ICcnO1xuXG5cdFx0XHRcdGZvciAodmFyIGF0dHJpYnV0ZU5hbWUgaW4gYXR0cmlidXRlcykge1xuXHRcdFx0XHRcdGlmICghYXR0cmlidXRlc1thdHRyaWJ1dGVOYW1lXSkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN0cmluZ2lmaWVkQXR0cmlidXRlcyArPSAnOyAnICsgYXR0cmlidXRlTmFtZTtcblx0XHRcdFx0XHRpZiAoYXR0cmlidXRlc1thdHRyaWJ1dGVOYW1lXSA9PT0gdHJ1ZSkge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHN0cmluZ2lmaWVkQXR0cmlidXRlcyArPSAnPScgKyBhdHRyaWJ1dGVzW2F0dHJpYnV0ZU5hbWVdO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiAoZG9jdW1lbnQuY29va2llID0ga2V5ICsgJz0nICsgdmFsdWUgKyBzdHJpbmdpZmllZEF0dHJpYnV0ZXMpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBSZWFkXG5cblx0XHRcdGlmICgha2V5KSB7XG5cdFx0XHRcdHJlc3VsdCA9IHt9O1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBUbyBwcmV2ZW50IHRoZSBmb3IgbG9vcCBpbiB0aGUgZmlyc3QgcGxhY2UgYXNzaWduIGFuIGVtcHR5IGFycmF5XG5cdFx0XHQvLyBpbiBjYXNlIHRoZXJlIGFyZSBubyBjb29raWVzIGF0IGFsbC4gQWxzbyBwcmV2ZW50cyBvZGQgcmVzdWx0IHdoZW5cblx0XHRcdC8vIGNhbGxpbmcgXCJnZXQoKVwiXG5cdFx0XHR2YXIgY29va2llcyA9IGRvY3VtZW50LmNvb2tpZSA/IGRvY3VtZW50LmNvb2tpZS5zcGxpdCgnOyAnKSA6IFtdO1xuXHRcdFx0dmFyIHJkZWNvZGUgPSAvKCVbMC05QS1aXXsyfSkrL2c7XG5cdFx0XHR2YXIgaSA9IDA7XG5cblx0XHRcdGZvciAoOyBpIDwgY29va2llcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHR2YXIgcGFydHMgPSBjb29raWVzW2ldLnNwbGl0KCc9Jyk7XG5cdFx0XHRcdHZhciBjb29raWUgPSBwYXJ0cy5zbGljZSgxKS5qb2luKCc9Jyk7XG5cblx0XHRcdFx0aWYgKCF0aGlzLmpzb24gJiYgY29va2llLmNoYXJBdCgwKSA9PT0gJ1wiJykge1xuXHRcdFx0XHRcdGNvb2tpZSA9IGNvb2tpZS5zbGljZSgxLCAtMSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdHZhciBuYW1lID0gcGFydHNbMF0ucmVwbGFjZShyZGVjb2RlLCBkZWNvZGVVUklDb21wb25lbnQpO1xuXHRcdFx0XHRcdGNvb2tpZSA9IGNvbnZlcnRlci5yZWFkID9cblx0XHRcdFx0XHRcdGNvbnZlcnRlci5yZWFkKGNvb2tpZSwgbmFtZSkgOiBjb252ZXJ0ZXIoY29va2llLCBuYW1lKSB8fFxuXHRcdFx0XHRcdFx0Y29va2llLnJlcGxhY2UocmRlY29kZSwgZGVjb2RlVVJJQ29tcG9uZW50KTtcblxuXHRcdFx0XHRcdGlmICh0aGlzLmpzb24pIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGNvb2tpZSA9IEpTT04ucGFyc2UoY29va2llKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKGUpIHt9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGtleSA9PT0gbmFtZSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0ID0gY29va2llO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCFrZXkpIHtcblx0XHRcdFx0XHRcdHJlc3VsdFtuYW1lXSA9IGNvb2tpZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHt9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiByZXN1bHQ7XG5cdFx0fVxuXG5cdFx0YXBpLnNldCA9IGFwaTtcblx0XHRhcGkuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuXHRcdFx0cmV0dXJuIGFwaS5jYWxsKGFwaSwga2V5KTtcblx0XHR9O1xuXHRcdGFwaS5nZXRKU09OID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIGFwaS5hcHBseSh7XG5cdFx0XHRcdGpzb246IHRydWVcblx0XHRcdH0sIFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzKSk7XG5cdFx0fTtcblx0XHRhcGkuZGVmYXVsdHMgPSB7fTtcblxuXHRcdGFwaS5yZW1vdmUgPSBmdW5jdGlvbiAoa2V5LCBhdHRyaWJ1dGVzKSB7XG5cdFx0XHRhcGkoa2V5LCAnJywgZXh0ZW5kKGF0dHJpYnV0ZXMsIHtcblx0XHRcdFx0ZXhwaXJlczogLTFcblx0XHRcdH0pKTtcblx0XHR9O1xuXG5cdFx0YXBpLndpdGhDb252ZXJ0ZXIgPSBpbml0O1xuXG5cdFx0cmV0dXJuIGFwaTtcblx0fVxuXG5cdHJldHVybiBpbml0KGZ1bmN0aW9uICgpIHt9KTtcbn0pKTtcbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucHJlcGVuZE9uY2VMaXN0ZW5lciA9IG5vb3A7XG5cbnByb2Nlc3MubGlzdGVuZXJzID0gZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIFtdIH1cblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJcbmltcG9ydCBpc01vYmlsZSBmcm9tICdpc21vYmlsZWpzJztcbmltcG9ydCBzZXJpYWxpemUgZnJvbSAnZm9ybS1zZXJpYWxpemUnO1xuaW1wb3J0IENvb2tpZXMgZnJvbSAnanMtY29va2llJztcbmltcG9ydCBheGlvcyBmcm9tICdheGlvcyc7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgY29uc3QgaGVhZGVycyA9IHt9O1xuICBjb25zdCBjbGllbnRLZXkgPSBDb29raWVzLmdldCgnY2xpZW50Jyk7XG4gIGNvbnN0IHVpZCA9IENvb2tpZXMuZ2V0KCd1aWQnKTtcbiAgY29uc3QgdG9rZW4gPSBDb29raWVzLmdldCgndG9rZW4nKTtcblxuICBpZiAoY2xpZW50S2V5ICYmIHVpZCAmJiB0b2tlbikge1xuICAgIGhlYWRlcnNbJ2FjY2Vzcy10b2tlbiddID0gdG9rZW47XG4gICAgaGVhZGVycy51aWQgPSB1aWQ7XG4gICAgaGVhZGVycy5jbGllbnQgPSBjbGllbnRLZXk7XG4gIH1cblxuXG4gIC8qKlxuICAgKiBDb250YWN0IGZvcm0gc2VsZWN0b3JcbiAgICovXG5cbiAgJCgnW2RhdGEtc2VsZWN0LXByb2R1Y3RdJykub24oJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgcHJvZHVjdCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YSgnc2VsZWN0LXByb2R1Y3QnKTtcblxuICAgIC8vIFNjcm9sbCB0byByZWdpc3RyYXRpb24gZm9ybVxuICAgIHplbnNjcm9sbC50byhkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvZHVjdF9pbnRlcmVzdCcpLCA1MDApO1xuXG4gICAgLy8gU2V0IHRoZSB2YWx1ZSBvZiB0aGUgcHJvZHVjdCBpbnRlcmVzdCBkcm9wZG93blxuICAgICQoJyNwcm9kdWN0X2ludGVyZXN0JykudmFsKHByb2R1Y3QpO1xuICAgICQoJyNwcm9kdWN0X2ludGVyZXN0JykudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAvLyBBdXRvZm9jdXMgdGhlIGZpcnN0IGlucHV0XG4gICAgJCgnI25hbWUnKS5mb2N1cygpO1xuICB9KTtcblxuICBsZXQgY3VzdG9tQ291bnRyeUNvZGUgPSBmYWxzZTtcbiAgJCgnW25hbWU9XCJmaXJzdF9uYW1lXCJdLCBbbmFtZT1cIm1pZGRsZV9uYW1lXCJdLCBbbmFtZT1cImxhc3RfbmFtZVwiXScpLm9uKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcbiAgICBpZiAoJChldmVudC5jdXJyZW50VGFyZ2V0KS52YWwoKSAmJiAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpLm1hdGNoKC9cXGQrL2cpKSB7XG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgcmVkJyk7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PllvdXIgbmFtZSBzaG91bGQgbm90IGluY2x1ZGUgbnVtYmVycy4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkICNlZWUnKTtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnJyk7XG4gICAgfVxuICB9KTtcblxuICAkKCdbbmFtZT1cInBhc3N3b3JkX2NvbmZpcm1hdGlvblwiXScpLm9uKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcbiAgICAvLyAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpID09PSAkKCdbbmFtZT1cInBhc3N3b3JkXCJdJykudmFsKClcbiAgICAvLyBjb25zdCBjdXJyZW50TGVuZ3RoID0gJChldmVudC5jdXJyZW50VGFyZ2V0KS52YWwoKS5sZW5ndGg7XG4gICAgLy8gY29uc29sZS5sb2coY3VycmVudExlbmd0aCk7XG4gICAgaWYgKCQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkgPT09ICQoJ1tuYW1lPVwicGFzc3dvcmRcIl0nKS52YWwoKSkge1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkICNlZWUnKTtcbiAgICAgICQoJ1tuYW1lPVwicGFzc3dvcmRcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkICNlZWUnKTtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCByZWQnKTtcbiAgICAgICQoJ1tuYW1lPVwicGFzc3dvcmRcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5Zb3VyIHBhc3N3b3JkcyBtdXN0IG1hdGNoLicpO1xuICAgIH1cblxuICAgIGlmICgkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpLmxlbmd0aCA8PSA3KSB7XG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgcmVkJyk7XG4gICAgICAkKCdbbmFtZT1cInBhc3N3b3JkXCJdJykuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCByZWQnKTtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnPGRpdiBjbGFzcz1cImVycm9yLWljb25cIj4hPC9kaXY+WW91ciBwYXNzd29yZCBzaG91bGQgaGF2ZSBhdCBsZWFzdCA4IGNoYXJhY3RlcnMuJyk7XG4gICAgfSBlbHNlIGlmICgkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpICE9PSAkKCdbbmFtZT1cInBhc3N3b3JkXCJdJykudmFsKCkpIHtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnPGRpdiBjbGFzcz1cImVycm9yLWljb25cIj4hPC9kaXY+WW91ciBwYXNzd29yZHMgbXVzdCBtYXRjaC4nKTtcbiAgICB9XG4gIH0pO1xuXG4gICQoJ1tuYW1lPVwiZW1haWxfY29uZmlybWF0aW9uXCJdJykub24oJ2NoYW5nZScsIChldmVudCkgPT4ge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlRW1haWwobWFpbCkge1xuICAgICBpZiAoLyg/OlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSsoPzpcXC5bYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKSp8XCIoPzpbXFx4MDEtXFx4MDhcXHgwYlxceDBjXFx4MGUtXFx4MWZcXHgyMVxceDIzLVxceDViXFx4NWQtXFx4N2ZdfFxcXFxbXFx4MDEtXFx4MDlcXHgwYlxceDBjXFx4MGUtXFx4N2ZdKSpcIilAKD86KD86W2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP1xcLikrW2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP3xcXFsoPzooPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldP3xbYS16MC05LV0qW2EtejAtOV06KD86W1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4MjEtXFx4NWFcXHg1My1cXHg3Zl18XFxcXFtcXHgwMS1cXHgwOVxceDBiXFx4MGNcXHgwZS1cXHg3Zl0pKylcXF0pLy50ZXN0KG1haWwpKSB7XG4gICAgICAgIHJldHVybiAodHJ1ZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiAoZmFsc2UpXG4gICAgfVxuXG5cbiAgICBpZiAoKCQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkgPT09ICQoJ1tuYW1lPVwiZW1haWxcIl0nKS52YWwoKSkgJiYgdmFsaWRhdGVFbWFpbCgkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpKSkge1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkICNlZWUnKTtcbiAgICAgICQoJ1tuYW1lPVwiZW1haWxcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkICNlZWUnKTtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCByZWQnKTtcbiAgICAgICQoJ1tuYW1lPVwiZW1haWxcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5Zb3VyIGVtYWlscyBtdXN0IG1hdGNoLicpO1xuICAgIH1cbiAgfSk7XG4gIC8vIENvdW50ZXJcbiAgJCgnLldQS3BpUm93Jykud2F5cG9pbnQoZnVuY3Rpb24oZGlyZWN0aW9uKXtcbiAgICAkKCcuY291bnQnKS5lYWNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICQodGhpcykucHJvcCgnQ291bnRlcicsMCkuYW5pbWF0ZSh7XG4gICAgICAgICAgQ291bnRlcjogJCh0aGlzKS50ZXh0KClcbiAgICAgIH0sIHtcbiAgICAgICAgICBkdXJhdGlvbjogNDAwMCxcbiAgICAgICAgICBlYXNpbmc6ICdzd2luZycsXG4gICAgICAgICAgc3RlcDogZnVuY3Rpb24gKG5vdykge1xuICAgICAgICAgICAgICAkKHRoaXMpLnRleHQoTWF0aC5jZWlsKG5vdykpO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIHRoaXMuZGVzdHJveSgpXG4gIH0se1xuICAgLy9ib3R0b20taW4tdmlldyB3aWxsIGVuc3VyZSBldmVudCBpcyB0aHJvd24gd2hlbiB0aGUgZWxlbWVudCdzIGJvdHRvbSBjcm9zc2VzXG4gICAvL2JvdHRvbSBvZiB2aWV3cG9ydC5cbiAgIG9mZnNldDogJ2JvdHRvbS1pbi12aWV3J1xuICB9KTtcbiAgLyogVmlkZW8gKi9cbiQoXCIjaGVhZFNsaWRlclwiKS5lYWNoKGZ1bmN0aW9uKCl7dmFyIGUsbj0kKHRoaXMpLGk9bi5maW5kKFwiLnNsaWRlX2dyb3VwXCIpLHQ9bi5maW5kKFwiLnNsaWRlXCIpLGM9MDtmdW5jdGlvbiBsKGUpe3ZhciBuLGw7cygpLGkuaXMoXCI6YW5pbWF0ZWRcIil8fGM9PT1lfHwoZT5jPyhsPVwiMTAwJVwiLG49XCItMTAwJVwiKToobD1cIi0xMDAlXCIsbj1cIjEwMCVcIiksdC5lcShlKS5jc3Moe2Rpc3BsYXk6XCJibG9ja1wiLGxlZnQ6bH0pLGkuYW5pbWF0ZSh7bGVmdDpufSxmdW5jdGlvbigpe3QuZXEoYykuY3NzKHtkaXNwbGF5Olwibm9uZVwifSksdC5lcShlKS5jc3Moe2xlZnQ6MH0pLGkuY3NzKHtsZWZ0OjB9KSxjPWV9KSl9ZnVuY3Rpb24gcygpe2NsZWFyVGltZW91dChlKSxlPXNldFRpbWVvdXQoZnVuY3Rpb24oKXtjPHQubGVuZ3RoLTE/bChjKzEpOmwoMCl9LDRlMyl9JChcIi5oZWFkU2xpZGVyLm5leHRfYnRuXCIpLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpe2M8dC5sZW5ndGgtMT9sKGMrMSk6bCgwKX0pLCQoXCIuaGVhZFNsaWRlci5wcmV2aW91c19idG5cIikub24oXCJjbGlja1wiLGZ1bmN0aW9uKCl7bCgwIT09Yz9jLTE6Myl9KSxzKCl9KTtcbiAgICBcbiAgICAkKFwiI3doYXRTbGlkZXJcIikuZWFjaChmdW5jdGlvbigpe3ZhciBlLG49JCh0aGlzKSxpPW4uZmluZChcIi5zbGlkZV9ncm91cFwiKSx0PW4uZmluZChcIi5zbGlkZVwiKSxjPTA7ZnVuY3Rpb24gbChlKXt2YXIgbixsO3MoKSxpLmlzKFwiOmFuaW1hdGVkXCIpfHxjPT09ZXx8KGU+Yz8obD1cIjEwMCVcIixuPVwiLTEwMCVcIik6KGw9XCItMTAwJVwiLG49XCIxMDAlXCIpLHQuZXEoZSkuY3NzKHtkaXNwbGF5OlwiYmxvY2tcIixsZWZ0Omx9KSxpLmFuaW1hdGUoe2xlZnQ6bn0sZnVuY3Rpb24oKXt0LmVxKGMpLmNzcyh7ZGlzcGxheTpcIm5vbmVcIn0pLHQuZXEoZSkuY3NzKHtsZWZ0OjB9KSxpLmNzcyh7bGVmdDowfSksYz1lfSkpfWZ1bmN0aW9uIHMoKXtjbGVhclRpbWVvdXQoZSksZT1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Yzx0Lmxlbmd0aC0xP2woYysxKTpsKDApfSw0ZTMpfSQoXCIud2hhdFNsaWRlci5uZXh0X2J0blwiKS5vbihcImNsaWNrXCIsZnVuY3Rpb24oKXtjPHQubGVuZ3RoLTE/bChjKzEpOmwoMCl9KSwkKFwiLndoYXRTbGlkZXIucHJldmlvdXNfYnRuXCIpLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpe2woMCE9PWM/Yy0xOjMpfSkscygpfSk7XG4gICAgXG4gICAgJChcIiNwcm9qU2xpZGVyXCIpLmVhY2goZnVuY3Rpb24oKXt2YXIgZSxuPSQodGhpcyksaT1uLmZpbmQoXCIuc2xpZGVfZ3JvdXBcIiksdD1uLmZpbmQoXCIuc2xpZGVcIiksYz0wO2Z1bmN0aW9uIGwoZSl7dmFyIG4sbDtzKCksaS5pcyhcIjphbmltYXRlZFwiKXx8Yz09PWV8fChlPmM/KGw9XCIxMDAlXCIsbj1cIi0xMDAlXCIpOihsPVwiLTEwMCVcIixuPVwiMTAwJVwiKSx0LmVxKGUpLmNzcyh7ZGlzcGxheTpcImJsb2NrXCIsbGVmdDpsfSksaS5hbmltYXRlKHtsZWZ0Om59LGZ1bmN0aW9uKCl7dC5lcShjKS5jc3Moe2Rpc3BsYXk6XCJub25lXCJ9KSx0LmVxKGUpLmNzcyh7bGVmdDowfSksaS5jc3Moe2xlZnQ6MH0pLGM9ZX0pKX1mdW5jdGlvbiBzKCl7Y2xlYXJUaW1lb3V0KGUpLGU9c2V0VGltZW91dChmdW5jdGlvbigpe2M8dC5sZW5ndGgtMT9sKGMrMSk6bCgwKX0sNGUzKX0kKFwiLnByb2pTbGlkZXIubmV4dF9idG5cIikub24oXCJjbGlja1wiLGZ1bmN0aW9uKCl7Yzx0Lmxlbmd0aC0xP2woYysxKTpsKDApfSksJChcIi5wcm9qU2xpZGVyLnByZXZpb3VzX2J0blwiKS5vbihcImNsaWNrXCIsZnVuY3Rpb24oKXtsKDAhPT1jP2MtMTozKX0pLHMoKX0pO1xuICAgIFxuICAgICQoXCIjb3BzU2xpZGVyXCIpLmVhY2goZnVuY3Rpb24oKXt2YXIgZSxuPSQodGhpcyksaT1uLmZpbmQoXCIuc2xpZGVfZ3JvdXBcIiksdD1uLmZpbmQoXCIuc2xpZGVcIiksYz0wO2Z1bmN0aW9uIGwoZSl7dmFyIG4sbDtzKCksaS5pcyhcIjphbmltYXRlZFwiKXx8Yz09PWV8fChlPmM/KGw9XCIxMDAlXCIsbj1cIi0xMDAlXCIpOihsPVwiLTEwMCVcIixuPVwiMTAwJVwiKSx0LmVxKGUpLmNzcyh7ZGlzcGxheTpcImJsb2NrXCIsbGVmdDpsfSksaS5hbmltYXRlKHtsZWZ0Om59LGZ1bmN0aW9uKCl7dC5lcShjKS5jc3Moe2Rpc3BsYXk6XCJub25lXCJ9KSx0LmVxKGUpLmNzcyh7bGVmdDowfSksaS5jc3Moe2xlZnQ6MH0pLGM9ZX0pKX1mdW5jdGlvbiBzKCl7Y2xlYXJUaW1lb3V0KGUpLGU9c2V0VGltZW91dChmdW5jdGlvbigpe2M8dC5sZW5ndGgtMT9sKGMrMSk6bCgwKX0sNGUzKX0kKFwiLm9wc1NsaWRlci5uZXh0X2J0blwiKS5vbihcImNsaWNrXCIsZnVuY3Rpb24oKXtjPHQubGVuZ3RoLTE/bChjKzEpOmwoMCl9KSwkKFwiLm9wc1NsaWRlci5wcmV2aW91c19idG5cIikub24oXCJjbGlja1wiLGZ1bmN0aW9uKCl7bCgwIT09Yz9jLTE6Myl9KSxzKCl9KTtcbiAgICBcbiAgICAkKFwiI3V0aWxTbGlkZXJcIikuZWFjaChmdW5jdGlvbigpe3ZhciBlLG49JCh0aGlzKSxpPW4uZmluZChcIi5zbGlkZV9ncm91cFwiKSx0PW4uZmluZChcIi5zbGlkZVwiKSxjPTA7ZnVuY3Rpb24gbChlKXt2YXIgbixsO3MoKSxpLmlzKFwiOmFuaW1hdGVkXCIpfHxjPT09ZXx8KGU+Yz8obD1cIjEwMCVcIixuPVwiLTEwMCVcIik6KGw9XCItMTAwJVwiLG49XCIxMDAlXCIpLHQuZXEoZSkuY3NzKHtkaXNwbGF5OlwiYmxvY2tcIixsZWZ0Omx9KSxpLmFuaW1hdGUoe2xlZnQ6bn0sZnVuY3Rpb24oKXt0LmVxKGMpLmNzcyh7ZGlzcGxheTpcIm5vbmVcIn0pLHQuZXEoZSkuY3NzKHtsZWZ0OjB9KSxpLmNzcyh7bGVmdDowfSksYz1lfSkpfWZ1bmN0aW9uIHMoKXtjbGVhclRpbWVvdXQoZSksZT1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7Yzx0Lmxlbmd0aC0xP2woYysxKTpsKDApfSw0ZTMpfSQoXCIudXRpbFNsaWRlci5uZXh0X2J0blwiKS5vbihcImNsaWNrXCIsZnVuY3Rpb24oKXtjPHQubGVuZ3RoLTE/bChjKzEpOmwoMCl9KSwkKFwiLnV0aWxTbGlkZXIucHJldmlvdXNfYnRuXCIpLm9uKFwiY2xpY2tcIixmdW5jdGlvbigpe2woMCE9PWM/Yy0xOjMpfSkscygpfSk7XG5cbiAgJCgnW25hbWU9XCJlbWFpbFwiXScpLm9uKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUVtYWlsKG1haWwpIHtcbiAgICAgaWYgKC8oPzpbYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKD86XFwuW2EtejAtOSEjJCUmJyorLz0/Xl9ge3x9fi1dKykqfFwiKD86W1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4MjFcXHgyMy1cXHg1YlxceDVkLVxceDdmXXxcXFxcW1xceDAxLVxceDA5XFx4MGJcXHgwY1xceDBlLVxceDdmXSkqXCIpQCg/Oig/OlthLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT9cXC4pK1thLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT98XFxbKD86KD86MjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT98W2EtejAtOS1dKlthLXowLTldOig/OltcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDIxLVxceDVhXFx4NTMtXFx4N2ZdfFxcXFxbXFx4MDEtXFx4MDlcXHgwYlxceDBjXFx4MGUtXFx4N2ZdKSspXFxdKS8udGVzdChtYWlsKSkge1xuICAgICAgICByZXR1cm4gKHRydWUpXG4gICAgICB9XG4gICAgICByZXR1cm4gKGZhbHNlKVxuICAgIH1cblxuICAgIGlmICgkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpID09PSAkKCdbbmFtZT1cImVtYWlsXCJdJykudmFsKCkpIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCAjZWVlJyk7XG4gICAgICAkKCdbbmFtZT1cImVtYWlsXCJdJykuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCAjZWVlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCByZWQnKTtcbiAgICAgICQoJ1tuYW1lPVwiZW1haWxcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgIH1cblxuICAgIGlmICghdmFsaWRhdGVFbWFpbCgkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpKSkge1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5QbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbC4nKTtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCByZWQnKTtcbiAgICAgICQoJ1tuYW1lPVwiZW1haWxcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgI2VlZScpO1xuICAgICAgJCgnW25hbWU9XCJlbWFpbFwiXScpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgI2VlZScpO1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCcnKTtcbiAgICB9XG4gIH0pO1xuXG4gICQoJ1tuYW1lPVwiY291bnRyeV9jb2RlXCJdJykub24oJ2NoYW5nZScsIChldmVudCkgPT4ge1xuICAgIGNvbnN0ICR0YXJnZXQgPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpO1xuICAgIGNvbnN0IHZhbHVlID0gJHRhcmdldC52YWwoKTtcbiAgICBjb25zdCB2YWx1ZTIgPSAkdGFyZ2V0LnBhcmVudCgpLm5leHQoKS5maW5kKCdpbnB1dCcpO1xuXG4gICAgaWYgKHZhbHVlID09PSAnb3RoZXInKSB7XG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpXG4gICAgICAgIC5wYXJlbnQoKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2NvbC1zbS0xMicpXG4gICAgICAgIC5hZGRDbGFzcygnY29sLXNtLTYnKTtcblxuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KVxuICAgICAgICAucGFyZW50KClcbiAgICAgICAgLm5leHQoKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpO1xuXG4gICAgICB2YWx1ZTIuZm9jdXMoKS52YWwodmFsdWUyLnZhbCgpKTtcblxuICAgICAgY3VzdG9tQ291bnRyeUNvZGUgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWN1c3RvbUNvdW50cnlDb2RlKSByZXR1cm47XG5cbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICAgICAgLnBhcmVudCgpXG4gICAgICAgIC5hZGRDbGFzcygnY29sLXNtLTEyJylcbiAgICAgICAgLnJlbW92ZUNsYXNzKCdjb2wtc20tNicpO1xuXG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpXG4gICAgICAgIC5wYXJlbnQoKVxuICAgICAgICAubmV4dCgpXG4gICAgICAgIC5hZGRDbGFzcygnaGlkZGVuJyk7XG5cbiAgICAgIHZhbHVlMi52YWwoJycpO1xuXG4gICAgICBjdXN0b21Db3VudHJ5Q29kZSA9IGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgJCgnI3Byb2R1Y3RfaW50ZXJlc3QnKS5vbignY2hhbmdlJywgKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCk7XG4gICAgY29uc3QgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpO1xuXG4gICAgaWYgKHZhbHVlID09PSAnR28nKSB7XG4gICAgICAkKCcucmVnaXN0cmF0aW9uLXN1Ym1pdCcpLmh0bWwoJ0dldCBTdGFydGVkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vICQoJy5yZWdpc3RyYXRpb24tc3VibWl0JykuaHRtbCgnSm9pbiB3YWl0aW5nIGxpc3QnKVxuICAgICAgJCgnLnJlZ2lzdHJhdGlvbi1zdWJtaXQnKS5odG1sKCdHZXQgU3RhcnRlZCcpO1xuICAgIH1cbiAgfSk7XG5cbiAgLyoqXG4gICAqIENvbnRhY3QgRm9ybSBTbGlkZXJcbiAgICovXG5cbiAgY29uc3QgJGNvbnRhY3RTbGlkZXIgPSAkKCcucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tc2xpZGVyJyk7XG4gIGNvbnN0ICRjb250YWN0Rm9ybSA9ICQoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1mb3JtJyk7XG4gIGNvbnN0ICRjb250YWN0U3VjY2VzcyA9ICQoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1zdWNjZXNzJyk7XG5cbiAgJGNvbnRhY3RTbGlkZXIuc2xpY2soe1xuICAgIC8vIGluaXRpYWxTbGlkZTogMSxcbiAgICBhcnJvd3M6IGZhbHNlLFxuICAgIGRyYWdnYWJsZTogZmFsc2UsXG4gICAgYWRhcHRpdmVIZWlnaHQ6IHRydWUsXG4gIH0pO1xuXG4gICQoJy5yZWdpc3RyYXRpb24tcmVzZW5kJykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgIGxldCByZWRpcmVjdFVybCA9ICcvb25ib2FyZGluZy92ZXJpZmllZCc7XG5cbiAgICAvLyBpZiAoQ29va2llcy5nZXQoJ3NraXBPbmJvYXJkaW5nJykpIHtcbiAgICAvLyAgIHJlZGlyZWN0VXJsID0gJy9vbmJvYXJkaW5nL2ZpbmlzaCc7XG4gICAgLy8gfVxuXG4gICAgYXhpb3Moe1xuICAgICAgbWV0aG9kOiAncG9zdCcsXG4gICAgICB1cmw6ICdodHRwczovL3JlbnNvdXJjZS1hcGktZXUuaGVyb2t1YXBwLmNvbS92MS9vbmJvYXJkaW5nL3Jlc2VuZF9lbWFpbF90b2tlbicsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdhY2Nlc3MtdG9rZW4nOiBDb29raWVzLmdldCgndG9rZW4nKSxcbiAgICAgICAgY2xpZW50OiBDb29raWVzLmdldCgnY2xpZW50JyksXG4gICAgICAgIHVpZDogQ29va2llcy5nZXQoJ3VpZCcpLFxuICAgICAgfSxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgcmVkaXJlY3RfdXJsOiBgaHR0cDovL3N0YWdpbmcucnMudGVzdGdlYmlldC5jb20ke3JlZGlyZWN0VXJsfWAsXG4gICAgICB9LFxuICAgIH0pXG4gICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgJCgnLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLXN1Y2Nlc3MgYnV0dG9uJykuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgICQoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1zdWNjZXNzIGJ1dHRvbicpLmh0bWwoJ0VtYWlsIGhhcyBiZWVuIHJlc2VudCcpO1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICBhbGVydCgnU29tZXRoaW5nIHdlbnQgd3JvbmcuIFBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuJyk7XG4gICAgfSlcbiAgfSk7XG5cbiAgJCgnLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLXNsaWRlciBpbnB1dCwgLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLXNsaWRlciBzZWxlY3QnKS5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgIGNvbnN0IGZvcm1FbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1mb3JtJylcbiAgICBjb25zdCBmb3JtID0gc2VyaWFsaXplKGZvcm1FbCwgdHJ1ZSk7XG4gICAgY29uc3QgZXJyb3JzID0gdmFsaWRhdGVMYXN0U3RlcChmb3JtKTtcblxuICAgIGlmIChlcnJvcnMubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICQoJy5yZWdpc3RyYXRpb24tc3VibWl0JykuYXR0cignZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgd3JvbmdSZWZlcnJhbCA9IGZhbHNlO1xuICAkY29udGFjdFNsaWRlci5vbignY2xpY2snLCAnLnJlZ2lzdHJhdGlvbi1zdWJtaXQnLCAoZXZlbnQpID0+IHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgJCgnLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLWZvcm0gYnV0dG9uJykuYXR0cignZGlzYWJsZWQnLCB0cnVlKTtcblxuICAgIGNvbnN0IGZvcm1FbCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1mb3JtJylcbiAgICBjb25zdCBmb3JtID0gc2VyaWFsaXplKGZvcm1FbCwgdHJ1ZSk7XG4gICAgY29uc3QgZXJyb3JzID0gdmFsaWRhdGVMYXN0U3RlcChmb3JtKTtcblxuICAgIGNvbnN0IGZvcm1TdHJpbmcgPSBPYmplY3Qua2V5cyhmb3JtKS5tYXAoKGtleSkgPT4ge1xuICAgICAgY29uc3QgZXNjYXBlZFZhbHVlID0gZm9ybVtrZXldLnJlcGxhY2UoL1xcKy9nLCAnJTJCJyk7XG4gICAgICByZXR1cm4gYCR7a2V5fT0ke2VzY2FwZWRWYWx1ZX1gO1xuICAgIH0pLmpvaW4oJyYnKTtcblxuICAgIGZ1bmN0aW9uIFVSTFRvQXJyYXkodXJsKSB7XG4gICAgICB2YXIgcmVxdWVzdCA9IHt9O1xuICAgICAgdmFyIHBhaXJzID0gdXJsLnN1YnN0cmluZyh1cmwuaW5kZXhPZignPycpICsgMSkuc3BsaXQoJyYnKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFpcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBpZighcGFpcnNbaV0pXG4gICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgIHZhciBwYWlyID0gcGFpcnNbaV0uc3BsaXQoJz0nKTtcbiAgICAgICAgICByZXF1ZXN0W2RlY29kZVVSSUNvbXBvbmVudChwYWlyWzBdKV0gPSBkZWNvZGVVUklDb21wb25lbnQocGFpclsxXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICB9XG5cbiAgICBjb25zdCBmb3JtQXJyYXkgPSBVUkxUb0FycmF5KGZvcm1TdHJpbmcpO1xuXG4gICAgZnVuY3Rpb24gdmFsaWRhdGVFbWFpbChtYWlsKSB7XG4gICAgIGlmICgvKD86W2EtejAtOSEjJCUmJyorLz0/Xl9ge3x9fi1dKyg/OlxcLlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSspKnxcIig/OltcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDIxXFx4MjMtXFx4NWJcXHg1ZC1cXHg3Zl18XFxcXFtcXHgwMS1cXHgwOVxceDBiXFx4MGNcXHgwZS1cXHg3Zl0pKlwiKUAoPzooPzpbYS16MC05XSg/OlthLXowLTktXSpbYS16MC05XSk/XFwuKStbYS16MC05XSg/OlthLXowLTktXSpbYS16MC05XSk/fFxcWyg/Oig/OjI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/fFthLXowLTktXSpbYS16MC05XTooPzpbXFx4MDEtXFx4MDhcXHgwYlxceDBjXFx4MGUtXFx4MWZcXHgyMS1cXHg1YVxceDUzLVxceDdmXXxcXFxcW1xceDAxLVxceDA5XFx4MGJcXHgwY1xceDBlLVxceDdmXSkrKVxcXSkvLnRlc3QobWFpbCkpIHtcbiAgICAgICAgcmV0dXJuICh0cnVlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIChmYWxzZSlcbiAgICB9XG5cbiAgICBsZXQgcmVkaXJlY3RVcmwgPSAnL29uYm9hcmRpbmcvdmVyaWZpZWQnO1xuXG4gICAgLy8gaWYgKHR5cGVvZiBmb3JtQXJyYXkucmVmZXJyYWxfdG9rZW4gIT09ICd1bmRlZmluZWQnICYmIGZvcm1BcnJheS5yZWZlcnJhbF90b2tlbikge1xuICAgIC8vICAgQ29va2llcy5zZXQoJ3NraXBPbmJvYXJkaW5nJywgdHJ1ZSk7XG4gICAgLy8gICByZWRpcmVjdFVybCA9ICcvb25ib2FyZGluZy9maW5pc2gnO1xuICAgIC8vIH1cblxuICAgIGNvbnN0IHJlZmVycmFsUmVnID0gL1JFTlxcZCtcXCQvZztcblxuICAgIGlmICghdmFsaWRhdGVFbWFpbChmb3JtQXJyYXkuZW1haWwpKSB7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PlBsZWFzZSBlbnRlciBhIHZhbGlkIGVtYWlsIGFkZHJlc3MuJyk7XG4gICAgfSBlbHNlIGlmIChmb3JtQXJyYXkuZW1haWwgIT09IGZvcm1BcnJheS5lbWFpbF9jb25maXJtYXRpb24pIHtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnPGRpdiBjbGFzcz1cImVycm9yLWljb25cIj4hPC9kaXY+SXQgc2VlbXMgbGlrZSB5b3VyIGVtYWlscyBkb250IG1hdGNoLicpO1xuICAgIH0gZWxzZSBpZiAoZm9ybUFycmF5LnBhc3N3b3JkICE9PSBmb3JtQXJyYXkucGFzc3dvcmRfY29uZmlybWF0aW9uKSB7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2Pkl0IHNlZW1zIGxpa2UgeW91ciBwYXNzd29yZCBkb250IG1hdGNoLicpO1xuICAgIH0gZWxzZSBpZiAoZXJyb3JzLmxlbmd0aCkge1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5Tb21lIGZpZWxkcyBhcmUgbm90IHByb3Blcmx5IGZpbGxlZC4nKTtcbiAgICB9IGVsc2UgaWYgKCFyZWZlcnJhbFJlZy50ZXN0KCQoJ1tuYW1lPVwicmVmZXJyYWxfdG9rZW5cIl0nKS52YWwoKSkgJiYgIXdyb25nUmVmZXJyYWwgJiYgJCgnW25hbWU9XCJyZWZlcnJhbF90b2tlblwiXScpLnZhbCgpICE9PSAnJykge1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5Zb3VyIHJlZmVycmFsIGNvZGUgaXMgd3JvbmcuJyk7XG4gICAgICAkKCcucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tZm9ybSBidXR0b24nKS5odG1sKCdQcm9jZWVkIHRvIHF1ZXN0aW9uYWlyZScpO1xuICAgICAgJCgnLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLWZvcm0gYnV0dG9uJykuYXR0cignZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICB3cm9uZ1JlZmVycmFsID0gdHJ1ZTtcbiAgICAgIHJldHVybjtcbiAgICB9IGVsc2Uge1xuICAgICAgYXhpb3Moe1xuICAgICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgICAgdXJsOiAnaHR0cHM6Ly9yZW5zb3VyY2UtYXBpLWV1Lmhlcm9rdWFwcC5jb20vdjEvb25ib2FyZGluZycsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgdXNlcjogZm9ybUFycmF5LFxuICAgICAgICAgIHJlZGlyZWN0X3VybDogYGh0dHA6Ly9zdGFnaW5nLnJzLnRlc3RnZWJpZXQuY29tJHtyZWRpcmVjdFVybH1gLFxuICAgICAgICB9LFxuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgQ29va2llcy5zZXQoJ2NsaWVudCcsIGRhdGEuaGVhZGVycy5jbGllbnQpO1xuICAgICAgICBDb29raWVzLnNldCgndWlkJywgZGF0YS5oZWFkZXJzLnVpZCk7XG4gICAgICAgIENvb2tpZXMuc2V0KCd0b2tlbicsIGRhdGEuaGVhZGVyc1snYWNjZXNzLXRva2VuJ10pO1xuXG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuICAgICAgICAkY29udGFjdEZvcm0uaGlkZSgpO1xuICAgICAgICAkY29udGFjdFN1Y2Nlc3Muc2hvdygpO1xuXG4gICAgICAgIGNvbnN0IHVzZXJXaWR0aCA9ICQod2luZG93KS5vdXRlcldpZHRoKCk7XG5cbiAgICAgICAgaWYgKHVzZXJXaWR0aCA8IDc2Nykge1xuICAgICAgICAgIGNvbnN0IGZvcm1PZmZzZXQgPSAkKCcucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tc3VjY2VzcycpLm9mZnNldCgpLnRvcDtcbiAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICBzY3JvbGxUb3A6IGZvcm1PZmZzZXQgLSAxMDBcbiAgICAgICAgICB9LCA4MDApO1xuICAgICAgICB9XG4gICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnJvcikge1xuICAgICAgICBpZiAoL1xcYkVtYWlsIGhhcyBhbHJlYWR5IGJlZW4gdGFrZW5cXGIvaS50ZXN0KGVycm9yLnJlc3BvbnNlLmRhdGEuZXJyb3IpKSB7XG4gICAgICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5FbWFpbCBoYXMgYWxyZWFkeSBiZWVuIHRha2VuLicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGFsZXJ0KCdTb21ldGhpbmcgd2VudCB3cm9uZy4gUGxlYXNlIHRyeSBhZ2FpbiBsYXRlci4nKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlTGFzdFN0ZXAoZmllbGRzKSB7XG4gICAgY29uc3QgcmVxdWlyZWRGaWVsZHMgPSBbJ2ZpcnN0X25hbWUnLCAnbGFzdF9uYW1lJywgJ2dlbmRlcicsICdlbWFpbCcsICdlbWFpbF9jb25maXJtYXRpb24nLCAncGFzc3dvcmQnLCAncGFzc3dvcmRfY29uZmlybWF0aW9uJywgJ3N1YnNjcmlwdGlvbl90aWVyJ107XG4gICAgY29uc3QgZXJyID0gW107XG5cbiAgICByZXF1aXJlZEZpZWxkcy5mb3JFYWNoKChmaWVsZCkgPT4ge1xuICAgICAgaWYgKCFmaWVsZHMuaGFzT3duUHJvcGVydHkoZmllbGQpKSB7IGVyci5wdXNoKGZpZWxkKTsgfSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgfSk7XG5cbiAgICByZXR1cm4gZXJyO1xuICB9XG5cbiAgLyoqXG4gICAqIER5bmFtaWMgR0lGIHJlcGVhdGl0aW9uXG4gICAqL1xuICBjb25zdCBzY3JvbGxQb2ludHMgPSBbXTtcbiAgJCgnLnByZXZlbnQnKS5vbignY2xpY2snLCBldmVudCA9PiBldmVudC5wcmV2ZW50RGVmYXVsdCgpKVxuXG4gIGlmICghaXNNb2JpbGUuYW55KSB7XG4gICAgc2tyb2xsci5pbml0KHsgZm9yY2VIZWlnaHQ6IGZhbHNlIH0pXG5cbiAgICAkKCdbZGF0YS1naWYtc3JjXScpLmVhY2goKGksIGVsKSA9PiB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gJChlbCk7XG4gICAgICBjb25zdCBzcmMgPSBlbGVtZW50LmRhdGEoJ2dpZi1zcmMnKTtcbiAgICAgIGNvbnN0IHBvc2l0aW9uID0gZWxlbWVudC5vZmZzZXQoKS50b3AgLSA5MDA7XG4gICAgICBjb25zdCBjb25maWcgPSB7IHBvc2l0aW9uLCBlbGVtZW50LCBzcmMgfVxuXG4gICAgICBlbGVtZW50LmF0dHIoJ3NyYycsIHNyYyk7XG4gICAgICBlbGVtZW50LmNzcygnZGlzcGxheScsICdub25lJyk7XG5cbiAgICAgIHNjcm9sbFBvaW50cy5wdXNoKGNvbmZpZyk7XG4gICAgfSk7XG4gIH0gZWxzZSB7XG4gICAgJCgnW2RhdGEtZ2lmLXNyY10nKS5lYWNoKChpLCBlbCkgPT4ge1xuICAgICAgY29uc3QgZWxlbWVudCA9ICQoZWwpO1xuICAgICAgY29uc3Qgc3JjID0gZWxlbWVudC5kYXRhKCdnaWYtc3JjJyk7XG5cbiAgICAgIGVsZW1lbnQuYXR0cignc3JjJywgc3JjKTtcbiAgICAgIGVsZW1lbnQuY3NzKCdkaXNwbGF5JywgJ2Jsb2NrJyk7XG4gICAgfSk7XG4gIH1cblxuICAkKHdpbmRvdykub24oJ3Njcm9sbCcsICgpID0+IHtcbiAgICBjb25zdCBzY3JvbGxUb3AgPSAkKHdpbmRvdykuc2Nyb2xsVG9wKCk7XG5cbiAgICBzY3JvbGxQb2ludHMuZm9yRWFjaCgoeyBwb3NpdGlvbiwgc3JjLCBlbGVtZW50IH0pID0+IHtcbiAgICAgIGlmIChzY3JvbGxUb3AgPj0gcG9zaXRpb24pIHtcbiAgICAgICAgZWxlbWVudC5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICAgICAgaWYgKGVsZW1lbnQuYXR0cignc3JjJykgIT09IHNyYykgeyBlbGVtZW50LmF0dHIoJ3NyYycsIHNyYyk7IH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsZW1lbnQuZmFkZU91dCg1MDAsICgpID0+IGVsZW1lbnQuYXR0cignc3JjJywgc3JjKSk7XG4gICAgICB9XG4gICAgfSlcbiAgfSlcblxuICAvKipcbiAgICogQ29sbGFwc2UgdmlhIERhdGEgYXR0cmlidXRlXG4gICAqL1xuXG4gICQoJ1tkYXRhLWNvbGxhcHNlXScpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgJChlbGVtZW50KS5vbignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAgIGNvbnN0IHsgY3VycmVudFRhcmdldCB9ID0gZXZlbnRcbiAgICAgIGNvbnN0IGNvbGxhcHNlQ2xhc3MgPSAkKGN1cnJlbnRUYXJnZXQpLmRhdGEoJ2NvbGxhcHNlJylcbiAgICAgIGNvbnN0IGNvbmRpdGlvbiA9ICQoY3VycmVudFRhcmdldCkuZGF0YSgnY29sbGFwc2Utb25seScpXG5cbiAgICAgIGNvbnN0IGhhc0NvbmRpdGlvbiA9ICgpID0+IHR5cGVvZiBjb25kaXRpb24gIT09ICd1bmRlZmluZWQnXG4gICAgICBjb25zdCBtZXRDb25kaXRpb24gPSAoKSA9PiBoYXNDb25kaXRpb24oKSAmJiAkKCdib2R5Jykud2lkdGgoKSA8IGNvbmRpdGlvblxuXG4gICAgICBpZiAobWV0Q29uZGl0aW9uKCkgfHwgIWhhc0NvbmRpdGlvbigpKSB7XG4gICAgICAgICQoZWxlbWVudCkudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAgICQoY29sbGFwc2VDbGFzcykuc2xpZGVUb2dnbGUoMjUwKVxuICAgICAgfVxuICAgIH0pXG4gIH0pXG5cbiAgbGV0IGN1cnJlbnRIZWFkbGluZSA9IDBcbiAgY29uc3QgJGhlYWRsaW5lID0gJCgnLnJzLWhlYWRsaW5lID4gc3BhbicpXG4gICRoZWFkbGluZS5jc3MoJ2Rpc3BsYXknLCAnaW5saW5lLWJsb2NrJylcbiAgY29uc3QgaGVhZGxpbmVzID0gW1xuICAgICdQZXRyb2wgJiBkaWVzZWwgYmlsbCBrZWVwcyBnb2luZyB1cD8nLFxuICAgICdXYW50IHlvdXIgZnJpZGdlIHRvIHJ1biBhbGwgZGF5PycsXG4gICAgJ0ludmVydGVyIGJhdHRlcmllcyBkeWluZyBxdWlja2x5PycsXG4gICAgJ1NvbGFyIHN5c3RlbXMgYXJlIHRvbyBleHBlbnNpdmU/JyxcbiAgICAnV29ycmllZCBhYm91dCBnZW5lcmF0b3IgZnVtZXM/JyxcbiAgXVxuXG4gIHNldEludGVydmFsKCgpID0+IHtcbiAgICArK2N1cnJlbnRIZWFkbGluZSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG5cbiAgICBpZiAoY3VycmVudEhlYWRsaW5lID49IGhlYWRsaW5lcy5sZW5ndGgpIHtcbiAgICAgIGN1cnJlbnRIZWFkbGluZSA9IDBcbiAgICB9XG5cbiAgICB0aWNrSGVhZGxpbmUoKVxuICB9LCA1MDAwKTtcblxuICBmdW5jdGlvbiB0aWNrSGVhZGxpbmUoKSB7XG4gICAgZnVuY3Rpb24gc3RlcChub3cpIHtcbiAgICAgICRoZWFkbGluZS5jc3MoJ3RyYW5zZm9ybScsIGByb3RhdGVYKCR7OTAgLSAobm93ICogOTApfWRlZylgKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBsZXRlKCkge1xuICAgICAgJGhlYWRsaW5lLmh0bWwoaGVhZGxpbmVzW2N1cnJlbnRIZWFkbGluZV0pXG4gICAgICAkaGVhZGxpbmUuYW5pbWF0ZSh7IG9wYWNpdHk6IDEgfSwgeyBkdXJhdGlvbjogNTAwLCBzdGVwIH0pXG4gICAgfVxuXG4gICAgJGhlYWRsaW5lLmFuaW1hdGUoeyBvcGFjaXR5OiAwIH0sIHsgZHVyYXRpb246IDUwMCwgc3RlcCwgY29tcGxldGUgfSlcbiAgfVxuXG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICQoJy5wcmVsb2FkZXInKS5hZGRDbGFzcygncHJlbG9hZGVyLS1oaWRkZW4nKVxuXG4gICAgaWYgKCdoYXNoJyBpbiB3aW5kb3cubG9jYXRpb24gJiYgd2luZG93LmxvY2F0aW9uLmhhc2ggIT09ICcnKSB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY29uc3QgeyBoYXNoIH0gPSB3aW5kb3cubG9jYXRpb25cbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoaGFzaClcblxuICAgICAgICBpZiAoZWxlbWVudCAhPT0gbnVsbCkgeyB6ZW5zY3JvbGwudG8oZWxlbWVudCwgNTAwKSB9XG4gICAgICB9LCA1MDApXG4gICAgfVxuICB9LCAxMzAwKVxuXG4gIGNvbnN0ICR0ZWFzZXIgPSAkKCcucnMtc2VjdGlvbi10ZWFzZXInKVxuICBjb25zdCBsaWdodHNDbGFzcyA9ICdsaWdodHMtdHVybmVkLW9uJ1xuXG4gICQoJyN0dXJuLWxpZ2h0cy1vbicpLndheXBvaW50KHtcbiAgICBoYW5kbGVyKGRpcikgeyAkdGVhc2VyLnRvZ2dsZUNsYXNzKGxpZ2h0c0NsYXNzLCBkaXIgPT09ICdkb3duJykgfSxcbiAgfSlcblxuICAkKCcucnMtc2VjdGlvbi1kaXN0cmlidXRpb24nKS53YXlwb2ludCh7XG4gICAgb2Zmc2V0OiAzMDAsXG4gICAgaGFuZGxlcihkaXIpIHtcbiAgICAgICQoJy5ycy1zZWN0aW9uLWRpc3RyaWJ1dGlvbicpLnRvZ2dsZUNsYXNzKCdpbi12aWV3cG9ydCcsIGRpciA9PT0gJ2Rvd24nKTtcbiAgICB9LFxuICB9KVxuXG4gIGlmICgnZGV2aWNlUGl4ZWxSYXRpbycgaW4gd2luZG93ICYmIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvID09PSAyKSB7XG4gICAgJCgnW2RhdGEtcmV0aW5hXScpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICBsZXQgc3JjID0gZWxlbWVudC5zcmNcbiAgICAgIHNyYyA9IHNyYy5yZXBsYWNlKC9cXC4ocG5nfGpwZ3xnaWYpKyQvaSwgJ0AyeC4kMScpXG4gICAgICBlbGVtZW50LnNyYyA9IHNyYyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gICAgfSlcbiAgfVxuXG4gICQoJyNpc19uaWdodCcpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiBkYXl0aW1lQ2hhbmdlKCkge1xuICAgIGNvbnN0IGlzTmlnaHQgPSAkKHRoaXMpLmlzKCc6Y2hlY2tlZCcpXG5cbiAgICAkKCcucnMtc2VjdGlvbi10ZWFzZXInKS50b2dnbGVDbGFzcygncnMtc2VjdGlvbi10ZWFzZXItLW5pZ2h0JywgaXNOaWdodClcbiAgfSlcblxuICAkKCcuaXBob25lLXNsaWNrJykuc2xpY2soe1xuICAgIGZhZGU6IHRydWUsXG4gICAgYXV0b3BsYXk6IHRydWUsXG4gICAgYXV0b3BsYXlTcGVlZDogMjAwMCxcbiAgICBhcnJvd3M6IGZhbHNlLFxuICB9KTtcblxuICAkKCcucnMtc2VjdGlvbi1zdG9yaWVzIC5zbGlkZXInKS5zbGljayh7XG4gICAgZG90czogdHJ1ZSxcbiAgICBpbmZpbml0ZTogdHJ1ZSxcbiAgICBhcnJvd3M6IHRydWUsXG4gICAgYXBwZW5kRG90czogJCgnLnJzLXNlY3Rpb24tc3RvcmllcyAuZG90cy1jb250YWluZXIgLmNvbnRhaW5lcicpLFxuICB9KVxuXG4gICQoJ2E6bm90KFtocmVmXj1cImh0dHBcIl0sIFtocmVmXj1cIiNcIl0sIFtocmVmXj1cIm1haWx0b1wiXSknKS5vbignY2xpY2snLCBmdW5jdGlvbiBsaW5rQ2xpY2soZXZlbnQpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgY29uc3QgJHRoaXMgPSAkKHRoaXMpO1xuICAgIGNvbnN0IGxpbmsgPSAkdGhpcy5hdHRyKCdocmVmJyk7XG5cbiAgICAkKCcucHJlbG9hZGVyJykucmVtb3ZlQ2xhc3MoJ3ByZWxvYWRlci0taGlkZGVuJylcbiAgICB6ZW5zY3JvbGwudG9ZKDAsIDUwMCwgKCkgPT4ge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBsaW5rXG4gICAgfSlcbiAgfSlcblxuICAkKHdpbmRvdykuc2Nyb2xsKGZ1bmN0aW9uIHNjcm9sbCgpIHtcbiAgICBjb25zdCBzdCA9ICQodGhpcykuc2Nyb2xsVG9wKClcbiAgICAkKCcucnMtaGVhZGVyJykudG9nZ2xlQ2xhc3MoJ3JzLWhlYWRlci0tc3RpY2t5Jywgc3QgPiAwKVxuICB9KVxuXG4gIGNvbnN0IHN1YnNjcmlwdGlvblRleHQgPSBbXG4gICAgJycsXG4gICAgJycsXG4gICAgJycsXG4gICAgJycsXG4gIF07XG5cbiAgJCgnW2RhdGEtb3ZlcmxheV0nKS5vbignY2xpY2snLCBmdW5jdGlvbiBvbkNsaWNrKCkge1xuICAgIGlmICh3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUgPT09ICcvc3Vic2NyaXB0aW9uJykge1xuICAgICAgY29uc3QgaW5kZXggPSAkKHRoaXMpLmRhdGEoJ2luZGV4Jyk7XG4gICAgICBpZiAoaW5kZXggPT09IDApIHtcbiAgICAgICAgJCgnLk92ZXJsYXkgcCcpLmh0bWwoc3Vic2NyaXB0aW9uVGV4dFswXSk7XG4gICAgICB9IGVsc2UgaWYgKGluZGV4ID09PSAxKSB7XG4gICAgICAgICQoJy5PdmVybGF5IHAnKS5odG1sKHN1YnNjcmlwdGlvblRleHRbMV0pO1xuICAgICAgfSBlbHNlIGlmIChpbmRleCA9PT0gMikge1xuICAgICAgICAkKCcuT3ZlcmxheSBwJykuaHRtbChzdWJzY3JpcHRpb25UZXh0WzJdKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09IDMpIHtcbiAgICAgICAgJCgnLk92ZXJsYXkgcCcpLmh0bWwoc3Vic2NyaXB0aW9uVGV4dFszXSk7XG4gICAgICB9XG4gICAgICAvLyAkKCcuT3ZlcmxheSBwJykuaHRtbChzdWJzY3JpcHRpb25UZXh0W2luZGV4XSk7XG4gICAgICAkKCcuT3ZlcmxheScpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgaW1hZ2UgPSAkKHRoaXMpLmZpbmQoJ2RpdicpLmF0dHIoJ3N0eWxlJyk7XG4gICAgICBjb25zdCBuYW1lID0gJCh0aGlzKS5maW5kKCdiJykuaHRtbCgpO1xuICAgICAgY29uc3Qgam9iID0gJCh0aGlzKS5maW5kKCdzcGFuJykuaHRtbCgpO1xuICAgICAgY29uc3QgdGV4dCA9ICQodGhpcykuZmluZCgncCcpLmh0bWwoKTtcblxuICAgICAgJCgnLk92ZXJsYXknKS5hZGRDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICQoJy5PdmVybGF5LUF2YXRhcicpLmF0dHIoJ3N0eWxlJywgaW1hZ2UpO1xuICAgICAgJCgnLk92ZXJsYXkgYicpLmh0bWwobmFtZSk7XG4gICAgICAkKCcuT3ZlcmxheSBzcGFuJykuaHRtbChqb2IpO1xuICAgICAgJCgnLk92ZXJsYXkgcCcpLmh0bWwodGV4dCk7XG4gICAgfVxuICB9KTtcblxuICAkKCcuT3ZlcmxheS1DbG9zZSwgLk92ZXJsYXktQkcnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgJCgnLk92ZXJsYXknKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gIH0pXG5cbiAgJCgnLkZpbHRlci1JdGVtJykub24oJ2NsaWNrJywgZnVuY3Rpb24gb25DbGljaygpIHtcbiAgICBjb25zdCBmaWx0ZXJWYWx1ZSA9ICQodGhpcykuYXR0cignZGF0YS1maWx0ZXInKTtcbiAgICBmaWx0ZXIuaXNvdG9wZSh7IGZpbHRlcjogZmlsdGVyVmFsdWUgfSk7XG5cbiAgICAkKHRoaXMpXG4gICAgICAuYWRkQ2xhc3MoJ2FjdGl2ZScpXG4gICAgICAuc2libGluZ3MoKVxuICAgICAgLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgfSk7XG5cbiAgbGV0IGZpbHRlciA9ICQoJy5maWx0ZXItY29udGVudCcpLmlzb3RvcGUoKTtcblxuICAkKCcucnMtaGVhZGVyLW5hdl9kcm9wZG93bl9ob2xkZXIgc3BhbicpLm9uKCdtb3VzZW92ZXInLCAoKSA9PiB7XG4gICAgJCgnLnJzLWhlYWRlci1uYXZfZHJvcGRvd24nKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gIH0pO1xuXG4gICQoJy5ycy1oZWFkZXItbmF2X2Ryb3Bkb3duX2hvbGRlciBzcGFuJykub24oJ21vdXNlbGVhdmUnLCAoKSA9PiB7XG4gICAgJCgnLnJzLWhlYWRlci1uYXZfZHJvcGRvd24nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gIH0pO1xuXG4gIGlmICgkKCcucnMtc2VjdGlvbi1pbnRlcmFjdGl2ZScpKSB7XG4gICAgY29uc3QgJGludGVyYWN0aXZlU2xpZGVyID0gJCgnLnJzLXNlY3Rpb24taW50ZXJhY3RpdmUtc2xpZGVyJyk7XG4gICAgJGludGVyYWN0aXZlU2xpZGVyLnNsaWNrKHtcbiAgICAgIGFycm93czogZmFsc2UsXG4gICAgICBmYWRlOiB0cnVlLFxuICAgICAgc3BlZWQ6IDgwMCxcbiAgICAgIGluaXRpYWxTbGlkZTogMCxcbiAgICAgIGRyYWdnYWJsZTogZmFsc2UsXG4gICAgICBhZGFwdGl2ZUhlaWdodDogdHJ1ZSxcbiAgICB9KTtcblxuICAgICQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlLWl0ZW0gYnV0dG9uW2RhdGEtaW5kZXg9XCIwXCJdJykucmVtb3ZlQ2xhc3MoJ2J1dHRvbi0tb3V0bGluZWJvcmRlcicpO1xuICAgICQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlLWl0ZW0gYnV0dG9uW2RhdGEtaW5kZXg9XCIwXCJdJykuYWRkQ2xhc3MoJ2J1dHRvbi0tZ3JlZW5ib3JkZXInKTtcbiAgICAkKCcucnMtc2VjdGlvbi1pbnRlcmFjdGl2ZS1pdGVtIGJ1dHRvbltkYXRhLWluZGV4PVwiMFwiXScpLnBhcmVudCgpLm5leHQoKS5jc3MoJ29wYWNpdHknLCAxKTtcblxuICAgICQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlLWl0ZW0gYnV0dG9uJykub24oJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoISQoZXZlbnQuY3VycmVudFRhcmdldCkuaGFzQ2xhc3MoJ2J1dHRvbi0tZ3JlZW5ib3JkZXInKSkge1xuICAgICAgICAkKCcucnMtc2VjdGlvbi1pbnRlcmFjdGl2ZS1pdGVtIGJ1dHRvbicpLnJlbW92ZUNsYXNzKCdidXR0b24tLWdyZWVuYm9yZGVyJyk7XG4gICAgICAgICQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlLWl0ZW0gYnV0dG9uJykuYWRkQ2xhc3MoJ2J1dHRvbi0tb3V0bGluZWJvcmRlcicpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnJlbW92ZUNsYXNzKCdidXR0b24tLW91dGxpbmVib3JkZXInKTtcbiAgICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5hZGRDbGFzcygnYnV0dG9uLS1ncmVlbmJvcmRlcicpO1xuICAgICAgICAkKCcucnMtc2VjdGlvbi1pbnRlcmFjdGl2ZS1pdGVtIGJ1dHRvbicpLnBhcmVudCgpLm5leHQoKS5jc3MoJ29wYWNpdHknLCAwLjUpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnBhcmVudCgpLm5leHQoKS5jc3MoJ29wYWNpdHknLCAxKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaW5kZXggPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmRhdGEoJ2luZGV4Jyk7XG4gICAgICAkaW50ZXJhY3RpdmVTbGlkZXIuc2xpY2soJ3NsaWNrR29UbycsIGluZGV4KTtcbiAgICB9KTtcbiAgfVxufSlcbiJdfQ==
