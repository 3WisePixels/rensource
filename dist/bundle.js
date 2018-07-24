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

  var video1 = document.getElementById("bgvideo");
  if (video1) {
    video1.currentTime = 0;
  }
  $(".mute-bt").click(function () {
    if ($(this).hasClass("stop")) {
      var bgvideo = document.getElementById("bgvideo");
      $("#bgvideo").prop('muted', false);
      $(this).removeClass("stop");
    } else {
      var bgvideo = document.getElementById("bgvideo");
      $("#bgvideo").prop('muted', true);
      $(this).addClass("stop");
    }
  });

  $(".play-bt").click(function () {
    $(".play-bt").hide();
    $(".pause-bt").show();
    var bgvideo = document.getElementById("bgvideo");
    if ($(".stop-bt").hasClass("active")) {
      bgvideo.currentTime = 0;
    }
    bgvideo.play();
  });
  $(".pause-bt").click(function () {
    $(".play-bt").show();
    $(".pause-bt").hide();
    $(".pause-bt").addClass("active");
    $(".stop-bt").removeClass("active");
    var bgvideo = document.getElementById("bgvideo");
    bgvideo.pause();
  });
  // $(".pause-bt").on('click',function () {
  //   $(".play-bt").show();
  //   $(".pause-bt").hide();
  //   $(".pause-bt").addClass("active");
  //   $(".stop-bt").removeClass("active");
  //   var bgvideo = document.getElementById("bgvideo");
  //   bgvideo.pause();
  // });

  // $(".stop-bt").click(function () {
  //   $(".play-bt").show();
  //   $(".pause-bt").hide();
  //   $(".pause-bt").removeClass("active");
  //   $(".stop-bt").addClass("active");
  //   var bgvideo = document.getElementById("bgvideo");
  //   bgvideo.currentTime = 0;
  //   bgvideo.pause();
  // });

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvaW5kZXguanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2FkYXB0ZXJzL3hoci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvYXhpb3MuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NhbmNlbC9DYW5jZWxUb2tlbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY2FuY2VsL2lzQ2FuY2VsLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0F4aW9zLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL0ludGVyY2VwdG9yTWFuYWdlci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9jcmVhdGVFcnJvci5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS9kaXNwYXRjaFJlcXVlc3QuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2NvcmUvZW5oYW5jZUVycm9yLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9jb3JlL3NldHRsZS5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvY29yZS90cmFuc2Zvcm1EYXRhLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9kZWZhdWx0cy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9iaW5kLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2J0b2EuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvYnVpbGRVUkwuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29tYmluZVVSTHMuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL2hlbHBlcnMvY29va2llcy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9pc0Fic29sdXRlVVJMLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbi5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lLmpzIiwibm9kZV9tb2R1bGVzL2F4aW9zL2xpYi9oZWxwZXJzL3BhcnNlSGVhZGVycy5qcyIsIm5vZGVfbW9kdWxlcy9heGlvcy9saWIvaGVscGVycy9zcHJlYWQuanMiLCJub2RlX21vZHVsZXMvYXhpb3MvbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2Zvcm0tc2VyaWFsaXplL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2lzLWJ1ZmZlci9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9pc21vYmlsZWpzL2lzTW9iaWxlLmpzIiwibm9kZV9tb2R1bGVzL2pzLWNvb2tpZS9zcmMvanMuY29va2llLmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNvdXJjZS9zY3JpcHRzL21haW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7O0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9TQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QXdFLEdBQXhFO0FBQ0EsVUFBRSxNQUFNLGFBQVIsRUFBdUIsTUFBdkIsR0FBZ0MsSUFBaEMsR0FBdUMsR0FBdkMsQ0FBMkMsU0FBM0MsRUFBc0QsQ0FBdEQ7QUFDRDs7QUFFRCxVQUFNLFFBQVEsRUFBRSxNQUFNLGFBQVIsRUFBdUIsSUFBdkIsQ0FBNEIsT0FBNUIsQ0FBZDtBQUNBLHlCQUFtQixLQUFuQixDQUF5QixXQUF6QixFQUFzQyxLQUF0QztBQUNELEtBWkQ7QUFhRDtBQUNGLENBcHBCRCIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9saWIvYXhpb3MnKTsiLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcbnZhciBzZXR0bGUgPSByZXF1aXJlKCcuLy4uL2NvcmUvc2V0dGxlJyk7XG52YXIgYnVpbGRVUkwgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvYnVpbGRVUkwnKTtcbnZhciBwYXJzZUhlYWRlcnMgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvcGFyc2VIZWFkZXJzJyk7XG52YXIgaXNVUkxTYW1lT3JpZ2luID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2lzVVJMU2FtZU9yaWdpbicpO1xudmFyIGNyZWF0ZUVycm9yID0gcmVxdWlyZSgnLi4vY29yZS9jcmVhdGVFcnJvcicpO1xudmFyIGJ0b2EgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmJ0b2EgJiYgd2luZG93LmJ0b2EuYmluZCh3aW5kb3cpKSB8fCByZXF1aXJlKCcuLy4uL2hlbHBlcnMvYnRvYScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHhockFkYXB0ZXIoY29uZmlnKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiBkaXNwYXRjaFhoclJlcXVlc3QocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgdmFyIHJlcXVlc3REYXRhID0gY29uZmlnLmRhdGE7XG4gICAgdmFyIHJlcXVlc3RIZWFkZXJzID0gY29uZmlnLmhlYWRlcnM7XG5cbiAgICBpZiAodXRpbHMuaXNGb3JtRGF0YShyZXF1ZXN0RGF0YSkpIHtcbiAgICAgIGRlbGV0ZSByZXF1ZXN0SGVhZGVyc1snQ29udGVudC1UeXBlJ107IC8vIExldCB0aGUgYnJvd3NlciBzZXQgaXRcbiAgICB9XG5cbiAgICB2YXIgcmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgIHZhciBsb2FkRXZlbnQgPSAnb25yZWFkeXN0YXRlY2hhbmdlJztcbiAgICB2YXIgeERvbWFpbiA9IGZhbHNlO1xuXG4gICAgLy8gRm9yIElFIDgvOSBDT1JTIHN1cHBvcnRcbiAgICAvLyBPbmx5IHN1cHBvcnRzIFBPU1QgYW5kIEdFVCBjYWxscyBhbmQgZG9lc24ndCByZXR1cm5zIHRoZSByZXNwb25zZSBoZWFkZXJzLlxuICAgIC8vIERPTidUIGRvIHRoaXMgZm9yIHRlc3RpbmcgYi9jIFhNTEh0dHBSZXF1ZXN0IGlzIG1vY2tlZCwgbm90IFhEb21haW5SZXF1ZXN0LlxuICAgIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Rlc3QnICYmXG4gICAgICAgIHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXG4gICAgICAgIHdpbmRvdy5YRG9tYWluUmVxdWVzdCAmJiAhKCd3aXRoQ3JlZGVudGlhbHMnIGluIHJlcXVlc3QpICYmXG4gICAgICAgICFpc1VSTFNhbWVPcmlnaW4oY29uZmlnLnVybCkpIHtcbiAgICAgIHJlcXVlc3QgPSBuZXcgd2luZG93LlhEb21haW5SZXF1ZXN0KCk7XG4gICAgICBsb2FkRXZlbnQgPSAnb25sb2FkJztcbiAgICAgIHhEb21haW4gPSB0cnVlO1xuICAgICAgcmVxdWVzdC5vbnByb2dyZXNzID0gZnVuY3Rpb24gaGFuZGxlUHJvZ3Jlc3MoKSB7fTtcbiAgICAgIHJlcXVlc3Qub250aW1lb3V0ID0gZnVuY3Rpb24gaGFuZGxlVGltZW91dCgpIHt9O1xuICAgIH1cblxuICAgIC8vIEhUVFAgYmFzaWMgYXV0aGVudGljYXRpb25cbiAgICBpZiAoY29uZmlnLmF1dGgpIHtcbiAgICAgIHZhciB1c2VybmFtZSA9IGNvbmZpZy5hdXRoLnVzZXJuYW1lIHx8ICcnO1xuICAgICAgdmFyIHBhc3N3b3JkID0gY29uZmlnLmF1dGgucGFzc3dvcmQgfHwgJyc7XG4gICAgICByZXF1ZXN0SGVhZGVycy5BdXRob3JpemF0aW9uID0gJ0Jhc2ljICcgKyBidG9hKHVzZXJuYW1lICsgJzonICsgcGFzc3dvcmQpO1xuICAgIH1cblxuICAgIHJlcXVlc3Qub3Blbihjb25maWcubWV0aG9kLnRvVXBwZXJDYXNlKCksIGJ1aWxkVVJMKGNvbmZpZy51cmwsIGNvbmZpZy5wYXJhbXMsIGNvbmZpZy5wYXJhbXNTZXJpYWxpemVyKSwgdHJ1ZSk7XG5cbiAgICAvLyBTZXQgdGhlIHJlcXVlc3QgdGltZW91dCBpbiBNU1xuICAgIHJlcXVlc3QudGltZW91dCA9IGNvbmZpZy50aW1lb3V0O1xuXG4gICAgLy8gTGlzdGVuIGZvciByZWFkeSBzdGF0ZVxuICAgIHJlcXVlc3RbbG9hZEV2ZW50XSA9IGZ1bmN0aW9uIGhhbmRsZUxvYWQoKSB7XG4gICAgICBpZiAoIXJlcXVlc3QgfHwgKHJlcXVlc3QucmVhZHlTdGF0ZSAhPT0gNCAmJiAheERvbWFpbikpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBUaGUgcmVxdWVzdCBlcnJvcmVkIG91dCBhbmQgd2UgZGlkbid0IGdldCBhIHJlc3BvbnNlLCB0aGlzIHdpbGwgYmVcbiAgICAgIC8vIGhhbmRsZWQgYnkgb25lcnJvciBpbnN0ZWFkXG4gICAgICAvLyBXaXRoIG9uZSBleGNlcHRpb246IHJlcXVlc3QgdGhhdCB1c2luZyBmaWxlOiBwcm90b2NvbCwgbW9zdCBicm93c2Vyc1xuICAgICAgLy8gd2lsbCByZXR1cm4gc3RhdHVzIGFzIDAgZXZlbiB0aG91Z2ggaXQncyBhIHN1Y2Nlc3NmdWwgcmVxdWVzdFxuICAgICAgaWYgKHJlcXVlc3Quc3RhdHVzID09PSAwICYmICEocmVxdWVzdC5yZXNwb25zZVVSTCAmJiByZXF1ZXN0LnJlc3BvbnNlVVJMLmluZGV4T2YoJ2ZpbGU6JykgPT09IDApKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgLy8gUHJlcGFyZSB0aGUgcmVzcG9uc2VcbiAgICAgIHZhciByZXNwb25zZUhlYWRlcnMgPSAnZ2V0QWxsUmVzcG9uc2VIZWFkZXJzJyBpbiByZXF1ZXN0ID8gcGFyc2VIZWFkZXJzKHJlcXVlc3QuZ2V0QWxsUmVzcG9uc2VIZWFkZXJzKCkpIDogbnVsbDtcbiAgICAgIHZhciByZXNwb25zZURhdGEgPSAhY29uZmlnLnJlc3BvbnNlVHlwZSB8fCBjb25maWcucmVzcG9uc2VUeXBlID09PSAndGV4dCcgPyByZXF1ZXN0LnJlc3BvbnNlVGV4dCA6IHJlcXVlc3QucmVzcG9uc2U7XG4gICAgICB2YXIgcmVzcG9uc2UgPSB7XG4gICAgICAgIGRhdGE6IHJlc3BvbnNlRGF0YSxcbiAgICAgICAgLy8gSUUgc2VuZHMgMTIyMyBpbnN0ZWFkIG9mIDIwNCAoaHR0cHM6Ly9naXRodWIuY29tL2F4aW9zL2F4aW9zL2lzc3Vlcy8yMDEpXG4gICAgICAgIHN0YXR1czogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAyMDQgOiByZXF1ZXN0LnN0YXR1cyxcbiAgICAgICAgc3RhdHVzVGV4dDogcmVxdWVzdC5zdGF0dXMgPT09IDEyMjMgPyAnTm8gQ29udGVudCcgOiByZXF1ZXN0LnN0YXR1c1RleHQsXG4gICAgICAgIGhlYWRlcnM6IHJlc3BvbnNlSGVhZGVycyxcbiAgICAgICAgY29uZmlnOiBjb25maWcsXG4gICAgICAgIHJlcXVlc3Q6IHJlcXVlc3RcbiAgICAgIH07XG5cbiAgICAgIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHJlc3BvbnNlKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSBsb3cgbGV2ZWwgbmV0d29yayBlcnJvcnNcbiAgICByZXF1ZXN0Lm9uZXJyb3IgPSBmdW5jdGlvbiBoYW5kbGVFcnJvcigpIHtcbiAgICAgIC8vIFJlYWwgZXJyb3JzIGFyZSBoaWRkZW4gZnJvbSB1cyBieSB0aGUgYnJvd3NlclxuICAgICAgLy8gb25lcnJvciBzaG91bGQgb25seSBmaXJlIGlmIGl0J3MgYSBuZXR3b3JrIGVycm9yXG4gICAgICByZWplY3QoY3JlYXRlRXJyb3IoJ05ldHdvcmsgRXJyb3InLCBjb25maWcsIG51bGwsIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEhhbmRsZSB0aW1lb3V0XG4gICAgcmVxdWVzdC5vbnRpbWVvdXQgPSBmdW5jdGlvbiBoYW5kbGVUaW1lb3V0KCkge1xuICAgICAgcmVqZWN0KGNyZWF0ZUVycm9yKCd0aW1lb3V0IG9mICcgKyBjb25maWcudGltZW91dCArICdtcyBleGNlZWRlZCcsIGNvbmZpZywgJ0VDT05OQUJPUlRFRCcsXG4gICAgICAgIHJlcXVlc3QpKTtcblxuICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgcmVxdWVzdCA9IG51bGw7XG4gICAgfTtcblxuICAgIC8vIEFkZCB4c3JmIGhlYWRlclxuICAgIC8vIFRoaXMgaXMgb25seSBkb25lIGlmIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50LlxuICAgIC8vIFNwZWNpZmljYWxseSBub3QgaWYgd2UncmUgaW4gYSB3ZWIgd29ya2VyLCBvciByZWFjdC1uYXRpdmUuXG4gICAgaWYgKHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkpIHtcbiAgICAgIHZhciBjb29raWVzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2Nvb2tpZXMnKTtcblxuICAgICAgLy8gQWRkIHhzcmYgaGVhZGVyXG4gICAgICB2YXIgeHNyZlZhbHVlID0gKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMgfHwgaXNVUkxTYW1lT3JpZ2luKGNvbmZpZy51cmwpKSAmJiBjb25maWcueHNyZkNvb2tpZU5hbWUgP1xuICAgICAgICAgIGNvb2tpZXMucmVhZChjb25maWcueHNyZkNvb2tpZU5hbWUpIDpcbiAgICAgICAgICB1bmRlZmluZWQ7XG5cbiAgICAgIGlmICh4c3JmVmFsdWUpIHtcbiAgICAgICAgcmVxdWVzdEhlYWRlcnNbY29uZmlnLnhzcmZIZWFkZXJOYW1lXSA9IHhzcmZWYWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBBZGQgaGVhZGVycyB0byB0aGUgcmVxdWVzdFxuICAgIGlmICgnc2V0UmVxdWVzdEhlYWRlcicgaW4gcmVxdWVzdCkge1xuICAgICAgdXRpbHMuZm9yRWFjaChyZXF1ZXN0SGVhZGVycywgZnVuY3Rpb24gc2V0UmVxdWVzdEhlYWRlcih2YWwsIGtleSkge1xuICAgICAgICBpZiAodHlwZW9mIHJlcXVlc3REYXRhID09PSAndW5kZWZpbmVkJyAmJiBrZXkudG9Mb3dlckNhc2UoKSA9PT0gJ2NvbnRlbnQtdHlwZScpIHtcbiAgICAgICAgICAvLyBSZW1vdmUgQ29udGVudC1UeXBlIGlmIGRhdGEgaXMgdW5kZWZpbmVkXG4gICAgICAgICAgZGVsZXRlIHJlcXVlc3RIZWFkZXJzW2tleV07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gT3RoZXJ3aXNlIGFkZCBoZWFkZXIgdG8gdGhlIHJlcXVlc3RcbiAgICAgICAgICByZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoa2V5LCB2YWwpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBBZGQgd2l0aENyZWRlbnRpYWxzIHRvIHJlcXVlc3QgaWYgbmVlZGVkXG4gICAgaWYgKGNvbmZpZy53aXRoQ3JlZGVudGlhbHMpIHtcbiAgICAgIHJlcXVlc3Qud2l0aENyZWRlbnRpYWxzID0gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBBZGQgcmVzcG9uc2VUeXBlIHRvIHJlcXVlc3QgaWYgbmVlZGVkXG4gICAgaWYgKGNvbmZpZy5yZXNwb25zZVR5cGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcXVlc3QucmVzcG9uc2VUeXBlID0gY29uZmlnLnJlc3BvbnNlVHlwZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgLy8gRXhwZWN0ZWQgRE9NRXhjZXB0aW9uIHRocm93biBieSBicm93c2VycyBub3QgY29tcGF0aWJsZSBYTUxIdHRwUmVxdWVzdCBMZXZlbCAyLlxuICAgICAgICAvLyBCdXQsIHRoaXMgY2FuIGJlIHN1cHByZXNzZWQgZm9yICdqc29uJyB0eXBlIGFzIGl0IGNhbiBiZSBwYXJzZWQgYnkgZGVmYXVsdCAndHJhbnNmb3JtUmVzcG9uc2UnIGZ1bmN0aW9uLlxuICAgICAgICBpZiAoY29uZmlnLnJlc3BvbnNlVHlwZSAhPT0gJ2pzb24nKSB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEhhbmRsZSBwcm9ncmVzcyBpZiBuZWVkZWRcbiAgICBpZiAodHlwZW9mIGNvbmZpZy5vbkRvd25sb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBjb25maWcub25Eb3dubG9hZFByb2dyZXNzKTtcbiAgICB9XG5cbiAgICAvLyBOb3QgYWxsIGJyb3dzZXJzIHN1cHBvcnQgdXBsb2FkIGV2ZW50c1xuICAgIGlmICh0eXBlb2YgY29uZmlnLm9uVXBsb2FkUHJvZ3Jlc3MgPT09ICdmdW5jdGlvbicgJiYgcmVxdWVzdC51cGxvYWQpIHtcbiAgICAgIHJlcXVlc3QudXBsb2FkLmFkZEV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgY29uZmlnLm9uVXBsb2FkUHJvZ3Jlc3MpO1xuICAgIH1cblxuICAgIGlmIChjb25maWcuY2FuY2VsVG9rZW4pIHtcbiAgICAgIC8vIEhhbmRsZSBjYW5jZWxsYXRpb25cbiAgICAgIGNvbmZpZy5jYW5jZWxUb2tlbi5wcm9taXNlLnRoZW4oZnVuY3Rpb24gb25DYW5jZWxlZChjYW5jZWwpIHtcbiAgICAgICAgaWYgKCFyZXF1ZXN0KSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVxdWVzdC5hYm9ydCgpO1xuICAgICAgICByZWplY3QoY2FuY2VsKTtcbiAgICAgICAgLy8gQ2xlYW4gdXAgcmVxdWVzdFxuICAgICAgICByZXF1ZXN0ID0gbnVsbDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGlmIChyZXF1ZXN0RGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXF1ZXN0RGF0YSA9IG51bGw7XG4gICAgfVxuXG4gICAgLy8gU2VuZCB0aGUgcmVxdWVzdFxuICAgIHJlcXVlc3Quc2VuZChyZXF1ZXN0RGF0YSk7XG4gIH0pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xudmFyIEF4aW9zID0gcmVxdWlyZSgnLi9jb3JlL0F4aW9zJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuL2RlZmF1bHRzJyk7XG5cbi8qKlxuICogQ3JlYXRlIGFuIGluc3RhbmNlIG9mIEF4aW9zXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGRlZmF1bHRDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqIEByZXR1cm4ge0F4aW9zfSBBIG5ldyBpbnN0YW5jZSBvZiBBeGlvc1xuICovXG5mdW5jdGlvbiBjcmVhdGVJbnN0YW5jZShkZWZhdWx0Q29uZmlnKSB7XG4gIHZhciBjb250ZXh0ID0gbmV3IEF4aW9zKGRlZmF1bHRDb25maWcpO1xuICB2YXIgaW5zdGFuY2UgPSBiaW5kKEF4aW9zLnByb3RvdHlwZS5yZXF1ZXN0LCBjb250ZXh0KTtcblxuICAvLyBDb3B5IGF4aW9zLnByb3RvdHlwZSB0byBpbnN0YW5jZVxuICB1dGlscy5leHRlbmQoaW5zdGFuY2UsIEF4aW9zLnByb3RvdHlwZSwgY29udGV4dCk7XG5cbiAgLy8gQ29weSBjb250ZXh0IHRvIGluc3RhbmNlXG4gIHV0aWxzLmV4dGVuZChpbnN0YW5jZSwgY29udGV4dCk7XG5cbiAgcmV0dXJuIGluc3RhbmNlO1xufVxuXG4vLyBDcmVhdGUgdGhlIGRlZmF1bHQgaW5zdGFuY2UgdG8gYmUgZXhwb3J0ZWRcbnZhciBheGlvcyA9IGNyZWF0ZUluc3RhbmNlKGRlZmF1bHRzKTtcblxuLy8gRXhwb3NlIEF4aW9zIGNsYXNzIHRvIGFsbG93IGNsYXNzIGluaGVyaXRhbmNlXG5heGlvcy5BeGlvcyA9IEF4aW9zO1xuXG4vLyBGYWN0b3J5IGZvciBjcmVhdGluZyBuZXcgaW5zdGFuY2VzXG5heGlvcy5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUoaW5zdGFuY2VDb25maWcpIHtcbiAgcmV0dXJuIGNyZWF0ZUluc3RhbmNlKHV0aWxzLm1lcmdlKGRlZmF1bHRzLCBpbnN0YW5jZUNvbmZpZykpO1xufTtcblxuLy8gRXhwb3NlIENhbmNlbCAmIENhbmNlbFRva2VuXG5heGlvcy5DYW5jZWwgPSByZXF1aXJlKCcuL2NhbmNlbC9DYW5jZWwnKTtcbmF4aW9zLkNhbmNlbFRva2VuID0gcmVxdWlyZSgnLi9jYW5jZWwvQ2FuY2VsVG9rZW4nKTtcbmF4aW9zLmlzQ2FuY2VsID0gcmVxdWlyZSgnLi9jYW5jZWwvaXNDYW5jZWwnKTtcblxuLy8gRXhwb3NlIGFsbC9zcHJlYWRcbmF4aW9zLmFsbCA9IGZ1bmN0aW9uIGFsbChwcm9taXNlcykge1xuICByZXR1cm4gUHJvbWlzZS5hbGwocHJvbWlzZXMpO1xufTtcbmF4aW9zLnNwcmVhZCA9IHJlcXVpcmUoJy4vaGVscGVycy9zcHJlYWQnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBheGlvcztcblxuLy8gQWxsb3cgdXNlIG9mIGRlZmF1bHQgaW1wb3J0IHN5bnRheCBpbiBUeXBlU2NyaXB0XG5tb2R1bGUuZXhwb3J0cy5kZWZhdWx0ID0gYXhpb3M7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQSBgQ2FuY2VsYCBpcyBhbiBvYmplY3QgdGhhdCBpcyB0aHJvd24gd2hlbiBhbiBvcGVyYXRpb24gaXMgY2FuY2VsZWQuXG4gKlxuICogQGNsYXNzXG4gKiBAcGFyYW0ge3N0cmluZz19IG1lc3NhZ2UgVGhlIG1lc3NhZ2UuXG4gKi9cbmZ1bmN0aW9uIENhbmNlbChtZXNzYWdlKSB7XG4gIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG59XG5cbkNhbmNlbC5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcbiAgcmV0dXJuICdDYW5jZWwnICsgKHRoaXMubWVzc2FnZSA/ICc6ICcgKyB0aGlzLm1lc3NhZ2UgOiAnJyk7XG59O1xuXG5DYW5jZWwucHJvdG90eXBlLl9fQ0FOQ0VMX18gPSB0cnVlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IENhbmNlbDtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIENhbmNlbCA9IHJlcXVpcmUoJy4vQ2FuY2VsJyk7XG5cbi8qKlxuICogQSBgQ2FuY2VsVG9rZW5gIGlzIGFuIG9iamVjdCB0aGF0IGNhbiBiZSB1c2VkIHRvIHJlcXVlc3QgY2FuY2VsbGF0aW9uIG9mIGFuIG9wZXJhdGlvbi5cbiAqXG4gKiBAY2xhc3NcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGV4ZWN1dG9yIFRoZSBleGVjdXRvciBmdW5jdGlvbi5cbiAqL1xuZnVuY3Rpb24gQ2FuY2VsVG9rZW4oZXhlY3V0b3IpIHtcbiAgaWYgKHR5cGVvZiBleGVjdXRvciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2V4ZWN1dG9yIG11c3QgYmUgYSBmdW5jdGlvbi4nKTtcbiAgfVxuXG4gIHZhciByZXNvbHZlUHJvbWlzZTtcbiAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gcHJvbWlzZUV4ZWN1dG9yKHJlc29sdmUpIHtcbiAgICByZXNvbHZlUHJvbWlzZSA9IHJlc29sdmU7XG4gIH0pO1xuXG4gIHZhciB0b2tlbiA9IHRoaXM7XG4gIGV4ZWN1dG9yKGZ1bmN0aW9uIGNhbmNlbChtZXNzYWdlKSB7XG4gICAgaWYgKHRva2VuLnJlYXNvbikge1xuICAgICAgLy8gQ2FuY2VsbGF0aW9uIGhhcyBhbHJlYWR5IGJlZW4gcmVxdWVzdGVkXG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdG9rZW4ucmVhc29uID0gbmV3IENhbmNlbChtZXNzYWdlKTtcbiAgICByZXNvbHZlUHJvbWlzZSh0b2tlbi5yZWFzb24pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBUaHJvd3MgYSBgQ2FuY2VsYCBpZiBjYW5jZWxsYXRpb24gaGFzIGJlZW4gcmVxdWVzdGVkLlxuICovXG5DYW5jZWxUb2tlbi5wcm90b3R5cGUudGhyb3dJZlJlcXVlc3RlZCA9IGZ1bmN0aW9uIHRocm93SWZSZXF1ZXN0ZWQoKSB7XG4gIGlmICh0aGlzLnJlYXNvbikge1xuICAgIHRocm93IHRoaXMucmVhc29uO1xuICB9XG59O1xuXG4vKipcbiAqIFJldHVybnMgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgYSBuZXcgYENhbmNlbFRva2VuYCBhbmQgYSBmdW5jdGlvbiB0aGF0LCB3aGVuIGNhbGxlZCxcbiAqIGNhbmNlbHMgdGhlIGBDYW5jZWxUb2tlbmAuXG4gKi9cbkNhbmNlbFRva2VuLnNvdXJjZSA9IGZ1bmN0aW9uIHNvdXJjZSgpIHtcbiAgdmFyIGNhbmNlbDtcbiAgdmFyIHRva2VuID0gbmV3IENhbmNlbFRva2VuKGZ1bmN0aW9uIGV4ZWN1dG9yKGMpIHtcbiAgICBjYW5jZWwgPSBjO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICB0b2tlbjogdG9rZW4sXG4gICAgY2FuY2VsOiBjYW5jZWxcbiAgfTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2FuY2VsVG9rZW47XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNDYW5jZWwodmFsdWUpIHtcbiAgcmV0dXJuICEhKHZhbHVlICYmIHZhbHVlLl9fQ0FOQ0VMX18pO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGRlZmF1bHRzID0gcmVxdWlyZSgnLi8uLi9kZWZhdWx0cycpO1xudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xudmFyIEludGVyY2VwdG9yTWFuYWdlciA9IHJlcXVpcmUoJy4vSW50ZXJjZXB0b3JNYW5hZ2VyJyk7XG52YXIgZGlzcGF0Y2hSZXF1ZXN0ID0gcmVxdWlyZSgnLi9kaXNwYXRjaFJlcXVlc3QnKTtcblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgaW5zdGFuY2Ugb2YgQXhpb3NcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gaW5zdGFuY2VDb25maWcgVGhlIGRlZmF1bHQgY29uZmlnIGZvciB0aGUgaW5zdGFuY2VcbiAqL1xuZnVuY3Rpb24gQXhpb3MoaW5zdGFuY2VDb25maWcpIHtcbiAgdGhpcy5kZWZhdWx0cyA9IGluc3RhbmNlQ29uZmlnO1xuICB0aGlzLmludGVyY2VwdG9ycyA9IHtcbiAgICByZXF1ZXN0OiBuZXcgSW50ZXJjZXB0b3JNYW5hZ2VyKCksXG4gICAgcmVzcG9uc2U6IG5ldyBJbnRlcmNlcHRvck1hbmFnZXIoKVxuICB9O1xufVxuXG4vKipcbiAqIERpc3BhdGNoIGEgcmVxdWVzdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyBzcGVjaWZpYyBmb3IgdGhpcyByZXF1ZXN0IChtZXJnZWQgd2l0aCB0aGlzLmRlZmF1bHRzKVxuICovXG5BeGlvcy5wcm90b3R5cGUucmVxdWVzdCA9IGZ1bmN0aW9uIHJlcXVlc3QoY29uZmlnKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAvLyBBbGxvdyBmb3IgYXhpb3MoJ2V4YW1wbGUvdXJsJ1ssIGNvbmZpZ10pIGEgbGEgZmV0Y2ggQVBJXG4gIGlmICh0eXBlb2YgY29uZmlnID09PSAnc3RyaW5nJykge1xuICAgIGNvbmZpZyA9IHV0aWxzLm1lcmdlKHtcbiAgICAgIHVybDogYXJndW1lbnRzWzBdXG4gICAgfSwgYXJndW1lbnRzWzFdKTtcbiAgfVxuXG4gIGNvbmZpZyA9IHV0aWxzLm1lcmdlKGRlZmF1bHRzLCB0aGlzLmRlZmF1bHRzLCB7IG1ldGhvZDogJ2dldCcgfSwgY29uZmlnKTtcbiAgY29uZmlnLm1ldGhvZCA9IGNvbmZpZy5tZXRob2QudG9Mb3dlckNhc2UoKTtcblxuICAvLyBIb29rIHVwIGludGVyY2VwdG9ycyBtaWRkbGV3YXJlXG4gIHZhciBjaGFpbiA9IFtkaXNwYXRjaFJlcXVlc3QsIHVuZGVmaW5lZF07XG4gIHZhciBwcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKGNvbmZpZyk7XG5cbiAgdGhpcy5pbnRlcmNlcHRvcnMucmVxdWVzdC5mb3JFYWNoKGZ1bmN0aW9uIHVuc2hpZnRSZXF1ZXN0SW50ZXJjZXB0b3JzKGludGVyY2VwdG9yKSB7XG4gICAgY2hhaW4udW5zaGlmdChpbnRlcmNlcHRvci5mdWxmaWxsZWQsIGludGVyY2VwdG9yLnJlamVjdGVkKTtcbiAgfSk7XG5cbiAgdGhpcy5pbnRlcmNlcHRvcnMucmVzcG9uc2UuZm9yRWFjaChmdW5jdGlvbiBwdXNoUmVzcG9uc2VJbnRlcmNlcHRvcnMoaW50ZXJjZXB0b3IpIHtcbiAgICBjaGFpbi5wdXNoKGludGVyY2VwdG9yLmZ1bGZpbGxlZCwgaW50ZXJjZXB0b3IucmVqZWN0ZWQpO1xuICB9KTtcblxuICB3aGlsZSAoY2hhaW4ubGVuZ3RoKSB7XG4gICAgcHJvbWlzZSA9IHByb21pc2UudGhlbihjaGFpbi5zaGlmdCgpLCBjaGFpbi5zaGlmdCgpKTtcbiAgfVxuXG4gIHJldHVybiBwcm9taXNlO1xufTtcblxuLy8gUHJvdmlkZSBhbGlhc2VzIGZvciBzdXBwb3J0ZWQgcmVxdWVzdCBtZXRob2RzXG51dGlscy5mb3JFYWNoKFsnZGVsZXRlJywgJ2dldCcsICdoZWFkJywgJ29wdGlvbnMnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZE5vRGF0YShtZXRob2QpIHtcbiAgLyplc2xpbnQgZnVuYy1uYW1lczowKi9cbiAgQXhpb3MucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbih1cmwsIGNvbmZpZykge1xuICAgIHJldHVybiB0aGlzLnJlcXVlc3QodXRpbHMubWVyZ2UoY29uZmlnIHx8IHt9LCB7XG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIHVybDogdXJsXG4gICAgfSkpO1xuICB9O1xufSk7XG5cbnV0aWxzLmZvckVhY2goWydwb3N0JywgJ3B1dCcsICdwYXRjaCddLCBmdW5jdGlvbiBmb3JFYWNoTWV0aG9kV2l0aERhdGEobWV0aG9kKSB7XG4gIC8qZXNsaW50IGZ1bmMtbmFtZXM6MCovXG4gIEF4aW9zLnByb3RvdHlwZVttZXRob2RdID0gZnVuY3Rpb24odXJsLCBkYXRhLCBjb25maWcpIHtcbiAgICByZXR1cm4gdGhpcy5yZXF1ZXN0KHV0aWxzLm1lcmdlKGNvbmZpZyB8fCB7fSwge1xuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICB1cmw6IHVybCxcbiAgICAgIGRhdGE6IGRhdGFcbiAgICB9KSk7XG4gIH07XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBBeGlvcztcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi8uLi91dGlscycpO1xuXG5mdW5jdGlvbiBJbnRlcmNlcHRvck1hbmFnZXIoKSB7XG4gIHRoaXMuaGFuZGxlcnMgPSBbXTtcbn1cblxuLyoqXG4gKiBBZGQgYSBuZXcgaW50ZXJjZXB0b3IgdG8gdGhlIHN0YWNrXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVsZmlsbGVkIFRoZSBmdW5jdGlvbiB0byBoYW5kbGUgYHRoZW5gIGZvciBhIGBQcm9taXNlYFxuICogQHBhcmFtIHtGdW5jdGlvbn0gcmVqZWN0ZWQgVGhlIGZ1bmN0aW9uIHRvIGhhbmRsZSBgcmVqZWN0YCBmb3IgYSBgUHJvbWlzZWBcbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9IEFuIElEIHVzZWQgdG8gcmVtb3ZlIGludGVyY2VwdG9yIGxhdGVyXG4gKi9cbkludGVyY2VwdG9yTWFuYWdlci5wcm90b3R5cGUudXNlID0gZnVuY3Rpb24gdXNlKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpIHtcbiAgdGhpcy5oYW5kbGVycy5wdXNoKHtcbiAgICBmdWxmaWxsZWQ6IGZ1bGZpbGxlZCxcbiAgICByZWplY3RlZDogcmVqZWN0ZWRcbiAgfSk7XG4gIHJldHVybiB0aGlzLmhhbmRsZXJzLmxlbmd0aCAtIDE7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBpbnRlcmNlcHRvciBmcm9tIHRoZSBzdGFja1xuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBpZCBUaGUgSUQgdGhhdCB3YXMgcmV0dXJuZWQgYnkgYHVzZWBcbiAqL1xuSW50ZXJjZXB0b3JNYW5hZ2VyLnByb3RvdHlwZS5lamVjdCA9IGZ1bmN0aW9uIGVqZWN0KGlkKSB7XG4gIGlmICh0aGlzLmhhbmRsZXJzW2lkXSkge1xuICAgIHRoaXMuaGFuZGxlcnNbaWRdID0gbnVsbDtcbiAgfVxufTtcblxuLyoqXG4gKiBJdGVyYXRlIG92ZXIgYWxsIHRoZSByZWdpc3RlcmVkIGludGVyY2VwdG9yc1xuICpcbiAqIFRoaXMgbWV0aG9kIGlzIHBhcnRpY3VsYXJseSB1c2VmdWwgZm9yIHNraXBwaW5nIG92ZXIgYW55XG4gKiBpbnRlcmNlcHRvcnMgdGhhdCBtYXkgaGF2ZSBiZWNvbWUgYG51bGxgIGNhbGxpbmcgYGVqZWN0YC5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgZnVuY3Rpb24gdG8gY2FsbCBmb3IgZWFjaCBpbnRlcmNlcHRvclxuICovXG5JbnRlcmNlcHRvck1hbmFnZXIucHJvdG90eXBlLmZvckVhY2ggPSBmdW5jdGlvbiBmb3JFYWNoKGZuKSB7XG4gIHV0aWxzLmZvckVhY2godGhpcy5oYW5kbGVycywgZnVuY3Rpb24gZm9yRWFjaEhhbmRsZXIoaCkge1xuICAgIGlmIChoICE9PSBudWxsKSB7XG4gICAgICBmbihoKTtcbiAgICB9XG4gIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBJbnRlcmNlcHRvck1hbmFnZXI7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBlbmhhbmNlRXJyb3IgPSByZXF1aXJlKCcuL2VuaGFuY2VFcnJvcicpO1xuXG4vKipcbiAqIENyZWF0ZSBhbiBFcnJvciB3aXRoIHRoZSBzcGVjaWZpZWQgbWVzc2FnZSwgY29uZmlnLCBlcnJvciBjb2RlLCByZXF1ZXN0IGFuZCByZXNwb25zZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gbWVzc2FnZSBUaGUgZXJyb3IgbWVzc2FnZS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZy5cbiAqIEBwYXJhbSB7c3RyaW5nfSBbY29kZV0gVGhlIGVycm9yIGNvZGUgKGZvciBleGFtcGxlLCAnRUNPTk5BQk9SVEVEJykuXG4gKiBAcGFyYW0ge09iamVjdH0gW3JlcXVlc3RdIFRoZSByZXF1ZXN0LlxuICogQHBhcmFtIHtPYmplY3R9IFtyZXNwb25zZV0gVGhlIHJlc3BvbnNlLlxuICogQHJldHVybnMge0Vycm9yfSBUaGUgY3JlYXRlZCBlcnJvci5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjcmVhdGVFcnJvcihtZXNzYWdlLCBjb25maWcsIGNvZGUsIHJlcXVlc3QsIHJlc3BvbnNlKSB7XG4gIHZhciBlcnJvciA9IG5ldyBFcnJvcihtZXNzYWdlKTtcbiAgcmV0dXJuIGVuaGFuY2VFcnJvcihlcnJvciwgY29uZmlnLCBjb2RlLCByZXF1ZXN0LCByZXNwb25zZSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG52YXIgdHJhbnNmb3JtRGF0YSA9IHJlcXVpcmUoJy4vdHJhbnNmb3JtRGF0YScpO1xudmFyIGlzQ2FuY2VsID0gcmVxdWlyZSgnLi4vY2FuY2VsL2lzQ2FuY2VsJyk7XG52YXIgZGVmYXVsdHMgPSByZXF1aXJlKCcuLi9kZWZhdWx0cycpO1xudmFyIGlzQWJzb2x1dGVVUkwgPSByZXF1aXJlKCcuLy4uL2hlbHBlcnMvaXNBYnNvbHV0ZVVSTCcpO1xudmFyIGNvbWJpbmVVUkxzID0gcmVxdWlyZSgnLi8uLi9oZWxwZXJzL2NvbWJpbmVVUkxzJyk7XG5cbi8qKlxuICogVGhyb3dzIGEgYENhbmNlbGAgaWYgY2FuY2VsbGF0aW9uIGhhcyBiZWVuIHJlcXVlc3RlZC5cbiAqL1xuZnVuY3Rpb24gdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpIHtcbiAgaWYgKGNvbmZpZy5jYW5jZWxUb2tlbikge1xuICAgIGNvbmZpZy5jYW5jZWxUb2tlbi50aHJvd0lmUmVxdWVzdGVkKCk7XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNwYXRjaCBhIHJlcXVlc3QgdG8gdGhlIHNlcnZlciB1c2luZyB0aGUgY29uZmlndXJlZCBhZGFwdGVyLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBjb25maWcgVGhlIGNvbmZpZyB0aGF0IGlzIHRvIGJlIHVzZWQgZm9yIHRoZSByZXF1ZXN0XG4gKiBAcmV0dXJucyB7UHJvbWlzZX0gVGhlIFByb21pc2UgdG8gYmUgZnVsZmlsbGVkXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZGlzcGF0Y2hSZXF1ZXN0KGNvbmZpZykge1xuICB0aHJvd0lmQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKGNvbmZpZyk7XG5cbiAgLy8gU3VwcG9ydCBiYXNlVVJMIGNvbmZpZ1xuICBpZiAoY29uZmlnLmJhc2VVUkwgJiYgIWlzQWJzb2x1dGVVUkwoY29uZmlnLnVybCkpIHtcbiAgICBjb25maWcudXJsID0gY29tYmluZVVSTHMoY29uZmlnLmJhc2VVUkwsIGNvbmZpZy51cmwpO1xuICB9XG5cbiAgLy8gRW5zdXJlIGhlYWRlcnMgZXhpc3RcbiAgY29uZmlnLmhlYWRlcnMgPSBjb25maWcuaGVhZGVycyB8fCB7fTtcblxuICAvLyBUcmFuc2Zvcm0gcmVxdWVzdCBkYXRhXG4gIGNvbmZpZy5kYXRhID0gdHJhbnNmb3JtRGF0YShcbiAgICBjb25maWcuZGF0YSxcbiAgICBjb25maWcuaGVhZGVycyxcbiAgICBjb25maWcudHJhbnNmb3JtUmVxdWVzdFxuICApO1xuXG4gIC8vIEZsYXR0ZW4gaGVhZGVyc1xuICBjb25maWcuaGVhZGVycyA9IHV0aWxzLm1lcmdlKFxuICAgIGNvbmZpZy5oZWFkZXJzLmNvbW1vbiB8fCB7fSxcbiAgICBjb25maWcuaGVhZGVyc1tjb25maWcubWV0aG9kXSB8fCB7fSxcbiAgICBjb25maWcuaGVhZGVycyB8fCB7fVxuICApO1xuXG4gIHV0aWxzLmZvckVhY2goXG4gICAgWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnLCAncG9zdCcsICdwdXQnLCAncGF0Y2gnLCAnY29tbW9uJ10sXG4gICAgZnVuY3Rpb24gY2xlYW5IZWFkZXJDb25maWcobWV0aG9kKSB7XG4gICAgICBkZWxldGUgY29uZmlnLmhlYWRlcnNbbWV0aG9kXTtcbiAgICB9XG4gICk7XG5cbiAgdmFyIGFkYXB0ZXIgPSBjb25maWcuYWRhcHRlciB8fCBkZWZhdWx0cy5hZGFwdGVyO1xuXG4gIHJldHVybiBhZGFwdGVyKGNvbmZpZykudGhlbihmdW5jdGlvbiBvbkFkYXB0ZXJSZXNvbHV0aW9uKHJlc3BvbnNlKSB7XG4gICAgdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpO1xuXG4gICAgLy8gVHJhbnNmb3JtIHJlc3BvbnNlIGRhdGFcbiAgICByZXNwb25zZS5kYXRhID0gdHJhbnNmb3JtRGF0YShcbiAgICAgIHJlc3BvbnNlLmRhdGEsXG4gICAgICByZXNwb25zZS5oZWFkZXJzLFxuICAgICAgY29uZmlnLnRyYW5zZm9ybVJlc3BvbnNlXG4gICAgKTtcblxuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSwgZnVuY3Rpb24gb25BZGFwdGVyUmVqZWN0aW9uKHJlYXNvbikge1xuICAgIGlmICghaXNDYW5jZWwocmVhc29uKSkge1xuICAgICAgdGhyb3dJZkNhbmNlbGxhdGlvblJlcXVlc3RlZChjb25maWcpO1xuXG4gICAgICAvLyBUcmFuc2Zvcm0gcmVzcG9uc2UgZGF0YVxuICAgICAgaWYgKHJlYXNvbiAmJiByZWFzb24ucmVzcG9uc2UpIHtcbiAgICAgICAgcmVhc29uLnJlc3BvbnNlLmRhdGEgPSB0cmFuc2Zvcm1EYXRhKFxuICAgICAgICAgIHJlYXNvbi5yZXNwb25zZS5kYXRhLFxuICAgICAgICAgIHJlYXNvbi5yZXNwb25zZS5oZWFkZXJzLFxuICAgICAgICAgIGNvbmZpZy50cmFuc2Zvcm1SZXNwb25zZVxuICAgICAgICApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChyZWFzb24pO1xuICB9KTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVXBkYXRlIGFuIEVycm9yIHdpdGggdGhlIHNwZWNpZmllZCBjb25maWcsIGVycm9yIGNvZGUsIGFuZCByZXNwb25zZS5cbiAqXG4gKiBAcGFyYW0ge0Vycm9yfSBlcnJvciBUaGUgZXJyb3IgdG8gdXBkYXRlLlxuICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyBUaGUgY29uZmlnLlxuICogQHBhcmFtIHtzdHJpbmd9IFtjb2RlXSBUaGUgZXJyb3IgY29kZSAoZm9yIGV4YW1wbGUsICdFQ09OTkFCT1JURUQnKS5cbiAqIEBwYXJhbSB7T2JqZWN0fSBbcmVxdWVzdF0gVGhlIHJlcXVlc3QuXG4gKiBAcGFyYW0ge09iamVjdH0gW3Jlc3BvbnNlXSBUaGUgcmVzcG9uc2UuXG4gKiBAcmV0dXJucyB7RXJyb3J9IFRoZSBlcnJvci5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBlbmhhbmNlRXJyb3IoZXJyb3IsIGNvbmZpZywgY29kZSwgcmVxdWVzdCwgcmVzcG9uc2UpIHtcbiAgZXJyb3IuY29uZmlnID0gY29uZmlnO1xuICBpZiAoY29kZSkge1xuICAgIGVycm9yLmNvZGUgPSBjb2RlO1xuICB9XG4gIGVycm9yLnJlcXVlc3QgPSByZXF1ZXN0O1xuICBlcnJvci5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICByZXR1cm4gZXJyb3I7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgY3JlYXRlRXJyb3IgPSByZXF1aXJlKCcuL2NyZWF0ZUVycm9yJyk7XG5cbi8qKlxuICogUmVzb2x2ZSBvciByZWplY3QgYSBQcm9taXNlIGJhc2VkIG9uIHJlc3BvbnNlIHN0YXR1cy5cbiAqXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSByZXNvbHZlIEEgZnVuY3Rpb24gdGhhdCByZXNvbHZlcyB0aGUgcHJvbWlzZS5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IHJlamVjdCBBIGZ1bmN0aW9uIHRoYXQgcmVqZWN0cyB0aGUgcHJvbWlzZS5cbiAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSBUaGUgcmVzcG9uc2UuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgcmVzcG9uc2UpIHtcbiAgdmFyIHZhbGlkYXRlU3RhdHVzID0gcmVzcG9uc2UuY29uZmlnLnZhbGlkYXRlU3RhdHVzO1xuICAvLyBOb3RlOiBzdGF0dXMgaXMgbm90IGV4cG9zZWQgYnkgWERvbWFpblJlcXVlc3RcbiAgaWYgKCFyZXNwb25zZS5zdGF0dXMgfHwgIXZhbGlkYXRlU3RhdHVzIHx8IHZhbGlkYXRlU3RhdHVzKHJlc3BvbnNlLnN0YXR1cykpIHtcbiAgICByZXNvbHZlKHJlc3BvbnNlKTtcbiAgfSBlbHNlIHtcbiAgICByZWplY3QoY3JlYXRlRXJyb3IoXG4gICAgICAnUmVxdWVzdCBmYWlsZWQgd2l0aCBzdGF0dXMgY29kZSAnICsgcmVzcG9uc2Uuc3RhdHVzLFxuICAgICAgcmVzcG9uc2UuY29uZmlnLFxuICAgICAgbnVsbCxcbiAgICAgIHJlc3BvbnNlLnJlcXVlc3QsXG4gICAgICByZXNwb25zZVxuICAgICkpO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbi8qKlxuICogVHJhbnNmb3JtIHRoZSBkYXRhIGZvciBhIHJlcXVlc3Qgb3IgYSByZXNwb25zZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fFN0cmluZ30gZGF0YSBUaGUgZGF0YSB0byBiZSB0cmFuc2Zvcm1lZFxuICogQHBhcmFtIHtBcnJheX0gaGVhZGVycyBUaGUgaGVhZGVycyBmb3IgdGhlIHJlcXVlc3Qgb3IgcmVzcG9uc2VcbiAqIEBwYXJhbSB7QXJyYXl8RnVuY3Rpb259IGZucyBBIHNpbmdsZSBmdW5jdGlvbiBvciBBcnJheSBvZiBmdW5jdGlvbnNcbiAqIEByZXR1cm5zIHsqfSBUaGUgcmVzdWx0aW5nIHRyYW5zZm9ybWVkIGRhdGFcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0cmFuc2Zvcm1EYXRhKGRhdGEsIGhlYWRlcnMsIGZucykge1xuICAvKmVzbGludCBuby1wYXJhbS1yZWFzc2lnbjowKi9cbiAgdXRpbHMuZm9yRWFjaChmbnMsIGZ1bmN0aW9uIHRyYW5zZm9ybShmbikge1xuICAgIGRhdGEgPSBmbihkYXRhLCBoZWFkZXJzKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGRhdGE7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgbm9ybWFsaXplSGVhZGVyTmFtZSA9IHJlcXVpcmUoJy4vaGVscGVycy9ub3JtYWxpemVIZWFkZXJOYW1lJyk7XG5cbnZhciBERUZBVUxUX0NPTlRFTlRfVFlQRSA9IHtcbiAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXG59O1xuXG5mdW5jdGlvbiBzZXRDb250ZW50VHlwZUlmVW5zZXQoaGVhZGVycywgdmFsdWUpIHtcbiAgaWYgKCF1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzKSAmJiB1dGlscy5pc1VuZGVmaW5lZChoZWFkZXJzWydDb250ZW50LVR5cGUnXSkpIHtcbiAgICBoZWFkZXJzWydDb250ZW50LVR5cGUnXSA9IHZhbHVlO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldERlZmF1bHRBZGFwdGVyKCkge1xuICB2YXIgYWRhcHRlcjtcbiAgaWYgKHR5cGVvZiBYTUxIdHRwUmVxdWVzdCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBGb3IgYnJvd3NlcnMgdXNlIFhIUiBhZGFwdGVyXG4gICAgYWRhcHRlciA9IHJlcXVpcmUoJy4vYWRhcHRlcnMveGhyJyk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgLy8gRm9yIG5vZGUgdXNlIEhUVFAgYWRhcHRlclxuICAgIGFkYXB0ZXIgPSByZXF1aXJlKCcuL2FkYXB0ZXJzL2h0dHAnKTtcbiAgfVxuICByZXR1cm4gYWRhcHRlcjtcbn1cblxudmFyIGRlZmF1bHRzID0ge1xuICBhZGFwdGVyOiBnZXREZWZhdWx0QWRhcHRlcigpLFxuXG4gIHRyYW5zZm9ybVJlcXVlc3Q6IFtmdW5jdGlvbiB0cmFuc2Zvcm1SZXF1ZXN0KGRhdGEsIGhlYWRlcnMpIHtcbiAgICBub3JtYWxpemVIZWFkZXJOYW1lKGhlYWRlcnMsICdDb250ZW50LVR5cGUnKTtcbiAgICBpZiAodXRpbHMuaXNGb3JtRGF0YShkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNBcnJheUJ1ZmZlcihkYXRhKSB8fFxuICAgICAgdXRpbHMuaXNCdWZmZXIoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzU3RyZWFtKGRhdGEpIHx8XG4gICAgICB1dGlscy5pc0ZpbGUoZGF0YSkgfHxcbiAgICAgIHV0aWxzLmlzQmxvYihkYXRhKVxuICAgICkge1xuICAgICAgcmV0dXJuIGRhdGE7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc0FycmF5QnVmZmVyVmlldyhkYXRhKSkge1xuICAgICAgcmV0dXJuIGRhdGEuYnVmZmVyO1xuICAgIH1cbiAgICBpZiAodXRpbHMuaXNVUkxTZWFyY2hQYXJhbXMoZGF0YSkpIHtcbiAgICAgIHNldENvbnRlbnRUeXBlSWZVbnNldChoZWFkZXJzLCAnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkO2NoYXJzZXQ9dXRmLTgnKTtcbiAgICAgIHJldHVybiBkYXRhLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIGlmICh1dGlscy5pc09iamVjdChkYXRhKSkge1xuICAgICAgc2V0Q29udGVudFR5cGVJZlVuc2V0KGhlYWRlcnMsICdhcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTgnKTtcbiAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShkYXRhKTtcbiAgICB9XG4gICAgcmV0dXJuIGRhdGE7XG4gIH1dLFxuXG4gIHRyYW5zZm9ybVJlc3BvbnNlOiBbZnVuY3Rpb24gdHJhbnNmb3JtUmVzcG9uc2UoZGF0YSkge1xuICAgIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAgIGlmICh0eXBlb2YgZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRhdGEgPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAgfSBjYXRjaCAoZSkgeyAvKiBJZ25vcmUgKi8gfVxuICAgIH1cbiAgICByZXR1cm4gZGF0YTtcbiAgfV0sXG5cbiAgdGltZW91dDogMCxcblxuICB4c3JmQ29va2llTmFtZTogJ1hTUkYtVE9LRU4nLFxuICB4c3JmSGVhZGVyTmFtZTogJ1gtWFNSRi1UT0tFTicsXG5cbiAgbWF4Q29udGVudExlbmd0aDogLTEsXG5cbiAgdmFsaWRhdGVTdGF0dXM6IGZ1bmN0aW9uIHZhbGlkYXRlU3RhdHVzKHN0YXR1cykge1xuICAgIHJldHVybiBzdGF0dXMgPj0gMjAwICYmIHN0YXR1cyA8IDMwMDtcbiAgfVxufTtcblxuZGVmYXVsdHMuaGVhZGVycyA9IHtcbiAgY29tbW9uOiB7XG4gICAgJ0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L3BsYWluLCAqLyonXG4gIH1cbn07XG5cbnV0aWxzLmZvckVhY2goWydkZWxldGUnLCAnZ2V0JywgJ2hlYWQnXSwgZnVuY3Rpb24gZm9yRWFjaE1ldGhvZE5vRGF0YShtZXRob2QpIHtcbiAgZGVmYXVsdHMuaGVhZGVyc1ttZXRob2RdID0ge307XG59KTtcblxudXRpbHMuZm9yRWFjaChbJ3Bvc3QnLCAncHV0JywgJ3BhdGNoJ10sIGZ1bmN0aW9uIGZvckVhY2hNZXRob2RXaXRoRGF0YShtZXRob2QpIHtcbiAgZGVmYXVsdHMuaGVhZGVyc1ttZXRob2RdID0gdXRpbHMubWVyZ2UoREVGQVVMVF9DT05URU5UX1RZUEUpO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZGVmYXVsdHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmluZChmbiwgdGhpc0FyZykge1xuICByZXR1cm4gZnVuY3Rpb24gd3JhcCgpIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGFyZ3NbaV0gPSBhcmd1bWVudHNbaV07XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzQXJnLCBhcmdzKTtcbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8vIGJ0b2EgcG9seWZpbGwgZm9yIElFPDEwIGNvdXJ0ZXN5IGh0dHBzOi8vZ2l0aHViLmNvbS9kYXZpZGNoYW1iZXJzL0Jhc2U2NC5qc1xuXG52YXIgY2hhcnMgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkrLz0nO1xuXG5mdW5jdGlvbiBFKCkge1xuICB0aGlzLm1lc3NhZ2UgPSAnU3RyaW5nIGNvbnRhaW5zIGFuIGludmFsaWQgY2hhcmFjdGVyJztcbn1cbkUucHJvdG90eXBlID0gbmV3IEVycm9yO1xuRS5wcm90b3R5cGUuY29kZSA9IDU7XG5FLnByb3RvdHlwZS5uYW1lID0gJ0ludmFsaWRDaGFyYWN0ZXJFcnJvcic7XG5cbmZ1bmN0aW9uIGJ0b2EoaW5wdXQpIHtcbiAgdmFyIHN0ciA9IFN0cmluZyhpbnB1dCk7XG4gIHZhciBvdXRwdXQgPSAnJztcbiAgZm9yIChcbiAgICAvLyBpbml0aWFsaXplIHJlc3VsdCBhbmQgY291bnRlclxuICAgIHZhciBibG9jaywgY2hhckNvZGUsIGlkeCA9IDAsIG1hcCA9IGNoYXJzO1xuICAgIC8vIGlmIHRoZSBuZXh0IHN0ciBpbmRleCBkb2VzIG5vdCBleGlzdDpcbiAgICAvLyAgIGNoYW5nZSB0aGUgbWFwcGluZyB0YWJsZSB0byBcIj1cIlxuICAgIC8vICAgY2hlY2sgaWYgZCBoYXMgbm8gZnJhY3Rpb25hbCBkaWdpdHNcbiAgICBzdHIuY2hhckF0KGlkeCB8IDApIHx8IChtYXAgPSAnPScsIGlkeCAlIDEpO1xuICAgIC8vIFwiOCAtIGlkeCAlIDEgKiA4XCIgZ2VuZXJhdGVzIHRoZSBzZXF1ZW5jZSAyLCA0LCA2LCA4XG4gICAgb3V0cHV0ICs9IG1hcC5jaGFyQXQoNjMgJiBibG9jayA+PiA4IC0gaWR4ICUgMSAqIDgpXG4gICkge1xuICAgIGNoYXJDb2RlID0gc3RyLmNoYXJDb2RlQXQoaWR4ICs9IDMgLyA0KTtcbiAgICBpZiAoY2hhckNvZGUgPiAweEZGKSB7XG4gICAgICB0aHJvdyBuZXcgRSgpO1xuICAgIH1cbiAgICBibG9jayA9IGJsb2NrIDw8IDggfCBjaGFyQ29kZTtcbiAgfVxuICByZXR1cm4gb3V0cHV0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGJ0b2E7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxuZnVuY3Rpb24gZW5jb2RlKHZhbCkge1xuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHZhbCkuXG4gICAgcmVwbGFjZSgvJTQwL2dpLCAnQCcpLlxuICAgIHJlcGxhY2UoLyUzQS9naSwgJzonKS5cbiAgICByZXBsYWNlKC8lMjQvZywgJyQnKS5cbiAgICByZXBsYWNlKC8lMkMvZ2ksICcsJykuXG4gICAgcmVwbGFjZSgvJTIwL2csICcrJykuXG4gICAgcmVwbGFjZSgvJTVCL2dpLCAnWycpLlxuICAgIHJlcGxhY2UoLyU1RC9naSwgJ10nKTtcbn1cblxuLyoqXG4gKiBCdWlsZCBhIFVSTCBieSBhcHBlbmRpbmcgcGFyYW1zIHRvIHRoZSBlbmRcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsIFRoZSBiYXNlIG9mIHRoZSB1cmwgKGUuZy4sIGh0dHA6Ly93d3cuZ29vZ2xlLmNvbSlcbiAqIEBwYXJhbSB7b2JqZWN0fSBbcGFyYW1zXSBUaGUgcGFyYW1zIHRvIGJlIGFwcGVuZGVkXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgZm9ybWF0dGVkIHVybFxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJ1aWxkVVJMKHVybCwgcGFyYW1zLCBwYXJhbXNTZXJpYWxpemVyKSB7XG4gIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICBpZiAoIXBhcmFtcykge1xuICAgIHJldHVybiB1cmw7XG4gIH1cblxuICB2YXIgc2VyaWFsaXplZFBhcmFtcztcbiAgaWYgKHBhcmFtc1NlcmlhbGl6ZXIpIHtcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFyYW1zU2VyaWFsaXplcihwYXJhbXMpO1xuICB9IGVsc2UgaWYgKHV0aWxzLmlzVVJMU2VhcmNoUGFyYW1zKHBhcmFtcykpIHtcbiAgICBzZXJpYWxpemVkUGFyYW1zID0gcGFyYW1zLnRvU3RyaW5nKCk7XG4gIH0gZWxzZSB7XG4gICAgdmFyIHBhcnRzID0gW107XG5cbiAgICB1dGlscy5mb3JFYWNoKHBhcmFtcywgZnVuY3Rpb24gc2VyaWFsaXplKHZhbCwga2V5KSB7XG4gICAgICBpZiAodmFsID09PSBudWxsIHx8IHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHV0aWxzLmlzQXJyYXkodmFsKSkge1xuICAgICAgICBrZXkgPSBrZXkgKyAnW10nO1xuICAgICAgfVxuXG4gICAgICBpZiAoIXV0aWxzLmlzQXJyYXkodmFsKSkge1xuICAgICAgICB2YWwgPSBbdmFsXTtcbiAgICAgIH1cblxuICAgICAgdXRpbHMuZm9yRWFjaCh2YWwsIGZ1bmN0aW9uIHBhcnNlVmFsdWUodikge1xuICAgICAgICBpZiAodXRpbHMuaXNEYXRlKHYpKSB7XG4gICAgICAgICAgdiA9IHYudG9JU09TdHJpbmcoKTtcbiAgICAgICAgfSBlbHNlIGlmICh1dGlscy5pc09iamVjdCh2KSkge1xuICAgICAgICAgIHYgPSBKU09OLnN0cmluZ2lmeSh2KTtcbiAgICAgICAgfVxuICAgICAgICBwYXJ0cy5wdXNoKGVuY29kZShrZXkpICsgJz0nICsgZW5jb2RlKHYpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgc2VyaWFsaXplZFBhcmFtcyA9IHBhcnRzLmpvaW4oJyYnKTtcbiAgfVxuXG4gIGlmIChzZXJpYWxpemVkUGFyYW1zKSB7XG4gICAgdXJsICs9ICh1cmwuaW5kZXhPZignPycpID09PSAtMSA/ICc/JyA6ICcmJykgKyBzZXJpYWxpemVkUGFyYW1zO1xuICB9XG5cbiAgcmV0dXJuIHVybDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBVUkwgYnkgY29tYmluaW5nIHRoZSBzcGVjaWZpZWQgVVJMc1xuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlVVJMIFRoZSBiYXNlIFVSTFxuICogQHBhcmFtIHtzdHJpbmd9IHJlbGF0aXZlVVJMIFRoZSByZWxhdGl2ZSBVUkxcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBjb21iaW5lZCBVUkxcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBjb21iaW5lVVJMcyhiYXNlVVJMLCByZWxhdGl2ZVVSTCkge1xuICByZXR1cm4gcmVsYXRpdmVVUkxcbiAgICA/IGJhc2VVUkwucmVwbGFjZSgvXFwvKyQvLCAnJykgKyAnLycgKyByZWxhdGl2ZVVSTC5yZXBsYWNlKC9eXFwvKy8sICcnKVxuICAgIDogYmFzZVVSTDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoXG4gIHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkgP1xuXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBzdXBwb3J0IGRvY3VtZW50LmNvb2tpZVxuICAoZnVuY3Rpb24gc3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiB7XG4gICAgICB3cml0ZTogZnVuY3Rpb24gd3JpdGUobmFtZSwgdmFsdWUsIGV4cGlyZXMsIHBhdGgsIGRvbWFpbiwgc2VjdXJlKSB7XG4gICAgICAgIHZhciBjb29raWUgPSBbXTtcbiAgICAgICAgY29va2llLnB1c2gobmFtZSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSkpO1xuXG4gICAgICAgIGlmICh1dGlscy5pc051bWJlcihleHBpcmVzKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdleHBpcmVzPScgKyBuZXcgRGF0ZShleHBpcmVzKS50b0dNVFN0cmluZygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhwYXRoKSkge1xuICAgICAgICAgIGNvb2tpZS5wdXNoKCdwYXRoPScgKyBwYXRoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh1dGlscy5pc1N0cmluZyhkb21haW4pKSB7XG4gICAgICAgICAgY29va2llLnB1c2goJ2RvbWFpbj0nICsgZG9tYWluKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzZWN1cmUgPT09IHRydWUpIHtcbiAgICAgICAgICBjb29raWUucHVzaCgnc2VjdXJlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBkb2N1bWVudC5jb29raWUgPSBjb29raWUuam9pbignOyAnKTtcbiAgICAgIH0sXG5cbiAgICAgIHJlYWQ6IGZ1bmN0aW9uIHJlYWQobmFtZSkge1xuICAgICAgICB2YXIgbWF0Y2ggPSBkb2N1bWVudC5jb29raWUubWF0Y2gobmV3IFJlZ0V4cCgnKF58O1xcXFxzKikoJyArIG5hbWUgKyAnKT0oW147XSopJykpO1xuICAgICAgICByZXR1cm4gKG1hdGNoID8gZGVjb2RlVVJJQ29tcG9uZW50KG1hdGNoWzNdKSA6IG51bGwpO1xuICAgICAgfSxcblxuICAgICAgcmVtb3ZlOiBmdW5jdGlvbiByZW1vdmUobmFtZSkge1xuICAgICAgICB0aGlzLndyaXRlKG5hbWUsICcnLCBEYXRlLm5vdygpIC0gODY0MDAwMDApO1xuICAgICAgfVxuICAgIH07XG4gIH0pKCkgOlxuXG4gIC8vIE5vbiBzdGFuZGFyZCBicm93c2VyIGVudiAod2ViIHdvcmtlcnMsIHJlYWN0LW5hdGl2ZSkgbGFjayBuZWVkZWQgc3VwcG9ydC5cbiAgKGZ1bmN0aW9uIG5vblN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICByZXR1cm4ge1xuICAgICAgd3JpdGU6IGZ1bmN0aW9uIHdyaXRlKCkge30sXG4gICAgICByZWFkOiBmdW5jdGlvbiByZWFkKCkgeyByZXR1cm4gbnVsbDsgfSxcbiAgICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge31cbiAgICB9O1xuICB9KSgpXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIERldGVybWluZXMgd2hldGhlciB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZVxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB1cmwgVGhlIFVSTCB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgc3BlY2lmaWVkIFVSTCBpcyBhYnNvbHV0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNBYnNvbHV0ZVVSTCh1cmwpIHtcbiAgLy8gQSBVUkwgaXMgY29uc2lkZXJlZCBhYnNvbHV0ZSBpZiBpdCBiZWdpbnMgd2l0aCBcIjxzY2hlbWU+Oi8vXCIgb3IgXCIvL1wiIChwcm90b2NvbC1yZWxhdGl2ZSBVUkwpLlxuICAvLyBSRkMgMzk4NiBkZWZpbmVzIHNjaGVtZSBuYW1lIGFzIGEgc2VxdWVuY2Ugb2YgY2hhcmFjdGVycyBiZWdpbm5pbmcgd2l0aCBhIGxldHRlciBhbmQgZm9sbG93ZWRcbiAgLy8gYnkgYW55IGNvbWJpbmF0aW9uIG9mIGxldHRlcnMsIGRpZ2l0cywgcGx1cywgcGVyaW9kLCBvciBoeXBoZW4uXG4gIHJldHVybiAvXihbYS16XVthLXpcXGRcXCtcXC1cXC5dKjopP1xcL1xcLy9pLnRlc3QodXJsKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vLi4vdXRpbHMnKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoXG4gIHV0aWxzLmlzU3RhbmRhcmRCcm93c2VyRW52KCkgP1xuXG4gIC8vIFN0YW5kYXJkIGJyb3dzZXIgZW52cyBoYXZlIGZ1bGwgc3VwcG9ydCBvZiB0aGUgQVBJcyBuZWVkZWQgdG8gdGVzdFxuICAvLyB3aGV0aGVyIHRoZSByZXF1ZXN0IFVSTCBpcyBvZiB0aGUgc2FtZSBvcmlnaW4gYXMgY3VycmVudCBsb2NhdGlvbi5cbiAgKGZ1bmN0aW9uIHN0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgICB2YXIgbXNpZSA9IC8obXNpZXx0cmlkZW50KS9pLnRlc3QobmF2aWdhdG9yLnVzZXJBZ2VudCk7XG4gICAgdmFyIHVybFBhcnNpbmdOb2RlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgIHZhciBvcmlnaW5VUkw7XG5cbiAgICAvKipcbiAgICAqIFBhcnNlIGEgVVJMIHRvIGRpc2NvdmVyIGl0J3MgY29tcG9uZW50c1xuICAgICpcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSB1cmwgVGhlIFVSTCB0byBiZSBwYXJzZWRcbiAgICAqIEByZXR1cm5zIHtPYmplY3R9XG4gICAgKi9cbiAgICBmdW5jdGlvbiByZXNvbHZlVVJMKHVybCkge1xuICAgICAgdmFyIGhyZWYgPSB1cmw7XG5cbiAgICAgIGlmIChtc2llKSB7XG4gICAgICAgIC8vIElFIG5lZWRzIGF0dHJpYnV0ZSBzZXQgdHdpY2UgdG8gbm9ybWFsaXplIHByb3BlcnRpZXNcbiAgICAgICAgdXJsUGFyc2luZ05vZGUuc2V0QXR0cmlidXRlKCdocmVmJywgaHJlZik7XG4gICAgICAgIGhyZWYgPSB1cmxQYXJzaW5nTm9kZS5ocmVmO1xuICAgICAgfVxuXG4gICAgICB1cmxQYXJzaW5nTm9kZS5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCBocmVmKTtcblxuICAgICAgLy8gdXJsUGFyc2luZ05vZGUgcHJvdmlkZXMgdGhlIFVybFV0aWxzIGludGVyZmFjZSAtIGh0dHA6Ly91cmwuc3BlYy53aGF0d2cub3JnLyN1cmx1dGlsc1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaHJlZjogdXJsUGFyc2luZ05vZGUuaHJlZixcbiAgICAgICAgcHJvdG9jb2w6IHVybFBhcnNpbmdOb2RlLnByb3RvY29sID8gdXJsUGFyc2luZ05vZGUucHJvdG9jb2wucmVwbGFjZSgvOiQvLCAnJykgOiAnJyxcbiAgICAgICAgaG9zdDogdXJsUGFyc2luZ05vZGUuaG9zdCxcbiAgICAgICAgc2VhcmNoOiB1cmxQYXJzaW5nTm9kZS5zZWFyY2ggPyB1cmxQYXJzaW5nTm9kZS5zZWFyY2gucmVwbGFjZSgvXlxcPy8sICcnKSA6ICcnLFxuICAgICAgICBoYXNoOiB1cmxQYXJzaW5nTm9kZS5oYXNoID8gdXJsUGFyc2luZ05vZGUuaGFzaC5yZXBsYWNlKC9eIy8sICcnKSA6ICcnLFxuICAgICAgICBob3N0bmFtZTogdXJsUGFyc2luZ05vZGUuaG9zdG5hbWUsXG4gICAgICAgIHBvcnQ6IHVybFBhcnNpbmdOb2RlLnBvcnQsXG4gICAgICAgIHBhdGhuYW1lOiAodXJsUGFyc2luZ05vZGUucGF0aG5hbWUuY2hhckF0KDApID09PSAnLycpID9cbiAgICAgICAgICAgICAgICAgIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lIDpcbiAgICAgICAgICAgICAgICAgICcvJyArIHVybFBhcnNpbmdOb2RlLnBhdGhuYW1lXG4gICAgICB9O1xuICAgIH1cblxuICAgIG9yaWdpblVSTCA9IHJlc29sdmVVUkwod2luZG93LmxvY2F0aW9uLmhyZWYpO1xuXG4gICAgLyoqXG4gICAgKiBEZXRlcm1pbmUgaWYgYSBVUkwgc2hhcmVzIHRoZSBzYW1lIG9yaWdpbiBhcyB0aGUgY3VycmVudCBsb2NhdGlvblxuICAgICpcbiAgICAqIEBwYXJhbSB7U3RyaW5nfSByZXF1ZXN0VVJMIFRoZSBVUkwgdG8gdGVzdFxuICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgVVJMIHNoYXJlcyB0aGUgc2FtZSBvcmlnaW4sIG90aGVyd2lzZSBmYWxzZVxuICAgICovXG4gICAgcmV0dXJuIGZ1bmN0aW9uIGlzVVJMU2FtZU9yaWdpbihyZXF1ZXN0VVJMKSB7XG4gICAgICB2YXIgcGFyc2VkID0gKHV0aWxzLmlzU3RyaW5nKHJlcXVlc3RVUkwpKSA/IHJlc29sdmVVUkwocmVxdWVzdFVSTCkgOiByZXF1ZXN0VVJMO1xuICAgICAgcmV0dXJuIChwYXJzZWQucHJvdG9jb2wgPT09IG9yaWdpblVSTC5wcm90b2NvbCAmJlxuICAgICAgICAgICAgcGFyc2VkLmhvc3QgPT09IG9yaWdpblVSTC5ob3N0KTtcbiAgICB9O1xuICB9KSgpIDpcblxuICAvLyBOb24gc3RhbmRhcmQgYnJvd3NlciBlbnZzICh3ZWIgd29ya2VycywgcmVhY3QtbmF0aXZlKSBsYWNrIG5lZWRlZCBzdXBwb3J0LlxuICAoZnVuY3Rpb24gbm9uU3RhbmRhcmRCcm93c2VyRW52KCkge1xuICAgIHJldHVybiBmdW5jdGlvbiBpc1VSTFNhbWVPcmlnaW4oKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICB9KSgpXG4pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIG5vcm1hbGl6ZUhlYWRlck5hbWUoaGVhZGVycywgbm9ybWFsaXplZE5hbWUpIHtcbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLCBmdW5jdGlvbiBwcm9jZXNzSGVhZGVyKHZhbHVlLCBuYW1lKSB7XG4gICAgaWYgKG5hbWUgIT09IG5vcm1hbGl6ZWROYW1lICYmIG5hbWUudG9VcHBlckNhc2UoKSA9PT0gbm9ybWFsaXplZE5hbWUudG9VcHBlckNhc2UoKSkge1xuICAgICAgaGVhZGVyc1tub3JtYWxpemVkTmFtZV0gPSB2YWx1ZTtcbiAgICAgIGRlbGV0ZSBoZWFkZXJzW25hbWVdO1xuICAgIH1cbiAgfSk7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCcuLy4uL3V0aWxzJyk7XG5cbi8vIEhlYWRlcnMgd2hvc2UgZHVwbGljYXRlcyBhcmUgaWdub3JlZCBieSBub2RlXG4vLyBjLmYuIGh0dHBzOi8vbm9kZWpzLm9yZy9hcGkvaHR0cC5odG1sI2h0dHBfbWVzc2FnZV9oZWFkZXJzXG52YXIgaWdub3JlRHVwbGljYXRlT2YgPSBbXG4gICdhZ2UnLCAnYXV0aG9yaXphdGlvbicsICdjb250ZW50LWxlbmd0aCcsICdjb250ZW50LXR5cGUnLCAnZXRhZycsXG4gICdleHBpcmVzJywgJ2Zyb20nLCAnaG9zdCcsICdpZi1tb2RpZmllZC1zaW5jZScsICdpZi11bm1vZGlmaWVkLXNpbmNlJyxcbiAgJ2xhc3QtbW9kaWZpZWQnLCAnbG9jYXRpb24nLCAnbWF4LWZvcndhcmRzJywgJ3Byb3h5LWF1dGhvcml6YXRpb24nLFxuICAncmVmZXJlcicsICdyZXRyeS1hZnRlcicsICd1c2VyLWFnZW50J1xuXTtcblxuLyoqXG4gKiBQYXJzZSBoZWFkZXJzIGludG8gYW4gb2JqZWN0XG4gKlxuICogYGBgXG4gKiBEYXRlOiBXZWQsIDI3IEF1ZyAyMDE0IDA4OjU4OjQ5IEdNVFxuICogQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uXG4gKiBDb25uZWN0aW9uOiBrZWVwLWFsaXZlXG4gKiBUcmFuc2Zlci1FbmNvZGluZzogY2h1bmtlZFxuICogYGBgXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGhlYWRlcnMgSGVhZGVycyBuZWVkaW5nIHRvIGJlIHBhcnNlZFxuICogQHJldHVybnMge09iamVjdH0gSGVhZGVycyBwYXJzZWQgaW50byBhbiBvYmplY3RcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBwYXJzZUhlYWRlcnMoaGVhZGVycykge1xuICB2YXIgcGFyc2VkID0ge307XG4gIHZhciBrZXk7XG4gIHZhciB2YWw7XG4gIHZhciBpO1xuXG4gIGlmICghaGVhZGVycykgeyByZXR1cm4gcGFyc2VkOyB9XG5cbiAgdXRpbHMuZm9yRWFjaChoZWFkZXJzLnNwbGl0KCdcXG4nKSwgZnVuY3Rpb24gcGFyc2VyKGxpbmUpIHtcbiAgICBpID0gbGluZS5pbmRleE9mKCc6Jyk7XG4gICAga2V5ID0gdXRpbHMudHJpbShsaW5lLnN1YnN0cigwLCBpKSkudG9Mb3dlckNhc2UoKTtcbiAgICB2YWwgPSB1dGlscy50cmltKGxpbmUuc3Vic3RyKGkgKyAxKSk7XG5cbiAgICBpZiAoa2V5KSB7XG4gICAgICBpZiAocGFyc2VkW2tleV0gJiYgaWdub3JlRHVwbGljYXRlT2YuaW5kZXhPZihrZXkpID49IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGtleSA9PT0gJ3NldC1jb29raWUnKSB7XG4gICAgICAgIHBhcnNlZFtrZXldID0gKHBhcnNlZFtrZXldID8gcGFyc2VkW2tleV0gOiBbXSkuY29uY2F0KFt2YWxdKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhcnNlZFtrZXldID0gcGFyc2VkW2tleV0gPyBwYXJzZWRba2V5XSArICcsICcgKyB2YWwgOiB2YWw7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcGFyc2VkO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBTeW50YWN0aWMgc3VnYXIgZm9yIGludm9raW5nIGEgZnVuY3Rpb24gYW5kIGV4cGFuZGluZyBhbiBhcnJheSBmb3IgYXJndW1lbnRzLlxuICpcbiAqIENvbW1vbiB1c2UgY2FzZSB3b3VsZCBiZSB0byB1c2UgYEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseWAuXG4gKlxuICogIGBgYGpzXG4gKiAgZnVuY3Rpb24gZih4LCB5LCB6KSB7fVxuICogIHZhciBhcmdzID0gWzEsIDIsIDNdO1xuICogIGYuYXBwbHkobnVsbCwgYXJncyk7XG4gKiAgYGBgXG4gKlxuICogV2l0aCBgc3ByZWFkYCB0aGlzIGV4YW1wbGUgY2FuIGJlIHJlLXdyaXR0ZW4uXG4gKlxuICogIGBgYGpzXG4gKiAgc3ByZWFkKGZ1bmN0aW9uKHgsIHksIHopIHt9KShbMSwgMiwgM10pO1xuICogIGBgYFxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc3ByZWFkKGNhbGxiYWNrKSB7XG4gIHJldHVybiBmdW5jdGlvbiB3cmFwKGFycikge1xuICAgIHJldHVybiBjYWxsYmFjay5hcHBseShudWxsLCBhcnIpO1xuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmQgPSByZXF1aXJlKCcuL2hlbHBlcnMvYmluZCcpO1xudmFyIGlzQnVmZmVyID0gcmVxdWlyZSgnaXMtYnVmZmVyJyk7XG5cbi8qZ2xvYmFsIHRvU3RyaW5nOnRydWUqL1xuXG4vLyB1dGlscyBpcyBhIGxpYnJhcnkgb2YgZ2VuZXJpYyBoZWxwZXIgZnVuY3Rpb25zIG5vbi1zcGVjaWZpYyB0byBheGlvc1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5XG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gQXJyYXksIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5KHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIEFycmF5QnVmZmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYW4gQXJyYXlCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyKHZhbCkge1xuICByZXR1cm4gdG9TdHJpbmcuY2FsbCh2YWwpID09PSAnW29iamVjdCBBcnJheUJ1ZmZlcl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRm9ybURhdGFcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhbiBGb3JtRGF0YSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRm9ybURhdGEodmFsKSB7XG4gIHJldHVybiAodHlwZW9mIEZvcm1EYXRhICE9PSAndW5kZWZpbmVkJykgJiYgKHZhbCBpbnN0YW5jZW9mIEZvcm1EYXRhKTtcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIHZpZXcgb24gYW4gQXJyYXlCdWZmZXJcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIHZpZXcgb24gYW4gQXJyYXlCdWZmZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc0FycmF5QnVmZmVyVmlldyh2YWwpIHtcbiAgdmFyIHJlc3VsdDtcbiAgaWYgKCh0eXBlb2YgQXJyYXlCdWZmZXIgIT09ICd1bmRlZmluZWQnKSAmJiAoQXJyYXlCdWZmZXIuaXNWaWV3KSkge1xuICAgIHJlc3VsdCA9IEFycmF5QnVmZmVyLmlzVmlldyh2YWwpO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdCA9ICh2YWwpICYmICh2YWwuYnVmZmVyKSAmJiAodmFsLmJ1ZmZlciBpbnN0YW5jZW9mIEFycmF5QnVmZmVyKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgU3RyaW5nXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBTdHJpbmcsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1N0cmluZyh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgTnVtYmVyXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbCBUaGUgdmFsdWUgdG8gdGVzdFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdmFsdWUgaXMgYSBOdW1iZXIsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc051bWJlcih2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdudW1iZXInO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIHVuZGVmaW5lZFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHRoZSB2YWx1ZSBpcyB1bmRlZmluZWQsIG90aGVyd2lzZSBmYWxzZVxuICovXG5mdW5jdGlvbiBpc1VuZGVmaW5lZCh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICd1bmRlZmluZWQnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGFuIE9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGFuIE9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzT2JqZWN0KHZhbCkge1xuICByZXR1cm4gdmFsICE9PSBudWxsICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRGF0ZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRGF0ZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRGF0ZSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRmlsZVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgRmlsZSwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzRmlsZSh2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRmlsZV0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgQmxvYlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgQmxvYiwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzQmxvYih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgQmxvYl0nO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgRnVuY3Rpb25cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gdmFsIFRoZSB2YWx1ZSB0byB0ZXN0XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB2YWx1ZSBpcyBhIEZ1bmN0aW9uLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNGdW5jdGlvbih2YWwpIHtcbiAgcmV0dXJuIHRvU3RyaW5nLmNhbGwodmFsKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YWx1ZSBpcyBhIFN0cmVhbVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgU3RyZWFtLCBvdGhlcndpc2UgZmFsc2VcbiAqL1xuZnVuY3Rpb24gaXNTdHJlYW0odmFsKSB7XG4gIHJldHVybiBpc09iamVjdCh2YWwpICYmIGlzRnVuY3Rpb24odmFsLnBpcGUpO1xufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBhIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWwgVGhlIHZhbHVlIHRvIHRlc3RcbiAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIHZhbHVlIGlzIGEgVVJMU2VhcmNoUGFyYW1zIG9iamVjdCwgb3RoZXJ3aXNlIGZhbHNlXG4gKi9cbmZ1bmN0aW9uIGlzVVJMU2VhcmNoUGFyYW1zKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIFVSTFNlYXJjaFBhcmFtcyAhPT0gJ3VuZGVmaW5lZCcgJiYgdmFsIGluc3RhbmNlb2YgVVJMU2VhcmNoUGFyYW1zO1xufVxuXG4vKipcbiAqIFRyaW0gZXhjZXNzIHdoaXRlc3BhY2Ugb2ZmIHRoZSBiZWdpbm5pbmcgYW5kIGVuZCBvZiBhIHN0cmluZ1xuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHIgVGhlIFN0cmluZyB0byB0cmltXG4gKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgU3RyaW5nIGZyZWVkIG9mIGV4Y2VzcyB3aGl0ZXNwYWNlXG4gKi9cbmZ1bmN0aW9uIHRyaW0oc3RyKSB7XG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyovLCAnJykucmVwbGFjZSgvXFxzKiQvLCAnJyk7XG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIHdlJ3JlIHJ1bm5pbmcgaW4gYSBzdGFuZGFyZCBicm93c2VyIGVudmlyb25tZW50XG4gKlxuICogVGhpcyBhbGxvd3MgYXhpb3MgdG8gcnVuIGluIGEgd2ViIHdvcmtlciwgYW5kIHJlYWN0LW5hdGl2ZS5cbiAqIEJvdGggZW52aXJvbm1lbnRzIHN1cHBvcnQgWE1MSHR0cFJlcXVlc3QsIGJ1dCBub3QgZnVsbHkgc3RhbmRhcmQgZ2xvYmFscy5cbiAqXG4gKiB3ZWIgd29ya2VyczpcbiAqICB0eXBlb2Ygd2luZG93IC0+IHVuZGVmaW5lZFxuICogIHR5cGVvZiBkb2N1bWVudCAtPiB1bmRlZmluZWRcbiAqXG4gKiByZWFjdC1uYXRpdmU6XG4gKiAgbmF2aWdhdG9yLnByb2R1Y3QgLT4gJ1JlYWN0TmF0aXZlJ1xuICovXG5mdW5jdGlvbiBpc1N0YW5kYXJkQnJvd3NlckVudigpIHtcbiAgaWYgKHR5cGVvZiBuYXZpZ2F0b3IgIT09ICd1bmRlZmluZWQnICYmIG5hdmlnYXRvci5wcm9kdWN0ID09PSAnUmVhY3ROYXRpdmUnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiAoXG4gICAgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICB0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnXG4gICk7XG59XG5cbi8qKlxuICogSXRlcmF0ZSBvdmVyIGFuIEFycmF5IG9yIGFuIE9iamVjdCBpbnZva2luZyBhIGZ1bmN0aW9uIGZvciBlYWNoIGl0ZW0uXG4gKlxuICogSWYgYG9iamAgaXMgYW4gQXJyYXkgY2FsbGJhY2sgd2lsbCBiZSBjYWxsZWQgcGFzc2luZ1xuICogdGhlIHZhbHVlLCBpbmRleCwgYW5kIGNvbXBsZXRlIGFycmF5IGZvciBlYWNoIGl0ZW0uXG4gKlxuICogSWYgJ29iaicgaXMgYW4gT2JqZWN0IGNhbGxiYWNrIHdpbGwgYmUgY2FsbGVkIHBhc3NpbmdcbiAqIHRoZSB2YWx1ZSwga2V5LCBhbmQgY29tcGxldGUgb2JqZWN0IGZvciBlYWNoIHByb3BlcnR5LlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fEFycmF5fSBvYmogVGhlIG9iamVjdCB0byBpdGVyYXRlXG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmbiBUaGUgY2FsbGJhY2sgdG8gaW52b2tlIGZvciBlYWNoIGl0ZW1cbiAqL1xuZnVuY3Rpb24gZm9yRWFjaChvYmosIGZuKSB7XG4gIC8vIERvbid0IGJvdGhlciBpZiBubyB2YWx1ZSBwcm92aWRlZFxuICBpZiAob2JqID09PSBudWxsIHx8IHR5cGVvZiBvYmogPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgLy8gRm9yY2UgYW4gYXJyYXkgaWYgbm90IGFscmVhZHkgc29tZXRoaW5nIGl0ZXJhYmxlXG4gIGlmICh0eXBlb2Ygb2JqICE9PSAnb2JqZWN0Jykge1xuICAgIC8qZXNsaW50IG5vLXBhcmFtLXJlYXNzaWduOjAqL1xuICAgIG9iaiA9IFtvYmpdO1xuICB9XG5cbiAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgIC8vIEl0ZXJhdGUgb3ZlciBhcnJheSB2YWx1ZXNcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IG9iai5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIGZuLmNhbGwobnVsbCwgb2JqW2ldLCBpLCBvYmopO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBJdGVyYXRlIG92ZXIgb2JqZWN0IGtleXNcbiAgICBmb3IgKHZhciBrZXkgaW4gb2JqKSB7XG4gICAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkge1xuICAgICAgICBmbi5jYWxsKG51bGwsIG9ialtrZXldLCBrZXksIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogQWNjZXB0cyB2YXJhcmdzIGV4cGVjdGluZyBlYWNoIGFyZ3VtZW50IHRvIGJlIGFuIG9iamVjdCwgdGhlblxuICogaW1tdXRhYmx5IG1lcmdlcyB0aGUgcHJvcGVydGllcyBvZiBlYWNoIG9iamVjdCBhbmQgcmV0dXJucyByZXN1bHQuXG4gKlxuICogV2hlbiBtdWx0aXBsZSBvYmplY3RzIGNvbnRhaW4gdGhlIHNhbWUga2V5IHRoZSBsYXRlciBvYmplY3QgaW5cbiAqIHRoZSBhcmd1bWVudHMgbGlzdCB3aWxsIHRha2UgcHJlY2VkZW5jZS5cbiAqXG4gKiBFeGFtcGxlOlxuICpcbiAqIGBgYGpzXG4gKiB2YXIgcmVzdWx0ID0gbWVyZ2Uoe2ZvbzogMTIzfSwge2ZvbzogNDU2fSk7XG4gKiBjb25zb2xlLmxvZyhyZXN1bHQuZm9vKTsgLy8gb3V0cHV0cyA0NTZcbiAqIGBgYFxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmoxIE9iamVjdCB0byBtZXJnZVxuICogQHJldHVybnMge09iamVjdH0gUmVzdWx0IG9mIGFsbCBtZXJnZSBwcm9wZXJ0aWVzXG4gKi9cbmZ1bmN0aW9uIG1lcmdlKC8qIG9iajEsIG9iajIsIG9iajMsIC4uLiAqLykge1xuICB2YXIgcmVzdWx0ID0ge307XG4gIGZ1bmN0aW9uIGFzc2lnblZhbHVlKHZhbCwga2V5KSB7XG4gICAgaWYgKHR5cGVvZiByZXN1bHRba2V5XSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIHZhbCA9PT0gJ29iamVjdCcpIHtcbiAgICAgIHJlc3VsdFtrZXldID0gbWVyZ2UocmVzdWx0W2tleV0sIHZhbCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdFtrZXldID0gdmFsO1xuICAgIH1cbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwLCBsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGZvckVhY2goYXJndW1lbnRzW2ldLCBhc3NpZ25WYWx1ZSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLyoqXG4gKiBFeHRlbmRzIG9iamVjdCBhIGJ5IG11dGFibHkgYWRkaW5nIHRvIGl0IHRoZSBwcm9wZXJ0aWVzIG9mIG9iamVjdCBiLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhIFRoZSBvYmplY3QgdG8gYmUgZXh0ZW5kZWRcbiAqIEBwYXJhbSB7T2JqZWN0fSBiIFRoZSBvYmplY3QgdG8gY29weSBwcm9wZXJ0aWVzIGZyb21cbiAqIEBwYXJhbSB7T2JqZWN0fSB0aGlzQXJnIFRoZSBvYmplY3QgdG8gYmluZCBmdW5jdGlvbiB0b1xuICogQHJldHVybiB7T2JqZWN0fSBUaGUgcmVzdWx0aW5nIHZhbHVlIG9mIG9iamVjdCBhXG4gKi9cbmZ1bmN0aW9uIGV4dGVuZChhLCBiLCB0aGlzQXJnKSB7XG4gIGZvckVhY2goYiwgZnVuY3Rpb24gYXNzaWduVmFsdWUodmFsLCBrZXkpIHtcbiAgICBpZiAodGhpc0FyZyAmJiB0eXBlb2YgdmFsID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBhW2tleV0gPSBiaW5kKHZhbCwgdGhpc0FyZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGFba2V5XSA9IHZhbDtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gYTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlzQXJyYXk6IGlzQXJyYXksXG4gIGlzQXJyYXlCdWZmZXI6IGlzQXJyYXlCdWZmZXIsXG4gIGlzQnVmZmVyOiBpc0J1ZmZlcixcbiAgaXNGb3JtRGF0YTogaXNGb3JtRGF0YSxcbiAgaXNBcnJheUJ1ZmZlclZpZXc6IGlzQXJyYXlCdWZmZXJWaWV3LFxuICBpc1N0cmluZzogaXNTdHJpbmcsXG4gIGlzTnVtYmVyOiBpc051bWJlcixcbiAgaXNPYmplY3Q6IGlzT2JqZWN0LFxuICBpc1VuZGVmaW5lZDogaXNVbmRlZmluZWQsXG4gIGlzRGF0ZTogaXNEYXRlLFxuICBpc0ZpbGU6IGlzRmlsZSxcbiAgaXNCbG9iOiBpc0Jsb2IsXG4gIGlzRnVuY3Rpb246IGlzRnVuY3Rpb24sXG4gIGlzU3RyZWFtOiBpc1N0cmVhbSxcbiAgaXNVUkxTZWFyY2hQYXJhbXM6IGlzVVJMU2VhcmNoUGFyYW1zLFxuICBpc1N0YW5kYXJkQnJvd3NlckVudjogaXNTdGFuZGFyZEJyb3dzZXJFbnYsXG4gIGZvckVhY2g6IGZvckVhY2gsXG4gIG1lcmdlOiBtZXJnZSxcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIHRyaW06IHRyaW1cbn07XG4iLCIvLyBnZXQgc3VjY2Vzc2Z1bCBjb250cm9sIGZyb20gZm9ybSBhbmQgYXNzZW1ibGUgaW50byBvYmplY3Rcbi8vIGh0dHA6Ly93d3cudzMub3JnL1RSL2h0bWw0MDEvaW50ZXJhY3QvZm9ybXMuaHRtbCNoLTE3LjEzLjJcblxuLy8gdHlwZXMgd2hpY2ggaW5kaWNhdGUgYSBzdWJtaXQgYWN0aW9uIGFuZCBhcmUgbm90IHN1Y2Nlc3NmdWwgY29udHJvbHNcbi8vIHRoZXNlIHdpbGwgYmUgaWdub3JlZFxudmFyIGtfcl9zdWJtaXR0ZXIgPSAvXig/OnN1Ym1pdHxidXR0b258aW1hZ2V8cmVzZXR8ZmlsZSkkL2k7XG5cbi8vIG5vZGUgbmFtZXMgd2hpY2ggY291bGQgYmUgc3VjY2Vzc2Z1bCBjb250cm9sc1xudmFyIGtfcl9zdWNjZXNzX2NvbnRybHMgPSAvXig/OmlucHV0fHNlbGVjdHx0ZXh0YXJlYXxrZXlnZW4pL2k7XG5cbi8vIE1hdGNoZXMgYnJhY2tldCBub3RhdGlvbi5cbnZhciBicmFja2V0cyA9IC8oXFxbW15cXFtcXF1dKlxcXSkvZztcblxuLy8gc2VyaWFsaXplcyBmb3JtIGZpZWxkc1xuLy8gQHBhcmFtIGZvcm0gTVVTVCBiZSBhbiBIVE1MRm9ybSBlbGVtZW50XG4vLyBAcGFyYW0gb3B0aW9ucyBpcyBhbiBvcHRpb25hbCBhcmd1bWVudCB0byBjb25maWd1cmUgdGhlIHNlcmlhbGl6YXRpb24uIERlZmF1bHQgb3V0cHV0XG4vLyB3aXRoIG5vIG9wdGlvbnMgc3BlY2lmaWVkIGlzIGEgdXJsIGVuY29kZWQgc3RyaW5nXG4vLyAgICAtIGhhc2g6IFt0cnVlIHwgZmFsc2VdIENvbmZpZ3VyZSB0aGUgb3V0cHV0IHR5cGUuIElmIHRydWUsIHRoZSBvdXRwdXQgd2lsbFxuLy8gICAgYmUgYSBqcyBvYmplY3QuXG4vLyAgICAtIHNlcmlhbGl6ZXI6IFtmdW5jdGlvbl0gT3B0aW9uYWwgc2VyaWFsaXplciBmdW5jdGlvbiB0byBvdmVycmlkZSB0aGUgZGVmYXVsdCBvbmUuXG4vLyAgICBUaGUgZnVuY3Rpb24gdGFrZXMgMyBhcmd1bWVudHMgKHJlc3VsdCwga2V5LCB2YWx1ZSkgYW5kIHNob3VsZCByZXR1cm4gbmV3IHJlc3VsdFxuLy8gICAgaGFzaCBhbmQgdXJsIGVuY29kZWQgc3RyIHNlcmlhbGl6ZXJzIGFyZSBwcm92aWRlZCB3aXRoIHRoaXMgbW9kdWxlXG4vLyAgICAtIGRpc2FibGVkOiBbdHJ1ZSB8IGZhbHNlXS4gSWYgdHJ1ZSBzZXJpYWxpemUgZGlzYWJsZWQgZmllbGRzLlxuLy8gICAgLSBlbXB0eTogW3RydWUgfCBmYWxzZV0uIElmIHRydWUgc2VyaWFsaXplIGVtcHR5IGZpZWxkc1xuZnVuY3Rpb24gc2VyaWFsaXplKGZvcm0sIG9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT0gJ29iamVjdCcpIHtcbiAgICAgICAgb3B0aW9ucyA9IHsgaGFzaDogISFvcHRpb25zIH07XG4gICAgfVxuICAgIGVsc2UgaWYgKG9wdGlvbnMuaGFzaCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdGlvbnMuaGFzaCA9IHRydWU7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IChvcHRpb25zLmhhc2gpID8ge30gOiAnJztcbiAgICB2YXIgc2VyaWFsaXplciA9IG9wdGlvbnMuc2VyaWFsaXplciB8fCAoKG9wdGlvbnMuaGFzaCkgPyBoYXNoX3NlcmlhbGl6ZXIgOiBzdHJfc2VyaWFsaXplKTtcblxuICAgIHZhciBlbGVtZW50cyA9IGZvcm0gJiYgZm9ybS5lbGVtZW50cyA/IGZvcm0uZWxlbWVudHMgOiBbXTtcblxuICAgIC8vT2JqZWN0IHN0b3JlIGVhY2ggcmFkaW8gYW5kIHNldCBpZiBpdCdzIGVtcHR5IG9yIG5vdFxuICAgIHZhciByYWRpb19zdG9yZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG5cbiAgICBmb3IgKHZhciBpPTAgOyBpPGVsZW1lbnRzLmxlbmd0aCA7ICsraSkge1xuICAgICAgICB2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2ldO1xuXG4gICAgICAgIC8vIGluZ29yZSBkaXNhYmxlZCBmaWVsZHNcbiAgICAgICAgaWYgKCghb3B0aW9ucy5kaXNhYmxlZCAmJiBlbGVtZW50LmRpc2FibGVkKSB8fCAhZWxlbWVudC5uYW1lKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBpZ25vcmUgYW55aHRpbmcgdGhhdCBpcyBub3QgY29uc2lkZXJlZCBhIHN1Y2Nlc3MgZmllbGRcbiAgICAgICAgaWYgKCFrX3Jfc3VjY2Vzc19jb250cmxzLnRlc3QoZWxlbWVudC5ub2RlTmFtZSkgfHxcbiAgICAgICAgICAgIGtfcl9zdWJtaXR0ZXIudGVzdChlbGVtZW50LnR5cGUpKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBrZXkgPSBlbGVtZW50Lm5hbWU7XG4gICAgICAgIHZhciB2YWwgPSBlbGVtZW50LnZhbHVlO1xuXG4gICAgICAgIC8vIHdlIGNhbid0IGp1c3QgdXNlIGVsZW1lbnQudmFsdWUgZm9yIGNoZWNrYm94ZXMgY2F1c2Ugc29tZSBicm93c2VycyBsaWUgdG8gdXNcbiAgICAgICAgLy8gdGhleSBzYXkgXCJvblwiIGZvciB2YWx1ZSB3aGVuIHRoZSBib3ggaXNuJ3QgY2hlY2tlZFxuICAgICAgICBpZiAoKGVsZW1lbnQudHlwZSA9PT0gJ2NoZWNrYm94JyB8fCBlbGVtZW50LnR5cGUgPT09ICdyYWRpbycpICYmICFlbGVtZW50LmNoZWNrZWQpIHtcbiAgICAgICAgICAgIHZhbCA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHdlIHdhbnQgZW1wdHkgZWxlbWVudHNcbiAgICAgICAgaWYgKG9wdGlvbnMuZW1wdHkpIHtcbiAgICAgICAgICAgIC8vIGZvciBjaGVja2JveFxuICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PT0gJ2NoZWNrYm94JyAmJiAhZWxlbWVudC5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgdmFsID0gJyc7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGZvciByYWRpb1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PT0gJ3JhZGlvJykge1xuICAgICAgICAgICAgICAgIGlmICghcmFkaW9fc3RvcmVbZWxlbWVudC5uYW1lXSAmJiAhZWxlbWVudC5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJhZGlvX3N0b3JlW2VsZW1lbnQubmFtZV0gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZWxlbWVudC5jaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJhZGlvX3N0b3JlW2VsZW1lbnQubmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gaWYgb3B0aW9ucyBlbXB0eSBpcyB0cnVlLCBjb250aW51ZSBvbmx5IGlmIGl0cyByYWRpb1xuICAgICAgICAgICAgaWYgKHZhbCA9PSB1bmRlZmluZWQgJiYgZWxlbWVudC50eXBlID09ICdyYWRpbycpIHtcbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIC8vIHZhbHVlLWxlc3MgZmllbGRzIGFyZSBpZ25vcmVkIHVubGVzcyBvcHRpb25zLmVtcHR5IGlzIHRydWVcbiAgICAgICAgICAgIGlmICghdmFsKSB7XG4gICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBtdWx0aSBzZWxlY3QgYm94ZXNcbiAgICAgICAgaWYgKGVsZW1lbnQudHlwZSA9PT0gJ3NlbGVjdC1tdWx0aXBsZScpIHtcbiAgICAgICAgICAgIHZhbCA9IFtdO1xuXG4gICAgICAgICAgICB2YXIgc2VsZWN0T3B0aW9ucyA9IGVsZW1lbnQub3B0aW9ucztcbiAgICAgICAgICAgIHZhciBpc1NlbGVjdGVkT3B0aW9ucyA9IGZhbHNlO1xuICAgICAgICAgICAgZm9yICh2YXIgaj0wIDsgajxzZWxlY3RPcHRpb25zLmxlbmd0aCA7ICsraikge1xuICAgICAgICAgICAgICAgIHZhciBvcHRpb24gPSBzZWxlY3RPcHRpb25zW2pdO1xuICAgICAgICAgICAgICAgIHZhciBhbGxvd2VkRW1wdHkgPSBvcHRpb25zLmVtcHR5ICYmICFvcHRpb24udmFsdWU7XG4gICAgICAgICAgICAgICAgdmFyIGhhc1ZhbHVlID0gKG9wdGlvbi52YWx1ZSB8fCBhbGxvd2VkRW1wdHkpO1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb24uc2VsZWN0ZWQgJiYgaGFzVmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgaXNTZWxlY3RlZE9wdGlvbnMgPSB0cnVlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIElmIHVzaW5nIGEgaGFzaCBzZXJpYWxpemVyIGJlIHN1cmUgdG8gYWRkIHRoZVxuICAgICAgICAgICAgICAgICAgICAvLyBjb3JyZWN0IG5vdGF0aW9uIGZvciBhbiBhcnJheSBpbiB0aGUgbXVsdGktc2VsZWN0XG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnRleHQuIEhlcmUgdGhlIG5hbWUgYXR0cmlidXRlIG9uIHRoZSBzZWxlY3QgZWxlbWVudFxuICAgICAgICAgICAgICAgICAgICAvLyBtaWdodCBiZSBtaXNzaW5nIHRoZSB0cmFpbGluZyBicmFja2V0IHBhaXIuIEJvdGggbmFtZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gXCJmb29cIiBhbmQgXCJmb29bXVwiIHNob3VsZCBiZSBhcnJheXMuXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmhhc2ggJiYga2V5LnNsaWNlKGtleS5sZW5ndGggLSAyKSAhPT0gJ1tdJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gc2VyaWFsaXplcihyZXN1bHQsIGtleSArICdbXScsIG9wdGlvbi52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBzZXJpYWxpemVyKHJlc3VsdCwga2V5LCBvcHRpb24udmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBTZXJpYWxpemUgaWYgbm8gc2VsZWN0ZWQgb3B0aW9ucyBhbmQgb3B0aW9ucy5lbXB0eSBpcyB0cnVlXG4gICAgICAgICAgICBpZiAoIWlzU2VsZWN0ZWRPcHRpb25zICYmIG9wdGlvbnMuZW1wdHkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBzZXJpYWxpemVyKHJlc3VsdCwga2V5LCAnJyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0ID0gc2VyaWFsaXplcihyZXN1bHQsIGtleSwgdmFsKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgYWxsIGVtcHR5IHJhZGlvIGJ1dHRvbnMgYW5kIHNlcmlhbGl6ZSB0aGVtIHdpdGgga2V5PVwiXCJcbiAgICBpZiAob3B0aW9ucy5lbXB0eSkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gcmFkaW9fc3RvcmUpIHtcbiAgICAgICAgICAgIGlmICghcmFkaW9fc3RvcmVba2V5XSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHNlcmlhbGl6ZXIocmVzdWx0LCBrZXksICcnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIHBhcnNlX2tleXMoc3RyaW5nKSB7XG4gICAgdmFyIGtleXMgPSBbXTtcbiAgICB2YXIgcHJlZml4ID0gL14oW15cXFtcXF1dKikvO1xuICAgIHZhciBjaGlsZHJlbiA9IG5ldyBSZWdFeHAoYnJhY2tldHMpO1xuICAgIHZhciBtYXRjaCA9IHByZWZpeC5leGVjKHN0cmluZyk7XG5cbiAgICBpZiAobWF0Y2hbMV0pIHtcbiAgICAgICAga2V5cy5wdXNoKG1hdGNoWzFdKTtcbiAgICB9XG5cbiAgICB3aGlsZSAoKG1hdGNoID0gY2hpbGRyZW4uZXhlYyhzdHJpbmcpKSAhPT0gbnVsbCkge1xuICAgICAgICBrZXlzLnB1c2gobWF0Y2hbMV0pO1xuICAgIH1cblxuICAgIHJldHVybiBrZXlzO1xufVxuXG5mdW5jdGlvbiBoYXNoX2Fzc2lnbihyZXN1bHQsIGtleXMsIHZhbHVlKSB7XG4gICAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJlc3VsdCA9IHZhbHVlO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHZhciBrZXkgPSBrZXlzLnNoaWZ0KCk7XG4gICAgdmFyIGJldHdlZW4gPSBrZXkubWF0Y2goL15cXFsoLis/KVxcXSQvKTtcblxuICAgIGlmIChrZXkgPT09ICdbXScpIHtcbiAgICAgICAgcmVzdWx0ID0gcmVzdWx0IHx8IFtdO1xuXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKGhhc2hfYXNzaWduKG51bGwsIGtleXMsIHZhbHVlKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAvLyBUaGlzIG1pZ2h0IGJlIHRoZSByZXN1bHQgb2YgYmFkIG5hbWUgYXR0cmlidXRlcyBsaWtlIFwiW11bZm9vXVwiLFxuICAgICAgICAgICAgLy8gaW4gdGhpcyBjYXNlIHRoZSBvcmlnaW5hbCBgcmVzdWx0YCBvYmplY3Qgd2lsbCBhbHJlYWR5IGJlXG4gICAgICAgICAgICAvLyBhc3NpZ25lZCB0byBhbiBvYmplY3QgbGl0ZXJhbC4gUmF0aGVyIHRoYW4gY29lcmNlIHRoZSBvYmplY3QgdG9cbiAgICAgICAgICAgIC8vIGFuIGFycmF5LCBvciBjYXVzZSBhbiBleGNlcHRpb24gdGhlIGF0dHJpYnV0ZSBcIl92YWx1ZXNcIiBpc1xuICAgICAgICAgICAgLy8gYXNzaWduZWQgYXMgYW4gYXJyYXkuXG4gICAgICAgICAgICByZXN1bHQuX3ZhbHVlcyA9IHJlc3VsdC5fdmFsdWVzIHx8IFtdO1xuICAgICAgICAgICAgcmVzdWx0Ll92YWx1ZXMucHVzaChoYXNoX2Fzc2lnbihudWxsLCBrZXlzLCB2YWx1ZSkpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICAvLyBLZXkgaXMgYW4gYXR0cmlidXRlIG5hbWUgYW5kIGNhbiBiZSBhc3NpZ25lZCBkaXJlY3RseS5cbiAgICBpZiAoIWJldHdlZW4pIHtcbiAgICAgICAgcmVzdWx0W2tleV0gPSBoYXNoX2Fzc2lnbihyZXN1bHRba2V5XSwga2V5cywgdmFsdWUpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdmFyIHN0cmluZyA9IGJldHdlZW5bMV07XG4gICAgICAgIC8vICt2YXIgY29udmVydHMgdGhlIHZhcmlhYmxlIGludG8gYSBudW1iZXJcbiAgICAgICAgLy8gYmV0dGVyIHRoYW4gcGFyc2VJbnQgYmVjYXVzZSBpdCBkb2Vzbid0IHRydW5jYXRlIGF3YXkgdHJhaWxpbmdcbiAgICAgICAgLy8gbGV0dGVycyBhbmQgYWN0dWFsbHkgZmFpbHMgaWYgd2hvbGUgdGhpbmcgaXMgbm90IGEgbnVtYmVyXG4gICAgICAgIHZhciBpbmRleCA9ICtzdHJpbmc7XG5cbiAgICAgICAgLy8gSWYgdGhlIGNoYXJhY3RlcnMgYmV0d2VlbiB0aGUgYnJhY2tldHMgaXMgbm90IGEgbnVtYmVyIGl0IGlzIGFuXG4gICAgICAgIC8vIGF0dHJpYnV0ZSBuYW1lIGFuZCBjYW4gYmUgYXNzaWduZWQgZGlyZWN0bHkuXG4gICAgICAgIGlmIChpc05hTihpbmRleCkpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdCB8fCB7fTtcbiAgICAgICAgICAgIHJlc3VsdFtzdHJpbmddID0gaGFzaF9hc3NpZ24ocmVzdWx0W3N0cmluZ10sIGtleXMsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdCB8fCBbXTtcbiAgICAgICAgICAgIHJlc3VsdFtpbmRleF0gPSBoYXNoX2Fzc2lnbihyZXN1bHRbaW5kZXhdLCBrZXlzLCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBPYmplY3QvaGFzaCBlbmNvZGluZyBzZXJpYWxpemVyLlxuZnVuY3Rpb24gaGFzaF9zZXJpYWxpemVyKHJlc3VsdCwga2V5LCB2YWx1ZSkge1xuICAgIHZhciBtYXRjaGVzID0ga2V5Lm1hdGNoKGJyYWNrZXRzKTtcblxuICAgIC8vIEhhcyBicmFja2V0cz8gVXNlIHRoZSByZWN1cnNpdmUgYXNzaWdubWVudCBmdW5jdGlvbiB0byB3YWxrIHRoZSBrZXlzLFxuICAgIC8vIGNvbnN0cnVjdCBhbnkgbWlzc2luZyBvYmplY3RzIGluIHRoZSByZXN1bHQgdHJlZSBhbmQgbWFrZSB0aGUgYXNzaWdubWVudFxuICAgIC8vIGF0IHRoZSBlbmQgb2YgdGhlIGNoYWluLlxuICAgIGlmIChtYXRjaGVzKSB7XG4gICAgICAgIHZhciBrZXlzID0gcGFyc2Vfa2V5cyhrZXkpO1xuICAgICAgICBoYXNoX2Fzc2lnbihyZXN1bHQsIGtleXMsIHZhbHVlKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAgIC8vIE5vbiBicmFja2V0IG5vdGF0aW9uIGNhbiBtYWtlIGFzc2lnbm1lbnRzIGRpcmVjdGx5LlxuICAgICAgICB2YXIgZXhpc3RpbmcgPSByZXN1bHRba2V5XTtcblxuICAgICAgICAvLyBJZiB0aGUgdmFsdWUgaGFzIGJlZW4gYXNzaWduZWQgYWxyZWFkeSAoZm9yIGluc3RhbmNlIHdoZW4gYSByYWRpbyBhbmRcbiAgICAgICAgLy8gYSBjaGVja2JveCBoYXZlIHRoZSBzYW1lIG5hbWUgYXR0cmlidXRlKSBjb252ZXJ0IHRoZSBwcmV2aW91cyB2YWx1ZVxuICAgICAgICAvLyBpbnRvIGFuIGFycmF5IGJlZm9yZSBwdXNoaW5nIGludG8gaXQuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIE5PVEU6IElmIHRoaXMgcmVxdWlyZW1lbnQgd2VyZSByZW1vdmVkIGFsbCBoYXNoIGNyZWF0aW9uIGFuZFxuICAgICAgICAvLyBhc3NpZ25tZW50IGNvdWxkIGdvIHRocm91Z2ggYGhhc2hfYXNzaWduYC5cbiAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkoZXhpc3RpbmcpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBbIGV4aXN0aW5nIF07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJlc3VsdFtrZXldLnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0W2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbi8vIHVybGZvcm0gZW5jb2Rpbmcgc2VyaWFsaXplclxuZnVuY3Rpb24gc3RyX3NlcmlhbGl6ZShyZXN1bHQsIGtleSwgdmFsdWUpIHtcbiAgICAvLyBlbmNvZGUgbmV3bGluZXMgYXMgXFxyXFxuIGNhdXNlIHRoZSBodG1sIHNwZWMgc2F5cyBzb1xuICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvKFxccik/XFxuL2csICdcXHJcXG4nKTtcbiAgICB2YWx1ZSA9IGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG5cbiAgICAvLyBzcGFjZXMgc2hvdWxkIGJlICcrJyByYXRoZXIgdGhhbiAnJTIwJy5cbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoLyUyMC9nLCAnKycpO1xuICAgIHJldHVybiByZXN1bHQgKyAocmVzdWx0ID8gJyYnIDogJycpICsgZW5jb2RlVVJJQ29tcG9uZW50KGtleSkgKyAnPScgKyB2YWx1ZTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzZXJpYWxpemU7XG4iLCIvKiFcbiAqIERldGVybWluZSBpZiBhbiBvYmplY3QgaXMgYSBCdWZmZXJcbiAqXG4gKiBAYXV0aG9yICAgRmVyb3NzIEFib3VraGFkaWplaCA8aHR0cHM6Ly9mZXJvc3Mub3JnPlxuICogQGxpY2Vuc2UgIE1JVFxuICovXG5cbi8vIFRoZSBfaXNCdWZmZXIgY2hlY2sgaXMgZm9yIFNhZmFyaSA1LTcgc3VwcG9ydCwgYmVjYXVzZSBpdCdzIG1pc3Npbmdcbi8vIE9iamVjdC5wcm90b3R5cGUuY29uc3RydWN0b3IuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHlcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKG9iaikge1xuICByZXR1cm4gb2JqICE9IG51bGwgJiYgKGlzQnVmZmVyKG9iaikgfHwgaXNTbG93QnVmZmVyKG9iaikgfHwgISFvYmouX2lzQnVmZmVyKVxufVxuXG5mdW5jdGlvbiBpc0J1ZmZlciAob2JqKSB7XG4gIHJldHVybiAhIW9iai5jb25zdHJ1Y3RvciAmJiB0eXBlb2Ygb2JqLmNvbnN0cnVjdG9yLmlzQnVmZmVyID09PSAnZnVuY3Rpb24nICYmIG9iai5jb25zdHJ1Y3Rvci5pc0J1ZmZlcihvYmopXG59XG5cbi8vIEZvciBOb2RlIHYwLjEwIHN1cHBvcnQuIFJlbW92ZSB0aGlzIGV2ZW50dWFsbHkuXG5mdW5jdGlvbiBpc1Nsb3dCdWZmZXIgKG9iaikge1xuICByZXR1cm4gdHlwZW9mIG9iai5yZWFkRmxvYXRMRSA9PT0gJ2Z1bmN0aW9uJyAmJiB0eXBlb2Ygb2JqLnNsaWNlID09PSAnZnVuY3Rpb24nICYmIGlzQnVmZmVyKG9iai5zbGljZSgwLCAwKSlcbn1cbiIsIi8qKlxuICogaXNNb2JpbGUuanMgdjAuNC4xXG4gKlxuICogQSBzaW1wbGUgbGlicmFyeSB0byBkZXRlY3QgQXBwbGUgcGhvbmVzIGFuZCB0YWJsZXRzLFxuICogQW5kcm9pZCBwaG9uZXMgYW5kIHRhYmxldHMsIG90aGVyIG1vYmlsZSBkZXZpY2VzIChsaWtlIGJsYWNrYmVycnksIG1pbmktb3BlcmEgYW5kIHdpbmRvd3MgcGhvbmUpLFxuICogYW5kIGFueSBraW5kIG9mIHNldmVuIGluY2ggZGV2aWNlLCB2aWEgdXNlciBhZ2VudCBzbmlmZmluZy5cbiAqXG4gKiBAYXV0aG9yOiBLYWkgTWFsbGVhIChrbWFsbGVhQGdtYWlsLmNvbSlcbiAqXG4gKiBAbGljZW5zZTogaHR0cDovL2NyZWF0aXZlY29tbW9ucy5vcmcvcHVibGljZG9tYWluL3plcm8vMS4wL1xuICovXG4oZnVuY3Rpb24gKGdsb2JhbCkge1xuXG4gICAgdmFyIGFwcGxlX3Bob25lICAgICAgICAgPSAvaVBob25lL2ksXG4gICAgICAgIGFwcGxlX2lwb2QgICAgICAgICAgPSAvaVBvZC9pLFxuICAgICAgICBhcHBsZV90YWJsZXQgICAgICAgID0gL2lQYWQvaSxcbiAgICAgICAgYW5kcm9pZF9waG9uZSAgICAgICA9IC8oPz0uKlxcYkFuZHJvaWRcXGIpKD89LipcXGJNb2JpbGVcXGIpL2ksIC8vIE1hdGNoICdBbmRyb2lkJyBBTkQgJ01vYmlsZSdcbiAgICAgICAgYW5kcm9pZF90YWJsZXQgICAgICA9IC9BbmRyb2lkL2ksXG4gICAgICAgIGFtYXpvbl9waG9uZSAgICAgICAgPSAvKD89LipcXGJBbmRyb2lkXFxiKSg/PS4qXFxiU0Q0OTMwVVJcXGIpL2ksXG4gICAgICAgIGFtYXpvbl90YWJsZXQgICAgICAgPSAvKD89LipcXGJBbmRyb2lkXFxiKSg/PS4qXFxiKD86S0ZPVHxLRlRUfEtGSldJfEtGSldBfEtGU09XSXxLRlRIV0l8S0ZUSFdBfEtGQVBXSXxLRkFQV0F8S0ZBUldJfEtGQVNXSXxLRlNBV0l8S0ZTQVdBKVxcYikvaSxcbiAgICAgICAgd2luZG93c19waG9uZSAgICAgICA9IC9XaW5kb3dzIFBob25lL2ksXG4gICAgICAgIHdpbmRvd3NfdGFibGV0ICAgICAgPSAvKD89LipcXGJXaW5kb3dzXFxiKSg/PS4qXFxiQVJNXFxiKS9pLCAvLyBNYXRjaCAnV2luZG93cycgQU5EICdBUk0nXG4gICAgICAgIG90aGVyX2JsYWNrYmVycnkgICAgPSAvQmxhY2tCZXJyeS9pLFxuICAgICAgICBvdGhlcl9ibGFja2JlcnJ5XzEwID0gL0JCMTAvaSxcbiAgICAgICAgb3RoZXJfb3BlcmEgICAgICAgICA9IC9PcGVyYSBNaW5pL2ksXG4gICAgICAgIG90aGVyX2Nocm9tZSAgICAgICAgPSAvKENyaU9TfENocm9tZSkoPz0uKlxcYk1vYmlsZVxcYikvaSxcbiAgICAgICAgb3RoZXJfZmlyZWZveCAgICAgICA9IC8oPz0uKlxcYkZpcmVmb3hcXGIpKD89LipcXGJNb2JpbGVcXGIpL2ksIC8vIE1hdGNoICdGaXJlZm94JyBBTkQgJ01vYmlsZSdcbiAgICAgICAgc2V2ZW5faW5jaCA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAnKD86JyArICAgICAgICAgLy8gTm9uLWNhcHR1cmluZyBncm91cFxuXG4gICAgICAgICAgICAnTmV4dXMgNycgKyAgICAgLy8gTmV4dXMgN1xuXG4gICAgICAgICAgICAnfCcgKyAgICAgICAgICAgLy8gT1JcblxuICAgICAgICAgICAgJ0JOVFYyNTAnICsgICAgIC8vIEImTiBOb29rIFRhYmxldCA3IGluY2hcblxuICAgICAgICAgICAgJ3wnICsgICAgICAgICAgIC8vIE9SXG5cbiAgICAgICAgICAgICdLaW5kbGUgRmlyZScgKyAvLyBLaW5kbGUgRmlyZVxuXG4gICAgICAgICAgICAnfCcgKyAgICAgICAgICAgLy8gT1JcblxuICAgICAgICAgICAgJ1NpbGsnICsgICAgICAgIC8vIEtpbmRsZSBGaXJlLCBTaWxrIEFjY2VsZXJhdGVkXG5cbiAgICAgICAgICAgICd8JyArICAgICAgICAgICAvLyBPUlxuXG4gICAgICAgICAgICAnR1QtUDEwMDAnICsgICAgLy8gR2FsYXh5IFRhYiA3IGluY2hcblxuICAgICAgICAgICAgJyknLCAgICAgICAgICAgIC8vIEVuZCBub24tY2FwdHVyaW5nIGdyb3VwXG5cbiAgICAgICAgICAgICdpJyk7ICAgICAgICAgICAvLyBDYXNlLWluc2Vuc2l0aXZlIG1hdGNoaW5nXG5cbiAgICB2YXIgbWF0Y2ggPSBmdW5jdGlvbihyZWdleCwgdXNlckFnZW50KSB7XG4gICAgICAgIHJldHVybiByZWdleC50ZXN0KHVzZXJBZ2VudCk7XG4gICAgfTtcblxuICAgIHZhciBJc01vYmlsZUNsYXNzID0gZnVuY3Rpb24odXNlckFnZW50KSB7XG4gICAgICAgIHZhciB1YSA9IHVzZXJBZ2VudCB8fCBuYXZpZ2F0b3IudXNlckFnZW50O1xuXG4gICAgICAgIC8vIEZhY2Vib29rIG1vYmlsZSBhcHAncyBpbnRlZ3JhdGVkIGJyb3dzZXIgYWRkcyBhIGJ1bmNoIG9mIHN0cmluZ3MgdGhhdFxuICAgICAgICAvLyBtYXRjaCBldmVyeXRoaW5nLiBTdHJpcCBpdCBvdXQgaWYgaXQgZXhpc3RzLlxuICAgICAgICB2YXIgdG1wID0gdWEuc3BsaXQoJ1tGQkFOJyk7XG4gICAgICAgIGlmICh0eXBlb2YgdG1wWzFdICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdWEgPSB0bXBbMF07XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUd2l0dGVyIG1vYmlsZSBhcHAncyBpbnRlZ3JhdGVkIGJyb3dzZXIgb24gaVBhZCBhZGRzIGEgXCJUd2l0dGVyIGZvclxuICAgICAgICAvLyBpUGhvbmVcIiBzdHJpbmcuIFNhbWUgcHJvYmFibGUgaGFwcGVucyBvbiBvdGhlciB0YWJsZXQgcGxhdGZvcm1zLlxuICAgICAgICAvLyBUaGlzIHdpbGwgY29uZnVzZSBkZXRlY3Rpb24gc28gc3RyaXAgaXQgb3V0IGlmIGl0IGV4aXN0cy5cbiAgICAgICAgdG1wID0gdWEuc3BsaXQoJ1R3aXR0ZXInKTtcbiAgICAgICAgaWYgKHR5cGVvZiB0bXBbMV0gIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB1YSA9IHRtcFswXTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuYXBwbGUgPSB7XG4gICAgICAgICAgICBwaG9uZTogIG1hdGNoKGFwcGxlX3Bob25lLCB1YSksXG4gICAgICAgICAgICBpcG9kOiAgIG1hdGNoKGFwcGxlX2lwb2QsIHVhKSxcbiAgICAgICAgICAgIHRhYmxldDogIW1hdGNoKGFwcGxlX3Bob25lLCB1YSkgJiYgbWF0Y2goYXBwbGVfdGFibGV0LCB1YSksXG4gICAgICAgICAgICBkZXZpY2U6IG1hdGNoKGFwcGxlX3Bob25lLCB1YSkgfHwgbWF0Y2goYXBwbGVfaXBvZCwgdWEpIHx8IG1hdGNoKGFwcGxlX3RhYmxldCwgdWEpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuYW1hem9uID0ge1xuICAgICAgICAgICAgcGhvbmU6ICBtYXRjaChhbWF6b25fcGhvbmUsIHVhKSxcbiAgICAgICAgICAgIHRhYmxldDogIW1hdGNoKGFtYXpvbl9waG9uZSwgdWEpICYmIG1hdGNoKGFtYXpvbl90YWJsZXQsIHVhKSxcbiAgICAgICAgICAgIGRldmljZTogbWF0Y2goYW1hem9uX3Bob25lLCB1YSkgfHwgbWF0Y2goYW1hem9uX3RhYmxldCwgdWEpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuYW5kcm9pZCA9IHtcbiAgICAgICAgICAgIHBob25lOiAgbWF0Y2goYW1hem9uX3Bob25lLCB1YSkgfHwgbWF0Y2goYW5kcm9pZF9waG9uZSwgdWEpLFxuICAgICAgICAgICAgdGFibGV0OiAhbWF0Y2goYW1hem9uX3Bob25lLCB1YSkgJiYgIW1hdGNoKGFuZHJvaWRfcGhvbmUsIHVhKSAmJiAobWF0Y2goYW1hem9uX3RhYmxldCwgdWEpIHx8IG1hdGNoKGFuZHJvaWRfdGFibGV0LCB1YSkpLFxuICAgICAgICAgICAgZGV2aWNlOiBtYXRjaChhbWF6b25fcGhvbmUsIHVhKSB8fCBtYXRjaChhbWF6b25fdGFibGV0LCB1YSkgfHwgbWF0Y2goYW5kcm9pZF9waG9uZSwgdWEpIHx8IG1hdGNoKGFuZHJvaWRfdGFibGV0LCB1YSlcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy53aW5kb3dzID0ge1xuICAgICAgICAgICAgcGhvbmU6ICBtYXRjaCh3aW5kb3dzX3Bob25lLCB1YSksXG4gICAgICAgICAgICB0YWJsZXQ6IG1hdGNoKHdpbmRvd3NfdGFibGV0LCB1YSksXG4gICAgICAgICAgICBkZXZpY2U6IG1hdGNoKHdpbmRvd3NfcGhvbmUsIHVhKSB8fCBtYXRjaCh3aW5kb3dzX3RhYmxldCwgdWEpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMub3RoZXIgPSB7XG4gICAgICAgICAgICBibGFja2JlcnJ5OiAgIG1hdGNoKG90aGVyX2JsYWNrYmVycnksIHVhKSxcbiAgICAgICAgICAgIGJsYWNrYmVycnkxMDogbWF0Y2gob3RoZXJfYmxhY2tiZXJyeV8xMCwgdWEpLFxuICAgICAgICAgICAgb3BlcmE6ICAgICAgICBtYXRjaChvdGhlcl9vcGVyYSwgdWEpLFxuICAgICAgICAgICAgZmlyZWZveDogICAgICBtYXRjaChvdGhlcl9maXJlZm94LCB1YSksXG4gICAgICAgICAgICBjaHJvbWU6ICAgICAgIG1hdGNoKG90aGVyX2Nocm9tZSwgdWEpLFxuICAgICAgICAgICAgZGV2aWNlOiAgICAgICBtYXRjaChvdGhlcl9ibGFja2JlcnJ5LCB1YSkgfHwgbWF0Y2gob3RoZXJfYmxhY2tiZXJyeV8xMCwgdWEpIHx8IG1hdGNoKG90aGVyX29wZXJhLCB1YSkgfHwgbWF0Y2gob3RoZXJfZmlyZWZveCwgdWEpIHx8IG1hdGNoKG90aGVyX2Nocm9tZSwgdWEpXG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuc2V2ZW5faW5jaCA9IG1hdGNoKHNldmVuX2luY2gsIHVhKTtcbiAgICAgICAgdGhpcy5hbnkgPSB0aGlzLmFwcGxlLmRldmljZSB8fCB0aGlzLmFuZHJvaWQuZGV2aWNlIHx8IHRoaXMud2luZG93cy5kZXZpY2UgfHwgdGhpcy5vdGhlci5kZXZpY2UgfHwgdGhpcy5zZXZlbl9pbmNoO1xuXG4gICAgICAgIC8vIGV4Y2x1ZGVzICdvdGhlcicgZGV2aWNlcyBhbmQgaXBvZHMsIHRhcmdldGluZyB0b3VjaHNjcmVlbiBwaG9uZXNcbiAgICAgICAgdGhpcy5waG9uZSA9IHRoaXMuYXBwbGUucGhvbmUgfHwgdGhpcy5hbmRyb2lkLnBob25lIHx8IHRoaXMud2luZG93cy5waG9uZTtcblxuICAgICAgICAvLyBleGNsdWRlcyA3IGluY2ggZGV2aWNlcywgY2xhc3NpZnlpbmcgYXMgcGhvbmUgb3IgdGFibGV0IGlzIGxlZnQgdG8gdGhlIHVzZXJcbiAgICAgICAgdGhpcy50YWJsZXQgPSB0aGlzLmFwcGxlLnRhYmxldCB8fCB0aGlzLmFuZHJvaWQudGFibGV0IHx8IHRoaXMud2luZG93cy50YWJsZXQ7XG5cbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICB2YXIgaW5zdGFudGlhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIElNID0gbmV3IElzTW9iaWxlQ2xhc3MoKTtcbiAgICAgICAgSU0uQ2xhc3MgPSBJc01vYmlsZUNsYXNzO1xuICAgICAgICByZXR1cm4gSU07XG4gICAgfTtcblxuICAgIGlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cyAmJiB0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAvL25vZGVcbiAgICAgICAgbW9kdWxlLmV4cG9ydHMgPSBJc01vYmlsZUNsYXNzO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMgJiYgdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgLy9icm93c2VyaWZ5XG4gICAgICAgIG1vZHVsZS5leHBvcnRzID0gaW5zdGFudGlhdGUoKTtcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgICAgICAvL0FNRFxuICAgICAgICBkZWZpbmUoJ2lzTW9iaWxlJywgW10sIGdsb2JhbC5pc01vYmlsZSA9IGluc3RhbnRpYXRlKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGdsb2JhbC5pc01vYmlsZSA9IGluc3RhbnRpYXRlKCk7XG4gICAgfVxuXG59KSh0aGlzKTtcbiIsIi8qIVxuICogSmF2YVNjcmlwdCBDb29raWUgdjIuMi4wXG4gKiBodHRwczovL2dpdGh1Yi5jb20vanMtY29va2llL2pzLWNvb2tpZVxuICpcbiAqIENvcHlyaWdodCAyMDA2LCAyMDE1IEtsYXVzIEhhcnRsICYgRmFnbmVyIEJyYWNrXG4gKiBSZWxlYXNlZCB1bmRlciB0aGUgTUlUIGxpY2Vuc2VcbiAqL1xuOyhmdW5jdGlvbiAoZmFjdG9yeSkge1xuXHR2YXIgcmVnaXN0ZXJlZEluTW9kdWxlTG9hZGVyID0gZmFsc2U7XG5cdGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcblx0XHRkZWZpbmUoZmFjdG9yeSk7XG5cdFx0cmVnaXN0ZXJlZEluTW9kdWxlTG9hZGVyID0gdHJ1ZTtcblx0fVxuXHRpZiAodHlwZW9mIGV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdFx0cmVnaXN0ZXJlZEluTW9kdWxlTG9hZGVyID0gdHJ1ZTtcblx0fVxuXHRpZiAoIXJlZ2lzdGVyZWRJbk1vZHVsZUxvYWRlcikge1xuXHRcdHZhciBPbGRDb29raWVzID0gd2luZG93LkNvb2tpZXM7XG5cdFx0dmFyIGFwaSA9IHdpbmRvdy5Db29raWVzID0gZmFjdG9yeSgpO1xuXHRcdGFwaS5ub0NvbmZsaWN0ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0d2luZG93LkNvb2tpZXMgPSBPbGRDb29raWVzO1xuXHRcdFx0cmV0dXJuIGFwaTtcblx0XHR9O1xuXHR9XG59KGZ1bmN0aW9uICgpIHtcblx0ZnVuY3Rpb24gZXh0ZW5kICgpIHtcblx0XHR2YXIgaSA9IDA7XG5cdFx0dmFyIHJlc3VsdCA9IHt9O1xuXHRcdGZvciAoOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgYXR0cmlidXRlcyA9IGFyZ3VtZW50c1sgaSBdO1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcblx0XHRcdFx0cmVzdWx0W2tleV0gPSBhdHRyaWJ1dGVzW2tleV07XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHRmdW5jdGlvbiBpbml0IChjb252ZXJ0ZXIpIHtcblx0XHRmdW5jdGlvbiBhcGkgKGtleSwgdmFsdWUsIGF0dHJpYnV0ZXMpIHtcblx0XHRcdHZhciByZXN1bHQ7XG5cdFx0XHRpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIFdyaXRlXG5cblx0XHRcdGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuXHRcdFx0XHRhdHRyaWJ1dGVzID0gZXh0ZW5kKHtcblx0XHRcdFx0XHRwYXRoOiAnLydcblx0XHRcdFx0fSwgYXBpLmRlZmF1bHRzLCBhdHRyaWJ1dGVzKTtcblxuXHRcdFx0XHRpZiAodHlwZW9mIGF0dHJpYnV0ZXMuZXhwaXJlcyA9PT0gJ251bWJlcicpIHtcblx0XHRcdFx0XHR2YXIgZXhwaXJlcyA9IG5ldyBEYXRlKCk7XG5cdFx0XHRcdFx0ZXhwaXJlcy5zZXRNaWxsaXNlY29uZHMoZXhwaXJlcy5nZXRNaWxsaXNlY29uZHMoKSArIGF0dHJpYnV0ZXMuZXhwaXJlcyAqIDg2NGUrNSk7XG5cdFx0XHRcdFx0YXR0cmlidXRlcy5leHBpcmVzID0gZXhwaXJlcztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFdlJ3JlIHVzaW5nIFwiZXhwaXJlc1wiIGJlY2F1c2UgXCJtYXgtYWdlXCIgaXMgbm90IHN1cHBvcnRlZCBieSBJRVxuXHRcdFx0XHRhdHRyaWJ1dGVzLmV4cGlyZXMgPSBhdHRyaWJ1dGVzLmV4cGlyZXMgPyBhdHRyaWJ1dGVzLmV4cGlyZXMudG9VVENTdHJpbmcoKSA6ICcnO1xuXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0cmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkodmFsdWUpO1xuXHRcdFx0XHRcdGlmICgvXltcXHtcXFtdLy50ZXN0KHJlc3VsdCkpIHtcblx0XHRcdFx0XHRcdHZhbHVlID0gcmVzdWx0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBjYXRjaCAoZSkge31cblxuXHRcdFx0XHRpZiAoIWNvbnZlcnRlci53cml0ZSkge1xuXHRcdFx0XHRcdHZhbHVlID0gZW5jb2RlVVJJQ29tcG9uZW50KFN0cmluZyh2YWx1ZSkpXG5cdFx0XHRcdFx0XHQucmVwbGFjZSgvJSgyM3wyNHwyNnwyQnwzQXwzQ3wzRXwzRHwyRnwzRnw0MHw1Qnw1RHw1RXw2MHw3Qnw3RHw3QykvZywgZGVjb2RlVVJJQ29tcG9uZW50KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YWx1ZSA9IGNvbnZlcnRlci53cml0ZSh2YWx1ZSwga2V5KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGtleSA9IGVuY29kZVVSSUNvbXBvbmVudChTdHJpbmcoa2V5KSk7XG5cdFx0XHRcdGtleSA9IGtleS5yZXBsYWNlKC8lKDIzfDI0fDI2fDJCfDVFfDYwfDdDKS9nLCBkZWNvZGVVUklDb21wb25lbnQpO1xuXHRcdFx0XHRrZXkgPSBrZXkucmVwbGFjZSgvW1xcKFxcKV0vZywgZXNjYXBlKTtcblxuXHRcdFx0XHR2YXIgc3RyaW5naWZpZWRBdHRyaWJ1dGVzID0gJyc7XG5cblx0XHRcdFx0Zm9yICh2YXIgYXR0cmlidXRlTmFtZSBpbiBhdHRyaWJ1dGVzKSB7XG5cdFx0XHRcdFx0aWYgKCFhdHRyaWJ1dGVzW2F0dHJpYnV0ZU5hbWVdKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c3RyaW5naWZpZWRBdHRyaWJ1dGVzICs9ICc7ICcgKyBhdHRyaWJ1dGVOYW1lO1xuXHRcdFx0XHRcdGlmIChhdHRyaWJ1dGVzW2F0dHJpYnV0ZU5hbWVdID09PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0c3RyaW5naWZpZWRBdHRyaWJ1dGVzICs9ICc9JyArIGF0dHJpYnV0ZXNbYXR0cmlidXRlTmFtZV07XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIChkb2N1bWVudC5jb29raWUgPSBrZXkgKyAnPScgKyB2YWx1ZSArIHN0cmluZ2lmaWVkQXR0cmlidXRlcyk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIFJlYWRcblxuXHRcdFx0aWYgKCFrZXkpIHtcblx0XHRcdFx0cmVzdWx0ID0ge307XG5cdFx0XHR9XG5cblx0XHRcdC8vIFRvIHByZXZlbnQgdGhlIGZvciBsb29wIGluIHRoZSBmaXJzdCBwbGFjZSBhc3NpZ24gYW4gZW1wdHkgYXJyYXlcblx0XHRcdC8vIGluIGNhc2UgdGhlcmUgYXJlIG5vIGNvb2tpZXMgYXQgYWxsLiBBbHNvIHByZXZlbnRzIG9kZCByZXN1bHQgd2hlblxuXHRcdFx0Ly8gY2FsbGluZyBcImdldCgpXCJcblx0XHRcdHZhciBjb29raWVzID0gZG9jdW1lbnQuY29va2llID8gZG9jdW1lbnQuY29va2llLnNwbGl0KCc7ICcpIDogW107XG5cdFx0XHR2YXIgcmRlY29kZSA9IC8oJVswLTlBLVpdezJ9KSsvZztcblx0XHRcdHZhciBpID0gMDtcblxuXHRcdFx0Zm9yICg7IGkgPCBjb29raWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHZhciBwYXJ0cyA9IGNvb2tpZXNbaV0uc3BsaXQoJz0nKTtcblx0XHRcdFx0dmFyIGNvb2tpZSA9IHBhcnRzLnNsaWNlKDEpLmpvaW4oJz0nKTtcblxuXHRcdFx0XHRpZiAoIXRoaXMuanNvbiAmJiBjb29raWUuY2hhckF0KDApID09PSAnXCInKSB7XG5cdFx0XHRcdFx0Y29va2llID0gY29va2llLnNsaWNlKDEsIC0xKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dmFyIG5hbWUgPSBwYXJ0c1swXS5yZXBsYWNlKHJkZWNvZGUsIGRlY29kZVVSSUNvbXBvbmVudCk7XG5cdFx0XHRcdFx0Y29va2llID0gY29udmVydGVyLnJlYWQgP1xuXHRcdFx0XHRcdFx0Y29udmVydGVyLnJlYWQoY29va2llLCBuYW1lKSA6IGNvbnZlcnRlcihjb29raWUsIG5hbWUpIHx8XG5cdFx0XHRcdFx0XHRjb29raWUucmVwbGFjZShyZGVjb2RlLCBkZWNvZGVVUklDb21wb25lbnQpO1xuXG5cdFx0XHRcdFx0aWYgKHRoaXMuanNvbikge1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0Y29va2llID0gSlNPTi5wYXJzZShjb29raWUpO1xuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZSkge31cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoa2V5ID09PSBuYW1lKSB7XG5cdFx0XHRcdFx0XHRyZXN1bHQgPSBjb29raWU7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIWtleSkge1xuXHRcdFx0XHRcdFx0cmVzdWx0W25hbWVdID0gY29va2llO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBjYXRjaCAoZSkge31cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3VsdDtcblx0XHR9XG5cblx0XHRhcGkuc2V0ID0gYXBpO1xuXHRcdGFwaS5nZXQgPSBmdW5jdGlvbiAoa2V5KSB7XG5cdFx0XHRyZXR1cm4gYXBpLmNhbGwoYXBpLCBrZXkpO1xuXHRcdH07XG5cdFx0YXBpLmdldEpTT04gPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gYXBpLmFwcGx5KHtcblx0XHRcdFx0anNvbjogdHJ1ZVxuXHRcdFx0fSwgW10uc2xpY2UuY2FsbChhcmd1bWVudHMpKTtcblx0XHR9O1xuXHRcdGFwaS5kZWZhdWx0cyA9IHt9O1xuXG5cdFx0YXBpLnJlbW92ZSA9IGZ1bmN0aW9uIChrZXksIGF0dHJpYnV0ZXMpIHtcblx0XHRcdGFwaShrZXksICcnLCBleHRlbmQoYXR0cmlidXRlcywge1xuXHRcdFx0XHRleHBpcmVzOiAtMVxuXHRcdFx0fSkpO1xuXHRcdH07XG5cblx0XHRhcGkud2l0aENvbnZlcnRlciA9IGluaXQ7XG5cblx0XHRyZXR1cm4gYXBpO1xuXHR9XG5cblx0cmV0dXJuIGluaXQoZnVuY3Rpb24gKCkge30pO1xufSkpO1xuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbi8vIGNhY2hlZCBmcm9tIHdoYXRldmVyIGdsb2JhbCBpcyBwcmVzZW50IHNvIHRoYXQgdGVzdCBydW5uZXJzIHRoYXQgc3R1YiBpdFxuLy8gZG9uJ3QgYnJlYWsgdGhpbmdzLiAgQnV0IHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRyeSBjYXRjaCBpbiBjYXNlIGl0IGlzXG4vLyB3cmFwcGVkIGluIHN0cmljdCBtb2RlIGNvZGUgd2hpY2ggZG9lc24ndCBkZWZpbmUgYW55IGdsb2JhbHMuICBJdCdzIGluc2lkZSBhXG4vLyBmdW5jdGlvbiBiZWNhdXNlIHRyeS9jYXRjaGVzIGRlb3B0aW1pemUgaW4gY2VydGFpbiBlbmdpbmVzLlxuXG52YXIgY2FjaGVkU2V0VGltZW91dDtcbnZhciBjYWNoZWRDbGVhclRpbWVvdXQ7XG5cbmZ1bmN0aW9uIGRlZmF1bHRTZXRUaW1vdXQoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdzZXRUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG5mdW5jdGlvbiBkZWZhdWx0Q2xlYXJUaW1lb3V0ICgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NsZWFyVGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuKGZ1bmN0aW9uICgpIHtcbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIHNldFRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBpZiAodHlwZW9mIGNsZWFyVGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gZGVmYXVsdENsZWFyVGltZW91dDtcbiAgICB9XG59ICgpKVxuZnVuY3Rpb24gcnVuVGltZW91dChmdW4pIHtcbiAgICBpZiAoY2FjaGVkU2V0VGltZW91dCA9PT0gc2V0VGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgLy8gaWYgc2V0VGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZFNldFRpbWVvdXQgPT09IGRlZmF1bHRTZXRUaW1vdXQgfHwgIWNhY2hlZFNldFRpbWVvdXQpICYmIHNldFRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9IGNhdGNoKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0IHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKG51bGwsIGZ1biwgMCk7XG4gICAgICAgIH0gY2F0Y2goZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbCh0aGlzLCBmdW4sIDApO1xuICAgICAgICB9XG4gICAgfVxuXG5cbn1cbmZ1bmN0aW9uIHJ1bkNsZWFyVGltZW91dChtYXJrZXIpIHtcbiAgICBpZiAoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgLy8gaWYgY2xlYXJUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkQ2xlYXJUaW1lb3V0ID09PSBkZWZhdWx0Q2xlYXJUaW1lb3V0IHx8ICFjYWNoZWRDbGVhclRpbWVvdXQpICYmIGNsZWFyVGltZW91dCkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIHJldHVybiBjbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgIHRydXN0IHRoZSBnbG9iYWwgb2JqZWN0IHdoZW4gY2FsbGVkIG5vcm1hbGx5XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwobnVsbCwgbWFya2VyKTtcbiAgICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgICAgICAvLyBzYW1lIGFzIGFib3ZlIGJ1dCB3aGVuIGl0J3MgYSB2ZXJzaW9uIG9mIEkuRS4gdGhhdCBtdXN0IGhhdmUgdGhlIGdsb2JhbCBvYmplY3QgZm9yICd0aGlzJywgaG9wZnVsbHkgb3VyIGNvbnRleHQgY29ycmVjdCBvdGhlcndpc2UgaXQgd2lsbCB0aHJvdyBhIGdsb2JhbCBlcnJvci5cbiAgICAgICAgICAgIC8vIFNvbWUgdmVyc2lvbnMgb2YgSS5FLiBoYXZlIGRpZmZlcmVudCBydWxlcyBmb3IgY2xlYXJUaW1lb3V0IHZzIHNldFRpbWVvdXRcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbCh0aGlzLCBtYXJrZXIpO1xuICAgICAgICB9XG4gICAgfVxuXG5cblxufVxudmFyIHF1ZXVlID0gW107XG52YXIgZHJhaW5pbmcgPSBmYWxzZTtcbnZhciBjdXJyZW50UXVldWU7XG52YXIgcXVldWVJbmRleCA9IC0xO1xuXG5mdW5jdGlvbiBjbGVhblVwTmV4dFRpY2soKSB7XG4gICAgaWYgKCFkcmFpbmluZyB8fCAhY3VycmVudFF1ZXVlKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBpZiAoY3VycmVudFF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBxdWV1ZSA9IGN1cnJlbnRRdWV1ZS5jb25jYXQocXVldWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICBkcmFpblF1ZXVlKCk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIHZhciB0aW1lb3V0ID0gcnVuVGltZW91dChjbGVhblVwTmV4dFRpY2spO1xuICAgIGRyYWluaW5nID0gdHJ1ZTtcblxuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB3aGlsZSAoKytxdWV1ZUluZGV4IDwgbGVuKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudFF1ZXVlKSB7XG4gICAgICAgICAgICAgICAgY3VycmVudFF1ZXVlW3F1ZXVlSW5kZXhdLnJ1bigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHF1ZXVlSW5kZXggPSAtMTtcbiAgICAgICAgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIH1cbiAgICBjdXJyZW50UXVldWUgPSBudWxsO1xuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgcnVuQ2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xufVxuXG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICB9XG4gICAgfVxuICAgIHF1ZXVlLnB1c2gobmV3IEl0ZW0oZnVuLCBhcmdzKSk7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMSAmJiAhZHJhaW5pbmcpIHtcbiAgICAgICAgcnVuVGltZW91dChkcmFpblF1ZXVlKTtcbiAgICB9XG59O1xuXG4vLyB2OCBsaWtlcyBwcmVkaWN0aWJsZSBvYmplY3RzXG5mdW5jdGlvbiBJdGVtKGZ1biwgYXJyYXkpIHtcbiAgICB0aGlzLmZ1biA9IGZ1bjtcbiAgICB0aGlzLmFycmF5ID0gYXJyYXk7XG59XG5JdGVtLnByb3RvdHlwZS5ydW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgdGhpcy5mdW4uYXBwbHkobnVsbCwgdGhpcy5hcnJheSk7XG59O1xucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5wcmVwZW5kT25jZUxpc3RlbmVyID0gbm9vcDtcblxucHJvY2Vzcy5saXN0ZW5lcnMgPSBmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gW10gfVxuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsIlxuaW1wb3J0IGlzTW9iaWxlIGZyb20gJ2lzbW9iaWxlanMnO1xuaW1wb3J0IHNlcmlhbGl6ZSBmcm9tICdmb3JtLXNlcmlhbGl6ZSc7XG5pbXBvcnQgQ29va2llcyBmcm9tICdqcy1jb29raWUnO1xuaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zJztcblxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICBjb25zdCBoZWFkZXJzID0ge307XG4gIGNvbnN0IGNsaWVudEtleSA9IENvb2tpZXMuZ2V0KCdjbGllbnQnKTtcbiAgY29uc3QgdWlkID0gQ29va2llcy5nZXQoJ3VpZCcpO1xuICBjb25zdCB0b2tlbiA9IENvb2tpZXMuZ2V0KCd0b2tlbicpO1xuXG4gIGlmIChjbGllbnRLZXkgJiYgdWlkICYmIHRva2VuKSB7XG4gICAgaGVhZGVyc1snYWNjZXNzLXRva2VuJ10gPSB0b2tlbjtcbiAgICBoZWFkZXJzLnVpZCA9IHVpZDtcbiAgICBoZWFkZXJzLmNsaWVudCA9IGNsaWVudEtleTtcbiAgfVxuXG5cbiAgLyoqXG4gICAqIENvbnRhY3QgZm9ybSBzZWxlY3RvclxuICAgKi9cblxuICAkKCdbZGF0YS1zZWxlY3QtcHJvZHVjdF0nKS5vbignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICBjb25zdCBwcm9kdWN0ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KS5kYXRhKCdzZWxlY3QtcHJvZHVjdCcpO1xuXG4gICAgLy8gU2Nyb2xsIHRvIHJlZ2lzdHJhdGlvbiBmb3JtXG4gICAgemVuc2Nyb2xsLnRvKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9kdWN0X2ludGVyZXN0JyksIDUwMCk7XG5cbiAgICAvLyBTZXQgdGhlIHZhbHVlIG9mIHRoZSBwcm9kdWN0IGludGVyZXN0IGRyb3Bkb3duXG4gICAgJCgnI3Byb2R1Y3RfaW50ZXJlc3QnKS52YWwocHJvZHVjdCk7XG4gICAgJCgnI3Byb2R1Y3RfaW50ZXJlc3QnKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgIC8vIEF1dG9mb2N1cyB0aGUgZmlyc3QgaW5wdXRcbiAgICAkKCcjbmFtZScpLmZvY3VzKCk7XG4gIH0pO1xuXG4gIGxldCBjdXN0b21Db3VudHJ5Q29kZSA9IGZhbHNlO1xuICAkKCdbbmFtZT1cImZpcnN0X25hbWVcIl0sIFtuYW1lPVwibWlkZGxlX25hbWVcIl0sIFtuYW1lPVwibGFzdF9uYW1lXCJdJykub24oJ2NoYW5nZScsIChldmVudCkgPT4ge1xuICAgIGlmICgkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpICYmICQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkubWF0Y2goL1xcZCsvZykpIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCByZWQnKTtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnPGRpdiBjbGFzcz1cImVycm9yLWljb25cIj4hPC9kaXY+WW91ciBuYW1lIHNob3VsZCBub3QgaW5jbHVkZSBudW1iZXJzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgI2VlZScpO1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCcnKTtcbiAgICB9XG4gIH0pO1xuXG4gICQoJ1tuYW1lPVwicGFzc3dvcmRfY29uZmlybWF0aW9uXCJdJykub24oJ2NoYW5nZScsIChldmVudCkgPT4ge1xuICAgIC8vICQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkgPT09ICQoJ1tuYW1lPVwicGFzc3dvcmRcIl0nKS52YWwoKVxuICAgIC8vIGNvbnN0IGN1cnJlbnRMZW5ndGggPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLnZhbCgpLmxlbmd0aDtcbiAgICAvLyBjb25zb2xlLmxvZyhjdXJyZW50TGVuZ3RoKTtcbiAgICBpZiAoJChldmVudC5jdXJyZW50VGFyZ2V0KS52YWwoKSA9PT0gJCgnW25hbWU9XCJwYXNzd29yZFwiXScpLnZhbCgpKSB7XG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgI2VlZScpO1xuICAgICAgJCgnW25hbWU9XCJwYXNzd29yZFwiXScpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgI2VlZScpO1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgICAgJCgnW25hbWU9XCJwYXNzd29yZFwiXScpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgcmVkJyk7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PllvdXIgcGFzc3dvcmRzIG11c3QgbWF0Y2guJyk7XG4gICAgfVxuXG4gICAgaWYgKCQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkubGVuZ3RoIDw9IDcpIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCByZWQnKTtcbiAgICAgICQoJ1tuYW1lPVwicGFzc3dvcmRcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5Zb3VyIHBhc3N3b3JkIHNob3VsZCBoYXZlIGF0IGxlYXN0IDggY2hhcmFjdGVycy4nKTtcbiAgICB9IGVsc2UgaWYgKCQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkgIT09ICQoJ1tuYW1lPVwicGFzc3dvcmRcIl0nKS52YWwoKSkge1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5Zb3VyIHBhc3N3b3JkcyBtdXN0IG1hdGNoLicpO1xuICAgIH1cbiAgfSk7XG5cbiAgJCgnW25hbWU9XCJlbWFpbF9jb25maXJtYXRpb25cIl0nKS5vbignY2hhbmdlJywgKGV2ZW50KSA9PiB7XG4gICAgZnVuY3Rpb24gdmFsaWRhdGVFbWFpbChtYWlsKSB7XG4gICAgIGlmICgvKD86W2EtejAtOSEjJCUmJyorLz0/Xl9ge3x9fi1dKyg/OlxcLlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSspKnxcIig/OltcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDIxXFx4MjMtXFx4NWJcXHg1ZC1cXHg3Zl18XFxcXFtcXHgwMS1cXHgwOVxceDBiXFx4MGNcXHgwZS1cXHg3Zl0pKlwiKUAoPzooPzpbYS16MC05XSg/OlthLXowLTktXSpbYS16MC05XSk/XFwuKStbYS16MC05XSg/OlthLXowLTktXSpbYS16MC05XSk/fFxcWyg/Oig/OjI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldPylcXC4pezN9KD86MjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/fFthLXowLTktXSpbYS16MC05XTooPzpbXFx4MDEtXFx4MDhcXHgwYlxceDBjXFx4MGUtXFx4MWZcXHgyMS1cXHg1YVxceDUzLVxceDdmXXxcXFxcW1xceDAxLVxceDA5XFx4MGJcXHgwY1xceDBlLVxceDdmXSkrKVxcXSkvLnRlc3QobWFpbCkpIHtcbiAgICAgICAgcmV0dXJuICh0cnVlKVxuICAgICAgfVxuICAgICAgcmV0dXJuIChmYWxzZSlcbiAgICB9XG5cblxuICAgIGlmICgoJChldmVudC5jdXJyZW50VGFyZ2V0KS52YWwoKSA9PT0gJCgnW25hbWU9XCJlbWFpbFwiXScpLnZhbCgpKSAmJiB2YWxpZGF0ZUVtYWlsKCQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkpKSB7XG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgI2VlZScpO1xuICAgICAgJCgnW25hbWU9XCJlbWFpbFwiXScpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgI2VlZScpO1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgICAgJCgnW25hbWU9XCJlbWFpbFwiXScpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgcmVkJyk7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PllvdXIgZW1haWxzIG11c3QgbWF0Y2guJyk7XG4gICAgfVxuICB9KTtcbiAgLy8gQ291bnRlclxuICAkKCcuV1BLcGlSb3cnKS53YXlwb2ludChmdW5jdGlvbihkaXJlY3Rpb24pe1xuICAgICQoJy5jb3VudCcpLmVhY2goZnVuY3Rpb24gKCkge1xuICAgICAgJCh0aGlzKS5wcm9wKCdDb3VudGVyJywwKS5hbmltYXRlKHtcbiAgICAgICAgICBDb3VudGVyOiAkKHRoaXMpLnRleHQoKVxuICAgICAgfSwge1xuICAgICAgICAgIGR1cmF0aW9uOiA0MDAwLFxuICAgICAgICAgIGVhc2luZzogJ3N3aW5nJyxcbiAgICAgICAgICBzdGVwOiBmdW5jdGlvbiAobm93KSB7XG4gICAgICAgICAgICAgICQodGhpcykudGV4dChNYXRoLmNlaWwobm93KSk7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gICAgdGhpcy5kZXN0cm95KClcbiAgfSx7XG4gICAvL2JvdHRvbS1pbi12aWV3IHdpbGwgZW5zdXJlIGV2ZW50IGlzIHRocm93biB3aGVuIHRoZSBlbGVtZW50J3MgYm90dG9tIGNyb3NzZXNcbiAgIC8vYm90dG9tIG9mIHZpZXdwb3J0LlxuICAgb2Zmc2V0OiAnYm90dG9tLWluLXZpZXcnXG4gIH0pO1xuICAvKiBWaWRlbyAqL1xuXG4gIHZhciB2aWRlbzEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJndmlkZW9cIik7XG4gIGlmICh2aWRlbzEpe1xuICAgIHZpZGVvMS5jdXJyZW50VGltZSA9IDA7XG4gIH1cbiAgJChcIi5tdXRlLWJ0XCIpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoJCh0aGlzKS5oYXNDbGFzcyhcInN0b3BcIikpIHtcbiAgICAgIHZhciBiZ3ZpZGVvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiZ3ZpZGVvXCIpO1xuICAgICAgJChcIiNiZ3ZpZGVvXCIpLnByb3AoJ211dGVkJywgZmFsc2UpO1xuICAgICAgJCh0aGlzKS5yZW1vdmVDbGFzcyhcInN0b3BcIik7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgdmFyIGJndmlkZW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJndmlkZW9cIik7XG4gICAgICAkKFwiI2JndmlkZW9cIikucHJvcCgnbXV0ZWQnLCB0cnVlKTtcbiAgICAgICQodGhpcykuYWRkQ2xhc3MoXCJzdG9wXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgJChcIi5wbGF5LWJ0XCIpLmNsaWNrKGZ1bmN0aW9uICgpIHtcbiAgICAkKFwiLnBsYXktYnRcIikuaGlkZSgpO1xuICAgICQoXCIucGF1c2UtYnRcIikuc2hvdygpO1xuICAgIHZhciBiZ3ZpZGVvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiZ3ZpZGVvXCIpO1xuICAgIGlmICgkKFwiLnN0b3AtYnRcIikuaGFzQ2xhc3MoXCJhY3RpdmVcIikpIHtcbiAgICAgIGJndmlkZW8uY3VycmVudFRpbWUgPSAwO1xuICAgIH1cbiAgICBiZ3ZpZGVvLnBsYXkoKTtcbiAgfSk7XG4gICQoXCIucGF1c2UtYnRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAgICQoXCIucGxheS1idFwiKS5zaG93KCk7XG4gICAgJChcIi5wYXVzZS1idFwiKS5oaWRlKCk7XG4gICAgJChcIi5wYXVzZS1idFwiKS5hZGRDbGFzcyhcImFjdGl2ZVwiKTtcbiAgICAkKFwiLnN0b3AtYnRcIikucmVtb3ZlQ2xhc3MoXCJhY3RpdmVcIik7XG4gICAgdmFyIGJndmlkZW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJndmlkZW9cIik7XG4gICAgYmd2aWRlby5wYXVzZSgpO1xuICB9KTtcbiAgLy8gJChcIi5wYXVzZS1idFwiKS5vbignY2xpY2snLGZ1bmN0aW9uICgpIHtcbiAgLy8gICAkKFwiLnBsYXktYnRcIikuc2hvdygpO1xuICAvLyAgICQoXCIucGF1c2UtYnRcIikuaGlkZSgpO1xuICAvLyAgICQoXCIucGF1c2UtYnRcIikuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gIC8vICAgJChcIi5zdG9wLWJ0XCIpLnJlbW92ZUNsYXNzKFwiYWN0aXZlXCIpO1xuICAvLyAgIHZhciBiZ3ZpZGVvID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiZ3ZpZGVvXCIpO1xuICAvLyAgIGJndmlkZW8ucGF1c2UoKTtcbiAgLy8gfSk7XG4gIFxuICAvLyAkKFwiLnN0b3AtYnRcIikuY2xpY2soZnVuY3Rpb24gKCkge1xuICAvLyAgICQoXCIucGxheS1idFwiKS5zaG93KCk7XG4gIC8vICAgJChcIi5wYXVzZS1idFwiKS5oaWRlKCk7XG4gIC8vICAgJChcIi5wYXVzZS1idFwiKS5yZW1vdmVDbGFzcyhcImFjdGl2ZVwiKTtcbiAgLy8gICAkKFwiLnN0b3AtYnRcIikuYWRkQ2xhc3MoXCJhY3RpdmVcIik7XG4gIC8vICAgdmFyIGJndmlkZW8gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImJndmlkZW9cIik7XG4gIC8vICAgYmd2aWRlby5jdXJyZW50VGltZSA9IDA7XG4gIC8vICAgYmd2aWRlby5wYXVzZSgpO1xuICAvLyB9KTtcblxuICAkKCdbbmFtZT1cImVtYWlsXCJdJykub24oJ2NoYW5nZScsIChldmVudCkgPT4ge1xuICAgIGZ1bmN0aW9uIHZhbGlkYXRlRW1haWwobWFpbCkge1xuICAgICBpZiAoLyg/OlthLXowLTkhIyQlJicqKy89P15fYHt8fX4tXSsoPzpcXC5bYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKSp8XCIoPzpbXFx4MDEtXFx4MDhcXHgwYlxceDBjXFx4MGUtXFx4MWZcXHgyMVxceDIzLVxceDViXFx4NWQtXFx4N2ZdfFxcXFxbXFx4MDEtXFx4MDlcXHgwYlxceDBjXFx4MGUtXFx4N2ZdKSpcIilAKD86KD86W2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP1xcLikrW2EtejAtOV0oPzpbYS16MC05LV0qW2EtejAtOV0pP3xcXFsoPzooPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT8pXFwuKXszfSg/OjI1WzAtNV18MlswLTRdWzAtOV18WzAxXT9bMC05XVswLTldP3xbYS16MC05LV0qW2EtejAtOV06KD86W1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4MjEtXFx4NWFcXHg1My1cXHg3Zl18XFxcXFtcXHgwMS1cXHgwOVxceDBiXFx4MGNcXHgwZS1cXHg3Zl0pKylcXF0pLy50ZXN0KG1haWwpKSB7XG4gICAgICAgIHJldHVybiAodHJ1ZSlcbiAgICAgIH1cbiAgICAgIHJldHVybiAoZmFsc2UpXG4gICAgfVxuXG4gICAgaWYgKCQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkgPT09ICQoJ1tuYW1lPVwiZW1haWxcIl0nKS52YWwoKSkge1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkICNlZWUnKTtcbiAgICAgICQoJ1tuYW1lPVwiZW1haWxcIl0nKS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkICNlZWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgICAgJCgnW25hbWU9XCJlbWFpbFwiXScpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgcmVkJyk7XG4gICAgfVxuXG4gICAgaWYgKCF2YWxpZGF0ZUVtYWlsKCQoZXZlbnQuY3VycmVudFRhcmdldCkudmFsKCkpKSB7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PlBsZWFzZSBlbnRlciBhIHZhbGlkIGVtYWlsLicpO1xuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KS5jc3MoJ2JvcmRlci1ib3R0b20nLCAnMXB4IHNvbGlkIHJlZCcpO1xuICAgICAgJCgnW25hbWU9XCJlbWFpbFwiXScpLmNzcygnYm9yZGVyLWJvdHRvbScsICcxcHggc29saWQgcmVkJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCAjZWVlJyk7XG4gICAgICAkKCdbbmFtZT1cImVtYWlsXCJdJykuY3NzKCdib3JkZXItYm90dG9tJywgJzFweCBzb2xpZCAjZWVlJyk7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJycpO1xuICAgIH1cbiAgfSk7XG5cbiAgJCgnW25hbWU9XCJjb3VudHJ5X2NvZGVcIl0nKS5vbignY2hhbmdlJywgKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgJHRhcmdldCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCk7XG4gICAgY29uc3QgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpO1xuICAgIGNvbnN0IHZhbHVlMiA9ICR0YXJnZXQucGFyZW50KCkubmV4dCgpLmZpbmQoJ2lucHV0Jyk7XG5cbiAgICBpZiAodmFsdWUgPT09ICdvdGhlcicpIHtcbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICAgICAgLnBhcmVudCgpXG4gICAgICAgIC5yZW1vdmVDbGFzcygnY29sLXNtLTEyJylcbiAgICAgICAgLmFkZENsYXNzKCdjb2wtc20tNicpO1xuXG4gICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpXG4gICAgICAgIC5wYXJlbnQoKVxuICAgICAgICAubmV4dCgpXG4gICAgICAgIC5yZW1vdmVDbGFzcygnaGlkZGVuJyk7XG5cbiAgICAgIHZhbHVlMi5mb2N1cygpLnZhbCh2YWx1ZTIudmFsKCkpO1xuXG4gICAgICBjdXN0b21Db3VudHJ5Q29kZSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghY3VzdG9tQ291bnRyeUNvZGUpIHJldHVybjtcblxuICAgICAgJChldmVudC5jdXJyZW50VGFyZ2V0KVxuICAgICAgICAucGFyZW50KClcbiAgICAgICAgLmFkZENsYXNzKCdjb2wtc20tMTInKVxuICAgICAgICAucmVtb3ZlQ2xhc3MoJ2NvbC1zbS02Jyk7XG5cbiAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldClcbiAgICAgICAgLnBhcmVudCgpXG4gICAgICAgIC5uZXh0KClcbiAgICAgICAgLmFkZENsYXNzKCdoaWRkZW4nKTtcblxuICAgICAgdmFsdWUyLnZhbCgnJyk7XG5cbiAgICAgIGN1c3RvbUNvdW50cnlDb2RlID0gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICAkKCcjcHJvZHVjdF9pbnRlcmVzdCcpLm9uKCdjaGFuZ2UnLCAoZXZlbnQpID0+IHtcbiAgICBjb25zdCAkdGFyZ2V0ID0gJChldmVudC5jdXJyZW50VGFyZ2V0KTtcbiAgICBjb25zdCB2YWx1ZSA9ICR0YXJnZXQudmFsKCk7XG5cbiAgICBpZiAodmFsdWUgPT09ICdHbycpIHtcbiAgICAgICQoJy5yZWdpc3RyYXRpb24tc3VibWl0JykuaHRtbCgnR2V0IFN0YXJ0ZWQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gJCgnLnJlZ2lzdHJhdGlvbi1zdWJtaXQnKS5odG1sKCdKb2luIHdhaXRpbmcgbGlzdCcpXG4gICAgICAkKCcucmVnaXN0cmF0aW9uLXN1Ym1pdCcpLmh0bWwoJ0dldCBTdGFydGVkJyk7XG4gICAgfVxuICB9KTtcblxuICAvKipcbiAgICogQ29udGFjdCBGb3JtIFNsaWRlclxuICAgKi9cblxuICBjb25zdCAkY29udGFjdFNsaWRlciA9ICQoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1zbGlkZXInKTtcbiAgY29uc3QgJGNvbnRhY3RGb3JtID0gJCgnLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLWZvcm0nKTtcbiAgY29uc3QgJGNvbnRhY3RTdWNjZXNzID0gJCgnLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLXN1Y2Nlc3MnKTtcblxuICAkY29udGFjdFNsaWRlci5zbGljayh7XG4gICAgLy8gaW5pdGlhbFNsaWRlOiAxLFxuICAgIGFycm93czogZmFsc2UsXG4gICAgZHJhZ2dhYmxlOiBmYWxzZSxcbiAgICBhZGFwdGl2ZUhlaWdodDogdHJ1ZSxcbiAgfSk7XG5cbiAgJCgnLnJlZ2lzdHJhdGlvbi1yZXNlbmQnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgbGV0IHJlZGlyZWN0VXJsID0gJy9vbmJvYXJkaW5nL3ZlcmlmaWVkJztcblxuICAgIC8vIGlmIChDb29raWVzLmdldCgnc2tpcE9uYm9hcmRpbmcnKSkge1xuICAgIC8vICAgcmVkaXJlY3RVcmwgPSAnL29uYm9hcmRpbmcvZmluaXNoJztcbiAgICAvLyB9XG5cbiAgICBheGlvcyh7XG4gICAgICBtZXRob2Q6ICdwb3N0JyxcbiAgICAgIHVybDogJ2h0dHBzOi8vcmVuc291cmNlLWFwaS1ldS5oZXJva3VhcHAuY29tL3YxL29uYm9hcmRpbmcvcmVzZW5kX2VtYWlsX3Rva2VuJyxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ2FjY2Vzcy10b2tlbic6IENvb2tpZXMuZ2V0KCd0b2tlbicpLFxuICAgICAgICBjbGllbnQ6IENvb2tpZXMuZ2V0KCdjbGllbnQnKSxcbiAgICAgICAgdWlkOiBDb29raWVzLmdldCgndWlkJyksXG4gICAgICB9LFxuICAgICAgZGF0YToge1xuICAgICAgICByZWRpcmVjdF91cmw6IGBodHRwOi8vc3RhZ2luZy5ycy50ZXN0Z2ViaWV0LmNvbSR7cmVkaXJlY3RVcmx9YCxcbiAgICAgIH0sXG4gICAgfSlcbiAgICAudGhlbihmdW5jdGlvbihkYXRhKSB7XG4gICAgICAkKCcucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tc3VjY2VzcyBidXR0b24nKS5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuICAgICAgJCgnLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLXN1Y2Nlc3MgYnV0dG9uJykuaHRtbCgnRW1haWwgaGFzIGJlZW4gcmVzZW50Jyk7XG4gICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgIGFsZXJ0KCdTb21ldGhpbmcgd2VudCB3cm9uZy4gUGxlYXNlIHRyeSBhZ2FpbiBsYXRlci4nKTtcbiAgICB9KVxuICB9KTtcblxuICAkKCcucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tc2xpZGVyIGlucHV0LCAucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tc2xpZGVyIHNlbGVjdCcpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgY29uc3QgZm9ybUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLWZvcm0nKVxuICAgIGNvbnN0IGZvcm0gPSBzZXJpYWxpemUoZm9ybUVsLCB0cnVlKTtcbiAgICBjb25zdCBlcnJvcnMgPSB2YWxpZGF0ZUxhc3RTdGVwKGZvcm0pO1xuXG4gICAgaWYgKGVycm9ycy5sZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgJCgnLnJlZ2lzdHJhdGlvbi1zdWJtaXQnKS5hdHRyKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICB9XG4gIH0pO1xuXG4gIGxldCB3cm9uZ1JlZmVycmFsID0gZmFsc2U7XG4gICRjb250YWN0U2xpZGVyLm9uKCdjbGljaycsICcucmVnaXN0cmF0aW9uLXN1Ym1pdCcsIChldmVudCkgPT4ge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAkKCcucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tZm9ybSBidXR0b24nKS5hdHRyKCdkaXNhYmxlZCcsIHRydWUpO1xuXG4gICAgY29uc3QgZm9ybUVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJzLXNlY3Rpb24tcmVnaXN0cmF0aW9uLWZvcm0nKVxuICAgIGNvbnN0IGZvcm0gPSBzZXJpYWxpemUoZm9ybUVsLCB0cnVlKTtcbiAgICBjb25zdCBlcnJvcnMgPSB2YWxpZGF0ZUxhc3RTdGVwKGZvcm0pO1xuXG4gICAgY29uc3QgZm9ybVN0cmluZyA9IE9iamVjdC5rZXlzKGZvcm0pLm1hcCgoa2V5KSA9PiB7XG4gICAgICBjb25zdCBlc2NhcGVkVmFsdWUgPSBmb3JtW2tleV0ucmVwbGFjZSgvXFwrL2csICclMkInKTtcbiAgICAgIHJldHVybiBgJHtrZXl9PSR7ZXNjYXBlZFZhbHVlfWA7XG4gICAgfSkuam9pbignJicpO1xuXG4gICAgZnVuY3Rpb24gVVJMVG9BcnJheSh1cmwpIHtcbiAgICAgIHZhciByZXF1ZXN0ID0ge307XG4gICAgICB2YXIgcGFpcnMgPSB1cmwuc3Vic3RyaW5nKHVybC5pbmRleE9mKCc/JykgKyAxKS5zcGxpdCgnJicpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYWlycy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIGlmKCFwYWlyc1tpXSlcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgdmFyIHBhaXIgPSBwYWlyc1tpXS5zcGxpdCgnPScpO1xuICAgICAgICAgIHJlcXVlc3RbZGVjb2RlVVJJQ29tcG9uZW50KHBhaXJbMF0pXSA9IGRlY29kZVVSSUNvbXBvbmVudChwYWlyWzFdKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXF1ZXN0O1xuICAgIH1cblxuICAgIGNvbnN0IGZvcm1BcnJheSA9IFVSTFRvQXJyYXkoZm9ybVN0cmluZyk7XG5cbiAgICBmdW5jdGlvbiB2YWxpZGF0ZUVtYWlsKG1haWwpIHtcbiAgICAgaWYgKC8oPzpbYS16MC05ISMkJSYnKisvPT9eX2B7fH1+LV0rKD86XFwuW2EtejAtOSEjJCUmJyorLz0/Xl9ge3x9fi1dKykqfFwiKD86W1xceDAxLVxceDA4XFx4MGJcXHgwY1xceDBlLVxceDFmXFx4MjFcXHgyMy1cXHg1YlxceDVkLVxceDdmXXxcXFxcW1xceDAxLVxceDA5XFx4MGJcXHgwY1xceDBlLVxceDdmXSkqXCIpQCg/Oig/OlthLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT9cXC4pK1thLXowLTldKD86W2EtejAtOS1dKlthLXowLTldKT98XFxbKD86KD86MjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLil7M30oPzoyNVswLTVdfDJbMC00XVswLTldfFswMV0/WzAtOV1bMC05XT98W2EtejAtOS1dKlthLXowLTldOig/OltcXHgwMS1cXHgwOFxceDBiXFx4MGNcXHgwZS1cXHgxZlxceDIxLVxceDVhXFx4NTMtXFx4N2ZdfFxcXFxbXFx4MDEtXFx4MDlcXHgwYlxceDBjXFx4MGUtXFx4N2ZdKSspXFxdKS8udGVzdChtYWlsKSkge1xuICAgICAgICByZXR1cm4gKHRydWUpXG4gICAgICB9XG4gICAgICByZXR1cm4gKGZhbHNlKVxuICAgIH1cblxuICAgIGxldCByZWRpcmVjdFVybCA9ICcvb25ib2FyZGluZy92ZXJpZmllZCc7XG5cbiAgICAvLyBpZiAodHlwZW9mIGZvcm1BcnJheS5yZWZlcnJhbF90b2tlbiAhPT0gJ3VuZGVmaW5lZCcgJiYgZm9ybUFycmF5LnJlZmVycmFsX3Rva2VuKSB7XG4gICAgLy8gICBDb29raWVzLnNldCgnc2tpcE9uYm9hcmRpbmcnLCB0cnVlKTtcbiAgICAvLyAgIHJlZGlyZWN0VXJsID0gJy9vbmJvYXJkaW5nL2ZpbmlzaCc7XG4gICAgLy8gfVxuXG4gICAgY29uc3QgcmVmZXJyYWxSZWcgPSAvUkVOXFxkK1xcJC9nO1xuXG4gICAgaWYgKCF2YWxpZGF0ZUVtYWlsKGZvcm1BcnJheS5lbWFpbCkpIHtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnPGRpdiBjbGFzcz1cImVycm9yLWljb25cIj4hPC9kaXY+UGxlYXNlIGVudGVyIGEgdmFsaWQgZW1haWwgYWRkcmVzcy4nKTtcbiAgICB9IGVsc2UgaWYgKGZvcm1BcnJheS5lbWFpbCAhPT0gZm9ybUFycmF5LmVtYWlsX2NvbmZpcm1hdGlvbikge1xuICAgICAgJCgnLmVycm9yLWZpZWxkLWxhc3QnKS5odG1sKCc8ZGl2IGNsYXNzPVwiZXJyb3ItaWNvblwiPiE8L2Rpdj5JdCBzZWVtcyBsaWtlIHlvdXIgZW1haWxzIGRvbnQgbWF0Y2guJyk7XG4gICAgfSBlbHNlIGlmIChmb3JtQXJyYXkucGFzc3dvcmQgIT09IGZvcm1BcnJheS5wYXNzd29yZF9jb25maXJtYXRpb24pIHtcbiAgICAgICQoJy5lcnJvci1maWVsZC1sYXN0JykuaHRtbCgnPGRpdiBjbGFzcz1cImVycm9yLWljb25cIj4hPC9kaXY+SXQgc2VlbXMgbGlrZSB5b3VyIHBhc3N3b3JkIGRvbnQgbWF0Y2guJyk7XG4gICAgfSBlbHNlIGlmIChlcnJvcnMubGVuZ3RoKSB7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PlNvbWUgZmllbGRzIGFyZSBub3QgcHJvcGVybHkgZmlsbGVkLicpO1xuICAgIH0gZWxzZSBpZiAoIXJlZmVycmFsUmVnLnRlc3QoJCgnW25hbWU9XCJyZWZlcnJhbF90b2tlblwiXScpLnZhbCgpKSAmJiAhd3JvbmdSZWZlcnJhbCAmJiAkKCdbbmFtZT1cInJlZmVycmFsX3Rva2VuXCJdJykudmFsKCkgIT09ICcnKSB7XG4gICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PllvdXIgcmVmZXJyYWwgY29kZSBpcyB3cm9uZy4nKTtcbiAgICAgICQoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1mb3JtIGJ1dHRvbicpLmh0bWwoJ1Byb2NlZWQgdG8gcXVlc3Rpb25haXJlJyk7XG4gICAgICAkKCcucnMtc2VjdGlvbi1yZWdpc3RyYXRpb24tZm9ybSBidXR0b24nKS5hdHRyKCdkaXNhYmxlZCcsIGZhbHNlKTtcbiAgICAgIHdyb25nUmVmZXJyYWwgPSB0cnVlO1xuICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICBheGlvcyh7XG4gICAgICAgIG1ldGhvZDogJ3Bvc3QnLFxuICAgICAgICB1cmw6ICdodHRwczovL3JlbnNvdXJjZS1hcGktZXUuaGVyb2t1YXBwLmNvbS92MS9vbmJvYXJkaW5nJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICB1c2VyOiBmb3JtQXJyYXksXG4gICAgICAgICAgcmVkaXJlY3RfdXJsOiBgaHR0cDovL3N0YWdpbmcucnMudGVzdGdlYmlldC5jb20ke3JlZGlyZWN0VXJsfWAsXG4gICAgICAgIH0sXG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBDb29raWVzLnNldCgnY2xpZW50JywgZGF0YS5oZWFkZXJzLmNsaWVudCk7XG4gICAgICAgIENvb2tpZXMuc2V0KCd1aWQnLCBkYXRhLmhlYWRlcnMudWlkKTtcbiAgICAgICAgQ29va2llcy5zZXQoJ3Rva2VuJywgZGF0YS5oZWFkZXJzWydhY2Nlc3MtdG9rZW4nXSk7XG5cbiAgICAgICAgY29uc29sZS5sb2coZGF0YSk7XG4gICAgICAgICRjb250YWN0Rm9ybS5oaWRlKCk7XG4gICAgICAgICRjb250YWN0U3VjY2Vzcy5zaG93KCk7XG5cbiAgICAgICAgY29uc3QgdXNlcldpZHRoID0gJCh3aW5kb3cpLm91dGVyV2lkdGgoKTtcblxuICAgICAgICBpZiAodXNlcldpZHRoIDwgNzY3KSB7XG4gICAgICAgICAgY29uc3QgZm9ybU9mZnNldCA9ICQoJy5ycy1zZWN0aW9uLXJlZ2lzdHJhdGlvbi1zdWNjZXNzJykub2Zmc2V0KCkudG9wO1xuICAgICAgICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcbiAgICAgICAgICAgIHNjcm9sbFRvcDogZm9ybU9mZnNldCAtIDEwMFxuICAgICAgICAgIH0sIDgwMCk7XG4gICAgICAgIH1cbiAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgICAgIGlmICgvXFxiRW1haWwgaGFzIGFscmVhZHkgYmVlbiB0YWtlblxcYi9pLnRlc3QoZXJyb3IucmVzcG9uc2UuZGF0YS5lcnJvcikpIHtcbiAgICAgICAgICAkKCcuZXJyb3ItZmllbGQtbGFzdCcpLmh0bWwoJzxkaXYgY2xhc3M9XCJlcnJvci1pY29uXCI+ITwvZGl2PkVtYWlsIGhhcyBhbHJlYWR5IGJlZW4gdGFrZW4uJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYWxlcnQoJ1NvbWV0aGluZyB3ZW50IHdyb25nLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLicpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfSk7XG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVMYXN0U3RlcChmaWVsZHMpIHtcbiAgICBjb25zdCByZXF1aXJlZEZpZWxkcyA9IFsnZmlyc3RfbmFtZScsICdsYXN0X25hbWUnLCAnZ2VuZGVyJywgJ2VtYWlsJywgJ2VtYWlsX2NvbmZpcm1hdGlvbicsICdwYXNzd29yZCcsICdwYXNzd29yZF9jb25maXJtYXRpb24nLCAnc3Vic2NyaXB0aW9uX3RpZXInXTtcbiAgICBjb25zdCBlcnIgPSBbXTtcblxuICAgIHJlcXVpcmVkRmllbGRzLmZvckVhY2goKGZpZWxkKSA9PiB7XG4gICAgICBpZiAoIWZpZWxkcy5oYXNPd25Qcm9wZXJ0eShmaWVsZCkpIHsgZXJyLnB1c2goZmllbGQpOyB9IC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICB9KTtcblxuICAgIHJldHVybiBlcnI7XG4gIH1cblxuICAvKipcbiAgICogRHluYW1pYyBHSUYgcmVwZWF0aXRpb25cbiAgICovXG4gIGNvbnN0IHNjcm9sbFBvaW50cyA9IFtdO1xuICAkKCcucHJldmVudCcpLm9uKCdjbGljaycsIGV2ZW50ID0+IGV2ZW50LnByZXZlbnREZWZhdWx0KCkpXG5cbiAgaWYgKCFpc01vYmlsZS5hbnkpIHtcbiAgICBza3JvbGxyLmluaXQoeyBmb3JjZUhlaWdodDogZmFsc2UgfSlcblxuICAgICQoJ1tkYXRhLWdpZi1zcmNdJykuZWFjaCgoaSwgZWwpID0+IHtcbiAgICAgIGNvbnN0IGVsZW1lbnQgPSAkKGVsKTtcbiAgICAgIGNvbnN0IHNyYyA9IGVsZW1lbnQuZGF0YSgnZ2lmLXNyYycpO1xuICAgICAgY29uc3QgcG9zaXRpb24gPSBlbGVtZW50Lm9mZnNldCgpLnRvcCAtIDkwMDtcbiAgICAgIGNvbnN0IGNvbmZpZyA9IHsgcG9zaXRpb24sIGVsZW1lbnQsIHNyYyB9XG5cbiAgICAgIGVsZW1lbnQuYXR0cignc3JjJywgc3JjKTtcbiAgICAgIGVsZW1lbnQuY3NzKCdkaXNwbGF5JywgJ25vbmUnKTtcblxuICAgICAgc2Nyb2xsUG9pbnRzLnB1c2goY29uZmlnKTtcbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICAkKCdbZGF0YS1naWYtc3JjXScpLmVhY2goKGksIGVsKSA9PiB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gJChlbCk7XG4gICAgICBjb25zdCBzcmMgPSBlbGVtZW50LmRhdGEoJ2dpZi1zcmMnKTtcblxuICAgICAgZWxlbWVudC5hdHRyKCdzcmMnLCBzcmMpO1xuICAgICAgZWxlbWVudC5jc3MoJ2Rpc3BsYXknLCAnYmxvY2snKTtcbiAgICB9KTtcbiAgfVxuXG4gICQod2luZG93KS5vbignc2Nyb2xsJywgKCkgPT4ge1xuICAgIGNvbnN0IHNjcm9sbFRvcCA9ICQod2luZG93KS5zY3JvbGxUb3AoKTtcblxuICAgIHNjcm9sbFBvaW50cy5mb3JFYWNoKCh7IHBvc2l0aW9uLCBzcmMsIGVsZW1lbnQgfSkgPT4ge1xuICAgICAgaWYgKHNjcm9sbFRvcCA+PSBwb3NpdGlvbikge1xuICAgICAgICBlbGVtZW50LmNzcygnZGlzcGxheScsICdibG9jaycpO1xuICAgICAgICBpZiAoZWxlbWVudC5hdHRyKCdzcmMnKSAhPT0gc3JjKSB7IGVsZW1lbnQuYXR0cignc3JjJywgc3JjKTsgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWxlbWVudC5mYWRlT3V0KDUwMCwgKCkgPT4gZWxlbWVudC5hdHRyKCdzcmMnLCBzcmMpKTtcbiAgICAgIH1cbiAgICB9KVxuICB9KVxuXG4gIC8qKlxuICAgKiBDb2xsYXBzZSB2aWEgRGF0YSBhdHRyaWJ1dGVcbiAgICovXG5cbiAgJCgnW2RhdGEtY29sbGFwc2VdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAkKGVsZW1lbnQpLm9uKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKClcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KClcblxuICAgICAgY29uc3QgeyBjdXJyZW50VGFyZ2V0IH0gPSBldmVudFxuICAgICAgY29uc3QgY29sbGFwc2VDbGFzcyA9ICQoY3VycmVudFRhcmdldCkuZGF0YSgnY29sbGFwc2UnKVxuICAgICAgY29uc3QgY29uZGl0aW9uID0gJChjdXJyZW50VGFyZ2V0KS5kYXRhKCdjb2xsYXBzZS1vbmx5JylcblxuICAgICAgY29uc3QgaGFzQ29uZGl0aW9uID0gKCkgPT4gdHlwZW9mIGNvbmRpdGlvbiAhPT0gJ3VuZGVmaW5lZCdcbiAgICAgIGNvbnN0IG1ldENvbmRpdGlvbiA9ICgpID0+IGhhc0NvbmRpdGlvbigpICYmICQoJ2JvZHknKS53aWR0aCgpIDwgY29uZGl0aW9uXG5cbiAgICAgIGlmIChtZXRDb25kaXRpb24oKSB8fCAhaGFzQ29uZGl0aW9uKCkpIHtcbiAgICAgICAgJChlbGVtZW50KS50b2dnbGVDbGFzcygnYWN0aXZlJylcbiAgICAgICAgJChjb2xsYXBzZUNsYXNzKS5zbGlkZVRvZ2dsZSgyNTApXG4gICAgICB9XG4gICAgfSlcbiAgfSlcblxuICBsZXQgY3VycmVudEhlYWRsaW5lID0gMFxuICBjb25zdCAkaGVhZGxpbmUgPSAkKCcucnMtaGVhZGxpbmUgPiBzcGFuJylcbiAgJGhlYWRsaW5lLmNzcygnZGlzcGxheScsICdpbmxpbmUtYmxvY2snKVxuICBjb25zdCBoZWFkbGluZXMgPSBbXG4gICAgJ1BldHJvbCAmIGRpZXNlbCBiaWxsIGtlZXBzIGdvaW5nIHVwPycsXG4gICAgJ1dhbnQgeW91ciBmcmlkZ2UgdG8gcnVuIGFsbCBkYXk/JyxcbiAgICAnSW52ZXJ0ZXIgYmF0dGVyaWVzIGR5aW5nIHF1aWNrbHk/JyxcbiAgICAnU29sYXIgc3lzdGVtcyBhcmUgdG9vIGV4cGVuc2l2ZT8nLFxuICAgICdXb3JyaWVkIGFib3V0IGdlbmVyYXRvciBmdW1lcz8nLFxuICBdXG5cbiAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICsrY3VycmVudEhlYWRsaW5lIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcblxuICAgIGlmIChjdXJyZW50SGVhZGxpbmUgPj0gaGVhZGxpbmVzLmxlbmd0aCkge1xuICAgICAgY3VycmVudEhlYWRsaW5lID0gMFxuICAgIH1cblxuICAgIHRpY2tIZWFkbGluZSgpXG4gIH0sIDUwMDApO1xuXG4gIGZ1bmN0aW9uIHRpY2tIZWFkbGluZSgpIHtcbiAgICBmdW5jdGlvbiBzdGVwKG5vdykge1xuICAgICAgJGhlYWRsaW5lLmNzcygndHJhbnNmb3JtJywgYHJvdGF0ZVgoJHs5MCAtIChub3cgKiA5MCl9ZGVnKWApXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUoKSB7XG4gICAgICAkaGVhZGxpbmUuaHRtbChoZWFkbGluZXNbY3VycmVudEhlYWRsaW5lXSlcbiAgICAgICRoZWFkbGluZS5hbmltYXRlKHsgb3BhY2l0eTogMSB9LCB7IGR1cmF0aW9uOiA1MDAsIHN0ZXAgfSlcbiAgICB9XG5cbiAgICAkaGVhZGxpbmUuYW5pbWF0ZSh7IG9wYWNpdHk6IDAgfSwgeyBkdXJhdGlvbjogNTAwLCBzdGVwLCBjb21wbGV0ZSB9KVxuICB9XG5cbiAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgJCgnLnByZWxvYWRlcicpLmFkZENsYXNzKCdwcmVsb2FkZXItLWhpZGRlbicpXG5cbiAgICBpZiAoJ2hhc2gnIGluIHdpbmRvdy5sb2NhdGlvbiAmJiB3aW5kb3cubG9jYXRpb24uaGFzaCAhPT0gJycpIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICBjb25zdCB7IGhhc2ggfSA9IHdpbmRvdy5sb2NhdGlvblxuICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihoYXNoKVxuXG4gICAgICAgIGlmIChlbGVtZW50ICE9PSBudWxsKSB7IHplbnNjcm9sbC50byhlbGVtZW50LCA1MDApIH1cbiAgICAgIH0sIDUwMClcbiAgICB9XG4gIH0sIDEzMDApXG5cbiAgY29uc3QgJHRlYXNlciA9ICQoJy5ycy1zZWN0aW9uLXRlYXNlcicpXG4gIGNvbnN0IGxpZ2h0c0NsYXNzID0gJ2xpZ2h0cy10dXJuZWQtb24nXG5cbiAgJCgnI3R1cm4tbGlnaHRzLW9uJykud2F5cG9pbnQoe1xuICAgIGhhbmRsZXIoZGlyKSB7ICR0ZWFzZXIudG9nZ2xlQ2xhc3MobGlnaHRzQ2xhc3MsIGRpciA9PT0gJ2Rvd24nKSB9LFxuICB9KVxuXG4gICQoJy5ycy1zZWN0aW9uLWRpc3RyaWJ1dGlvbicpLndheXBvaW50KHtcbiAgICBvZmZzZXQ6IDMwMCxcbiAgICBoYW5kbGVyKGRpcikge1xuICAgICAgJCgnLnJzLXNlY3Rpb24tZGlzdHJpYnV0aW9uJykudG9nZ2xlQ2xhc3MoJ2luLXZpZXdwb3J0JywgZGlyID09PSAnZG93bicpO1xuICAgIH0sXG4gIH0pXG5cbiAgaWYgKCdkZXZpY2VQaXhlbFJhdGlvJyBpbiB3aW5kb3cgJiYgd2luZG93LmRldmljZVBpeGVsUmF0aW8gPT09IDIpIHtcbiAgICAkKCdbZGF0YS1yZXRpbmFdJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgIGxldCBzcmMgPSBlbGVtZW50LnNyY1xuICAgICAgc3JjID0gc3JjLnJlcGxhY2UoL1xcLihwbmd8anBnfGdpZikrJC9pLCAnQDJ4LiQxJylcbiAgICAgIGVsZW1lbnQuc3JjID0gc3JjIC8vIGVzbGludC1kaXNhYmxlLWxpbmVcbiAgICB9KVxuICB9XG5cbiAgJCgnI2lzX25pZ2h0Jykub24oJ2NoYW5nZScsIGZ1bmN0aW9uIGRheXRpbWVDaGFuZ2UoKSB7XG4gICAgY29uc3QgaXNOaWdodCA9ICQodGhpcykuaXMoJzpjaGVja2VkJylcblxuICAgICQoJy5ycy1zZWN0aW9uLXRlYXNlcicpLnRvZ2dsZUNsYXNzKCdycy1zZWN0aW9uLXRlYXNlci0tbmlnaHQnLCBpc05pZ2h0KVxuICB9KVxuXG4gICQoJy5pcGhvbmUtc2xpY2snKS5zbGljayh7XG4gICAgZmFkZTogdHJ1ZSxcbiAgICBhdXRvcGxheTogdHJ1ZSxcbiAgICBhdXRvcGxheVNwZWVkOiAyMDAwLFxuICAgIGFycm93czogZmFsc2UsXG4gIH0pO1xuXG4gICQoJy5ycy1zZWN0aW9uLXN0b3JpZXMgLnNsaWRlcicpLnNsaWNrKHtcbiAgICBkb3RzOiB0cnVlLFxuICAgIGluZmluaXRlOiB0cnVlLFxuICAgIGFycm93czogdHJ1ZSxcbiAgICBhcHBlbmREb3RzOiAkKCcucnMtc2VjdGlvbi1zdG9yaWVzIC5kb3RzLWNvbnRhaW5lciAuY29udGFpbmVyJyksXG4gIH0pXG5cbiAgJCgnYTpub3QoW2hyZWZePVwiaHR0cFwiXSwgW2hyZWZePVwiI1wiXSwgW2hyZWZePVwibWFpbHRvXCJdKScpLm9uKCdjbGljaycsIGZ1bmN0aW9uIGxpbmtDbGljayhldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgY29uc3QgbGluayA9ICR0aGlzLmF0dHIoJ2hyZWYnKTtcblxuICAgICQoJy5wcmVsb2FkZXInKS5yZW1vdmVDbGFzcygncHJlbG9hZGVyLS1oaWRkZW4nKVxuICAgIHplbnNjcm9sbC50b1koMCwgNTAwLCAoKSA9PiB7XG4gICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGxpbmtcbiAgICB9KVxuICB9KVxuXG4gICQod2luZG93KS5zY3JvbGwoZnVuY3Rpb24gc2Nyb2xsKCkge1xuICAgIGNvbnN0IHN0ID0gJCh0aGlzKS5zY3JvbGxUb3AoKVxuICAgICQoJy5ycy1oZWFkZXInKS50b2dnbGVDbGFzcygncnMtaGVhZGVyLS1zdGlja3knLCBzdCA+IDApXG4gIH0pXG5cbiAgY29uc3Qgc3Vic2NyaXB0aW9uVGV4dCA9IFtcbiAgICAnJyxcbiAgICAnJyxcbiAgICAnJyxcbiAgICAnJyxcbiAgXTtcblxuICAkKCdbZGF0YS1vdmVybGF5XScpLm9uKCdjbGljaycsIGZ1bmN0aW9uIG9uQ2xpY2soKSB7XG4gICAgaWYgKHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZSA9PT0gJy9zdWJzY3JpcHRpb24nKSB7XG4gICAgICBjb25zdCBpbmRleCA9ICQodGhpcykuZGF0YSgnaW5kZXgnKTtcbiAgICAgIGlmIChpbmRleCA9PT0gMCkge1xuICAgICAgICAkKCcuT3ZlcmxheSBwJykuaHRtbChzdWJzY3JpcHRpb25UZXh0WzBdKTtcbiAgICAgIH0gZWxzZSBpZiAoaW5kZXggPT09IDEpIHtcbiAgICAgICAgJCgnLk92ZXJsYXkgcCcpLmh0bWwoc3Vic2NyaXB0aW9uVGV4dFsxXSk7XG4gICAgICB9IGVsc2UgaWYgKGluZGV4ID09PSAyKSB7XG4gICAgICAgICQoJy5PdmVybGF5IHAnKS5odG1sKHN1YnNjcmlwdGlvblRleHRbMl0pO1xuICAgICAgfSBlbHNlIGlmIChpbmRleCA9PT0gMykge1xuICAgICAgICAkKCcuT3ZlcmxheSBwJykuaHRtbChzdWJzY3JpcHRpb25UZXh0WzNdKTtcbiAgICAgIH1cbiAgICAgIC8vICQoJy5PdmVybGF5IHAnKS5odG1sKHN1YnNjcmlwdGlvblRleHRbaW5kZXhdKTtcbiAgICAgICQoJy5PdmVybGF5JykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBpbWFnZSA9ICQodGhpcykuZmluZCgnZGl2JykuYXR0cignc3R5bGUnKTtcbiAgICAgIGNvbnN0IG5hbWUgPSAkKHRoaXMpLmZpbmQoJ2InKS5odG1sKCk7XG4gICAgICBjb25zdCBqb2IgPSAkKHRoaXMpLmZpbmQoJ3NwYW4nKS5odG1sKCk7XG4gICAgICBjb25zdCB0ZXh0ID0gJCh0aGlzKS5maW5kKCdwJykuaHRtbCgpO1xuXG4gICAgICAkKCcuT3ZlcmxheScpLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgJCgnLk92ZXJsYXktQXZhdGFyJykuYXR0cignc3R5bGUnLCBpbWFnZSk7XG4gICAgICAkKCcuT3ZlcmxheSBiJykuaHRtbChuYW1lKTtcbiAgICAgICQoJy5PdmVybGF5IHNwYW4nKS5odG1sKGpvYik7XG4gICAgICAkKCcuT3ZlcmxheSBwJykuaHRtbCh0ZXh0KTtcbiAgICB9XG4gIH0pO1xuXG4gICQoJy5PdmVybGF5LUNsb3NlLCAuT3ZlcmxheS1CRycpLm9uKCdjbGljaycsICgpID0+IHtcbiAgICAkKCcuT3ZlcmxheScpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgfSlcblxuICAkKCcuRmlsdGVyLUl0ZW0nKS5vbignY2xpY2snLCBmdW5jdGlvbiBvbkNsaWNrKCkge1xuICAgIGNvbnN0IGZpbHRlclZhbHVlID0gJCh0aGlzKS5hdHRyKCdkYXRhLWZpbHRlcicpO1xuICAgIGZpbHRlci5pc290b3BlKHsgZmlsdGVyOiBmaWx0ZXJWYWx1ZSB9KTtcblxuICAgICQodGhpcylcbiAgICAgIC5hZGRDbGFzcygnYWN0aXZlJylcbiAgICAgIC5zaWJsaW5ncygpXG4gICAgICAucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICB9KTtcblxuICBsZXQgZmlsdGVyID0gJCgnLmZpbHRlci1jb250ZW50JykuaXNvdG9wZSgpO1xuXG4gICQoJy5ycy1oZWFkZXItbmF2X2Ryb3Bkb3duX2hvbGRlciBzcGFuJykub24oJ21vdXNlb3ZlcicsICgpID0+IHtcbiAgICAkKCcucnMtaGVhZGVyLW5hdl9kcm9wZG93bicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgfSk7XG5cbiAgJCgnLnJzLWhlYWRlci1uYXZfZHJvcGRvd25faG9sZGVyIHNwYW4nKS5vbignbW91c2VsZWF2ZScsICgpID0+IHtcbiAgICAkKCcucnMtaGVhZGVyLW5hdl9kcm9wZG93bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgfSk7XG5cbiAgaWYgKCQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlJykpIHtcbiAgICBjb25zdCAkaW50ZXJhY3RpdmVTbGlkZXIgPSAkKCcucnMtc2VjdGlvbi1pbnRlcmFjdGl2ZS1zbGlkZXInKTtcbiAgICAkaW50ZXJhY3RpdmVTbGlkZXIuc2xpY2soe1xuICAgICAgYXJyb3dzOiBmYWxzZSxcbiAgICAgIGZhZGU6IHRydWUsXG4gICAgICBzcGVlZDogODAwLFxuICAgICAgaW5pdGlhbFNsaWRlOiAwLFxuICAgICAgZHJhZ2dhYmxlOiBmYWxzZSxcbiAgICAgIGFkYXB0aXZlSGVpZ2h0OiB0cnVlLFxuICAgIH0pO1xuXG4gICAgJCgnLnJzLXNlY3Rpb24taW50ZXJhY3RpdmUtaXRlbSBidXR0b25bZGF0YS1pbmRleD1cIjBcIl0nKS5yZW1vdmVDbGFzcygnYnV0dG9uLS1vdXRsaW5lYm9yZGVyJyk7XG4gICAgJCgnLnJzLXNlY3Rpb24taW50ZXJhY3RpdmUtaXRlbSBidXR0b25bZGF0YS1pbmRleD1cIjBcIl0nKS5hZGRDbGFzcygnYnV0dG9uLS1ncmVlbmJvcmRlcicpO1xuICAgICQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlLWl0ZW0gYnV0dG9uW2RhdGEtaW5kZXg9XCIwXCJdJykucGFyZW50KCkubmV4dCgpLmNzcygnb3BhY2l0eScsIDEpO1xuXG4gICAgJCgnLnJzLXNlY3Rpb24taW50ZXJhY3RpdmUtaXRlbSBidXR0b24nKS5vbignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgIGlmICghJChldmVudC5jdXJyZW50VGFyZ2V0KS5oYXNDbGFzcygnYnV0dG9uLS1ncmVlbmJvcmRlcicpKSB7XG4gICAgICAgICQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlLWl0ZW0gYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2J1dHRvbi0tZ3JlZW5ib3JkZXInKTtcbiAgICAgICAgJCgnLnJzLXNlY3Rpb24taW50ZXJhY3RpdmUtaXRlbSBidXR0b24nKS5hZGRDbGFzcygnYnV0dG9uLS1vdXRsaW5lYm9yZGVyJyk7XG4gICAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkucmVtb3ZlQ2xhc3MoJ2J1dHRvbi0tb3V0bGluZWJvcmRlcicpO1xuICAgICAgICAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmFkZENsYXNzKCdidXR0b24tLWdyZWVuYm9yZGVyJyk7XG4gICAgICAgICQoJy5ycy1zZWN0aW9uLWludGVyYWN0aXZlLWl0ZW0gYnV0dG9uJykucGFyZW50KCkubmV4dCgpLmNzcygnb3BhY2l0eScsIDAuNSk7XG4gICAgICAgICQoZXZlbnQuY3VycmVudFRhcmdldCkucGFyZW50KCkubmV4dCgpLmNzcygnb3BhY2l0eScsIDEpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBpbmRleCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkuZGF0YSgnaW5kZXgnKTtcbiAgICAgICRpbnRlcmFjdGl2ZVNsaWRlci5zbGljaygnc2xpY2tHb1RvJywgaW5kZXgpO1xuICAgIH0pO1xuICB9XG59KVxuIl19
