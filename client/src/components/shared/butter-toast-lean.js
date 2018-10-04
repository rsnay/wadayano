/* eslint-disable */
/* From https://www.npmjs.com/package/butter-toast */
/* Package is listed as unlicensed */

(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("react"), require("react-dom"));
	else if(typeof define === 'function' && define.amd)
		define(["react", "react-dom"], factory);
	else {
		var a = typeof exports === 'object' ? factory(require("react"), require("react-dom")) : factory(root["React"], root["ReactDOM"]);
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(((() => 0).constructor("return this"))(), function(__WEBPACK_EXTERNAL_MODULE__1__, __WEBPACK_EXTERNAL_MODULE__17__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 19);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

module.exports = _assertThisInitialized;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__1__;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

if (false) { var throwOnDirectAccess, isValidElement, REACT_ELEMENT_TYPE; } else {
  // By explicitly using `prop-types` you are opting into new production behavior.
  // http://fb.me/prop-types-in-prod
  module.exports = __webpack_require__(21)();
}


/***/ }),
/* 3 */
/***/ (function(module, exports) {

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

module.exports = _defineProperty;

/***/ }),
/* 4 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return POS_TOP; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return POS_BOTTOM; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return POS_LEFT; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return POS_RIGHT; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return POS_CENTER; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return styles; });
var POS_TOP = 'POS_TOP';
var POS_BOTTOM = 'POS_BOTTOM';
var POS_LEFT = 'POS_LEFT';
var POS_RIGHT = 'POS_RIGHT';
var POS_CENTER = 'POS_CENTER';
var styleRight = {
  right: 0
};
var styleLeft = {
  left: 0
};
var styleCenter = {
  left: '50%'
};
var styleBottom = {
  bottom: '10px'
};
var styleTop = {
  top: '10px'
};
var styleBase = {
  position: 'fixed',
  zIndex: 99999
};
function styles() {
  var position = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var spacing = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

  if (position === null) {
    return {};
  }

  var vertical = position.vertical,
      horizontal = position.horizontal;
  return Object.assign({}, styleBase, vertical === POS_BOTTOM ? {
    bottom: "".concat(spacing, "px")
  } : {
    top: "".concat(spacing, "px")
  }, horizontal === POS_CENTER ? styleCenter : {}, horizontal === POS_LEFT ? styleLeft : {}, horizontal === POS_RIGHT ? styleRight : {});
}

/***/ }),
/* 5 */,
/* 6 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

// CONCATENATED MODULE: ./src/lib/generateId/index.js
function generateId(prefix) {
  var time = "".concat(Date.now()).slice(-8);
  var rand = "".concat(Math.random()).slice(2);
  var id = time + rand;
  return prefix ? "".concat(prefix, "_").concat(id) : time + rand;
}
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/typeof.js
var helpers_typeof = __webpack_require__(16);
var typeof_default = /*#__PURE__*/__webpack_require__.n(helpers_typeof);

// EXTERNAL MODULE: external {"root":"React","commonjs2":"react","commonjs":"react","amd":"react"}
var external_root_React_commonjs2_react_commonjs_react_amd_react_ = __webpack_require__(1);
var external_root_React_commonjs2_react_commonjs_react_amd_react_default = /*#__PURE__*/__webpack_require__.n(external_root_React_commonjs2_react_commonjs_react_amd_react_);

// CONCATENATED MODULE: ./src/lib/getRenderable/index.js


var FALLBACK_VALUE = null;

var getRenderable_getRenderable = function getRenderable(child) {
  var props = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  // React Elements
  if (external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.isValidElement(child)) {
    return external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.cloneElement(child, props);
  } // Stateless function constructors


  if (typeof child === 'function') {
    return child(props);
  } // Falsey values are not valid React nodes


  if (child === null || ['undefined', 'boolean'].includes(typeof_default()(child))) {
    return FALLBACK_VALUE;
  } // All other valid React nodes (strings, integers, etc.)


  return child;
};

/* harmony default export */ var lib_getRenderable = (getRenderable_getRenderable);
// CONCATENATED MODULE: ./src/lib/index.js
/* concated harmony reexport generateId */__webpack_require__.d(__webpack_exports__, "a", function() { return generateId; });
/* concated harmony reexport getRenderable */__webpack_require__.d(__webpack_exports__, "b", function() { return lib_getRenderable; });



/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

var defineProperty = __webpack_require__(3);

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);

    if (typeof Object.getOwnPropertySymbols === 'function') {
      ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
        return Object.getOwnPropertyDescriptor(source, sym).enumerable;
      }));
    }

    ownKeys.forEach(function (key) {
      defineProperty(target, key, source[key]);
    });
  }

  return target;
}

module.exports = _objectSpread;

/***/ }),
/* 8 */
/***/ (function(module, exports) {

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

module.exports = _classCallCheck;

/***/ }),
/* 9 */
/***/ (function(module, exports) {

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

module.exports = _createClass;

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

var _typeof = __webpack_require__(16);

var assertThisInitialized = __webpack_require__(0);

function _possibleConstructorReturn(self, call) {
  if (call && (_typeof(call) === "object" || typeof call === "function")) {
    return call;
  }

  return assertThisInitialized(self);
}

module.exports = _possibleConstructorReturn;

/***/ }),
/* 11 */
/***/ (function(module, exports) {

function _getPrototypeOf(o) {
  module.exports = _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

module.exports = _getPrototypeOf;

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

var setPrototypeOf = __webpack_require__(20);

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) setPrototypeOf(subClass, superClass);
}

module.exports = _inherits;

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

var objectWithoutPropertiesLoose = __webpack_require__(23);

function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = objectWithoutPropertiesLoose(source, excluded);
  var key, i;

  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);

    for (i = 0; i < sourceSymbolKeys.length; i++) {
      key = sourceSymbolKeys[i];
      if (excluded.indexOf(key) >= 0) continue;
      if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue;
      target[key] = source[key];
    }
  }

  return target;
}

module.exports = _objectWithoutProperties;

/***/ }),
/* 14 */,
/* 15 */,
/* 16 */
/***/ (function(module, exports) {

function _typeof2(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof2 = function _typeof2(obj) { return typeof obj; }; } else { _typeof2 = function _typeof2(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof2(obj); }

function _typeof(obj) {
  if (typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol") {
    module.exports = _typeof = function _typeof(obj) {
      return _typeof2(obj);
    };
  } else {
    module.exports = _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : _typeof2(obj);
    };
  }

  return _typeof(obj);
}

module.exports = _typeof;

/***/ }),
/* 17 */
/***/ (function(module, exports) {

module.exports = __WEBPACK_EXTERNAL_MODULE__17__;

/***/ }),
/* 18 */,
/* 19 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/objectSpread.js
var objectSpread = __webpack_require__(7);
var objectSpread_default = /*#__PURE__*/__webpack_require__.n(objectSpread);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/classCallCheck.js
var classCallCheck = __webpack_require__(8);
var classCallCheck_default = /*#__PURE__*/__webpack_require__.n(classCallCheck);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/createClass.js
var createClass = __webpack_require__(9);
var createClass_default = /*#__PURE__*/__webpack_require__.n(createClass);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/possibleConstructorReturn.js
var possibleConstructorReturn = __webpack_require__(10);
var possibleConstructorReturn_default = /*#__PURE__*/__webpack_require__.n(possibleConstructorReturn);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/getPrototypeOf.js
var getPrototypeOf = __webpack_require__(11);
var getPrototypeOf_default = /*#__PURE__*/__webpack_require__.n(getPrototypeOf);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/inherits.js
var inherits = __webpack_require__(12);
var inherits_default = /*#__PURE__*/__webpack_require__.n(inherits);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/assertThisInitialized.js
var assertThisInitialized = __webpack_require__(0);
var assertThisInitialized_default = /*#__PURE__*/__webpack_require__.n(assertThisInitialized);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/defineProperty.js
var defineProperty = __webpack_require__(3);
var defineProperty_default = /*#__PURE__*/__webpack_require__.n(defineProperty);

// EXTERNAL MODULE: external {"root":"React","commonjs2":"react","commonjs":"react","amd":"react"}
var external_root_React_commonjs2_react_commonjs_react_amd_react_ = __webpack_require__(1);
var external_root_React_commonjs2_react_commonjs_react_amd_react_default = /*#__PURE__*/__webpack_require__.n(external_root_React_commonjs2_react_commonjs_react_amd_react_);

// EXTERNAL MODULE: external {"root":"ReactDOM","commonjs2":"react-dom","commonjs":"react-dom","amd":"react-dom"}
var external_root_ReactDOM_commonjs2_react_dom_commonjs_react_dom_amd_react_dom_ = __webpack_require__(17);
var external_root_ReactDOM_commonjs2_react_dom_commonjs_react_dom_amd_react_dom_default = /*#__PURE__*/__webpack_require__.n(external_root_ReactDOM_commonjs2_react_dom_commonjs_react_dom_amd_react_dom_);

// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(2);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);

// EXTERNAL MODULE: ./src/lib/index.js + 2 modules
var lib = __webpack_require__(6);

// EXTERNAL MODULE: ./src/ButterToast/styles.js
var styles = __webpack_require__(4);

// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/objectWithoutProperties.js
var objectWithoutProperties = __webpack_require__(13);
var objectWithoutProperties_default = /*#__PURE__*/__webpack_require__.n(objectWithoutProperties);

// CONCATENATED MODULE: ./src/Tray/styles.js

var ulStyle = {
  position: 'relative',
  padding: 0,
  margin: 0,
  listStyleType: 'none'
};

var styles_liStyle = function liStyle(_ref) {
  var _ref$position = _ref.position,
      position = _ref$position === void 0 ? {
    vertical: styles["e" /* POS_TOP */],
    horizontal: styles["b" /* POS_CENTER */]
  } : _ref$position,
      spacing = _ref.spacing,
      offset = _ref.offset,
      height = _ref.height,
      _ref$index = _ref.index,
      index = _ref$index === void 0 ? 0 : _ref$index;
  var base = {
    position: 'absolute',
    transition: 'transform .3s',
    'transitionDelay': "".concat(index * .02, "s") // <- this creates a subtle elastic stacking/collapsing effect. Sort of a chain-reaction effect.

  };
  var translateY;

  if (offset === 0 && !height && position.vertical === styles["e" /* POS_TOP */]) {
    translateY = 'translateY(-100%)';
  } else {
    translateY = "translateY(".concat(offset, "px)");
  }

  switch (position.horizontal) {
    case styles["d" /* POS_RIGHT */]:
      base.right = "".concat(spacing, "px");
      base.transform = translateY;
      break;

    case styles["b" /* POS_CENTER */]:
      base.transform = "translateX(-50%) ".concat(translateY);
      break;

    default:
      base.left = "".concat(spacing, "px");
      base.transform = translateY;
      break;
  }

  return base;
};


// CONCATENATED MODULE: ./src/Toast/style.js
var toastStyle = function toastStyle(_ref) {
  var shown = _ref.shown,
      removed = _ref.removed;
  var base = {
    opacity: 0,
    transition: 'opacity .5s'
  };

  if (shown) {
    Object.assign(base, {
      opacity: 1,
      transform: 'scale(1)'
    });
  }

  if (removed) {
    Object.assign(base, {
      transform: 'scale(.9)',
      transition: 'opacity .3s, transform .3s'
    });
  }

  return base;
};
// EXTERNAL MODULE: ./node_modules/classnames/index.js
var classnames = __webpack_require__(24);

// CONCATENATED MODULE: ./src/Toast/index.js














var Toast_Toast =
/*#__PURE__*/
function (_Component) {
  inherits_default()(Toast, _Component);

  function Toast() {
    var _getPrototypeOf2;

    var _this;

    classCallCheck_default()(this, Toast);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = possibleConstructorReturn_default()(this, (_getPrototypeOf2 = getPrototypeOf_default()(Toast)).call.apply(_getPrototypeOf2, [this].concat(args)));

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "state", {
      shown: false
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "createRef", function () {
      var ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
        addEventListener: function addEventListener() {
          return null;
        }
      };
      _this.toastRef = ref;
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "open", function () {
      return _this.setState({
        isOpen: true
      }, _this.toastDidOpen);
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "startTimeout", function () {
      var toast = _this.props.toast;

      if (toast.sticky) {
        return;
      } // if no `remaining`, just use the toast's timeout


      var timeout = typeof _this.remaining === 'number' ? _this.remaining : toast.timeout;
      var add = timeout < 200 ? 200 : 0;

      _this.clearTimeout();

      _this.timeout = setTimeout(_this.close, timeout + add);
      _this.ends = Date.now() + timeout + add;
      _this.remaining = undefined;
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "clearTimeout", function () {
      if (_this.props.toast.sticky) {
        return;
      }

      _this.remaining = _this.calcRemaining();
      clearTimeout(_this.timeout);
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "calcRemaining", function () {
      return _this.ends - Date.now();
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "close", function () {
      var toastRef = _this.toastRef;

      _this.clearTimeout();

      var remove = function remove() {
        return _this.setState({
          isOpen: false
        }, _this.props.remove);
      };

      _this.setState({
        shown: false,
        removed: true
      }, function () {
        toastRef.addEventListener('transitionend', function cb(e) {
          if (e.target === toastRef) {
            toastRef.removeEventListener(e.type, cb);
            remove();
          }
        });
      });
    });

    return _this;
  }

  createClass_default()(Toast, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      setTimeout(this.open);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      this.clearTimeout();
    }
  }, {
    key: "toastDidOpen",
    value: function toastDidOpen() {
      var _this2 = this;

      var ref = this.toastRef;
      var _this$props = this.props,
          setHeight = _this$props.setHeight,
          toast = _this$props.toast;
      setTimeout(function () {
        _this2.setState({
          shown: true
        }, function () {
          setHeight(toast.id, ref.clientHeight);

          _this2.startTimeout();
        });
      });
    }
  }, {
    key: "render",
    value: function render() {
      var _this3 = this;

      var _this$props2 = this.props,
          dismiss = _this$props2.dismiss,
          toast = _this$props2.toast,
          pauseOnHover = _this$props2.pauseOnHover,
          position = _this$props2.position,
          props = objectWithoutProperties_default()(_this$props2, ["dismiss", "toast", "pauseOnHover", "position"]);

      var _this$state = this.state,
          shown = _this$state.shown,
          removed = _this$state.removed;
      return external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.createElement("div", {
        ref: this.createRef,
        onMouseEnter: function onMouseEnter() {
          return pauseOnHover && _this3.clearTimeout();
        },
        onMouseLeave: function onMouseLeave() {
          return pauseOnHover && _this3.startTimeout();
        },
        style: toastStyle({
          shown: shown,
          removed: removed
        }),
        className: this.className
      }, Object(lib["b" /* getRenderable */])(toast.content, objectSpread_default()({
        toastId: toast.id,
        dismiss: this.dismiss,
        onClick: toast.onClick ? function (e) {
          return toast.onClick(e, toast, dismiss);
        } : undefined,
        calcRemaining: this.calcRemaining,
        trayPosition: position
      }, props)));
    }
  }, {
    key: "className",
    get: function get() {
      var _this4 = this;

      return ['shown', 'removed'].reduce(function (className, current) {
        return _this4.state[current] ? "".concat(className, " ").concat(current) : className;
      }, 'bt-toast');
    }
  }, {
    key: "dismiss",
    get: function get() {
      var _this$props3 = this.props,
          toast = _this$props3.toast,
          dismiss = _this$props3.dismiss;

      if (typeof toast.dismiss === 'function') {
        return function (e) {
          return toast.dismiss(e, toast, dismiss);
        };
      }

      return dismiss;
    }
  }]);

  return Toast;
}(external_root_React_commonjs2_react_commonjs_react_amd_react_["Component"]);

/* harmony default export */ var src_Toast = (Toast_Toast);
Toast_Toast.defaultProps = {
  pauseOnHover: true,
  toast: {}
};
// CONCATENATED MODULE: ./src/Tray/index.js

















var Tray_Tray =
/*#__PURE__*/
function (_Component) {
  inherits_default()(Tray, _Component);

  function Tray(props) {
    var _this;

    classCallCheck_default()(this, Tray);

    _this = possibleConstructorReturn_default()(this, getPrototypeOf_default()(Tray).call(this, props));

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "state", {
      toasts: []
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "id", Object(lib["a" /* generateId */])('tray'));

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "toasts", {});

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "createToastRef", function (id, ref) {
      if (!id) {
        return;
      }

      if (!ref) {
        delete _this.toasts[id];
        return;
      }

      _this.toasts[id] = ref;
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "push", function () {
      var payload = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var timeout = _this.props.timeout;

      _this.setState(function (prevState) {
        var nextState = Object.assign({}, prevState);
        nextState.toasts = [objectSpread_default()({
          timeout: timeout
        }, payload)].concat(nextState.toasts);
        return nextState;
      });
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "remove", function (id) {
      _this.setState(function (prevState) {
        var nextState = Object.assign({}, prevState);
        nextState.toasts = nextState.toasts.filter(function (toast) {
          return toast.id !== id;
        });
        return nextState;
      });
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "dismiss", function (id) {
      if (_this.toasts[id] && _this.toasts[id].close) {
        _this.toasts[id].close();
      }
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "dismissAll", function () {
      for (var toast in _this.toasts) {
        _this.dismiss(toast);
      }
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "setHeight", function (id, height) {
      _this.setState(function (prevState) {
        var nextState = Object.assign({}, prevState);
        var index = nextState.toasts.findIndex(function (toast) {
          return toast.id === id;
        });
        nextState.toasts[index].height = height;
        return nextState;
      });
    });

    _this.onButterToast = _this.onButterToast.bind(assertThisInitialized_default()(assertThisInitialized_default()(_this)));
    return _this;
  }

  createClass_default()(Tray, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      window.addEventListener(CUSTOM_EVENT_NAME, this.onButterToast);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      window.removeEventListener(CUSTOM_EVENT_NAME, this.onButterToast);
    }
  }, {
    key: "onButterToast",
    value: function onButterToast() {
      var _this2 = this;

      var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
          detail = _ref.detail;

      var namespace = detail.namespace,
          dismissBy = detail.dismissBy,
          payload = objectWithoutProperties_default()(detail, ["namespace", "dismissBy"]);

      if (namespace && namespace !== this.props.namespace) {
        return;
      }

      if (!dismissBy) {
        return setTimeout(function () {
          return _this2.push(payload);
        });
      }

      dismissBy === 'all' ? this.dismissAll() : this.dismiss(dismissBy);
    }
  }, {
    key: "render",
    value: function render() {
      var _this3 = this;

      var toasts = this.state.toasts;
      var _this$props = this.props,
          position = _this$props.position,
          spacing = _this$props.spacing;
      var offset = 0;
      return external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.createElement("ul", {
        style: ulStyle
      }, toasts.map(function (toast, index) {
        if (!toast) {
          return null;
        }

        var height = toast.height || 0;
        var currentOffset;
        currentOffset = offset;
        offset += height + spacing;

        if (position && position.vertical === styles["a" /* POS_BOTTOM */]) {
          currentOffset = -currentOffset - height;
        }

        var style = styles_liStyle({
          offset: currentOffset,
          spacing: spacing,
          position: position,
          height: toast.height,
          index: index
        });
        return external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.createElement("li", {
          key: toast.id,
          style: style
        }, external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.createElement(src_Toast, {
          dismiss: function dismiss() {
            return _this3.dismiss(toast.id);
          },
          remove: function remove() {
            return _this3.remove(toast.id);
          },
          setHeight: _this3.setHeight,
          position: position,
          ref: function ref(_ref2) {
            return _this3.createToastRef(toast.id, _ref2);
          },
          toast: toast
        }));
      }));
    }
  }]);

  return Tray;
}(external_root_React_commonjs2_react_commonjs_react_amd_react_["Component"]);

/* harmony default export */ var src_Tray = (Tray_Tray);
// CONCATENATED MODULE: ./src/ButterToast/index.js
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "CUSTOM_EVENT_NAME", function() { return CUSTOM_EVENT_NAME; });














var CUSTOM_EVENT_NAME = 'ButterToast';

function dispatchCustomEvent(payload) {
  var event;
  var detail = Object.assign({
    namespace: ''
  }, payload);

  if (typeof window.CustomEvent === 'function') {
    event = new CustomEvent(CUSTOM_EVENT_NAME, {
      detail: detail
    });
  } else {
    event = document.createEvent('CustomEvent');
    event.initCustomEvent(CUSTOM_EVENT_NAME, false, false, detail);
  }

  window.dispatchEvent(event);
}

var ButterToast_ButterToast =
/*#__PURE__*/
function (_Component) {
  inherits_default()(ButterToast, _Component);

  function ButterToast() {
    var _getPrototypeOf2;

    var _this;

    classCallCheck_default()(this, ButterToast);

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = possibleConstructorReturn_default()(this, (_getPrototypeOf2 = getPrototypeOf_default()(ButterToast)).call.apply(_getPrototypeOf2, [this].concat(args)));

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "raise", function () {
      var payload = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var id = Object(lib["a" /* generateId */])();

      _this.tray.push(objectSpread_default()({
        id: id
      }, payload));

      return id;
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "dismiss", function (id) {
      return _this.tray.push(id);
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "dismissAll", function () {
      return _this.tray.dismissAll();
    });

    defineProperty_default()(assertThisInitialized_default()(assertThisInitialized_default()(_this)), "createTrayRef", function (ref) {
      window._btTrays = window._btTrays || {};

      if (!ref) {
        return;
      }

      _this.id = ref.id;
      _this.tray = ref;
      window._btTrays[ref.id] = ref;
    });

    return _this;
  }

  createClass_default()(ButterToast, [{
    key: "componentDidMount",
    value: function componentDidMount() {
      if (this.props.renderInContext) {
        return;
      }

      var _this$props = this.props,
          position = _this$props.position,
          timeout = _this$props.timeout,
          spacing = _this$props.spacing,
          namespace = _this$props.namespace;
      var style = Object(styles["f" /* default */])(position, spacing);
      this.root = document.createElement('aside');
      this.root.setAttribute('class', this.className);
      Object.assign(this.root.style, style);
      document.body.appendChild(this.root);
      external_root_ReactDOM_commonjs2_react_dom_commonjs_react_dom_amd_react_dom_default.a.render(external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.createElement(src_Tray, {
        ref: this.createTrayRef,
        namespace: namespace,
        spacing: spacing,
        timeout: timeout,
        position: position
      }), this.root);
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      if (!this.root) {
        return;
      }

      delete window._btTrays[this.id];
      external_root_ReactDOM_commonjs2_react_dom_commonjs_react_dom_amd_react_dom_default.a.unmountComponentAtNode(this.root);
      this.root.parentNode.removeChild(this.root);
      delete this.root;
    }
  }, {
    key: "render",
    value: function render() {
      var _this$props2 = this.props,
          renderInContext = _this$props2.renderInContext,
          timeout = _this$props2.timeout,
          spacing = _this$props2.spacing,
          namespace = _this$props2.namespace,
          position = _this$props2.position;

      if (renderInContext) {
        return external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.createElement("aside", {
          className: this.className
        }, external_root_React_commonjs2_react_commonjs_react_amd_react_default.a.createElement(src_Tray, {
          ref: this.createTrayRef,
          position: position,
          namespace: namespace,
          spacing: spacing,
          timeout: timeout
        }));
      } else {
        return null;
      }
    }
  }, {
    key: "className",
    get: function get() {
      var _this$props3 = this.props,
          className = _this$props3.className,
          namespace = _this$props3.namespace;
      return [className, namespace].reduce(function (className, current) {
        return current ? "".concat(className, " ").concat(current) : className;
      }, 'butter-toast');
    }
  }], [{
    key: "raise",
    value: function raise() {
      var payload = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var id = Object(lib["a" /* generateId */])();
      dispatchCustomEvent(objectSpread_default()({
        id: id
      }, payload));
      return id;
    }
  }, {
    key: "dismiss",
    value: function dismiss(id) {
      dispatchCustomEvent({
        dismissBy: id
      });
    }
  }, {
    key: "dismissAll",
    value: function dismissAll(id) {
      dispatchCustomEvent({
        dismissBy: 'all'
      });
    }
  }]);

  return ButterToast;
}(external_root_React_commonjs2_react_commonjs_react_amd_react_["Component"]);

ButterToast_ButterToast.propTypes = {
  renderInContext: prop_types_default.a.bool,
  className: prop_types_default.a.string,
  namespace: prop_types_default.a.string,
  position: prop_types_default.a.shape({
    vertical: prop_types_default.a.oneOf([styles["e" /* POS_TOP */], styles["a" /* POS_BOTTOM */]]),
    horizontal: prop_types_default.a.oneOf([styles["c" /* POS_LEFT */], styles["d" /* POS_RIGHT */], styles["b" /* POS_CENTER */]])
  }),
  timout: prop_types_default.a.number,
  spacing: prop_types_default.a.number
};
ButterToast_ButterToast.defaultProps = {
  className: '',
  namespace: '',
  position: {
    vertical: styles["e" /* POS_TOP */],
    horizontal: styles["d" /* POS_RIGHT */]
  },
  timeout: 6000,
  spacing: 10
};
/* harmony default export */ var src_ButterToast = __webpack_exports__["default"] = (ButterToast_ButterToast);

/***/ }),
/* 20 */
/***/ (function(module, exports) {

function _setPrototypeOf(o, p) {
  module.exports = _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

module.exports = _setPrototypeOf;

/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */



var ReactPropTypesSecret = __webpack_require__(22);

function emptyFunction() {}

module.exports = function() {
  function shim(props, propName, componentName, location, propFullName, secret) {
    if (secret === ReactPropTypesSecret) {
      // It is still safe when called from React.
      return;
    }
    var err = new Error(
      'Calling PropTypes validators directly is not supported by the `prop-types` package. ' +
      'Use PropTypes.checkPropTypes() to call them. ' +
      'Read more at http://fb.me/use-check-prop-types'
    );
    err.name = 'Invariant Violation';
    throw err;
  };
  shim.isRequired = shim;
  function getShim() {
    return shim;
  };
  // Important!
  // Keep this list in sync with production version in `./factoryWithTypeCheckers.js`.
  var ReactPropTypes = {
    array: shim,
    bool: shim,
    func: shim,
    number: shim,
    object: shim,
    string: shim,
    symbol: shim,

    any: shim,
    arrayOf: getShim,
    element: shim,
    instanceOf: getShim,
    node: shim,
    objectOf: getShim,
    oneOf: getShim,
    oneOfType: getShim,
    shape: getShim,
    exact: getShim
  };

  ReactPropTypes.checkPropTypes = emptyFunction;
  ReactPropTypes.PropTypes = ReactPropTypes;

  return ReactPropTypes;
};


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */



var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

module.exports = ReactPropTypesSecret;


/***/ }),
/* 23 */
/***/ (function(module, exports) {

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

module.exports = _objectWithoutPropertiesLoose;

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
  Copyright (c) 2017 Jed Watson.
  Licensed under the MIT License (MIT), see
  http://jedwatson.github.io/classnames
*/
/* global define */

(function () {
	'use strict';

	var hasOwn = {}.hasOwnProperty;

	function classNames () {
		var classes = [];

		for (var i = 0; i < arguments.length; i++) {
			var arg = arguments[i];
			if (!arg) continue;

			var argType = typeof arg;

			if (argType === 'string' || argType === 'number') {
				classes.push(arg);
			} else if (Array.isArray(arg) && arg.length) {
				var inner = classNames.apply(null, arg);
				if (inner) {
					classes.push(inner);
				}
			} else if (argType === 'object') {
				for (var key in arg) {
					if (hasOwn.call(arg, key) && arg[key]) {
						classes.push(key);
					}
				}
			}
		}

		return classes.join(' ');
	}

	if (typeof module !== 'undefined' && module.exports) {
		classNames.default = classNames;
		module.exports = classNames;
	} else if (true) {
		// register as 'classnames', consistent with npm package name
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = (function () {
			return classNames;
		}).apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	} else {}
}());


/***/ })
/******/ ]);
});
//# sourceMappingURL=lean.js.map