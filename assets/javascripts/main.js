(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Popper = factory());
}(this, (function () { 'use strict';

var nativeHints = ['native code', '[object MutationObserverConstructor]'];

/**
 * Determine if a function is implemented natively (as opposed to a polyfill).
 * @method
 * @memberof Popper.Utils
 * @argument {Function | undefined} fn the function to check
 * @returns {Boolean}
 */
var isNative = (function (fn) {
  return nativeHints.some(function (hint) {
    return (fn || '').toString().indexOf(hint) > -1;
  });
});

var isBrowser = typeof window !== 'undefined';
var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var scheduled = false;
  var i = 0;
  var elem = document.createElement('span');

  // MutationObserver provides a mechanism for scheduling microtasks, which
  // are scheduled *before* the next task. This gives us a way to debounce
  // a function but ensure it's called *before* the next paint.
  var observer = new MutationObserver(function () {
    fn();
    scheduled = false;
  });

  observer.observe(elem, { attributes: true });

  return function () {
    if (!scheduled) {
      scheduled = true;
      elem.setAttribute('x-index', i);
      i = i + 1; // don't use compund (+=) because it doesn't get optimized in V8
    }
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

// It's common for MutationObserver polyfills to be seen in the wild, however
// these rely on Mutation Events which only occur when an element is connected
// to the DOM. The algorithm used in this module does not use a connected element,
// and so we must ensure that a *native* MutationObserver is available.
var supportsNativeMutationObserver = isBrowser && isNative(window.MutationObserver);

/**
* Create a debounced version of a method, that's asynchronously deferred
* but called in the minimum time possible.
*
* @method
* @memberof Popper.Utils
* @argument {Function} fn
* @returns {Function}
*/
var debounce = supportsNativeMutationObserver ? microtaskDebounce : taskDebounce;

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
  Object.keys(styles).forEach(function (prop) {
    var unit = '';
    // add unit if the value is numeric and is one of the following
    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Any} functionToCheck - variable to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  var css = window.getComputedStyle(element, null);
  return property ? css[property] : css;
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} scroll parent
 */
function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element || ['HTML', 'BODY', '#document'].indexOf(element.nodeName) !== -1) {
    return window.document.body;
  }

  // Firefox want us to check `-x` and `-y` variations as well

  var _getStyleComputedProp = getStyleComputedProperty(element),
      overflow = _getStyleComputedProp.overflow,
      overflowX = _getStyleComputedProp.overflowX,
      overflowY = _getStyleComputedProp.overflowY;

  if (/(auto|scroll)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

function isOffsetContainer(element) {
  var nodeName = element.nodeName;

  if (nodeName === 'BODY') {
    return false;
  }
  return nodeName === 'HTML' || element.firstElementChild.offsetParent === element;
}

/**
 * Finds the root node (document, shadowDOM root) of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} node
 * @returns {Element} root node
 */
function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  // NOTE: 1 DOM access here
  var offsetParent = element && element.offsetParent;
  var nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return window.document.documentElement;
  }

  return offsetParent;
}

/**
 * Finds the offset parent common to the two provided nodes
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element1
 * @argument {Element} element2
 * @returns {Element} common offset parent
 */
function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return window.document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
  var start = order ? element1 : element2;
  var end = order ? element2 : element1;

  // Get common ancestor container
  var range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;

  // Both nodes are inside #document

  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  var element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

/**
 * Gets the scroll value of the given element in the given side (top and left)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {String} side `top` or `left`
 * @returns {number} amount of scrolled pixels
 */
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  var nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    var html = window.document.documentElement;
    var scrollingElement = window.document.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

/*
 * Sum or subtract the element scroll values (left and top) from a given rect object
 * @method
 * @memberof Popper.Utils
 * @param {Object} rect - Rect object you want to change
 * @param {HTMLElement} element - The element from the function reads the scroll values
 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
 * @return {Object} rect - The modifier rect object
 */
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var scrollTop = getScroll(element, 'top');
  var scrollLeft = getScroll(element, 'left');
  var modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

/*
 * Helper to detect borders of a given element
 * @method
 * @memberof Popper.Utils
 * @param {CSSStyleDeclaration} styles
 * Result of `getStyleComputedProperty` on the given element
 * @param {String} axis - `x` or `y`
 * @return {number} borders - The borders size of the given axis
 */

function getBordersSize(styles, axis) {
  var sideA = axis === 'x' ? 'Left' : 'Top';
  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return +styles['border' + sideA + 'Width'].split('px')[0] + +styles['border' + sideB + 'Width'].split('px')[0];
}

/**
 * Tells if you are running Internet Explorer 10
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean} isIE10
 */
var isIE10 = undefined;

var isIE10$1 = function () {
  if (isIE10 === undefined) {
    isIE10 = navigator.appVersion.indexOf('MSIE 10') !== -1;
  }
  return isIE10;
};

function getSize(axis, body, html, computedStyle) {
  return Math.max(body['offset' + axis], html['client' + axis], html['offset' + axis], isIE10$1() ? html['offset' + axis] + computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')] + computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')] : 0);
}

function getWindowSizes() {
  var body = window.document.body;
  var html = window.document.documentElement;
  var computedStyle = isIE10$1() && window.getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle)
  };
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
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
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect(offsets) {
  return _extends({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
  var rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  if (isIE10$1()) {
    try {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, 'top');
      var scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    } catch (err) {}
  } else {
    rect = element.getBoundingClientRect();
  }

  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  };

  // subtract scrollbar size from sizes
  var sizes = element.nodeName === 'HTML' ? getWindowSizes() : {};
  var width = sizes.width || element.clientWidth || result.right - result.left;
  var height = sizes.height || element.clientHeight || result.bottom - result.top;

  var horizScrollbar = element.offsetWidth - width;
  var vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    var styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var isIE10 = isIE10$1();
  var isHTML = parent.nodeName === 'HTML';
  var childrenRect = getBoundingClientRect(children);
  var parentRect = getBoundingClientRect(parent);
  var scrollParent = getScrollParent(children);
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top,
    left: childrenRect.left - parentRect.left,
    width: childrenRect.width,
    height: childrenRect.height
  });

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (isHTML || parent.nodeName === 'BODY') {
    var styles = getStyleComputedProperty(parent);
    var borderTopWidth = isIE10 && isHTML ? 0 : +styles.borderTopWidth.split('px')[0];
    var borderLeftWidth = isIE10 && isHTML ? 0 : +styles.borderLeftWidth.split('px')[0];
    var marginTop = isIE10 && isHTML ? 0 : +styles.marginTop.split('px')[0];
    var marginLeft = isIE10 && isHTML ? 0 : +styles.marginLeft.split('px')[0];

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (isIE10 ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var html = window.document.documentElement;
  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  var width = Math.max(html.clientWidth, window.innerWidth || 0);
  var height = Math.max(html.clientHeight, window.innerHeight || 0);

  var scrollTop = getScroll(html);
  var scrollLeft = getScroll(html, 'left');

  var offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width: width,
    height: height
  };

  return getClientRect(offset);
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  return isFixed(getParentNode(element));
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} popper
 * @param {HTMLElement} reference
 * @param {number} padding
 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, reference, padding, boundariesElement) {
  // NOTE: 1 DOM access here
  var boundaries = { top: 0, left: 0 };
  var offsetParent = findCommonOffsetParent(popper, reference);

  // Handle viewport case
  if (boundariesElement === 'viewport') {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent);
  } else {
    // Handle other cases based on DOM element used as boundaries
    var boundariesNode = void 0;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(popper));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = window.document.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = window.document.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent);

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(),
          height = _getWindowSizes.height,
          width = _getWindowSizes.width;

      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  boundaries.left += padding;
  boundaries.top += padding;
  boundaries.right -= padding;
  boundaries.bottom -= padding;

  return boundaries;
}

function getArea(_ref) {
  var width = _ref.width,
      height = _ref.height;

  return width * height;
}

/**
 * Utility used to transform the `auto` placement to the placement with more
 * available space.
 * @method
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

  var rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  };

  var sortedAreas = Object.keys(rects).map(function (key) {
    return _extends({
      key: key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function (a, b) {
    return b.area - a.area;
  });

  var filteredAreas = sortedAreas.filter(function (_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  });

  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

  var variation = placement.split('-')[1];

  return computedPlacement + (variation ? '-' + variation : '');
}

/**
 * Get offsets to the reference element
 * @method
 * @memberof Popper.Utils
 * @param {Object} state
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getReferenceOffsets(state, popper, reference) {
  var commonOffsetParent = findCommonOffsetParent(popper, reference);
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent);
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
  var styles = window.getComputedStyle(element);
  var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
  var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
  var result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x
  };
  return result;
}

/**
 * Get the opposite placement of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Object} position - CSS position the Popper will get applied
 * @param {HTMLElement} popper - the popper element
 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
 * @param {String} placement - one of the valid placement options
 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
 */
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  var popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  var popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  var mainSide = isHoriz ? 'top' : 'left';
  var secondarySide = isHoriz ? 'left' : 'top';
  var measurement = isHoriz ? 'height' : 'width';
  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

/**
 * Mimics the `find` method of Array
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(function (cur) {
      return cur[prop] === value;
    });
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  var match = find(arr, function (obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}

/**
 * Loop trough the list of modifiers and run them in order,
 * each of them will then edit the data object.
 * @method
 * @memberof Popper.Utils
 * @param {dataObject} data
 * @param {Array} modifiers
 * @param {String} ends - Optional modifier name used as stopper
 * @returns {dataObject}
 */
function runModifiers(modifiers, data, ends) {
  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(function (modifier) {
    if (modifier.function) {
      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
    }
    var fn = modifier.function || modifier.fn;
    if (modifier.enabled && isFunction(fn)) {
      data = fn(data, modifier);
    }
  });

  return data;
}

/**
 * Updates the position of the popper, computing the new offsets and applying
 * the new style.<br />
 * Prefer `scheduleUpdate` over `update` because of performance reasons.
 * @method
 * @memberof Popper
 */
function update() {
  // if popper is destroyed, don't perform any further update
  if (this.state.isDestroyed) {
    return;
  }

  var data = {
    instance: this,
    styles: {},
    attributes: {},
    flipped: false,
    offsets: {}
  };

  // compute reference element offsets
  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

  // store the computed placement inside `originalPlacement`
  data.originalPlacement = data.placement;

  // compute the popper offsets
  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);
  data.offsets.popper.position = 'absolute';

  // run the modifiers
  data = runModifiers(this.modifiers, data);

  // the first `update` will call `onCreate` callback
  // the other ones will call `onUpdate` callback
  if (!this.state.isCreated) {
    this.state.isCreated = true;
    this.options.onCreate(data);
  } else {
    this.options.onUpdate(data);
  }
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase)
 */
function getSupportedPropertyName(property) {
  var prefixes = [false, 'ms', 'webkit', 'moz', 'o'];
  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (var i = 0; i < prefixes.length - 1; i++) {
    var prefix = prefixes[i];
    var toCheck = prefix ? '' + prefix + upperProp : property;
    if (typeof window.document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

/**
 * Destroy the popper
 * @method
 * @memberof Popper
 */
function destroy() {
  this.state.isDestroyed = true;

  // touch DOM only if `applyStyle` modifier is enabled
  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
    this.popper.removeAttribute('x-placement');
    this.popper.style.left = '';
    this.popper.style.position = '';
    this.popper.style.top = '';
    this.popper.style[getSupportedPropertyName('transform')] = '';
  }

  this.disableEventListeners();

  // remove the popper if user explicity asked for the deletion on destroy
  // do not use `remove` because IE11 doesn't support it
  if (this.options.removeOnDestroy) {
    this.popper.parentNode.removeChild(this.popper);
  }
  return this;
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  var isBody = scrollParent.nodeName === 'BODY';
  var target = isBody ? window : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
  }
  scrollParents.push(target);
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  window.addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  var scrollElement = getScrollParent(reference);
  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

/**
 * It will add resize/scroll events and start recalculating
 * position of the popper element when they are triggered.
 * @method
 * @memberof Popper
 */
function enableEventListeners() {
  if (!this.state.eventsEnabled) {
    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
  }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  window.removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(function (target) {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

/**
 * It will remove resize/scroll events and won't recalculate popper position
 * when they are triggered. It also won't trigger onUpdate callback anymore,
 * unless you call `update` method manually.
 * @method
 * @memberof Popper
 */
function disableEventListeners() {
  if (this.state.eventsEnabled) {
    window.cancelAnimationFrame(this.scheduleUpdate);
    this.state = removeEventListeners(this.reference, this.state);
  }
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function (prop) {
    var value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data, options) {
  // apply the final offsets to the popper
  // NOTE: 1 DOM access here
  var styles = {
    position: data.offsets.popper.position
  };

  var attributes = {
    'x-placement': data.placement
  };

  // round top and left to avoid blurry text
  var left = Math.round(data.offsets.popper.left);
  var top = Math.round(data.offsets.popper.top);

  // if gpuAcceleration is set to true and transform is supported,
  //  we use `translate3d` to apply the position to the popper we
  // automatically use the supported prefixed version if needed
  var prefixedProperty = getSupportedPropertyName('transform');
  if (options.gpuAcceleration && prefixedProperty) {
    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    styles.top = 0;
    styles.left = 0;
    styles.willChange = 'transform';
  } else {
    // othwerise, we use the standard `left` and `top` properties
    styles.left = left;
    styles.top = top;
    styles.willChange = 'top, left';
  }

  // any property present in `data.styles` will be applied to the popper,
  // in this way we can make the 3rd party modifiers add custom styles to it
  // Be aware, modifiers could override the properties defined in the previous
  // lines of this modifier!
  setStyles(data.instance.popper, _extends({}, styles, data.styles));

  // any property present in `data.attributes` will be applied to the popper,
  // they will be set as HTML attributes of the element
  setAttributes(data.instance.popper, _extends({}, attributes, data.attributes));

  // if the arrow style has been computed, apply the arrow style
  if (data.offsets.arrow) {
    setStyles(data.arrowElement, data.offsets.arrow);
  }

  return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used
 * to add margins to the popper margins needs to be calculated to get the
 * correct popper offsets.
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper.
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
  // compute reference element offsets
  var referenceOffsets = getReferenceOffsets(state, popper, reference);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

  popper.setAttribute('x-placement', placement);
  return options;
}

/**
 * Helper used to know if the given modifier depends from another one.<br />
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @param {Array} modifiers - list of modifiers
 * @param {String} requestingName - name of requesting modifier
 * @param {String} requestedName - name of requested modifier
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  var requesting = find(modifiers, function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  });

  var isRequired = !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });

  if (!isRequired) {
    var _requesting = '`' + requestingName + '`';
    var requested = '`' + requestedName + '`';
    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
  }
  return isRequired;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
  // arrow depends on keepTogether in order to work
  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
    return data;
  }

  var arrowElement = options.element;

  // if arrowElement is a string, suppose it's a CSS selector
  if (typeof arrowElement === 'string') {
    arrowElement = data.instance.popper.querySelector(arrowElement);

    // if arrowElement is not found, don't run the modifier
    if (!arrowElement) {
      return data;
    }
  } else {
    // if the arrowElement isn't a query selector we must check that the
    // provided DOM node is child of its popper node
    if (!data.instance.popper.contains(arrowElement)) {
      console.warn('WARNING: `arrow.element` must be child of its popper element!');
      return data;
    }
  }

  var placement = data.placement.split('-')[0];
  var popper = getClientRect(data.offsets.popper);
  var reference = data.offsets.reference;
  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

  var len = isVertical ? 'height' : 'width';
  var side = isVertical ? 'top' : 'left';
  var altSide = isVertical ? 'left' : 'top';
  var opSide = isVertical ? 'bottom' : 'right';
  var arrowElementSize = getOuterSizes(arrowElement)[len];

  //
  // extends keepTogether behavior making sure the popper and its reference have enough pixels in conjuction
  //

  // top/left side
  if (reference[opSide] - arrowElementSize < popper[side]) {
    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
  }
  // bottom/right side
  if (reference[side] + arrowElementSize > popper[opSide]) {
    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
  }

  // compute center of the popper
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

  // Compute the sideValue using the updated popper offsets
  var sideValue = center - getClientRect(data.offsets.popper)[side];

  // prevent arrowElement from being placed not contiguously to its popper
  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

  data.arrowElement = arrowElement;
  data.offsets.arrow = {};
  data.offsets.arrow[side] = Math.floor(sideValue);
  data.offsets.arrow[altSide] = ''; // make sure to unset any eventual altSide value from the DOM node

  return data;
}

/**
 * Get the opposite placement variation of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `auto`
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-right` (on the side with more space available, alignment depends by placement)
 *
 * @static
 * @type {Array}
 * @enum {String}
 * @readonly
 * @method placements
 * @memberof Popper
 */
var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

// Get rid of `auto` `auto-start` and `auto-end`
var validPlacements = placements.slice(3);

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement - A valid placement (it accepts variations)
 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements including their variations
 */
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var index = validPlacements.indexOf(placement);
  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

var BEHAVIORS = {
  FLIP: 'flip',
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
};

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
  // if `inner` modifier is enabled, we can't use the `flip` modifier
  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
    return data;
  }

  if (data.flipped && data.placement === data.originalPlacement) {
    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
    return data;
  }

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement);

  var placement = data.placement.split('-')[0];
  var placementOpposite = getOppositePlacement(placement);
  var variation = data.placement.split('-')[1] || '';

  var flipOrder = [];

  switch (options.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, true);
      break;
    default:
      flipOrder = options.behavior;
  }

  flipOrder.forEach(function (step, index) {
    if (placement !== step || flipOrder.length === index + 1) {
      return data;
    }

    placement = data.placement.split('-')[0];
    placementOpposite = getOppositePlacement(placement);

    var popperOffsets = getClientRect(data.offsets.popper);
    var refOffsets = data.offsets.reference;

    // using floor because the reference offsets may contain decimals we are not going to consider here
    var floor = Math.floor;
    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

    // flip the variation if required
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

    if (overlapsRef || overflowsBoundaries || flippedVariation) {
      // this boolean to detect any flip loop
      data.flipped = true;

      if (overlapsRef || overflowsBoundaries) {
        placement = flipOrder[index + 1];
      }

      if (flippedVariation) {
        variation = getOppositeVariation(variation);
      }

      data.placement = placement + (variation ? '-' + variation : '');

      // this object contains `position`, we want to preserve it along with
      // any additional property we may add in the future
      data.offsets.popper = _extends({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

      data = runModifiers(data.instance.modifiers, data, 'flip');
    }
  });
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
  var popper = getClientRect(data.offsets.popper);
  var reference = data.offsets.reference;
  var placement = data.placement.split('-')[0];
  var floor = Math.floor;
  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  var side = isVertical ? 'right' : 'bottom';
  var opSide = isVertical ? 'left' : 'top';
  var measurement = isVertical ? 'width' : 'height';

  if (popper[side] < floor(reference[opSide])) {
    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
  }
  if (popper[opSide] > floor(reference[side])) {
    data.offsets.popper[opSide] = floor(reference[side]);
  }

  return data;
}

/**
 * Converts a string containing value + unit into a px value number
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} str - Value + unit string
 * @argument {String} measurement - `height` or `width`
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @returns {Number|String}
 * Value in pixels, or original string if no values were extracted
 */
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  // separate value from unit
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
  var value = +split[1];
  var unit = split[2];

  // If it's not a number it's an operator, I guess
  if (!value) {
    return str;
  }

  if (unit.indexOf('%') === 0) {
    var element = void 0;
    switch (unit) {
      case '%p':
        element = popperOffsets;
        break;
      case '%':
      case '%r':
      default:
        element = referenceOffsets;
    }

    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === 'vh' || unit === 'vw') {
    // if is a vh or vw, we calculate the size based on the viewport
    var size = void 0;
    if (unit === 'vh') {
      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    } else {
      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }
    return size / 100 * value;
  } else {
    // if is an explicit pixel unit, we get rid of the unit and keep the value
    // if is an implicit unit, it's px, and we return just the value
    return value;
  }
}

/**
 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} offset
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @argument {String} basePlacement
 * @returns {Array} a two cells array with x and y offsets in numbers
 */
function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0];

  // Use height if placement is left or right and index is 0 otherwise use width
  // in this way the first offset will use an axis and the second one
  // will use the other one
  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

  // Split the offset string to obtain a list of values and operands
  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
    return frag.trim();
  });

  // Detect if the offset string contains a pair of values or a single one
  // they could be separated by comma or space
  var divider = fragments.indexOf(find(fragments, function (frag) {
    return frag.search(/,|\s/) !== -1;
  }));

  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
  }

  // If divider is found, we divide the list of values and operands to divide
  // them by ofset X and Y.
  var splitRegex = /\s*,\s*|\s+/;
  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

  // Convert the values with units to absolute pixels to allow our computations
  ops = ops.map(function (op, index) {
    // Most of the units rely on the orientation of the popper
    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
    var mergeWithPrevious = false;
    return op
    // This aggregates any `+` or `-` sign that aren't considered operators
    // e.g.: 10 + +5 => [10, +, +5]
    .reduce(function (a, b) {
      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
        a[a.length - 1] = b;
        mergeWithPrevious = true;
        return a;
      } else if (mergeWithPrevious) {
        a[a.length - 1] += b;
        mergeWithPrevious = false;
        return a;
      } else {
        return a.concat(b);
      }
    }, [])
    // Here we convert the string values into number values (in px)
    .map(function (str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  });

  // Loop trough the offsets arrays and execute the operations
  ops.forEach(function (op, index) {
    op.forEach(function (frag, index2) {
      if (isNumeric(frag)) {
        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
      }
    });
  });
  return offsets;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 * The offset value as described in the modifier description
 * @returns {Object} The data object, properly modified
 */
function offset(data, _ref) {
  var offset = _ref.offset;
  var placement = data.placement,
      _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var basePlacement = placement.split('-')[0];

  var offsets = void 0;
  if (isNumeric(+offset)) {
    offsets = [+offset, 0];
  } else {
    offsets = parseOffset(offset, popper, reference, basePlacement);
  }

  if (basePlacement === 'left') {
    popper.top += offsets[0];
    popper.left -= offsets[1];
  } else if (basePlacement === 'right') {
    popper.top += offsets[0];
    popper.left += offsets[1];
  } else if (basePlacement === 'top') {
    popper.left += offsets[0];
    popper.top -= offsets[1];
  } else if (basePlacement === 'bottom') {
    popper.left += offsets[0];
    popper.top += offsets[1];
  }

  data.popper = popper;
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);
  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement);
  options.boundaries = boundaries;

  var order = options.priority;
  var popper = getClientRect(data.offsets.popper);

  var check = {
    primary: function primary(placement) {
      var value = popper[placement];
      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
        value = Math.max(popper[placement], boundaries[placement]);
      }
      return defineProperty({}, placement, value);
    },
    secondary: function secondary(placement) {
      var mainSide = placement === 'right' ? 'left' : 'top';
      var value = popper[mainSide];
      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
      }
      return defineProperty({}, mainSide, value);
    }
  };

  order.forEach(function (placement) {
    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
    popper = _extends({}, popper, check[side](placement));
  });

  data.offsets.popper = popper;

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var shiftvariation = placement.split('-')[1];

  // if shift shiftvariation is specified, run the modifier
  if (shiftvariation) {
    var reference = data.offsets.reference;
    var popper = getClientRect(data.offsets.popper);
    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
    var side = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    var shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };

    data.offsets.popper = _extends({}, popper, shiftOffsets[shiftvariation]);
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
    return data;
  }

  var refRect = data.offsets.reference;
  var bound = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'preventOverflow';
  }).boundaries;

  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === true) {
      return data;
    }

    data.hide = true;
    data.attributes['x-out-of-boundaries'] = '';
  } else {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === false) {
      return data;
    }

    data.hide = false;
    data.attributes['x-out-of-boundaries'] = false;
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function inner(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var popper = getClientRect(data.offsets.popper);
  var reference = getClientRect(data.offsets.reference);
  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

  popper[isHoriz ? 'left' : 'top'] = reference[placement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

  data.placement = getOppositePlacement(placement);
  data.offsets.popper = getClientRect(popper);

  return data;
}

/**
 * Modifier function, each modifier can have a function of this type assigned
 * to its `fn` property.<br />
 * These functions will be called on each update, this means that you must
 * make sure they are performant enough to avoid performance bottlenecks.
 *
 * @function ModifierFn
 * @argument {dataObject} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {dataObject} The data object, properly modified
 */

/**
 * Modifiers are plugins used to alter the behavior of your poppers.<br />
 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
 * All the other properties are configurations that could be tweaked.
 * @namespace modifiers
 */
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: shift
  },

  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unitless, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the height.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },

  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * An scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} priority=['left', 'right', 'top', 'bottom']
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ['left', 'right', 'top', 'bottom'],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper this makes sure the popper has always a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier, can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: 'scrollParent'
  },

  /**
   * Modifier used to make sure the reference and its popper stay near eachothers
   * without leaving any gap between the two. Expecially useful when the arrow is
   * enabled and you want to assure it to point to its reference element.
   * It cares only about the first axis, you can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },

  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjuction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: '[x-arrow]'
  },

  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations).
     */
    behavior: 'flip',
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position,
     * the popper will never be placed outside of the defined boundaries
     * (except if keepTogether is enabled)
     */
    boundariesElement: 'viewport'
  },

  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: false,
    /** @prop {ModifierFn} */
    fn: inner
  },

  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: hide
  },

  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Just disable this modifier and define you own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3d transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties.
     */
    gpuAcceleration: true
  }
};

/**
 * The `dataObject` is an object containing all the informations used by Popper.js
 * this object get passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper.
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements.
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
 */

/**
 * Default options provided to Popper.js constructor.<br />
 * These can be overriden using the `options` argument of Popper.js.<br />
 * To override an option, simply pass as 3rd argument an object with the same
 * structure of this object, example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
var DEFAULTS = {
  /**
   * Popper's placement
   * @prop {Popper.placements} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Whether events (resize, scroll) are initially enabled
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function onCreate() {},

  /**
   * Callback called when the popper is updated, this callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function onUpdate() {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js
   * @prop {modifiers}
   */
  modifiers: modifiers
};

/**
 * @callback onCreate
 * @param {dataObject} data
 */

/**
 * @callback onUpdate
 * @param {dataObject} data
 */

// Utils
// Methods
var Popper = function () {
  /**
   * Create a new Popper.js instance
   * @class Popper
   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as popper.
   * @param {Object} options - Your custom options to override the ones defined in [DEFAULTS](#defaults)
   * @return {Object} instance - The generated Popper.js instance
   */
  function Popper(reference, popper) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    classCallCheck(this, Popper);

    this.scheduleUpdate = function () {
      return requestAnimationFrame(_this.update);
    };

    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // with {} we create a new object with the options inside it
    this.options = _extends({}, Popper.Defaults, options);

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: []
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference.jquery ? reference[0] : reference;
    this.popper = popper.jquery ? popper[0] : popper;

    // make sure to apply the popper position before any computation
    setStyles(this.popper, { position: 'absolute' });

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys(_extends({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
      _this.options.modifiers[name] = _extends({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
    });

    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
      return _extends({
        name: name
      }, _this.options.modifiers[name]);
    })
    // sort the modifiers by order
    .sort(function (a, b) {
      return a.order - b.order;
    });

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(function (modifierOptions) {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
      }
    });

    // fire the first update to position the popper in the right place
    this.update();

    var eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  // We can't use class properties because they don't get listed in the
  // class prototype and break stuff like Sinon stubs


  createClass(Popper, [{
    key: 'update',
    value: function update$$1() {
      return update.call(this);
    }
  }, {
    key: 'destroy',
    value: function destroy$$1() {
      return destroy.call(this);
    }
  }, {
    key: 'enableEventListeners',
    value: function enableEventListeners$$1() {
      return enableEventListeners.call(this);
    }
  }, {
    key: 'disableEventListeners',
    value: function disableEventListeners$$1() {
      return disableEventListeners.call(this);
    }

    /**
     * Schedule an update, it will run on the next UI update available
     * @method scheduleUpdate
     * @memberof Popper
     */


    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * @static
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */

  }]);
  return Popper;
}();

/**
 * The `referenceObject` is an object that provides an interface compatible with Popper.js
 * and lets you use it as replacement of a real DOM node.<br />
 * You can use this method to position a popper relatively to a set of coordinates
 * in case you don't have a DOM node to use as reference.
 *
 * ```
 * new Popper(referenceObject, popperNode);
 * ```
 *
 * NB: This feature isn't supported in Internet Explorer 10
 * @name referenceObject
 * @property {Function} data.getBoundingClientRect
 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
 * @property {number} data.clientWidth
 * An ES6 getter that will return the width of the virtual reference element.
 * @property {number} data.clientHeight
 * An ES6 getter that will return the height of the virtual reference element.
 */


Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = DEFAULTS;

return Popper;

})));
/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): util.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */


var Util = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Private TransitionEnd Helpers
   * ------------------------------------------------------------------------
   */

  var transition = false;

  var MAX_UID = 1000000;

  var TransitionEndEvent = {
    WebkitTransition: 'webkitTransitionEnd',
    MozTransition: 'transitionend',
    OTransition: 'oTransitionEnd otransitionend',
    transition: 'transitionend'
  };

  // shoutout AngusCroll (https://goo.gl/pxwQGp)
  function toType(obj) {
    return {}.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  }

  function isElement(obj) {
    return (obj[0] || obj).nodeType;
  }

  function getSpecialTransitionEndEvent() {
    return {
      bindType: transition.end,
      delegateType: transition.end,
      handle: function handle(event) {
        if ($(event.target).is(this)) {
          return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
        }
        return undefined;
      }
    };
  }

  function transitionEndTest() {
    if (window.QUnit) {
      return false;
    }

    var el = document.createElement('bootstrap');

    for (var name in TransitionEndEvent) {
      if (el.style[name] !== undefined) {
        return {
          end: TransitionEndEvent[name]
        };
      }
    }

    return false;
  }

  function transitionEndEmulator(duration) {
    var _this = this;

    var called = false;

    $(this).one(Util.TRANSITION_END, function () {
      called = true;
    });

    setTimeout(function () {
      if (!called) {
        Util.triggerTransitionEnd(_this);
      }
    }, duration);

    return this;
  }

  function setTransitionEndSupport() {
    transition = transitionEndTest();

    $.fn.emulateTransitionEnd = transitionEndEmulator;

    if (Util.supportsTransitionEnd()) {
      $.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
    }
  }

  /**
   * --------------------------------------------------------------------------
   * Public Util Api
   * --------------------------------------------------------------------------
   */

  var Util = {

    TRANSITION_END: 'bsTransitionEnd',

    getUID: function getUID(prefix) {
      do {
        // eslint-disable-next-line no-bitwise
        prefix += ~~(Math.random() * MAX_UID); // "~~" acts like a faster Math.floor() here
      } while (document.getElementById(prefix));
      return prefix;
    },
    getSelectorFromElement: function getSelectorFromElement(element) {
      var selector = element.getAttribute('data-target');
      if (!selector || selector === '#') {
        selector = element.getAttribute('href') || '';
      }

      try {
        var $selector = $(selector);
        return $selector.length > 0 ? selector : null;
      } catch (error) {
        return null;
      }
    },
    reflow: function reflow(element) {
      return element.offsetHeight;
    },
    triggerTransitionEnd: function triggerTransitionEnd(element) {
      $(element).trigger(transition.end);
    },
    supportsTransitionEnd: function supportsTransitionEnd() {
      return Boolean(transition);
    },
    typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
      for (var property in configTypes) {
        if (configTypes.hasOwnProperty(property)) {
          var expectedTypes = configTypes[property];
          var value = config[property];
          var valueType = value && isElement(value) ? 'element' : toType(value);

          if (!new RegExp(expectedTypes).test(valueType)) {
            throw new Error(componentName.toUpperCase() + ': ' + ('Option "' + property + '" provided type "' + valueType + '" ') + ('but expected type "' + expectedTypes + '".'));
          }
        }
      }
    }
  };

  setTransitionEndSupport();

  return Util;
}(jQuery);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): alert.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Alert = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'alert';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.alert';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var TRANSITION_DURATION = 150;

  var Selector = {
    DISMISS: '[data-dismiss="alert"]'
  };

  var Event = {
    CLOSE: 'close' + EVENT_KEY,
    CLOSED: 'closed' + EVENT_KEY,
    CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
  };

  var ClassName = {
    ALERT: 'alert',
    FADE: 'fade',
    SHOW: 'show'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Alert = function () {
    function Alert(element) {
      _classCallCheck(this, Alert);

      this._element = element;
    }

    // getters

    // public

    Alert.prototype.close = function close(element) {
      element = element || this._element;

      var rootElement = this._getRootElement(element);
      var customEvent = this._triggerCloseEvent(rootElement);

      if (customEvent.isDefaultPrevented()) {
        return;
      }

      this._removeElement(rootElement);
    };

    Alert.prototype.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);
      this._element = null;
    };

    // private

    Alert.prototype._getRootElement = function _getRootElement(element) {
      var selector = Util.getSelectorFromElement(element);
      var parent = false;

      if (selector) {
        parent = $(selector)[0];
      }

      if (!parent) {
        parent = $(element).closest('.' + ClassName.ALERT)[0];
      }

      return parent;
    };

    Alert.prototype._triggerCloseEvent = function _triggerCloseEvent(element) {
      var closeEvent = $.Event(Event.CLOSE);

      $(element).trigger(closeEvent);
      return closeEvent;
    };

    Alert.prototype._removeElement = function _removeElement(element) {
      var _this = this;

      $(element).removeClass(ClassName.SHOW);

      if (!Util.supportsTransitionEnd() || !$(element).hasClass(ClassName.FADE)) {
        this._destroyElement(element);
        return;
      }

      $(element).one(Util.TRANSITION_END, function (event) {
        return _this._destroyElement(element, event);
      }).emulateTransitionEnd(TRANSITION_DURATION);
    };

    Alert.prototype._destroyElement = function _destroyElement(element) {
      $(element).detach().trigger(Event.CLOSED).remove();
    };

    // static

    Alert._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $element = $(this);
        var data = $element.data(DATA_KEY);

        if (!data) {
          data = new Alert(this);
          $element.data(DATA_KEY, data);
        }

        if (config === 'close') {
          data[config](this);
        }
      });
    };

    Alert._handleDismiss = function _handleDismiss(alertInstance) {
      return function (event) {
        if (event) {
          event.preventDefault();
        }

        alertInstance.close(this);
      };
    };

    _createClass(Alert, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }]);

    return Alert;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Alert._jQueryInterface;
  $.fn[NAME].Constructor = Alert;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Alert._jQueryInterface;
  };

  return Alert;
}(jQuery);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): button.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Button = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'button';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.button';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];

  var ClassName = {
    ACTIVE: 'active',
    BUTTON: 'btn',
    FOCUS: 'focus'
  };

  var Selector = {
    DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
    DATA_TOGGLE: '[data-toggle="buttons"]',
    INPUT: 'input',
    ACTIVE: '.active',
    BUTTON: '.btn'
  };

  var Event = {
    CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY,
    FOCUS_BLUR_DATA_API: 'focus' + EVENT_KEY + DATA_API_KEY + ' ' + ('blur' + EVENT_KEY + DATA_API_KEY)
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Button = function () {
    function Button(element) {
      _classCallCheck(this, Button);

      this._element = element;
    }

    // getters

    // public

    Button.prototype.toggle = function toggle() {
      var triggerChangeEvent = true;
      var addAriaPressed = true;
      var rootElement = $(this._element).closest(Selector.DATA_TOGGLE)[0];

      if (rootElement) {
        var input = $(this._element).find(Selector.INPUT)[0];

        if (input) {
          if (input.type === 'radio') {
            if (input.checked && $(this._element).hasClass(ClassName.ACTIVE)) {
              triggerChangeEvent = false;
            } else {
              var activeElement = $(rootElement).find(Selector.ACTIVE)[0];

              if (activeElement) {
                $(activeElement).removeClass(ClassName.ACTIVE);
              }
            }
          }

          if (triggerChangeEvent) {
            if (input.hasAttribute('disabled') || rootElement.hasAttribute('disabled') || input.classList.contains('disabled') || rootElement.classList.contains('disabled')) {
              return;
            }
            input.checked = !$(this._element).hasClass(ClassName.ACTIVE);
            $(input).trigger('change');
          }

          input.focus();
          addAriaPressed = false;
        }
      }

      if (addAriaPressed) {
        this._element.setAttribute('aria-pressed', !$(this._element).hasClass(ClassName.ACTIVE));
      }

      if (triggerChangeEvent) {
        $(this._element).toggleClass(ClassName.ACTIVE);
      }
    };

    Button.prototype.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);
      this._element = null;
    };

    // static

    Button._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);

        if (!data) {
          data = new Button(this);
          $(this).data(DATA_KEY, data);
        }

        if (config === 'toggle') {
          data[config]();
        }
      });
    };

    _createClass(Button, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }]);

    return Button;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
    event.preventDefault();

    var button = event.target;

    if (!$(button).hasClass(ClassName.BUTTON)) {
      button = $(button).closest(Selector.BUTTON);
    }

    Button._jQueryInterface.call($(button), 'toggle');
  }).on(Event.FOCUS_BLUR_DATA_API, Selector.DATA_TOGGLE_CARROT, function (event) {
    var button = $(event.target).closest(Selector.BUTTON)[0];
    $(button).toggleClass(ClassName.FOCUS, /^focus(in)?$/.test(event.type));
  });

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Button._jQueryInterface;
  $.fn[NAME].Constructor = Button;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Button._jQueryInterface;
  };

  return Button;
}(jQuery);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): carousel.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Carousel = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'carousel';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.carousel';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var TRANSITION_DURATION = 600;
  var ARROW_LEFT_KEYCODE = 37; // KeyboardEvent.which value for left arrow key
  var ARROW_RIGHT_KEYCODE = 39; // KeyboardEvent.which value for right arrow key
  var TOUCHEVENT_COMPAT_WAIT = 500; // Time for mouse compat events to fire after touch

  var Default = {
    interval: 5000,
    keyboard: true,
    slide: false,
    pause: 'hover',
    wrap: true
  };

  var DefaultType = {
    interval: '(number|boolean)',
    keyboard: 'boolean',
    slide: '(boolean|string)',
    pause: '(string|boolean)',
    wrap: 'boolean'
  };

  var Direction = {
    NEXT: 'next',
    PREV: 'prev',
    LEFT: 'left',
    RIGHT: 'right'
  };

  var Event = {
    SLIDE: 'slide' + EVENT_KEY,
    SLID: 'slid' + EVENT_KEY,
    KEYDOWN: 'keydown' + EVENT_KEY,
    MOUSEENTER: 'mouseenter' + EVENT_KEY,
    MOUSELEAVE: 'mouseleave' + EVENT_KEY,
    TOUCHEND: 'touchend' + EVENT_KEY,
    LOAD_DATA_API: 'load' + EVENT_KEY + DATA_API_KEY,
    CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
  };

  var ClassName = {
    CAROUSEL: 'carousel',
    ACTIVE: 'active',
    SLIDE: 'slide',
    RIGHT: 'carousel-item-right',
    LEFT: 'carousel-item-left',
    NEXT: 'carousel-item-next',
    PREV: 'carousel-item-prev',
    ITEM: 'carousel-item'
  };

  var Selector = {
    ACTIVE: '.active',
    ACTIVE_ITEM: '.active.carousel-item',
    ITEM: '.carousel-item',
    NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
    INDICATORS: '.carousel-indicators',
    DATA_SLIDE: '[data-slide], [data-slide-to]',
    DATA_RIDE: '[data-ride="carousel"]'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Carousel = function () {
    function Carousel(element, config) {
      _classCallCheck(this, Carousel);

      this._items = null;
      this._interval = null;
      this._activeElement = null;

      this._isPaused = false;
      this._isSliding = false;

      this.touchTimeout = null;

      this._config = this._getConfig(config);
      this._element = $(element)[0];
      this._indicatorsElement = $(this._element).find(Selector.INDICATORS)[0];

      this._addEventListeners();
    }

    // getters

    // public

    Carousel.prototype.next = function next() {
      if (!this._isSliding) {
        this._slide(Direction.NEXT);
      }
    };

    Carousel.prototype.nextWhenVisible = function nextWhenVisible() {
      // Don't call next when the page isn't visible
      if (!document.hidden) {
        this.next();
      }
    };

    Carousel.prototype.prev = function prev() {
      if (!this._isSliding) {
        this._slide(Direction.PREV);
      }
    };

    Carousel.prototype.pause = function pause(event) {
      if (!event) {
        this._isPaused = true;
      }

      if ($(this._element).find(Selector.NEXT_PREV)[0] && Util.supportsTransitionEnd()) {
        Util.triggerTransitionEnd(this._element);
        this.cycle(true);
      }

      clearInterval(this._interval);
      this._interval = null;
    };

    Carousel.prototype.cycle = function cycle(event) {
      if (!event) {
        this._isPaused = false;
      }

      if (this._interval) {
        clearInterval(this._interval);
        this._interval = null;
      }

      if (this._config.interval && !this._isPaused) {
        this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
      }
    };

    Carousel.prototype.to = function to(index) {
      var _this = this;

      this._activeElement = $(this._element).find(Selector.ACTIVE_ITEM)[0];

      var activeIndex = this._getItemIndex(this._activeElement);

      if (index > this._items.length - 1 || index < 0) {
        return;
      }

      if (this._isSliding) {
        $(this._element).one(Event.SLID, function () {
          return _this.to(index);
        });
        return;
      }

      if (activeIndex === index) {
        this.pause();
        this.cycle();
        return;
      }

      var direction = index > activeIndex ? Direction.NEXT : Direction.PREV;

      this._slide(direction, this._items[index]);
    };

    Carousel.prototype.dispose = function dispose() {
      $(this._element).off(EVENT_KEY);
      $.removeData(this._element, DATA_KEY);

      this._items = null;
      this._config = null;
      this._element = null;
      this._interval = null;
      this._isPaused = null;
      this._isSliding = null;
      this._activeElement = null;
      this._indicatorsElement = null;
    };

    // private

    Carousel.prototype._getConfig = function _getConfig(config) {
      config = $.extend({}, Default, config);
      Util.typeCheckConfig(NAME, config, DefaultType);
      return config;
    };

    Carousel.prototype._addEventListeners = function _addEventListeners() {
      var _this2 = this;

      if (this._config.keyboard) {
        $(this._element).on(Event.KEYDOWN, function (event) {
          return _this2._keydown(event);
        });
      }

      if (this._config.pause === 'hover') {
        $(this._element).on(Event.MOUSEENTER, function (event) {
          return _this2.pause(event);
        }).on(Event.MOUSELEAVE, function (event) {
          return _this2.cycle(event);
        });
        if ('ontouchstart' in document.documentElement) {
          // if it's a touch-enabled device, mouseenter/leave are fired as
          // part of the mouse compatibility events on first tap - the carousel
          // would stop cycling until user tapped out of it;
          // here, we listen for touchend, explicitly pause the carousel
          // (as if it's the second time we tap on it, mouseenter compat event
          // is NOT fired) and after a timeout (to allow for mouse compatibility
          // events to fire) we explicitly restart cycling
          $(this._element).on(Event.TOUCHEND, function () {
            _this2.pause();
            if (_this2.touchTimeout) {
              clearTimeout(_this2.touchTimeout);
            }
            _this2.touchTimeout = setTimeout(function (event) {
              return _this2.cycle(event);
            }, TOUCHEVENT_COMPAT_WAIT + _this2._config.interval);
          });
        }
      }
    };

    Carousel.prototype._keydown = function _keydown(event) {
      if (/input|textarea/i.test(event.target.tagName)) {
        return;
      }

      switch (event.which) {
        case ARROW_LEFT_KEYCODE:
          event.preventDefault();
          this.prev();
          break;
        case ARROW_RIGHT_KEYCODE:
          event.preventDefault();
          this.next();
          break;
        default:
          return;
      }
    };

    Carousel.prototype._getItemIndex = function _getItemIndex(element) {
      this._items = $.makeArray($(element).parent().find(Selector.ITEM));
      return this._items.indexOf(element);
    };

    Carousel.prototype._getItemByDirection = function _getItemByDirection(direction, activeElement) {
      var isNextDirection = direction === Direction.NEXT;
      var isPrevDirection = direction === Direction.PREV;
      var activeIndex = this._getItemIndex(activeElement);
      var lastItemIndex = this._items.length - 1;
      var isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;

      if (isGoingToWrap && !this._config.wrap) {
        return activeElement;
      }

      var delta = direction === Direction.PREV ? -1 : 1;
      var itemIndex = (activeIndex + delta) % this._items.length;

      return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
    };

    Carousel.prototype._triggerSlideEvent = function _triggerSlideEvent(relatedTarget, eventDirectionName) {
      var targetIndex = this._getItemIndex(relatedTarget);
      var fromIndex = this._getItemIndex($(this._element).find(Selector.ACTIVE_ITEM)[0]);
      var slideEvent = $.Event(Event.SLIDE, {
        relatedTarget: relatedTarget,
        direction: eventDirectionName,
        from: fromIndex,
        to: targetIndex
      });

      $(this._element).trigger(slideEvent);

      return slideEvent;
    };

    Carousel.prototype._setActiveIndicatorElement = function _setActiveIndicatorElement(element) {
      if (this._indicatorsElement) {
        $(this._indicatorsElement).find(Selector.ACTIVE).removeClass(ClassName.ACTIVE);

        var nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];

        if (nextIndicator) {
          $(nextIndicator).addClass(ClassName.ACTIVE);
        }
      }
    };

    Carousel.prototype._slide = function _slide(direction, element) {
      var _this3 = this;

      var activeElement = $(this._element).find(Selector.ACTIVE_ITEM)[0];
      var activeElementIndex = this._getItemIndex(activeElement);
      var nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);
      var nextElementIndex = this._getItemIndex(nextElement);
      var isCycling = Boolean(this._interval);

      var directionalClassName = void 0;
      var orderClassName = void 0;
      var eventDirectionName = void 0;

      if (direction === Direction.NEXT) {
        directionalClassName = ClassName.LEFT;
        orderClassName = ClassName.NEXT;
        eventDirectionName = Direction.LEFT;
      } else {
        directionalClassName = ClassName.RIGHT;
        orderClassName = ClassName.PREV;
        eventDirectionName = Direction.RIGHT;
      }

      if (nextElement && $(nextElement).hasClass(ClassName.ACTIVE)) {
        this._isSliding = false;
        return;
      }

      var slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);
      if (slideEvent.isDefaultPrevented()) {
        return;
      }

      if (!activeElement || !nextElement) {
        // some weirdness is happening, so we bail
        return;
      }

      this._isSliding = true;

      if (isCycling) {
        this.pause();
      }

      this._setActiveIndicatorElement(nextElement);

      var slidEvent = $.Event(Event.SLID, {
        relatedTarget: nextElement,
        direction: eventDirectionName,
        from: activeElementIndex,
        to: nextElementIndex
      });

      if (Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.SLIDE)) {

        $(nextElement).addClass(orderClassName);

        Util.reflow(nextElement);

        $(activeElement).addClass(directionalClassName);
        $(nextElement).addClass(directionalClassName);

        $(activeElement).one(Util.TRANSITION_END, function () {
          $(nextElement).removeClass(directionalClassName + ' ' + orderClassName).addClass(ClassName.ACTIVE);

          $(activeElement).removeClass(ClassName.ACTIVE + ' ' + orderClassName + ' ' + directionalClassName);

          _this3._isSliding = false;

          setTimeout(function () {
            return $(_this3._element).trigger(slidEvent);
          }, 0);
        }).emulateTransitionEnd(TRANSITION_DURATION);
      } else {
        $(activeElement).removeClass(ClassName.ACTIVE);
        $(nextElement).addClass(ClassName.ACTIVE);

        this._isSliding = false;
        $(this._element).trigger(slidEvent);
      }

      if (isCycling) {
        this.cycle();
      }
    };

    // static

    Carousel._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);
        var _config = $.extend({}, Default, $(this).data());

        if ((typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object') {
          $.extend(_config, config);
        }

        var action = typeof config === 'string' ? config : _config.slide;

        if (!data) {
          data = new Carousel(this, _config);
          $(this).data(DATA_KEY, data);
        }

        if (typeof config === 'number') {
          data.to(config);
        } else if (typeof action === 'string') {
          if (data[action] === undefined) {
            throw new Error('No method named "' + action + '"');
          }
          data[action]();
        } else if (_config.interval) {
          data.pause();
          data.cycle();
        }
      });
    };

    Carousel._dataApiClickHandler = function _dataApiClickHandler(event) {
      var selector = Util.getSelectorFromElement(this);

      if (!selector) {
        return;
      }

      var target = $(selector)[0];

      if (!target || !$(target).hasClass(ClassName.CAROUSEL)) {
        return;
      }

      var config = $.extend({}, $(target).data(), $(this).data());
      var slideIndex = this.getAttribute('data-slide-to');

      if (slideIndex) {
        config.interval = false;
      }

      Carousel._jQueryInterface.call($(target), config);

      if (slideIndex) {
        $(target).data(DATA_KEY).to(slideIndex);
      }

      event.preventDefault();
    };

    _createClass(Carousel, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }, {
      key: 'Default',
      get: function get() {
        return Default;
      }
    }]);

    return Carousel;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(document).on(Event.CLICK_DATA_API, Selector.DATA_SLIDE, Carousel._dataApiClickHandler);

  $(window).on(Event.LOAD_DATA_API, function () {
    $(Selector.DATA_RIDE).each(function () {
      var $carousel = $(this);
      Carousel._jQueryInterface.call($carousel, $carousel.data());
    });
  });

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Carousel._jQueryInterface;
  $.fn[NAME].Constructor = Carousel;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Carousel._jQueryInterface;
  };

  return Carousel;
}(jQuery);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): collapse.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Collapse = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'collapse';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.collapse';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var TRANSITION_DURATION = 600;

  var Default = {
    toggle: true,
    parent: ''
  };

  var DefaultType = {
    toggle: 'boolean',
    parent: 'string'
  };

  var Event = {
    SHOW: 'show' + EVENT_KEY,
    SHOWN: 'shown' + EVENT_KEY,
    HIDE: 'hide' + EVENT_KEY,
    HIDDEN: 'hidden' + EVENT_KEY,
    CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
  };

  var ClassName = {
    SHOW: 'show',
    COLLAPSE: 'collapse',
    COLLAPSING: 'collapsing',
    COLLAPSED: 'collapsed'
  };

  var Dimension = {
    WIDTH: 'width',
    HEIGHT: 'height'
  };

  var Selector = {
    ACTIVES: '.show, .collapsing',
    DATA_TOGGLE: '[data-toggle="collapse"]'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Collapse = function () {
    function Collapse(element, config) {
      _classCallCheck(this, Collapse);

      this._isTransitioning = false;
      this._element = element;
      this._config = this._getConfig(config);
      this._triggerArray = $.makeArray($('[data-toggle="collapse"][href="#' + element.id + '"],' + ('[data-toggle="collapse"][data-target="#' + element.id + '"]')));

      this._parent = this._config.parent ? this._getParent() : null;

      if (!this._config.parent) {
        this._addAriaAndCollapsedClass(this._element, this._triggerArray);
      }

      if (this._config.toggle) {
        this.toggle();
      }
    }

    // getters

    // public

    Collapse.prototype.toggle = function toggle() {
      if ($(this._element).hasClass(ClassName.SHOW)) {
        this.hide();
      } else {
        this.show();
      }
    };

    Collapse.prototype.show = function show() {
      var _this = this;

      if (this._isTransitioning || $(this._element).hasClass(ClassName.SHOW)) {
        return;
      }

      var actives = void 0;
      var activesData = void 0;

      if (this._parent) {
        actives = $.makeArray($(this._parent).children().children(Selector.ACTIVES));
        if (!actives.length) {
          actives = null;
        }
      }

      if (actives) {
        activesData = $(actives).data(DATA_KEY);
        if (activesData && activesData._isTransitioning) {
          return;
        }
      }

      var startEvent = $.Event(Event.SHOW);
      $(this._element).trigger(startEvent);
      if (startEvent.isDefaultPrevented()) {
        return;
      }

      if (actives) {
        Collapse._jQueryInterface.call($(actives), 'hide');
        if (!activesData) {
          $(actives).data(DATA_KEY, null);
        }
      }

      var dimension = this._getDimension();

      $(this._element).removeClass(ClassName.COLLAPSE).addClass(ClassName.COLLAPSING);

      this._element.style[dimension] = 0;

      if (this._triggerArray.length) {
        $(this._triggerArray).removeClass(ClassName.COLLAPSED).attr('aria-expanded', true);
      }

      this.setTransitioning(true);

      var complete = function complete() {
        $(_this._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).addClass(ClassName.SHOW);

        _this._element.style[dimension] = '';

        _this.setTransitioning(false);

        $(_this._element).trigger(Event.SHOWN);
      };

      if (!Util.supportsTransitionEnd()) {
        complete();
        return;
      }

      var capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
      var scrollSize = 'scroll' + capitalizedDimension;

      $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);

      this._element.style[dimension] = this._element[scrollSize] + 'px';
    };

    Collapse.prototype.hide = function hide() {
      var _this2 = this;

      if (this._isTransitioning || !$(this._element).hasClass(ClassName.SHOW)) {
        return;
      }

      var startEvent = $.Event(Event.HIDE);
      $(this._element).trigger(startEvent);
      if (startEvent.isDefaultPrevented()) {
        return;
      }

      var dimension = this._getDimension();

      this._element.style[dimension] = this._element.getBoundingClientRect()[dimension] + 'px';

      Util.reflow(this._element);

      $(this._element).addClass(ClassName.COLLAPSING).removeClass(ClassName.COLLAPSE).removeClass(ClassName.SHOW);

      if (this._triggerArray.length) {
        $(this._triggerArray).addClass(ClassName.COLLAPSED).attr('aria-expanded', false);
      }

      this.setTransitioning(true);

      var complete = function complete() {
        _this2.setTransitioning(false);
        $(_this2._element).removeClass(ClassName.COLLAPSING).addClass(ClassName.COLLAPSE).trigger(Event.HIDDEN);
      };

      this._element.style[dimension] = '';

      if (!Util.supportsTransitionEnd()) {
        complete();
        return;
      }

      $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);
    };

    Collapse.prototype.setTransitioning = function setTransitioning(isTransitioning) {
      this._isTransitioning = isTransitioning;
    };

    Collapse.prototype.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);

      this._config = null;
      this._parent = null;
      this._element = null;
      this._triggerArray = null;
      this._isTransitioning = null;
    };

    // private

    Collapse.prototype._getConfig = function _getConfig(config) {
      config = $.extend({}, Default, config);
      config.toggle = Boolean(config.toggle); // coerce string values
      Util.typeCheckConfig(NAME, config, DefaultType);
      return config;
    };

    Collapse.prototype._getDimension = function _getDimension() {
      var hasWidth = $(this._element).hasClass(Dimension.WIDTH);
      return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
    };

    Collapse.prototype._getParent = function _getParent() {
      var _this3 = this;

      var parent = $(this._config.parent)[0];
      var selector = '[data-toggle="collapse"][data-parent="' + this._config.parent + '"]';

      $(parent).find(selector).each(function (i, element) {
        _this3._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
      });

      return parent;
    };

    Collapse.prototype._addAriaAndCollapsedClass = function _addAriaAndCollapsedClass(element, triggerArray) {
      if (element) {
        var isOpen = $(element).hasClass(ClassName.SHOW);

        if (triggerArray.length) {
          $(triggerArray).toggleClass(ClassName.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
        }
      }
    };

    // static

    Collapse._getTargetFromElement = function _getTargetFromElement(element) {
      var selector = Util.getSelectorFromElement(element);
      return selector ? $(selector)[0] : null;
    };

    Collapse._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $this = $(this);
        var data = $this.data(DATA_KEY);
        var _config = $.extend({}, Default, $this.data(), (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config);

        if (!data && _config.toggle && /show|hide/.test(config)) {
          _config.toggle = false;
        }

        if (!data) {
          data = new Collapse(this, _config);
          $this.data(DATA_KEY, data);
        }

        if (typeof config === 'string') {
          if (data[config] === undefined) {
            throw new Error('No method named "' + config + '"');
          }
          data[config]();
        }
      });
    };

    _createClass(Collapse, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }, {
      key: 'Default',
      get: function get() {
        return Default;
      }
    }]);

    return Collapse;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
    if (!/input|textarea/i.test(event.target.tagName)) {
      event.preventDefault();
    }

    var target = Collapse._getTargetFromElement(this);
    var data = $(target).data(DATA_KEY);
    var config = data ? 'toggle' : $(this).data();

    Collapse._jQueryInterface.call($(target), config);
  });

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Collapse._jQueryInterface;
  $.fn[NAME].Constructor = Collapse;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Collapse._jQueryInterface;
  };

  return Collapse;
}(jQuery);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): dropdown.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Dropdown = function ($) {

  /**
   * Check for Popper dependency
   * Popper - https://popper.js.org
   */
  if (typeof Popper === 'undefined') {
    throw new Error('Bootstrap dropdown require Popper.js (https://popper.js.org)');
  }

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'dropdown';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.dropdown';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key
  var SPACE_KEYCODE = 32; // KeyboardEvent.which value for space key
  var TAB_KEYCODE = 9; // KeyboardEvent.which value for tab key
  var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key
  var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key
  var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)
  var REGEXP_KEYDOWN = new RegExp(ARROW_UP_KEYCODE + '|' + ARROW_DOWN_KEYCODE + '|' + ESCAPE_KEYCODE);

  var Event = {
    HIDE: 'hide' + EVENT_KEY,
    HIDDEN: 'hidden' + EVENT_KEY,
    SHOW: 'show' + EVENT_KEY,
    SHOWN: 'shown' + EVENT_KEY,
    CLICK: 'click' + EVENT_KEY,
    CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY,
    KEYDOWN_DATA_API: 'keydown' + EVENT_KEY + DATA_API_KEY,
    KEYUP_DATA_API: 'keyup' + EVENT_KEY + DATA_API_KEY
  };

  var ClassName = {
    DISABLED: 'disabled',
    SHOW: 'show',
    DROPUP: 'dropup',
    MENURIGHT: 'dropdown-menu-right',
    MENULEFT: 'dropdown-menu-left'
  };

  var Selector = {
    DATA_TOGGLE: '[data-toggle="dropdown"]',
    FORM_CHILD: '.dropdown form',
    MENU: '.dropdown-menu',
    NAVBAR_NAV: '.navbar-nav',
    VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled)'
  };

  var AttachmentMap = {
    TOP: 'top-start',
    TOPEND: 'top-end',
    BOTTOM: 'bottom-start',
    BOTTOMEND: 'bottom-end'
  };

  var Default = {
    placement: AttachmentMap.BOTTOM,
    offset: 0,
    flip: true
  };

  var DefaultType = {
    placement: 'string',
    offset: '(number|string)',
    flip: 'boolean'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Dropdown = function () {
    function Dropdown(element, config) {
      _classCallCheck(this, Dropdown);

      this._element = element;
      this._popper = null;
      this._config = this._getConfig(config);
      this._menu = this._getMenuElement();

      this._addEventListeners();
    }

    // getters

    // public

    Dropdown.prototype.toggle = function toggle() {
      if (this._element.disabled || $(this._element).hasClass(ClassName.DISABLED)) {
        return;
      }

      var parent = Dropdown._getParentFromElement(this._element);
      var isActive = $(this._menu).hasClass(ClassName.SHOW);

      Dropdown._clearMenus();

      if (isActive) {
        return;
      }

      var relatedTarget = {
        relatedTarget: this._element
      };
      var showEvent = $.Event(Event.SHOW, relatedTarget);

      $(parent).trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      }

      var element = this._element;
      // for dropup with alignment we use the parent as popper container
      if ($(parent).hasClass(ClassName.DROPUP)) {
        if ($(this._menu).hasClass(ClassName.MENULEFT) || $(this._menu).hasClass(ClassName.MENURIGHT)) {
          element = parent;
        }
      }
      this._popper = new Popper(element, this._menu, {
        placement: this._getPlacement(),
        modifiers: {
          offset: {
            offset: this._config.offset
          },
          flip: {
            enabled: this._config.flip
          }
        }
      });

      // if this is a touch-enabled device we add extra
      // empty mouseover listeners to the body's immediate children;
      // only needed because of broken event delegation on iOS
      // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html
      if ('ontouchstart' in document.documentElement && !$(parent).closest(Selector.NAVBAR_NAV).length) {
        $('body').children().on('mouseover', null, $.noop);
      }

      this._element.focus();
      this._element.setAttribute('aria-expanded', true);

      $(this._menu).toggleClass(ClassName.SHOW);
      $(parent).toggleClass(ClassName.SHOW).trigger($.Event(Event.SHOWN, relatedTarget));
    };

    Dropdown.prototype.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);
      $(this._element).off(EVENT_KEY);
      this._element = null;
      this._menu = null;
      if (this._popper !== null) {
        this._popper.destroy();
      }
      this._popper = null;
    };

    Dropdown.prototype.update = function update() {
      if (this._popper !== null) {
        this._popper.scheduleUpdate();
      }
    };

    // private

    Dropdown.prototype._addEventListeners = function _addEventListeners() {
      var _this = this;

      $(this._element).on(Event.CLICK, function (event) {
        event.preventDefault();
        event.stopPropagation();
        _this.toggle();
      });
    };

    Dropdown.prototype._getConfig = function _getConfig(config) {
      var elementData = $(this._element).data();
      if (elementData.placement !== undefined) {
        elementData.placement = AttachmentMap[elementData.placement.toUpperCase()];
      }

      config = $.extend({}, this.constructor.Default, $(this._element).data(), config);

      Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);

      return config;
    };

    Dropdown.prototype._getMenuElement = function _getMenuElement() {
      if (!this._menu) {
        var parent = Dropdown._getParentFromElement(this._element);
        this._menu = $(parent).find(Selector.MENU)[0];
      }
      return this._menu;
    };

    Dropdown.prototype._getPlacement = function _getPlacement() {
      var $parentDropdown = $(this._element).parent();
      var placement = this._config.placement;

      // Handle dropup
      if ($parentDropdown.hasClass(ClassName.DROPUP) || this._config.placement === AttachmentMap.TOP) {
        placement = AttachmentMap.TOP;
        if ($(this._menu).hasClass(ClassName.MENURIGHT)) {
          placement = AttachmentMap.TOPEND;
        }
      } else {
        if ($(this._menu).hasClass(ClassName.MENURIGHT)) {
          placement = AttachmentMap.BOTTOMEND;
        }
      }
      return placement;
    };

    // static

    Dropdown._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);
        var _config = (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' ? config : null;

        if (!data) {
          data = new Dropdown(this, _config);
          $(this).data(DATA_KEY, data);
        }

        if (typeof config === 'string') {
          if (data[config] === undefined) {
            throw new Error('No method named "' + config + '"');
          }
          data[config]();
        }
      });
    };

    Dropdown._clearMenus = function _clearMenus(event) {
      if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
        return;
      }

      var toggles = $.makeArray($(Selector.DATA_TOGGLE));
      for (var i = 0; i < toggles.length; i++) {
        var parent = Dropdown._getParentFromElement(toggles[i]);
        var context = $(toggles[i]).data(DATA_KEY);
        var relatedTarget = {
          relatedTarget: toggles[i]
        };

        if (!context) {
          continue;
        }

        var dropdownMenu = context._menu;
        if (!$(parent).hasClass(ClassName.SHOW)) {
          continue;
        }

        if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $.contains(parent, event.target)) {
          continue;
        }

        var hideEvent = $.Event(Event.HIDE, relatedTarget);
        $(parent).trigger(hideEvent);
        if (hideEvent.isDefaultPrevented()) {
          continue;
        }

        // if this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support
        if ('ontouchstart' in document.documentElement) {
          $('body').children().off('mouseover', null, $.noop);
        }

        toggles[i].setAttribute('aria-expanded', 'false');

        $(dropdownMenu).removeClass(ClassName.SHOW);
        $(parent).removeClass(ClassName.SHOW).trigger($.Event(Event.HIDDEN, relatedTarget));
      }
    };

    Dropdown._getParentFromElement = function _getParentFromElement(element) {
      var parent = void 0;
      var selector = Util.getSelectorFromElement(element);

      if (selector) {
        parent = $(selector)[0];
      }

      return parent || element.parentNode;
    };

    Dropdown._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
      if (!REGEXP_KEYDOWN.test(event.which) || /button/i.test(event.target.tagName) && event.which === SPACE_KEYCODE || /input|textarea/i.test(event.target.tagName)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (this.disabled || $(this).hasClass(ClassName.DISABLED)) {
        return;
      }

      var parent = Dropdown._getParentFromElement(this);
      var isActive = $(parent).hasClass(ClassName.SHOW);

      if (!isActive && (event.which !== ESCAPE_KEYCODE || event.which !== SPACE_KEYCODE) || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {

        if (event.which === ESCAPE_KEYCODE) {
          var toggle = $(parent).find(Selector.DATA_TOGGLE)[0];
          $(toggle).trigger('focus');
        }

        $(this).trigger('click');
        return;
      }

      var items = $(parent).find(Selector.VISIBLE_ITEMS).get();

      if (!items.length) {
        return;
      }

      var index = items.indexOf(event.target);

      if (event.which === ARROW_UP_KEYCODE && index > 0) {
        // up
        index--;
      }

      if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
        // down
        index++;
      }

      if (index < 0) {
        index = 0;
      }

      items[index].focus();
    };

    _createClass(Dropdown, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }, {
      key: 'Default',
      get: function get() {
        return Default;
      }
    }, {
      key: 'DefaultType',
      get: function get() {
        return DefaultType;
      }
    }]);

    return Dropdown;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(document).on(Event.KEYDOWN_DATA_API, Selector.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event.KEYDOWN_DATA_API, Selector.MENU, Dropdown._dataApiKeydownHandler).on(Event.CLICK_DATA_API + ' ' + Event.KEYUP_DATA_API, Dropdown._clearMenus).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
    event.preventDefault();
    event.stopPropagation();
    Dropdown._jQueryInterface.call($(this), 'toggle');
  }).on(Event.CLICK_DATA_API, Selector.FORM_CHILD, function (e) {
    e.stopPropagation();
  });

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Dropdown._jQueryInterface;
  $.fn[NAME].Constructor = Dropdown;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Dropdown._jQueryInterface;
  };

  return Dropdown;
}(jQuery); /* global Popper */
;
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): modal.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Modal = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'modal';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.modal';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var TRANSITION_DURATION = 300;
  var BACKDROP_TRANSITION_DURATION = 150;
  var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

  var Default = {
    backdrop: true,
    keyboard: true,
    focus: true,
    show: true
  };

  var DefaultType = {
    backdrop: '(boolean|string)',
    keyboard: 'boolean',
    focus: 'boolean',
    show: 'boolean'
  };

  var Event = {
    HIDE: 'hide' + EVENT_KEY,
    HIDDEN: 'hidden' + EVENT_KEY,
    SHOW: 'show' + EVENT_KEY,
    SHOWN: 'shown' + EVENT_KEY,
    FOCUSIN: 'focusin' + EVENT_KEY,
    RESIZE: 'resize' + EVENT_KEY,
    CLICK_DISMISS: 'click.dismiss' + EVENT_KEY,
    KEYDOWN_DISMISS: 'keydown.dismiss' + EVENT_KEY,
    MOUSEUP_DISMISS: 'mouseup.dismiss' + EVENT_KEY,
    MOUSEDOWN_DISMISS: 'mousedown.dismiss' + EVENT_KEY,
    CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
  };

  var ClassName = {
    SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
    BACKDROP: 'modal-backdrop',
    OPEN: 'modal-open',
    FADE: 'fade',
    SHOW: 'show'
  };

  var Selector = {
    DIALOG: '.modal-dialog',
    DATA_TOGGLE: '[data-toggle="modal"]',
    DATA_DISMISS: '[data-dismiss="modal"]',
    FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top',
    NAVBAR_TOGGLER: '.navbar-toggler'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Modal = function () {
    function Modal(element, config) {
      _classCallCheck(this, Modal);

      this._config = this._getConfig(config);
      this._element = element;
      this._dialog = $(element).find(Selector.DIALOG)[0];
      this._backdrop = null;
      this._isShown = false;
      this._isBodyOverflowing = false;
      this._ignoreBackdropClick = false;
      this._originalBodyPadding = 0;
      this._scrollbarWidth = 0;
    }

    // getters

    // public

    Modal.prototype.toggle = function toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    };

    Modal.prototype.show = function show(relatedTarget) {
      var _this = this;

      if (this._isTransitioning) {
        return;
      }

      if (Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE)) {
        this._isTransitioning = true;
      }

      var showEvent = $.Event(Event.SHOW, {
        relatedTarget: relatedTarget
      });

      $(this._element).trigger(showEvent);

      if (this._isShown || showEvent.isDefaultPrevented()) {
        return;
      }

      this._isShown = true;

      this._checkScrollbar();
      this._setScrollbar();

      $(document.body).addClass(ClassName.OPEN);

      this._setEscapeEvent();
      this._setResizeEvent();

      $(this._element).on(Event.CLICK_DISMISS, Selector.DATA_DISMISS, function (event) {
        return _this.hide(event);
      });

      $(this._dialog).on(Event.MOUSEDOWN_DISMISS, function () {
        $(_this._element).one(Event.MOUSEUP_DISMISS, function (event) {
          if ($(event.target).is(_this._element)) {
            _this._ignoreBackdropClick = true;
          }
        });
      });

      this._showBackdrop(function () {
        return _this._showElement(relatedTarget);
      });
    };

    Modal.prototype.hide = function hide(event) {
      var _this2 = this;

      if (event) {
        event.preventDefault();
      }

      if (this._isTransitioning || !this._isShown) {
        return;
      }

      var transition = Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE);

      if (transition) {
        this._isTransitioning = true;
      }

      var hideEvent = $.Event(Event.HIDE);

      $(this._element).trigger(hideEvent);

      if (!this._isShown || hideEvent.isDefaultPrevented()) {
        return;
      }

      this._isShown = false;

      this._setEscapeEvent();
      this._setResizeEvent();

      $(document).off(Event.FOCUSIN);

      $(this._element).removeClass(ClassName.SHOW);

      $(this._element).off(Event.CLICK_DISMISS);
      $(this._dialog).off(Event.MOUSEDOWN_DISMISS);

      if (transition) {

        $(this._element).one(Util.TRANSITION_END, function (event) {
          return _this2._hideModal(event);
        }).emulateTransitionEnd(TRANSITION_DURATION);
      } else {
        this._hideModal();
      }
    };

    Modal.prototype.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);

      $(window, document, this._element, this._backdrop).off(EVENT_KEY);

      this._config = null;
      this._element = null;
      this._dialog = null;
      this._backdrop = null;
      this._isShown = null;
      this._isBodyOverflowing = null;
      this._ignoreBackdropClick = null;
      this._scrollbarWidth = null;
    };

    Modal.prototype.handleUpdate = function handleUpdate() {
      this._adjustDialog();
    };

    // private

    Modal.prototype._getConfig = function _getConfig(config) {
      config = $.extend({}, Default, config);
      Util.typeCheckConfig(NAME, config, DefaultType);
      return config;
    };

    Modal.prototype._showElement = function _showElement(relatedTarget) {
      var _this3 = this;

      var transition = Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE);

      if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
        // don't move modals dom position
        document.body.appendChild(this._element);
      }

      this._element.style.display = 'block';
      this._element.removeAttribute('aria-hidden');
      this._element.scrollTop = 0;

      if (transition) {
        Util.reflow(this._element);
      }

      $(this._element).addClass(ClassName.SHOW);

      if (this._config.focus) {
        this._enforceFocus();
      }

      var shownEvent = $.Event(Event.SHOWN, {
        relatedTarget: relatedTarget
      });

      var transitionComplete = function transitionComplete() {
        if (_this3._config.focus) {
          _this3._element.focus();
        }
        _this3._isTransitioning = false;
        $(_this3._element).trigger(shownEvent);
      };

      if (transition) {
        $(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(TRANSITION_DURATION);
      } else {
        transitionComplete();
      }
    };

    Modal.prototype._enforceFocus = function _enforceFocus() {
      var _this4 = this;

      $(document).off(Event.FOCUSIN) // guard against infinite focus loop
      .on(Event.FOCUSIN, function (event) {
        if (document !== event.target && _this4._element !== event.target && !$(_this4._element).has(event.target).length) {
          _this4._element.focus();
        }
      });
    };

    Modal.prototype._setEscapeEvent = function _setEscapeEvent() {
      var _this5 = this;

      if (this._isShown && this._config.keyboard) {
        $(this._element).on(Event.KEYDOWN_DISMISS, function (event) {
          if (event.which === ESCAPE_KEYCODE) {
            event.preventDefault();
            _this5.hide();
          }
        });
      } else if (!this._isShown) {
        $(this._element).off(Event.KEYDOWN_DISMISS);
      }
    };

    Modal.prototype._setResizeEvent = function _setResizeEvent() {
      var _this6 = this;

      if (this._isShown) {
        $(window).on(Event.RESIZE, function (event) {
          return _this6.handleUpdate(event);
        });
      } else {
        $(window).off(Event.RESIZE);
      }
    };

    Modal.prototype._hideModal = function _hideModal() {
      var _this7 = this;

      this._element.style.display = 'none';
      this._element.setAttribute('aria-hidden', true);
      this._isTransitioning = false;
      this._showBackdrop(function () {
        $(document.body).removeClass(ClassName.OPEN);
        _this7._resetAdjustments();
        _this7._resetScrollbar();
        $(_this7._element).trigger(Event.HIDDEN);
      });
    };

    Modal.prototype._removeBackdrop = function _removeBackdrop() {
      if (this._backdrop) {
        $(this._backdrop).remove();
        this._backdrop = null;
      }
    };

    Modal.prototype._showBackdrop = function _showBackdrop(callback) {
      var _this8 = this;

      var animate = $(this._element).hasClass(ClassName.FADE) ? ClassName.FADE : '';

      if (this._isShown && this._config.backdrop) {
        var doAnimate = Util.supportsTransitionEnd() && animate;

        this._backdrop = document.createElement('div');
        this._backdrop.className = ClassName.BACKDROP;

        if (animate) {
          $(this._backdrop).addClass(animate);
        }

        $(this._backdrop).appendTo(document.body);

        $(this._element).on(Event.CLICK_DISMISS, function (event) {
          if (_this8._ignoreBackdropClick) {
            _this8._ignoreBackdropClick = false;
            return;
          }
          if (event.target !== event.currentTarget) {
            return;
          }
          if (_this8._config.backdrop === 'static') {
            _this8._element.focus();
          } else {
            _this8.hide();
          }
        });

        if (doAnimate) {
          Util.reflow(this._backdrop);
        }

        $(this._backdrop).addClass(ClassName.SHOW);

        if (!callback) {
          return;
        }

        if (!doAnimate) {
          callback();
          return;
        }

        $(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(BACKDROP_TRANSITION_DURATION);
      } else if (!this._isShown && this._backdrop) {
        $(this._backdrop).removeClass(ClassName.SHOW);

        var callbackRemove = function callbackRemove() {
          _this8._removeBackdrop();
          if (callback) {
            callback();
          }
        };

        if (Util.supportsTransitionEnd() && $(this._element).hasClass(ClassName.FADE)) {
          $(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(BACKDROP_TRANSITION_DURATION);
        } else {
          callbackRemove();
        }
      } else if (callback) {
        callback();
      }
    };

    // ----------------------------------------------------------------------
    // the following methods are used to handle overflowing modals
    // todo (fat): these should probably be refactored out of modal.js
    // ----------------------------------------------------------------------

    Modal.prototype._adjustDialog = function _adjustDialog() {
      var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

      if (!this._isBodyOverflowing && isModalOverflowing) {
        this._element.style.paddingLeft = this._scrollbarWidth + 'px';
      }

      if (this._isBodyOverflowing && !isModalOverflowing) {
        this._element.style.paddingRight = this._scrollbarWidth + 'px';
      }
    };

    Modal.prototype._resetAdjustments = function _resetAdjustments() {
      this._element.style.paddingLeft = '';
      this._element.style.paddingRight = '';
    };

    Modal.prototype._checkScrollbar = function _checkScrollbar() {
      this._isBodyOverflowing = document.body.clientWidth < window.innerWidth;
      this._scrollbarWidth = this._getScrollbarWidth();
    };

    Modal.prototype._setScrollbar = function _setScrollbar() {
      var _this9 = this;

      if (this._isBodyOverflowing) {
        // Note: DOMNode.style.paddingRight returns the actual value or '' if not set
        //   while $(DOMNode).css('padding-right') returns the calculated value or 0 if not set

        // Adjust fixed content padding
        $(Selector.FIXED_CONTENT).each(function (index, element) {
          var actualPadding = $(element)[0].style.paddingRight;
          var calculatedPadding = $(element).css('padding-right');
          $(element).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + _this9._scrollbarWidth + 'px');
        });

        // Adjust navbar-toggler margin
        $(Selector.NAVBAR_TOGGLER).each(function (index, element) {
          var actualMargin = $(element)[0].style.marginRight;
          var calculatedMargin = $(element).css('margin-right');
          $(element).data('margin-right', actualMargin).css('margin-right', parseFloat(calculatedMargin) + _this9._scrollbarWidth + 'px');
        });

        // Adjust body padding
        var actualPadding = document.body.style.paddingRight;
        var calculatedPadding = $('body').css('padding-right');
        $('body').data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + this._scrollbarWidth + 'px');
      }
    };

    Modal.prototype._resetScrollbar = function _resetScrollbar() {
      // Restore fixed content padding
      $(Selector.FIXED_CONTENT).each(function (index, element) {
        var padding = $(element).data('padding-right');
        if (typeof padding !== 'undefined') {
          $(element).css('padding-right', padding).removeData('padding-right');
        }
      });

      // Restore navbar-toggler margin
      $(Selector.NAVBAR_TOGGLER).each(function (index, element) {
        var margin = $(element).data('margin-right');
        if (typeof margin !== 'undefined') {
          $(element).css('margin-right', margin).removeData('margin-right');
        }
      });

      // Restore body padding
      var padding = $('body').data('padding-right');
      if (typeof padding !== 'undefined') {
        $('body').css('padding-right', padding).removeData('padding-right');
      }
    };

    Modal.prototype._getScrollbarWidth = function _getScrollbarWidth() {
      // thx d.walsh
      var scrollDiv = document.createElement('div');
      scrollDiv.className = ClassName.SCROLLBAR_MEASURER;
      document.body.appendChild(scrollDiv);
      var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return scrollbarWidth;
    };

    // static

    Modal._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);
        var _config = $.extend({}, Modal.Default, $(this).data(), (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config);

        if (!data) {
          data = new Modal(this, _config);
          $(this).data(DATA_KEY, data);
        }

        if (typeof config === 'string') {
          if (data[config] === undefined) {
            throw new Error('No method named "' + config + '"');
          }
          data[config](relatedTarget);
        } else if (_config.show) {
          data.show(relatedTarget);
        }
      });
    };

    _createClass(Modal, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }, {
      key: 'Default',
      get: function get() {
        return Default;
      }
    }]);

    return Modal;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
    var _this10 = this;

    var target = void 0;
    var selector = Util.getSelectorFromElement(this);

    if (selector) {
      target = $(selector)[0];
    }

    var config = $(target).data(DATA_KEY) ? 'toggle' : $.extend({}, $(target).data(), $(this).data());

    if (this.tagName === 'A' || this.tagName === 'AREA') {
      event.preventDefault();
    }

    var $target = $(target).one(Event.SHOW, function (showEvent) {
      if (showEvent.isDefaultPrevented()) {
        // only register focus restorer if modal will actually get shown
        return;
      }

      $target.one(Event.HIDDEN, function () {
        if ($(_this10).is(':visible')) {
          _this10.focus();
        }
      });
    });

    Modal._jQueryInterface.call($(target), config, this);
  });

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Modal._jQueryInterface;
  $.fn[NAME].Constructor = Modal;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Modal._jQueryInterface;
  };

  return Modal;
}(jQuery);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): scrollspy.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var ScrollSpy = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'scrollspy';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.scrollspy';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];

  var Default = {
    offset: 10,
    method: 'auto',
    target: ''
  };

  var DefaultType = {
    offset: 'number',
    method: 'string',
    target: '(string|element)'
  };

  var Event = {
    ACTIVATE: 'activate' + EVENT_KEY,
    SCROLL: 'scroll' + EVENT_KEY,
    LOAD_DATA_API: 'load' + EVENT_KEY + DATA_API_KEY
  };

  var ClassName = {
    DROPDOWN_ITEM: 'dropdown-item',
    DROPDOWN_MENU: 'dropdown-menu',
    ACTIVE: 'active'
  };

  var Selector = {
    DATA_SPY: '[data-spy="scroll"]',
    ACTIVE: '.active',
    NAV_LIST_GROUP: '.nav, .list-group',
    NAV_LINKS: '.nav-link',
    LIST_ITEMS: '.list-group-item',
    DROPDOWN: '.dropdown',
    DROPDOWN_ITEMS: '.dropdown-item',
    DROPDOWN_TOGGLE: '.dropdown-toggle'
  };

  var OffsetMethod = {
    OFFSET: 'offset',
    POSITION: 'position'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var ScrollSpy = function () {
    function ScrollSpy(element, config) {
      var _this = this;

      _classCallCheck(this, ScrollSpy);

      this._element = element;
      this._scrollElement = element.tagName === 'BODY' ? window : element;
      this._config = this._getConfig(config);
      this._selector = this._config.target + ' ' + Selector.NAV_LINKS + ',' + (this._config.target + ' ' + Selector.LIST_ITEMS + ',') + (this._config.target + ' ' + Selector.DROPDOWN_ITEMS);
      this._offsets = [];
      this._targets = [];
      this._activeTarget = null;
      this._scrollHeight = 0;

      $(this._scrollElement).on(Event.SCROLL, function (event) {
        return _this._process(event);
      });

      this.refresh();
      this._process();
    }

    // getters

    // public

    ScrollSpy.prototype.refresh = function refresh() {
      var _this2 = this;

      var autoMethod = this._scrollElement !== this._scrollElement.window ? OffsetMethod.POSITION : OffsetMethod.OFFSET;

      var offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;

      var offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;

      this._offsets = [];
      this._targets = [];

      this._scrollHeight = this._getScrollHeight();

      var targets = $.makeArray($(this._selector));

      targets.map(function (element) {
        var target = void 0;
        var targetSelector = Util.getSelectorFromElement(element);

        if (targetSelector) {
          target = $(targetSelector)[0];
        }

        if (target) {
          var targetBCR = target.getBoundingClientRect();
          if (targetBCR.width || targetBCR.height) {
            // todo (fat): remove sketch reliance on jQuery position/offset
            return [$(target)[offsetMethod]().top + offsetBase, targetSelector];
          }
        }
        return null;
      }).filter(function (item) {
        return item;
      }).sort(function (a, b) {
        return a[0] - b[0];
      }).forEach(function (item) {
        _this2._offsets.push(item[0]);
        _this2._targets.push(item[1]);
      });
    };

    ScrollSpy.prototype.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);
      $(this._scrollElement).off(EVENT_KEY);

      this._element = null;
      this._scrollElement = null;
      this._config = null;
      this._selector = null;
      this._offsets = null;
      this._targets = null;
      this._activeTarget = null;
      this._scrollHeight = null;
    };

    // private

    ScrollSpy.prototype._getConfig = function _getConfig(config) {
      config = $.extend({}, Default, config);

      if (typeof config.target !== 'string') {
        var id = $(config.target).attr('id');
        if (!id) {
          id = Util.getUID(NAME);
          $(config.target).attr('id', id);
        }
        config.target = '#' + id;
      }

      Util.typeCheckConfig(NAME, config, DefaultType);

      return config;
    };

    ScrollSpy.prototype._getScrollTop = function _getScrollTop() {
      return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
    };

    ScrollSpy.prototype._getScrollHeight = function _getScrollHeight() {
      return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    };

    ScrollSpy.prototype._getOffsetHeight = function _getOffsetHeight() {
      return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
    };

    ScrollSpy.prototype._process = function _process() {
      var scrollTop = this._getScrollTop() + this._config.offset;
      var scrollHeight = this._getScrollHeight();
      var maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();

      if (this._scrollHeight !== scrollHeight) {
        this.refresh();
      }

      if (scrollTop >= maxScroll) {
        var target = this._targets[this._targets.length - 1];

        if (this._activeTarget !== target) {
          this._activate(target);
        }
        return;
      }

      if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
        this._activeTarget = null;
        this._clear();
        return;
      }

      for (var i = this._offsets.length; i--;) {
        var isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (this._offsets[i + 1] === undefined || scrollTop < this._offsets[i + 1]);

        if (isActiveTarget) {
          this._activate(this._targets[i]);
        }
      }
    };

    ScrollSpy.prototype._activate = function _activate(target) {
      this._activeTarget = target;

      this._clear();

      var queries = this._selector.split(',');
      queries = queries.map(function (selector) {
        return selector + '[data-target="' + target + '"],' + (selector + '[href="' + target + '"]');
      });

      var $link = $(queries.join(','));

      if ($link.hasClass(ClassName.DROPDOWN_ITEM)) {
        $link.closest(Selector.DROPDOWN).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
        $link.addClass(ClassName.ACTIVE);
      } else {
        // Set triggered link as active
        $link.addClass(ClassName.ACTIVE);
        // Set triggered links parents as active
        // With both <ul> and <nav> markup a parent is the previous sibling of any nav ancestor
        $link.parents(Selector.NAV_LIST_GROUP).prev(Selector.NAV_LINKS + ', ' + Selector.LIST_ITEMS).addClass(ClassName.ACTIVE);
      }

      $(this._scrollElement).trigger(Event.ACTIVATE, {
        relatedTarget: target
      });
    };

    ScrollSpy.prototype._clear = function _clear() {
      $(this._selector).filter(Selector.ACTIVE).removeClass(ClassName.ACTIVE);
    };

    // static

    ScrollSpy._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);
        var _config = (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config;

        if (!data) {
          data = new ScrollSpy(this, _config);
          $(this).data(DATA_KEY, data);
        }

        if (typeof config === 'string') {
          if (data[config] === undefined) {
            throw new Error('No method named "' + config + '"');
          }
          data[config]();
        }
      });
    };

    _createClass(ScrollSpy, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }, {
      key: 'Default',
      get: function get() {
        return Default;
      }
    }]);

    return ScrollSpy;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(window).on(Event.LOAD_DATA_API, function () {
    var scrollSpys = $.makeArray($(Selector.DATA_SPY));

    for (var i = scrollSpys.length; i--;) {
      var $spy = $(scrollSpys[i]);
      ScrollSpy._jQueryInterface.call($spy, $spy.data());
    }
  });

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = ScrollSpy._jQueryInterface;
  $.fn[NAME].Constructor = ScrollSpy;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return ScrollSpy._jQueryInterface;
  };

  return ScrollSpy;
}(jQuery);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): tab.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Tab = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'tab';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.tab';
  var EVENT_KEY = '.' + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var TRANSITION_DURATION = 150;

  var Event = {
    HIDE: 'hide' + EVENT_KEY,
    HIDDEN: 'hidden' + EVENT_KEY,
    SHOW: 'show' + EVENT_KEY,
    SHOWN: 'shown' + EVENT_KEY,
    CLICK_DATA_API: 'click' + EVENT_KEY + DATA_API_KEY
  };

  var ClassName = {
    DROPDOWN_MENU: 'dropdown-menu',
    ACTIVE: 'active',
    DISABLED: 'disabled',
    FADE: 'fade',
    SHOW: 'show'
  };

  var Selector = {
    DROPDOWN: '.dropdown',
    NAV_LIST_GROUP: '.nav, .list-group',
    ACTIVE: '.active',
    DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',
    DROPDOWN_TOGGLE: '.dropdown-toggle',
    DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Tab = function () {
    function Tab(element) {
      _classCallCheck(this, Tab);

      this._element = element;
    }

    // getters

    // public

    Tab.prototype.show = function show() {
      var _this = this;

      if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $(this._element).hasClass(ClassName.ACTIVE) || $(this._element).hasClass(ClassName.DISABLED)) {
        return;
      }

      var target = void 0;
      var previous = void 0;
      var listElement = $(this._element).closest(Selector.NAV_LIST_GROUP)[0];
      var selector = Util.getSelectorFromElement(this._element);

      if (listElement) {
        previous = $.makeArray($(listElement).find(Selector.ACTIVE));
        previous = previous[previous.length - 1];
      }

      var hideEvent = $.Event(Event.HIDE, {
        relatedTarget: this._element
      });

      var showEvent = $.Event(Event.SHOW, {
        relatedTarget: previous
      });

      if (previous) {
        $(previous).trigger(hideEvent);
      }

      $(this._element).trigger(showEvent);

      if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
        return;
      }

      if (selector) {
        target = $(selector)[0];
      }

      this._activate(this._element, listElement);

      var complete = function complete() {
        var hiddenEvent = $.Event(Event.HIDDEN, {
          relatedTarget: _this._element
        });

        var shownEvent = $.Event(Event.SHOWN, {
          relatedTarget: previous
        });

        $(previous).trigger(hiddenEvent);
        $(_this._element).trigger(shownEvent);
      };

      if (target) {
        this._activate(target, target.parentNode, complete);
      } else {
        complete();
      }
    };

    Tab.prototype.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);
      this._element = null;
    };

    // private

    Tab.prototype._activate = function _activate(element, container, callback) {
      var _this2 = this;

      var active = $(container).find(Selector.ACTIVE)[0];
      var isTransitioning = callback && Util.supportsTransitionEnd() && active && $(active).hasClass(ClassName.FADE);

      var complete = function complete() {
        return _this2._transitionComplete(element, active, isTransitioning, callback);
      };

      if (active && isTransitioning) {
        $(active).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);
      } else {
        complete();
      }

      if (active) {
        $(active).removeClass(ClassName.SHOW);
      }
    };

    Tab.prototype._transitionComplete = function _transitionComplete(element, active, isTransitioning, callback) {
      if (active) {
        $(active).removeClass(ClassName.ACTIVE);

        var dropdownChild = $(active.parentNode).find(Selector.DROPDOWN_ACTIVE_CHILD)[0];

        if (dropdownChild) {
          $(dropdownChild).removeClass(ClassName.ACTIVE);
        }

        active.setAttribute('aria-expanded', false);
      }

      $(element).addClass(ClassName.ACTIVE);
      element.setAttribute('aria-expanded', true);

      if (isTransitioning) {
        Util.reflow(element);
        $(element).addClass(ClassName.SHOW);
      } else {
        $(element).removeClass(ClassName.FADE);
      }

      if (element.parentNode && $(element.parentNode).hasClass(ClassName.DROPDOWN_MENU)) {

        var dropdownElement = $(element).closest(Selector.DROPDOWN)[0];
        if (dropdownElement) {
          $(dropdownElement).find(Selector.DROPDOWN_TOGGLE).addClass(ClassName.ACTIVE);
        }

        element.setAttribute('aria-expanded', true);
      }

      if (callback) {
        callback();
      }
    };

    // static

    Tab._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $this = $(this);
        var data = $this.data(DATA_KEY);

        if (!data) {
          data = new Tab(this);
          $this.data(DATA_KEY, data);
        }

        if (typeof config === 'string') {
          if (data[config] === undefined) {
            throw new Error('No method named "' + config + '"');
          }
          data[config]();
        }
      });
    };

    _createClass(Tab, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }]);

    return Tab;
  }();

  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */

  $(document).on(Event.CLICK_DATA_API, Selector.DATA_TOGGLE, function (event) {
    event.preventDefault();
    Tab._jQueryInterface.call($(this), 'show');
  });

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Tab._jQueryInterface;
  $.fn[NAME].Constructor = Tab;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Tab._jQueryInterface;
  };

  return Tab;
}(jQuery);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): tooltip.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Tooltip = function ($) {

  /**
   * Check for Popper dependency
   * Popper - https://popper.js.org
   */
  if (typeof Popper === 'undefined') {
    throw new Error('Bootstrap tooltips require Popper.js (https://popper.js.org)');
  }

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'tooltip';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.tooltip';
  var EVENT_KEY = '.' + DATA_KEY;
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var TRANSITION_DURATION = 150;
  var CLASS_PREFIX = 'bs-tooltip';
  var BSCLS_PREFIX_REGEX = new RegExp('(^|\\s)' + CLASS_PREFIX + '\\S+', 'g');

  var DefaultType = {
    animation: 'boolean',
    template: 'string',
    title: '(string|element|function)',
    trigger: 'string',
    delay: '(number|object)',
    html: 'boolean',
    selector: '(string|boolean)',
    placement: '(string|function)',
    offset: '(number|string)',
    container: '(string|element|boolean)',
    fallbackPlacement: '(string|array)'
  };

  var AttachmentMap = {
    AUTO: 'auto',
    TOP: 'top',
    RIGHT: 'right',
    BOTTOM: 'bottom',
    LEFT: 'left'
  };

  var Default = {
    animation: true,
    template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    selector: false,
    placement: 'top',
    offset: 0,
    container: false,
    fallbackPlacement: 'flip'
  };

  var HoverState = {
    SHOW: 'show',
    OUT: 'out'
  };

  var Event = {
    HIDE: 'hide' + EVENT_KEY,
    HIDDEN: 'hidden' + EVENT_KEY,
    SHOW: 'show' + EVENT_KEY,
    SHOWN: 'shown' + EVENT_KEY,
    INSERTED: 'inserted' + EVENT_KEY,
    CLICK: 'click' + EVENT_KEY,
    FOCUSIN: 'focusin' + EVENT_KEY,
    FOCUSOUT: 'focusout' + EVENT_KEY,
    MOUSEENTER: 'mouseenter' + EVENT_KEY,
    MOUSELEAVE: 'mouseleave' + EVENT_KEY
  };

  var ClassName = {
    FADE: 'fade',
    SHOW: 'show'
  };

  var Selector = {
    TOOLTIP: '.tooltip',
    TOOLTIP_INNER: '.tooltip-inner',
    ARROW: '.arrow'
  };

  var Trigger = {
    HOVER: 'hover',
    FOCUS: 'focus',
    CLICK: 'click',
    MANUAL: 'manual'
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Tooltip = function () {
    function Tooltip(element, config) {
      _classCallCheck(this, Tooltip);

      // private
      this._isEnabled = true;
      this._timeout = 0;
      this._hoverState = '';
      this._activeTrigger = {};
      this._popper = null;

      // protected
      this.element = element;
      this.config = this._getConfig(config);
      this.tip = null;

      this._setListeners();
    }

    // getters

    // public

    Tooltip.prototype.enable = function enable() {
      this._isEnabled = true;
    };

    Tooltip.prototype.disable = function disable() {
      this._isEnabled = false;
    };

    Tooltip.prototype.toggleEnabled = function toggleEnabled() {
      this._isEnabled = !this._isEnabled;
    };

    Tooltip.prototype.toggle = function toggle(event) {
      if (event) {
        var dataKey = this.constructor.DATA_KEY;
        var context = $(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $(event.currentTarget).data(dataKey, context);
        }

        context._activeTrigger.click = !context._activeTrigger.click;

        if (context._isWithActiveTrigger()) {
          context._enter(null, context);
        } else {
          context._leave(null, context);
        }
      } else {

        if ($(this.getTipElement()).hasClass(ClassName.SHOW)) {
          this._leave(null, this);
          return;
        }

        this._enter(null, this);
      }
    };

    Tooltip.prototype.dispose = function dispose() {
      clearTimeout(this._timeout);

      $.removeData(this.element, this.constructor.DATA_KEY);

      $(this.element).off(this.constructor.EVENT_KEY);
      $(this.element).closest('.modal').off('hide.bs.modal');

      if (this.tip) {
        $(this.tip).remove();
      }

      this._isEnabled = null;
      this._timeout = null;
      this._hoverState = null;
      this._activeTrigger = null;
      if (this._popper !== null) {
        this._popper.destroy();
      }
      this._popper = null;

      this.element = null;
      this.config = null;
      this.tip = null;
    };

    Tooltip.prototype.show = function show() {
      var _this = this;

      if ($(this.element).css('display') === 'none') {
        throw new Error('Please use show on visible elements');
      }

      var showEvent = $.Event(this.constructor.Event.SHOW);
      if (this.isWithContent() && this._isEnabled) {
        $(this.element).trigger(showEvent);

        var isInTheDom = $.contains(this.element.ownerDocument.documentElement, this.element);

        if (showEvent.isDefaultPrevented() || !isInTheDom) {
          return;
        }

        var tip = this.getTipElement();
        var tipId = Util.getUID(this.constructor.NAME);

        tip.setAttribute('id', tipId);
        this.element.setAttribute('aria-describedby', tipId);

        this.setContent();

        if (this.config.animation) {
          $(tip).addClass(ClassName.FADE);
        }

        var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;

        var attachment = this._getAttachment(placement);
        this.addAttachmentClass(attachment);

        var container = this.config.container === false ? document.body : $(this.config.container);

        $(tip).data(this.constructor.DATA_KEY, this);

        if (!$.contains(this.element.ownerDocument.documentElement, this.tip)) {
          $(tip).appendTo(container);
        }

        $(this.element).trigger(this.constructor.Event.INSERTED);

        this._popper = new Popper(this.element, tip, {
          placement: attachment,
          modifiers: {
            offset: {
              offset: this.config.offset
            },
            flip: {
              behavior: this.config.fallbackPlacement
            },
            arrow: {
              element: Selector.ARROW
            }
          },
          onCreate: function onCreate(data) {
            if (data.originalPlacement !== data.placement) {
              _this._handlePopperPlacementChange(data);
            }
          },
          onUpdate: function onUpdate(data) {
            _this._handlePopperPlacementChange(data);
          }
        });

        $(tip).addClass(ClassName.SHOW);

        // if this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html
        if ('ontouchstart' in document.documentElement) {
          $('body').children().on('mouseover', null, $.noop);
        }

        var complete = function complete() {
          if (_this.config.animation) {
            _this._fixTransition();
          }
          var prevHoverState = _this._hoverState;
          _this._hoverState = null;

          $(_this.element).trigger(_this.constructor.Event.SHOWN);

          if (prevHoverState === HoverState.OUT) {
            _this._leave(null, _this);
          }
        };

        if (Util.supportsTransitionEnd() && $(this.tip).hasClass(ClassName.FADE)) {
          $(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(Tooltip._TRANSITION_DURATION);
        } else {
          complete();
        }
      }
    };

    Tooltip.prototype.hide = function hide(callback) {
      var _this2 = this;

      var tip = this.getTipElement();
      var hideEvent = $.Event(this.constructor.Event.HIDE);
      var complete = function complete() {
        if (_this2._hoverState !== HoverState.SHOW && tip.parentNode) {
          tip.parentNode.removeChild(tip);
        }

        _this2._cleanTipClass();
        _this2.element.removeAttribute('aria-describedby');
        $(_this2.element).trigger(_this2.constructor.Event.HIDDEN);
        if (_this2._popper !== null) {
          _this2._popper.destroy();
        }

        if (callback) {
          callback();
        }
      };

      $(this.element).trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      $(tip).removeClass(ClassName.SHOW);

      // if this is a touch-enabled device we remove the extra
      // empty mouseover listeners we added for iOS support
      if ('ontouchstart' in document.documentElement) {
        $('body').children().off('mouseover', null, $.noop);
      }

      this._activeTrigger[Trigger.CLICK] = false;
      this._activeTrigger[Trigger.FOCUS] = false;
      this._activeTrigger[Trigger.HOVER] = false;

      if (Util.supportsTransitionEnd() && $(this.tip).hasClass(ClassName.FADE)) {

        $(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(TRANSITION_DURATION);
      } else {
        complete();
      }

      this._hoverState = '';
    };

    Tooltip.prototype.update = function update() {
      if (this._popper !== null) {
        this._popper.scheduleUpdate();
      }
    };

    // protected

    Tooltip.prototype.isWithContent = function isWithContent() {
      return Boolean(this.getTitle());
    };

    Tooltip.prototype.addAttachmentClass = function addAttachmentClass(attachment) {
      $(this.getTipElement()).addClass(CLASS_PREFIX + '-' + attachment);
    };

    Tooltip.prototype.getTipElement = function getTipElement() {
      return this.tip = this.tip || $(this.config.template)[0];
    };

    Tooltip.prototype.setContent = function setContent() {
      var $tip = $(this.getTipElement());
      this.setElementContent($tip.find(Selector.TOOLTIP_INNER), this.getTitle());
      $tip.removeClass(ClassName.FADE + ' ' + ClassName.SHOW);
    };

    Tooltip.prototype.setElementContent = function setElementContent($element, content) {
      var html = this.config.html;
      if ((typeof content === 'undefined' ? 'undefined' : _typeof(content)) === 'object' && (content.nodeType || content.jquery)) {
        // content is a DOM node or a jQuery
        if (html) {
          if (!$(content).parent().is($element)) {
            $element.empty().append(content);
          }
        } else {
          $element.text($(content).text());
        }
      } else {
        $element[html ? 'html' : 'text'](content);
      }
    };

    Tooltip.prototype.getTitle = function getTitle() {
      var title = this.element.getAttribute('data-original-title');

      if (!title) {
        title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
      }

      return title;
    };

    // private

    Tooltip.prototype._getAttachment = function _getAttachment(placement) {
      return AttachmentMap[placement.toUpperCase()];
    };

    Tooltip.prototype._setListeners = function _setListeners() {
      var _this3 = this;

      var triggers = this.config.trigger.split(' ');

      triggers.forEach(function (trigger) {
        if (trigger === 'click') {
          $(_this3.element).on(_this3.constructor.Event.CLICK, _this3.config.selector, function (event) {
            return _this3.toggle(event);
          });
        } else if (trigger !== Trigger.MANUAL) {
          var eventIn = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSEENTER : _this3.constructor.Event.FOCUSIN;
          var eventOut = trigger === Trigger.HOVER ? _this3.constructor.Event.MOUSELEAVE : _this3.constructor.Event.FOCUSOUT;

          $(_this3.element).on(eventIn, _this3.config.selector, function (event) {
            return _this3._enter(event);
          }).on(eventOut, _this3.config.selector, function (event) {
            return _this3._leave(event);
          });
        }

        $(_this3.element).closest('.modal').on('hide.bs.modal', function () {
          return _this3.hide();
        });
      });

      if (this.config.selector) {
        this.config = $.extend({}, this.config, {
          trigger: 'manual',
          selector: ''
        });
      } else {
        this._fixTitle();
      }
    };

    Tooltip.prototype._fixTitle = function _fixTitle() {
      var titleType = _typeof(this.element.getAttribute('data-original-title'));
      if (this.element.getAttribute('title') || titleType !== 'string') {
        this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
        this.element.setAttribute('title', '');
      }
    };

    Tooltip.prototype._enter = function _enter(event, context) {
      var dataKey = this.constructor.DATA_KEY;

      context = context || $(event.currentTarget).data(dataKey);

      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }

      if (event) {
        context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
      }

      if ($(context.getTipElement()).hasClass(ClassName.SHOW) || context._hoverState === HoverState.SHOW) {
        context._hoverState = HoverState.SHOW;
        return;
      }

      clearTimeout(context._timeout);

      context._hoverState = HoverState.SHOW;

      if (!context.config.delay || !context.config.delay.show) {
        context.show();
        return;
      }

      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.SHOW) {
          context.show();
        }
      }, context.config.delay.show);
    };

    Tooltip.prototype._leave = function _leave(event, context) {
      var dataKey = this.constructor.DATA_KEY;

      context = context || $(event.currentTarget).data(dataKey);

      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }

      if (event) {
        context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
      }

      if (context._isWithActiveTrigger()) {
        return;
      }

      clearTimeout(context._timeout);

      context._hoverState = HoverState.OUT;

      if (!context.config.delay || !context.config.delay.hide) {
        context.hide();
        return;
      }

      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.OUT) {
          context.hide();
        }
      }, context.config.delay.hide);
    };

    Tooltip.prototype._isWithActiveTrigger = function _isWithActiveTrigger() {
      for (var trigger in this._activeTrigger) {
        if (this._activeTrigger[trigger]) {
          return true;
        }
      }

      return false;
    };

    Tooltip.prototype._getConfig = function _getConfig(config) {
      config = $.extend({}, this.constructor.Default, $(this.element).data(), config);

      if (config.delay && typeof config.delay === 'number') {
        config.delay = {
          show: config.delay,
          hide: config.delay
        };
      }

      if (config.title && typeof config.title === 'number') {
        config.title = config.title.toString();
      }

      if (config.content && typeof config.content === 'number') {
        config.content = config.content.toString();
      }

      Util.typeCheckConfig(NAME, config, this.constructor.DefaultType);

      return config;
    };

    Tooltip.prototype._getDelegateConfig = function _getDelegateConfig() {
      var config = {};

      if (this.config) {
        for (var key in this.config) {
          if (this.constructor.Default[key] !== this.config[key]) {
            config[key] = this.config[key];
          }
        }
      }

      return config;
    };

    Tooltip.prototype._cleanTipClass = function _cleanTipClass() {
      var $tip = $(this.getTipElement());
      var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);
      if (tabClass !== null && tabClass.length > 0) {
        $tip.removeClass(tabClass.join(''));
      }
    };

    Tooltip.prototype._handlePopperPlacementChange = function _handlePopperPlacementChange(data) {
      this._cleanTipClass();
      this.addAttachmentClass(this._getAttachment(data.placement));
    };

    Tooltip.prototype._fixTransition = function _fixTransition() {
      var tip = this.getTipElement();
      var initConfigAnimation = this.config.animation;
      if (tip.getAttribute('x-placement') !== null) {
        return;
      }
      $(tip).removeClass(ClassName.FADE);
      this.config.animation = false;
      this.hide();
      this.show();
      this.config.animation = initConfigAnimation;
    };

    // static

    Tooltip._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);
        var _config = (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' && config;

        if (!data && /dispose|hide/.test(config)) {
          return;
        }

        if (!data) {
          data = new Tooltip(this, _config);
          $(this).data(DATA_KEY, data);
        }

        if (typeof config === 'string') {
          if (data[config] === undefined) {
            throw new Error('No method named "' + config + '"');
          }
          data[config]();
        }
      });
    };

    _createClass(Tooltip, null, [{
      key: 'VERSION',
      get: function get() {
        return VERSION;
      }
    }, {
      key: 'Default',
      get: function get() {
        return Default;
      }
    }, {
      key: 'NAME',
      get: function get() {
        return NAME;
      }
    }, {
      key: 'DATA_KEY',
      get: function get() {
        return DATA_KEY;
      }
    }, {
      key: 'Event',
      get: function get() {
        return Event;
      }
    }, {
      key: 'EVENT_KEY',
      get: function get() {
        return EVENT_KEY;
      }
    }, {
      key: 'DefaultType',
      get: function get() {
        return DefaultType;
      }
    }]);

    return Tooltip;
  }();

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Tooltip._jQueryInterface;
  $.fn[NAME].Constructor = Tooltip;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Tooltip._jQueryInterface;
  };

  return Tooltip;
}(jQuery); /* global Popper */
;
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
 * --------------------------------------------------------------------------
 * Bootstrap (v4.0.0-alpha.6): popover.js
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * --------------------------------------------------------------------------
 */

var Popover = function ($) {

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'popover';
  var VERSION = '4.0.0-alpha.6';
  var DATA_KEY = 'bs.popover';
  var EVENT_KEY = '.' + DATA_KEY;
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var CLASS_PREFIX = 'bs-popover';
  var BSCLS_PREFIX_REGEX = new RegExp('(^|\\s)' + CLASS_PREFIX + '\\S+', 'g');

  var Default = $.extend({}, Tooltip.Default, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-title"></h3>' + '<div class="popover-content"></div></div>'
  });

  var DefaultType = $.extend({}, Tooltip.DefaultType, {
    content: '(string|element|function)'
  });

  var ClassName = {
    FADE: 'fade',
    SHOW: 'show'
  };

  var Selector = {
    TITLE: '.popover-title',
    CONTENT: '.popover-content'
  };

  var Event = {
    HIDE: 'hide' + EVENT_KEY,
    HIDDEN: 'hidden' + EVENT_KEY,
    SHOW: 'show' + EVENT_KEY,
    SHOWN: 'shown' + EVENT_KEY,
    INSERTED: 'inserted' + EVENT_KEY,
    CLICK: 'click' + EVENT_KEY,
    FOCUSIN: 'focusin' + EVENT_KEY,
    FOCUSOUT: 'focusout' + EVENT_KEY,
    MOUSEENTER: 'mouseenter' + EVENT_KEY,
    MOUSELEAVE: 'mouseleave' + EVENT_KEY
  };

  /**
   * ------------------------------------------------------------------------
   * Class Definition
   * ------------------------------------------------------------------------
   */

  var Popover = function (_Tooltip) {
    _inherits(Popover, _Tooltip);

    function Popover() {
      _classCallCheck(this, Popover);

      return _possibleConstructorReturn(this, _Tooltip.apply(this, arguments));
    }

    // overrides

    Popover.prototype.isWithContent = function isWithContent() {
      return this.getTitle() || this._getContent();
    };

    Popover.prototype.addAttachmentClass = function addAttachmentClass(attachment) {
      $(this.getTipElement()).addClass(CLASS_PREFIX + '-' + attachment);
    };

    Popover.prototype.getTipElement = function getTipElement() {
      return this.tip = this.tip || $(this.config.template)[0];
    };

    Popover.prototype.setContent = function setContent() {
      var $tip = $(this.getTipElement());

      // we use append for html objects to maintain js events
      this.setElementContent($tip.find(Selector.TITLE), this.getTitle());
      this.setElementContent($tip.find(Selector.CONTENT), this._getContent());

      $tip.removeClass(ClassName.FADE + ' ' + ClassName.SHOW);
    };

    // private

    Popover.prototype._getContent = function _getContent() {
      return this.element.getAttribute('data-content') || (typeof this.config.content === 'function' ? this.config.content.call(this.element) : this.config.content);
    };

    Popover.prototype._cleanTipClass = function _cleanTipClass() {
      var $tip = $(this.getTipElement());
      var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);
      if (tabClass !== null && tabClass.length > 0) {
        $tip.removeClass(tabClass.join(''));
      }
    };

    // static

    Popover._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY);
        var _config = (typeof config === 'undefined' ? 'undefined' : _typeof(config)) === 'object' ? config : null;

        if (!data && /destroy|hide/.test(config)) {
          return;
        }

        if (!data) {
          data = new Popover(this, _config);
          $(this).data(DATA_KEY, data);
        }

        if (typeof config === 'string') {
          if (data[config] === undefined) {
            throw new Error('No method named "' + config + '"');
          }
          data[config]();
        }
      });
    };

    _createClass(Popover, null, [{
      key: 'VERSION',


      // getters

      get: function get() {
        return VERSION;
      }
    }, {
      key: 'Default',
      get: function get() {
        return Default;
      }
    }, {
      key: 'NAME',
      get: function get() {
        return NAME;
      }
    }, {
      key: 'DATA_KEY',
      get: function get() {
        return DATA_KEY;
      }
    }, {
      key: 'Event',
      get: function get() {
        return Event;
      }
    }, {
      key: 'EVENT_KEY',
      get: function get() {
        return EVENT_KEY;
      }
    }, {
      key: 'DefaultType',
      get: function get() {
        return DefaultType;
      }
    }]);

    return Popover;
  }(Tooltip);

  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Popover._jQueryInterface;
  $.fn[NAME].Constructor = Popover;
  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Popover._jQueryInterface;
  };

  return Popover;
}(jQuery);











/*! Select2 4.0.4 | https://github.com/select2/select2/blob/master/LICENSE.md */
!function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof module&&module.exports?module.exports=function(b,c){return void 0===c&&(c="undefined"!=typeof window?require("jquery"):require("jquery")(b)),a(c),c}:a(jQuery)}(function(a){var b=function(){if(a&&a.fn&&a.fn.select2&&a.fn.select2.amd)var b=a.fn.select2.amd;var b;return function(){if(!b||!b.requirejs){b?c=b:b={};var a,c,d;!function(b){function e(a,b){return v.call(a,b)}function f(a,b){var c,d,e,f,g,h,i,j,k,l,m,n,o=b&&b.split("/"),p=t.map,q=p&&p["*"]||{};if(a){for(a=a.split("/"),g=a.length-1,t.nodeIdCompat&&x.test(a[g])&&(a[g]=a[g].replace(x,"")),"."===a[0].charAt(0)&&o&&(n=o.slice(0,o.length-1),a=n.concat(a)),k=0;k<a.length;k++)if("."===(m=a[k]))a.splice(k,1),k-=1;else if(".."===m){if(0===k||1===k&&".."===a[2]||".."===a[k-1])continue;k>0&&(a.splice(k-1,2),k-=2)}a=a.join("/")}if((o||q)&&p){for(c=a.split("/"),k=c.length;k>0;k-=1){if(d=c.slice(0,k).join("/"),o)for(l=o.length;l>0;l-=1)if((e=p[o.slice(0,l).join("/")])&&(e=e[d])){f=e,h=k;break}if(f)break;!i&&q&&q[d]&&(i=q[d],j=k)}!f&&i&&(f=i,h=j),f&&(c.splice(0,h,f),a=c.join("/"))}return a}function g(a,c){return function(){var d=w.call(arguments,0);return"string"!=typeof d[0]&&1===d.length&&d.push(null),o.apply(b,d.concat([a,c]))}}function h(a){return function(b){return f(b,a)}}function i(a){return function(b){r[a]=b}}function j(a){if(e(s,a)){var c=s[a];delete s[a],u[a]=!0,n.apply(b,c)}if(!e(r,a)&&!e(u,a))throw new Error("No "+a);return r[a]}function k(a){var b,c=a?a.indexOf("!"):-1;return c>-1&&(b=a.substring(0,c),a=a.substring(c+1,a.length)),[b,a]}function l(a){return a?k(a):[]}function m(a){return function(){return t&&t.config&&t.config[a]||{}}}var n,o,p,q,r={},s={},t={},u={},v=Object.prototype.hasOwnProperty,w=[].slice,x=/\.js$/;p=function(a,b){var c,d=k(a),e=d[0],g=b[1];return a=d[1],e&&(e=f(e,g),c=j(e)),e?a=c&&c.normalize?c.normalize(a,h(g)):f(a,g):(a=f(a,g),d=k(a),e=d[0],a=d[1],e&&(c=j(e))),{f:e?e+"!"+a:a,n:a,pr:e,p:c}},q={require:function(a){return g(a)},exports:function(a){var b=r[a];return void 0!==b?b:r[a]={}},module:function(a){return{id:a,uri:"",exports:r[a],config:m(a)}}},n=function(a,c,d,f){var h,k,m,n,o,t,v,w=[],x=typeof d;if(f=f||a,t=l(f),"undefined"===x||"function"===x){for(c=!c.length&&d.length?["require","exports","module"]:c,o=0;o<c.length;o+=1)if(n=p(c[o],t),"require"===(k=n.f))w[o]=q.require(a);else if("exports"===k)w[o]=q.exports(a),v=!0;else if("module"===k)h=w[o]=q.module(a);else if(e(r,k)||e(s,k)||e(u,k))w[o]=j(k);else{if(!n.p)throw new Error(a+" missing "+k);n.p.load(n.n,g(f,!0),i(k),{}),w[o]=r[k]}m=d?d.apply(r[a],w):void 0,a&&(h&&h.exports!==b&&h.exports!==r[a]?r[a]=h.exports:m===b&&v||(r[a]=m))}else a&&(r[a]=d)},a=c=o=function(a,c,d,e,f){if("string"==typeof a)return q[a]?q[a](c):j(p(a,l(c)).f);if(!a.splice){if(t=a,t.deps&&o(t.deps,t.callback),!c)return;c.splice?(a=c,c=d,d=null):a=b}return c=c||function(){},"function"==typeof d&&(d=e,e=f),e?n(b,a,c,d):setTimeout(function(){n(b,a,c,d)},4),o},o.config=function(a){return o(a)},a._defined=r,d=function(a,b,c){if("string"!=typeof a)throw new Error("See almond README: incorrect module build, no module name");b.splice||(c=b,b=[]),e(r,a)||e(s,a)||(s[a]=[a,b,c])},d.amd={jQuery:!0}}(),b.requirejs=a,b.require=c,b.define=d}}(),b.define("almond",function(){}),b.define("jquery",[],function(){var b=a||$;return null==b&&console&&console.error&&console.error("Select2: An instance of jQuery or a jQuery-compatible library was not found. Make sure that you are including jQuery before Select2 on your web page."),b}),b.define("select2/utils",["jquery"],function(a){function b(a){var b=a.prototype,c=[];for(var d in b){"function"==typeof b[d]&&("constructor"!==d&&c.push(d))}return c}var c={};c.Extend=function(a,b){function c(){this.constructor=a}var d={}.hasOwnProperty;for(var e in b)d.call(b,e)&&(a[e]=b[e]);return c.prototype=b.prototype,a.prototype=new c,a.__super__=b.prototype,a},c.Decorate=function(a,c){function d(){var b=Array.prototype.unshift,d=c.prototype.constructor.length,e=a.prototype.constructor;d>0&&(b.call(arguments,a.prototype.constructor),e=c.prototype.constructor),e.apply(this,arguments)}function e(){this.constructor=d}var f=b(c),g=b(a);c.displayName=a.displayName,d.prototype=new e;for(var h=0;h<g.length;h++){var i=g[h];d.prototype[i]=a.prototype[i]}for(var j=(function(a){var b=function(){};a in d.prototype&&(b=d.prototype[a]);var e=c.prototype[a];return function(){return Array.prototype.unshift.call(arguments,b),e.apply(this,arguments)}}),k=0;k<f.length;k++){var l=f[k];d.prototype[l]=j(l)}return d};var d=function(){this.listeners={}};return d.prototype.on=function(a,b){this.listeners=this.listeners||{},a in this.listeners?this.listeners[a].push(b):this.listeners[a]=[b]},d.prototype.trigger=function(a){var b=Array.prototype.slice,c=b.call(arguments,1);this.listeners=this.listeners||{},null==c&&(c=[]),0===c.length&&c.push({}),c[0]._type=a,a in this.listeners&&this.invoke(this.listeners[a],b.call(arguments,1)),"*"in this.listeners&&this.invoke(this.listeners["*"],arguments)},d.prototype.invoke=function(a,b){for(var c=0,d=a.length;c<d;c++)a[c].apply(this,b)},c.Observable=d,c.generateChars=function(a){for(var b="",c=0;c<a;c++){b+=Math.floor(36*Math.random()).toString(36)}return b},c.bind=function(a,b){return function(){a.apply(b,arguments)}},c._convertData=function(a){for(var b in a){var c=b.split("-"),d=a;if(1!==c.length){for(var e=0;e<c.length;e++){var f=c[e];f=f.substring(0,1).toLowerCase()+f.substring(1),f in d||(d[f]={}),e==c.length-1&&(d[f]=a[b]),d=d[f]}delete a[b]}}return a},c.hasScroll=function(b,c){var d=a(c),e=c.style.overflowX,f=c.style.overflowY;return(e!==f||"hidden"!==f&&"visible"!==f)&&("scroll"===e||"scroll"===f||(d.innerHeight()<c.scrollHeight||d.innerWidth()<c.scrollWidth))},c.escapeMarkup=function(a){var b={"\\":"&#92;","&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","/":"&#47;"};return"string"!=typeof a?a:String(a).replace(/[&<>"'\/\\]/g,function(a){return b[a]})},c.appendMany=function(b,c){if("1.7"===a.fn.jquery.substr(0,3)){var d=a();a.map(c,function(a){d=d.add(a)}),c=d}b.append(c)},c}),b.define("select2/results",["jquery","./utils"],function(a,b){function c(a,b,d){this.$element=a,this.data=d,this.options=b,c.__super__.constructor.call(this)}return b.Extend(c,b.Observable),c.prototype.render=function(){var b=a('<ul class="select2-results__options" role="tree"></ul>');return this.options.get("multiple")&&b.attr("aria-multiselectable","true"),this.$results=b,b},c.prototype.clear=function(){this.$results.empty()},c.prototype.displayMessage=function(b){var c=this.options.get("escapeMarkup");this.clear(),this.hideLoading();var d=a('<li role="treeitem" aria-live="assertive" class="select2-results__option"></li>'),e=this.options.get("translations").get(b.message);d.append(c(e(b.args))),d[0].className+=" select2-results__message",this.$results.append(d)},c.prototype.hideMessages=function(){this.$results.find(".select2-results__message").remove()},c.prototype.append=function(a){this.hideLoading();var b=[];if(null==a.results||0===a.results.length)return void(0===this.$results.children().length&&this.trigger("results:message",{message:"noResults"}));a.results=this.sort(a.results);for(var c=0;c<a.results.length;c++){var d=a.results[c],e=this.option(d);b.push(e)}this.$results.append(b)},c.prototype.position=function(a,b){b.find(".select2-results").append(a)},c.prototype.sort=function(a){return this.options.get("sorter")(a)},c.prototype.highlightFirstItem=function(){var a=this.$results.find(".select2-results__option[aria-selected]"),b=a.filter("[aria-selected=true]");b.length>0?b.first().trigger("mouseenter"):a.first().trigger("mouseenter"),this.ensureHighlightVisible()},c.prototype.setClasses=function(){var b=this;this.data.current(function(c){var d=a.map(c,function(a){return a.id.toString()});b.$results.find(".select2-results__option[aria-selected]").each(function(){var b=a(this),c=a.data(this,"data"),e=""+c.id;null!=c.element&&c.element.selected||null==c.element&&a.inArray(e,d)>-1?b.attr("aria-selected","true"):b.attr("aria-selected","false")})})},c.prototype.showLoading=function(a){this.hideLoading();var b=this.options.get("translations").get("searching"),c={disabled:!0,loading:!0,text:b(a)},d=this.option(c);d.className+=" loading-results",this.$results.prepend(d)},c.prototype.hideLoading=function(){this.$results.find(".loading-results").remove()},c.prototype.option=function(b){var c=document.createElement("li");c.className="select2-results__option";var d={role:"treeitem","aria-selected":"false"};b.disabled&&(delete d["aria-selected"],d["aria-disabled"]="true"),null==b.id&&delete d["aria-selected"],null!=b._resultId&&(c.id=b._resultId),b.title&&(c.title=b.title),b.children&&(d.role="group",d["aria-label"]=b.text,delete d["aria-selected"]);for(var e in d){var f=d[e];c.setAttribute(e,f)}if(b.children){var g=a(c),h=document.createElement("strong");h.className="select2-results__group";a(h);this.template(b,h);for(var i=[],j=0;j<b.children.length;j++){var k=b.children[j],l=this.option(k);i.push(l)}var m=a("<ul></ul>",{class:"select2-results__options select2-results__options--nested"});m.append(i),g.append(h),g.append(m)}else this.template(b,c);return a.data(c,"data",b),c},c.prototype.bind=function(b,c){var d=this,e=b.id+"-results";this.$results.attr("id",e),b.on("results:all",function(a){d.clear(),d.append(a.data),b.isOpen()&&(d.setClasses(),d.highlightFirstItem())}),b.on("results:append",function(a){d.append(a.data),b.isOpen()&&d.setClasses()}),b.on("query",function(a){d.hideMessages(),d.showLoading(a)}),b.on("select",function(){b.isOpen()&&(d.setClasses(),d.highlightFirstItem())}),b.on("unselect",function(){b.isOpen()&&(d.setClasses(),d.highlightFirstItem())}),b.on("open",function(){d.$results.attr("aria-expanded","true"),d.$results.attr("aria-hidden","false"),d.setClasses(),d.ensureHighlightVisible()}),b.on("close",function(){d.$results.attr("aria-expanded","false"),d.$results.attr("aria-hidden","true"),d.$results.removeAttr("aria-activedescendant")}),b.on("results:toggle",function(){var a=d.getHighlightedResults();0!==a.length&&a.trigger("mouseup")}),b.on("results:select",function(){var a=d.getHighlightedResults();if(0!==a.length){var b=a.data("data");"true"==a.attr("aria-selected")?d.trigger("close",{}):d.trigger("select",{data:b})}}),b.on("results:previous",function(){var a=d.getHighlightedResults(),b=d.$results.find("[aria-selected]"),c=b.index(a);if(0!==c){var e=c-1;0===a.length&&(e=0);var f=b.eq(e);f.trigger("mouseenter");var g=d.$results.offset().top,h=f.offset().top,i=d.$results.scrollTop()+(h-g);0===e?d.$results.scrollTop(0):h-g<0&&d.$results.scrollTop(i)}}),b.on("results:next",function(){var a=d.getHighlightedResults(),b=d.$results.find("[aria-selected]"),c=b.index(a),e=c+1;if(!(e>=b.length)){var f=b.eq(e);f.trigger("mouseenter");var g=d.$results.offset().top+d.$results.outerHeight(!1),h=f.offset().top+f.outerHeight(!1),i=d.$results.scrollTop()+h-g;0===e?d.$results.scrollTop(0):h>g&&d.$results.scrollTop(i)}}),b.on("results:focus",function(a){a.element.addClass("select2-results__option--highlighted")}),b.on("results:message",function(a){d.displayMessage(a)}),a.fn.mousewheel&&this.$results.on("mousewheel",function(a){var b=d.$results.scrollTop(),c=d.$results.get(0).scrollHeight-b+a.deltaY,e=a.deltaY>0&&b-a.deltaY<=0,f=a.deltaY<0&&c<=d.$results.height();e?(d.$results.scrollTop(0),a.preventDefault(),a.stopPropagation()):f&&(d.$results.scrollTop(d.$results.get(0).scrollHeight-d.$results.height()),a.preventDefault(),a.stopPropagation())}),this.$results.on("mouseup",".select2-results__option[aria-selected]",function(b){var c=a(this),e=c.data("data");if("true"===c.attr("aria-selected"))return void(d.options.get("multiple")?d.trigger("unselect",{originalEvent:b,data:e}):d.trigger("close",{}));d.trigger("select",{originalEvent:b,data:e})}),this.$results.on("mouseenter",".select2-results__option[aria-selected]",function(b){var c=a(this).data("data");d.getHighlightedResults().removeClass("select2-results__option--highlighted"),d.trigger("results:focus",{data:c,element:a(this)})})},c.prototype.getHighlightedResults=function(){return this.$results.find(".select2-results__option--highlighted")},c.prototype.destroy=function(){this.$results.remove()},c.prototype.ensureHighlightVisible=function(){var a=this.getHighlightedResults();if(0!==a.length){var b=this.$results.find("[aria-selected]"),c=b.index(a),d=this.$results.offset().top,e=a.offset().top,f=this.$results.scrollTop()+(e-d),g=e-d;f-=2*a.outerHeight(!1),c<=2?this.$results.scrollTop(0):(g>this.$results.outerHeight()||g<0)&&this.$results.scrollTop(f)}},c.prototype.template=function(b,c){var d=this.options.get("templateResult"),e=this.options.get("escapeMarkup"),f=d(b,c);null==f?c.style.display="none":"string"==typeof f?c.innerHTML=e(f):a(c).append(f)},c}),b.define("select2/keys",[],function(){return{BACKSPACE:8,TAB:9,ENTER:13,SHIFT:16,CTRL:17,ALT:18,ESC:27,SPACE:32,PAGE_UP:33,PAGE_DOWN:34,END:35,HOME:36,LEFT:37,UP:38,RIGHT:39,DOWN:40,DELETE:46}}),b.define("select2/selection/base",["jquery","../utils","../keys"],function(a,b,c){function d(a,b){this.$element=a,this.options=b,d.__super__.constructor.call(this)}return b.Extend(d,b.Observable),d.prototype.render=function(){var b=a('<span class="select2-selection" role="combobox"  aria-haspopup="true" aria-expanded="false"></span>');return this._tabindex=0,null!=this.$element.data("old-tabindex")?this._tabindex=this.$element.data("old-tabindex"):null!=this.$element.attr("tabindex")&&(this._tabindex=this.$element.attr("tabindex")),b.attr("title",this.$element.attr("title")),b.attr("tabindex",this._tabindex),this.$selection=b,b},d.prototype.bind=function(a,b){var d=this,e=(a.id,a.id+"-results");this.container=a,this.$selection.on("focus",function(a){d.trigger("focus",a)}),this.$selection.on("blur",function(a){d._handleBlur(a)}),this.$selection.on("keydown",function(a){d.trigger("keypress",a),a.which===c.SPACE&&a.preventDefault()}),a.on("results:focus",function(a){d.$selection.attr("aria-activedescendant",a.data._resultId)}),a.on("selection:update",function(a){d.update(a.data)}),a.on("open",function(){d.$selection.attr("aria-expanded","true"),d.$selection.attr("aria-owns",e),d._attachCloseHandler(a)}),a.on("close",function(){d.$selection.attr("aria-expanded","false"),d.$selection.removeAttr("aria-activedescendant"),d.$selection.removeAttr("aria-owns"),d.$selection.focus(),d._detachCloseHandler(a)}),a.on("enable",function(){d.$selection.attr("tabindex",d._tabindex)}),a.on("disable",function(){d.$selection.attr("tabindex","-1")})},d.prototype._handleBlur=function(b){var c=this;window.setTimeout(function(){document.activeElement==c.$selection[0]||a.contains(c.$selection[0],document.activeElement)||c.trigger("blur",b)},1)},d.prototype._attachCloseHandler=function(b){a(document.body).on("mousedown.select2."+b.id,function(b){var c=a(b.target),d=c.closest(".select2");a(".select2.select2-container--open").each(function(){var b=a(this);this!=d[0]&&b.data("element").select2("close")})})},d.prototype._detachCloseHandler=function(b){a(document.body).off("mousedown.select2."+b.id)},d.prototype.position=function(a,b){b.find(".selection").append(a)},d.prototype.destroy=function(){this._detachCloseHandler(this.container)},d.prototype.update=function(a){throw new Error("The `update` method must be defined in child classes.")},d}),b.define("select2/selection/single",["jquery","./base","../utils","../keys"],function(a,b,c,d){function e(){e.__super__.constructor.apply(this,arguments)}return c.Extend(e,b),e.prototype.render=function(){var a=e.__super__.render.call(this);return a.addClass("select2-selection--single"),a.html('<span class="select2-selection__rendered"></span><span class="select2-selection__arrow" role="presentation"><b role="presentation"></b></span>'),a},e.prototype.bind=function(a,b){var c=this;e.__super__.bind.apply(this,arguments);var d=a.id+"-container";this.$selection.find(".select2-selection__rendered").attr("id",d),this.$selection.attr("aria-labelledby",d),this.$selection.on("mousedown",function(a){1===a.which&&c.trigger("toggle",{originalEvent:a})}),this.$selection.on("focus",function(a){}),this.$selection.on("blur",function(a){}),a.on("focus",function(b){a.isOpen()||c.$selection.focus()}),a.on("selection:update",function(a){c.update(a.data)})},e.prototype.clear=function(){this.$selection.find(".select2-selection__rendered").empty()},e.prototype.display=function(a,b){var c=this.options.get("templateSelection");return this.options.get("escapeMarkup")(c(a,b))},e.prototype.selectionContainer=function(){return a("<span></span>")},e.prototype.update=function(a){if(0===a.length)return void this.clear();var b=a[0],c=this.$selection.find(".select2-selection__rendered"),d=this.display(b,c);c.empty().append(d),c.prop("title",b.title||b.text)},e}),b.define("select2/selection/multiple",["jquery","./base","../utils"],function(a,b,c){function d(a,b){d.__super__.constructor.apply(this,arguments)}return c.Extend(d,b),d.prototype.render=function(){var a=d.__super__.render.call(this);return a.addClass("select2-selection--multiple"),a.html('<ul class="select2-selection__rendered"></ul>'),a},d.prototype.bind=function(b,c){var e=this;d.__super__.bind.apply(this,arguments),this.$selection.on("click",function(a){e.trigger("toggle",{originalEvent:a})}),this.$selection.on("click",".select2-selection__choice__remove",function(b){if(!e.options.get("disabled")){var c=a(this),d=c.parent(),f=d.data("data");e.trigger("unselect",{originalEvent:b,data:f})}})},d.prototype.clear=function(){this.$selection.find(".select2-selection__rendered").empty()},d.prototype.display=function(a,b){var c=this.options.get("templateSelection");return this.options.get("escapeMarkup")(c(a,b))},d.prototype.selectionContainer=function(){return a('<li class="select2-selection__choice"><span class="select2-selection__choice__remove" role="presentation">&times;</span></li>')},d.prototype.update=function(a){if(this.clear(),0!==a.length){for(var b=[],d=0;d<a.length;d++){var e=a[d],f=this.selectionContainer(),g=this.display(e,f);f.append(g),f.prop("title",e.title||e.text),f.data("data",e),b.push(f)}var h=this.$selection.find(".select2-selection__rendered");c.appendMany(h,b)}},d}),b.define("select2/selection/placeholder",["../utils"],function(a){function b(a,b,c){this.placeholder=this.normalizePlaceholder(c.get("placeholder")),a.call(this,b,c)}return b.prototype.normalizePlaceholder=function(a,b){return"string"==typeof b&&(b={id:"",text:b}),b},b.prototype.createPlaceholder=function(a,b){var c=this.selectionContainer();return c.html(this.display(b)),c.addClass("select2-selection__placeholder").removeClass("select2-selection__choice"),c},b.prototype.update=function(a,b){var c=1==b.length&&b[0].id!=this.placeholder.id;if(b.length>1||c)return a.call(this,b);this.clear();var d=this.createPlaceholder(this.placeholder);this.$selection.find(".select2-selection__rendered").append(d)},b}),b.define("select2/selection/allowClear",["jquery","../keys"],function(a,b){function c(){}return c.prototype.bind=function(a,b,c){var d=this;a.call(this,b,c),null==this.placeholder&&this.options.get("debug")&&window.console&&console.error&&console.error("Select2: The `allowClear` option should be used in combination with the `placeholder` option."),this.$selection.on("mousedown",".select2-selection__clear",function(a){d._handleClear(a)}),b.on("keypress",function(a){d._handleKeyboardClear(a,b)})},c.prototype._handleClear=function(a,b){if(!this.options.get("disabled")){var c=this.$selection.find(".select2-selection__clear");if(0!==c.length){b.stopPropagation();for(var d=c.data("data"),e=0;e<d.length;e++){var f={data:d[e]};if(this.trigger("unselect",f),f.prevented)return}this.$element.val(this.placeholder.id).trigger("change"),this.trigger("toggle",{})}}},c.prototype._handleKeyboardClear=function(a,c,d){d.isOpen()||c.which!=b.DELETE&&c.which!=b.BACKSPACE||this._handleClear(c)},c.prototype.update=function(b,c){if(b.call(this,c),!(this.$selection.find(".select2-selection__placeholder").length>0||0===c.length)){var d=a('<span class="select2-selection__clear">&times;</span>');d.data("data",c),this.$selection.find(".select2-selection__rendered").prepend(d)}},c}),b.define("select2/selection/search",["jquery","../utils","../keys"],function(a,b,c){function d(a,b,c){a.call(this,b,c)}return d.prototype.render=function(b){var c=a('<li class="select2-search select2-search--inline"><input class="select2-search__field" type="search" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" role="textbox" aria-autocomplete="list" /></li>');this.$searchContainer=c,this.$search=c.find("input");var d=b.call(this);return this._transferTabIndex(),d},d.prototype.bind=function(a,b,d){var e=this;a.call(this,b,d),b.on("open",function(){e.$search.trigger("focus")}),b.on("close",function(){e.$search.val(""),e.$search.removeAttr("aria-activedescendant"),e.$search.trigger("focus")}),b.on("enable",function(){e.$search.prop("disabled",!1),e._transferTabIndex()}),b.on("disable",function(){e.$search.prop("disabled",!0)}),b.on("focus",function(a){e.$search.trigger("focus")}),b.on("results:focus",function(a){e.$search.attr("aria-activedescendant",a.id)}),this.$selection.on("focusin",".select2-search--inline",function(a){e.trigger("focus",a)}),this.$selection.on("focusout",".select2-search--inline",function(a){e._handleBlur(a)}),this.$selection.on("keydown",".select2-search--inline",function(a){if(a.stopPropagation(),e.trigger("keypress",a),e._keyUpPrevented=a.isDefaultPrevented(),a.which===c.BACKSPACE&&""===e.$search.val()){var b=e.$searchContainer.prev(".select2-selection__choice");if(b.length>0){var d=b.data("data");e.searchRemoveChoice(d),a.preventDefault()}}});var f=document.documentMode,g=f&&f<=11;this.$selection.on("input.searchcheck",".select2-search--inline",function(a){if(g)return void e.$selection.off("input.search input.searchcheck");e.$selection.off("keyup.search")}),this.$selection.on("keyup.search input.search",".select2-search--inline",function(a){if(g&&"input"===a.type)return void e.$selection.off("input.search input.searchcheck");var b=a.which;b!=c.SHIFT&&b!=c.CTRL&&b!=c.ALT&&b!=c.TAB&&e.handleSearch(a)})},d.prototype._transferTabIndex=function(a){this.$search.attr("tabindex",this.$selection.attr("tabindex")),this.$selection.attr("tabindex","-1")},d.prototype.createPlaceholder=function(a,b){this.$search.attr("placeholder",b.text)},d.prototype.update=function(a,b){var c=this.$search[0]==document.activeElement;this.$search.attr("placeholder",""),a.call(this,b),this.$selection.find(".select2-selection__rendered").append(this.$searchContainer),this.resizeSearch(),c&&this.$search.focus()},d.prototype.handleSearch=function(){if(this.resizeSearch(),!this._keyUpPrevented){var a=this.$search.val();this.trigger("query",{term:a})}this._keyUpPrevented=!1},d.prototype.searchRemoveChoice=function(a,b){this.trigger("unselect",{data:b}),this.$search.val(b.text),this.handleSearch()},d.prototype.resizeSearch=function(){this.$search.css("width","25px");var a="";if(""!==this.$search.attr("placeholder"))a=this.$selection.find(".select2-selection__rendered").innerWidth();else{a=.75*(this.$search.val().length+1)+"em"}this.$search.css("width",a)},d}),b.define("select2/selection/eventRelay",["jquery"],function(a){function b(){}return b.prototype.bind=function(b,c,d){var e=this,f=["open","opening","close","closing","select","selecting","unselect","unselecting"],g=["opening","closing","selecting","unselecting"];b.call(this,c,d),c.on("*",function(b,c){if(-1!==a.inArray(b,f)){c=c||{};var d=a.Event("select2:"+b,{params:c});e.$element.trigger(d),-1!==a.inArray(b,g)&&(c.prevented=d.isDefaultPrevented())}})},b}),b.define("select2/translation",["jquery","require"],function(a,b){function c(a){this.dict=a||{}}return c.prototype.all=function(){return this.dict},c.prototype.get=function(a){return this.dict[a]},c.prototype.extend=function(b){this.dict=a.extend({},b.all(),this.dict)},c._cache={},c.loadPath=function(a){if(!(a in c._cache)){var d=b(a);c._cache[a]=d}return new c(c._cache[a])},c}),b.define("select2/diacritics",[],function(){return{"Ⓐ":"A","Ａ":"A","À":"A","Á":"A","Â":"A","Ầ":"A","Ấ":"A","Ẫ":"A","Ẩ":"A","Ã":"A","Ā":"A","Ă":"A","Ằ":"A","Ắ":"A","Ẵ":"A","Ẳ":"A","Ȧ":"A","Ǡ":"A","Ä":"A","Ǟ":"A","Ả":"A","Å":"A","Ǻ":"A","Ǎ":"A","Ȁ":"A","Ȃ":"A","Ạ":"A","Ậ":"A","Ặ":"A","Ḁ":"A","Ą":"A","Ⱥ":"A","Ɐ":"A","Ꜳ":"AA","Æ":"AE","Ǽ":"AE","Ǣ":"AE","Ꜵ":"AO","Ꜷ":"AU","Ꜹ":"AV","Ꜻ":"AV","Ꜽ":"AY","Ⓑ":"B","Ｂ":"B","Ḃ":"B","Ḅ":"B","Ḇ":"B","Ƀ":"B","Ƃ":"B","Ɓ":"B","Ⓒ":"C","Ｃ":"C","Ć":"C","Ĉ":"C","Ċ":"C","Č":"C","Ç":"C","Ḉ":"C","Ƈ":"C","Ȼ":"C","Ꜿ":"C","Ⓓ":"D","Ｄ":"D","Ḋ":"D","Ď":"D","Ḍ":"D","Ḑ":"D","Ḓ":"D","Ḏ":"D","Đ":"D","Ƌ":"D","Ɗ":"D","Ɖ":"D","Ꝺ":"D","Ǳ":"DZ","Ǆ":"DZ","ǲ":"Dz","ǅ":"Dz","Ⓔ":"E","Ｅ":"E","È":"E","É":"E","Ê":"E","Ề":"E","Ế":"E","Ễ":"E","Ể":"E","Ẽ":"E","Ē":"E","Ḕ":"E","Ḗ":"E","Ĕ":"E","Ė":"E","Ë":"E","Ẻ":"E","Ě":"E","Ȅ":"E","Ȇ":"E","Ẹ":"E","Ệ":"E","Ȩ":"E","Ḝ":"E","Ę":"E","Ḙ":"E","Ḛ":"E","Ɛ":"E","Ǝ":"E","Ⓕ":"F","Ｆ":"F","Ḟ":"F","Ƒ":"F","Ꝼ":"F","Ⓖ":"G","Ｇ":"G","Ǵ":"G","Ĝ":"G","Ḡ":"G","Ğ":"G","Ġ":"G","Ǧ":"G","Ģ":"G","Ǥ":"G","Ɠ":"G","Ꞡ":"G","Ᵹ":"G","Ꝿ":"G","Ⓗ":"H","Ｈ":"H","Ĥ":"H","Ḣ":"H","Ḧ":"H","Ȟ":"H","Ḥ":"H","Ḩ":"H","Ḫ":"H","Ħ":"H","Ⱨ":"H","Ⱶ":"H","Ɥ":"H","Ⓘ":"I","Ｉ":"I","Ì":"I","Í":"I","Î":"I","Ĩ":"I","Ī":"I","Ĭ":"I","İ":"I","Ï":"I","Ḯ":"I","Ỉ":"I","Ǐ":"I","Ȉ":"I","Ȋ":"I","Ị":"I","Į":"I","Ḭ":"I","Ɨ":"I","Ⓙ":"J","Ｊ":"J","Ĵ":"J","Ɉ":"J","Ⓚ":"K","Ｋ":"K","Ḱ":"K","Ǩ":"K","Ḳ":"K","Ķ":"K","Ḵ":"K","Ƙ":"K","Ⱪ":"K","Ꝁ":"K","Ꝃ":"K","Ꝅ":"K","Ꞣ":"K","Ⓛ":"L","Ｌ":"L","Ŀ":"L","Ĺ":"L","Ľ":"L","Ḷ":"L","Ḹ":"L","Ļ":"L","Ḽ":"L","Ḻ":"L","Ł":"L","Ƚ":"L","Ɫ":"L","Ⱡ":"L","Ꝉ":"L","Ꝇ":"L","Ꞁ":"L","Ǉ":"LJ","ǈ":"Lj","Ⓜ":"M","Ｍ":"M","Ḿ":"M","Ṁ":"M","Ṃ":"M","Ɱ":"M","Ɯ":"M","Ⓝ":"N","Ｎ":"N","Ǹ":"N","Ń":"N","Ñ":"N","Ṅ":"N","Ň":"N","Ṇ":"N","Ņ":"N","Ṋ":"N","Ṉ":"N","Ƞ":"N","Ɲ":"N","Ꞑ":"N","Ꞥ":"N","Ǌ":"NJ","ǋ":"Nj","Ⓞ":"O","Ｏ":"O","Ò":"O","Ó":"O","Ô":"O","Ồ":"O","Ố":"O","Ỗ":"O","Ổ":"O","Õ":"O","Ṍ":"O","Ȭ":"O","Ṏ":"O","Ō":"O","Ṑ":"O","Ṓ":"O","Ŏ":"O","Ȯ":"O","Ȱ":"O","Ö":"O","Ȫ":"O","Ỏ":"O","Ő":"O","Ǒ":"O","Ȍ":"O","Ȏ":"O","Ơ":"O","Ờ":"O","Ớ":"O","Ỡ":"O","Ở":"O","Ợ":"O","Ọ":"O","Ộ":"O","Ǫ":"O","Ǭ":"O","Ø":"O","Ǿ":"O","Ɔ":"O","Ɵ":"O","Ꝋ":"O","Ꝍ":"O","Ƣ":"OI","Ꝏ":"OO","Ȣ":"OU","Ⓟ":"P","Ｐ":"P","Ṕ":"P","Ṗ":"P","Ƥ":"P","Ᵽ":"P","Ꝑ":"P","Ꝓ":"P","Ꝕ":"P","Ⓠ":"Q","Ｑ":"Q","Ꝗ":"Q","Ꝙ":"Q","Ɋ":"Q","Ⓡ":"R","Ｒ":"R","Ŕ":"R","Ṙ":"R","Ř":"R","Ȑ":"R","Ȓ":"R","Ṛ":"R","Ṝ":"R","Ŗ":"R","Ṟ":"R","Ɍ":"R","Ɽ":"R","Ꝛ":"R","Ꞧ":"R","Ꞃ":"R","Ⓢ":"S","Ｓ":"S","ẞ":"S","Ś":"S","Ṥ":"S","Ŝ":"S","Ṡ":"S","Š":"S","Ṧ":"S","Ṣ":"S","Ṩ":"S","Ș":"S","Ş":"S","Ȿ":"S","Ꞩ":"S","Ꞅ":"S","Ⓣ":"T","Ｔ":"T","Ṫ":"T","Ť":"T","Ṭ":"T","Ț":"T","Ţ":"T","Ṱ":"T","Ṯ":"T","Ŧ":"T","Ƭ":"T","Ʈ":"T","Ⱦ":"T","Ꞇ":"T","Ꜩ":"TZ","Ⓤ":"U","Ｕ":"U","Ù":"U","Ú":"U","Û":"U","Ũ":"U","Ṹ":"U","Ū":"U","Ṻ":"U","Ŭ":"U","Ü":"U","Ǜ":"U","Ǘ":"U","Ǖ":"U","Ǚ":"U","Ủ":"U","Ů":"U","Ű":"U","Ǔ":"U","Ȕ":"U","Ȗ":"U","Ư":"U","Ừ":"U","Ứ":"U","Ữ":"U","Ử":"U","Ự":"U","Ụ":"U","Ṳ":"U","Ų":"U","Ṷ":"U","Ṵ":"U","Ʉ":"U","Ⓥ":"V","Ｖ":"V","Ṽ":"V","Ṿ":"V","Ʋ":"V","Ꝟ":"V","Ʌ":"V","Ꝡ":"VY","Ⓦ":"W","Ｗ":"W","Ẁ":"W","Ẃ":"W","Ŵ":"W","Ẇ":"W","Ẅ":"W","Ẉ":"W","Ⱳ":"W","Ⓧ":"X","Ｘ":"X","Ẋ":"X","Ẍ":"X","Ⓨ":"Y","Ｙ":"Y","Ỳ":"Y","Ý":"Y","Ŷ":"Y","Ỹ":"Y","Ȳ":"Y","Ẏ":"Y","Ÿ":"Y","Ỷ":"Y","Ỵ":"Y","Ƴ":"Y","Ɏ":"Y","Ỿ":"Y","Ⓩ":"Z","Ｚ":"Z","Ź":"Z","Ẑ":"Z","Ż":"Z","Ž":"Z","Ẓ":"Z","Ẕ":"Z","Ƶ":"Z","Ȥ":"Z","Ɀ":"Z","Ⱬ":"Z","Ꝣ":"Z","ⓐ":"a","ａ":"a","ẚ":"a","à":"a","á":"a","â":"a","ầ":"a","ấ":"a","ẫ":"a","ẩ":"a","ã":"a","ā":"a","ă":"a","ằ":"a","ắ":"a","ẵ":"a","ẳ":"a","ȧ":"a","ǡ":"a","ä":"a","ǟ":"a","ả":"a","å":"a","ǻ":"a","ǎ":"a","ȁ":"a","ȃ":"a","ạ":"a","ậ":"a","ặ":"a","ḁ":"a","ą":"a","ⱥ":"a","ɐ":"a","ꜳ":"aa","æ":"ae","ǽ":"ae","ǣ":"ae","ꜵ":"ao","ꜷ":"au","ꜹ":"av","ꜻ":"av","ꜽ":"ay","ⓑ":"b","ｂ":"b","ḃ":"b","ḅ":"b","ḇ":"b","ƀ":"b","ƃ":"b","ɓ":"b","ⓒ":"c","ｃ":"c","ć":"c","ĉ":"c","ċ":"c","č":"c","ç":"c","ḉ":"c","ƈ":"c","ȼ":"c","ꜿ":"c","ↄ":"c","ⓓ":"d","ｄ":"d","ḋ":"d","ď":"d","ḍ":"d","ḑ":"d","ḓ":"d","ḏ":"d","đ":"d","ƌ":"d","ɖ":"d","ɗ":"d","ꝺ":"d","ǳ":"dz","ǆ":"dz","ⓔ":"e","ｅ":"e","è":"e","é":"e","ê":"e","ề":"e","ế":"e","ễ":"e","ể":"e","ẽ":"e","ē":"e","ḕ":"e","ḗ":"e","ĕ":"e","ė":"e","ë":"e","ẻ":"e","ě":"e","ȅ":"e","ȇ":"e","ẹ":"e","ệ":"e","ȩ":"e","ḝ":"e","ę":"e","ḙ":"e","ḛ":"e","ɇ":"e","ɛ":"e","ǝ":"e","ⓕ":"f","ｆ":"f","ḟ":"f","ƒ":"f","ꝼ":"f","ⓖ":"g","ｇ":"g","ǵ":"g","ĝ":"g","ḡ":"g","ğ":"g","ġ":"g","ǧ":"g","ģ":"g","ǥ":"g","ɠ":"g","ꞡ":"g","ᵹ":"g","ꝿ":"g","ⓗ":"h","ｈ":"h","ĥ":"h","ḣ":"h","ḧ":"h","ȟ":"h","ḥ":"h","ḩ":"h","ḫ":"h","ẖ":"h","ħ":"h","ⱨ":"h","ⱶ":"h","ɥ":"h","ƕ":"hv","ⓘ":"i","ｉ":"i","ì":"i","í":"i","î":"i","ĩ":"i","ī":"i","ĭ":"i","ï":"i","ḯ":"i","ỉ":"i","ǐ":"i","ȉ":"i","ȋ":"i","ị":"i","į":"i","ḭ":"i","ɨ":"i","ı":"i","ⓙ":"j","ｊ":"j","ĵ":"j","ǰ":"j","ɉ":"j","ⓚ":"k","ｋ":"k","ḱ":"k","ǩ":"k","ḳ":"k","ķ":"k","ḵ":"k","ƙ":"k","ⱪ":"k","ꝁ":"k","ꝃ":"k","ꝅ":"k","ꞣ":"k","ⓛ":"l","ｌ":"l","ŀ":"l","ĺ":"l","ľ":"l","ḷ":"l","ḹ":"l","ļ":"l","ḽ":"l","ḻ":"l","ſ":"l","ł":"l","ƚ":"l","ɫ":"l","ⱡ":"l","ꝉ":"l","ꞁ":"l","ꝇ":"l","ǉ":"lj","ⓜ":"m","ｍ":"m","ḿ":"m","ṁ":"m","ṃ":"m","ɱ":"m","ɯ":"m","ⓝ":"n","ｎ":"n","ǹ":"n","ń":"n","ñ":"n","ṅ":"n","ň":"n","ṇ":"n","ņ":"n","ṋ":"n","ṉ":"n","ƞ":"n","ɲ":"n","ŉ":"n","ꞑ":"n","ꞥ":"n","ǌ":"nj","ⓞ":"o","ｏ":"o","ò":"o","ó":"o","ô":"o","ồ":"o","ố":"o","ỗ":"o","ổ":"o","õ":"o","ṍ":"o","ȭ":"o","ṏ":"o","ō":"o","ṑ":"o","ṓ":"o","ŏ":"o","ȯ":"o","ȱ":"o","ö":"o","ȫ":"o","ỏ":"o","ő":"o","ǒ":"o","ȍ":"o","ȏ":"o","ơ":"o","ờ":"o","ớ":"o","ỡ":"o","ở":"o","ợ":"o","ọ":"o","ộ":"o","ǫ":"o","ǭ":"o","ø":"o","ǿ":"o","ɔ":"o","ꝋ":"o","ꝍ":"o","ɵ":"o","ƣ":"oi","ȣ":"ou","ꝏ":"oo","ⓟ":"p","ｐ":"p","ṕ":"p","ṗ":"p","ƥ":"p","ᵽ":"p","ꝑ":"p","ꝓ":"p","ꝕ":"p","ⓠ":"q","ｑ":"q","ɋ":"q","ꝗ":"q","ꝙ":"q","ⓡ":"r","ｒ":"r","ŕ":"r","ṙ":"r","ř":"r","ȑ":"r","ȓ":"r","ṛ":"r","ṝ":"r","ŗ":"r","ṟ":"r","ɍ":"r","ɽ":"r","ꝛ":"r","ꞧ":"r","ꞃ":"r","ⓢ":"s","ｓ":"s","ß":"s","ś":"s","ṥ":"s","ŝ":"s","ṡ":"s","š":"s","ṧ":"s","ṣ":"s","ṩ":"s","ș":"s","ş":"s","ȿ":"s","ꞩ":"s","ꞅ":"s","ẛ":"s","ⓣ":"t","ｔ":"t","ṫ":"t","ẗ":"t","ť":"t","ṭ":"t","ț":"t","ţ":"t","ṱ":"t","ṯ":"t","ŧ":"t","ƭ":"t","ʈ":"t","ⱦ":"t","ꞇ":"t","ꜩ":"tz","ⓤ":"u","ｕ":"u","ù":"u","ú":"u","û":"u","ũ":"u","ṹ":"u","ū":"u","ṻ":"u","ŭ":"u","ü":"u","ǜ":"u","ǘ":"u","ǖ":"u","ǚ":"u","ủ":"u","ů":"u","ű":"u","ǔ":"u","ȕ":"u","ȗ":"u","ư":"u","ừ":"u","ứ":"u","ữ":"u","ử":"u","ự":"u","ụ":"u","ṳ":"u","ų":"u","ṷ":"u","ṵ":"u","ʉ":"u","ⓥ":"v","ｖ":"v","ṽ":"v","ṿ":"v","ʋ":"v","ꝟ":"v","ʌ":"v","ꝡ":"vy","ⓦ":"w","ｗ":"w","ẁ":"w","ẃ":"w","ŵ":"w","ẇ":"w","ẅ":"w","ẘ":"w","ẉ":"w","ⱳ":"w","ⓧ":"x","ｘ":"x","ẋ":"x","ẍ":"x","ⓨ":"y","ｙ":"y","ỳ":"y","ý":"y","ŷ":"y","ỹ":"y","ȳ":"y","ẏ":"y","ÿ":"y","ỷ":"y","ẙ":"y","ỵ":"y","ƴ":"y","ɏ":"y","ỿ":"y","ⓩ":"z","ｚ":"z","ź":"z","ẑ":"z","ż":"z","ž":"z","ẓ":"z","ẕ":"z","ƶ":"z","ȥ":"z","ɀ":"z","ⱬ":"z","ꝣ":"z","Ά":"Α","Έ":"Ε","Ή":"Η","Ί":"Ι","Ϊ":"Ι","Ό":"Ο","Ύ":"Υ","Ϋ":"Υ","Ώ":"Ω","ά":"α","έ":"ε","ή":"η","ί":"ι","ϊ":"ι","ΐ":"ι","ό":"ο","ύ":"υ","ϋ":"υ","ΰ":"υ","ω":"ω","ς":"σ"}}),b.define("select2/data/base",["../utils"],function(a){function b(a,c){b.__super__.constructor.call(this)}return a.Extend(b,a.Observable),b.prototype.current=function(a){throw new Error("The `current` method must be defined in child classes.")},b.prototype.query=function(a,b){throw new Error("The `query` method must be defined in child classes.")},b.prototype.bind=function(a,b){},b.prototype.destroy=function(){},b.prototype.generateResultId=function(b,c){var d=b.id+"-result-";return d+=a.generateChars(4),null!=c.id?d+="-"+c.id.toString():d+="-"+a.generateChars(4),d},b}),b.define("select2/data/select",["./base","../utils","jquery"],function(a,b,c){function d(a,b){this.$element=a,this.options=b,d.__super__.constructor.call(this)}return b.Extend(d,a),d.prototype.current=function(a){var b=[],d=this;this.$element.find(":selected").each(function(){var a=c(this),e=d.item(a);b.push(e)}),a(b)},d.prototype.select=function(a){var b=this;if(a.selected=!0,c(a.element).is("option"))return a.element.selected=!0,void this.$element.trigger("change");if(this.$element.prop("multiple"))this.current(function(d){var e=[];a=[a],a.push.apply(a,d);for(var f=0;f<a.length;f++){var g=a[f].id;-1===c.inArray(g,e)&&e.push(g)}b.$element.val(e),b.$element.trigger("change")});else{var d=a.id;this.$element.val(d),this.$element.trigger("change")}},d.prototype.unselect=function(a){var b=this;if(this.$element.prop("multiple")){if(a.selected=!1,c(a.element).is("option"))return a.element.selected=!1,void this.$element.trigger("change");this.current(function(d){for(var e=[],f=0;f<d.length;f++){var g=d[f].id;g!==a.id&&-1===c.inArray(g,e)&&e.push(g)}b.$element.val(e),b.$element.trigger("change")})}},d.prototype.bind=function(a,b){var c=this;this.container=a,a.on("select",function(a){c.select(a.data)}),a.on("unselect",function(a){c.unselect(a.data)})},d.prototype.destroy=function(){this.$element.find("*").each(function(){c.removeData(this,"data")})},d.prototype.query=function(a,b){var d=[],e=this;this.$element.children().each(function(){var b=c(this);if(b.is("option")||b.is("optgroup")){var f=e.item(b),g=e.matches(a,f);null!==g&&d.push(g)}}),b({results:d})},d.prototype.addOptions=function(a){b.appendMany(this.$element,a)},d.prototype.option=function(a){var b;a.children?(b=document.createElement("optgroup"),b.label=a.text):(b=document.createElement("option"),void 0!==b.textContent?b.textContent=a.text:b.innerText=a.text),void 0!==a.id&&(b.value=a.id),a.disabled&&(b.disabled=!0),a.selected&&(b.selected=!0),a.title&&(b.title=a.title);var d=c(b),e=this._normalizeItem(a);return e.element=b,c.data(b,"data",e),d},d.prototype.item=function(a){var b={};if(null!=(b=c.data(a[0],"data")))return b;if(a.is("option"))b={id:a.val(),text:a.text(),disabled:a.prop("disabled"),selected:a.prop("selected"),title:a.prop("title")};else if(a.is("optgroup")){b={text:a.prop("label"),children:[],title:a.prop("title")};for(var d=a.children("option"),e=[],f=0;f<d.length;f++){var g=c(d[f]),h=this.item(g);e.push(h)}b.children=e}return b=this._normalizeItem(b),b.element=a[0],c.data(a[0],"data",b),b},d.prototype._normalizeItem=function(a){c.isPlainObject(a)||(a={id:a,text:a}),a=c.extend({},{text:""},a);var b={selected:!1,disabled:!1};return null!=a.id&&(a.id=a.id.toString()),null!=a.text&&(a.text=a.text.toString()),null==a._resultId&&a.id&&null!=this.container&&(a._resultId=this.generateResultId(this.container,a)),c.extend({},b,a)},d.prototype.matches=function(a,b){return this.options.get("matcher")(a,b)},d}),b.define("select2/data/array",["./select","../utils","jquery"],function(a,b,c){function d(a,b){var c=b.get("data")||[];d.__super__.constructor.call(this,a,b),this.addOptions(this.convertToOptions(c))}return b.Extend(d,a),d.prototype.select=function(a){var b=this.$element.find("option").filter(function(b,c){return c.value==a.id.toString()});0===b.length&&(b=this.option(a),this.addOptions(b)),d.__super__.select.call(this,a)},d.prototype.convertToOptions=function(a){function d(a){return function(){return c(this).val()==a.id}}for(var e=this,f=this.$element.find("option"),g=f.map(function(){return e.item(c(this)).id}).get(),h=[],i=0;i<a.length;i++){var j=this._normalizeItem(a[i]);if(c.inArray(j.id,g)>=0){var k=f.filter(d(j)),l=this.item(k),m=c.extend(!0,{},j,l),n=this.option(m);k.replaceWith(n)}else{var o=this.option(j);if(j.children){var p=this.convertToOptions(j.children);b.appendMany(o,p)}h.push(o)}}return h},d}),b.define("select2/data/ajax",["./array","../utils","jquery"],function(a,b,c){function d(a,b){this.ajaxOptions=this._applyDefaults(b.get("ajax")),null!=this.ajaxOptions.processResults&&(this.processResults=this.ajaxOptions.processResults),d.__super__.constructor.call(this,a,b)}return b.Extend(d,a),d.prototype._applyDefaults=function(a){var b={data:function(a){return c.extend({},a,{q:a.term})},transport:function(a,b,d){var e=c.ajax(a);return e.then(b),e.fail(d),e}};return c.extend({},b,a,!0)},d.prototype.processResults=function(a){return a},d.prototype.query=function(a,b){function d(){var d=f.transport(f,function(d){var f=e.processResults(d,a);e.options.get("debug")&&window.console&&console.error&&(f&&f.results&&c.isArray(f.results)||console.error("Select2: The AJAX results did not return an array in the `results` key of the response.")),b(f)},function(){d.status&&"0"===d.status||e.trigger("results:message",{message:"errorLoading"})});e._request=d}var e=this;null!=this._request&&(c.isFunction(this._request.abort)&&this._request.abort(),this._request=null);var f=c.extend({type:"GET"},this.ajaxOptions);"function"==typeof f.url&&(f.url=f.url.call(this.$element,a)),"function"==typeof f.data&&(f.data=f.data.call(this.$element,a)),this.ajaxOptions.delay&&null!=a.term?(this._queryTimeout&&window.clearTimeout(this._queryTimeout),this._queryTimeout=window.setTimeout(d,this.ajaxOptions.delay)):d()},d}),b.define("select2/data/tags",["jquery"],function(a){function b(b,c,d){var e=d.get("tags"),f=d.get("createTag");void 0!==f&&(this.createTag=f);var g=d.get("insertTag");if(void 0!==g&&(this.insertTag=g),b.call(this,c,d),a.isArray(e))for(var h=0;h<e.length;h++){var i=e[h],j=this._normalizeItem(i),k=this.option(j);this.$element.append(k)}}return b.prototype.query=function(a,b,c){function d(a,f){for(var g=a.results,h=0;h<g.length;h++){var i=g[h],j=null!=i.children&&!d({results:i.children},!0);if((i.text||"").toUpperCase()===(b.term||"").toUpperCase()||j)return!f&&(a.data=g,void c(a))}if(f)return!0;var k=e.createTag(b);if(null!=k){var l=e.option(k);l.attr("data-select2-tag",!0),e.addOptions([l]),e.insertTag(g,k)}a.results=g,c(a)}var e=this;if(this._removeOldTags(),null==b.term||null!=b.page)return void a.call(this,b,c);a.call(this,b,d)},b.prototype.createTag=function(b,c){var d=a.trim(c.term);return""===d?null:{id:d,text:d}},b.prototype.insertTag=function(a,b,c){b.unshift(c)},b.prototype._removeOldTags=function(b){this._lastTag;this.$element.find("option[data-select2-tag]").each(function(){this.selected||a(this).remove()})},b}),b.define("select2/data/tokenizer",["jquery"],function(a){function b(a,b,c){var d=c.get("tokenizer");void 0!==d&&(this.tokenizer=d),a.call(this,b,c)}return b.prototype.bind=function(a,b,c){a.call(this,b,c),this.$search=b.dropdown.$search||b.selection.$search||c.find(".select2-search__field")},b.prototype.query=function(b,c,d){function e(b){var c=g._normalizeItem(b);if(!g.$element.find("option").filter(function(){return a(this).val()===c.id}).length){var d=g.option(c);d.attr("data-select2-tag",!0),g._removeOldTags(),g.addOptions([d])}f(c)}function f(a){g.trigger("select",{data:a})}var g=this;c.term=c.term||"";var h=this.tokenizer(c,this.options,e);h.term!==c.term&&(this.$search.length&&(this.$search.val(h.term),this.$search.focus()),c.term=h.term),b.call(this,c,d)},b.prototype.tokenizer=function(b,c,d,e){for(var f=d.get("tokenSeparators")||[],g=c.term,h=0,i=this.createTag||function(a){return{id:a.term,text:a.term}};h<g.length;){var j=g[h];if(-1!==a.inArray(j,f)){var k=g.substr(0,h),l=a.extend({},c,{term:k}),m=i(l);null!=m?(e(m),g=g.substr(h+1)||"",h=0):h++}else h++}return{term:g}},b}),b.define("select2/data/minimumInputLength",[],function(){function a(a,b,c){this.minimumInputLength=c.get("minimumInputLength"),a.call(this,b,c)}return a.prototype.query=function(a,b,c){if(b.term=b.term||"",b.term.length<this.minimumInputLength)return void this.trigger("results:message",{message:"inputTooShort",args:{minimum:this.minimumInputLength,input:b.term,params:b}});a.call(this,b,c)},a}),b.define("select2/data/maximumInputLength",[],function(){function a(a,b,c){this.maximumInputLength=c.get("maximumInputLength"),a.call(this,b,c)}return a.prototype.query=function(a,b,c){if(b.term=b.term||"",this.maximumInputLength>0&&b.term.length>this.maximumInputLength)return void this.trigger("results:message",{message:"inputTooLong",args:{maximum:this.maximumInputLength,input:b.term,params:b}});a.call(this,b,c)},a}),b.define("select2/data/maximumSelectionLength",[],function(){function a(a,b,c){this.maximumSelectionLength=c.get("maximumSelectionLength"),a.call(this,b,c)}return a.prototype.query=function(a,b,c){var d=this;this.current(function(e){var f=null!=e?e.length:0;if(d.maximumSelectionLength>0&&f>=d.maximumSelectionLength)return void d.trigger("results:message",{message:"maximumSelected",args:{maximum:d.maximumSelectionLength}});a.call(d,b,c)})},a}),b.define("select2/dropdown",["jquery","./utils"],function(a,b){function c(a,b){this.$element=a,this.options=b,c.__super__.constructor.call(this)}return b.Extend(c,b.Observable),c.prototype.render=function(){var b=a('<span class="select2-dropdown"><span class="select2-results"></span></span>');return b.attr("dir",this.options.get("dir")),this.$dropdown=b,b},c.prototype.bind=function(){},c.prototype.position=function(a,b){},c.prototype.destroy=function(){this.$dropdown.remove()},c}),b.define("select2/dropdown/search",["jquery","../utils"],function(a,b){function c(){}return c.prototype.render=function(b){var c=b.call(this),d=a('<span class="select2-search select2-search--dropdown"><input class="select2-search__field" type="search" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" role="textbox" /></span>');return this.$searchContainer=d,this.$search=d.find("input"),c.prepend(d),c},c.prototype.bind=function(b,c,d){var e=this;b.call(this,c,d),this.$search.on("keydown",function(a){e.trigger("keypress",a),e._keyUpPrevented=a.isDefaultPrevented()}),this.$search.on("input",function(b){a(this).off("keyup")}),this.$search.on("keyup input",function(a){e.handleSearch(a)}),c.on("open",function(){e.$search.attr("tabindex",0),e.$search.focus(),window.setTimeout(function(){e.$search.focus()},0)}),c.on("close",function(){e.$search.attr("tabindex",-1),e.$search.val("")}),c.on("focus",function(){c.isOpen()||e.$search.focus()}),c.on("results:all",function(a){if(null==a.query.term||""===a.query.term){e.showSearch(a)?e.$searchContainer.removeClass("select2-search--hide"):e.$searchContainer.addClass("select2-search--hide")}})},c.prototype.handleSearch=function(a){if(!this._keyUpPrevented){var b=this.$search.val();this.trigger("query",{term:b})}this._keyUpPrevented=!1},c.prototype.showSearch=function(a,b){return!0},c}),b.define("select2/dropdown/hidePlaceholder",[],function(){function a(a,b,c,d){this.placeholder=this.normalizePlaceholder(c.get("placeholder")),a.call(this,b,c,d)}return a.prototype.append=function(a,b){b.results=this.removePlaceholder(b.results),a.call(this,b)},a.prototype.normalizePlaceholder=function(a,b){return"string"==typeof b&&(b={id:"",text:b}),b},a.prototype.removePlaceholder=function(a,b){for(var c=b.slice(0),d=b.length-1;d>=0;d--){var e=b[d];this.placeholder.id===e.id&&c.splice(d,1)}return c},a}),b.define("select2/dropdown/infiniteScroll",["jquery"],function(a){function b(a,b,c,d){this.lastParams={},a.call(this,b,c,d),this.$loadingMore=this.createLoadingMore(),this.loading=!1}return b.prototype.append=function(a,b){this.$loadingMore.remove(),this.loading=!1,a.call(this,b),this.showLoadingMore(b)&&this.$results.append(this.$loadingMore)},b.prototype.bind=function(b,c,d){var e=this;b.call(this,c,d),c.on("query",function(a){e.lastParams=a,e.loading=!0}),c.on("query:append",function(a){e.lastParams=a,e.loading=!0}),this.$results.on("scroll",function(){var b=a.contains(document.documentElement,e.$loadingMore[0]);if(!e.loading&&b){e.$results.offset().top+e.$results.outerHeight(!1)+50>=e.$loadingMore.offset().top+e.$loadingMore.outerHeight(!1)&&e.loadMore()}})},b.prototype.loadMore=function(){this.loading=!0;var b=a.extend({},{page:1},this.lastParams);b.page++,this.trigger("query:append",b)},b.prototype.showLoadingMore=function(a,b){return b.pagination&&b.pagination.more},b.prototype.createLoadingMore=function(){var b=a('<li class="select2-results__option select2-results__option--load-more"role="treeitem" aria-disabled="true"></li>'),c=this.options.get("translations").get("loadingMore");return b.html(c(this.lastParams)),b},b}),b.define("select2/dropdown/attachBody",["jquery","../utils"],function(a,b){function c(b,c,d){this.$dropdownParent=d.get("dropdownParent")||a(document.body),b.call(this,c,d)}return c.prototype.bind=function(a,b,c){var d=this,e=!1;a.call(this,b,c),b.on("open",function(){d._showDropdown(),d._attachPositioningHandler(b),e||(e=!0,b.on("results:all",function(){d._positionDropdown(),d._resizeDropdown()}),b.on("results:append",function(){d._positionDropdown(),d._resizeDropdown()}))}),b.on("close",function(){d._hideDropdown(),d._detachPositioningHandler(b)}),this.$dropdownContainer.on("mousedown",function(a){a.stopPropagation()})},c.prototype.destroy=function(a){a.call(this),this.$dropdownContainer.remove()},c.prototype.position=function(a,b,c){b.attr("class",c.attr("class")),b.removeClass("select2"),b.addClass("select2-container--open"),b.css({position:"absolute",top:-999999}),this.$container=c},c.prototype.render=function(b){var c=a("<span></span>"),d=b.call(this);return c.append(d),this.$dropdownContainer=c,c},c.prototype._hideDropdown=function(a){this.$dropdownContainer.detach()},c.prototype._attachPositioningHandler=function(c,d){var e=this,f="scroll.select2."+d.id,g="resize.select2."+d.id,h="orientationchange.select2."+d.id,i=this.$container.parents().filter(b.hasScroll);i.each(function(){a(this).data("select2-scroll-position",{x:a(this).scrollLeft(),y:a(this).scrollTop()})}),i.on(f,function(b){var c=a(this).data("select2-scroll-position");a(this).scrollTop(c.y)}),a(window).on(f+" "+g+" "+h,function(a){e._positionDropdown(),e._resizeDropdown()})},c.prototype._detachPositioningHandler=function(c,d){var e="scroll.select2."+d.id,f="resize.select2."+d.id,g="orientationchange.select2."+d.id;this.$container.parents().filter(b.hasScroll).off(e),a(window).off(e+" "+f+" "+g)},c.prototype._positionDropdown=function(){var b=a(window),c=this.$dropdown.hasClass("select2-dropdown--above"),d=this.$dropdown.hasClass("select2-dropdown--below"),e=null,f=this.$container.offset();f.bottom=f.top+this.$container.outerHeight(!1);var g={height:this.$container.outerHeight(!1)};g.top=f.top,g.bottom=f.top+g.height;var h={height:this.$dropdown.outerHeight(!1)},i={top:b.scrollTop(),bottom:b.scrollTop()+b.height()},j=i.top<f.top-h.height,k=i.bottom>f.bottom+h.height,l={left:f.left,top:g.bottom},m=this.$dropdownParent;"static"===m.css("position")&&(m=m.offsetParent());var n=m.offset();l.top-=n.top,l.left-=n.left,c||d||(e="below"),k||!j||c?!j&&k&&c&&(e="below"):e="above",("above"==e||c&&"below"!==e)&&(l.top=g.top-n.top-h.height),null!=e&&(this.$dropdown.removeClass("select2-dropdown--below select2-dropdown--above").addClass("select2-dropdown--"+e),this.$container.removeClass("select2-container--below select2-container--above").addClass("select2-container--"+e)),this.$dropdownContainer.css(l)},c.prototype._resizeDropdown=function(){var a={width:this.$container.outerWidth(!1)+"px"};this.options.get("dropdownAutoWidth")&&(a.minWidth=a.width,a.position="relative",a.width="auto"),this.$dropdown.css(a)},c.prototype._showDropdown=function(a){this.$dropdownContainer.appendTo(this.$dropdownParent),this._positionDropdown(),this._resizeDropdown()},c}),b.define("select2/dropdown/minimumResultsForSearch",[],function(){function a(b){for(var c=0,d=0;d<b.length;d++){var e=b[d];e.children?c+=a(e.children):c++}return c}function b(a,b,c,d){this.minimumResultsForSearch=c.get("minimumResultsForSearch"),this.minimumResultsForSearch<0&&(this.minimumResultsForSearch=1/0),a.call(this,b,c,d)}return b.prototype.showSearch=function(b,c){return!(a(c.data.results)<this.minimumResultsForSearch)&&b.call(this,c)},b}),b.define("select2/dropdown/selectOnClose",[],function(){function a(){}return a.prototype.bind=function(a,b,c){var d=this;a.call(this,b,c),b.on("close",function(a){d._handleSelectOnClose(a)})},a.prototype._handleSelectOnClose=function(a,b){if(b&&null!=b.originalSelect2Event){var c=b.originalSelect2Event;if("select"===c._type||"unselect"===c._type)return}var d=this.getHighlightedResults();if(!(d.length<1)){var e=d.data("data");null!=e.element&&e.element.selected||null==e.element&&e.selected||this.trigger("select",{data:e})}},a}),b.define("select2/dropdown/closeOnSelect",[],function(){function a(){}return a.prototype.bind=function(a,b,c){var d=this;a.call(this,b,c),b.on("select",function(a){d._selectTriggered(a)}),b.on("unselect",function(a){d._selectTriggered(a)})},a.prototype._selectTriggered=function(a,b){var c=b.originalEvent;c&&c.ctrlKey||this.trigger("close",{originalEvent:c,originalSelect2Event:b})},a}),b.define("select2/i18n/en",[],function(){return{errorLoading:function(){return"The results could not be loaded."},inputTooLong:function(a){var b=a.input.length-a.maximum,c="Please delete "+b+" character";return 1!=b&&(c+="s"),c},inputTooShort:function(a){return"Please enter "+(a.minimum-a.input.length)+" or more characters"},loadingMore:function(){return"Loading more results…"},maximumSelected:function(a){var b="You can only select "+a.maximum+" item";return 1!=a.maximum&&(b+="s"),b},noResults:function(){return"No results found"},searching:function(){return"Searching…"}}}),b.define("select2/defaults",["jquery","require","./results","./selection/single","./selection/multiple","./selection/placeholder","./selection/allowClear","./selection/search","./selection/eventRelay","./utils","./translation","./diacritics","./data/select","./data/array","./data/ajax","./data/tags","./data/tokenizer","./data/minimumInputLength","./data/maximumInputLength","./data/maximumSelectionLength","./dropdown","./dropdown/search","./dropdown/hidePlaceholder","./dropdown/infiniteScroll","./dropdown/attachBody","./dropdown/minimumResultsForSearch","./dropdown/selectOnClose","./dropdown/closeOnSelect","./i18n/en"],function(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C){function D(){this.reset()}return D.prototype.apply=function(l){if(l=a.extend(!0,{},this.defaults,l),null==l.dataAdapter){if(null!=l.ajax?l.dataAdapter=o:null!=l.data?l.dataAdapter=n:l.dataAdapter=m,l.minimumInputLength>0&&(l.dataAdapter=j.Decorate(l.dataAdapter,r)),l.maximumInputLength>0&&(l.dataAdapter=j.Decorate(l.dataAdapter,s)),l.maximumSelectionLength>0&&(l.dataAdapter=j.Decorate(l.dataAdapter,t)),l.tags&&(l.dataAdapter=j.Decorate(l.dataAdapter,p)),null==l.tokenSeparators&&null==l.tokenizer||(l.dataAdapter=j.Decorate(l.dataAdapter,q)),null!=l.query){var C=b(l.amdBase+"compat/query");l.dataAdapter=j.Decorate(l.dataAdapter,C)}if(null!=l.initSelection){var D=b(l.amdBase+"compat/initSelection");l.dataAdapter=j.Decorate(l.dataAdapter,D)}}if(null==l.resultsAdapter&&(l.resultsAdapter=c,null!=l.ajax&&(l.resultsAdapter=j.Decorate(l.resultsAdapter,x)),null!=l.placeholder&&(l.resultsAdapter=j.Decorate(l.resultsAdapter,w)),l.selectOnClose&&(l.resultsAdapter=j.Decorate(l.resultsAdapter,A))),null==l.dropdownAdapter){if(l.multiple)l.dropdownAdapter=u;else{var E=j.Decorate(u,v);l.dropdownAdapter=E}if(0!==l.minimumResultsForSearch&&(l.dropdownAdapter=j.Decorate(l.dropdownAdapter,z)),l.closeOnSelect&&(l.dropdownAdapter=j.Decorate(l.dropdownAdapter,B)),null!=l.dropdownCssClass||null!=l.dropdownCss||null!=l.adaptDropdownCssClass){var F=b(l.amdBase+"compat/dropdownCss");l.dropdownAdapter=j.Decorate(l.dropdownAdapter,F)}l.dropdownAdapter=j.Decorate(l.dropdownAdapter,y)}if(null==l.selectionAdapter){if(l.multiple?l.selectionAdapter=e:l.selectionAdapter=d,null!=l.placeholder&&(l.selectionAdapter=j.Decorate(l.selectionAdapter,f)),l.allowClear&&(l.selectionAdapter=j.Decorate(l.selectionAdapter,g)),l.multiple&&(l.selectionAdapter=j.Decorate(l.selectionAdapter,h)),null!=l.containerCssClass||null!=l.containerCss||null!=l.adaptContainerCssClass){var G=b(l.amdBase+"compat/containerCss");l.selectionAdapter=j.Decorate(l.selectionAdapter,G)}l.selectionAdapter=j.Decorate(l.selectionAdapter,i)}if("string"==typeof l.language)if(l.language.indexOf("-")>0){var H=l.language.split("-"),I=H[0];l.language=[l.language,I]}else l.language=[l.language];if(a.isArray(l.language)){var J=new k;l.language.push("en");for(var K=l.language,L=0;L<K.length;L++){var M=K[L],N={};try{N=k.loadPath(M)}catch(a){try{M=this.defaults.amdLanguageBase+M,N=k.loadPath(M)}catch(a){l.debug&&window.console&&console.warn&&console.warn('Select2: The language file for "'+M+'" could not be automatically loaded. A fallback will be used instead.');continue}}J.extend(N)}l.translations=J}else{var O=k.loadPath(this.defaults.amdLanguageBase+"en"),P=new k(l.language);P.extend(O),l.translations=P}return l},D.prototype.reset=function(){function b(a){function b(a){return l[a]||a}return a.replace(/[^\u0000-\u007E]/g,b)}function c(d,e){if(""===a.trim(d.term))return e;if(e.children&&e.children.length>0){for(var f=a.extend(!0,{},e),g=e.children.length-1;g>=0;g--){null==c(d,e.children[g])&&f.children.splice(g,1)}return f.children.length>0?f:c(d,f)}var h=b(e.text).toUpperCase(),i=b(d.term).toUpperCase();return h.indexOf(i)>-1?e:null}this.defaults={amdBase:"./",amdLanguageBase:"./i18n/",closeOnSelect:!0,debug:!1,dropdownAutoWidth:!1,escapeMarkup:j.escapeMarkup,language:C,matcher:c,minimumInputLength:0,maximumInputLength:0,maximumSelectionLength:0,minimumResultsForSearch:0,selectOnClose:!1,sorter:function(a){return a},templateResult:function(a){return a.text},templateSelection:function(a){return a.text},theme:"default",width:"resolve"}},D.prototype.set=function(b,c){var d=a.camelCase(b),e={};e[d]=c;var f=j._convertData(e);a.extend(this.defaults,f)},new D}),b.define("select2/options",["require","jquery","./defaults","./utils"],function(a,b,c,d){function e(b,e){if(this.options=b,null!=e&&this.fromElement(e),this.options=c.apply(this.options),e&&e.is("input")){var f=a(this.get("amdBase")+"compat/inputData");this.options.dataAdapter=d.Decorate(this.options.dataAdapter,f)}}return e.prototype.fromElement=function(a){var c=["select2"];null==this.options.multiple&&(this.options.multiple=a.prop("multiple")),null==this.options.disabled&&(this.options.disabled=a.prop("disabled")),null==this.options.language&&(a.prop("lang")?this.options.language=a.prop("lang").toLowerCase():a.closest("[lang]").prop("lang")&&(this.options.language=a.closest("[lang]").prop("lang"))),null==this.options.dir&&(a.prop("dir")?this.options.dir=a.prop("dir"):a.closest("[dir]").prop("dir")?this.options.dir=a.closest("[dir]").prop("dir"):this.options.dir="ltr"),a.prop("disabled",this.options.disabled),a.prop("multiple",this.options.multiple),a.data("select2Tags")&&(this.options.debug&&window.console&&console.warn&&console.warn('Select2: The `data-select2-tags` attribute has been changed to use the `data-data` and `data-tags="true"` attributes and will be removed in future versions of Select2.'),a.data("data",a.data("select2Tags")),a.data("tags",!0)),a.data("ajaxUrl")&&(this.options.debug&&window.console&&console.warn&&console.warn("Select2: The `data-ajax-url` attribute has been changed to `data-ajax--url` and support for the old attribute will be removed in future versions of Select2."),a.attr("ajax--url",a.data("ajaxUrl")),a.data("ajax--url",a.data("ajaxUrl")));var e={};e=b.fn.jquery&&"1."==b.fn.jquery.substr(0,2)&&a[0].dataset?b.extend(!0,{},a[0].dataset,a.data()):a.data();var f=b.extend(!0,{},e);f=d._convertData(f);for(var g in f)b.inArray(g,c)>-1||(b.isPlainObject(this.options[g])?b.extend(this.options[g],f[g]):this.options[g]=f[g]);return this},e.prototype.get=function(a){return this.options[a]},e.prototype.set=function(a,b){this.options[a]=b},e}),b.define("select2/core",["jquery","./options","./utils","./keys"],function(a,b,c,d){var e=function(a,c){null!=a.data("select2")&&a.data("select2").destroy(),this.$element=a,this.id=this._generateId(a),c=c||{},this.options=new b(c,a),e.__super__.constructor.call(this);var d=a.attr("tabindex")||0;a.data("old-tabindex",d),a.attr("tabindex","-1");var f=this.options.get("dataAdapter");this.dataAdapter=new f(a,this.options);var g=this.render();this._placeContainer(g);var h=this.options.get("selectionAdapter");this.selection=new h(a,this.options),this.$selection=this.selection.render(),this.selection.position(this.$selection,g);var i=this.options.get("dropdownAdapter");this.dropdown=new i(a,this.options),this.$dropdown=this.dropdown.render(),this.dropdown.position(this.$dropdown,g);var j=this.options.get("resultsAdapter");this.results=new j(a,this.options,this.dataAdapter),this.$results=this.results.render(),this.results.position(this.$results,this.$dropdown);var k=this;this._bindAdapters(),this._registerDomEvents(),this._registerDataEvents(),this._registerSelectionEvents(),this._registerDropdownEvents(),this._registerResultsEvents(),this._registerEvents(),this.dataAdapter.current(function(a){k.trigger("selection:update",{data:a})}),a.addClass("select2-hidden-accessible"),a.attr("aria-hidden","true"),this._syncAttributes(),a.data("select2",this)};return c.Extend(e,c.Observable),e.prototype._generateId=function(a){var b="";return b=null!=a.attr("id")?a.attr("id"):null!=a.attr("name")?a.attr("name")+"-"+c.generateChars(2):c.generateChars(4),b=b.replace(/(:|\.|\[|\]|,)/g,""),b="select2-"+b},e.prototype._placeContainer=function(a){a.insertAfter(this.$element);var b=this._resolveWidth(this.$element,this.options.get("width"));null!=b&&a.css("width",b)},e.prototype._resolveWidth=function(a,b){var c=/^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i;if("resolve"==b){var d=this._resolveWidth(a,"style");return null!=d?d:this._resolveWidth(a,"element")}if("element"==b){var e=a.outerWidth(!1);return e<=0?"auto":e+"px"}if("style"==b){var f=a.attr("style");if("string"!=typeof f)return null;for(var g=f.split(";"),h=0,i=g.length;h<i;h+=1){var j=g[h].replace(/\s/g,""),k=j.match(c);if(null!==k&&k.length>=1)return k[1]}return null}return b},e.prototype._bindAdapters=function(){this.dataAdapter.bind(this,this.$container),this.selection.bind(this,this.$container),this.dropdown.bind(this,this.$container),this.results.bind(this,this.$container)},e.prototype._registerDomEvents=function(){var b=this;this.$element.on("change.select2",function(){b.dataAdapter.current(function(a){b.trigger("selection:update",{data:a})})}),this.$element.on("focus.select2",function(a){b.trigger("focus",a)}),this._syncA=c.bind(this._syncAttributes,this),this._syncS=c.bind(this._syncSubtree,this),this.$element[0].attachEvent&&this.$element[0].attachEvent("onpropertychange",this._syncA);var d=window.MutationObserver||window.WebKitMutationObserver||window.MozMutationObserver;null!=d?(this._observer=new d(function(c){a.each(c,b._syncA),a.each(c,b._syncS)}),this._observer.observe(this.$element[0],{attributes:!0,childList:!0,subtree:!1})):this.$element[0].addEventListener&&(this.$element[0].addEventListener("DOMAttrModified",b._syncA,!1),this.$element[0].addEventListener("DOMNodeInserted",b._syncS,!1),this.$element[0].addEventListener("DOMNodeRemoved",b._syncS,!1))},e.prototype._registerDataEvents=function(){var a=this;this.dataAdapter.on("*",function(b,c){a.trigger(b,c)})},e.prototype._registerSelectionEvents=function(){var b=this,c=["toggle","focus"];this.selection.on("toggle",function(){b.toggleDropdown()}),this.selection.on("focus",function(a){b.focus(a)}),this.selection.on("*",function(d,e){-1===a.inArray(d,c)&&b.trigger(d,e)})},e.prototype._registerDropdownEvents=function(){var a=this;this.dropdown.on("*",function(b,c){a.trigger(b,c)})},e.prototype._registerResultsEvents=function(){var a=this;this.results.on("*",function(b,c){a.trigger(b,c)})},e.prototype._registerEvents=function(){var a=this;this.on("open",function(){a.$container.addClass("select2-container--open")}),this.on("close",function(){a.$container.removeClass("select2-container--open")}),this.on("enable",function(){a.$container.removeClass("select2-container--disabled")}),this.on("disable",function(){a.$container.addClass("select2-container--disabled")}),this.on("blur",function(){a.$container.removeClass("select2-container--focus")}),this.on("query",function(b){a.isOpen()||a.trigger("open",{}),this.dataAdapter.query(b,function(c){a.trigger("results:all",{data:c,query:b})})}),this.on("query:append",function(b){this.dataAdapter.query(b,function(c){a.trigger("results:append",{data:c,query:b})})}),this.on("keypress",function(b){var c=b.which;a.isOpen()?c===d.ESC||c===d.TAB||c===d.UP&&b.altKey?(a.close(),b.preventDefault()):c===d.ENTER?(a.trigger("results:select",{}),b.preventDefault()):c===d.SPACE&&b.ctrlKey?(a.trigger("results:toggle",{}),b.preventDefault()):c===d.UP?(a.trigger("results:previous",{}),b.preventDefault()):c===d.DOWN&&(a.trigger("results:next",{}),b.preventDefault()):(c===d.ENTER||c===d.SPACE||c===d.DOWN&&b.altKey)&&(a.open(),b.preventDefault())})},e.prototype._syncAttributes=function(){this.options.set("disabled",this.$element.prop("disabled")),this.options.get("disabled")?(this.isOpen()&&this.close(),this.trigger("disable",{})):this.trigger("enable",{})},e.prototype._syncSubtree=function(a,b){var c=!1,d=this;if(!a||!a.target||"OPTION"===a.target.nodeName||"OPTGROUP"===a.target.nodeName){if(b)if(b.addedNodes&&b.addedNodes.length>0)for(var e=0;e<b.addedNodes.length;e++){var f=b.addedNodes[e];f.selected&&(c=!0)}else b.removedNodes&&b.removedNodes.length>0&&(c=!0);else c=!0;c&&this.dataAdapter.current(function(a){d.trigger("selection:update",{data:a})})}},e.prototype.trigger=function(a,b){var c=e.__super__.trigger,d={open:"opening",close:"closing",select:"selecting",unselect:"unselecting"};if(void 0===b&&(b={}),a in d){var f=d[a],g={prevented:!1,name:a,args:b};if(c.call(this,f,g),g.prevented)return void(b.prevented=!0)}c.call(this,a,b)},e.prototype.toggleDropdown=function(){this.options.get("disabled")||(this.isOpen()?this.close():this.open())},e.prototype.open=function(){this.isOpen()||this.trigger("query",{})},e.prototype.close=function(){this.isOpen()&&this.trigger("close",{})},e.prototype.isOpen=function(){return this.$container.hasClass("select2-container--open")},e.prototype.hasFocus=function(){return this.$container.hasClass("select2-container--focus")},e.prototype.focus=function(a){this.hasFocus()||(this.$container.addClass("select2-container--focus"),this.trigger("focus",{}))},e.prototype.enable=function(a){this.options.get("debug")&&window.console&&console.warn&&console.warn('Select2: The `select2("enable")` method has been deprecated and will be removed in later Select2 versions. Use $element.prop("disabled") instead.'),null!=a&&0!==a.length||(a=[!0]);var b=!a[0];this.$element.prop("disabled",b)},e.prototype.data=function(){this.options.get("debug")&&arguments.length>0&&window.console&&console.warn&&console.warn('Select2: Data can no longer be set using `select2("data")`. You should consider setting the value instead using `$element.val()`.');var a=[];return this.dataAdapter.current(function(b){a=b}),a},e.prototype.val=function(b){if(this.options.get("debug")&&window.console&&console.warn&&console.warn('Select2: The `select2("val")` method has been deprecated and will be removed in later Select2 versions. Use $element.val() instead.'),null==b||0===b.length)return this.$element.val();var c=b[0];a.isArray(c)&&(c=a.map(c,function(a){return a.toString()})),this.$element.val(c).trigger("change")},e.prototype.destroy=function(){this.$container.remove(),this.$element[0].detachEvent&&this.$element[0].detachEvent("onpropertychange",this._syncA),null!=this._observer?(this._observer.disconnect(),this._observer=null):this.$element[0].removeEventListener&&(this.$element[0].removeEventListener("DOMAttrModified",this._syncA,!1),this.$element[0].removeEventListener("DOMNodeInserted",this._syncS,!1),this.$element[0].removeEventListener("DOMNodeRemoved",this._syncS,!1)),this._syncA=null,this._syncS=null,this.$element.off(".select2"),this.$element.attr("tabindex",this.$element.data("old-tabindex")),this.$element.removeClass("select2-hidden-accessible"),this.$element.attr("aria-hidden","false"),this.$element.removeData("select2"),this.dataAdapter.destroy(),this.selection.destroy(),this.dropdown.destroy(),this.results.destroy(),this.dataAdapter=null,this.selection=null,this.dropdown=null,this.results=null},e.prototype.render=function(){var b=a('<span class="select2 select2-container"><span class="selection"></span><span class="dropdown-wrapper" aria-hidden="true"></span></span>');return b.attr("dir",this.options.get("dir")),this.$container=b,this.$container.addClass("select2-container--"+this.options.get("theme")),b.data("element",this.$element),b},e}),b.define("jquery-mousewheel",["jquery"],function(a){return a}),b.define("jquery.select2",["jquery","jquery-mousewheel","./select2/core","./select2/defaults"],function(a,b,c,d){if(null==a.fn.select2){var e=["open","close","destroy"];a.fn.select2=function(b){if("object"==typeof(b=b||{}))return this.each(function(){var d=a.extend(!0,{},b);new c(a(this),d)}),this;if("string"==typeof b){var d,f=Array.prototype.slice.call(arguments,1);return this.each(function(){var c=a(this).data("select2");null==c&&window.console&&console.error&&console.error("The select2('"+b+"') method was called on an element that is not using Select2."),d=c[b].apply(c,f)}),a.inArray(b,e)>-1?this:d}throw new Error("Invalid arguments for Select2: "+b)}}return null==a.fn.select2.defaults&&(a.fn.select2.defaults=d),c}),{define:b.define,require:b.require}}(),c=b.require("jquery.select2");return a.fn.select2.amd=b,c});
String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}
;
const Creatures = function() {
  this.add = (creature) => {
    this.data.push(creature)
    return creature
  }

  this.find = (name) => {
    return this.data.filter((creature) => creature.name == name)[0]
  }

  this.findOrCreateBy = (name) => {
    return this.find(name) || this.add(this._defaultCreature(name)) // { name: name, dexterity: 10, armor_class: 10, hit_points: Roll("1d6") }
  }

  this._defaultCreature = (name) => {
    return {
      "name": name,
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 10,
      "hit_points": Roll("1d8"),
      "hit_dice": "1d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 10,
      "constitution": 10,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/6",
      "special_abilities": [],
      "actions": [
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 4 (1d8) slashing damage.",
          "attack_bonus": 1,
          "damage_dice": "1d8"
        }
      ]
    }
  }

  this.data = [
    {
      "name": "Aboleth",
      "size": "Large",
      "type": "aberration",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 17,
      "hit_points": 135,
      "hit_dice": "18d10",
      "speed": "10 ft., swim 40 ft.",
      "strength": 21,
      "dexterity": 9,
      "constitution": 15,
      "intelligence": 18,
      "wisdom": 15,
      "charisma": 18,
      "constitution_save": 6,
      "intelligence_save": 8,
      "wisdom_save": 6,
      "history": 12,
      "perception": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 20",
      "languages": "Deep Speech, telepathy 120 ft.",
      "challenge_rating": "10",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The aboleth can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Mucous Cloud",
          "desc": "While underwater, the aboleth is surrounded by transformative mucus. A creature that touches the aboleth or that hits it with a melee attack while within 5 ft. of it must make a DC 14 Constitution saving throw. On a failure, the creature is diseased for 1d4 hours. The diseased creature can breathe only underwater.",
          "attack_bonus": 0
        },
        {
          "name": "Probing Telepathy",
          "desc": "If a creature communicates telepathically with the aboleth, the aboleth learns the creature's greatest desires if the aboleth can see the creature.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The aboleth makes three tentacle attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Tentacle",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 12 (2d6 + 5) bludgeoning damage. If the target is a creature, it must succeed on a DC 14 Constitution saving throw or become diseased. The disease has no effect for 1 minute and can be removed by any magic that cures disease. After 1 minute, the diseased creature's skin becomes translucent and slimy, the creature can't regain hit points unless it is underwater, and the disease can be removed only by heal or another disease-curing spell of 6th level or higher. When the creature is outside a body of water, it takes 6 (1d12) acid damage every 10 minutes unless moisture is applied to the skin before 10 minutes have passed.",
          "attack_bonus": 9,
          "damage_dice": "2d6",
          "damage_bonus": 5
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft. one target. Hit: 15 (3d6 + 5) bludgeoning damage.",
          "attack_bonus": 9,
          "damage_dice": "3d6",
          "damage_bonus": 5
        },
        {
          "name": "Enslave (3/day)",
          "desc": "The aboleth targets one creature it can see within 30 ft. of it. The target must succeed on a DC 14 Wisdom saving throw or be magically charmed by the aboleth until the aboleth dies or until it is on a different plane of existence from the target. The charmed target is under the aboleth's control and can't take reactions, and the aboleth and the target can communicate telepathically with each other over any distance.\nWhenever the charmed target takes damage, the target can repeat the saving throw. On a success, the effect ends. No more than once every 24 hours, the target can also repeat the saving throw when it is at least 1 mile away from the aboleth.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The aboleth makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Swipe",
          "desc": "The aboleth makes one tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Psychic Drain (Costs 2 Actions)",
          "desc": "One creature charmed by the aboleth takes 10 (3d6) psychic damage, and the aboleth regains hit points equal to the damage the creature takes.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Acolyte",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 10,
      "hit_points": 9,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 10,
      "constitution": 10,
      "intelligence": 10,
      "wisdom": 14,
      "charisma": 11,
      "medicine": 4,
      "religion": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Spellcasting",
          "desc": "The acolyte is a 1st-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 12, +4 to hit with spell attacks). The acolyte has following cleric spells prepared:\n\n• Cantrips (at will): light, sacred flame, thaumaturgy\n• 1st level (3 slots): bless, cure wounds, sanctuary",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Club",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.",
          "attack_bonus": 2,
          "damage_dice": "1d4"
        }
      ]
    },
    {
      "name": "Adult Black Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 19,
      "hit_points": 195,
      "hit_dice": "17d12",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 23,
      "dexterity": 14,
      "constitution": 21,
      "intelligence": 14,
      "wisdom": 13,
      "charisma": 17,
      "dexterity_save": 7,
      "constitution_save": 10,
      "wisdom_save": 6,
      "charisma_save": 8,
      "perception": 11,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 21",
      "languages": "Common, Draconic",
      "challenge_rating": "14",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 4 (1d8) acid damage.",
          "attack_bonus": 11,
          "damage_dice": "2d10 + 1d8",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 11,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +11 to hit, reach 15 ft., one target. Hit: 15 (2d8 + 6) bludgeoning damage.",
          "attack_bonus": 11,
          "damage_dice": "2d8",
          "damage_bonus": 6
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 16 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Acid Breath (Recharge 5-6)",
          "desc": "The dragon exhales acid in a 60-foot line that is 5 feet wide. Each creature in that line must make a DC 18 Dexterity saving throw, taking 54 (12d8) acid damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "12d8"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 19 Dexterity saving throw or take 13 (2d6 + 6) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Blue Dracolich",
      "size": "Huge",
      "type": "undead",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 19,
      "hit_points": 225,
      "hit_dice": "18d12",
      "speed": "40 ft., burrow 30 ft., fly 80 ft.",
      "strength": 25,
      "dexterity": 10,
      "constitution": 23,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 19,
      "perception": 12,
      "damage_vulnerabilities": "",
      "damage_resistances": "necrotic",
      "damage_immunities": "lightning, poison",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, poisoned",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 22",
      "languages": "Common, Draconic",
      "challenge_rating": "17",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dracolich fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The dracolich has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dracolich can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +12 to hit, reach 10 ft., one target. Hit: 18 (2d10 + 7) piercing damage plus 5 (1d10) lightning damage.",
          "attack_bonus": 12,
          "damage_dice": "2d10 + 1d10",
          "damage_bonus": 7
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 14 (2d6 + 7) slashing damage.",
          "attack_bonus": 12,
          "damage_dice": "2d6",
          "damage_bonus": 7
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +12 to hit, reach 15 ft., one target. Hit: 16 (2d8 + 7) bludgeoning damage.",
          "attack_bonus": 12,
          "damage_dice": "2d8",
          "damage_bonus": 7
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dracolich's choice that is within 120 feet of the dracolich and aware of it must succeed on a DC 18 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dracolich's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Lightning Breath (Recharge 5-6)",
          "desc": "The dracolich exhales lightning in a 90-foot line that is 5 feet wide. Each creature in that line must make a DC 20 Dexterity saving throw, taking 66 (12d10) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "12d10"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dracolich makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dracolich makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dracolich beats its tattered wings. Each creature within 10 ft. of the dracolich must succeed on a DC 21 Dexterity saving throw or take 14 (2d6 + 7) bludgeoning damage and be knocked prone. After beating its wings this way, the dracolich can fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Blue Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 19,
      "hit_points": 225,
      "hit_dice": "18d12",
      "speed": "40 ft., burrow 30 ft., fly 80 ft.",
      "strength": 25,
      "dexterity": 10,
      "constitution": 23,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 19,
      "dexterity_save": 5,
      "constitution_save": 11,
      "wisdom_save": 7,
      "charisma_save": 9,
      "perception": 12,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 22",
      "languages": "Common, Draconic",
      "challenge_rating": "16",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +12 to hit, reach 10 ft., one target. Hit: 18 (2d10 + 7) piercing damage plus 5 (1d10) lightning damage.",
          "attack_bonus": 12,
          "damage_dice": "2d10 + 1d10",
          "damage_bonus": 7
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 14 (2d6 + 7) slashing damage.",
          "attack_bonus": 12,
          "damage_dice": "2d6",
          "damage_bonus": 7
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +12 to hit, reach 15 ft., one target. Hit: 16 (2d8 + 7) bludgeoning damage.",
          "attack_bonus": 12,
          "damage_dice": "2d8",
          "damage_bonus": 7
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 ft. of the dragon and aware of it must succeed on a DC 17 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Lightning Breath (Recharge 5-6)",
          "desc": "The dragon exhales lightning in a 90-foot line that is 5 ft. wide. Each creature in that line must make a DC 19 Dexterity saving throw, taking 66 (12d10) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "12d10"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 20 Dexterity saving throw or take 14 (2d6 + 7) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Brass Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 18,
      "hit_points": 172,
      "hit_dice": "15d12",
      "speed": "40 ft., burrow 40 ft., fly 80 ft.",
      "strength": 23,
      "dexterity": 10,
      "constitution": 21,
      "intelligence": 14,
      "wisdom": 13,
      "charisma": 17,
      "dexterity_save": 5,
      "constitution_save": 10,
      "wisdom_save": 6,
      "charisma_save": 8,
      "history": 7,
      "perception": 11,
      "persuasion": 8,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 21",
      "languages": "Common, Draconic",
      "challenge_rating": "13",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +11 to hit, reach,.0 ft., one target. Hit: 17 (2d10 + 6) piercing damage.",
          "attack_bonus": 11,
          "damage_dice": "2d10",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 11,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +11 to hit, reach 15 ft., one target. Hit: 15 (2d8 + 6) bludgeoning damage.",
          "attack_bonus": 11,
          "damage_dice": "2d8",
          "damage_bonus": 6
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 16 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nFire Breath. The dragon exhales fire in an 60-foot line that is 5 feet wide. Each creature in that line must make a DC 18 Dexterity saving throw, taking 45 (13d6) fire damage on a failed save, or half as much damage on a successful one.\nSleep Breath. The dragon exhales sleep gas in a 60-foot cone. Each creature in that area must succeed on a DC 18 Constitution saving throw or fall unconscious for 10 minutes. This effect ends for a creature if the creature takes damage or someone uses an action to wake it.",
          "attack_bonus": 0,
          "damage_dice": "13d6"
        }
      ]
    },
    {
      "name": "Adult Bronze Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 19,
      "hit_points": 212,
      "hit_dice": "17d12",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 25,
      "dexterity": 10,
      "constitution": 23,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 19,
      "dexterity_save": 5,
      "constitution_save": 11,
      "wisdom_save": 7,
      "charisma_save": 9,
      "insight": 7,
      "perception": 12,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 22",
      "languages": "Common, Draconic",
      "challenge_rating": "15",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +12 to hit, reach 10 ft., one target. Hit: 18 (2d10 + 7) piercing damage.",
          "attack_bonus": 12,
          "damage_dice": "2d10",
          "damage_bonus": 7
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 14 (2d6 + 7) slashing damage.",
          "attack_bonus": 12,
          "damage_dice": "2d6",
          "damage_bonus": 7
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +12 to hit, reach 15 ft., one target. Hit: 16 (2d8 + 7) bludgeoning damage.",
          "attack_bonus": 12,
          "damage_dice": "2d8",
          "damage_bonus": 7
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 17 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nLightning Breath. The dragon exhales lightning in a 90-foot line that is 5 feet wide. Each creature in that line must make a DC 19 Dexterity saving throw, taking 66 (12d10) lightning damage on a failed save, or half as much damage on a successful one.\nRepulsion Breath. The dragon exhales repulsion energy in a 30-foot cone. Each creature in that area must succeed on a DC 19 Strength saving throw. On a failed save, the creature is pushed 60 feet away from the dragon.",
          "attack_bonus": 0,
          "damage_dice": "12d10"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 20 Dexterity saving throw or take 14 (2d6 + 7) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Copper Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 18,
      "hit_points": 184,
      "hit_dice": "16d12",
      "speed": "40 ft., climb 40 ft., fly 80 ft.",
      "strength": 23,
      "dexterity": 12,
      "constitution": 21,
      "intelligence": 18,
      "wisdom": 15,
      "charisma": 17,
      "dexterity_save": 6,
      "constitution_save": 10,
      "wisdom_save": 7,
      "charisma_save": 8,
      "deception": 8,
      "perception": 12,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 22",
      "languages": "Common, Draconic",
      "challenge_rating": "14",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.",
          "attack_bonus": 11,
          "damage_dice": "2d10",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 11,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +11 to hit, reach 15 ft., one target. Hit: 15 (2d8 + 6) bludgeoning damage.",
          "attack_bonus": 11,
          "damage_dice": "2d8",
          "damage_bonus": 6
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 16 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nAcid Breath. The dragon exhales acid in an 60-foot line that is 5 feet wide. Each creature in that line must make a DC 18 Dexterity saving throw, taking 54 (12d8) acid damage on a failed save, or half as much damage on a successful one.\nSlowing Breath. The dragon exhales gas in a 60-foot cone. Each creature in that area must succeed on a DC 18 Constitution saving throw. On a failed save, the creature can't use reactions, its speed is halved, and it can't make more than one attack on its turn. In addition, the creature can use either an action or a bonus action on its turn, but not both. These effects last for 1 minute. The creature can repeat the saving throw at the end of each of its turns, ending the effect on itself with a successful save.",
          "attack_bonus": 0,
          "damage_dice": "12d8"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 19 Dexterity saving throw or take 13 (2d6 + 6) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Gold Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 19,
      "hit_points": 256,
      "hit_dice": "19d12",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 27,
      "dexterity": 14,
      "constitution": 25,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 24,
      "dexterity_save": 8,
      "constitution_save": 13,
      "wisdom_save": 8,
      "charisma_save": 13,
      "insight": 8,
      "perception": 14,
      "persuasion": 13,
      "stealth": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 24",
      "languages": "Common, Draconic",
      "challenge_rating": "17",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage.",
          "attack_bonus": 14,
          "damage_dice": "2d10",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +14 to hit, reach 5 ft., one target. Hit: 15 (2d6 + 8) slashing damage.",
          "attack_bonus": 14,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 14,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 21 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nFire Breath. The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC 21 Dexterity saving throw, taking 66 (12d10) fire damage on a failed save, or half as much damage on a successful one.\nWeakening Breath. The dragon exhales gas in a 60-foot cone. Each creature in that area must succeed on a DC 21 Strength saving throw or have disadvantage on Strength-based attack rolls, Strength checks, and Strength saving throws for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "12d10"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 22 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Green Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 19,
      "hit_points": 207,
      "hit_dice": "18d12",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 23,
      "dexterity": 12,
      "constitution": 21,
      "intelligence": 18,
      "wisdom": 15,
      "charisma": 17,
      "dexterity_save": 6,
      "constitution_save": 10,
      "wisdom_save": 7,
      "charisma_save": 8,
      "deception": 8,
      "insight": 7,
      "perception": 12,
      "persuasion": 8,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 22",
      "languages": "Common, Draconic",
      "challenge_rating": "15",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 7 (2d6) poison damage.",
          "attack_bonus": 11,
          "damage_dice": "2d10 + 2d6",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 11,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +11 to hit, reach 15 ft., one target. Hit: 15 (2d8 + 6) bludgeoning damage.",
          "attack_bonus": 11,
          "damage_dice": "2d8",
          "damage_bonus": 6
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 16 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours .",
          "attack_bonus": 0
        },
        {
          "name": "Poison Breath (Recharge 5-6)",
          "desc": "The dragon exhales poisonous gas in a 60-foot cone. Each creature in that area must make a DC 18 Constitution saving throw, taking 56 (16d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "16d6"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 19 Dexterity saving throw or take 13 (2d6 + 6) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Red Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 19,
      "hit_points": 256,
      "hit_dice": "19d12",
      "speed": "40 ft., climb 40 ft., fly 80 ft.",
      "strength": 27,
      "dexterity": 10,
      "constitution": 25,
      "intelligence": 16,
      "wisdom": 13,
      "charisma": 21,
      "dexterity_save": 6,
      "constitution_save": 13,
      "wisdom_save": 7,
      "charisma_save": 11,
      "perception": 13,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 23",
      "languages": "Common, Draconic",
      "challenge_rating": "17",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 7 (2d6) fire damage.",
          "attack_bonus": 14,
          "damage_dice": "2d10 + 2d6",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +14 to hit, reach 5 ft., one target. Hit: 15 (2d6 + 8) slashing damage.",
          "attack_bonus": 14,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 14,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 ft. of the dragon and aware of it must succeed on a DC 19 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Fire Breath (Recharge 5-6)",
          "desc": "The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC 21 Dexterity saving throw, taking 63 (18d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "18d6"
        },
        {
          "name": "Lair Actions",
          "desc": "On initiative count 20 (losing initiative ties), the dragon takes a lair action to cause one of the following effects: the dragon can't use the same effect two rounds in a row:\n• Magma erupts from a point on the ground the dragon can see within 120 feet of it, creating a 20-foot-high, 5-foot-radius geyser. Each creature in the geyser's area must make a DC 15 Dexterity saving throw, taking 21 (6d6) fire damage on a failed save, or half as much damage on a successful one.\n• A tremor shakes the lair in a 60-foot-radius around the dragon. Each creature other than the dragon on the ground in that area must succeed on a DC 15 Dexterity saving throw or be knocked prone.\n• Volcanic gases form a cloud in a 20-foot-radius sphere centered on a point the dragon can see within 120 feet of it. The sphere spreads around corners, and its area is lightly obscured. It lasts until initiative count 20 on the next round. Each creature that starts its turn in the cloud must succeed on a DC 13 Constitution saving throw or be poisoned until the end of its turn. While poisoned in this way, a creature is incapacitated.",
          "attack_bonus": 0,
          "damage_dice": "6d6"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 22 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult Silver Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 19,
      "hit_points": 243,
      "hit_dice": "18d12",
      "speed": "40 ft., fly 80 ft.",
      "strength": 27,
      "dexterity": 10,
      "constitution": 25,
      "intelligence": 16,
      "wisdom": 13,
      "charisma": 21,
      "dexterity_save": 5,
      "constitution_save": 12,
      "wisdom_save": 6,
      "charisma_save": 10,
      "arcana": 8,
      "history": 8,
      "perception": 11,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 21",
      "languages": "Common, Draconic",
      "challenge_rating": "16",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 19 (2d10 + 8) piercing damage.",
          "attack_bonus": 13,
          "damage_dice": "2d10",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +13 to hit, reach 5 ft., one target. Hit: 15 (2d6 + 8) slashing damage.",
          "attack_bonus": 13,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +13 to hit, reach 15 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 13,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 18 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nCold Breath. The dragon exhales an icy blast in a 60-foot cone. Each creature in that area must make a DC 20 Constitution saving throw, taking 58 (13d8) cold damage on a failed save, or half as much damage on a successful one.\nParalyzing Breath. The dragon exhales paralyzing gas in a 60-foot cone. Each creature in that area must succeed on a DC 20 Constitution saving throw or be paralyzed for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "13d8"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 22 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Adult White Dragon",
      "size": "Huge",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 18,
      "hit_points": 200,
      "hit_dice": "16d12",
      "speed": "40 ft., burrow 30 ft., fly 80 ft., swim 40 ft.",
      "strength": 22,
      "dexterity": 10,
      "constitution": 22,
      "intelligence": 8,
      "wisdom": 12,
      "charisma": 12,
      "dexterity_save": 5,
      "constitution_save": 11,
      "wisdom_save": 6,
      "charisma_save": 6,
      "perception": 11,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 21",
      "languages": "Common, Draconic",
      "challenge_rating": "13",
      "special_abilities": [
        {
          "name": "Ice Walk",
          "desc": "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, difficult terrain composed of ice or snow doesn't cost it extra moment.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 4 (1d8) cold damage.",
          "attack_bonus": 11,
          "damage_dice": "2d10 + 1d8",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +11 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 11,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +11 to hit, reach 15 ft., one target. Hit: 15 (2d8 + 6) bludgeoning damage.",
          "attack_bonus": 11,
          "damage_dice": "2d8",
          "damage_bonus": 6
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 ft. of the dragon and aware of it must succeed on a DC 14 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Cold Breath (Recharge 5-6)",
          "desc": "The dragon exhales an icy blast in a 60-foot cone. Each creature in that area must make a DC 19 Constitution saving throw, taking 54 (12d8) cold damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "12d8"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 10 ft. of the dragon must succeed on a DC 19 Dexterity saving throw or take 13 (2d6 + 6) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Air Elemental",
      "size": "Large",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 15,
      "hit_points": 90,
      "hit_dice": "12d10",
      "speed": "fly 90 ft. (hover)",
      "strength": 14,
      "dexterity": 20,
      "constitution": 14,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "lightning; thunder; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "exhaustion, grappled, paralyzed, petrified, poisoned, prone, restrained, unconscious",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Auran",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Air Form",
          "desc": "The elemental can enter a hostile creature's space and stop there. It can move through a space as narrow as 1 inch wide without squeezing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The elemental makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.",
          "attack_bonus": 8,
          "damage_dice": "2d8",
          "damage_bonus": 5
        },
        {
          "name": "Whirlwind (Recharge 4-6)",
          "desc": "Each creature in the elemental's space must make a DC 13 Strength saving throw. On a failure, a target takes 15 (3d8 + 2) bludgeoning damage and is flung up 20 feet away from the elemental in a random direction and knocked prone. If a thrown target strikes an object, such as a wall or floor, the target takes 3 (1d6) bludgeoning damage for every 10 feet it was thrown. If the target is thrown at another creature, that creature must succeed on a DC 13 Dexterity saving throw or take the same damage and be knocked prone.\nIf the saving throw is successful, the target takes half the bludgeoning damage and isn't flung away or knocked prone.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Black Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 22,
      "hit_points": 367,
      "hit_dice": "21d20",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 27,
      "dexterity": 14,
      "constitution": 25,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 19,
      "dexterity_save": 9,
      "constitution_save": 14,
      "wisdom_save": 9,
      "charisma_save": 11,
      "perception": 16,
      "stealth": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 26",
      "languages": "Common, Draconic",
      "challenge_rating": "21",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack:+ 15 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 9 (2d8) acid damage.",
          "attack_bonus": 15,
          "damage_dice": "2d10 + 2d8",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +15 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.",
          "attack_bonus": 15,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +15 to hit, reach 20 ft ., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 15,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 19 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Acid Breath (Recharge 5-6)",
          "desc": "The dragon exhales acid in a 90-foot line that is 10 feet wide. Each creature in that line must make a DC 22 Dexterity saving throw, taking 67 (15d8) acid damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 23 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Blue Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 22,
      "hit_points": 481,
      "hit_dice": "26d20",
      "speed": "40 ft., burrow 40 ft., fly 80 ft.",
      "strength": 29,
      "dexterity": 10,
      "constitution": 27,
      "intelligence": 18,
      "wisdom": 17,
      "charisma": 21,
      "dexterity_save": 7,
      "constitution_save": 15,
      "wisdom_save": 10,
      "charisma_save": 12,
      "perception": 17,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 27",
      "languages": "Common, Draconic",
      "challenge_rating": "23",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +16 to hit, reach 15 ft., one target. Hit: 20 (2d10 + 9) piercing damage plus 11 (2d10) lightning damage.",
          "attack_bonus": 16,
          "damage_dice": "2d10 + 2d10",
          "damage_bonus": 9
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 16 (2d6 + 9) slashing damage.",
          "attack_bonus": 16,
          "damage_dice": "2d6",
          "damage_bonus": 9
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +16 to hit, reach 20 ft., one target. Hit: 18 (2d8 + 9) bludgeoning damage.",
          "attack_bonus": 16,
          "damage_dice": "2d8",
          "damage_bonus": 9
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 20 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Lightning Breath (Recharge 5-6)",
          "desc": "The dragon exhales lightning in a 120-foot line that is 10 feet wide. Each creature in that line must make a DC 23 Dexterity saving throw, taking 88 (16d10) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "16d10"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 24 Dexterity saving throw or take 16 (2d6 + 9) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Brass Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 20,
      "hit_points": 297,
      "hit_dice": "17d20",
      "speed": "40 ft., burrow 40 ft., fly 80 ft.",
      "strength": 27,
      "dexterity": 10,
      "constitution": 25,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 19,
      "dexterity_save": 6,
      "constitution_save": 13,
      "wisdom_save": 8,
      "charisma_save": 10,
      "history": 9,
      "perception": 14,
      "persuasion": 10,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 24",
      "languages": "Common, Draconic",
      "challenge_rating": "20",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage.",
          "attack_bonus": 14,
          "damage_dice": "2d10",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.",
          "attack_bonus": 14,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +14 to hit, reach 20 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 14,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 18 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons:\nFire Breath. The dragon exhales fire in an 90-foot line that is 10 feet wide. Each creature in that line must make a DC 21 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one.\nSleep Breath. The dragon exhales sleep gas in a 90-foot cone. Each creature in that area must succeed on a DC 21 Constitution saving throw or fall unconscious for 10 minutes. This effect ends for a creature if the creature takes damage or someone uses an action to wake it.",
          "attack_bonus": 0,
          "damage_dice": "16d6"
        },
        {
          "name": "Change Shape",
          "desc": "The dragon magically polymorphs into a humanoid or beast that has a challenge rating no higher than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the dragon's choice).\nIn a new form, the dragon retains its alignment, hit points, Hit Dice, ability to speak, proficiencies, Legendary Resistance, lair actions, and Intelligence, Wisdom, and Charisma scores, as well as this action. Its statistics and capabilities are otherwise replaced by those of the new form, except any class features or legendary actions of that form.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 22 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Bronze Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 22,
      "hit_points": 444,
      "hit_dice": "24d20",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 29,
      "dexterity": 10,
      "constitution": 27,
      "intelligence": 18,
      "wisdom": 17,
      "charisma": 21,
      "dexterity_save": 7,
      "constitution_save": 15,
      "wisdom_save": 10,
      "charisma_save": 12,
      "insight": 10,
      "perception": 17,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 27",
      "languages": "Common, Draconic",
      "challenge_rating": "22",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +16 to hit, reach 15 ft., one target. Hit: 20 (2d10 + 9) piercing damage.",
          "attack_bonus": 16,
          "damage_dice": "2d10",
          "damage_bonus": 9
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +16 to hit, reach 10 ft., one target. Hit: 16 (2d6 + 9) slashing damage.",
          "attack_bonus": 16,
          "damage_dice": "1d6",
          "damage_bonus": 9
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +16 to hit, reach 20 ft., one target. Hit: 18 (2d8 + 9) bludgeoning damage.",
          "attack_bonus": 0,
          "damage_dice": "2d8",
          "damage_bonus": 9
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 20 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nLightning Breath. The dragon exhales lightning in a 120-foot line that is 10 feet wide. Each creature in that line must make a DC 23 Dexterity saving throw, taking 88 (16d10) lightning damage on a failed save, or half as much damage on a successful one.\nRepulsion Breath. The dragon exhales repulsion energy in a 30-foot cone. Each creature in that area must succeed on a DC 23 Strength saving throw. On a failed save, the creature is pushed 60 feet away from the dragon.",
          "attack_bonus": 0,
          "damage_dice": "16d10"
        },
        {
          "name": "Change Shape",
          "desc": "The dragon magically polymorphs into a humanoid or beast that has a challenge rating no higher than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the dragon's choice).\nIn a new form, the dragon retains its alignment, hit points, Hit Dice, ability to speak, proficiencies, Legendary Resistance, lair actions, and Intelligence, Wisdom, and Charisma scores, as well as this action. Its statistics and capabilities are otherwise replaced by those of the new form, except any class features or legendary actions of that form.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 24 Dexterity saving throw or take 16 (2d6 + 9) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Copper Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 21,
      "hit_points": 350,
      "hit_dice": "20d20",
      "speed": "40 ft., climb 40 ft., fly 80 ft.",
      "strength": 27,
      "dexterity": 12,
      "constitution": 25,
      "intelligence": 20,
      "wisdom": 17,
      "charisma": 19,
      "dexterity_save": 8,
      "constitution_save": 14,
      "wisdom_save": 10,
      "charisma_save": 11,
      "deception": 11,
      "perception": 17,
      "stealth": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 27",
      "languages": "Common, Draconic",
      "challenge_rating": "21",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +15 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage.",
          "attack_bonus": 15,
          "damage_dice": "2d10",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +15 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.",
          "attack_bonus": 15,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +15 to hit, reach 20 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 15,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 19 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nAcid Breath. The dragon exhales acid in an 90-foot line that is 10 feet wide. Each creature in that line must make a DC 22 Dexterity saving throw, taking 63 (14d8) acid damage on a failed save, or half as much damage on a successful one.\nSlowing Breath. The dragon exhales gas in a 90-foot cone. Each creature in that area must succeed on a DC 22 Constitution saving throw. On a failed save, the creature can't use reactions, its speed is halved, and it can't make more than one attack on its turn. In addition, the creature can use either an action or a bonus action on its turn, but not both. These effects last for 1 minute. The creature can repeat the saving throw at the end of each of its turns, ending the effect on itself with a successful save.",
          "attack_bonus": 0,
          "damage_dice": "14d8"
        },
        {
          "name": "Change Shape",
          "desc": "The dragon magically polymorphs into a humanoid or beast that has a challenge rating no higher than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the dragon's choice).\nIn a new form, the dragon retains its alignment, hit points, Hit Dice, ability to speak, proficiencies, Legendary Resistance, lair actions, and Intelligence, Wisdom, and Charisma scores, as well as this action. Its statistics and capabilities are otherwise replaced by those of the new form, except any class features or legendary actions of that form.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 23 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Gold Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 22,
      "hit_points": 546,
      "hit_dice": "28d20",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 30,
      "dexterity": 14,
      "constitution": 29,
      "intelligence": 18,
      "wisdom": 17,
      "charisma": 28,
      "dexterity_save": 9,
      "constitution_save": 16,
      "wisdom_save": 10,
      "charisma_save": 16,
      "insight": 10,
      "perception": 17,
      "persuasion": 16,
      "stealth": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 27",
      "languages": "Common, Draconic",
      "challenge_rating": "24",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage.",
          "attack_bonus": 17,
          "damage_dice": "2d10",
          "damage_bonus": 10
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage.",
          "attack_bonus": 17,
          "damage_dice": "2d6",
          "damage_bonus": 10
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19 (2d8 + 10) bludgeoning damage.",
          "attack_bonus": 17,
          "damage_dice": "2d8",
          "damage_bonus": 10
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 24 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nFire Breath. The dragon exhales fire in a 90-foot cone. Each creature in that area must make a DC 24 Dexterity saving throw, taking 71 (13d10) fire damage on a failed save, or half as much damage on a successful one.\nWeakening Breath. The dragon exhales gas in a 90-foot cone. Each creature in that area must succeed on a DC 24 Strength saving throw or have disadvantage on Strength-based attack rolls, Strength checks, and Strength saving throws for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "13d10"
        },
        {
          "name": "Change Shape",
          "desc": "The dragon magically polymorphs into a humanoid or beast that has a challenge rating no higher than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the dragon's choice).\nIn a new form, the dragon retains its alignment, hit points, Hit Dice, ability to speak, proficiencies, Legendary Resistance, lair actions, and Intelligence, Wisdom, and Charisma scores, as well as this action. Its statistics and capabilities are otherwise replaced by those of the new form, except any class features or legendary actions of that form.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 25 Dexterity saving throw or take 17 (2d6 + 10) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Green Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 21,
      "hit_points": 385,
      "hit_dice": "22d20",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 27,
      "dexterity": 12,
      "constitution": 25,
      "intelligence": 20,
      "wisdom": 17,
      "charisma": 19,
      "dexterity_save": 8,
      "constitution_save": 14,
      "wisdom_save": 10,
      "charisma_save": 11,
      "deception": 11,
      "insight": 10,
      "perception": 17,
      "persuasion": 11,
      "stealth": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 27",
      "languages": "Common, Draconic",
      "challenge_rating": "22",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +15 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 10 (3d6) poison damage.",
          "attack_bonus": 15,
          "damage_dice": "2d10 + 3d6",
          "damage_bonus": 9
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +15 to hit, reach 10 ft., one target. Hit: 22 (4d6 + 8) slashing damage.",
          "attack_bonus": 15,
          "damage_dice": "4d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +15 to hit, reach 20 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 16,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 19 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Poison Breath (Recharge 5-6)",
          "desc": "The dragon exhales poisonous gas in a 90-foot cone. Each creature in that area must make a DC 22 Constitution saving throw, taking 77 (22d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "22d6"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 23 Dexterity saving throw or take 15 (2d6 + 8) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Red Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 22,
      "hit_points": 546,
      "hit_dice": "28d20",
      "speed": "40 ft., climb 40 ft., fly 80 ft.",
      "strength": 30,
      "dexterity": 10,
      "constitution": 29,
      "intelligence": 18,
      "wisdom": 15,
      "charisma": 23,
      "dexterity_save": 7,
      "constitution_save": 16,
      "wisdom_save": 9,
      "charisma_save": 13,
      "perception": 16,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 26",
      "languages": "Common, Draconic",
      "challenge_rating": "24",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage plus 14 (4d6) fire damage.",
          "attack_bonus": 17,
          "damage_dice": "2d10 + 4d6",
          "damage_bonus": 10
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage.",
          "attack_bonus": 17,
          "damage_dice": "2d6",
          "damage_bonus": 10
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19 (2d8 + 10) bludgeoning damage.",
          "attack_bonus": 17,
          "damage_dice": "2d8",
          "damage_bonus": 10
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 21 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Fire Breath (Recharge 5-6)",
          "desc": "The dragon exhales fire in a 90-foot cone. Each creature in that area must make a DC 24 Dexterity saving throw, taking 91 (26d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "26d6"
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 25 Dexterity saving throw or take 17 (2d6 + 10) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient Silver Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 22,
      "hit_points": 487,
      "hit_dice": "25d20",
      "speed": "40 ft., fly 80 ft.",
      "strength": 30,
      "dexterity": 10,
      "constitution": 29,
      "intelligence": 18,
      "wisdom": 15,
      "charisma": 23,
      "dexterity_save": 7,
      "constitution_save": 16,
      "wisdom_save": 9,
      "charisma_save": 13,
      "arcana": 11,
      "history": 11,
      "perception": 16,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 26",
      "languages": "Common, Draconic",
      "challenge_rating": "23",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +17 to hit, reach 15 ft., one target. Hit: 21 (2d10 + 10) piercing damage.",
          "attack_bonus": 17,
          "damage_dice": "2d10",
          "damage_bonus": 10
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +17 to hit, reach 10 ft., one target. Hit: 17 (2d6 + 10) slashing damage.",
          "attack_bonus": 17,
          "damage_dice": "2d6",
          "damage_bonus": 10
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +17 to hit, reach 20 ft., one target. Hit: 19 (2d8 + 10) bludgeoning damage.",
          "attack_bonus": 17,
          "damage_dice": "2d8",
          "damage_bonus": 10
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 21 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nCold Breath. The dragon exhales an icy blast in a 90-foot cone. Each creature in that area must make a DC 24 Constitution saving throw, taking 67 (15d8) cold damage on a failed save, or half as much damage on a successful one.\nParalyzing Breath. The dragon exhales paralyzing gas in a 90- foot cone. Each creature in that area must succeed on a DC 24 Constitution saving throw or be paralyzed for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "15d8"
        },
        {
          "name": "Change Shape",
          "desc": "The dragon magically polymorphs into a humanoid or beast that has a challenge rating no higher than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the dragon's choice).\nIn a new form, the dragon retains its alignment, hit points, Hit Dice, ability to speak, proficiencies, Legendary Resistance, lair actions, and Intelligence, Wisdom, and Charisma scores, as well as this action. Its statistics and capabilities are otherwise replaced by those of the new form, except any class features or legendary actions of that form.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Detect",
          "desc": "The dragon makes a Wisdom (Perception) check.",
          "attack_bonus": 0
        },
        {
          "name": "Tail Attack",
          "desc": "The dragon makes a tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Wing Attack (Costs 2 Actions)",
          "desc": "The dragon beats its wings. Each creature within 15 ft. of the dragon must succeed on a DC 25 Dexterity saving throw or take 17 (2d6 + 10) bludgeoning damage and be knocked prone. The dragon can then fly up to half its flying speed.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ancient White Dragon",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 20,
      "hit_points": 333,
      "hit_dice": "18d20",
      "speed": "40 ft., burrow 40 ft., fly 80 ft., swim 40 ft.",
      "strength": 26,
      "dexterity": 10,
      "constitution": 26,
      "intelligence": 10,
      "wisdom": 13,
      "charisma": 14,
      "dexterity_save": 6,
      "constitution_save": 14,
      "wisdom_save": 7,
      "charisma_save": 8,
      "perception": 13,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 23",
      "languages": "Common, Draconic",
      "challenge_rating": "20",
      "special_abilities": [
        {
          "name": "Ice Walk",
          "desc": "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, difficult terrain composed of ice or snow doesn't cost it extra moment.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the dragon fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon can use its Frightful Presence. It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +14 to hit, reach 15 ft., one target. Hit: 19 (2d10 + 8) piercing damage plus 9 (2d8) cold damage.",
          "attack_bonus": 14,
          "damage_dice": "2d10 + 2d8",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 15 (2d6 + 8) slashing damage.",
          "attack_bonus": 14,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +14 to hit, reach 20 ft., one target. Hit: 17 (2d8 + 8) bludgeoning damage.",
          "attack_bonus": 14,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the dragon's choice that is within 120 feet of the dragon and aware of it must succeed on a DC 16 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the dragon's Frightful Presence for the next 24 hours .",
          "attack_bonus": 0
        },
        {
          "name": "Cold Breath (Recharge 5-6)",
          "desc": "The dragon exhales an icy blast in a 90-foot cone. Each creature in that area must make a DC 22 Constitution saving throw, taking 72 (l6d8) cold damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "16d8"
        }
      ]
    },
    {
      "name": "Androsphinx",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "lawful neutral",
      "armor_class": 17,
      "hit_points": 199,
      "hit_dice": "19d10",
      "speed": "40 ft., fly 60 ft.",
      "strength": 22,
      "dexterity": 10,
      "constitution": 20,
      "intelligence": 16,
      "wisdom": 18,
      "charisma": 23,
      "dexterity_save": 6,
      "constitution_save": 11,
      "intelligence_save": 9,
      "wisdom_save": 10,
      "arcana": 9,
      "perception": 10,
      "religion": 15,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "psychic; bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "charmed, frightened",
      "senses": "truesight 120 ft., passive Perception 20",
      "languages": "Common, Sphinx",
      "challenge_rating": "17",
      "special_abilities": [
        {
          "name": "Inscrutable",
          "desc": "The sphinx is immune to any effect that would sense its emotions or read its thoughts, as well as any divination spell that it refuses. Wisdom (Insight) checks made to ascertain the sphinx's intentions or sincerity have disadvantage.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The sphinx's weapon attacks are magical.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The sphinx is a 12th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 18, +10 to hit with spell attacks). It requires no material components to cast its spells. The sphinx has the following cleric spells prepared:\n\n• Cantrips (at will): sacred flame, spare the dying, thaumaturgy\n• 1st level (4 slots): command, detect evil and good, detect magic\n• 2nd level (3 slots): lesser restoration, zone of truth\n• 3rd level (3 slots): dispel magic, tongues\n• 4th level (3 slots): banishment, freedom of movement\n• 5th level (2 slots): flame strike, greater restoration\n• 6th level (1 slot): heroes' feast",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The sphinx makes two claw attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 17 (2d10 + 6) slashing damage.",
          "attack_bonus": 12,
          "damage_dice": "2d10",
          "damage_bonus": 6
        },
        {
          "name": "Roar (3/Day)",
          "desc": "The sphinx emits a magical roar. Each time it roars before finishing a long rest, the roar is louder and the effect is different, as detailed below. Each creature within 500 feet of the sphinx and able to hear the roar must make a saving throw.\n\nFirst Roar. Each creature that fails a DC 18 Wisdom saving throw is frightened for 1 minute. A frightened creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.\n\nSecond Roar. Each creature that fails a DC 18 Wisdom saving throw is deafened and frightened for 1 minute. A frightened creature is paralyzed and can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.\n\nThird Roar. Each creature makes a DC 18 Constitution saving throw. On a failed save, a creature takes 44 (8d10) thunder damage and is knocked prone. On a successful save, the creature takes half as much damage and isn't knocked prone.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Claw Attack",
          "desc": "The sphinx makes one claw attack.",
          "attack_bonus": 0
        },
        {
          "name": "Teleport (Costs 2 Actions)",
          "desc": "The sphinx magically teleports, along with any equipment it is wearing or carrying, up to 120 feet to an unoccupied space it can see.",
          "attack_bonus": 0
        },
        {
          "name": "Cast a Spell (Costs 3 Actions)",
          "desc": "The sphinx casts a spell from its list of prepared spells, using a spell slot as normal.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Animated Armor",
      "size": "Medium",
      "type": "construct",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 18,
      "hit_points": 33,
      "hit_dice": "6d8",
      "speed": "25 ft.",
      "strength": 14,
      "dexterity": 11,
      "constitution": 13,
      "intelligence": 1,
      "wisdom": 3,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison, psychic",
      "condition_immunities": "blinded, charmed, deafened, exhaustion, frightened, paralyzed, petrified, poisoned",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 6",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Antimagic Susceptibility",
          "desc": "The armor is incapacitated while in the area of an antimagic field. If targeted by dispel magic, the armor must succeed on a Constitution saving throw against the caster's spell save DC or fall unconscious for 1 minute.",
          "attack_bonus": 0
        },
        {
          "name": "False Appearance",
          "desc": "While the armor remains motionless, it is indistinguishable from a normal suit of armor.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The armor makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) bludgeoning damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Ankheg",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 39,
      "hit_dice": "6d10",
      "speed": "30 ft., burrow 10 ft.",
      "strength": 17,
      "dexterity": 11,
      "constitution": 13,
      "intelligence": 1,
      "wisdom": 13,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., tremorsense 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "2",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage plus 3 (1d6) acid damage. If the target is a Large or smaller creature, it is grappled (escape DC 13). Until this grapple ends, the ankheg can bite only the grappled creature and has advantage on attack rolls to do so.",
          "attack_bonus": 5,
          "damage_dice": "2d6 + 1d6",
          "damage_bonus": 3
        },
        {
          "name": "Acid Spray (Recharge 6)",
          "desc": "The ankheg spits acid in a line that is 30 ft. long and 5 ft. wide, provided that it has no creature grappled. Each creature in that line must make a DC 13 Dexterity saving throw, taking 10 (3d6) acid damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "3d6"
        }
      ]
    },
    {
      "name": "Ape",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 19,
      "hit_dice": "3d8",
      "speed": "30 ft., climb 30 ft.",
      "strength": 16,
      "dexterity": 14,
      "constitution": 14,
      "intelligence": 6,
      "wisdom": 12,
      "charisma": 7,
      "athletics": 5,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1/2",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The ape makes two fist attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Fist",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +5 to hit, range 25/50 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Archmage",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 12,
      "hit_points": 99,
      "hit_dice": "18d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 20,
      "wisdom": 15,
      "charisma": 16,
      "intelligence_save": 9,
      "wisdom_save": 6,
      "arcana": 13,
      "history": 13,
      "damage_vulnerabilities": "",
      "damage_resistances": "damage from spells; non magical bludgeoning, piercing, and slashing (from stoneskin)",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "any six languages",
      "challenge_rating": "12",
      "special_abilities": [
        {
          "name": "Magic Resistance",
          "desc": "The archmage has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The archmage is an 18th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 17, +9 to hit with spell attacks). The archmage can cast disguise self and invisibility at will and has the following wizard spells prepared:\n\n• Cantrips (at will): fire bolt, light, mage hand, prestidigitation, shocking grasp\n• 1st level (4 slots): detect magic, identify, mage armor*, magic missile\n• 2nd level (3 slots): detect thoughts, mirror image, misty step\n• 3rd level (3 slots): counterspell,fly, lightning bolt\n• 4th level (3 slots): banishment, fire shield, stoneskin*\n• 5th level (3 slots): cone of cold, scrying, wall of force\n• 6th level (1 slot): globe of invulnerability\n• 7th level (1 slot): teleport\n• 8th level (1 slot): mind blank*\n• 9th level (1 slot): time stop\n* The archmage casts these spells on itself before combat.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Dagger",
          "desc": "Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Assassin",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any non-good alignment",
      "armor_class": 15,
      "hit_points": 78,
      "hit_dice": "12d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 16,
      "constitution": 14,
      "intelligence": 13,
      "wisdom": 11,
      "charisma": 10,
      "dexterity_save": 6,
      "intelligence_save": 4,
      "acrobatics": 6,
      "deception": 3,
      "perception": 3,
      "stealth": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "poison",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "Thieves' cant plus any two languages",
      "challenge_rating": "8",
      "special_abilities": [
        {
          "name": "Assassinate",
          "desc": "During its first turn, the assassin has advantage on attack rolls against any creature that hasn't taken a turn. Any hit the assassin scores against a surprised creature is a critical hit.",
          "attack_bonus": 0
        },
        {
          "name": "Evasion",
          "desc": "If the assassin is subjected to an effect that allows it to make a Dexterity saving throw to take only half damage, the assassin instead takes no damage if it succeeds on the saving throw, and only half damage if it fails.",
          "attack_bonus": 0
        },
        {
          "name": "Sneak Attack (1/Turn)",
          "desc": "The assassin deals an extra 13 (4d6) damage when it hits a target with a weapon attack and has advantage on the attack roll, or when the target is within 5 ft. of an ally of the assassin that isn't incapacitated and the assassin doesn't have disadvantage on the attack roll.",
          "attack_bonus": 0,
          "damage_dice": "4d6"
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The assassin makes two shortsword attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 24 (7d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 6,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Light Crossbow",
          "desc": "Ranged Weapon Attack: +6 to hit, range 80/320 ft., one target. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 24 (7d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 6,
          "damage_dice": "1d8",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Awakened Shrub",
      "size": "Small",
      "type": "plant",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 9,
      "hit_points": 10,
      "hit_dice": "3d6",
      "speed": "20 ft.",
      "strength": 3,
      "dexterity": 8,
      "constitution": 11,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 6,
      "damage_vulnerabilities": "fire",
      "damage_resistances": "piercing",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "one language known by its creator",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "False Appearance",
          "desc": "While the shrub remains motionless, it is indistinguishable from a normal shrub.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Rake",
          "desc": "Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 1 (1d4 — 1) slashing damage.",
          "attack_bonus": 1,
          "damage_dice": "1d4",
          "damage_bonus": -1
        }
      ]
    },
    {
      "name": "Awakened Tree",
      "size": "Huge",
      "type": "plant",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 59,
      "hit_dice": "7d12",
      "speed": "20 ft.",
      "strength": 19,
      "dexterity": 6,
      "constitution": 15,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 7,
      "damage_vulnerabilities": "fire",
      "damage_resistances": "bludgeoning, piercing",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "one language known by its creator",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "False Appearance",
          "desc": "While the tree remains motionless, it is indistinguishable from a normal tree.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 14 (3d6 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "3d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Axe Beak",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "50 ft.",
      "strength": 14,
      "dexterity": 12,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Azer",
      "size": "Medium",
      "type": "elemental",
      "subtype": "",
      "alignment": "lawful neutral",
      "armor_class": 17,
      "hit_points": 39,
      "hit_dice": "6d8",
      "speed": "30 ft.",
      "strength": 17,
      "dexterity": 12,
      "constitution": 15,
      "intelligence": 12,
      "wisdom": 13,
      "charisma": 10,
      "constitution_save": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "passive Perception 11",
      "languages": "Ignan",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Heated Body",
          "desc": "A creature that touches the azer or hits it with a melee attack while within 5 ft. of it takes 5 (1d10) fire damage.",
          "attack_bonus": 0,
          "damage_dice": "1d10"
        },
        {
          "name": "Heated Weapons",
          "desc": "When the azer hits with a metal melee weapon, it deals an extra 3 (1d6) fire damage (included in the attack).",
          "attack_bonus": 0
        },
        {
          "name": "Illumination",
          "desc": "The azer sheds bright light in a 10-foot radius and dim light for an additional 10 ft..",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Warhammer",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) bludgeoning damage, or 8 (1d10 + 3) bludgeoning damage if used with two hands to make a melee attack, plus 3 (1d6) fire damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8 + 1d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Baboon",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 3,
      "hit_dice": "1d6",
      "speed": "30 ft., climb 30 ft.",
      "strength": 8,
      "dexterity": 14,
      "constitution": 11,
      "intelligence": 4,
      "wisdom": 12,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Pack Tactics",
          "desc": "The baboon has advantage on an attack roll against a creature if at least one of the baboon's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 1 (1d4 — 1) piercing damage.",
          "attack_bonus": 1,
          "damage_dice": "1d4",
          "damage_bonus": -1
        }
      ]
    },
    {
      "name": "Badger",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 3,
      "hit_dice": "1d4",
      "speed": "20 ft., burrow 5 ft.",
      "strength": 4,
      "dexterity": 11,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The badger has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 1 piercing damage.",
          "attack_bonus": 2,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Balor",
      "size": "Huge",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 19,
      "hit_points": 262,
      "hit_dice": "21d12",
      "speed": "40 ft., fly 80 ft.",
      "strength": 26,
      "dexterity": 15,
      "constitution": 22,
      "intelligence": 20,
      "wisdom": 16,
      "charisma": 22,
      "strength_save": 14,
      "constitution_save": 12,
      "wisdom_save": 9,
      "charisma_save": 12,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "truesight 120 ft., passive Perception 13",
      "languages": "Abyssal, telepathy 120 ft.",
      "challenge_rating": "19",
      "special_abilities": [
        {
          "name": "Death Throes",
          "desc": "When the balor dies, it explodes, and each creature within 30 feet of it must make a DC 20 Dexterity saving throw, taking 70 (20d6) fire damage on a failed save, or half as much damage on a successful one. The explosion ignites flammable objects in that area that aren't being worn or carried, and it destroys the balor's weapons.",
          "attack_bonus": 0,
          "damage_dice": "20d6"
        },
        {
          "name": "Fire Aura",
          "desc": "At the start of each of the balor's turns, each creature within 5 feet of it takes 10 (3d6) fire damage, and flammable objects in the aura that aren't being worn or carried ignite. A creature that touches the balor or hits it with a melee attack while within 5 feet of it takes 10 (3d6) fire damage.",
          "attack_bonus": 0,
          "damage_dice": "3d6"
        },
        {
          "name": "Magic Resistance",
          "desc": "The balor has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The balor's weapon attacks are magical.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The balor makes two attacks: one with its longsword and one with its whip.",
          "attack_bonus": 0
        },
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 21 (3d8 + 8) slashing damage plus 13 (3d8) lightning damage. If the balor scores a critical hit, it rolls damage dice three times, instead of twice.",
          "attack_bonus": 14,
          "damage_dice": "3d8 + 3d8",
          "damage_bonus": 8
        },
        {
          "name": "Whip",
          "desc": "Melee Weapon Attack: +14 to hit, reach 30 ft., one target. Hit: 15 (2d6 + 8) slashing damage plus 10 (3d6) fire damage, and the target must succeed on a DC 20 Strength saving throw or be pulled up to 25 feet toward the balor.",
          "attack_bonus": 14,
          "damage_dice": "2d6 + 3d6",
          "damage_bonus": 8
        },
        {
          "name": "Teleport",
          "desc": "The balor magically teleports, along with any equipment it is wearing or carrying, up to 120 feet to an unoccupied space it can see.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Demon (1/Day)",
          "desc": "The demon chooses what to summon and attempts a magical summoning.\nA balor has a 50 percent chance of summoning 1d8 vrocks, 1d6 hezrous, 1d4 glabrezus, 1d3 nalfeshnees, 1d2 mariliths, or one goristro.\nA summoned demon appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other demons. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Bandit",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any non-lawful alignment",
      "armor_class": 12,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 12,
      "constitution": 12,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Scimitar",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        },
        {
          "name": "Light Crossbow",
          "desc": "Ranged Weapon Attack: +3 to hit, range 80 ft./320 ft., one target. Hit: 5 (1d8 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d8",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Bandit Captain",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any non-lawful alignment",
      "armor_class": 15,
      "hit_points": 65,
      "hit_dice": "10d8",
      "speed": "30 ft.",
      "strength": 15,
      "dexterity": 16,
      "constitution": 14,
      "intelligence": 14,
      "wisdom": 11,
      "charisma": 14,
      "strength_save": 4,
      "dexterity_save": 5,
      "wisdom_save": 2,
      "athletics": 4,
      "deception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any two languages",
      "challenge_rating": "2",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The captain makes three melee attacks: two with its scimitar and one with its dagger. Or the captain makes two ranged attacks with its daggers.",
          "attack_bonus": 0
        },
        {
          "name": "Scimitar",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Dagger",
          "desc": "Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 5 (1d4 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d4",
          "damage_bonus": 3
        }
      ],
      "reactions": [
        {
          "name": "Parry",
          "desc": "The captain adds 2 to its AC against one melee attack that would hit it. To do so, the captain must see the attacker and be wielding a melee weapon.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Barbed Devil",
      "size": "Medium",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 15,
      "hit_points": 110,
      "hit_dice": "13d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 17,
      "constitution": 18,
      "intelligence": 12,
      "wisdom": 14,
      "charisma": 14,
      "strength_save": 6,
      "constitution_save": 7,
      "wisdom_save": 5,
      "charisma_save": 5,
      "deception": 5,
      "insight": 5,
      "perception": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 18",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Barbed Hide",
          "desc": "At the start of each of its turns, the barbed devil deals 5 (1d10) piercing damage to any creature grappling it.",
          "attack_bonus": 0,
          "damage_dice": "1d10"
        },
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the devil's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The devil has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The devil makes three melee attacks: one with its tail and two with its claws. Alternatively, it can use Hurl Flame twice.",
          "attack_bonus": 0
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft ., one target. Hit: 6 (1d6 + 3) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Hurl Flame",
          "desc": "Ranged Spell Attack: +5 to hit, range 150 ft., one target. Hit: 10 (3d6) fire damage. If the target is a flammable object that isn't being worn or carried, it also catches fire.",
          "attack_bonus": 5,
          "damage_dice": "3d6"
        }
      ]
    },
    {
      "name": "Basilisk",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 52,
      "hit_dice": "8d8",
      "speed": "20 ft.",
      "strength": 16,
      "dexterity": 8,
      "constitution": 15,
      "intelligence": 2,
      "wisdom": 8,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Petrifying Gaze",
          "desc": "If a creature starts its turn within 30 ft. of the basilisk and the two of them can see each other, the basilisk can force the creature to make a DC 12 Constitution saving throw if the basilisk isn't incapacitated. On a failed save, the creature magically begins to turn to stone and is restrained. It must repeat the saving throw at the end of its next turn. On a success, the effect ends. On a failure, the creature is petrified until freed by the greater restoration spell or other magic.\nA creature that isn't surprised can avert its eyes to avoid the saving throw at the start of its turn. If it does so, it can't see the basilisk until the start of its next turn, when it can avert its eyes again. If it looks at the basilisk in the meantime, it must immediately make the save.\nIf the basilisk sees its reflection within 30 ft. of it in bright light, it mistakes itself for a rival and targets itself with its gaze.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage plus 7 (2d6) poison damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6 + 2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Bat",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "5 ft., fly 30 ft.",
      "strength": 2,
      "dexterity": 15,
      "constitution": 8,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Echolocation",
          "desc": "The bat can't use its blindsight while deafened.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing",
          "desc": "The bat has advantage on Wisdom (Perception) checks that rely on hearing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +0 to hit, reach 5 ft., one creature. Hit: 1 piercing damage.",
          "attack_bonus": 0,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Bearded Devil",
      "size": "Medium",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 13,
      "hit_points": 52,
      "hit_dice": "8d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 15,
      "constitution": 15,
      "intelligence": 9,
      "wisdom": 11,
      "charisma": 11,
      "strength_save": 5,
      "constitution_save": 4,
      "wisdom_save": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 10",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the devil's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The devil has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Steadfast",
          "desc": "The devil can't be frightened while it can see an allied creature within 30 feet of it.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The devil makes two attacks: one with its beard and one with its glaive.",
          "attack_bonus": 0
        },
        {
          "name": "Beard",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 6 (1d8 + 2) piercing damage, and the target must succeed on a DC 12 Constitution saving throw or be poisoned for 1 minute. While poisoned in this way, the target can't regain hit points. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 2
        },
        {
          "name": "Glaive",
          "desc": "Melee Weapon Attack: +5 to hit, reach 10 ft., one target. Hit: 8 (1d10 + 3) slashing damage. If the target is a creature other than an undead or a construct, it must succeed on a DC 12 Constitution saving throw or lose 5 (1d10) hit points at the start of each of its turns due to an infernal wound. Each time the devil hits the wounded target with this attack, the damage dealt by the wound increases by 5 (1d10). Any creature can take an action to stanch the wound with a successful DC 12 Wisdom (Medicine) check. The wound also closes if the target receives magical healing.",
          "attack_bonus": 5,
          "damage_dice": "1d10",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Behir",
      "size": "Huge",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 17,
      "hit_points": 168,
      "hit_dice": "16d12",
      "speed": "50 ft., climb 40 ft.",
      "strength": 23,
      "dexterity": 16,
      "constitution": 18,
      "intelligence": 7,
      "wisdom": 14,
      "charisma": 12,
      "perception": 6,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "darkvision 90 ft., passive Perception 16",
      "languages": "Draconic",
      "challenge_rating": "11",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The behir makes two attacks: one with its bite and one to constrict.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 22 (3d10 + 6) piercing damage.",
          "attack_bonus": 10,
          "damage_dice": "3d10",
          "damage_bonus": 6
        },
        {
          "name": "Constrict",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one Large or smaller creature. Hit: 17 (2d10 + 6) bludgeoning damage plus 17 (2d10 + 6) slashing damage. The target is grappled (escape DC 16) if the behir isn't already constricting a creature, and the target is restrained until this grapple ends.",
          "attack_bonus": 10,
          "damage_dice": "2d10 + 2d10",
          "damage_bonus": 6
        },
        {
          "name": "Lightning Breath (Recharge 5-6)",
          "desc": "The behir exhales a line of lightning that is 20 ft. long and 5 ft. wide. Each creature in that line must make a DC 16 Dexterity saving throw, taking 66 (12d10) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "12d10"
        },
        {
          "name": "Swallow",
          "desc": "The behir makes one bite attack against a Medium or smaller target it is grappling. If the attack hits, the target is also swallowed, and the grapple ends. While swallowed, the target is blinded and restrained, it has total cover against attacks and other effects outside the behir, and it takes 21 (6d6) acid damage at the start of each of the behir's turns. A behir can have only one creature swallowed at a time.\nIf the behir takes 30 damage or more on a single turn from the swallowed creature, the behir must succeed on a DC 14 Constitution saving throw at the end of that turn or regurgitate the creature, which falls prone in a space within 10 ft. of the behir. If the behir dies, a swallowed creature is no longer restrained by it and can escape from the corpse by using 15 ft. of movement, exiting prone.",
          "attack_bonus": 0,
          "damage_dice": "6d6"
        }
      ]
    },
    {
      "name": "Berserker",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any chaotic alignment",
      "armor_class": 13,
      "hit_points": 67,
      "hit_dice": "9d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 12,
      "constitution": 17,
      "intelligence": 9,
      "wisdom": 11,
      "charisma": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Reckless",
          "desc": "At the start of its turn, the berserker can gain advantage on all melee weapon attack rolls during that turn, but attack rolls against it have advantage until the start of its next turn.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Greataxe",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d12",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Black Bear",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 19,
      "hit_dice": "3d8",
      "speed": "40 ft., climb 30 ft.",
      "strength": 15,
      "dexterity": 10,
      "constitution": 14,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The bear has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The bear makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "2d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Black Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 17,
      "hit_points": 33,
      "hit_dice": "6d8",
      "speed": "30 ft., fly 60 ft., swim 30 ft.",
      "strength": 15,
      "dexterity": 14,
      "constitution": 13,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 13,
      "dexterity_save": 4,
      "constitution_save": 3,
      "wisdom_save": 2,
      "charisma_save": 3,
      "perception": 4,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 2 (1d4) acid damage.",
          "attack_bonus": 4,
          "damage_dice": "1d10",
          "damage_bonus": 2
        },
        {
          "name": "Acid Breath (Recharge 5-6)",
          "desc": "The dragon exhales acid in a 15-foot line that is 5 feet wide. Each creature in that line must make a DC 11 Dexterity saving throw, taking 22 (Sd8) acid damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "5d8"
        }
      ]
    },
    {
      "name": "Black Pudding",
      "size": "Large",
      "type": "ooze",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 7,
      "hit_points": 85,
      "hit_dice": "10d10",
      "speed": "20 ft., climb 20 ft.",
      "strength": 16,
      "dexterity": 5,
      "constitution": 16,
      "intelligence": 1,
      "wisdom": 6,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid, cold, lightning, slashing",
      "condition_immunities": "blinded, charmed, deafened, exhaustion, frightened, prone",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 8",
      "languages": "",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Amorphous",
          "desc": "The pudding can move through a space as narrow as 1 inch wide without squeezing.",
          "attack_bonus": 0
        },
        {
          "name": "Corrosive Form",
          "desc": "A creature that touches the pudding or hits it with a melee attack while within 5 feet of it takes 4 (1d8) acid damage. Any nonmagical weapon made of metal or wood that hits the pudding corrodes. After dealing damage, the weapon takes a permanent and cumulative -1 penalty to damage rolls. If its penalty drops to -5, the weapon is destroyed. Nonmagical ammunition made of metal or wood that hits the pudding is destroyed after dealing damage. The pudding can eat through 2-inch-thick, nonmagical wood or metal in 1 round.",
          "attack_bonus": 0,
          "damage_dice": "1d8"
        },
        {
          "name": "Spider Climb",
          "desc": "The pudding can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Pseudopod",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage plus 18 (4d8) acid damage. In addition, nonmagical armor worn by the target is partly dissolved and takes a permanent and cumulative -1 penalty to the AC it offers. The armor is destroyed if the penalty reduces its AC to 10.",
          "attack_bonus": 5,
          "damage_dice": "1d6 + 4d8",
          "damage_bonus": 3
        }
      ],
      "reactions": [
        {
          "name": "Split",
          "desc": "When a pudding that is Medium or larger is subjected to lightning or slashing damage, it splits into two new puddings if it has at least 10 hit points. Each new pudding has hit points equal to half the original pudding's, rounded down. New puddings are one size smaller than the original pudding.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Blink Dog",
      "size": "Medium",
      "type": "fey",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 13,
      "hit_points": 22,
      "hit_dice": "4d8",
      "speed": "40 ft.",
      "strength": 12,
      "dexterity": 17,
      "constitution": 12,
      "intelligence": 10,
      "wisdom": 13,
      "charisma": 11,
      "perception": 3,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "Blink Dog, understands Sylvan but can't speak it",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The dog has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        },
        {
          "name": "Teleport (Recharge 4-6)",
          "desc": "The dog magically teleports, along with any equipment it is wearing or carrying, up to 40 ft. to an unoccupied space it can see. Before or after teleporting, the dog can make one bite attack.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Blood Hawk",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 7,
      "hit_dice": "2d6",
      "speed": "10 ft., fly 60 ft.",
      "strength": 6,
      "dexterity": 14,
      "constitution": 10,
      "intelligence": 3,
      "wisdom": 14,
      "charisma": 5,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Keen Sight",
          "desc": "The hawk has advantage on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The hawk has advantage on an attack roll against a creature if at least one of the hawk's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Blue Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 17,
      "hit_points": 52,
      "hit_dice": "8d8",
      "speed": "30 ft., burrow 15 ft., fly 60 ft.",
      "strength": 17,
      "dexterity": 10,
      "constitution": 15,
      "intelligence": 12,
      "wisdom": 11,
      "charisma": 15,
      "dexterity_save": 2,
      "constitution_save": 4,
      "wisdom_save": 2,
      "charisma_save": 4,
      "perception": 4,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "3",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage plus 3 (1d6) lightning damage.",
          "attack_bonus": 5,
          "damage_dice": "1d10 + 1d6",
          "damage_bonus": 3
        },
        {
          "name": "Lightning Breath (Recharge 5-6)",
          "desc": "The dragon exhales lightning in a 30-foot line that is 5 feet wide. Each creature in that line must make a DC 12 Dexterity saving throw, taking 22 (4d10) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "4d10"
        }
      ]
    },
    {
      "name": "Boar",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "40 ft.",
      "strength": 13,
      "dexterity": 11,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 9,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 9",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the boar moves at least 20 ft. straight toward a target and then hits it with a tusk attack on the same turn, the target takes an extra 3 (1d6) slashing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "1d6"
        },
        {
          "name": "Relentless (Recharges after a Short or Long Rest)",
          "desc": "If the boar takes 7 damage or less that would reduce it to 0 hit points, it is reduced to 1 hit point instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Tusk",
          "desc": "Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Bone Devil",
      "size": "Large",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 19,
      "hit_points": 142,
      "hit_dice": "15d10",
      "speed": "40 ft., fly 40 ft.",
      "strength": 18,
      "dexterity": 16,
      "constitution": 18,
      "intelligence": 13,
      "wisdom": 14,
      "charisma": 16,
      "intelligence_save": 5,
      "wisdom_save": 6,
      "charisma_save": 7,
      "deception": 7,
      "insight": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 9",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "12",
      "special_abilities": [
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the devil's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The devil has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The devil makes three attacks: two with its claws and one with its sting.",
          "attack_bonus": 0
        },
        {
          "name": "Multiattack",
          "desc": "The devil makes three attacks: two with its claws and one with its sting.",
          "attack_bonus": 0
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 8 (1d8 + 4) slashing damage.",
          "attack_bonus": 8,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 8 (1d8 + 4) slashing damage.",
          "attack_bonus": 8,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Sting",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 13 (2d8 + 4) piercing damage plus 17 (5d6) poison damage, and the target must succeed on a DC 14 Constitution saving throw or become poisoned for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success .",
          "attack_bonus": 8,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Sting",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 13 (2d8 + 4) piercing damage plus 17 (5d6) poison damage, and the target must succeed on a DC 14 Constitution saving throw or become poisoned for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success .",
          "attack_bonus": 8,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Brass Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 16,
      "hit_points": 16,
      "hit_dice": "3d8",
      "speed": "30 ft., burrow 15 ft., fly 60 ft.",
      "strength": 15,
      "dexterity": 10,
      "constitution": 13,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 13,
      "dexterity_save": 2,
      "constitution_save": 3,
      "wisdom_save": 2,
      "charisma_save": 3,
      "perception": 4,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "1",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d10",
          "damage_bonus": 2
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nFire Breath. The dragon exhales fire in an 20-foot line that is 5 feet wide. Each creature in that line must make a DC 11 Dexterity saving throw, taking 14 (4d6) fire damage on a failed save, or half as much damage on a successful one.\nSleep Breath. The dragon exhales sleep gas in a 15-foot cone. Each creature in that area must succeed on a DC 11 Constitution saving throw or fall unconscious for 1 minute. This effect ends for a creature if the creature takes damage or someone uses an action to wake it.",
          "attack_bonus": 0,
          "damage_dice": "4d6"
        }
      ]
    },
    {
      "name": "Bronze Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 17,
      "hit_points": 32,
      "hit_dice": "5d8",
      "speed": "30 ft., fly 60 ft., swim 30 ft.",
      "strength": 17,
      "dexterity": 10,
      "constitution": 15,
      "intelligence": 12,
      "wisdom": 11,
      "charisma": 15,
      "dexterity_save": 2,
      "constitution_save": 4,
      "wisdom_save": 2,
      "charisma_save": 4,
      "perception": 4,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d10",
          "damage_bonus": 3
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nLightning Breath. The dragon exhales lightning in a 40-foot line that is 5 feet wide. Each creature in that line must make a DC 12 Dexterity saving throw, taking 16 (3d10) lightning damage on a failed save, or half as much damage on a successful one.\nRepulsion Breath. The dragon exhales repulsion energy in a 30-foot cone. Each creature in that area must succeed on a DC 12 Strength saving throw. On a failed save, the creature is pushed 30 feet away from the dragon.",
          "attack_bonus": 0,
          "damage_dice": "3d10"
        }
      ]
    },
    {
      "name": "Brown Bear",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 34,
      "hit_dice": "4d10",
      "speed": "40 ft., climb 30 ft.",
      "strength": 19,
      "dexterity": 10,
      "constitution": 16,
      "intelligence": 2,
      "wisdom": 13,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The bear has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The bear makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Bugbear",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "goblinoid",
      "alignment": "chaotic evil",
      "armor_class": 16,
      "hit_points": 27,
      "hit_dice": "5d8",
      "speed": "30 ft.",
      "strength": 15,
      "dexterity": 14,
      "constitution": 13,
      "intelligence": 8,
      "wisdom": 11,
      "charisma": 9,
      "stealth": 6,
      "survival": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Common, Goblin",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Brute",
          "desc": "A melee weapon deals one extra die of its damage when the bugbear hits with it (included in the attack).",
          "attack_bonus": 0
        },
        {
          "name": "Surprise Attack",
          "desc": "If the bugbear surprises a creature and hits it with an attack during the first round of combat, the target takes an extra 7 (2d6) damage from the attack.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        }
      ],
      "actions": [
        {
          "name": "Morningstar",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 11 (2d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "2d8",
          "damage_bonus": 2
        },
        {
          "name": "Javelin",
          "desc": "Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 9 (2d6 + 2) piercing damage in melee or 5 (1d6 + 2) piercing damage at range.",
          "attack_bonus": 4,
          "damage_dice": "2d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Bulette",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 17,
      "hit_points": 94,
      "hit_dice": "9d10",
      "speed": "40 ft., burrow 40 ft.",
      "strength": 19,
      "dexterity": 11,
      "constitution": 21,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 5,
      "perception": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., tremorsense 60 ft., passive Perception 16",
      "languages": "",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Standing Leap",
          "desc": "The bulette's long jump is up to 30 ft. and its high jump is up to 15 ft., with or without a running start.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 30 (4d12 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "4d12",
          "damage_bonus": 4
        },
        {
          "name": "Deadly Leap",
          "desc": "If the bulette jumps at least 15 ft. as part of its movement, it can then use this action to land on its ft. in a space that contains one or more other creatures. Each of those creatures must succeed on a DC 16 Strength or Dexterity saving throw (target's choice) or be knocked prone and take 14 (3d6 + 4) bludgeoning damage plus 14 (3d6 + 4) slashing damage. On a successful save, the creature takes only half the damage, isn't knocked prone, and is pushed 5 ft. out of the bulette's space into an unoccupied space of the creature's choice. If no unoccupied space is within range, the creature instead falls prone in the bulette's space.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Camel",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 9,
      "hit_points": 15,
      "hit_dice": "2d10",
      "speed": "50 ft.",
      "strength": 16,
      "dexterity": 8,
      "constitution": 14,
      "intelligence": 2,
      "wisdom": 8,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 9",
      "languages": "",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.",
          "attack_bonus": 5,
          "damage_dice": "1d4"
        }
      ]
    },
    {
      "name": "Carrion Crawler",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 51,
      "hit_dice": "6d10",
      "speed": "30 ft., climb 30 ft.",
      "strength": 14,
      "dexterity": 13,
      "constitution": 16,
      "intelligence": 1,
      "wisdom": 12,
      "charisma": 5,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The carrion crawler has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The carrion crawler can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The carrion crawler makes two attacks: one with its tentacles and one with its bite.",
          "attack_bonus": 0
        },
        {
          "name": "Tentacles",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one creature. Hit: 4 (1d4 + 2) poison damage, and the target must succeed on a DC 13 Constitution saving throw or be poisoned for 1 minute. Until this poison ends, the target is paralyzed. The target can repeat the saving throw at the end of each of its turns, ending the poison on itself on a success.",
          "attack_bonus": 8,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "2d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Cat",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 2,
      "hit_dice": "1d4",
      "speed": "40 ft., climb 30 ft.",
      "strength": 3,
      "dexterity": 15,
      "constitution": 10,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The cat has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 slashing damage.",
          "attack_bonus": 0,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Cave Bear",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 42,
      "hit_dice": "5d10",
      "speed": "40 ft., swim 30 ft.",
      "strength": 20,
      "dexterity": 10,
      "constitution": 16,
      "intelligence": 2,
      "wisdom": 13,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The bear has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The bear makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (1d8 + 5) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "1d8",
          "damage_bonus": 5
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Centaur",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral good",
      "armor_class": 12,
      "hit_points": 45,
      "hit_dice": "6d10",
      "speed": "50 ft.",
      "strength": 18,
      "dexterity": 14,
      "constitution": 14,
      "intelligence": 9,
      "wisdom": 13,
      "charisma": 11,
      "athletics": 6,
      "perception": 3,
      "survival": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "Elvish, Sylvan",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the centaur moves at least 30 ft. straight toward a target and then hits it with a pike attack on the same turn, the target takes an extra 10 (3d6) piercing damage.",
          "attack_bonus": 0,
          "damage_dice": "3d6"
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The centaur makes two attacks: one with its pike and one with its hooves or two with its longbow.",
          "attack_bonus": 0
        },
        {
          "name": "Pike",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 9 (1d10 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d10",
          "damage_bonus": 4
        },
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +4 to hit, range 150/600 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Chain Devil",
      "size": "Medium",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 16,
      "hit_points": 85,
      "hit_dice": "10d8",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 18,
      "intelligence": 11,
      "wisdom": 12,
      "charisma": 14,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 8",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "11",
      "special_abilities": [
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the devil's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The devil has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The devil makes two attacks with its chains.",
          "attack_bonus": 0
        },
        {
          "name": "Chain",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) slashing damage. The target is grappled (escape DC 14) if the devil isn't already grappling a creature. Until this grapple ends, the target is restrained and takes 7 (2d6) piercing damage at the start of each of its turns.",
          "attack_bonus": 8,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Animate Chains (Recharges after a Short or Long Rest)",
          "desc": "Up to four chains the devil can see within 60 feet of it magically sprout razor-edged barbs and animate under the devil's control, provided that the chains aren't being worn or carried.\nEach animated chain is an object with AC 20, 20 hit points, resistance to piercing damage, and immunity to psychic and thunder damage. When the devil uses Multiattack on its turn, it can use each animated chain to make one additional chain attack. An animated chain can grapple one creature of its own but can't make attacks while grappling. An animated chain reverts to its inanimate state if reduced to 0 hit points or if the devil is incapacitated or dies.",
          "attack_bonus": 0
        }
      ],
      "reactions": [
        {
          "name": "Unnerving Mask",
          "desc": "When a creature the devil can see starts its turn within 30 feet of the devil, the devil can create the illusion that it looks like one of the creature's departed loved ones or bitter enemies. If the creature can see the devil, it must succeed on a DC 14 Wisdom saving throw or be frightened until the end of its turn.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Chimera",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 14,
      "hit_points": 114,
      "hit_dice": "12d10",
      "speed": "30 ft., fly 60 ft.",
      "strength": 19,
      "dexterity": 11,
      "constitution": 19,
      "intelligence": 3,
      "wisdom": 14,
      "charisma": 10,
      "perception": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 18",
      "languages": "understands Draconic but can't speak",
      "challenge_rating": "6",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The chimera makes three attacks: one with its bite, one with its horns, and one with its claws. When its fire breath is available, it can use the breath in place of its bite or horns.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Horns",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 10 (1d12 + 4) bludgeoning damage.",
          "attack_bonus": 7,
          "damage_dice": "1d12",
          "damage_bonus": 4
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Fire Breath (Recharge 5-6)",
          "desc": "The dragon head exhales fire in a 15-foot cone. Each creature in that area must make a DC 15 Dexterity saving throw, taking 31 (7d8) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "7d8"
        }
      ]
    },
    {
      "name": "Chuul",
      "size": "Large",
      "type": "aberration",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 16,
      "hit_points": 93,
      "hit_dice": "11d10",
      "speed": "30 ft., swim 30 ft.",
      "strength": 19,
      "dexterity": 10,
      "constitution": 16,
      "intelligence": 5,
      "wisdom": 11,
      "charisma": 5,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "understands Deep Speech but can't speak",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The chuul can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Sense Magic",
          "desc": "The chuul senses magic within 120 feet of it at will. This trait otherwise works like the detect magic spell but isn't itself magical.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The chuul makes two pincer attacks. If the chuul is grappling a creature, the chuul can also use its tentacles once.",
          "attack_bonus": 0
        },
        {
          "name": "Pincer",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage. The target is grappled (escape DC 14) if it is a Large or smaller creature and the chuul doesn't have two other creatures grappled.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Tentacles",
          "desc": "One creature grappled by the chuul must succeed on a DC 13 Constitution saving throw or be poisoned for 1 minute. Until this poison ends, the target is paralyzed. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Clay Golem",
      "size": "Large",
      "type": "construct",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 133,
      "hit_dice": "14d10",
      "speed": "20 ft.",
      "strength": 20,
      "dexterity": 9,
      "constitution": 18,
      "intelligence": 3,
      "wisdom": 8,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid, poison, psychic; bludgeoning, piercing, and slashing from nonmagical weapons that aren't adamantine",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, petrified, poisoned",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "understands the languages of its creator but can't speak",
      "challenge_rating": "9",
      "special_abilities": [
        {
          "name": "Acid Absorption",
          "desc": "Whenever the golem is subjected to acid damage, it takes no damage and instead regains a number of hit points equal to the acid damage dealt.",
          "attack_bonus": 0
        },
        {
          "name": "Berserk",
          "desc": "Whenever the golem starts its turn with 60 hit points or fewer, roll a d6. On a 6, the golem goes berserk. On each of its turns while berserk, the golem attacks the nearest creature it can see. If no creature is near enough to move to and attack, the golem attacks an object, with preference for an object smaller than itself. Once the golem goes berserk, it continues to do so until it is destroyed or regains all its hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Immutable Form",
          "desc": "The golem is immune to any spell or effect that would alter its form.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The golem has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The golem's weapon attacks are magical.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The golem makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 16 (2d10 + 5) bludgeoning damage. If the target is a creature, it must succeed on a DC 15 Constitution saving throw or have its hit point maximum reduced by an amount equal to the damage taken. The target dies if this attack reduces its hit point maximum to 0. The reduction lasts until removed by the greater restoration spell or other magic.",
          "attack_bonus": 8,
          "damage_dice": "2d10",
          "damage_bonus": 5
        },
        {
          "name": "Haste (Recharge 5-6)",
          "desc": "Until the end of its next turn, the golem magically gains a +2 bonus to its AC, has advantage on Dexterity saving throws, and can use its slam attack as a bonus action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Cloaker",
      "size": "Large",
      "type": "aberration",
      "subtype": "",
      "alignment": "chaotic neutral",
      "armor_class": 14,
      "hit_points": 78,
      "hit_dice": "12d10",
      "speed": "10 ft., fly 40 ft.",
      "strength": 17,
      "dexterity": 15,
      "constitution": 12,
      "intelligence": 13,
      "wisdom": 12,
      "charisma": 14,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "Deep Speech, Undercommon",
      "challenge_rating": "8",
      "special_abilities": [
        {
          "name": "Damage Transfer",
          "desc": "While attached to a creature, the cloaker takes only half the damage dealt to it (rounded down). and that creature takes the other half.",
          "attack_bonus": 0
        },
        {
          "name": "False Appearance",
          "desc": "While the cloaker remains motionless without its underside exposed, it is indistinguishable from a dark leather cloak.",
          "attack_bonus": 0
        },
        {
          "name": "Light Sensitivity",
          "desc": "While in bright light, the cloaker has disadvantage on attack rolls and Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The cloaker makes two attacks: one with its bite and one with its tail.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 10 (2d6 + 3) piercing damage, and if the target is Large or smaller, the cloaker attaches to it. If the cloaker has advantage against the target, the cloaker attaches to the target's head, and the target is blinded and unable to breathe while the cloaker is attached. While attached, the cloaker can make this attack only against the target and has advantage on the attack roll. The cloaker can detach itself by spending 5 feet of its movement. A creature, including the target, can take its action to detach the cloaker by succeeding on a DC 16 Strength check.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one creature. Hit: 7 (1d8 + 3) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Moan",
          "desc": "Each creature within 60 feet of the cloaker that can hear its moan and that isn't an aberration must succeed on a DC 13 Wisdom saving throw or become frightened until the end of the cloaker's next turn. If a creature's saving throw is successful, the creature is immune to the cloaker's moan for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Phantasms (Recharges after a Short or Long Rest)",
          "desc": "The cloaker magically creates three illusory duplicates of itself if it isn't in bright light. The duplicates move with it and mimic its actions, shifting position so as to make it impossible to track which cloaker is the real one. If the cloaker is ever in an area of bright light, the duplicates disappear.\nWhenever any creature targets the cloaker with an attack or a harmful spell while a duplicate remains, that creature rolls randomly to determine whether it targets the cloaker or one of the duplicates. A creature is unaffected by this magical effect if it can't see or if it relies on senses other than sight.\nA duplicate has the cloaker's AC and uses its saving throws. If an attack hits a duplicate, or if a duplicate fails a saving throw against an effect that deals damage, the duplicate disappears.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Cloud Giant",
      "size": "Huge",
      "type": "giant",
      "subtype": "",
      "alignment": "neutral good (50%) or neutral evil (50%)",
      "armor_class": 14,
      "hit_points": 200,
      "hit_dice": "16d12",
      "speed": "40 ft.",
      "strength": 27,
      "dexterity": 10,
      "constitution": 22,
      "intelligence": 12,
      "wisdom": 16,
      "charisma": 16,
      "constitution_save": 10,
      "wisdom_save": 7,
      "charisma_save": 7,
      "insight": 7,
      "perception": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 17",
      "languages": "Common, Giant",
      "challenge_rating": "9",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The giant has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The giant's innate spellcasting ability is Charisma. It can innately cast the following spells, requiring no material components:\n\nAt will: detect magic, fog cloud, light\n3/day each: feather fall, fly, misty step, telekinesis\n1/day each: control weather, gaseous form",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The giant makes two morningstar attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Morningstar",
          "desc": "Melee Weapon Attack: +12 to hit, reach 10 ft., one target. Hit: 21 (3d8 + 8) piercing damage.",
          "attack_bonus": 12,
          "damage_dice": "3d8",
          "damage_bonus": 8
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +12 to hit, range 60/240 ft., one target. Hit: 30 (4d10 + 8) bludgeoning damage.",
          "attack_bonus": 12,
          "damage_dice": "4d10",
          "damage_bonus": 8
        }
      ]
    },
    {
      "name": "Cockatrice",
      "size": "Small",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 27,
      "hit_dice": "6d6",
      "speed": "20 ft., fly 40 ft.",
      "strength": 6,
      "dexterity": 12,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 13,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "1/2",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 3 (1d4 + 1) piercing damage, and the target must succeed on a DC 11 Constitution saving throw against being magically petrified. On a failed save, the creature begins to turn to stone and is restrained. It must repeat the saving throw at the end of its next turn. On a success, the effect ends. On a failure, the creature is petrified for 24 hours.",
          "attack_bonus": 3,
          "damage_dice": "1d4",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Commoner",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 10,
      "hit_points": 4,
      "hit_dice": "1d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 10,
      "constitution": 10,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "0",
      "actions": [
        {
          "name": "Club",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage.",
          "attack_bonus": 2,
          "damage_dice": "1d4"
        }
      ]
    },
    {
      "name": "Constrictor Snake",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 13,
      "hit_dice": "2d10",
      "speed": "30 ft., swim 30 ft.",
      "strength": 15,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Constrict",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 6 (1d8 + 2) bludgeoning damage, and the target is grappled (escape DC 14). Until this grapple ends, the creature is restrained, and the snake can't constrict another target.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Copper Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 16,
      "hit_points": 22,
      "hit_dice": "4d8",
      "speed": "30 ft., climb 30 ft., fly 60 ft.",
      "strength": 15,
      "dexterity": 12,
      "constitution": 13,
      "intelligence": 14,
      "wisdom": 11,
      "charisma": 13,
      "dexterity_save": 3,
      "constitution_save": 3,
      "wisdom_save": 2,
      "charisma_save": 3,
      "perception": 4,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "1",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d10",
          "damage_bonus": 2
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nAcid Breath. The dragon exhales acid in an 20-foot line that is 5 feet wide. Each creature in that line must make a DC 11 Dexterity saving throw, taking 18 (4d8) acid damage on a failed save, or half as much damage on a successful one.\nSlowing Breath. The dragon exhales gas in a 1 5-foot cone. Each creature in that area must succeed on a DC 11 Constitution saving throw. On a failed save, the creature can't use reactions, its speed is halved, and it can't make more than one attack on its turn. In addition, the creature can use either an action or a bonus action on its turn, but not both. These effects last for 1 minute. The creature can repeat the saving throw at the end of each of its turns, ending the effect on itself with a successful save.",
          "attack_bonus": 0,
          "damage_dice": "4d8"
        }
      ]
    },
    {
      "name": "Couatl",
      "size": "Medium",
      "type": "celestial",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 19,
      "hit_points": 97,
      "hit_dice": "13d8",
      "speed": "30 ft., fly 90 ft.",
      "strength": 16,
      "dexterity": 20,
      "constitution": 17,
      "intelligence": 18,
      "wisdom": 20,
      "charisma": 18,
      "constitution_save": 5,
      "wisdom_save": 7,
      "charisma_save": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "radiant",
      "damage_immunities": "psychic; bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "",
      "senses": "truesight 120 ft., passive Perception 15",
      "languages": "all, telepathy 120 ft.",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Innate Spellcasting",
          "desc": "The couatl's spellcasting ability is Charisma (spell save DC 14). It can innately cast the following spells, requiring only verbal components:\n\nAt will: detect evil and good, detect magic, detect thoughts\n3/day each: bless, create food and water, cure wounds, lesser restoration, protection from poison, sanctuary, shield\n1/day each: dream, greater restoration, scrying",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The couatl's weapon attacks are magical.",
          "attack_bonus": 0
        },
        {
          "name": "Shielded Mind",
          "desc": "The couatl is immune to scrying and to any effect that would sense its emotions, read its thoughts, or detect its location.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one creature. Hit: 8 (1d6 + 5) piercing damage, and the target must succeed on a DC 13 Constitution saving throw or be poisoned for 24 hours. Until this poison ends, the target is unconscious. Another creature can use an action to shake the target awake.",
          "attack_bonus": 8,
          "damage_dice": "1d6",
          "damage_bonus": 5
        },
        {
          "name": "Constrict",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one Medium or smaller creature. Hit: 10 (2d6 + 3) bludgeoning damage, and the target is grappled (escape DC 15). Until this grapple ends, the target is restrained, and the couatl can't constrict another target.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Change Shape",
          "desc": "The couatl magically polymorphs into a humanoid or beast that has a challenge rating equal to or less than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the couatl's choice).\nIn a new form, the couatl retains its game statistics and ability to speak, but its AC, movement modes, Strength, Dexterity, and other actions are replaced by those of the new form, and it gains any statistics and capabilities (except class features, legendary actions, and lair actions) that the new form has but that it lacks. If the new form has a bite attack, the couatl can use its bite in that form.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Crab",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 2,
      "hit_dice": "1d4",
      "speed": "20 ft., swim 20 ft.",
      "strength": 2,
      "dexterity": 11,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 8,
      "charisma": 2,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The crab can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 bludgeoning damage.",
          "attack_bonus": 0,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Crocodile",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "20 ft., swim 20 ft.",
      "strength": 15,
      "dexterity": 10,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 5,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Hold Breath",
          "desc": "The crocodile can hold its breath for 15 minutes.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target is grappled (escape DC 12). Until this grapple ends, the target is restrained, and the crocodile can't bite another target",
          "attack_bonus": 4,
          "damage_dice": "1d10",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Cult Fanatic",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any non-good alignment",
      "armor_class": 13,
      "hit_points": 22,
      "hit_dice": "6d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 10,
      "wisdom": 13,
      "charisma": 14,
      "deception": 4,
      "persuasion": 4,
      "religion": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "any one language (usually Common)",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Dark Devotion",
          "desc": "The fanatic has advantage on saving throws against being charmed or frightened.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The fanatic is a 4th-level spellcaster. Its spell casting ability is Wisdom (spell save DC 11, +3 to hit with spell attacks). The fanatic has the following cleric spells prepared:\n\nCantrips (at will): light, sacred flame, thaumaturgy\n• 1st level (4 slots): command, inflict wounds, shield of faith\n• 2nd level (3 slots): hold person, spiritual weapon",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The fanatic makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Dagger",
          "desc": "Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one creature. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Cultist",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any non-good alignment",
      "armor_class": 12,
      "hit_points": 9,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 12,
      "constitution": 10,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 10,
      "deception": 2,
      "religion": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Dark Devotion",
          "desc": "The cultist has advantage on saving throws against being charmed or frightened.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Scimitar",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 4 (1d6 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Darkmantle",
      "size": "Small",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 22,
      "hit_dice": "5d6",
      "speed": "10 ft., fly 30 ft.",
      "strength": 16,
      "dexterity": 12,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 5,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Echolocation",
          "desc": "The darkmantle can't use its blindsight while deafened.",
          "attack_bonus": 0
        },
        {
          "name": "False Appearance",
          "desc": "While the darkmantle remains motionless, it is indistinguishable from a cave formation such as a stalactite or stalagmite.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Crush",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 6 (1d6 + 3) bludgeoning damage, and the darkmantle attaches to the target. If the target is Medium or smaller and the darkmantle has advantage on the attack roll, it attaches by engulfing the target's head, and the target is also blinded and unable to breathe while the darkmantle is attached in this way.\nWhile attached to the target, the darkmantle can attack no other creature except the target but has advantage on its attack rolls. The darkmantle's speed also becomes 0, it can't benefit from any bonus to its speed, and it moves with the target.\nA creature can detach the darkmantle by making a successful DC 13 Strength check as an action. On its turn, the darkmantle can detach itself from the target by using 5 feet of movement.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Darkness Aura (1/day)",
          "desc": "A 15-foot radius of magical darkness extends out from the darkmantle, moves with it, and spreads around corners. The darkness lasts as long as the darkmantle maintains concentration, up to 10 minutes (as if concentrating on a spell). Darkvision can't penetrate this darkness, and no natural light can illuminate it. If any of the darkness overlaps with an area of light created by a spell of 2nd level or lower, the spell creating the light is dispelled.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Death Dog",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 12,
      "hit_points": 39,
      "hit_dice": "6d8",
      "speed": "40 ft.",
      "strength": 15,
      "dexterity": 14,
      "constitution": 14,
      "intelligence": 3,
      "wisdom": 13,
      "charisma": 6,
      "perception": 5,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 15",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Two-Headed",
          "desc": "The dog has advantage on Wisdom (Perception) checks and on saving throws against being blinded, charmed, deafened, frightened, stunned, or knocked unconscious.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dog makes two bite attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage. If the target is a creature, it must succeed on a DC 12 Constitution saving throw against disease or become poisoned until the disease is cured. Every 24 hours that elapse, the creature must repeat the saving throw, reducing its hit point maximum by 5 (1d10) on a failure. This reduction lasts until the disease is cured. The creature dies if the disease reduces its hit point maximum to 0.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Deep Gnome (Svirfneblin)",
      "size": "Small",
      "type": "humanoid",
      "subtype": "gnome",
      "alignment": "neutral good",
      "armor_class": 15,
      "hit_points": 16,
      "hit_dice": "3d6",
      "speed": "20 ft.",
      "strength": 15,
      "dexterity": 14,
      "constitution": 14,
      "intelligence": 12,
      "wisdom": 10,
      "charisma": 9,
      "investigation": 3,
      "perception": 2,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 12",
      "languages": "Gnomish, Terran, Undercommon",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Stone Camouflage",
          "desc": "The gnome has advantage on Dexterity (Stealth) checks made to hide in rocky terrain.",
          "attack_bonus": 0
        },
        {
          "name": "Gnome Cunning",
          "desc": "The gnome has advantage on Intelligence, Wisdom, and Charisma saving throws against magic.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The gnome's innate spellcasting ability is Intelligence (spell save DC 11). It can innately cast the following spells, requiring no material components:\nAt will: nondetection (self only)\n1/day each: blindness/deafness, blur, disguise self",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "War Pick",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        },
        {
          "name": "Poisoned Dart",
          "desc": "Ranged Weapon Attack: +4 to hit, range 30/120 ft., one creature. Hit: 4 (1d4 + 2) piercing damage, and the target must succeed on a DC 12 Constitution saving throw or be poisoned for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Deer",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 4,
      "hit_dice": "1d8",
      "speed": "50 ft.",
      "strength": 11,
      "dexterity": 16,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 14,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "",
      "challenge_rating": "0",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) piercing damage.",
          "attack_bonus": 2,
          "damage_dice": "1d4"
        }
      ]
    },
    {
      "name": "Deva",
      "size": "Medium",
      "type": "celestial",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 17,
      "hit_points": 136,
      "hit_dice": "16d8",
      "speed": "30 ft., fly 90 ft.",
      "strength": 18,
      "dexterity": 18,
      "constitution": 18,
      "intelligence": 17,
      "wisdom": 20,
      "charisma": 20,
      "wisdom_save": 9,
      "charisma_save": 9,
      "insight": 9,
      "perception": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "radiant; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "",
      "condition_immunities": "charmed, exhaustion, frightened",
      "senses": "darkvision 120 ft., passive Perception 19",
      "languages": "all, telepathy 120 ft.",
      "challenge_rating": "10",
      "special_abilities": [
        {
          "name": "Angelic Weapons",
          "desc": "The deva's weapon attacks are magical. When the deva hits with any weapon, the weapon deals an extra 4d8 radiant damage (included in the attack).",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The deva's spellcasting ability is Charisma (spell save DC 17). The deva can innately cast the following spells, requiring only verbal components:\nAt will: detect evil and good\n1/day each: commune, raise dead",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The deva has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The deva makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Mace",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) bludgeoning damage plus 18 (4d8) radiant damage.",
          "attack_bonus": 8,
          "damage_dice": "1d6 + 4d8",
          "damage_bonus": 4
        },
        {
          "name": "Healing Touch (3/Day)",
          "desc": "The deva touches another creature. The target magically regains 20 (4d8 + 2) hit points and is freed from any curse, disease, poison, blindness, or deafness.",
          "attack_bonus": 0
        },
        {
          "name": "Change Shape",
          "desc": "The deva magically polymorphs into a humanoid or beast that has a challenge rating equal to or less than its own, or back into its true form. It reverts to its true form if it dies. Any equipment it is wearing or carrying is absorbed or borne by the new form (the deva's choice).\nIn a new form, the deva retains its game statistics and ability to speak, but its AC, movement modes, Strength, Dexterity, and special senses are replaced by those of the new form, and it gains any statistics and capabilities (except class features, legendary actions, and lair actions) that the new form has but that it lacks.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Dire Wolf",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 37,
      "hit_dice": "5d10",
      "speed": "50 ft.",
      "strength": 17,
      "dexterity": 15,
      "constitution": 15,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The wolf has advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Djinni",
      "size": "Large",
      "type": "elemental",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 17,
      "hit_points": 161,
      "hit_dice": "14d10",
      "speed": "30 ft., fly 90 ft.",
      "strength": 21,
      "dexterity": 15,
      "constitution": 22,
      "intelligence": 15,
      "wisdom": 16,
      "charisma": 20,
      "dexterity_save": 6,
      "wisdom_save": 7,
      "charisma_save": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning, thunder",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 13",
      "languages": "Auran",
      "challenge_rating": "11",
      "special_abilities": [
        {
          "name": "Elemental Demise",
          "desc": "If the djinni dies, its body disintegrates into a warm breeze, leaving behind only equipment the djinni was wearing or carrying.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The djinni's innate spellcasting ability is Charisma (spell save DC 17, +9 to hit with spell attacks). It can innately cast the following spells, requiring no material components:\n\nAt will: detect evil and good, detect magic, thunderwave 3/day each: create food and water (can create wine instead of water), tongues, wind walk\n1/day each: conjure elemental (air elemental only), creation, gaseous form, invisibility, major image, plane shift",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Genie Powers",
          "desc": "Genies have a variety of magical capabilities, including spells. A few have even greater powers that allow them to alter their appearance or the nature of reality.\n\nDisguises.\nSome genies can veil themselves in illusion to pass as other similarly shaped creatures. Such genies can innately cast the disguise self spell at will, often with a longer duration than is normal for that spell. Mightier genies can cast the true polymorph spell one to three times per day, possibly with a longer duration than normal. Such genies can change only their own shape, but a rare few can use the spell on other creatures and objects as well.\nWishes.\nThe genie power to grant wishes is legendary among mortals. Only the most potent genies, such as those among the nobility, can do so. A particular genie that has this power can grant one to three wishes to a creature that isn't a genie. Once a genie has granted its limit of wishes, it can't grant wishes again for some amount of time (usually 1 year). and cosmic law dictates that the same genie can expend its limit of wishes on a specific creature only once in that creature's existence.\nTo be granted a wish, a creature within 60 feet of the genie states a desired effect to it. The genie can then cast the wish spell on the creature's behalf to bring about the effect. Depending on the genie's nature, the genie might try to pervert the intent of the wish by exploiting the wish's poor wording. The perversion of the wording is usually crafted to be to the genie's benefit.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The djinni makes three scimitar attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Scimitar",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage plus 3 (1d6) lightning or thunder damage (djinni's choice).",
          "attack_bonus": 9,
          "damage_dice": "2d6 + 1d6",
          "damage_bonus": 5
        },
        {
          "name": "Create Whirlwind",
          "desc": "A 5-foot-radius, 30-foot-tall cylinder of swirling air magically forms on a point the djinni can see within 120 feet of it. The whirlwind lasts as long as the djinni maintains concentration (as if concentrating on a spell). Any creature but the djinni that enters the whirlwind must succeed on a DC 18 Strength saving throw or be restrained by it. The djinni can move the whirlwind up to 60 feet as an action, and creatures restrained by the whirlwind move with it. The whirlwind ends if the djinni loses sight of it.\nA creature can use its action to free a creature restrained by the whirlwind, including itself, by succeeding on a DC 18 Strength check. If the check succeeds, the creature is no longer restrained and moves to the nearest space outside the whirlwind.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Doppelganger",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "shapechanger",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 52,
      "hit_dice": "8d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 18,
      "constitution": 14,
      "intelligence": 11,
      "wisdom": 12,
      "charisma": 14,
      "deception": 6,
      "insight": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "charmed",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "Common",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The doppelganger can use its action to polymorph into a Small or Medium humanoid it has seen, or back into its true form. Its statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Ambusher",
          "desc": "The doppelganger has advantage on attack rolls against any creature it has surprised.",
          "attack_bonus": 0
        },
        {
          "name": "Surprise Attack",
          "desc": "If the doppelganger surprises a creature and hits it with an attack during the first round of combat, the target takes an extra 10 (3d6) damage from the attack.",
          "attack_bonus": 0,
          "damage_dice": "3d6"
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The doppelganger makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "1d6",
          "damage_bonus": 4
        },
        {
          "name": "Read Thoughts",
          "desc": "The doppelganger magically reads the surface thoughts of one creature within 60 ft. of it. The effect can penetrate barriers, but 3 ft. of wood or dirt, 2 ft. of stone, 2 inches of metal, or a thin sheet of lead blocks it. While the target is in range, the doppelganger can continue reading its thoughts, as long as the doppelganger's concentration isn't broken (as if concentrating on a spell). While reading the target's mind, the doppelganger has advantage on Wisdom (Insight) and Charisma (Deception, Intimidation, and Persuasion) checks against the target.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Draft Horse",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "40 ft.",
      "strength": 18,
      "dexterity": 10,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 11,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (2d4 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d4",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Dragon Turtle",
      "size": "Gargantuan",
      "type": "dragon",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 20,
      "hit_points": 341,
      "hit_dice": "22d20",
      "speed": "20 ft., swim 40 ft.",
      "strength": 25,
      "dexterity": 10,
      "constitution": 20,
      "intelligence": 10,
      "wisdom": 12,
      "charisma": 12,
      "dexterity_save": 6,
      "constitution_save": 11,
      "wisdom_save": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "fire",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 11",
      "languages": "Aquan, Draconic",
      "challenge_rating": "17",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon turtle can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon turtle makes three attacks: one with its bite and two with its claws. It can make one tail attack in place of its two claw attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +13 to hit, reach 15 ft., one target. Hit: 26 (3d12 + 7) piercing damage.",
          "attack_bonus": 13,
          "damage_dice": "3d12",
          "damage_bonus": 7
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 16 (2d8 + 7) slashing damage.",
          "attack_bonus": 13,
          "damage_dice": "2d8",
          "damage_bonus": 7
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +13 to hit, reach 15 ft., one target. Hit: 26 (3d12 + 7) bludgeoning damage. If the target is a creature, it must succeed on a DC 20 Strength saving throw or be pushed up to 10 feet away from the dragon turtle and knocked prone.",
          "attack_bonus": 13,
          "damage_dice": "3d12",
          "damage_bonus": 7
        },
        {
          "name": "Steam Breath (Recharge 5-6)",
          "desc": "The dragon turtle exhales scalding steam in a 60-foot cone. Each creature in that area must make a DC 18 Constitution saving throw, taking 52 (15d6) fire damage on a failed save, or half as much damage on a successful one. Being underwater doesn't grant resistance against this damage.",
          "attack_bonus": 0,
          "damage_dice": "15d6"
        }
      ]
    },
    {
      "name": "Dretch",
      "size": "Small",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 11,
      "hit_points": 18,
      "hit_dice": "4d6",
      "speed": "20 ft.",
      "strength": 11,
      "dexterity": 11,
      "constitution": 12,
      "intelligence": 5,
      "wisdom": 8,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire, lightning",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "Abyssal, telepathy 60 ft. (works only with creatures that understand Abyssal)",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dretch makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 3 (1d6) piercing damage.",
          "attack_bonus": 2,
          "damage_dice": "1d6"
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 5 (2d4) slashing damage.",
          "attack_bonus": 2,
          "damage_dice": "2d4"
        },
        {
          "name": "Fetid Cloud (1/Day)",
          "desc": "A 10-foot radius of disgusting green gas extends out from the dretch. The gas spreads around corners, and its area is lightly obscured. It lasts for 1 minute or until a strong wind disperses it. Any creature that starts its turn in that area must succeed on a DC 11 Constitution saving throw or be poisoned until the start of its next turn. While poisoned in this way, the target can take either an action or a bonus action on its turn, not both, and can't take reactions.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Drider",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 19,
      "hit_points": 123,
      "hit_dice": "13d10",
      "speed": "30 ft., climb 30 ft.",
      "strength": 16,
      "dexterity": 16,
      "constitution": 18,
      "intelligence": 13,
      "wisdom": 14,
      "charisma": 12,
      "perception": 5,
      "stealth": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 15",
      "languages": "Elvish, Undercommon",
      "challenge_rating": "6",
      "special_abilities": [
        {
          "name": "Fey Ancestry",
          "desc": "The drider has advantage on saving throws against being charmed, and magic can't put the drider to sleep.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The drider's innate spellcasting ability is Wisdom (spell save DC 13). The drider can innately cast the following spells, requiring no material components:\nAt will: dancing lights\n1/day each: darkness, faerie fire",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The drider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Sunlight Sensitivity",
          "desc": "While in sunlight, the drider has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        },
        {
          "name": "Web Walker",
          "desc": "The drider ignores movement restrictions caused by webbing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The drider makes three attacks, either with its longsword or its longbow. It can replace one of those attacks with a bite attack.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 2 (1d4) piercing damage plus 9 (2d8) poison damage.",
          "attack_bonus": 6,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage, or 8 (1d10 + 3) slashing damage if used with two hands.",
          "attack_bonus": 6,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +6 to hit, range 150/600 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 4 (1d8) poison damage.",
          "attack_bonus": 6,
          "damage_dice": "1d8",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Drow",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "elf",
      "alignment": "neutral evil",
      "armor_class": 15,
      "hit_points": 13,
      "hit_dice": "3d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 14,
      "constitution": 10,
      "intelligence": 11,
      "wisdom": 11,
      "charisma": 12,
      "perception": 2,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 12",
      "languages": "Elvish, Undercommon",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Fey Ancestry",
          "desc": "The drow has advantage on saving throws against being charmed, and magic can't put the drow to sleep.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The drow's spellcasting ability is Charisma (spell save DC 11). It can innately cast the following spells, requiring no material components:\nAt will: dancing lights\n1/day each: darkness, faerie fire",
          "attack_bonus": 0
        },
        {
          "name": "Sunlight Sensitivity",
          "desc": "While in sunlight, the drow has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Hand Crossbow",
          "desc": "Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage, and the target must succeed on a DC 13 Constitution saving throw or be poisoned for 1 hour. If the saving throw fails by 5 or more, the target is also unconscious while poisoned in this way. The target wakes up if it takes damage or if another creature takes an action to shake it awake.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Druid",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 11,
      "hit_points": 27,
      "hit_dice": "5d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 12,
      "constitution": 13,
      "intelligence": 12,
      "wisdom": 15,
      "charisma": 11,
      "medicine": 4,
      "nature": 3,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "Druidic plus any two languages",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Spellcasting",
          "desc": "The druid is a 4th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 12, +4 to hit with spell attacks). It has the following druid spells prepared:\n\n• Cantrips (at will): druidcraft, produce flame, shillelagh\n• 1st level (4 slots): entangle, longstrider, speak with animals, thunderwave\n• 2nd level (3 slots): animal messenger, barkskin",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Quarterstaff",
          "desc": "Melee Weapon Attack: +2 to hit (+4 to hit with shillelagh), reach 5 ft., one target. Hit: 3 (1d6) bludgeoning damage, or 6 (1d8 + 2) bludgeoning damage with shillelagh or if wielded with two hands.",
          "attack_bonus": 2,
          "damage_dice": "1d6"
        }
      ]
    },
    {
      "name": "Dryad",
      "size": "Medium",
      "type": "fey",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 11,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 12,
      "constitution": 11,
      "intelligence": 14,
      "wisdom": 15,
      "charisma": 18,
      "perception": 4,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Elvish, Sylvan",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Innate Spellcasting",
          "desc": "The dryad's innate spellcasting ability is Charisma (spell save DC 14). The dryad can innately cast the following spells, requiring no material components:\n\nAt will: druidcraft\n3/day each: entangle, goodberry\n1/day each: barkskin, pass without trace, shillelagh",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The dryad has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Speak with Beasts and Plants",
          "desc": "The dryad can communicate with beasts and plants as if they shared a language.",
          "attack_bonus": 0
        },
        {
          "name": "Tree Stride",
          "desc": "Once on her turn, the dryad can use 10 ft. of her movement to step magically into one living tree within her reach and emerge from a second living tree within 60 ft. of the first tree, appearing in an unoccupied space within 5 ft. of the second tree. Both trees must be large or bigger.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Club",
          "desc": "Melee Weapon Attack: +2 to hit (+6 to hit with shillelagh), reach 5 ft., one target. Hit: 2 (1 d4) bludgeoning damage, or 8 (1d8 + 4) bludgeoning damage with shillelagh.",
          "attack_bonus": 2,
          "damage_dice": "1d4"
        },
        {
          "name": "Fey Charm",
          "desc": "The dryad targets one humanoid or beast that she can see within 30 feet of her. If the target can see the dryad, it must succeed on a DC 14 Wisdom saving throw or be magically charmed. The charmed creature regards the dryad as a trusted friend to be heeded and protected. Although the target isn't under the dryad's control, it takes the dryad's requests or actions in the most favorable way it can.\nEach time the dryad or its allies do anything harmful to the target, it can repeat the saving throw, ending the effect on itself on a success. Otherwise, the effect lasts 24 hours or until the dryad dies, is on a different plane of existence from the target, or ends the effect as a bonus action. If a target's saving throw is successful, the target is immune to the dryad's Fey Charm for the next 24 hours.\nThe dryad can have no more than one humanoid and up to three beasts charmed at a time.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Duergar",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "dwarf",
      "alignment": "lawful evil",
      "armor_class": 16,
      "hit_points": 26,
      "hit_dice": "4d8",
      "speed": "25 ft.",
      "strength": 14,
      "dexterity": 11,
      "constitution": 14,
      "intelligence": 11,
      "wisdom": 10,
      "charisma": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "poison",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 10",
      "languages": "Dwarvish, Undercommon",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Duergar Resilience",
          "desc": "The duergar has advantage on saving throws against poison, spells, and illusions, as well as to resist being charmed or paralyzed.",
          "attack_bonus": 0
        },
        {
          "name": "Sunlight Sensitivity",
          "desc": "While in sunlight, the duergar has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Enlarge (Recharges after a Short or Long Rest)",
          "desc": "For 1 minute, the duergar magically increases in size, along with anything it is wearing or carrying. While enlarged, the duergar is Large, doubles its damage dice on Strength-based weapon attacks (included in the attacks), and makes Strength checks and Strength saving throws with advantage. If the duergar lacks the room to become Large, it attains the maximum size possible in the space available.",
          "attack_bonus": 0
        },
        {
          "name": "War Pick",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage, or 11 (2d8 + 2) piercing damage while enlarged.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        },
        {
          "name": "Javelin",
          "desc": "Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage, or 9 (2d6 + 2) piercing damage while enlarged.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Invisibility (Recharges after a Short or Long Rest)",
          "desc": "The duergar magically turns invisible until it attacks, casts a spell, or uses its Enlarge, or until its concentration is broken, up to 1 hour (as if concentrating on a spell). Any equipment the duergar wears or carries is invisible with it .",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Dust Mephit",
      "size": "Small",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 12,
      "hit_points": 17,
      "hit_dice": "5d6",
      "speed": "30 ft., fly 30 ft.",
      "strength": 5,
      "dexterity": 14,
      "constitution": 10,
      "intelligence": 9,
      "wisdom": 11,
      "charisma": 10,
      "perception": 2,
      "stealth": 4,
      "damage_vulnerabilities": "fire",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 12",
      "languages": "Auran, Terran",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Death Burst",
          "desc": "When the mephit dies, it explodes in a burst of dust. Each creature within 5 ft. of it must then succeed on a DC 10 Constitution saving throw or be blinded for 1 minute. A blinded creature can repeat the saving throw on each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting (1/Day)",
          "desc": "The mephit can innately cast sleep, requiring no material components. Its innate spellcasting ability is Charisma.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Blinding Breath (Recharge 6)",
          "desc": "The mephit exhales a 15-foot cone of blinding dust. Each creature in that area must succeed on a DC 10 Dexterity saving throw or be blinded for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Mephits (1/Day)",
          "desc": "The mephit has a 25 percent chance of summoning 1d4 mephits of its kind. A summoned mephit appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other mephits. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Eagle",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 3,
      "hit_dice": "1d6",
      "speed": "10 ft., fly 60 ft.",
      "strength": 6,
      "dexterity": 15,
      "constitution": 10,
      "intelligence": 2,
      "wisdom": 14,
      "charisma": 7,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Sight",
          "desc": "The eagle has advantage on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Earth Elemental",
      "size": "Large",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 17,
      "hit_points": 126,
      "hit_dice": "12d10",
      "speed": "30 ft., burrow 30 ft.",
      "strength": 20,
      "dexterity": 8,
      "constitution": 20,
      "intelligence": 5,
      "wisdom": 10,
      "charisma": 5,
      "damage_vulnerabilities": "thunder",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "exhaustion, paralyzed, petrified, poisoned, unconscious",
      "senses": "darkvision 60 ft., tremorsense 60 ft., passive Perception 10",
      "languages": "Terran",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Earth Glide",
          "desc": "The elemental can burrow through nonmagical, unworked earth and stone. While doing so, the elemental doesn't disturb the material it moves through.",
          "attack_bonus": 0
        },
        {
          "name": "Siege Monster",
          "desc": "The elemental deals double damage to objects and structures.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The elemental makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.",
          "attack_bonus": 8,
          "damage_dice": "2d8",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Efreeti",
      "size": "Large",
      "type": "elemental",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 17,
      "hit_points": 200,
      "hit_dice": "16d10",
      "speed": "40 ft., fly 60 ft.",
      "strength": 22,
      "dexterity": 12,
      "constitution": 24,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 16,
      "intelligence_save": 7,
      "wisdom_save": 6,
      "charisma_save": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 12",
      "languages": "Ignan",
      "challenge_rating": "11",
      "special_abilities": [
        {
          "name": "Elemental Demise",
          "desc": "If the efreeti dies, its body disintegrates in a flash of fire and puff of smoke, leaving behind only equipment the djinni was wearing or carrying.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The efreeti's innate spell casting ability is Charisma (spell save DC 15, +7 to hit with spell attacks). It can innately cast the following spells, requiring no material components:\n\nAt will: detect magic\n3/day: enlarge/reduce, tongues\n1/day each: conjure elemental (fire elemental only), gaseous form, invisibility, major image, plane shift, wall of fire",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Genie Powers",
          "desc": "Genies have a variety of magical capabilities, including spells. A few have even greater powers that allow them to alter their appearance or the nature of reality.\n\nDisguises.\nSome genies can veil themselves in illusion to pass as other similarly shaped creatures. Such genies can innately cast the disguise self spell at will, often with a longer duration than is normal for that spell. Mightier genies can cast the true polymorph spell one to three times per day, possibly with a longer duration than normal. Such genies can change only their own shape, but a rare few can use the spell on other creatures and objects as well.\nWishes.\nThe genie power to grant wishes is legendary among mortals. Only the most potent genies, such as those among the nobility, can do so. A particular genie that has this power can grant one to three wishes to a creature that isn't a genie. Once a genie has granted its limit of wishes, it can't grant wishes again for some amount of time (usually 1 year). and cosmic law dictates that the same genie can expend its limit of wishes on a specific creature only once in that creature's existence.\nTo be granted a wish, a creature within 60 feet of the genie states a desired effect to it. The genie can then cast the wish spell on the creature's behalf to bring about the effect. Depending on the genie's nature, the genie might try to pervert the intent of the wish by exploiting the wish's poor wording. The perversion of the wording is usually crafted to be to the genie's benefit.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The efreeti makes two scimitar attacks or uses its Hurl Flame twice.",
          "attack_bonus": 0
        },
        {
          "name": "Scimitar",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage plus 7 (2d6) fire damage.",
          "attack_bonus": 10,
          "damage_dice": "2d6 + 2d6",
          "damage_bonus": 6
        },
        {
          "name": "Hurl Flame",
          "desc": "Ranged Spell Attack: +7 to hit, range 120 ft., one target. Hit: 17 (5d6) fire damage.",
          "attack_bonus": 7,
          "damage_dice": "5d6"
        }
      ]
    },
    {
      "name": "Elephant",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 76,
      "hit_dice": "8d12",
      "speed": "40 ft.",
      "strength": 22,
      "dexterity": 9,
      "constitution": 17,
      "intelligence": 3,
      "wisdom": 11,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Trampling Charge",
          "desc": "If the elephant moves at least 20 ft. straight toward a creature and then hits it with a gore attack on the same turn, that target must succeed on a DC 12 Strength saving throw or be knocked prone. If the target is prone, the elephant can make one stomp attack against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Gore",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 19 (3d8 + 6) piercing damage.",
          "attack_bonus": 8,
          "damage_dice": "3d8",
          "damage_bonus": 6
        },
        {
          "name": "Stomp",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one prone creature. Hit: 22 (3d10 + 6) bludgeoning damage.",
          "attack_bonus": 8,
          "damage_dice": "3d10",
          "damage_bonus": 6
        }
      ]
    },
    {
      "name": "Elk",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 13,
      "hit_dice": "2d10",
      "speed": "50 ft.",
      "strength": 16,
      "dexterity": 10,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the elk moves at least 20 ft. straight toward a target and then hits it with a ram attack on the same turn, the target takes an extra 7 (2d6) damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        }
      ],
      "actions": [
        {
          "name": "Ram",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) bludgeoning damage.",
          "attack_bonus": 0
        },
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one prone creature. Hit: 8 (2d4 + 3) bludgeoning damage.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Erinyes",
      "size": "Medium",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 18,
      "hit_points": 153,
      "hit_dice": "18d8",
      "speed": "30 ft., fly 60 ft.",
      "strength": 18,
      "dexterity": 16,
      "constitution": 18,
      "intelligence": 14,
      "wisdom": 14,
      "charisma": 18,
      "dexterity_save": 7,
      "constitution_save": 8,
      "wisdom_save": 6,
      "charisma_save": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "truesight 120 ft., passive Perception 12",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "12",
      "special_abilities": [
        {
          "name": "Hellish Weapons",
          "desc": "The erinyes's weapon attacks are magical and deal an extra 13 (3d8) poison damage on a hit (included in the attacks).",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The erinyes has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The erinyes makes three attacks",
          "attack_bonus": 0
        },
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage, or 9 (1d10 + 4) slashing damage if used with two hands, plus 13 (3d8) poison damage.",
          "attack_bonus": 8,
          "damage_dice": "1d8 + 3d8",
          "damage_bonus": 4
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +7 to hit, range 150/600 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 13 (3d8) poison damage, and the target must succeed on a DC 14 Constitution saving throw or be poisoned. The poison lasts until it is removed by the lesser restoration spell or similar magic.",
          "attack_bonus": 7,
          "damage_dice": "1d8 + 3d8",
          "damage_bonus": 3
        },
        {
          "name": "Variant: Rope of Entanglement",
          "desc": "Some erinyes carry a rope of entanglement (detailed in the Dungeon Master's Guide). When such an erinyes uses its Multiattack, the erinyes can use the rope in place of two of the attacks.",
          "attack_bonus": 0
        }
      ],
      "reactions": [
        {
          "name": "Parry",
          "desc": "The erinyes adds 4 to its AC against one melee attack that would hit it. To do so, the erinyes must see the attacker and be wielding a melee weapon.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ettercap",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 13,
      "hit_points": 44,
      "hit_dice": "8d8",
      "speed": "30 ft., climb 30 ft.",
      "strength": 14,
      "dexterity": 15,
      "constitution": 13,
      "intelligence": 7,
      "wisdom": 12,
      "charisma": 8,
      "perception": 3,
      "stealth": 4,
      "survival": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Spider Climb",
          "desc": "The ettercap can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Web Sense",
          "desc": "While in contact with a web, the ettercap knows the exact location of any other creature in contact with the same web.",
          "attack_bonus": 0
        },
        {
          "name": "Web Walker",
          "desc": "The ettercap ignores movement restrictions caused by webbing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The ettercap makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 6 (1d8 + 2) piercing damage plus 4 (1d8) poison damage. The target must succeed on a DC 11 Constitution saving throw or be poisoned for 1 minute. The creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "2d4",
          "damage_bonus": 2
        },
        {
          "name": "Web (Recharge 5-6)",
          "desc": "Ranged Weapon Attack: +4 to hit, range 30/60 ft., one Large or smaller creature. Hit: The creature is restrained by webbing. As an action, the restrained creature can make a DC 11 Strength check, escaping from the webbing on a success. The effect ends if the webbing is destroyed. The webbing has AC 10, 5 hit points, is vulnerable to fire damage and immune to bludgeoning damage.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Web Garrote",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one Medium or Small creature against which the ettercap has advantage on the attack roll. Hit: 4 (1d4 + 2) bludgeoning damage, and the target is grappled (escape DC 12). Until this grapple ends, the target can't breathe, and the ettercap has advantage on attack rolls against it.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Ettin",
      "size": "Large",
      "type": "giant",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 12,
      "hit_points": 85,
      "hit_dice": "10d10",
      "speed": "40 ft.",
      "strength": 21,
      "dexterity": 8,
      "constitution": 17,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 8,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Giant, Orc",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Two Heads",
          "desc": "The ettin has advantage on Wisdom (Perception) checks and on saving throws against being blinded, charmed, deafened, frightened, stunned, and knocked unconscious.",
          "attack_bonus": 0
        },
        {
          "name": "Wakeful",
          "desc": "When one of the ettin's heads is asleep, its other head is awake.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The ettin makes two attacks: one with its battleaxe and one with its morningstar.",
          "attack_bonus": 0
        },
        {
          "name": "Battleaxe",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 5
        },
        {
          "name": "Morningstar",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Fire Elemental",
      "size": "Large",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 13,
      "hit_points": 102,
      "hit_dice": "12d10",
      "speed": "50 ft.",
      "strength": 10,
      "dexterity": 17,
      "constitution": 16,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "fire, poison",
      "condition_immunities": "exhaustion, grappled, paralyzed, petrified, poisoned, prone, restrained, unconscious",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Ignan",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Fire Form",
          "desc": "The elemental can move through a space as narrow as 1 inch wide without squeezing. A creature that touches the elemental or hits it with a melee attack while within 5 ft. of it takes 5 (1d10) fire damage. In addition, the elemental can enter a hostile creature's space and stop there. The first time it enters a creature's space on a turn, that creature takes 5 (1d10) fire damage and catches fire; until someone takes an action to douse the fire, the creature takes 5 (1d10) fire damage at the start of each of its turns.",
          "attack_bonus": 0,
          "damage_dice": "5d10"
        },
        {
          "name": "Illumination",
          "desc": "The elemental sheds bright light in a 30-foot radius and dim light in an additional 30 ft..",
          "attack_bonus": 0
        },
        {
          "name": "Water Susceptibility",
          "desc": "For every 5 ft. the elemental moves in water, or for every gallon of water splashed on it, it takes 1 cold damage.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The elemental makes two touch attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Touch",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) fire damage. If the target is a creature or a flammable object, it ignites. Until a creature takes an action to douse the fire, the target takes 5 (1d10) fire damage at the start of each of its turns.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Fire Giant",
      "size": "Huge",
      "type": "giant",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 18,
      "hit_points": 162,
      "hit_dice": "13d12",
      "speed": "30 ft.",
      "strength": 25,
      "dexterity": 9,
      "constitution": 23,
      "intelligence": 10,
      "wisdom": 14,
      "charisma": 13,
      "dexterity_save": 3,
      "constitution_save": 10,
      "charisma_save": 5,
      "athletics": 11,
      "perception": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "passive Perception 16",
      "languages": "Giant",
      "challenge_rating": "9",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The giant makes two greatsword attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greatsword",
          "desc": "Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 28 (6d6 + 7) slashing damage.",
          "attack_bonus": 11,
          "damage_dice": "6d6",
          "damage_bonus": 7
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +11 to hit, range 60/240 ft., one target. Hit: 29 (4d10 + 7) bludgeoning damage.",
          "attack_bonus": 11,
          "damage_dice": "4d10",
          "damage_bonus": 7
        }
      ]
    },
    {
      "name": "Flesh Golem",
      "size": "Medium",
      "type": "construct",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 9,
      "hit_points": 93,
      "hit_dice": "11d8",
      "speed": "30 ft.",
      "strength": 19,
      "dexterity": 9,
      "constitution": 18,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning, poison; bludgeoning, piercing, and slashing from nonmagical weapons that aren't adamantine",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, petrified, poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "understands the languages of its creator but can't speak",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Berserk",
          "desc": "Whenever the golem starts its turn with 40 hit points or fewer, roll a d6. On a 6, the golem goes berserk. On each of its turns while berserk, the golem attacks the nearest creature it can see. If no creature is near enough to move to and attack, the golem attacks an object, with preference for an object smaller than itself. Once the golem goes berserk, it continues to do so until it is destroyed or regains all its hit points.\nThe golem's creator, if within 60 feet of the berserk golem, can try to calm it by speaking firmly and persuasively. The golem must be able to hear its creator, who must take an action to make a DC 15 Charisma (Persuasion) check. If the check succeeds, the golem ceases being berserk. If it takes damage while still at 40 hit points or fewer, the golem might go berserk again.",
          "attack_bonus": 0
        },
        {
          "name": "Aversion of Fire",
          "desc": "If the golem takes fire damage, it has disadvantage on attack rolls and ability checks until the end of its next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Immutable Form",
          "desc": "The golem is immune to any spell or effect that would alter its form.",
          "attack_bonus": 0
        },
        {
          "name": "Lightning Absorption",
          "desc": "Whenever the golem is subjected to lightning damage, it takes no damage and instead regains a number of hit points equal to the lightning damage dealt.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The golem has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The golem's weapon attacks are magical.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The golem makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Flying Snake",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 5,
      "hit_dice": "2d4",
      "speed": "30 ft., fly 60 ft., swim 30 ft.",
      "strength": 4,
      "dexterity": 18,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Flyby",
          "desc": "The snake doesn't provoke opportunity attacks when it flies out of an enemy's reach.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 1 piercing damage plus 7 (3d4) poison damage.",
          "attack_bonus": 6,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Flying Sword",
      "size": "Small",
      "type": "construct",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 17,
      "hit_points": 17,
      "hit_dice": "5d6",
      "speed": "0 ft., fly 50 ft. It can hover.",
      "strength": 12,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 1,
      "wisdom": 5,
      "charisma": 1,
      "dexterity_save": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison, psychic",
      "condition_immunities": "blinded, charmed, deafened, frightened, paralyzed, petrified, poisoned",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 7",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Antimagic Susceptibility",
          "desc": "The sword is incapacitated while in the area of an antimagic field. If targeted by dispel magic, the sword must succeed on a Constitution saving throw against the caster's spell save DC or fall unconscious for 1 minute.",
          "attack_bonus": 0
        },
        {
          "name": "False Appearance",
          "desc": "While the sword remains motionless and isn't flying, it is indistinguishable from a normal sword.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d8",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Frog",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "20 ft., swim 20 ft.",
      "strength": 1,
      "dexterity": 13,
      "constitution": 8,
      "intelligence": 1,
      "wisdom": 8,
      "charisma": 3,
      "perception": 1,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The frog can breathe air and water",
          "attack_bonus": 0
        },
        {
          "name": "Standing Leap",
          "desc": "The frog's long jump is up to 10 ft. and its high jump is up to 5 ft., with or without a running start.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Frost Giant",
      "size": "Huge",
      "type": "giant",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 15,
      "hit_points": 138,
      "hit_dice": "12d12",
      "speed": "40 ft.",
      "strength": 23,
      "dexterity": 9,
      "constitution": 21,
      "intelligence": 9,
      "wisdom": 10,
      "charisma": 12,
      "constitution_save": 8,
      "wisdom_save": 3,
      "charisma_save": 4,
      "athletics": 9,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "Giant",
      "challenge_rating": "8",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The giant makes two greataxe attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greataxe",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 25 (3d12 + 6) slashing damage.",
          "attack_bonus": 9,
          "damage_dice": "3d12",
          "damage_bonus": 6
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +9 to hit, range 60/240 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage.",
          "attack_bonus": 9,
          "damage_dice": "4d10",
          "damage_bonus": 6
        }
      ]
    },
    {
      "name": "Gargoyle",
      "size": "Medium",
      "type": "elemental",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 15,
      "hit_points": 52,
      "hit_dice": "7d8",
      "speed": "30 ft., fly 60 ft.",
      "strength": 15,
      "dexterity": 11,
      "constitution": 16,
      "intelligence": 6,
      "wisdom": 11,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons that aren't adamantine",
      "damage_immunities": "poison",
      "condition_immunities": "exhaustion, petrified, poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Terran",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "False Appearance",
          "desc": "While the gargoyle remains motion less, it is indistinguishable from an inanimate statue.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The gargoyle makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Gelatinous Cube",
      "size": "Large",
      "type": "ooze",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 6,
      "hit_points": 84,
      "hit_dice": "8d10",
      "speed": "15 ft.",
      "strength": 14,
      "dexterity": 3,
      "constitution": 20,
      "intelligence": 1,
      "wisdom": 6,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "blinded, charmed, deafened, exhaustion, frightened, prone",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 8",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Ooze Cube",
          "desc": "The cube takes up its entire space. Other creatures can enter the space, but a creature that does so is subjected to the cube's Engulf and has disadvantage on the saving throw.\nCreatures inside the cube can be seen but have total cover.\nA creature within 5 feet of the cube can take an action to pull a creature or object out of the cube. Doing so requires a successful DC 12 Strength check, and the creature making the attempt takes 10 (3d6) acid damage.\nThe cube can hold only one Large creature or up to four Medium or smaller creatures inside it at a time.",
          "attack_bonus": 0
        },
        {
          "name": "Transparent",
          "desc": "Even when the cube is in plain sight, it takes a successful DC 15 Wisdom (Perception) check to spot a cube that has neither moved nor attacked. A creature that tries to enter the cube's space while unaware of the cube is surprised by the cube.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Pseudopod",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 10 (3d6) acid damage.",
          "attack_bonus": 4,
          "damage_dice": "3d6"
        },
        {
          "name": "Engulf",
          "desc": "The cube moves up to its speed. While doing so, it can enter Large or smaller creatures' spaces. Whenever the cube enters a creature's space, the creature must make a DC 12 Dexterity saving throw.\nOn a successful save, the creature can choose to be pushed 5 feet back or to the side of the cube. A creature that chooses not to be pushed suffers the consequences of a failed saving throw.\nOn a failed save, the cube enters the creature's space, and the creature takes 10 (3d6) acid damage and is engulfed. The engulfed creature can't breathe, is restrained, and takes 21 (6d6) acid damage at the start of each of the cube's turns. When the cube moves, the engulfed creature moves with it.\nAn engulfed creature can try to escape by taking an action to make a DC 12 Strength check. On a success, the creature escapes and enters a space of its choice within 5 feet of the cube.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ghast",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 13,
      "hit_points": 36,
      "hit_dice": "8d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 17,
      "constitution": 10,
      "intelligence": 11,
      "wisdom": 10,
      "charisma": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "necrotic",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Common",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Stench",
          "desc": "Any creature that starts its turn within 5 ft. of the ghast must succeed on a DC 10 Constitution saving throw or be poisoned until the start of its next turn. On a successful saving throw, the creature is immune to the ghast's Stench for 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Turn Defiance",
          "desc": "The ghast and any ghouls within 30 ft. of it have advantage on saving throws against effects that turn undead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 12 (2d8 + 3) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "2d8",
          "damage_bonus": 3
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage. If the target is a creature other than an undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Ghost",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "any alignment",
      "armor_class": 11,
      "hit_points": 45,
      "hit_dice": "10d8",
      "speed": "0 ft., fly 40 ft. It can hover.",
      "strength": 7,
      "dexterity": 13,
      "constitution": 10,
      "intelligence": 10,
      "wisdom": 12,
      "charisma": 17,
      "damage_vulnerabilities": "",
      "damage_resistances": "acid, fire, lightning, thunder; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "cold, necrotic, poison",
      "condition_immunities": "charmed, exhaustion, frightened, grappled, paralyzed, petrified, poisoned, prone, restrained",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "any languages it knew in life",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Ethereal Sight",
          "desc": "The ghost can see 60 ft. into the Ethereal Plane when it is on the Material Plane, and vice versa.",
          "attack_bonus": 0
        },
        {
          "name": "Incorporeal Movement",
          "desc": "The ghost can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Withering Touch",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 17 (4d6 + 3) necrotic damage.",
          "attack_bonus": 5,
          "damage_dice": "4d6",
          "damage_bonus": 3
        },
        {
          "name": "Etherealness",
          "desc": "The ghost enters the Ethereal Plane from the Material Plane, or vice versa. It is visible on the Material Plane while it is in the Border Ethereal, and vice versa, yet it can't affect or be affected by anything on the other plane.",
          "attack_bonus": 0
        },
        {
          "name": "Horrifying Visage",
          "desc": "Each non-undead creature within 60 ft. of the ghost that can see it must succeed on a DC 13 Wisdom saving throw or be frightened for 1 minute. If the save fails by 5 or more, the target also ages 1d4 _ 10 years. A frightened target can repeat the saving throw at the end of each of its turns, ending the frightened condition on itself on a success. If a target's saving throw is successful or the effect ends for it, the target is immune to this ghost's Horrifying Visage for the next 24 hours. The aging effect can be reversed with a greater restoration spell, but only within 24 hours of it occurring.",
          "attack_bonus": 0
        },
        {
          "name": "Possession (Recharge 6)",
          "desc": "One humanoid that the ghost can see within 5 ft. of it must succeed on a DC 13 Charisma saving throw or be possessed by the ghost; the ghost then disappears, and the target is incapacitated and loses control of its body. The ghost now controls the body but doesn't deprive the target of awareness. The ghost can't be targeted by any attack, spell, or other effect, except ones that turn undead, and it retains its alignment, Intelligence, Wisdom, Charisma, and immunity to being charmed and frightened. It otherwise uses the possessed target's statistics, but doesn't gain access to the target's knowledge, class features, or proficiencies.\nThe possession lasts until the body drops to 0 hit points, the ghost ends it as a bonus action, or the ghost is turned or forced out by an effect like the dispel evil and good spell. When the possession ends, the ghost reappears in an unoccupied space within 5 ft. of the body. The target is immune to this ghost's Possession for 24 hours after succeeding on the saving throw or after the possession ends.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ghoul",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "30 ft.",
      "strength": 13,
      "dexterity": 15,
      "constitution": 10,
      "intelligence": 7,
      "wisdom": 10,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Common",
      "challenge_rating": "1",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 9 (2d6 + 2) piercing damage.",
          "attack_bonus": 2,
          "damage_dice": "2d6",
          "damage_bonus": 2
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) slashing damage. If the target is a creature other than an elf or undead, it must succeed on a DC 10 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Giant Ape",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 157,
      "hit_dice": "15d12",
      "speed": "40 ft., climb 40 ft.",
      "strength": 23,
      "dexterity": 14,
      "constitution": 18,
      "intelligence": 7,
      "wisdom": 12,
      "charisma": 7,
      "athletics": 9,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "",
      "challenge_rating": "7",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The ape makes two fist attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Fist",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 22 (3d10 + 6) bludgeoning damage.",
          "attack_bonus": 9,
          "damage_dice": "3d10",
          "damage_bonus": 6
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +9 to hit, range 50/100 ft., one target. Hit: 30 (7d6 + 6) bludgeoning damage.",
          "attack_bonus": 9,
          "damage_dice": "7d6",
          "damage_bonus": 6
        }
      ]
    },
    {
      "name": "Giant Badger",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 13,
      "hit_dice": "2d8",
      "speed": "30 ft., burrow 10 ft.",
      "strength": 13,
      "dexterity": 10,
      "constitution": 15,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The badger has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The badger makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (2d4 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "2d4",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Giant Bat",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 22,
      "hit_dice": "4d10",
      "speed": "10 ft., fly 60 ft.",
      "strength": 15,
      "dexterity": 16,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Echolocation",
          "desc": "The bat can't use its blindsight while deafened.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing",
          "desc": "The bat has advantage on Wisdom (Perception) checks that rely on hearing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Boar",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 42,
      "hit_dice": "5d10",
      "speed": "40 ft.",
      "strength": 17,
      "dexterity": 10,
      "constitution": 16,
      "intelligence": 2,
      "wisdom": 7,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 8",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the boar moves at least 20 ft. straight toward a target and then hits it with a tusk attack on the same turn, the target takes an extra 7 (2d6) slashing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        },
        {
          "name": "Relentless (Recharges after a Short or Long Rest)",
          "desc": "If the boar takes 10 damage or less that would reduce it to 0 hit points, it is reduced to 1 hit point instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Tusk",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Giant Centipede",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 4,
      "hit_dice": "1d6",
      "speed": "30 ft., climb 30 ft.",
      "strength": 5,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Bite",
          "desc": "Bite. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage, and the target must succeed on a DC 11 Constitution saving throw or take 10 (3d6) poison damage. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyzed while poisoned in this way.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Constrictor Snake",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 60,
      "hit_dice": "8d12",
      "speed": "30 ft., swim 30 ft.",
      "strength": 19,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 3,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "2",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one creature. Hit: 11 (2d6 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Constrict",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 13 (2d8 + 4) bludgeoning damage, and the target is grappled (escape DC 16). Until this grapple ends, the creature is restrained, and the snake can't constrict another target.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Giant Crab",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 15,
      "hit_points": 13,
      "hit_dice": "3d8",
      "speed": "30 ft., swim 30 ft.",
      "strength": 13,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 1,
      "wisdom": 9,
      "charisma": 3,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The crab can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage, and the target is grappled (escape DC 11). The crab has two claws, each of which can grapple only one target.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Giant Crocodile",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 85,
      "hit_dice": "9d12",
      "speed": "30 ft., swim 50 ft.",
      "strength": 21,
      "dexterity": 9,
      "constitution": 17,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 7,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Hold Breath",
          "desc": "The crocodile can hold its breath for 30 minutes.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The crocodile makes two attacks: one with its bite and one with its tail.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 21 (3d10 + 5) piercing damage, and the target is grappled (escape DC 16). Until this grapple ends, the target is restrained, and the crocodile can't bite another target.",
          "attack_bonus": 8,
          "damage_dice": "3d10",
          "damage_bonus": 5
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target not grappled by the crocodile. Hit: 14 (2d8 + 5) bludgeoning damage. If the target is a creature, it must succeed on a DC 16 Strength saving throw or be knocked prone.",
          "attack_bonus": 8,
          "damage_dice": "2d8",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Giant Eagle",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "neutral good",
      "armor_class": 13,
      "hit_points": 26,
      "hit_dice": "4d10",
      "speed": "10 ft., fly 80 ft.",
      "strength": 16,
      "dexterity": 17,
      "constitution": 13,
      "intelligence": 8,
      "wisdom": 14,
      "charisma": 10,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "Giant Eagle, understands Common and Auran but can't speak",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Keen Sight",
          "desc": "The eagle has advantage on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The eagle makes two attacks: one with its beak and one with its talons.",
          "attack_bonus": 0
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Giant Elk",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 15,
      "hit_points": 42,
      "hit_dice": "5d12",
      "speed": "60 ft.",
      "strength": 19,
      "dexterity": 16,
      "constitution": 14,
      "intelligence": 7,
      "wisdom": 14,
      "charisma": 10,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "Giant Elk, understands Common, Elvish, and Sylvan but can't speak",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the elk moves at least 20 ft. straight toward a target and then hits it with a ram attack on the same turn, the target takes an extra 7 (2d6) damage. If the target is a creature, it must succeed on a DC 14 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        }
      ],
      "actions": [
        {
          "name": "Ram",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one prone creature. Hit: 22 (4d8 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "4d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Giant Fire Beetle",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 4,
      "hit_dice": "1d6",
      "speed": "30 ft.",
      "strength": 8,
      "dexterity": 10,
      "constitution": 12,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Illumination",
          "desc": "The beetle sheds bright light in a 10-foot radius and dim light for an additional 10 ft..",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 2 (1d6 — 1) slashing damage.",
          "attack_bonus": 1,
          "damage_dice": "1d6",
          "damage_bonus": -1
        }
      ]
    },
    {
      "name": "Giant Frog",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 18,
      "hit_dice": "4d8",
      "speed": "30 ft., swim 30 ft.",
      "strength": 12,
      "dexterity": 13,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 3,
      "perception": 2,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The frog can breathe air and water",
          "attack_bonus": 0
        },
        {
          "name": "Standing Leap",
          "desc": "The frog's long jump is up to 20 ft. and its high jump is up to 10 ft., with or without a running start.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage, and the target is grappled (escape DC 11). Until this grapple ends, the target is restrained, and the frog can't bite another target.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        },
        {
          "name": "Swallow",
          "desc": "The frog makes one bite attack against a Small or smaller target it is grappling. If the attack hits, the target is swallowed, and the grapple ends. The swallowed target is blinded and restrained, it has total cover against attacks and other effects outside the frog, and it takes 5 (2d4) acid damage at the start of each of the frog's turns. The frog can have only one target swallowed at a time. If the frog dies, a swallowed creature is no longer restrained by it and can escape from the corpse using 5 ft. of movement, exiting prone.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Giant Goat",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "40 ft.",
      "strength": 17,
      "dexterity": 11,
      "constitution": 12,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the goat moves at least 20 ft. straight toward a target and then hits it with a ram attack on the same turn, the target takes an extra 5 (2d4) bludgeoning damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d4"
        },
        {
          "name": "Sure-Footed",
          "desc": "The goat has advantage on Strength and Dexterity saving throws made against effects that would knock it prone.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Ram",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (2d4 + 3) bludgeoning damage.",
          "attack_bonus": 5,
          "damage_dice": "2d4",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Giant Hyena",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 45,
      "hit_dice": "6d10",
      "speed": "50 ft.",
      "strength": 16,
      "dexterity": 14,
      "constitution": 14,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Rampage",
          "desc": "When the hyena reduces a creature to 0 hit points with a melee attack on its turn, the hyena can take a bonus action to move up to half its speed and make a bite attack.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Giant Lizard",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "30 ft., climb 30 ft.",
      "strength": 15,
      "dexterity": 12,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Variant: Hold Breath",
          "desc": "The lizard can hold its breath for 15 minutes. (A lizard that has this trait also has a swimming speed of 30 feet.)",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Spider Climb",
          "desc": "The lizard can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Octopus",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 52,
      "hit_dice": "8d10",
      "speed": "10 ft., swim 60 ft.",
      "strength": 17,
      "dexterity": 13,
      "constitution": 13,
      "intelligence": 4,
      "wisdom": 10,
      "charisma": 4,
      "perception": 4,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Hold Breath",
          "desc": "While out of water, the octopus can hold its breath for 1 hour.",
          "attack_bonus": 0
        },
        {
          "name": "Underwater Camouflage",
          "desc": "The octopus has advantage on Dexterity (Stealth) checks made while underwater.",
          "attack_bonus": 0
        },
        {
          "name": "Water Breathing",
          "desc": "The octopus can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Tentacles",
          "desc": "Melee Weapon Attack: +5 to hit, reach 15 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage. If the target is a creature, it is grappled (escape DC 16). Until this grapple ends, the target is restrained, and the octopus can't use its tentacles on another target.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Ink Cloud (Recharges after a Short or Long Rest)",
          "desc": "A 20-foot-radius cloud of ink extends all around the octopus if it is underwater. The area is heavily obscured for 1 minute, although a significant current can disperse the ink. After releasing the ink, the octopus can use the Dash action as a bonus action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Giant Owl",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 12,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "5 ft., fly 60 ft.",
      "strength": 13,
      "dexterity": 15,
      "constitution": 12,
      "intelligence": 8,
      "wisdom": 13,
      "charisma": 10,
      "perception": 5,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 15",
      "languages": "Giant Owl, understands Common, Elvish, and Sylvan but can't speak",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Flyby",
          "desc": "The owl doesn't provoke opportunity attacks when it flies out of an enemy's reach.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing and Sight",
          "desc": "The owl has advantage on Wisdom (Perception) checks that rely on hearing or sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 8 (2d6 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "2d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Giant Poisonous Snake",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "30 ft., swim 30 ft.",
      "strength": 10,
      "dexterity": 18,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 3,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 6 (1d4 + 4) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 6,
          "damage_dice": "1d4",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Giant Rat",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 7,
      "hit_dice": "2d6",
      "speed": "30 ft.",
      "strength": 7,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The rat has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The rat has advantage on an attack roll against a creature if at least one of the rat's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Rat (Diseased)",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 7,
      "hit_dice": "2d6",
      "speed": "30 ft.",
      "strength": 7,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 2) piercing damage. If the target is a creature, it must succeed on a DC 10 Constitution saving throw or contract a disease. Until the disease is cured, the target can't regain hit points except by magical means, and the target's hit point maximum decreases by 3 (1d6) every 24 hours. If the target's hit point maximum drops to 0 as a result of this disease, the target dies.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Scorpion",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 15,
      "hit_points": 52,
      "hit_dice": "7d10",
      "speed": "40 ft.",
      "strength": 15,
      "dexterity": 13,
      "constitution": 15,
      "intelligence": 1,
      "wisdom": 9,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "3",
      "actions": [
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) bludgeoning damage, and the target is grappled (escape DC 12). The scorpion has two claws, each of which can grapple only one target.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        },
        {
          "name": "Multiattack",
          "desc": "The scorpion makes three attacks: two with its claws and one with its sting.",
          "attack_bonus": 0
        },
        {
          "name": "Sting",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target must make a DC 12 Constitution saving throw, taking 22 (4d10) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 4,
          "damage_dice": "1d10",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Sea Horse",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 16,
      "hit_dice": "3d10",
      "speed": "0 ft., swim 40 ft.",
      "strength": 12,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the sea horse moves at least 20 ft. straight toward a target and then hits it with a ram attack on the same turn, the target takes an extra 7 (2d6) bludgeoning damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        },
        {
          "name": "Water Breathing",
          "desc": "The sea horse can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Ram",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Giant Shark",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 126,
      "hit_dice": "11d12",
      "speed": "swim 50 ft.",
      "strength": 23,
      "dexterity": 11,
      "constitution": 21,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 5,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Blood Frenzy",
          "desc": "The shark has advantage on melee attack rolls against any creature that doesn't have all its hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Water Breathing",
          "desc": "The shark can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 22 (3d10 + 6) piercing damage.",
          "attack_bonus": 9,
          "damage_dice": "3d10",
          "damage_bonus": 6
        }
      ]
    },
    {
      "name": "Giant Spider",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 26,
      "hit_dice": "4d10",
      "speed": "30 ft., climb 30 ft.",
      "strength": 14,
      "dexterity": 16,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 11,
      "charisma": 4,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Spider Climb",
          "desc": "The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Web Sense",
          "desc": "While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.",
          "attack_bonus": 0
        },
        {
          "name": "Web Walker",
          "desc": "The spider ignores movement restrictions caused by webbing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 7 (1d8 + 3) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 9 (2d8) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyzed while poisoned in this way.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Web (Recharge 5-6)",
          "desc": "Ranged Weapon Attack: +5 to hit, range 30/60 ft., one creature. Hit: The target is restrained by webbing. As an action, the restrained target can make a DC 12 Strength check, bursting the webbing on a success. The webbing can also be attacked and destroyed (AC 10; hp 5; vulnerability to fire damage; immunity to bludgeoning, poison, and psychic damage).",
          "attack_bonus": 5
        }
      ]
    },
    {
      "name": "Giant Toad",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 39,
      "hit_dice": "6d10",
      "speed": "20 ft., swim 40 ft.",
      "strength": 15,
      "dexterity": 13,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The toad can breathe air and water",
          "attack_bonus": 0
        },
        {
          "name": "Standing Leap",
          "desc": "The toad's long jump is up to 20 ft. and its high jump is up to 10 ft., with or without a running start.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 5 (1d10) poison damage, and the target is grappled (escape DC 13). Until this grapple ends, the target is restrained, and the toad can't bite another target.",
          "attack_bonus": 4,
          "damage_dice": "1d10",
          "damage_bonus": 2
        },
        {
          "name": "Swallow",
          "desc": "The toad makes one bite attack against a Medium or smaller target it is grappling. If the attack hits, the target is swallowed, and the grapple ends. The swallowed target is blinded and restrained, it has total cover against attacks and other effects outside the toad, and it takes 10 (3d6) acid damage at the start of each of the toad's turns. The toad can have only one target swallowed at a time.\nIf the toad dies, a swallowed creature is no longer restrained by it and can escape from the corpse using 5 feet of movement, exiting prone.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Giant Vulture",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 10,
      "hit_points": 22,
      "hit_dice": "3d10",
      "speed": "10 ft., fly 60 ft.",
      "strength": 15,
      "dexterity": 10,
      "constitution": 15,
      "intelligence": 6,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "understands Common but can't speak",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Keen Sight and Smell",
          "desc": "The vulture has advantage on Wisdom (Perception) checks that rely on sight or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The vulture has advantage on an attack roll against a creature if at least one of the vulture's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The vulture makes two attacks: one with its beak and one with its talons.",
          "attack_bonus": 0
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "2d4",
          "damage_bonus": 2
        },
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "2d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Wasp",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 13,
      "hit_dice": "3d8",
      "speed": "10 ft., fly 50 ft., swim 50 ft.",
      "strength": 10,
      "dexterity": 14,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/2",
      "actions": [
        {
          "name": "Sting",
          "desc": "Sting. Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyzed while poisoned in this way.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Giant Weasel",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 9,
      "hit_dice": "2d8",
      "speed": "40 ft.",
      "strength": 11,
      "dexterity": 16,
      "constitution": 10,
      "intelligence": 4,
      "wisdom": 12,
      "charisma": 5,
      "perception": 3,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The weasel has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d4",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Giant Wolf Spider",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "40 ft., climb 40 ft.",
      "strength": 12,
      "dexterity": 16,
      "constitution": 13,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 4,
      "perception": 3,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Spider Climb",
          "desc": "The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Web Sense",
          "desc": "While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.",
          "attack_bonus": 0
        },
        {
          "name": "Web Walker",
          "desc": "The spider ignores movement restrictions caused by webbing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 4 (1d6 + 1) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 7 (2d6) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyzed while poisoned in this way.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Gibbering Mouther",
      "size": "Medium",
      "type": "aberration",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 9,
      "hit_points": 67,
      "hit_dice": "9d8",
      "speed": "10 ft., swim 10 ft.",
      "strength": 10,
      "dexterity": 8,
      "constitution": 16,
      "intelligence": 3,
      "wisdom": 10,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "prone",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Aberrant Ground",
          "desc": "The ground in a 10-foot radius around the mouther is doughlike difficult terrain. Each creature that starts its turn in that area must succeed on a DC 10 Strength saving throw or have its speed reduced to 0 until the start of its next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Gibbering",
          "desc": "The mouther babbles incoherently while it can see any creature and isn't incapacitated. Each creature that starts its turn within 20 feet of the mouther and can hear the gibbering must succeed on a DC 10 Wisdom saving throw. On a failure, the creature can't take reactions until the start of its next turn and rolls a d8 to determine what it does during its turn. On a 1 to 4, the creature does nothing. On a 5 or 6, the creature takes no action or bonus action and uses all its movement to move in a randomly determined direction. On a 7 or 8, the creature makes a melee attack against a randomly determined creature within its reach or does nothing if it can't make such an attack.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The gibbering mouther makes one bite attack and, if it can, uses its Blinding Spittle.",
          "attack_bonus": 0
        },
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 17 (5d6) piercing damage. If the target is Medium or smaller, it must succeed on a DC 10 Strength saving throw or be knocked prone. If the target is killed by this damage, it is absorbed into the mouther.",
          "attack_bonus": 2,
          "damage_dice": "5d6"
        },
        {
          "name": "Blinding Spittle (Recharge 5-6)",
          "desc": "The mouther spits a chemical glob at a point it can see within 15 feet of it. The glob explodes in a blinding flash of light on impact. Each creature within 5 feet of the flash must succeed on a DC 13 Dexterity saving throw or be blinded until the end of the mouther's next turn.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Glabrezu",
      "size": "Large",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 17,
      "hit_points": 157,
      "hit_dice": "15d10",
      "speed": "40 ft.",
      "strength": 20,
      "dexterity": 15,
      "constitution": 21,
      "intelligence": 19,
      "wisdom": 17,
      "charisma": 16,
      "strength_save": 9,
      "constitution_save": 9,
      "wisdom_save": 7,
      "charisma_save": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire, lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "truesight 120 ft., passive Perception 13",
      "languages": "Abyssal, telepathy 120 ft.",
      "challenge_rating": "9",
      "special_abilities": [
        {
          "name": "Innate Spellcasting",
          "desc": "The glabrezu's spellcasting ability is Intelligence (spell save DC 16). The glabrezu can innately cast the following spells, requiring no material components:\nAt will: darkness, detect magic, dispel magic\n1/day each: confusion, fly, power word stun",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The glabrezu has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The glabrezu makes four attacks: two with its pincers and two with its fists. Alternatively, it makes two attacks with its pincers and casts one spell.",
          "attack_bonus": 0
        },
        {
          "name": "Pincer",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 16 (2d10 + 5) bludgeoning damage. If the target is a Medium or smaller creature, it is grappled (escape DC 15). The glabrezu has two pincers, each of which can grapple only one target.",
          "attack_bonus": 9,
          "damage_dice": "2d10",
          "damage_bonus": 5
        },
        {
          "name": "Fist",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) bludgeoning damage.",
          "attack_bonus": 9,
          "damage_dice": "2d4",
          "damage_bonus": 2
        },
        {
          "name": "Variant: Summon Demon (1/Day)",
          "desc": "The demon chooses what to summon and attempts a magical summoning.\nA glabrezu has a 30 percent chance of summoning 1d3 vrocks, 1d2 hezrous, or one glabrezu.\nA summoned demon appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other demons. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Gladiator",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 16,
      "hit_points": 112,
      "hit_dice": "15d8",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 10,
      "wisdom": 12,
      "charisma": 15,
      "strength_save": 7,
      "dexterity_save": 5,
      "constitution_save": 6,
      "athletics": 10,
      "intimidation": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "any one language (usually Common)",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Brave",
          "desc": "The gladiator has advantage on saving throws against being frightened.",
          "attack_bonus": 0
        },
        {
          "name": "Brute",
          "desc": "A melee weapon deals one extra die of its damage when the gladiator hits with it (included in the attack).",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The gladiator makes three melee attacks or two ranged attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Spear",
          "desc": "Melee or Ranged Weapon Attack: +7 to hit, reach 5 ft. and range 20/60 ft., one target. Hit: 11 (2d6 + 4) piercing damage, or 13 (2d8 + 4) piercing damage if used with two hands to make a melee attack.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Shield Bash",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 9 (2d4 + 4) bludgeoning damage. If the target is a Medium or smaller creature, it must succeed on a DC 15 Strength saving throw or be knocked prone.",
          "attack_bonus": 7,
          "damage_dice": "2d4",
          "damage_bonus": 4
        }
      ],
      "reactions": [
        {
          "name": "Parry",
          "desc": "The gladiator adds 3 to its AC against one melee attack that would hit it. To do so, the gladiator must see the attacker and be wielding a melee weapon.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Gnoll",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "gnoll",
      "alignment": "chaotic evil",
      "armor_class": 15,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "30 ft.",
      "strength": 14,
      "dexterity": 12,
      "constitution": 11,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Gnoll",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Rampage",
          "desc": "When the gnoll reduces a creature to 0 hit points with a melee attack on its turn, the gnoll can take a bonus action to move up to half its speed and make a bite attack.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Spear",
          "desc": "Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 5 (1d6 + 2) piercing damage, or 6 (1d8 + 2) piercing damage if used with two hands to make a melee attack.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +3 to hit, range 150/600 ft., one target. Hit: 5 (1d8 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d8",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Goat",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 4,
      "hit_dice": "1d8",
      "speed": "40 ft.",
      "strength": 12,
      "dexterity": 10,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the goat moves at least 20 ft. straight toward a target and then hits it with a ram attack on the same turn, the target takes an extra 2 (1d4) bludgeoning damage. If the target is a creature, it must succeed on a DC 10 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "1d4"
        },
        {
          "name": "Sure-Footed",
          "desc": "The goat has advantage on Strength and Dexterity saving throws made against effects that would knock it prone.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Ram",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) bludgeoning damage.",
          "attack_bonus": 3,
          "damage_dice": "1d4",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Goblin",
      "size": "Small",
      "type": "humanoid",
      "subtype": "goblinoid",
      "alignment": "neutral evil",
      "armor_class": 15,
      "hit_points": 7,
      "hit_dice": "2d6",
      "speed": "30 ft.",
      "strength": 8,
      "dexterity": 14,
      "constitution": 10,
      "intelligence": 10,
      "wisdom": 8,
      "charisma": 8,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "Common, Goblin",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Nimble Escape",
          "desc": "The goblin can take the Disengage or Hide action as a bonus action on each of its turns.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Scimitar",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Shortbow",
          "desc": "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Gold Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 17,
      "hit_points": 60,
      "hit_dice": "8d8",
      "speed": "30 ft., fly 60 ft., swim 30 ft.",
      "strength": 19,
      "dexterity": 14,
      "constitution": 17,
      "intelligence": 14,
      "wisdom": 11,
      "charisma": 16,
      "dexterity_save": 4,
      "constitution_save": 5,
      "wisdom_save": 2,
      "charisma_save": 5,
      "perception": 4,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (1d10 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d10",
          "damage_bonus": 4
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nFire Breath. The dragon exhales fire in a 15-foot cone. Each creature in that area must make a DC 13 Dexterity saving throw, taking 22 (4d10) fire damage on a failed save, or half as much damage on a successful one.\nWeakening Breath. The dragon exhales gas in a 15-foot cone. Each creature in that area must succeed on a DC 13 Strength saving throw or have disadvantage on Strength-based attack rolls, Strength checks, and Strength saving throws for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "4d10"
        }
      ]
    },
    {
      "name": "Gorgon",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 19,
      "hit_points": 114,
      "hit_dice": "12d10",
      "speed": "40 ft.",
      "strength": 20,
      "dexterity": 11,
      "constitution": 18,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 7,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "petrified",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Trampling Charge",
          "desc": "If the gorgon moves at least 20 feet straight toward a creature and then hits it with a gore attack on the same turn, that target must succeed on a DC 16 Strength saving throw or be knocked prone. If the target is prone, the gorgon can make one attack with its hooves against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Gore",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 18 (2d12 + 5) piercing damage.",
          "attack_bonus": 8,
          "damage_dice": "2d12",
          "damage_bonus": 5
        },
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 16 (2d10 + 5) bludgeoning damage.",
          "attack_bonus": 8,
          "damage_dice": "2d10",
          "damage_bonus": 5
        },
        {
          "name": "Petrifying Breath (Recharge 5-6)",
          "desc": "The gorgon exhales petrifying gas in a 30-foot cone. Each creature in that area must succeed on a DC 13 Constitution saving throw. On a failed save, a target begins to turn to stone and is restrained. The restrained target must repeat the saving throw at the end of its next turn. On a success, the effect ends on the target. On a failure, the target is petrified until freed by the greater restoration spell or other magic.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Gray Ooze",
      "size": "Medium",
      "type": "ooze",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 8,
      "hit_points": 22,
      "hit_dice": "3d8",
      "speed": "10 ft., climb 10 ft.",
      "strength": 12,
      "dexterity": 6,
      "constitution": 16,
      "intelligence": 1,
      "wisdom": 6,
      "charisma": 2,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "acid, cold, fire",
      "damage_immunities": "",
      "condition_immunities": "blinded, charmed, deafened, exhaustion, frightened, prone",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 8",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Amorphous",
          "desc": "The ooze can move through a space as narrow as 1 inch wide without squeezing.",
          "attack_bonus": 0
        },
        {
          "name": "Corrode Metal",
          "desc": "Any nonmagical weapon made of metal that hits the ooze corrodes. After dealing damage, the weapon takes a permanent and cumulative -1 penalty to damage rolls. If its penalty drops to -5, the weapon is destroyed. Nonmagical ammunition made of metal that hits the ooze is destroyed after dealing damage.\nThe ooze can eat through 2-inch-thick, nonmagical metal in 1 round.",
          "attack_bonus": 0
        },
        {
          "name": "False Appearance",
          "desc": "While the ooze remains motionless, it is indistinguishable from an oily pool or wet rock.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Pseudopod",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage plus 7 (2d6) acid damage, and if the target is wearing nonmagical metal armor, its armor is partly corroded and takes a permanent and cumulative -1 penalty to the AC it offers. The armor is destroyed if the penalty reduces its AC to 10.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Green Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 17,
      "hit_points": 38,
      "hit_dice": "7d8",
      "speed": "30 ft., fly 60 ft., swim 30 ft.",
      "strength": 15,
      "dexterity": 12,
      "constitution": 13,
      "intelligence": 14,
      "wisdom": 11,
      "charisma": 13,
      "dexterity_save": 3,
      "constitution_save": 3,
      "wisdom_save": 2,
      "charisma_save": 3,
      "perception": 4,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 3 (1d6) poison damage.",
          "attack_bonus": 4,
          "damage_dice": "1d10 + 1d6",
          "damage_bonus": 3
        },
        {
          "name": "Poison Breath (Recharge 5-6)",
          "desc": "The dragon exhales poisonous gas in a 15-foot cone. Each creature in that area must make a DC 11 Constitution saving throw, taking 21 (6d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "6d6"
        }
      ]
    },
    {
      "name": "Green Hag",
      "size": "Medium",
      "type": "fey",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 17,
      "hit_points": 82,
      "hit_dice": "11d8",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 12,
      "constitution": 16,
      "intelligence": 13,
      "wisdom": 14,
      "charisma": 14,
      "arcana": 3,
      "deception": 4,
      "perception": 4,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Common, Draconic, Sylvan",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The hag can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The hag's innate spellcasting ability is Charisma (spell save DC 12). She can innately cast the following spells, requiring no material components:\n\nAt will: dancing lights, minor illusion, vicious mockery",
          "attack_bonus": 0
        },
        {
          "name": "Mimicry",
          "desc": "The hag can mimic animal sounds and humanoid voices. A creature that hears the sounds can tell they are imitations with a successful DC 14 Wisdom (Insight) check.",
          "attack_bonus": 0
        },
        {
          "name": "Hag Coven",
          "desc": "When hags must work together, they form covens, in spite of their selfish natures. A coven is made up of hags of any type, all of whom are equals within the group. However, each of the hags continues to desire more personal power.\nA coven consists of three hags so that any arguments between two hags can be settled by the third. If more than three hags ever come together, as might happen if two covens come into conflict, the result is usually chaos.",
          "attack_bonus": 0
        },
        {
          "name": "Shared Spellcasting (Coven Only)",
          "desc": "While all three members of a hag coven are within 30 feet of one another, they can each cast the following spells from the wizard's spell list but must share the spell slots among themselves:\n\n• 1st level (4 slots): identify, ray of sickness\n• 2nd level (3 slots): hold person, locate object\n• 3rd level (3 slots): bestow curse, counterspell, lightning bolt\n• 4th level (3 slots): phantasmal killer, polymorph\n• 5th level (2 slots): contact other plane, scrying\n• 6th level (1 slot): eye bite\n\nFor casting these spells, each hag is a 12th-level spellcaster that uses Intelligence as her spellcasting ability. The spell save DC is 12+the hag's Intelligence modifier, and the spell attack bonus is 4+the hag's Intelligence modifier.",
          "attack_bonus": 0
        },
        {
          "name": "Hag Eye (Coven Only)",
          "desc": "A hag coven can craft a magic item called a hag eye, which is made from a real eye coated in varnish and often fitted to a pendant or other wearable item. The hag eye is usually entrusted to a minion for safekeeping and transport. A hag in the coven can take an action to see what the hag eye sees if the hag eye is on the same plane of existence. A hag eye has AC 10, 1 hit point, and darkvision with a radius of 60 feet. If it is destroyed, each coven member takes 3d10 psychic damage and is blinded for 24 hours.\nA hag coven can have only one hag eye at a time, and creating a new one requires all three members of the coven to perform a ritual. The ritual takes 1 hour, and the hags can't perform it while blinded. During the ritual, if the hags take any action other than performing the ritual, they must start over.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Illusory Appearance",
          "desc": "The hag covers herself and anything she is wearing or carrying with a magical illusion that makes her look like another creature of her general size and humanoid shape. The illusion ends if the hag takes a bonus action to end it or if she dies.\nThe changes wrought by this effect fail to hold up to physical inspection. For example, the hag could appear to have smooth skin, but someone touching her would feel her rough flesh. Otherwise, a creature must take an action to visually inspect the illusion and succeed on a DC 20 Intelligence (Investigation) check to discern that the hag is disguised.",
          "attack_bonus": 0
        },
        {
          "name": "Invisible Passage",
          "desc": "The hag magically turns invisible until she attacks or casts a spell, or until her concentration ends (as if concentrating on a spell). While invisible, she leaves no physical evidence of her passage, so she can be tracked only by magic. Any equipment she wears or carries is invisible with her.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Grick",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 14,
      "hit_points": 27,
      "hit_dice": "6d8",
      "speed": "30 ft., climb 30 ft.",
      "strength": 14,
      "dexterity": 14,
      "constitution": 11,
      "intelligence": 3,
      "wisdom": 14,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, and slashing damage from nonmagical weapons",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Stone Camouflage",
          "desc": "The grick has advantage on Dexterity (Stealth) checks made to hide in rocky terrain.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The grick makes one attack with its tentacles. If that attack hits, the grick can make one beak attack against the same target.",
          "attack_bonus": 0
        },
        {
          "name": "Tentacles",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "2d6",
          "damage_bonus": 2
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Griffon",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 59,
      "hit_dice": "7d10",
      "speed": "30 ft., fly 80 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 2,
      "wisdom": 13,
      "charisma": 8,
      "perception": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 15",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Keen Sight",
          "desc": "The griffon has advantage on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The griffon makes two attacks: one with its beak and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Grimlock",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "grimlock",
      "alignment": "neutral evil",
      "armor_class": 11,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 12,
      "constitution": 12,
      "intelligence": 9,
      "wisdom": 8,
      "charisma": 6,
      "athletics": 5,
      "perception": 3,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "blinded",
      "condition_immunities": "",
      "senses": "blindsight 30 ft. or 10 ft. while deafened (blind beyond this radius), passive Perception 13",
      "languages": "Undercommon",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Blind Senses",
          "desc": "The grimlock can't use its blindsight while deafened and unable to smell.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing and Smell",
          "desc": "The grimlock has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Stone Camouflage",
          "desc": "The grimlock has advantage on Dexterity (Stealth) checks made to hide in rocky terrain.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Spiked Bone Club",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) bludgeoning damage plus 2 (1d4) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d4 + 1d4",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Guard",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 16,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 13,
      "dexterity": 12,
      "constitution": 12,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 10,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Spear",
          "desc": "Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Guardian Naga",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 18,
      "hit_points": 127,
      "hit_dice": "15d10",
      "speed": "40 ft.",
      "strength": 19,
      "dexterity": 18,
      "constitution": 16,
      "intelligence": 16,
      "wisdom": 19,
      "charisma": 18,
      "dexterity_save": 8,
      "constitution_save": 7,
      "intelligence_save": 7,
      "wisdom_save": 8,
      "charisma_save": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "charmed, poisoned",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Celestial, Common",
      "challenge_rating": "10",
      "special_abilities": [
        {
          "name": "Rejuvenation",
          "desc": "If it dies, the naga returns to life in 1d6 days and regains all its hit points. Only a wish spell can prevent this trait from functioning.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The naga is an 11th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 16, +8 to hit with spell attacks), and it needs only verbal components to cast its spells. It has the following cleric spells prepared:\n\n• Cantrips (at will): mending, sacred flame, thaumaturgy\n• 1st level (4 slots): command, cure wounds, shield of faith\n• 2nd level (3 slots): calm emotions, hold person\n• 3rd level (3 slots): bestow curse, clairvoyance\n• 4th level (3 slots): banishment, freedom of movement\n• 5th level (2 slots): flame strike, geas\n• 6th level (1 slot): true seeing",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one creature. Hit: 8 (1d8 + 4) piercing damage, and the target must make a DC 15 Constitution saving throw, taking 45 (10d8) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 8,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Spit Poison",
          "desc": "Ranged Weapon Attack: +8 to hit, range 15/30 ft., one creature. Hit: The target must make a DC 15 Constitution saving throw, taking 45 (10d8) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 8,
          "damage_dice": "10d8"
        }
      ]
    },
    {
      "name": "Gynosphinx",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "lawful neutral",
      "armor_class": 17,
      "hit_points": 136,
      "hit_dice": "16d10",
      "speed": "40 ft., fly 60 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 18,
      "wisdom": 18,
      "charisma": 18,
      "arcana": 12,
      "history": 12,
      "perception": 8,
      "religion": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "psychic",
      "condition_immunities": "charmed, frightened",
      "senses": "truesight 120 ft., passive Perception 18",
      "languages": "Common, Sphinx",
      "challenge_rating": "11",
      "special_abilities": [
        {
          "name": "Inscrutable",
          "desc": "The sphinx is immune to any effect that would sense its emotions or read its thoughts, as well as any divination spell that it refuses. Wisdom (Insight) checks made to ascertain the sphinx's intentions or sincerity have disadvantage.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The sphinx's weapon attacks are magical.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The sphinx is a 9th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 16, +8 to hit with spell attacks). It requires no material components to cast its spells. The sphinx has the following wizard spells prepared:\n\n• Cantrips (at will): mage hand, minor illusion, prestidigitation\n• 1st level (4 slots): detect magic, identify, shield\n• 2nd level (3 slots): darkness, locate object, suggestion\n• 3rd level (3 slots): dispel magic, remove curse, tongues\n• 4th level (3 slots): banishment, greater invisibility\n• 5th level (1 slot): legend lore",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The sphinx makes two claw attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.",
          "attack_bonus": 9,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ],
      "legendary_actions": [
        {
          "name": "Claw Attack",
          "desc": "The sphinx makes one claw attack.",
          "attack_bonus": 0
        },
        {
          "name": "Teleport (Costs 2 Actions)",
          "desc": "The sphinx magically teleports, along with any equipment it is wearing or carrying, up to 120 feet to an unoccupied space it can see.",
          "attack_bonus": 0
        },
        {
          "name": "Cast a Spell (Costs 3 Actions)",
          "desc": "The sphinx casts a spell from its list of prepared spells, using a spell slot as normal.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Half-Red Dragon Veteran",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "human",
      "alignment": "any alignment",
      "armor_class": 18,
      "hit_points": 65,
      "hit_dice": "10d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 13,
      "constitution": 14,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "fire",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 12",
      "languages": "Common, Draconic",
      "challenge_rating": "5",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The veteran makes two longsword attacks. If it has a shortsword drawn, it can also make a shortsword attack.",
          "attack_bonus": 0
        },
        {
          "name": "Longsword",
          "desc": "Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage, or 8 (1d10 + 3) slashing damage if used with two hands.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Heavy Crossbow",
          "desc": "Ranged Weapon Attack: +3 to hit, range 100/400 ft., one target. Hit: 6 (1d10 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d10",
          "damage_bonus": 1
        },
        {
          "name": "Fire Breath (Recharge 5-6)",
          "desc": "The veteran exhales fire in a 15-foot cone. Each creature in that area must make a DC 15 Dexterity saving throw, taking 24 (7d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "7d6"
        }
      ]
    },
    {
      "name": "Harpy",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 11,
      "hit_points": 38,
      "hit_dice": "7d8",
      "speed": "20 ft., fly 40 ft.",
      "strength": 12,
      "dexterity": 13,
      "constitution": 12,
      "intelligence": 7,
      "wisdom": 10,
      "charisma": 13,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "Common",
      "challenge_rating": "1",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The harpy makes two attacks: one with its claws and one with its club.",
          "attack_bonus": 0
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (2d4 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "2d4",
          "damage_bonus": 1
        },
        {
          "name": "Club",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) bludgeoning damage.",
          "attack_bonus": 3,
          "damage_dice": "1d4",
          "damage_bonus": 1
        },
        {
          "name": "Luring Song",
          "desc": "The harpy sings a magical melody. Every humanoid and giant within 300 ft. of the harpy that can hear the song must succeed on a DC 11 Wisdom saving throw or be charmed until the song ends. The harpy must take a bonus action on its subsequent turns to continue singing. It can stop singing at any time. The song ends if the harpy is incapacitated.\nWhile charmed by the harpy, a target is incapacitated and ignores the songs of other harpies. If the charmed target is more than 5 ft. away from the harpy, the must move on its turn toward the harpy by the most direct route. It doesn't avoid opportunity attacks, but before moving into damaging terrain, such as lava or a pit, and whenever it takes damage from a source other than the harpy, a target can repeat the saving throw. A creature can also repeat the saving throw at the end of each of its turns. If a creature's saving throw is successful, the effect ends on it.\nA target that successfully saves is immune to this harpy's song for the next 24 hours.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Hawk",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "10 ft., fly 60 ft.",
      "strength": 5,
      "dexterity": 16,
      "constitution": 8,
      "intelligence": 2,
      "wisdom": 14,
      "charisma": 6,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Sight",
          "desc": "The hawk has advantage on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1 slashing damage.",
          "attack_bonus": 5,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Hell Hound",
      "size": "Medium",
      "type": "fiend",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 15,
      "hit_points": 45,
      "hit_dice": "7d8",
      "speed": "50 ft.",
      "strength": 17,
      "dexterity": 12,
      "constitution": 14,
      "intelligence": 6,
      "wisdom": 13,
      "charisma": 6,
      "perception": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 15",
      "languages": "understands Infernal but can't speak it",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The hound has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The hound has advantage on an attack roll against a creature if at least one of the hound's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 7 (2d6) fire damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Fire Breath (Recharge 5-6)",
          "desc": "The hound exhales fire in a 15-foot cone. Each creature in that area must make a DC 12 Dexterity saving throw, taking 21 (6d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "6d6"
        }
      ]
    },
    {
      "name": "Hezrou",
      "size": "Large",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 16,
      "hit_points": 136,
      "hit_dice": "13d10",
      "speed": "30 ft.",
      "strength": 19,
      "dexterity": 17,
      "constitution": 20,
      "intelligence": 5,
      "wisdom": 12,
      "charisma": 13,
      "strength_save": 7,
      "constitution_save": 8,
      "wisdom_save": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire, lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 11",
      "languages": "Abyssal, telepathy 120 ft.",
      "challenge_rating": "8",
      "special_abilities": [
        {
          "name": "Magic Resistance",
          "desc": "The hezrou has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Stench",
          "desc": "Any creature that starts its turn within 10 feet of the hezrou must succeed on a DC 14 Constitution saving throw or be poisoned until the start of its next turn. On a successful saving throw, the creature is immune to the hezrou's stench for 24 hours.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The hezrou makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 15 (2d10 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d10",
          "damage_bonus": 4
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Variant: Summon Demon (1/Day)",
          "desc": "The demon chooses what to summon and attempts a magical summoning.\nA hezrou has a 30 percent chance of summoning 2d6 dretches or one hezrou.\nA summoned demon appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other demons. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Hill Giant",
      "size": "Huge",
      "type": "giant",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 13,
      "hit_points": 105,
      "hit_dice": "10d12",
      "speed": "40 ft.",
      "strength": 21,
      "dexterity": 8,
      "constitution": 19,
      "intelligence": 5,
      "wisdom": 9,
      "charisma": 6,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "Giant",
      "challenge_rating": "5",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The giant makes two greatclub attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greatclub",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 18 (3d8 + 5) bludgeoning damage.",
          "attack_bonus": 8,
          "damage_dice": "3d8",
          "damage_bonus": 5
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +8 to hit, range 60/240 ft., one target. Hit: 21 (3d10 + 5) bludgeoning damage.",
          "attack_bonus": 8,
          "damage_dice": "3d10",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Hippogriff",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "40 ft, fly 60 ft.",
      "strength": 17,
      "dexterity": 13,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 8,
      "perception": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 15",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Keen Sight",
          "desc": "The hippogriff has advantage on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The hippogriff makes two attacks: one with its beak and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d10",
          "damage_bonus": 3
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Hobgoblin",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "goblinoid",
      "alignment": "lawful evil",
      "armor_class": 18,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 13,
      "dexterity": 12,
      "constitution": 12,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Common, Goblin",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Martial Advantage",
          "desc": "Once per turn, the hobgoblin can deal an extra 7 (2d6) damage to a creature it hits with a weapon attack if that creature is within 5 ft. of an ally of the hobgoblin that isn't incapacitated.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        }
      ],
      "actions": [
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) slashing damage, or 6 (1d10 + 1) slashing damage if used with two hands.",
          "attack_bonus": 3,
          "damage_dice": "1d8",
          "damage_bonus": 1
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +3 to hit, range 150/600 ft., one target. Hit: 5 (1d8 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d8",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Homunculus",
      "size": "Tiny",
      "type": "construct",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 13,
      "hit_points": 5,
      "hit_dice": "2d4",
      "speed": "20 ft., fly 40 ft.",
      "strength": 4,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "charmed, poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "understands the languages of its creator but can't speak",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Telepathic Bond",
          "desc": "While the homunculus is on the same plane of existence as its master, it can magically convey what it senses to its master, and the two can communicate telepathically.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 1 piercing damage, and the target must succeed on a DC 10 Constitution saving throw or be poisoned for 1 minute. If the saving throw fails by 5 or more, the target is instead poisoned for 5 (1d10) minutes and unconscious while poisoned in this way.",
          "attack_bonus": 4,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Horned Devil",
      "size": "Large",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 18,
      "hit_points": 148,
      "hit_dice": "17d10",
      "speed": "20 ft., fly 60 ft.",
      "strength": 22,
      "dexterity": 17,
      "constitution": 21,
      "intelligence": 12,
      "wisdom": 16,
      "charisma": 17,
      "strength_save": 10,
      "dexterity_save": 7,
      "wisdom_save": 7,
      "charisma_save": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 13",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "11",
      "special_abilities": [
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the devil's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The devil has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The devil makes three melee attacks: two with its fork and one with its tail. It can use Hurl Flame in place of any melee attack.",
          "attack_bonus": 0
        },
        {
          "name": "Fork",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 15 (2d8 + 6) piercing damage.",
          "attack_bonus": 10,
          "damage_dice": "2d8",
          "damage_bonus": 6
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 10 (1d8 + 6) piercing damage. If the target is a creature other than an undead or a construct, it must succeed on a DC 17 Constitution saving throw or lose 10 (3d6) hit points at the start of each of its turns due to an infernal wound. Each time the devil hits the wounded target with this attack, the damage dealt by the wound increases by 10 (3d6). Any creature can take an action to stanch the wound with a successful DC 12 Wisdom (Medicine) check. The wound also closes if the target receives magical healing.",
          "attack_bonus": 10,
          "damage_dice": "1d8",
          "damage_bonus": 6
        },
        {
          "name": "Hurl Flame",
          "desc": "Ranged Spell Attack: +7 to hit, range 150 ft., one target. Hit: 14 (4d6) fire damage. If the target is a flammable object that isn't being worn or carried, it also catches fire.",
          "attack_bonus": 7,
          "damage_dice": "4d6"
        }
      ]
    },
    {
      "name": "Hunter Shark",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 45,
      "hit_dice": "6d10",
      "speed": "swim 40 ft.",
      "strength": 18,
      "dexterity": 13,
      "constitution": 15,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 4,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Blood Frenzy",
          "desc": "The shark has advantage on melee attack rolls against any creature that doesn't have all its hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Water Breathing",
          "desc": "The shark can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Hydra",
      "size": "Huge",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 15,
      "hit_points": 172,
      "hit_dice": "15d12",
      "speed": "30 ft., swim 30 ft.",
      "strength": 20,
      "dexterity": 12,
      "constitution": 20,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 7,
      "perception": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 16",
      "languages": "",
      "challenge_rating": "8",
      "special_abilities": [
        {
          "name": "Hold Breath",
          "desc": "The hydra can hold its breath for 1 hour.",
          "attack_bonus": 0
        },
        {
          "name": "Multiple Heads",
          "desc": "The hydra has five heads. While it has more than one head, the hydra has advantage on saving throws against being blinded, charmed, deafened, frightened, stunned, and knocked unconscious.\nWhenever the hydra takes 25 or more damage in a single turn, one of its heads dies. If all its heads die, the hydra dies.\nAt the end of its turn, it grows two heads for each of its heads that died since its last turn, unless it has taken fire damage since its last turn. The hydra regains 10 hit points for each head regrown in this way.",
          "attack_bonus": 0
        },
        {
          "name": "Reactive Heads",
          "desc": "For each head the hydra has beyond one, it gets an extra reaction that can be used only for opportunity attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Wakeful",
          "desc": "While the hydra sleeps, at least one of its heads is awake.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The hydra makes as many bite attacks as it has heads.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 10 (1d10 + 5) piercing damage.",
          "attack_bonus": 8,
          "damage_dice": "1d10",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Hyena",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 5,
      "hit_dice": "1d8",
      "speed": "50 ft.",
      "strength": 11,
      "dexterity": 13,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 5,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Pack Tactics",
          "desc": "The hyena has advantage on an attack roll against a creature if at least one of the hyena's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 3 (1d6) piercing damage.",
          "attack_bonus": 2,
          "damage_dice": "1d6"
        }
      ]
    },
    {
      "name": "Ice Devil",
      "size": "Large",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 18,
      "hit_points": 180,
      "hit_dice": "19d10",
      "speed": "40 ft.",
      "strength": 21,
      "dexterity": 14,
      "constitution": 18,
      "intelligence": 18,
      "wisdom": 15,
      "charisma": 18,
      "dexterity_save": 7,
      "constitution_save": 9,
      "wisdom_save": 7,
      "charisma_save": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "blindsight 60 ft., darkvision 120 ft., passive Perception 12",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "14",
      "special_abilities": [
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the devil's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The devil has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The devil makes three attacks: one with its bite, one with its claws, and one with its tail.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) piercing damage plus 10 (3d6) cold damage.",
          "attack_bonus": 10,
          "damage_dice": "2d6 + 3d6",
          "damage_bonus": 5
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 10 (2d4 + 5) slashing damage plus 10 (3d6) cold damage.",
          "attack_bonus": 10,
          "damage_dice": "2d4 + 3d6",
          "damage_bonus": 5
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack:+10 to hit, reach 10 ft., one target. Hit: 12 (2d6 + 5) bludgeoning damage plus 10 (3d6) cold damage.",
          "attack_bonus": 10,
          "damage_dice": "2d6 + 3d6",
          "damage_bonus": 5
        },
        {
          "name": "Wall of Ice",
          "desc": "The devil magically forms an opaque wall of ice on a solid surface it can see within 60 feet of it. The wall is 1 foot thick and up to 30 feet long and 10 feet high, or it's a hemispherical dome up to 20 feet in diameter.\nWhen the wall appears, each creature in its space is pushed out of it by the shortest route. The creature chooses which side of the wall to end up on, unless the creature is incapacitated. The creature then makes a DC 17 Dexterity saving throw, taking 35 (10d6) cold damage on a failed save, or half as much damage on a successful one.\nThe wall lasts for 1 minute or until the devil is incapacitated or dies. The wall can be damaged and breached; each 10-foot section has AC 5, 30 hit points, vulnerability to fire damage, and immunity to acid, cold, necrotic, poison, and psychic damage. If a section is destroyed, it leaves behind a sheet of frigid air in the space the wall occupied. Whenever a creature finishes moving through the frigid air on a turn, willingly or otherwise, the creature must make a DC 17 Constitution saving throw, taking 17 (5d6) cold damage on a failed save, or half as much damage on a successful one. The frigid air dissipates when the rest of the wall vanishes.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ice Mephit",
      "size": "Small",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 11,
      "hit_points": 21,
      "hit_dice": "6d6",
      "speed": "30 ft., fly 30 ft.",
      "strength": 7,
      "dexterity": 13,
      "constitution": 10,
      "intelligence": 9,
      "wisdom": 11,
      "charisma": 12,
      "perception": 2,
      "stealth": 3,
      "damage_vulnerabilities": "bludgeoning, fire",
      "damage_resistances": "",
      "damage_immunities": "cold, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 12",
      "languages": "Aquan, Auran",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Death Burst",
          "desc": "When the mephit dies, it explodes in a burst of jagged ice. Each creature within 5 ft. of it must make a DC 10 Dexterity saving throw, taking 4 (1d8) slashing damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "1d8"
        },
        {
          "name": "False Appearance",
          "desc": "While the mephit remains motionless, it is indistinguishable from an ordinary shard of ice.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting (1/Day)",
          "desc": "The mephit can innately cast fog cloud, requiring no material components. Its innate spellcasting ability is Charisma.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one creature. Hit: 3 (1d4 + 1) slashing damage plus 2 (1d4) cold damage.",
          "attack_bonus": 3,
          "damage_dice": "1d4",
          "damage_bonus": 1
        },
        {
          "name": "Frost Breath (Recharge 6)",
          "desc": "The mephit exhales a 15-foot cone of cold air. Each creature in that area must succeed on a DC 10 Dexterity saving throw, taking 5 (2d4) cold damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Mephits (1/Day)",
          "desc": "The mephit has a 25 percent chance of summoning 1d4 mephits of its kind. A summoned mephit appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other mephits. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Imp",
      "size": "Tiny",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 13,
      "hit_points": 10,
      "hit_dice": "3d4",
      "speed": "20 ft., fly 40 ft.",
      "strength": 6,
      "dexterity": 17,
      "constitution": 13,
      "intelligence": 11,
      "wisdom": 12,
      "charisma": 14,
      "deception": 4,
      "insight": 3,
      "persuasion": 4,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical/nonsilver weapons",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 11",
      "languages": "Infernal, Common",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The imp can use its action to polymorph into a beast form that resembles a rat (speed 20 ft.), a raven (20 ft., fly 60 ft.), or a spider (20 ft., climb 20 ft.), or back into its true form. Its statistics are the same in each form, except for the speed changes noted. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the imp's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The imp has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Familiar",
          "desc": "The imp can serve another creature as a familiar, forming a telepathic bond with its willing master. While the two are bonded, the master can sense what the quasit senses as long as they are within 1 mile of each other. While the imp is within 10 feet of its master, the master shares the quasit's Magic Resistance trait. At any time and for any reason, the imp can end its service as a familiar, ending the telepathic bond.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Sting (Bite in Beast Form)",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft ., one target. Hit: 5 (1d4 + 3) piercing damage, and the target must make on a DC 11 Constitution saving throw, taking 10 (3d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 5,
          "damage_dice": "1d4",
          "damage_bonus": 3
        },
        {
          "name": "Invisibility",
          "desc": "The imp magically turns invisible until it attacks, or until its concentration ends (as if concentrating on a spell). Any equipment the imp wears or carries is invisible with it.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Invisible Stalker",
      "size": "Medium",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 14,
      "hit_points": 104,
      "hit_dice": "16d8",
      "speed": "50 ft., fly 50 ft. (hover)",
      "strength": 16,
      "dexterity": 19,
      "constitution": 14,
      "intelligence": 10,
      "wisdom": 15,
      "charisma": 11,
      "perception": 8,
      "stealth": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "exhaustion, grappled, paralyzed, petrified, poisoned, prone, restrained, unconscious",
      "senses": "darkvision 60 ft., passive Perception 18",
      "languages": "Auran, understands Common but doesn't speak it",
      "challenge_rating": "6",
      "special_abilities": [
        {
          "name": "Invisibility",
          "desc": "The stalker is invisible.",
          "attack_bonus": 0
        },
        {
          "name": "Faultless Tracker",
          "desc": "The stalker is given a quarry by its summoner. The stalker knows the direction and distance to its quarry as long as the two of them are on the same plane of existence. The stalker also knows the location of its summoner.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The stalker makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Iron Golem",
      "size": "Large",
      "type": "construct",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 20,
      "hit_points": 210,
      "hit_dice": "20d10",
      "speed": "30 ft.",
      "strength": 24,
      "dexterity": 9,
      "constitution": 20,
      "intelligence": 3,
      "wisdom": 11,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire, poison, psychic; bludgeoning, piercing, and slashing from nonmagical weapons that aren't adamantine",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, petrified, poisoned",
      "senses": "darkvision 120 ft., passive Perception 10",
      "languages": "understands the languages of its creator but can't speak",
      "challenge_rating": "16",
      "special_abilities": [
        {
          "name": "Fire Absorption",
          "desc": "Whenever the golem is subjected to fire damage, it takes no damage and instead regains a number of hit points equal to the fire damage dealt.",
          "attack_bonus": 0
        },
        {
          "name": "Immutable Form",
          "desc": "The golem is immune to any spell or effect that would alter its form.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The golem has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The golem's weapon attacks are magical.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The golem makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +13 to hit, reach 5 ft., one target. Hit: 20 (3d8 + 7) bludgeoning damage.",
          "attack_bonus": 13,
          "damage_dice": "3d8",
          "damage_bonus": 7
        },
        {
          "name": "Sword",
          "desc": "Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 23 (3d10 + 7) slashing damage.",
          "attack_bonus": 13,
          "damage_dice": "3d10",
          "damage_bonus": 7
        },
        {
          "name": "Poison Breath (Recharge 5-6)",
          "desc": "The golem exhales poisonous gas in a 15-foot cone. Each creature in that area must make a DC 19 Constitution saving throw, taking 45 (l0d8) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "10d8"
        }
      ]
    },
    {
      "name": "Jackal",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 3,
      "hit_dice": "1d6",
      "speed": "40 ft.",
      "strength": 8,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 6,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The jackal has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The jackal has advantage on an attack roll against a creature if at least one of the jackal's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +1 to hit, reach 5 ft., one target. Hit: 1 (1d4 — 1) piercing damage.",
          "attack_bonus": 1,
          "damage_dice": "1d4",
          "damage_bonus": -1
        }
      ]
    },
    {
      "name": "Killer Whale",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 90,
      "hit_dice": "12d12",
      "speed": "swim 60 ft.",
      "strength": 19,
      "dexterity": 10,
      "constitution": 13,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 120 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Echolocation",
          "desc": "The whale can't use its blindsight while deafened.",
          "attack_bonus": 0
        },
        {
          "name": "Hold Breath",
          "desc": "The whale can hold its breath for 30 minutes",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing",
          "desc": "The whale has advantage on Wisdom (Perception) checks that rely on hearing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 21 (5d6 + 4) piercing damage.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Knight",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 18,
      "hit_points": 52,
      "hit_dice": "8d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 11,
      "constitution": 14,
      "intelligence": 11,
      "wisdom": 11,
      "charisma": 15,
      "constitution_save": 4,
      "wisdom_save": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Brave",
          "desc": "The knight has advantage on saving throws against being frightened.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The knight makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greatsword",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Heavy Crossbow",
          "desc": "Ranged Weapon Attack: +2 to hit, range 100/400 ft., one target. Hit: 5 (1d10) piercing damage.",
          "attack_bonus": 2,
          "damage_dice": "1d10"
        },
        {
          "name": "Leadership (Recharges after a Short or Long Rest)",
          "desc": "For 1 minute, the knight can utter a special command or warning whenever a nonhostile creature that it can see within 30 ft. of it makes an attack roll or a saving throw. The creature can add a d4 to its roll provided it can hear and understand the knight. A creature can benefit from only one Leadership die at a time. This effect ends if the knight is incapacitated.",
          "attack_bonus": 0
        }
      ],
      "reactions": [
        {
          "name": "Parry",
          "desc": "The knight adds 2 to its AC against one melee attack that would hit it. To do so, the knight must see the attacker and be wielding a melee weapon.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Kobold",
      "size": "Small",
      "type": "humanoid",
      "subtype": "kobold",
      "alignment": "lawful evil",
      "armor_class": 12,
      "hit_points": 5,
      "hit_dice": "2d6",
      "speed": "30 ft.",
      "strength": 7,
      "dexterity": 15,
      "constitution": 9,
      "intelligence": 8,
      "wisdom": 7,
      "charisma": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 8",
      "languages": "Common, Draconic",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Sunlight Sensitivity",
          "desc": "While in sunlight, the kobold has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The kobold has advantage on an attack roll against a creature if at least one of the kobold's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Dagger",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Sling",
          "desc": "Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 4 (1d4 + 2) bludgeoning damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Kraken",
      "size": "Gargantuan",
      "type": "monstrosity",
      "subtype": "titan",
      "alignment": "chaotic evil",
      "armor_class": 18,
      "hit_points": 472,
      "hit_dice": "27d20",
      "speed": "20 ft., swim 60 ft.",
      "strength": 30,
      "dexterity": 11,
      "constitution": 25,
      "intelligence": 22,
      "wisdom": 18,
      "charisma": 20,
      "strength_save": 17,
      "dexterity_save": 7,
      "constitution_save": 14,
      "intelligence_save": 13,
      "wisdom_save": 11,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "frightened, paralyzed",
      "senses": "truesight 120 ft., passive Perception 14",
      "languages": "understands Abyssal, Celestial, Infernal, and Primordial but can't speak, telepathy 120 ft.",
      "challenge_rating": "23",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The kraken can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Freedom of Movement",
          "desc": "The kraken ignores difficult terrain, and magical effects can't reduce its speed or cause it to be restrained. It can spend 5 feet of movement to escape from nonmagical restraints or being grappled.",
          "attack_bonus": 0
        },
        {
          "name": "Siege Monster",
          "desc": "The kraken deals double damage to objects and structures.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The kraken makes three tentacle attacks, each of which it can replace with one use of Fling.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 23 (3d8 + 10) piercing damage. If the target is a Large or smaller creature grappled by the kraken, that creature is swallowed, and the grapple ends. While swallowed, the creature is blinded and restrained, it has total cover against attacks and other effects outside the kraken, and it takes 42 (12d6) acid damage at the start of each of the kraken's turns. If the kraken takes 50 damage or more on a single turn from a creature inside it, the kraken must succeed on a DC 25 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, which fall prone in a space within 10 feet of the kraken. If the kraken dies, a swallowed creature is no longer restrained by it and can escape from the corpse using 15 feet of movement, exiting prone.",
          "attack_bonus": 7,
          "damage_dice": "3d8",
          "damage_bonus": 10
        },
        {
          "name": "Tentacle",
          "desc": "Melee Weapon Attack: +7 to hit, reach 30 ft., one target. Hit: 20 (3d6 + 10) bludgeoning damage, and the target is grappled (escape DC 18). Until this grapple ends, the target is restrained. The kraken has ten tentacles, each of which can grapple one target.",
          "attack_bonus": 7,
          "damage_dice": "3d6",
          "damage_bonus": 10
        },
        {
          "name": "Fling",
          "desc": "One Large or smaller object held or creature grappled by the kraken is thrown up to 60 feet in a random direction and knocked prone. If a thrown target strikes a solid surface, the target takes 3 (1d6) bludgeoning damage for every 10 feet it was thrown. If the target is thrown at another creature, that creature must succeed on a DC 18 Dexterity saving throw or take the same damage and be knocked prone.",
          "attack_bonus": 0
        },
        {
          "name": "Lightning Storm",
          "desc": "The kraken magically creates three bolts of lightning, each of which can strike a target the kraken can see within 120 feet of it. A target must make a DC 23 Dexterity saving throw, taking 22 (4d10) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "4d10"
        }
      ],
      "legendary_actions": [
        {
          "name": "Tentacle Attack or Fling",
          "desc": "The kraken makes one tentacle attack or uses its Fling.",
          "attack_bonus": 0
        },
        {
          "name": "Lightning Storm (Costs 2 Actions)",
          "desc": "The kraken uses Lightning Storm.",
          "attack_bonus": 0
        },
        {
          "name": "Ink Cloud (Costs 3 Actions)",
          "desc": "While underwater, the kraken expels an ink cloud in a 60-foot radius. The cloud spreads around corners, and that area is heavily obscured to creatures other than the kraken. Each creature other than the kraken that ends its turn there must succeed on a DC 23 Constitution saving throw, taking 16 (3d10) poison damage on a failed save, or half as much damage on a successful one. A strong current disperses the cloud, which otherwise disappears at the end of the kraken's next turn.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Lamia",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 13,
      "hit_points": 97,
      "hit_dice": "13d10",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 13,
      "constitution": 15,
      "intelligence": 14,
      "wisdom": 15,
      "charisma": 16,
      "deception": 7,
      "insight": 4,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 12",
      "languages": "Abyssal, Common",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Innate Spellcasting",
          "desc": "The lamia's innate spellcasting ability is Charisma (spell save DC 13). It can innately cast the following spells, requiring no material components. At will: disguise self (any humanoid form), major image 3/day each: charm person, mirror image, scrying, suggestion 1/day: geas",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The lamia makes two attacks: one with its claws and one with its dagger or Intoxicating Touch.",
          "attack_bonus": 0
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 14 (2d10 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "2d10",
          "damage_bonus": 3
        },
        {
          "name": "Dagger",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d4 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d4",
          "damage_bonus": 3
        },
        {
          "name": "Intoxicating Touch",
          "desc": "Melee Spell Attack: +5 to hit, reach 5 ft., one creature. Hit: The target is magically cursed for 1 hour. Until the curse ends, the target has disadvantage on Wisdom saving throws and all ability checks.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Lemure",
      "size": "Medium",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 7,
      "hit_points": 13,
      "hit_dice": "3d8",
      "speed": "15 ft.",
      "strength": 10,
      "dexterity": 5,
      "constitution": 11,
      "intelligence": 1,
      "wisdom": 11,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold",
      "damage_immunities": "fire, poison",
      "condition_immunities": "charmed, frightened, poisoned",
      "senses": "darkvision 120 ft., passive Perception 10",
      "languages": "understands infernal but can't speak",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Devil's Sight",
          "desc": "Magical darkness doesn't impede the lemure's darkvision.",
          "attack_bonus": 0
        },
        {
          "name": "Hellish Rejuvenation",
          "desc": "A lemure that dies in the Nine Hells comes back to life with all its hit points in 1d10 days unless it is killed by a good-aligned creature with a bless spell cast on that creature or its remains are sprinkled with holy water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Fist",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 2 (1d4) bludgeoning damage",
          "attack_bonus": 3,
          "damage_dice": "1d4"
        }
      ]
    },
    {
      "name": "Lich",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "any evil alignment",
      "armor_class": 17,
      "hit_points": 135,
      "hit_dice": "18d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 16,
      "constitution": 16,
      "intelligence": 20,
      "wisdom": 14,
      "charisma": 16,
      "constitution_save": 10,
      "intelligence_save": 12,
      "wisdom_save": 9,
      "arcana": 18,
      "history": 12,
      "insight": 9,
      "perception": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, lightning, necrotic",
      "damage_immunities": "poison; bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, poisoned",
      "senses": "truesight 120 ft., passive Perception 19",
      "languages": "Common plus up to five other languages",
      "challenge_rating": "21",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the lich fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        },
        {
          "name": "Rejuvenation",
          "desc": "If it has a phylactery, a destroyed lich gains a new body in 1d10 days, regaining all its hit points and becoming active again. The new body appears within 5 feet of the phylactery.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The lich is an 18th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 20, +12 to hit with spell attacks). The lich has the following wizard spells prepared:\n\n• Cantrips (at will): mage hand, prestidigitation, ray of frost\n• 1st level (4 slots): detect magic, magic missile, shield, thunderwave\n• 2nd level (3 slots): detect thoughts, invisibility, Melf's acid arrow, mirror image\n• 3rd level (3 slots): animate dead, counterspell, dispel magic, fireball\n• 4th level (3 slots): blight, dimension door\n• 5th level (3 slots): cloudkill, scrying\n• 6th level (1 slot): disintegrate, globe of invulnerability\n• 7th level (1 slot): finger of death, plane shift\n• 8th level (1 slot): dominate monster, power word stun\n• 9th level (1 slot): power word kill",
          "attack_bonus": 0
        },
        {
          "name": "Turn Resistance",
          "desc": "The lich has advantage on saving throws against any effect that turns undead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Paralyzing Touch",
          "desc": "Melee Spell Attack: +12 to hit, reach 5 ft., one creature. Hit: 10 (3d6) cold damage. The target must succeed on a DC 18 Constitution saving throw or be paralyzed for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 12,
          "damage_dice": "3d6"
        }
      ],
      "legendary_actions": [
        {
          "name": "Cantrip",
          "desc": "The lich casts a cantrip.",
          "attack_bonus": 0
        },
        {
          "name": "Paralyzing Touch (Costs 2 Actions)",
          "desc": "The lich uses its Paralyzing Touch.",
          "attack_bonus": 0
        },
        {
          "name": "Frightening Gaze (Costs 2 Actions)",
          "desc": "The lich fixes its gaze on one creature it can see within 10 feet of it. The target must succeed on a DC 18 Wisdom saving throw against this magic or become frightened for 1 minute. The frightened target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a target's saving throw is successful or the effect ends for it, the target is immune to the lich's gaze for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Disrupt Life (Costs 3 Actions)",
          "desc": "Each living creature within 20 feet of the lich must make a DC 18 Constitution saving throw against this magic, taking 21 (6d6) necrotic damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "6d6"
        }
      ]
    },
    {
      "name": "Lion",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 26,
      "hit_dice": "4d10",
      "speed": "50 ft.",
      "strength": 17,
      "dexterity": 15,
      "constitution": 13,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 8,
      "perception": 3,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The lion has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The lion has advantage on an attack roll against a creature if at least one of the lion's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        },
        {
          "name": "Pounce",
          "desc": "If the lion moves at least 20 ft. straight toward a creature and then hits it with a claw attack on the same turn, that target must succeed on a DC 13 Strength saving throw or be knocked prone. If the target is prone, the lion can make one bite attack against it as a bonus action.",
          "attack_bonus": 0
        },
        {
          "name": "Running Leap",
          "desc": "With a 10-foot running start, the lion can long jump up to 25 ft..",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Lizard",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 2,
      "hit_dice": "1d4",
      "speed": "20 ft., climb 20 ft.",
      "strength": 2,
      "dexterity": 11,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 8,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "0",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 piercing damage.",
          "attack_bonus": 0,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Lizardfolk",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "lizardfolk",
      "alignment": "neutral",
      "armor_class": 15,
      "hit_points": 22,
      "hit_dice": "4d8",
      "speed": "30 ft., swim 30 ft.",
      "strength": 15,
      "dexterity": 10,
      "constitution": 13,
      "intelligence": 7,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "stealth": 4,
      "survival": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "Draconic",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Hold Breath",
          "desc": "The lizardfolk can hold its breath for 15 minutes.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The lizardfolk makes two melee attacks, each one with a different weapon.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Heavy Club",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) bludgeoning damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Javelin",
          "desc": "Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Spiked Shield",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Mage",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 12,
      "hit_points": 40,
      "hit_dice": "9d8",
      "speed": "30 ft.",
      "strength": 9,
      "dexterity": 14,
      "constitution": 11,
      "intelligence": 17,
      "wisdom": 12,
      "charisma": 11,
      "intelligence_save": 6,
      "wisdom_save": 4,
      "arcana": 6,
      "history": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "any four languages",
      "challenge_rating": "6",
      "special_abilities": [
        {
          "name": "Spellcasting",
          "desc": "The mage is a 9th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 14, +6 to hit with spell attacks). The mage has the following wizard spells prepared:\n\n• Cantrips (at will): fire bolt, light, mage hand, prestidigitation\n• 1st level (4 slots): detect magic, mage armor, magic missile, shield\n• 2nd level (3 slots): misty step, suggestion\n• 3rd level (3 slots): counterspell, fireball, fly\n• 4th level (3 slots): greater invisibility, ice storm\n• 5th level (1 slot): cone of cold",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Dagger",
          "desc": "Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Magma Mephit",
      "size": "Small",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 11,
      "hit_points": 22,
      "hit_dice": "5d6",
      "speed": "30 ft., fly 30 ft.",
      "strength": 8,
      "dexterity": 12,
      "constitution": 12,
      "intelligence": 7,
      "wisdom": 10,
      "charisma": 10,
      "stealth": 3,
      "damage_vulnerabilities": "cold",
      "damage_resistances": "",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Ignan, Terran",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Death Burst",
          "desc": "When the mephit dies, it explodes in a burst of lava. Each creature within 5 ft. of it must make a DC 11 Dexterity saving throw, taking 7 (2d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        },
        {
          "name": "False Appearance",
          "desc": "While the mephit remains motionless, it is indistinguishable from an ordinary mound of magma.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting (1/Day)",
          "desc": "The mephit can innately cast heat metal (spell save DC 10), requiring no material components. Its innate spellcasting ability is Charisma.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft ., one creature. Hit: 3 (1d4 + 1) slashing damage plus 2 (1d4) fire damage.",
          "attack_bonus": 3,
          "damage_dice": "1d4",
          "damage_bonus": 1
        },
        {
          "name": "Fire Breath (Recharge 6)",
          "desc": "The mephit exhales a 15-foot cone of fire. Each creature in that area must make a DC 11 Dexterity saving throw, taking 7 (2d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Mephits (1/Day)",
          "desc": "The mephit has a 25 percent chance of summoning 1d4 mephits of its kind. A summoned mephit appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other mephits. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Magmin",
      "size": "Small",
      "type": "elemental",
      "subtype": "",
      "alignment": "chaotic neutral",
      "armor_class": 14,
      "hit_points": 9,
      "hit_dice": "2d6",
      "speed": "30 ft.",
      "strength": 7,
      "dexterity": 15,
      "constitution": 12,
      "intelligence": 8,
      "wisdom": 11,
      "charisma": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Ignan",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Death Burst",
          "desc": "When the magmin dies, it explodes in a burst of fire and magma. Each creature within 10 ft. of it must make a DC 11 Dexterity saving throw, taking 7 (2d6) fire damage on a failed save, or half as much damage on a successful one. Flammable objects that aren't being worn or carried in that area are ignited.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        },
        {
          "name": "Ignited Illumination",
          "desc": "As a bonus action, the magmin can set itself ablaze or extinguish its flames. While ablaze, the magmin sheds bright light in a 10-foot radius and dim light for an additional 10 ft.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Touch",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d6) fire damage. If the target is a creature or a flammable object, it ignites. Until a target takes an action to douse the fire, the target takes 3 (1d6) fire damage at the end of each of its turns.",
          "attack_bonus": 4,
          "damage_dice": "2d6"
        }
      ]
    },
    {
      "name": "Mammoth",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 126,
      "hit_dice": "11d12",
      "speed": "40 ft.",
      "strength": 24,
      "dexterity": 9,
      "constitution": 21,
      "intelligence": 3,
      "wisdom": 11,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "6",
      "special_abilities": [
        {
          "name": "Trampling Charge",
          "desc": "If the mammoth moves at least 20 ft. straight toward a creature and then hits it with a gore attack on the same turn, that target must succeed on a DC 18 Strength saving throw or be knocked prone. If the target is prone, the mammoth can make one stomp attack against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Gore",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 25 (4d8 + 7) piercing damage.",
          "attack_bonus": 10,
          "damage_dice": "4d8",
          "damage_bonus": 7
        },
        {
          "name": "Stomp",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one prone creature. Hit: 29 (4d10 + 7) bludgeoning damage.",
          "attack_bonus": 10,
          "damage_dice": "4d10",
          "damage_bonus": 7
        }
      ]
    },
    {
      "name": "Manticore",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 14,
      "hit_points": 68,
      "hit_dice": "8d10",
      "speed": "30 ft., fly 50 ft.",
      "strength": 17,
      "dexterity": 16,
      "constitution": 17,
      "intelligence": 7,
      "wisdom": 12,
      "charisma": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Tail Spike Regrowth",
          "desc": "The manticore has twenty-four tail spikes. Used spikes regrow when the manticore finishes a long rest.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The manticore makes three attacks: one with its bite and two with its claws or three with its tail spikes.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Tail Spike",
          "desc": "Ranged Weapon Attack: +5 to hit, range 100/200 ft., one target. Hit: 7 (1d8 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Marilith",
      "size": "Large",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 18,
      "hit_points": 189,
      "hit_dice": "18d10",
      "speed": "40 ft.",
      "strength": 18,
      "dexterity": 20,
      "constitution": 20,
      "intelligence": 18,
      "wisdom": 16,
      "charisma": 20,
      "strength_save": 9,
      "constitution_save": 10,
      "wisdom_save": 8,
      "charisma_save": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire, lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "truesight 120 ft., passive Perception 13",
      "languages": "Abyssal, telepathy 120 ft.",
      "challenge_rating": "16",
      "special_abilities": [
        {
          "name": "Magic Resistance",
          "desc": "The marilith has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The marilith's weapon attacks are magical.",
          "attack_bonus": 0
        },
        {
          "name": "Reactive",
          "desc": "The marilith can take one reaction on every turn in combat.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The marilith can make seven attacks: six with its longswords and one with its tail.",
          "attack_bonus": 0
        },
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.",
          "attack_bonus": 9,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one creature. Hit: 15 (2d10 + 4) bludgeoning damage. If the target is Medium or smaller, it is grappled (escape DC 19). Until this grapple ends, the target is restrained, the marilith can automatically hit the target with its tail, and the marilith can't make tail attacks against other targets.",
          "attack_bonus": 9,
          "damage_dice": "2d10",
          "damage_bonus": 4
        },
        {
          "name": "Teleport",
          "desc": "The marilith magically teleports, along with any equipment it is wearing or carrying, up to 120 feet to an unoccupied space it can see.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Demon (1/Day)",
          "desc": "The demon chooses what to summon and attempts a magical summoning.\nA marilith has a 50 percent chance of summoning 1d6 vrocks, 1d4 hezrous, 1d3 glabrezus, 1d2 nalfeshnees, or one marilith.\nA summoned demon appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other demons. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ],
      "reactions": [
        {
          "name": "Parry",
          "desc": "The marilith adds 5 to its AC against one melee attack that would hit it. To do so, the marilith must see the attacker and be wielding a melee weapon.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Mastiff",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 5,
      "hit_dice": "1d8",
      "speed": "40 ft.",
      "strength": 13,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The mastiff has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Medusa",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 15,
      "hit_points": 127,
      "hit_dice": "17d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 12,
      "wisdom": 13,
      "charisma": 15,
      "deception": 5,
      "insight": 4,
      "perception": 4,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Common",
      "challenge_rating": "6",
      "special_abilities": [
        {
          "name": "Petrifying Gaze",
          "desc": "When a creature that can see the medusa's eyes starts its turn within 30 ft. of the medusa, the medusa can force it to make a DC 14 Constitution saving throw if the medusa isn't incapacitated and can see the creature. If the saving throw fails by 5 or more, the creature is instantly petrified. Otherwise, a creature that fails the save begins to turn to stone and is restrained. The restrained creature must repeat the saving throw at the end of its next turn, becoming petrified on a failure or ending the effect on a success. The petrification lasts until the creature is freed by the greater restoration spell or other magic.\nUnless surprised, a creature can avert its eyes to avoid the saving throw at the start of its turn. If the creature does so, it can't see the medusa until the start of its next turn, when it can avert its eyes again. If the creature looks at the medusa in the meantime, it must immediately make the save.\nIf the medusa sees itself reflected on a polished surface within 30 ft. of it and in an area of bright light, the medusa is, due to its curse, affected by its own gaze.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The medusa makes either three melee attacks —  one with its snake hair and two with its shortsword — or two ranged attacks with its longbow.",
          "attack_bonus": 0
        },
        {
          "name": "Snake Hair",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage plus 14 (4d6) poison damage.",
          "attack_bonus": 5,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +5 to hit, range 150/600 ft., one target. Hit: 6 (1d8 + 2) piercing damage plus 7 (2d6) poison damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6"
        }
      ]
    },
    {
      "name": "Merfolk",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "merfolk",
      "alignment": "neutral",
      "armor_class": 11,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "10 ft., swim 40 ft.",
      "strength": 10,
      "dexterity": 13,
      "constitution": 12,
      "intelligence": 11,
      "wisdom": 11,
      "charisma": 12,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "Aquan, Common",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The merfolk can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Spear",
          "desc": "Melee or Ranged Weapon Attack: +2 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 3 (1d6) piercing damage, or 4 (1d8) piercing damage if used with two hands to make a melee attack.",
          "attack_bonus": 2,
          "damage_dice": "1d6"
        }
      ]
    },
    {
      "name": "Merrow",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 13,
      "hit_points": 45,
      "hit_dice": "6d10",
      "speed": "10 ft., swim 40 ft.",
      "strength": 18,
      "dexterity": 10,
      "constitution": 15,
      "intelligence": 8,
      "wisdom": 10,
      "charisma": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Abyssal, Aquan",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The merrow can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The merrow makes two attacks: one with its bite and one with its claws or harpoon.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (2d4 + 4) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d4",
          "damage_bonus": 4
        },
        {
          "name": "Harpoon",
          "desc": "Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 11 (2d6 + 4) piercing damage. If the target is a Huge or smaller creature, it must succeed on a Strength contest against the merrow or be pulled up to 20 feet toward the merrow.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Mimic",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "shapechanger",
      "alignment": "neutral",
      "armor_class": 12,
      "hit_points": 58,
      "hit_dice": "9d8",
      "speed": "15 ft.",
      "strength": 17,
      "dexterity": 12,
      "constitution": 15,
      "intelligence": 5,
      "wisdom": 13,
      "charisma": 8,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "prone",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The mimic can use its action to polymorph into an object or back into its true, amorphous form. Its statistics are the same in each form. Any equipment it is wearing or carrying isn 't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Adhesive (Object Form Only)",
          "desc": "The mimic adheres to anything that touches it. A Huge or smaller creature adhered to the mimic is also grappled by it (escape DC 13). Ability checks made to escape this grapple have disadvantage.",
          "attack_bonus": 0
        },
        {
          "name": "False Appearance (Object Form Only)",
          "desc": "While the mimic remains motionless, it is indistinguishable from an ordinary object.",
          "attack_bonus": 0
        },
        {
          "name": "Grappler",
          "desc": "The mimic has advantage on attack rolls against any creature grappled by it.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Pseudopod",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) bludgeoning damage. If the mimic is in object form, the target is subjected to its Adhesive trait.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 4 (1d8) acid damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8 + 1d8",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Minotaur",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 14,
      "hit_points": 76,
      "hit_dice": "9d10",
      "speed": "40 ft.",
      "strength": 18,
      "dexterity": 11,
      "constitution": 16,
      "intelligence": 6,
      "wisdom": 16,
      "charisma": 9,
      "perception": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 17",
      "languages": "Abyssal",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the minotaur moves at least 10 ft. straight toward a target and then hits it with a gore attack on the same turn, the target takes an extra 9 (2d8) piercing damage. If the target is a creature, it must succeed on a DC 14 Strength saving throw or be pushed up to 10 ft. away and knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d8"
        },
        {
          "name": "Labyrinthine Recall",
          "desc": "The minotaur can perfectly recall any path it has traveled.",
          "attack_bonus": 0
        },
        {
          "name": "Reckless",
          "desc": "At the start of its turn, the minotaur can gain advantage on all melee weapon attack rolls it makes during that turn, but attack rolls against it have advantage until the start of its next turn.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Greataxe",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 17 (2d12 + 4) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d12",
          "damage_bonus": 4
        },
        {
          "name": "Gore",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Minotaur Skeleton",
      "size": "Large",
      "type": "undead",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 12,
      "hit_points": 67,
      "hit_dice": "9d10",
      "speed": "40 ft.",
      "strength": 18,
      "dexterity": 11,
      "constitution": 15,
      "intelligence": 6,
      "wisdom": 8,
      "charisma": 5,
      "damage_vulnerabilities": "bludgeoning",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "exhaustion, poisoned",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "understands Abyssal but can't speak",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the skeleton moves at least 10 feet straight toward a target and then hits it with a gore attack on the same turn, the target takes an extra 9 (2d8) piercing damage. If the target is a creature, it must succeed on a DC 14 Strength saving throw or be pushed up to 10 feet away and knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d8"
        }
      ],
      "actions": [
        {
          "name": "Greataxe",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 17 (2d12 + 4) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d12",
          "damage_bonus": 4
        },
        {
          "name": "Gore",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Mule",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "40 ft.",
      "strength": 14,
      "dexterity": 10,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Beast of Burden",
          "desc": "The mule is considered to be a Large animal for the purpose of determining its carrying capacity.",
          "attack_bonus": 0
        },
        {
          "name": "Sure-Footed",
          "desc": "The mule has advantage on Strength and Dexterity saving throws made against effects that would knock it prone.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) bludgeoning damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Mummy",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 11,
      "hit_points": 58,
      "hit_dice": "9d8",
      "speed": "20 ft.",
      "strength": 16,
      "dexterity": 8,
      "constitution": 15,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 12,
      "wisdom_save": 2,
      "damage_vulnerabilities": "fire",
      "damage_resistances": "",
      "damage_immunities": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "necrotic, poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "the languages it knew in life",
      "challenge_rating": "3",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The mummy can use its Dreadful Glare and makes one attack with its rotting fist.",
          "attack_bonus": 0
        },
        {
          "name": "Rotting Fist",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage plus 10 (3d6) necrotic damage. If the target is a creature, it must succeed on a DC 12 Constitution saving throw or be cursed with mummy rot. The cursed target can't regain hit points, and its hit point maximum decreases by 10 (3d6) for every 24 hours that elapse. If the curse reduces the target's hit point maximum to 0, the target dies, and its body turns to dust. The curse lasts until removed by the remove curse spell or other magic.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Dreadful Glare",
          "desc": "The mummy targets one creature it can see within 60 ft. of it. If the target can see the mummy, it must succeed on a DC 11 Wisdom saving throw against this magic or become frightened until the end of the mummy's next turn. If the target fails the saving throw by 5 or more, it is also paralyzed for the same duration. A target that succeeds on the saving throw is immune to the Dreadful Glare of all mummies (but not mummy lords) for the next 24 hours.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Mummy Lord",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 17,
      "hit_points": 97,
      "hit_dice": "13d8",
      "speed": "20 ft.",
      "strength": 18,
      "dexterity": 10,
      "constitution": 17,
      "intelligence": 11,
      "wisdom": 18,
      "charisma": 16,
      "constitution_save": 8,
      "intelligence_save": 5,
      "wisdom_save": 9,
      "charisma_save": 8,
      "history": 5,
      "religion": 5,
      "damage_vulnerabilities": "bludgeoning",
      "damage_resistances": "",
      "damage_immunities": "necrotic, poison; bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, poisoned",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "the languages it knew in life",
      "challenge_rating": "15",
      "special_abilities": [
        {
          "name": "Magic Resistance",
          "desc": "The mummy lord has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Rejuvenation",
          "desc": "A destroyed mummy lord gains a new body in 24 hours if its heart is intact, regaining all its hit points and becoming active again. The new body appears within 5 feet of the mummy lord's heart.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The mummy lord is a 10th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 17, +9 to hit with spell attacks). The mummy lord has the following cleric spells prepared:\n\n• Cantrips (at will): sacred flame, thaumaturgy\n• 1st level (4 slots): command, guiding bolt, shield of faith\n• 2nd level (3 slots): hold person, silence, spiritual weapon\n• 3rd level (3 slots): animate dead, dispel magic\n• 4th level (3 slots): divination, guardian of faith\n• 5th level (2 slots): contagion, insect plague\n• 6th level (1 slot): harm",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The mummy can use its Dreadful Glare and makes one attack with its rotting fist.",
          "attack_bonus": 0
        },
        {
          "name": "Rotting Fist",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 14 (3d6 + 4) bludgeoning damage plus 21 (6d6) necrotic damage. If the target is a creature, it must succeed on a DC 16 Constitution saving throw or be cursed with mummy rot. The cursed target can't regain hit points, and its hit point maximum decreases by 10 (3d6) for every 24 hours that elapse. If the curse reduces the target's hit point maximum to 0, the target dies, and its body turns to dust. The curse lasts until removed by the remove curse spell or other magic.",
          "attack_bonus": 9,
          "damage_dice": "3d6 + 6d6",
          "damage_bonus": 4
        },
        {
          "name": "Dreadful Glare",
          "desc": "The mummy lord targets one creature it can see within 60 feet of it. If the target can see the mummy lord, it must succeed on a DC 16 Wisdom saving throw against this magic or become frightened until the end of the mummy's next turn. If the target fails the saving throw by 5 or more, it is also paralyzed for the same duration. A target that succeeds on the saving throw is immune to the Dreadful Glare of all mummies and mummy lords for the next 24 hours.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Attack",
          "desc": "The mummy lord makes one attack with its rotting fist or uses its Dreadful Glare.",
          "attack_bonus": 0
        },
        {
          "name": "Blinding Dust",
          "desc": "Blinding dust and sand swirls magically around the mummy lord. Each creature within 5 feet of the mummy lord must succeed on a DC 16 Constitution saving throw or be blinded until the end of the creature's next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Blasphemous Word (Costs 2 Actions)",
          "desc": "The mummy lord utters a blasphemous word. Each non-undead creature within 10 feet of the mummy lord that can hear the magical utterance must succeed on a DC 16 Constitution saving throw or be stunned until the end of the mummy lord's next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Channel Negative Energy (Costs 2 Actions)",
          "desc": "The mummy lord magically unleashes negative energy. Creatures within 60 feet of the mummy lord, including ones behind barriers and around corners, can't regain hit points until the end of the mummy lord's next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Whirlwind of Sand (Costs 2 Actions)",
          "desc": "The mummy lord magically transforms into a whirlwind of sand, moves up to 60 feet, and reverts to its normal form. While in whirlwind form, the mummy lord is immune to all damage, and it can't be grappled, petrified, knocked prone, restrained, or stunned. Equipment worn or carried by the mummy lord remain in its possession.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Nalfeshnee",
      "size": "Large",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 18,
      "hit_points": 184,
      "hit_dice": "16d10",
      "speed": "20 ft., fly 30 ft.",
      "strength": 21,
      "dexterity": 10,
      "constitution": 22,
      "intelligence": 19,
      "wisdom": 12,
      "charisma": 15,
      "constitution_save": 11,
      "intelligence_save": 9,
      "wisdom_save": 6,
      "charisma_save": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire, lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "truesight 120 ft., passive Perception 11",
      "languages": "Abyssal, telepathy 120 ft.",
      "challenge_rating": "13",
      "special_abilities": [
        {
          "name": "Magic Resistance",
          "desc": "The nalfeshnee has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The nalfeshnee uses Horror Nimbus if it can.  It then makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 32 (5d10 + 5) piercing damage.",
          "attack_bonus": 10,
          "damage_dice": "5d10",
          "damage_bonus": 5
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 15 (3d6 + 5) slashing damage.",
          "attack_bonus": 10,
          "damage_dice": "3d6",
          "damage_bonus": 5
        },
        {
          "name": "Horror Nimbus (Recharge 5-6)",
          "desc": "The nalfeshnee magically emits scintillating, multicolored light. Each creature within 15 feet of the nalfeshnee that can see the light must succeed on a DC 15 Wisdom saving throw or be frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the nalfeshnee's Horror Nimbus for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Teleport",
          "desc": "The nalfeshnee magically teleports, along with any equipment it is wearing or carrying, up to 120 feet to an unoccupied space it can see.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Demon (1/Day)",
          "desc": "The demon chooses what to summon and attempts a magical summoning.\nA nalfeshnee has a 50 percent chance of summoning 1d4 vrocks, 1d3 hezrous, 1d2 glabrezus, or one nalfeshnee.\nA summoned demon appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other demons. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Night Hag",
      "size": "Medium",
      "type": "fiend",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 17,
      "hit_points": 112,
      "hit_dice": "15d8",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 16,
      "wisdom": 14,
      "charisma": 16,
      "deception": 7,
      "insight": 6,
      "perception": 6,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "",
      "condition_immunities": "charmed",
      "senses": "darkvision 120 ft., passive Perception 16",
      "languages": "Abyssal, Common, Infernal, Primordial",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Innate Spellcasting",
          "desc": "The hag's innate spellcasting ability is Charisma (spell save DC 14, +6 to hit with spell attacks). She can innately cast the following spells, requiring no material components:\n\nAt will: detect magic, magic missile\n2/day each: plane shift (self only), ray of enfeeblement, sleep",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The hag has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Night Hag Items",
          "desc": "A night hag carries two very rare magic items that she must craft for herself If either object is lost, the night hag will go to great lengths to retrieve it, as creating a new tool takes time and effort.\nHeartstone: This lustrous black gem allows a night hag to become ethereal while it is in her possession. The touch of a heartstone also cures any disease. Crafting a heartstone takes 30 days.\nSoul Bag: When an evil humanoid dies as a result of a night hag's Nightmare Haunting, the hag catches the soul in this black sack made of stitched flesh. A soul bag can hold only one evil soul at a time, and only the night hag who crafted the bag can catch a soul with it. Crafting a soul bag takes 7 days and a humanoid sacrifice (whose flesh is used to make the bag).",
          "attack_bonus": 0
        },
        {
          "name": "Hag Coven",
          "desc": "When hags must work together, they form covens, in spite of their selfish natures. A coven is made up of hags of any type, all of whom are equals within the group. However, each of the hags continues to desire more personal power.\nA coven consists of three hags so that any arguments between two hags can be settled by the third. If more than three hags ever come together, as might happen if two covens come into conflict, the result is usually chaos.",
          "attack_bonus": 0
        },
        {
          "name": "Shared Spellcasting (Coven Only)",
          "desc": "While all three members of a hag coven are within 30 feet of one another, they can each cast the following spells from the wizard's spell list but must share the spell slots among themselves:\n\n• 1st level (4 slots): identify, ray of sickness\n• 2nd level (3 slots): hold person, locate object\n• 3rd level (3 slots): bestow curse, counterspell, lightning bolt\n• 4th level (3 slots): phantasmal killer, polymorph\n• 5th level (2 slots): contact other plane, scrying\n• 6th level (1 slot): eye bite\n\nFor casting these spells, each hag is a 12th-level spellcaster that uses Intelligence as her spellcasting ability. The spell save DC is 12+the hag's Intelligence modifier, and the spell attack bonus is 4+the hag's Intelligence modifier.",
          "attack_bonus": 0
        },
        {
          "name": "Hag Eye (Coven Only)",
          "desc": "A hag coven can craft a magic item called a hag eye, which is made from a real eye coated in varnish and often fitted to a pendant or other wearable item. The hag eye is usually entrusted to a minion for safekeeping and transport. A hag in the coven can take an action to see what the hag eye sees if the hag eye is on the same plane of existence. A hag eye has AC 10, 1 hit point, and darkvision with a radius of 60 feet. If it is destroyed, each coven member takes 3d10 psychic damage and is blinded for 24 hours.\nA hag coven can have only one hag eye at a time, and creating a new one requires all three members of the coven to perform a ritual. The ritual takes 1 hour, and the hags can't perform it while blinded. During the ritual, if the hags take any action other than performing the ritual, they must start over.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws (Hag Form Only)",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Change Shape",
          "desc": "The hag magically polymorphs into a Small or Medium female humanoid, or back into her true form. Her statistics are the same in each form. Any equipment she is wearing or carrying isn't transformed. She reverts to her true form if she dies.",
          "attack_bonus": 0
        },
        {
          "name": "Etherealness",
          "desc": "The hag magically enters the Ethereal Plane from the Material Plane, or vice versa. To do so, the hag must have a heartstone in her possession.",
          "attack_bonus": 0
        },
        {
          "name": "Nightmare Haunting (1/Day)",
          "desc": "While on the Ethereal Plane, the hag magically touches a sleeping humanoid on the Material Plane. A protection from evil and good spell cast on the target prevents this contact, as does a magic circle. As long as the contact persists, the target has dreadful visions. If these visions last for at least 1 hour, the target gains no benefit from its rest, and its hit point maximum is reduced by 5 (1d10). If this effect reduces the target's hit point maximum to 0, the target dies, and if the target was evil, its soul is trapped in the hag's soul bag. The reduction to the target's hit point maximum lasts until removed by the greater restoration spell or similar magic.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Nightmare",
      "size": "Large",
      "type": "fiend",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 13,
      "hit_points": 68,
      "hit_dice": "8d10",
      "speed": "60 ft., fly 90 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 10,
      "wisdom": 13,
      "charisma": 15,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "understands Abyssal, Common, and Infernal but can't speak",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Confer Fire Resistance",
          "desc": "The nightmare can grant resistance to fire damage to anyone riding it.",
          "attack_bonus": 0
        },
        {
          "name": "Illumination",
          "desc": "The nightmare sheds bright light in a 10-foot radius and dim light for an additional 10 feet.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage plus 7 (2d6) fire damage.",
          "attack_bonus": 6,
          "damage_dice": "2d8 + 2d6",
          "damage_bonus": 4
        },
        {
          "name": "Ethereal Stride",
          "desc": "The nightmare and up to three willing creatures within 5 feet of it magically enter the Ethereal Plane from the Material Plane, or vice versa.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Noble",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 15,
      "hit_points": 9,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 12,
      "constitution": 11,
      "intelligence": 12,
      "wisdom": 14,
      "charisma": 16,
      "deception": 5,
      "insight": 4,
      "persuasion": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "any two languages",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Rapier",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d8",
          "damage_bonus": 1
        }
      ],
      "reactions": [
        {
          "name": "Parry",
          "desc": "The noble adds 2 to its AC against one melee attack that would hit it. To do so, the noble must see the attacker and be wielding a melee weapon.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ochre Jelly",
      "size": "Large",
      "type": "ooze",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 8,
      "hit_points": 45,
      "hit_dice": "6d10",
      "speed": "10 ft., climb 10 ft.",
      "strength": 15,
      "dexterity": 6,
      "constitution": 14,
      "intelligence": 2,
      "wisdom": 6,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "acid",
      "damage_immunities": "lightning, slashing",
      "condition_immunities": "blinded, charmed, deafened, exhaustion, frightened, prone",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 8",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Amorphous",
          "desc": "The jelly can move through a space as narrow as 1 inch wide without squeezing.",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The jelly can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Pseudopod",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) bludgeoning damage plus 3 (1d6) acid damage.",
          "attack_bonus": 4,
          "damage_dice": "2d6",
          "damage_bonus": 2
        }
      ],
      "reactions": [
        {
          "name": "Split",
          "desc": "When a jelly that is Medium or larger is subjected to lightning or slashing damage, it splits into two new jellies if it has at least 10 hit points. Each new jelly has hit points equal to half the original jelly's, rounded down. New jellies are one size smaller than the original jelly.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Octopus",
      "size": "Small",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 3,
      "hit_dice": "1d6",
      "speed": "5 ft., swim 30 ft.",
      "strength": 4,
      "dexterity": 15,
      "constitution": 11,
      "intelligence": 3,
      "wisdom": 10,
      "charisma": 4,
      "perception": 2,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Hold Breath",
          "desc": "While out of water, the octopus can hold its breath for 30 minutes.",
          "attack_bonus": 0
        },
        {
          "name": "Underwater Camouflage",
          "desc": "The octopus has advantage on Dexterity (Stealth) checks made while underwater.",
          "attack_bonus": 0
        },
        {
          "name": "Water Breathing",
          "desc": "The octopus can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Tentacles",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1 bludgeoning damage, and the target is grappled (escape DC 10). Until this grapple ends, the octopus can't use its tentacles on another target.",
          "attack_bonus": 4,
          "damage_bonus": 1
        },
        {
          "name": "Ink Cloud (Recharges after a Short or Long Rest)",
          "desc": "A 5-foot-radius cloud of ink extends all around the octopus if it is underwater. The area is heavily obscured for 1 minute, although a significant current can disperse the ink. After releasing the ink, the octopus can use the Dash action as a bonus action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Ogre",
      "size": "Large",
      "type": "giant",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 11,
      "hit_points": 59,
      "hit_dice": "7d10",
      "speed": "40 ft.",
      "strength": 19,
      "dexterity": 8,
      "constitution": 16,
      "intelligence": 5,
      "wisdom": 7,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 8",
      "languages": "Common, Giant",
      "challenge_rating": "2",
      "actions": [
        {
          "name": "Greatclub",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Javelin",
          "desc": "Melee or Ranged Weapon Attack: +6 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 11 (2d6 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Ogre Zombie",
      "size": "Large",
      "type": "undead",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 8,
      "hit_points": 85,
      "hit_dice": "9d10",
      "speed": "30 ft.",
      "strength": 19,
      "dexterity": 6,
      "constitution": 18,
      "intelligence": 3,
      "wisdom": 6,
      "charisma": 5,
      "wisdom_save": 0,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 8",
      "languages": "understands Common and Giant but can't speak",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Undead Fortitude",
          "desc": "If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw with a DC of 5+the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Morningstar",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Oni",
      "size": "Large",
      "type": "giant",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 16,
      "hit_points": 110,
      "hit_dice": "13d10",
      "speed": "30 ft., fly 30 ft.",
      "strength": 19,
      "dexterity": 11,
      "constitution": 16,
      "intelligence": 14,
      "wisdom": 12,
      "charisma": 15,
      "dexterity_save": 3,
      "constitution_save": 6,
      "wisdom_save": 4,
      "charisma_save": 5,
      "arcana": 5,
      "deception": 8,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Common, Giant",
      "challenge_rating": "7",
      "special_abilities": [
        {
          "name": "Innate Spellcasting",
          "desc": "The oni's innate spellcasting ability is Charisma (spell save DC 13). The oni can innately cast the following spells, requiring no material components:\n\nAt will: darkness, invisibility\n1/day each: charm person, cone of cold, gaseous form, sleep",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The oni's weapon attacks are magical.",
          "attack_bonus": 0
        },
        {
          "name": "Regeneration",
          "desc": "The oni regains 10 hit points at the start of its turn if it has at least 1 hit point.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The oni makes two attacks, either with its claws or its glaive.",
          "attack_bonus": 0
        },
        {
          "name": "Claw (Oni Form Only)",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 8 (1d8 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Glaive",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) slashing damage, or 9 (1d10 + 4) slashing damage in Small or Medium form.",
          "attack_bonus": 7,
          "damage_dice": "2d10",
          "damage_bonus": 4
        },
        {
          "name": "Change Shape",
          "desc": "The oni magically polymorphs into a Small or Medium humanoid, into a Large giant, or back into its true form. Other than its size, its statistics are the same in each form. The only equipment that is transformed is its glaive, which shrinks so that it can be wielded in humanoid form. If the oni dies, it reverts to its true form, and its glaive reverts to its normal size.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Orc",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "orc",
      "alignment": "chaotic evil",
      "armor_class": 13,
      "hit_points": 15,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 12,
      "constitution": 16,
      "intelligence": 7,
      "wisdom": 11,
      "charisma": 10,
      "intimidation": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Common, Orc",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Aggressive",
          "desc": "As a bonus action, the orc can move up to its speed toward a hostile creature that it can see.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Greataxe",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 9 (1d12 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d12",
          "damage_bonus": 3
        },
        {
          "name": "Javelin",
          "desc": "Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft. or range 30/120 ft., one target. Hit: 6 (1d6 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Otyugh",
      "size": "Large",
      "type": "aberration",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 14,
      "hit_points": 114,
      "hit_dice": "12d10",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 11,
      "constitution": 19,
      "intelligence": 6,
      "wisdom": 13,
      "charisma": 6,
      "constitution_save": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 11",
      "languages": "Otyugh",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Limited Telepathy",
          "desc": "The otyugh can magically transmit simple messages and images to any creature within 120 ft. of it that can understand a language. This form of telepathy doesn't allow the receiving creature to telepathically respond.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The otyugh makes three attacks: one with its bite and two with its tentacles.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 12 (2d8 + 3) piercing damage. If the target is a creature, it must succeed on a DC 15 Constitution saving throw against disease or become poisoned until the disease is cured. Every 24 hours that elapse, the target must repeat the saving throw, reducing its hit point maximum by 5 (1d10) on a failure. The disease is cured on a success. The target dies if the disease reduces its hit point maximum to 0. This reduction to the target's hit point maximum lasts until the disease is cured.",
          "attack_bonus": 6,
          "damage_dice": "2d8",
          "damage_bonus": 3
        },
        {
          "name": "Tentacle",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 7 (1d8 + 3) bludgeoning damage plus 4 (1d8) piercing damage. If the target is Medium or smaller, it is grappled (escape DC 13) and restrained until the grapple ends. The otyugh has two tentacles, each of which can grapple one target.",
          "attack_bonus": 6,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Tentacle Slam",
          "desc": "The otyugh slams creatures grappled by it into each other or a solid surface. Each creature must succeed on a DC 14 Constitution saving throw or take 10 (2d6 + 3) bludgeoning damage and be stunned until the end of the otyugh's next turn. On a successful save, the target takes half the bludgeoning damage and isn't stunned.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Owl",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "5 ft., fly 60 ft.",
      "strength": 3,
      "dexterity": 13,
      "constitution": 8,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Flyby",
          "desc": "The owl doesn't provoke opportunity attacks when it flies out of an enemy's reach.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing and Sight",
          "desc": "The owl has advantage on Wisdom (Perception) checks that rely on hearing or sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 1 slashing damage.",
          "attack_bonus": 3,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Owlbear",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 59,
      "hit_dice": "7d10",
      "speed": "40 ft.",
      "strength": 20,
      "dexterity": 12,
      "constitution": 17,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Keen Sight and Smell",
          "desc": "The owlbear has advantage on Wisdom (Perception) checks that rely on sight or smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The owlbear makes two attacks: one with its beak and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one creature. Hit: 10 (1d10 + 5) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "1d10",
          "damage_bonus": 5
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Panther",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 13,
      "hit_dice": "3d8",
      "speed": "50 ft., climb 40 ft.",
      "strength": 14,
      "dexterity": 15,
      "constitution": 10,
      "intelligence": 3,
      "wisdom": 14,
      "charisma": 7,
      "perception": 4,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The panther has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pounce",
          "desc": "If the panther moves at least 20 ft. straight toward a creature and then hits it with a claw attack on the same turn, that target must succeed on a DC 12 Strength saving throw or be knocked prone. If the target is prone, the panther can make one bite attack against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Pegasus",
      "size": "Large",
      "type": "celestial",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 12,
      "hit_points": 59,
      "hit_dice": "7d10",
      "speed": "60 ft., fly 90 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 10,
      "wisdom": 15,
      "charisma": 13,
      "dexterity_save": 4,
      "wisdom_save": 4,
      "charisma_save": 3,
      "perception": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 16",
      "languages": "understands Celestial, Common, Elvish, and Sylvan but can't speak",
      "challenge_rating": "2",
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Phase Spider",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 32,
      "hit_dice": "5d10",
      "speed": "30 ft., climb 30 ft.",
      "strength": 15,
      "dexterity": 15,
      "constitution": 12,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 6,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Ethereal Jaunt",
          "desc": "As a bonus action, the spider can magically shift from the Material Plane to the Ethereal Plane, or vice versa.",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Web Walker",
          "desc": "The spider ignores movement restrictions caused by webbing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (1d10 + 2) piercing damage, and the target must make a DC 11 Constitution saving throw, taking 18 (4d8) poison damage on a failed save, or half as much damage on a successful one. If the poison damage reduces the target to 0 hit points, the target is stable but poisoned for 1 hour, even after regaining hit points, and is paralyzed while poisoned in this way.",
          "attack_bonus": 4,
          "damage_dice": "1d10",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Pit Fiend",
      "size": "Large",
      "type": "fiend",
      "subtype": "devil",
      "alignment": "lawful evil",
      "armor_class": 19,
      "hit_points": 300,
      "hit_dice": "24d10",
      "speed": "30 ft., fly 60 ft.",
      "strength": 26,
      "dexterity": 14,
      "constitution": 24,
      "intelligence": 22,
      "wisdom": 18,
      "charisma": 24,
      "dexterity_save": 8,
      "constitution_save": 13,
      "wisdom_save": 10,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "truesight 120 ft., passive Perception 14",
      "languages": "Infernal, telepathy 120 ft.",
      "challenge_rating": "20",
      "special_abilities": [
        {
          "name": "Fear Aura",
          "desc": "Any creature hostile to the pit fiend that starts its turn within 20 feet of the pit fiend must make a DC 21 Wisdom saving throw, unless the pit fiend is incapacitated. On a failed save, the creature is frightened until the start of its next turn. If a creature's saving throw is successful, the creature is immune to the pit fiend's Fear Aura for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The pit fiend has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The pit fiend's weapon attacks are magical.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The pit fiend's spellcasting ability is Charisma (spell save DC 21). The pit fiend can innately cast the following spells, requiring no material components:\nAt will: detect magic, fireball\n3/day each: hold monster, wall of fire",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The pit fiend makes four attacks: one with its bite, one with its claw, one with its mace, and one with its tail.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +14 to hit, reach 5 ft., one target. Hit: 22 (4d6 + 8) piercing damage. The target must succeed on a DC 21 Constitution saving throw or become poisoned. While poisoned in this way, the target can't regain hit points, and it takes 21 (6d6) poison damage at the start of each of its turns. The poisoned target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 14,
          "damage_dice": "4d6",
          "damage_bonus": 8
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10 ft. , one target. Hit: 17 (2d8 + 8) slashing damage.",
          "attack_bonus": 14,
          "damage_dice": "2d8",
          "damage_bonus": 8
        },
        {
          "name": "Mace",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10ft., one target. Hit: 15 (2d6 + 8) bludgeoning damage plus 21 (6d6) fire damage.",
          "attack_bonus": 14,
          "damage_dice": "2d6",
          "damage_bonus": 8
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10ft., one target. Hit: 24 (3d1O + 8) bludgeoning damage.",
          "attack_bonus": 14,
          "damage_dice": "3d10",
          "damage_bonus": 8
        }
      ]
    },
    {
      "name": "Planetar",
      "size": "Large",
      "type": "celestial",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 19,
      "hit_points": 200,
      "hit_dice": "16d10",
      "speed": "40 ft., fly 120 ft.",
      "strength": 24,
      "dexterity": 20,
      "constitution": 24,
      "intelligence": 19,
      "wisdom": 22,
      "charisma": 25,
      "constitution_save": 12,
      "wisdom_save": 11,
      "charisma_save": 12,
      "perception": 11,
      "damage_vulnerabilities": "",
      "damage_resistances": "radiant; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "",
      "condition_immunities": "charmed, exhaustion, frightened",
      "senses": "truesight 120 ft., passive Perception 21",
      "languages": "all, telepathy 120 ft.",
      "challenge_rating": "16",
      "special_abilities": [
        {
          "name": "Angelic Weapons",
          "desc": "The planetar's weapon attacks are magical. When the planetar hits with any weapon, the weapon deals an extra 5d8 radiant damage (included in the attack).",
          "attack_bonus": 0
        },
        {
          "name": "Divine Awareness",
          "desc": "The planetar knows if it hears a lie.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The planetar's spellcasting ability is Charisma (spell save DC 20). The planetar can innately cast the following spells, requiring no material components:\nAt will: detect evil and good, invisibility (self only)\n3/day each: blade barrier, dispel evil and good, flame strike, raise dead\n1/day each: commune, control weather, insect plague",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The planetar has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The planetar makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greatsword",
          "desc": "Melee Weapon Attack: +12 to hit, reach 5 ft., one target. Hit: 21 (4d6 + 7) slashing damage plus 22 (5d8) radiant damage.",
          "attack_bonus": 12,
          "damage_dice": "4d6 + 5d8",
          "damage_bonus": 7
        },
        {
          "name": "Healing Touch (4/Day)",
          "desc": "The planetar touches another creature. The target magically regains 30 (6d8 + 3) hit points and is freed from any curse, disease, poison, blindness, or deafness.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Plesiosaurus",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 68,
      "hit_dice": "8d10",
      "speed": "20 ft., swim 40 ft.",
      "strength": 18,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 5,
      "perception": 3,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Hold Breath",
          "desc": "The plesiosaurus can hold its breath for 1 hour.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 10 ft., one target. Hit: 14 (3d6 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "3d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Poisonous Snake",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 2,
      "hit_dice": "1d4",
      "speed": "30 ft., swim 30 ft.",
      "strength": 2,
      "dexterity": 16,
      "constitution": 11,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1 piercing damage, and the target must make a DC 10 Constitution saving throw, taking 5 (2d4) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 5,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Polar Bear",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 42,
      "hit_dice": "5d10",
      "speed": "40 ft., swim 30 ft.",
      "strength": 20,
      "dexterity": 10,
      "constitution": 16,
      "intelligence": 2,
      "wisdom": 13,
      "charisma": 7,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The bear has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The bear makes two attacks: one with its bite and one with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (1d8 + 5) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "1d8",
          "damage_bonus": 5
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Pony",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "40 ft.",
      "strength": 15,
      "dexterity": 10,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 11,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) bludgeoning damage.",
          "attack_bonus": 4,
          "damage_dice": "2d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Priest",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 13,
      "hit_points": 27,
      "hit_dice": "5d8",
      "speed": "25 ft.",
      "strength": 10,
      "dexterity": 10,
      "constitution": 12,
      "intelligence": 13,
      "wisdom": 16,
      "charisma": 13,
      "medicine": 7,
      "persuasion": 3,
      "religion": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "any two languages",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Divine Eminence",
          "desc": "As a bonus action, the priest can expend a spell slot to cause its melee weapon attacks to magically deal an extra 10 (3d6) radiant damage to a target on a hit. This benefit lasts until the end of the turn. If the priest expends a spell slot of 2nd level or higher, the extra damage increases by 1d6 for each level above 1st.",
          "attack_bonus": 0,
          "damage_dice": "3d6"
        },
        {
          "name": "Spellcasting",
          "desc": "The priest is a 5th-level spellcaster. Its spellcasting ability is Wisdom (spell save DC 13, +5 to hit with spell attacks). The priest has the following cleric spells prepared:\n\n• Cantrips (at will): light, sacred flame, thaumaturgy\n• 1st level (4 slots): cure wounds, guiding bolt, sanctuary\n• 2nd level (3 slots): lesser restoration, spiritual weapon\n• 3rd level (2 slots): dispel magic, spirit guardians",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Mace",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 3 (1d6) bludgeoning damage.",
          "attack_bonus": 2,
          "damage_dice": "1d6"
        }
      ]
    },
    {
      "name": "Pseudodragon",
      "size": "Tiny",
      "type": "dragon",
      "subtype": "",
      "alignment": "neutral good",
      "armor_class": 13,
      "hit_points": 7,
      "hit_dice": "2d4",
      "speed": "15 ft., fly 60 ft.",
      "strength": 6,
      "dexterity": 15,
      "constitution": 13,
      "intelligence": 10,
      "wisdom": 12,
      "charisma": 10,
      "perception": 3,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 13",
      "languages": "understands Common and Draconic but can't speak",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Keen Senses",
          "desc": "The pseudodragon has advantage on Wisdom (Perception) checks that rely on sight, hearing, or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The pseudodragon has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Limited Telepathy",
          "desc": "The pseudodragon can magically communicate simple ideas, emotions, and images telepathically with any creature within 100 ft. of it that can understand a language.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Familiar",
          "desc": "The pseudodragon can serve another creature as a familiar, forming a magic, telepathic bond with that willing companion. While the two are bonded, the companion can sense what the pseudodragon senses as long as they are within 1 mile of each other. While the pseudodragon is within 10 feet of its companion, the companion shares the pseudodragon's Magic Resistance trait. At any time and for any reason, the pseudodragon can end its service as a familiar, ending the telepathic bond.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Sting",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 4 (1d4 + 2) piercing damage, and the target must succeed on a DC 11 Constitution saving throw or become poisoned for 1 hour. If the saving throw fails by 5 or more, the target falls unconscious for the same duration, or until it takes damage or another creature uses an action to shake it awake.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Purple Worm",
      "size": "Gargantuan",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 18,
      "hit_points": 247,
      "hit_dice": "15d20",
      "speed": "50 ft., burrow 30 ft.",
      "strength": 28,
      "dexterity": 7,
      "constitution": 22,
      "intelligence": 1,
      "wisdom": 8,
      "charisma": 4,
      "constitution_save": 11,
      "wisdom_save": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., tremorsense 60 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "15",
      "special_abilities": [
        {
          "name": "Tunneler",
          "desc": "The worm can burrow through solid rock at half its burrow speed and leaves a 10-foot-diameter tunnel in its wake.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The worm makes two attacks: one with its bite and one with its stinger.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 22 (3d8 + 9) piercing damage. If the target is a Large or smaller creature, it must succeed on a DC 19 Dexterity saving throw or be swallowed by the worm. A swallowed creature is blinded and restrained, it has total cover against attacks and other effects outside the worm, and it takes 21 (6d6) acid damage at the start of each of the worm's turns.\nIf the worm takes 30 damage or more on a single turn from a creature inside it, the worm must succeed on a DC 21 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, which fall prone in a space within 10 feet of the worm. If the worm dies, a swallowed creature is no longer restrained by it and can escape from the corpse by using 20 feet of movement, exiting prone.",
          "attack_bonus": 9,
          "damage_dice": "3d8",
          "damage_bonus": 9
        },
        {
          "name": "Tail Stinger",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one creature. Hit: 19 (3d6 + 9) piercing damage, and the target must make a DC 19 Constitution saving throw, taking 42 (12d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 9,
          "damage_dice": "3d6",
          "damage_bonus": 9
        }
      ]
    },
    {
      "name": "Quasit",
      "size": "Tiny",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 13,
      "hit_points": 7,
      "hit_dice": "3d4",
      "speed": "40 ft.",
      "strength": 5,
      "dexterity": 17,
      "constitution": 10,
      "intelligence": 7,
      "wisdom": 10,
      "charisma": 10,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold; fire; lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 10",
      "languages": "Abyssal, Common",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The quasit can use its action to polymorph into a beast form that resembles a bat (speed 10 ft. fly 40 ft.), a centipede (40 ft., climb 40 ft.), or a toad (40 ft., swim 40 ft.), or back into its true form . Its statistics are the same in each form, except for the speed changes noted. Any equipment it is wearing or carrying isn't transformed . It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The quasit has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Familiar",
          "desc": "The quasit can serve another creature as a familiar, forming a telepathic bond with its willing master. While the two are bonded, the master can sense what the quasit senses as long as they are within 1 mile of each other. While the quasit is within 10 feet of its master, the master shares the quasit's Magic Resistance trait. At any time and for any reason, the quasit can end its service as a familiar, ending the telepathic bond.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claw (Bite in Beast Form)",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft ., one target. Hit: 5 (1d4 + 3) piercing damage, and the target must succeed on a DC 10 Constitution saving throw or take 5 (2d4) poison damage and become poisoned for 1 minute. The target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 3
        },
        {
          "name": "Scare (1/day)",
          "desc": "One creature of the quasit's choice within 20 ft. of it must succeed on a DC 10 Wisdom saving throw or be frightened for 1 minute. The target can repeat the saving throw at the end of each of its turns, with disadvantage if the quasit is within line of sight, ending the effect on itself on a success.",
          "attack_bonus": 0
        },
        {
          "name": "Invisibility",
          "desc": "The quasit magically turns invisible until it attacks or uses Scare, or until its concentration ends (as if concentrating on a spell). Any equipment the quasit wears or carries is invisible with it.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Quipper",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "swim 40 ft.",
      "strength": 2,
      "dexterity": 16,
      "constitution": 9,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Blood Frenzy",
          "desc": "The quipper has advantage on melee attack rolls against any creature that doesn't have all its hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Water Breathing",
          "desc": "The quipper can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1 piercing damage.",
          "attack_bonus": 5,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Rakshasa",
      "size": "Medium",
      "type": "fiend",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 16,
      "hit_points": 110,
      "hit_dice": "13d8",
      "speed": "40 ft.",
      "strength": 14,
      "dexterity": 17,
      "constitution": 18,
      "intelligence": 13,
      "wisdom": 16,
      "charisma": 20,
      "deception": 10,
      "insight": 8,
      "damage_vulnerabilities": "piercing from magic weapons wielded by good creatures",
      "damage_resistances": "",
      "damage_immunities": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "Common, Infernal",
      "challenge_rating": "13",
      "special_abilities": [
        {
          "name": "Limited Magic Immunity",
          "desc": "The rakshasa can't be affected or detected by spells of 6th level or lower unless it wishes to be. It has advantage on saving throws against all other spells and magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The rakshasa's innate spellcasting ability is Charisma (spell save DC 18, +10 to hit with spell attacks). The rakshasa can innately cast the following spells, requiring no material components:\n\nAt will: detect thoughts, disguise self, mage hand, minor illusion\n3/day each: charm person, detect magic, invisibility, major image, suggestion\n1/day each: dominate person, fly, plane shift, true seeing",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The rakshasa makes two claw attacks",
          "attack_bonus": 0
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 9 (2d6 + 2) slashing damage, and the target is cursed if it is a creature. The magical curse takes effect whenever the target takes a short or long rest, filling the target's thoughts with horrible images and dreams. The cursed target gains no benefit from finishing a short or long rest. The curse lasts until it is lifted by a remove curse spell or similar magic.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Rat",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "20 ft.",
      "strength": 2,
      "dexterity": 11,
      "constitution": 9,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The rat has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +0 to hit, reach 5 ft., one target. Hit: 1 piercing damage.",
          "attack_bonus": 0,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Raven",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "10 ft., fly 50 ft.",
      "strength": 2,
      "dexterity": 14,
      "constitution": 8,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 6,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Mimicry",
          "desc": "The raven can mimic simple sounds it has heard, such as a person whispering, a baby crying, or an animal chittering. A creature that hears the sounds can tell they are imitations with a successful DC 10 Wisdom (Insight) check.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 1 piercing damage.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Red Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 17,
      "hit_points": 75,
      "hit_dice": "10d8",
      "speed": "30 ft., climb 30 ft., fly 60 ft.",
      "strength": 19,
      "dexterity": 10,
      "constitution": 17,
      "intelligence": 12,
      "wisdom": 11,
      "charisma": 15,
      "dexterity_save": 2,
      "constitution_save": 5,
      "wisdom_save": 2,
      "charisma_save": 4,
      "perception": 4,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "4",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (1d10 + 4) piercing damage plus 3 (1d6) fire damage.",
          "attack_bonus": 6,
          "damage_dice": "1d10 + 1d6",
          "damage_bonus": 4
        },
        {
          "name": "Fire Breath (Recharge 5-6)",
          "desc": "The dragon exhales fire in a 15-foot cone. Each creature in that area must make a DC l3 Dexterity saving throw, taking 24 (7d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "7d6"
        }
      ]
    },
    {
      "name": "Reef Shark",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "4d8",
      "speed": "swim 40 ft.",
      "strength": 14,
      "dexterity": 13,
      "constitution": 13,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 4,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Pack Tactics",
          "desc": "The shark has advantage on an attack roll against a creature if at least one of the shark's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        },
        {
          "name": "Water Breathing",
          "desc": "The shark can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Remorhaz",
      "size": "Huge",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 17,
      "hit_points": 195,
      "hit_dice": "17d12",
      "speed": "30 ft., burrow 20 ft.",
      "strength": 24,
      "dexterity": 13,
      "constitution": 21,
      "intelligence": 4,
      "wisdom": 10,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold, fire",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., tremorsense 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "11",
      "special_abilities": [
        {
          "name": "Heated Body",
          "desc": "A creature that touches the remorhaz or hits it with a melee attack while within 5 feet of it takes 10 (3d6) fire damage.",
          "attack_bonus": 0,
          "damage_dice": "3d6"
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +11 to hit, reach 10 ft., one target. Hit: 40 (6d10 + 7) piercing damage plus 10 (3d6) fire damage. If the target is a creature, it is grappled (escape DC 17). Until this grapple ends, the target is restrained, and the remorhaz can't bite another target.",
          "attack_bonus": 11,
          "damage_dice": "6d10 + 3d6",
          "damage_bonus": 7
        },
        {
          "name": "Swallow",
          "desc": "The remorhaz makes one bite attack against a Medium or smaller creature it is grappling. If the attack hits, that creature takes the bite's damage and is swallowed, and the grapple ends. While swallowed, the creature is blinded and restrained, it has total cover against attacks and other effects outside the remorhaz, and it takes 21 (6d6) acid damage at the start of each of the remorhaz's turns.\nIf the remorhaz takes 30 damage or more on a single turn from a creature inside it, the remorhaz must succeed on a DC 15 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, which fall prone in a space within 10 feet oft he remorhaz. If the remorhaz dies, a swallowed creature is no longer restrained by it and can escape from the corpse using 15 feet of movement, exiting prone.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Rhinoceros",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 45,
      "hit_dice": "6d10",
      "speed": "40 ft.",
      "strength": 21,
      "dexterity": 8,
      "constitution": 15,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the rhinoceros moves at least 20 ft. straight toward a target and then hits it with a gore attack on the same turn, the target takes an extra 9 (2d8) bludgeoning damage. If the target is a creature, it must succeed on a DC 15 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d8"
        }
      ],
      "actions": [
        {
          "name": "Gore",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 14 (2d8 + 5) bludgeoning damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Riding Horse",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 13,
      "hit_dice": "2d10",
      "speed": "60 ft.",
      "strength": 16,
      "dexterity": 10,
      "constitution": 12,
      "intelligence": 2,
      "wisdom": 11,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (2d4 + 3) bludgeoning damage.",
          "attack_bonus": 5,
          "damage_dice": "2d4",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Roc",
      "size": "Gargantuan",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 15,
      "hit_points": 248,
      "hit_dice": "16d20",
      "speed": "20 ft., fly 120 ft.",
      "strength": 28,
      "dexterity": 10,
      "constitution": 20,
      "intelligence": 3,
      "wisdom": 10,
      "charisma": 9,
      "dexterity_save": 4,
      "constitution_save": 9,
      "wisdom_save": 4,
      "charisma_save": 3,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "",
      "challenge_rating": "11",
      "special_abilities": [
        {
          "name": "Keen Sight",
          "desc": "The roc has advantage on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The roc makes two attacks: one with its beak and one with its talons.",
          "attack_bonus": 0
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +13 to hit, reach 10 ft., one target. Hit: 27 (4d8 + 9) piercing damage.",
          "attack_bonus": 13,
          "damage_dice": "4d8",
          "damage_bonus": 9
        },
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +13 to hit, reach 5 ft., one target. Hit: 23 (4d6 + 9) slashing damage, and the target is grappled (escape DC 19). Until this grapple ends, the target is restrained, and the roc can't use its talons on another target.",
          "attack_bonus": 13,
          "damage_dice": "4d6",
          "damage_bonus": 9
        }
      ]
    },
    {
      "name": "Roper",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 20,
      "hit_points": 93,
      "hit_dice": "11d10",
      "speed": "10 ft., climb 10 ft.",
      "strength": 18,
      "dexterity": 8,
      "constitution": 17,
      "intelligence": 7,
      "wisdom": 16,
      "charisma": 6,
      "perception": 6,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 16",
      "languages": "",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "False Appearance",
          "desc": "While the roper remains motionless, it is indistinguishable from a normal cave formation, such as a stalagmite.",
          "attack_bonus": 0
        },
        {
          "name": "Grasping Tendrils",
          "desc": "The roper can have up to six tendrils at a time. Each tendril can be attacked (AC 20; 10 hit points; immunity to poison and psychic damage). Destroying a tendril deals no damage to the roper, which can extrude a replacement tendril on its next turn. A tendril can also be broken if a creature takes an action and succeeds on a DC 15 Strength check against it.",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The roper can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The roper makes four attacks with its tendrils, uses Reel, and makes one attack with its bite.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 22 (4d8 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "4d8",
          "damage_bonus": 4
        },
        {
          "name": "Tendril",
          "desc": "Melee Weapon Attack: +7 to hit, reach 50 ft., one creature. Hit: The target is grappled (escape DC 15). Until the grapple ends, the target is restrained and has disadvantage on Strength checks and Strength saving throws, and the roper can't use the same tendril on another target.",
          "attack_bonus": 7
        },
        {
          "name": "Reel",
          "desc": "The roper pulls each creature grappled by it up to 25 ft. straight toward it.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Rug of Smothering",
      "size": "Large",
      "type": "construct",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 33,
      "hit_dice": "6d10",
      "speed": "10 ft.",
      "strength": 17,
      "dexterity": 14,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 3,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison, psychic",
      "condition_immunities": "blinded, charmed, deafened, frightened, paralyzed, petrified, poisoned",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 6",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Antimagic Susceptibility",
          "desc": "The rug is incapacitated while in the area of an antimagic field. If targeted by dispel magic, the rug must succeed on a Constitution saving throw against the caster's spell save DC or fall unconscious for 1 minute.",
          "attack_bonus": 0
        },
        {
          "name": "Damage Transfer",
          "desc": "While it is grappling a creature, the rug takes only half the damage dealt to it, and the creature grappled by the rug takes the other half.",
          "attack_bonus": 0
        },
        {
          "name": "False Appearance",
          "desc": "While the rug remains motionless, it is indistinguishable from a normal rug.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Smother",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one Medium or smaller creature. Hit: The creature is grappled (escape DC 13). Until this grapple ends, the target is restrained, blinded, and at risk of suffocating, and the rug can't smother another target. In addition, at the start of each of the target's turns, the target takes 10 (2d6 + 3) bludgeoning damage.",
          "attack_bonus": 0,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Rust Monster",
      "size": "Medium",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 27,
      "hit_dice": "5d8",
      "speed": "40 ft.",
      "strength": 13,
      "dexterity": 12,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 13,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Iron Scent",
          "desc": "The rust monster can pinpoint, by scent, the location of ferrous metal within 30 feet of it.",
          "attack_bonus": 0
        },
        {
          "name": "Rust Metal",
          "desc": "Any nonmagical weapon made of metal that hits the rust monster corrodes. After dealing damage, the weapon takes a permanent and cumulative -1 penalty to damage rolls. If its penalty drops to -5, the weapon is destroyed. Non magical ammunition made of metal that hits the rust monster is destroyed after dealing damage.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 5 (1d8 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d8",
          "damage_bonus": 1
        },
        {
          "name": "Antennae",
          "desc": "The rust monster corrodes a nonmagical ferrous metal object it can see within 5 feet of it. If the object isn't being worn or carried, the touch destroys a 1-foot cube of it. If the object is being worn or carried by a creature, the creature can make a DC 11 Dexterity saving throw to avoid the rust monster's touch.\nIf the object touched is either metal armor or a metal shield being worn or carried, its takes a permanent and cumulative -1 penalty to the AC it offers. Armor reduced to an AC of 10 or a shield that drops to a +0 bonus is destroyed. If the object touched is a held metal weapon, it rusts as described in the Rust Metal trait.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Saber-Toothed Tiger",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 52,
      "hit_dice": "7d10",
      "speed": "40 ft.",
      "strength": 18,
      "dexterity": 14,
      "constitution": 15,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 8,
      "perception": 3,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The tiger has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pounce",
          "desc": "If the tiger moves at least 20 ft. straight toward a creature and then hits it with a claw attack on the same turn, that target must succeed on a DC 14 Strength saving throw or be knocked prone. If the target is prone, the tiger can make one bite attack against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (1d10 + 5) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d10",
          "damage_bonus": 5
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 5
        }
      ]
    },
    {
      "name": "Sahuagin",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "sahuagin",
      "alignment": "lawful evil",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "4d8",
      "speed": "30 ft., swim 40 ft.",
      "strength": 13,
      "dexterity": 11,
      "constitution": 12,
      "intelligence": 12,
      "wisdom": 13,
      "charisma": 9,
      "perception": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 15",
      "languages": "Sahuagin",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Blood Frenzy",
          "desc": "The sahuagin has advantage on melee attack rolls against any creature that doesn't have all its hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Limited Amphibiousness",
          "desc": "The sahuagin can breathe air and water, but it needs to be submerged at least once every 4 hours to avoid suffocating.",
          "attack_bonus": 0
        },
        {
          "name": "Shark Telepathy",
          "desc": "The sahuagin can magically command any shark within 120 feet of it, using a limited telepathy.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The sahuagin makes two melee attacks: one with its bite and one with its claws or spear.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d4",
          "damage_bonus": 1
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 3 (1d4 + 1) slashing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d4",
          "damage_bonus": 1
        },
        {
          "name": "Spear",
          "desc": "Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Salamander",
      "size": "Large",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 15,
      "hit_points": 90,
      "hit_dice": "12d10",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 14,
      "constitution": 15,
      "intelligence": 11,
      "wisdom": 10,
      "charisma": 12,
      "damage_vulnerabilities": "cold",
      "damage_resistances": "bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Ignan",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Heated Body",
          "desc": "A creature that touches the salamander or hits it with a melee attack while within 5 ft. of it takes 7 (2d6) fire damage.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        },
        {
          "name": "Heated Weapons",
          "desc": "Any metal melee weapon the salamander wields deals an extra 3 (1d6) fire damage on a hit (included in the attack).",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The salamander makes two attacks: one with its spear and one with its tail.",
          "attack_bonus": 0
        },
        {
          "name": "Spear",
          "desc": "Melee or Ranged Weapon Attack: +7 to hit, reach 5 ft. or range 20 ft./60 ft., one target. Hit: 11 (2d6 + 4) piercing damage, or 13 (2d8 + 4) piercing damage if used with two hands to make a melee attack, plus 3 (1d6) fire damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage plus 7 (2d6) fire damage, and the target is grappled (escape DC 14). Until this grapple ends, the target is restrained, the salamander can automatically hit the target with its tail, and the salamander can't make tail attacks against other targets.",
          "attack_bonus": 7,
          "damage_dice": "2d6 + 2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Satyr",
      "size": "Medium",
      "type": "fey",
      "subtype": "",
      "alignment": "chaotic neutral",
      "armor_class": 14,
      "hit_points": 31,
      "hit_dice": "7d8",
      "speed": "40 ft.",
      "strength": 12,
      "dexterity": 16,
      "constitution": 11,
      "intelligence": 12,
      "wisdom": 10,
      "charisma": 14,
      "perception": 2,
      "performance": 6,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "Common, Elvish, Sylvan",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Magic Resistance",
          "desc": "The satyr has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Ram",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 6 (2d4 + 1) bludgeoning damage.",
          "attack_bonus": 3,
          "damage_dice": "2d4",
          "damage_bonus": 1
        },
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1 d6 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Shortbow",
          "desc": "Ranged Weapon Attack: +5 to hit, range 80/320 ft., one target. Hit: 6 (1d6 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Variant: Panpipes",
          "desc": "Gentle Lullaby. The creature falls asleep and is unconscious for 1 minute. The effect ends if the creature takes damage or if someone takes an action to shake the creature awake.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Scorpion",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "10 ft.",
      "strength": 2,
      "dexterity": 11,
      "constitution": 8,
      "intelligence": 1,
      "wisdom": 8,
      "charisma": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "0",
      "actions": [
        {
          "name": "Sting",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 1 piercing damage, and the target must make a DC 9 Constitution saving throw, taking 4 (1d8) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 2,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Scout",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 13,
      "hit_points": 16,
      "hit_dice": "3d8",
      "speed": "30 ft.",
      "strength": 11,
      "dexterity": 14,
      "constitution": 12,
      "intelligence": 11,
      "wisdom": 13,
      "charisma": 11,
      "nature": 4,
      "perception": 5,
      "stealth": 6,
      "survival": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 15",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Keen Hearing and Sight",
          "desc": "The scout has advantage on Wisdom (Perception) checks that rely on hearing or sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The scout makes two melee attacks or two ranged attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +4 to hit, ranged 150/600 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Sea Hag",
      "size": "Medium",
      "type": "fey",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 14,
      "hit_points": 52,
      "hit_dice": "7d8",
      "speed": "30 ft., swim 40 ft.",
      "strength": 16,
      "dexterity": 13,
      "constitution": 16,
      "intelligence": 12,
      "wisdom": 12,
      "charisma": 13,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 11",
      "languages": "Aquan, Common, Giant",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The hag can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Horrific Appearance",
          "desc": "Any humanoid that starts its turn within 30 feet of the hag and can see the hag's true form must make a DC 11 Wisdom saving throw. On a failed save, the creature is frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, with disadvantage if the hag is within line of sight, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the hag's Horrific Appearance for the next 24 hours.\nUnless the target is surprised or the revelation of the hag's true form is sudden, the target can avert its eyes and avoid making the initial saving throw. Until the start of its next turn, a creature that averts its eyes has disadvantage on attack rolls against the hag.",
          "attack_bonus": 0
        },
        {
          "name": "Hag Coven",
          "desc": "When hags must work together, they form covens, in spite of their selfish natures. A coven is made up of hags of any type, all of whom are equals within the group. However, each of the hags continues to desire more personal power.\nA coven consists of three hags so that any arguments between two hags can be settled by the third. If more than three hags ever come together, as might happen if two covens come into conflict, the result is usually chaos.",
          "attack_bonus": 0
        },
        {
          "name": "Shared Spellcasting (Coven Only)",
          "desc": "While all three members of a hag coven are within 30 feet of one another, they can each cast the following spells from the wizard's spell list but must share the spell slots among themselves:\n\n• 1st level (4 slots): identify, ray of sickness\n• 2nd level (3 slots): hold person, locate object\n• 3rd level (3 slots): bestow curse, counterspell, lightning bolt\n• 4th level (3 slots): phantasmal killer, polymorph\n• 5th level (2 slots): contact other plane, scrying\n• 6th level (1 slot): eye bite\n\nFor casting these spells, each hag is a 12th-level spellcaster that uses Intelligence as her spellcasting ability. The spell save DC is 12+the hag's Intelligence modifier, and the spell attack bonus is 4+the hag's Intelligence modifier.",
          "attack_bonus": 0
        },
        {
          "name": "Hag Eye (Coven Only)",
          "desc": "A hag coven can craft a magic item called a hag eye, which is made from a real eye coated in varnish and often fitted to a pendant or other wearable item. The hag eye is usually entrusted to a minion for safekeeping and transport. A hag in the coven can take an action to see what the hag eye sees if the hag eye is on the same plane of existence. A hag eye has AC 10, 1 hit point, and darkvision with a radius of 60 feet. If it is destroyed, each coven member takes 3d10 psychic damage and is blinded for 24 hours.\nA hag coven can have only one hag eye at a time, and creating a new one requires all three members of the coven to perform a ritual. The ritual takes 1 hour, and the hags can't perform it while blinded. During the ritual, if the hags take any action other than performing the ritual, they must start over.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Death Glare",
          "desc": "The hag targets one frightened creature she can see within 30 ft. of her. If the target can see the hag, it must succeed on a DC 11 Wisdom saving throw against this magic or drop to 0 hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Illusory Appearance",
          "desc": "The hag covers herself and anything she is wearing or carrying with a magical illusion that makes her look like an ugly creature of her general size and humanoid shape. The effect ends if the hag takes a bonus action to end it or if she dies.\nThe changes wrought by this effect fail to hold up to physical inspection. For example, the hag could appear to have no claws, but someone touching her hand might feel the claws. Otherwise, a creature must take an action to visually inspect the illusion and succeed on a DC 16 Intelligence (Investigation) check to discern that the hag is disguised.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Sea Horse",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "swim 20 ft.",
      "strength": 1,
      "dexterity": 12,
      "constitution": 8,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Water Breathing",
          "desc": "The sea horse can breathe only underwater.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Shadow",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 12,
      "hit_points": 16,
      "hit_dice": "3d8",
      "speed": "40 ft.",
      "strength": 6,
      "dexterity": 14,
      "constitution": 13,
      "intelligence": 6,
      "wisdom": 10,
      "charisma": 8,
      "stealth": 4,
      "damage_vulnerabilities": "radiant",
      "damage_resistances": "acid, cold, fire, lightning, thunder; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "necrotic, poison",
      "condition_immunities": "exhaustion, frightened, grappled, paralyzed, petrified, poisoned, prone, restrained",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Amorphous",
          "desc": "The shadow can move through a space as narrow as 1 inch wide without squeezing.",
          "attack_bonus": 0
        },
        {
          "name": "Shadow Stealth",
          "desc": "While in dim light or darkness, the shadow can take the Hide action as a bonus action. Its stealth bonus is also improved to +6.",
          "attack_bonus": 0
        },
        {
          "name": "Sunlight Weakness",
          "desc": "While in sunlight, the shadow has disadvantage on attack rolls, ability checks, and saving throws.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Strength Drain",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 9 (2d6 + 2) necrotic damage, and the target's Strength score is reduced by 1d4. The target dies if this reduces its Strength to 0. Otherwise, the reduction lasts until the target finishes a short or long rest.\nIf a non-evil humanoid dies from this attack, a new shadow rises from the corpse 1d4 hours later.",
          "attack_bonus": 4,
          "damage_dice": "2d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Shambling Mound",
      "size": "Large",
      "type": "plant",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 15,
      "hit_points": 136,
      "hit_dice": "16d10",
      "speed": "20 ft., swim 20 ft.",
      "strength": 18,
      "dexterity": 8,
      "constitution": 16,
      "intelligence": 5,
      "wisdom": 10,
      "charisma": 5,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire",
      "damage_immunities": "lightning",
      "condition_immunities": "blinded, deafened, exhaustion",
      "senses": "blindsight 60 ft. (blind beyond this radius), passive Perception 10",
      "languages": "",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Lightning Absorption",
          "desc": "Whenever the shambling mound is subjected to lightning damage, it takes no damage and regains a number of hit points equal to the lightning damage dealt.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The shambling mound makes two slam attacks. If both attacks hit a Medium or smaller target, the target is grappled (escape DC 14), and the shambling mound uses its Engulf on it.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Engulf",
          "desc": "The shambling mound engulfs a Medium or smaller creature grappled by it. The engulfed target is blinded, restrained, and unable to breathe, and it must succeed on a DC 14 Constitution saving throw at the start of each of the mound's turns or take 13 (2d8 + 4) bludgeoning damage. If the mound moves, the engulfed target moves with it. The mound can have only one creature engulfed at a time.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Shield Guardian",
      "size": "Large",
      "type": "construct",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 17,
      "hit_points": 142,
      "hit_dice": "15d10",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 8,
      "constitution": 18,
      "intelligence": 7,
      "wisdom": 10,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, poisoned",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 10",
      "languages": "understands commands given in any language but can't speak",
      "challenge_rating": "7",
      "special_abilities": [
        {
          "name": "Bound",
          "desc": "The shield guardian is magically bound to an amulet. As long as the guardian and its amulet are on the same plane of existence, the amulet's wearer can telepathically call the guardian to travel to it, and the guardian knows the distance and direction to the amulet. If the guardian is within 60 feet of the amulet's wearer, half of any damage the wearer takes (rounded up) is transferred to the guardian.",
          "attack_bonus": 0
        },
        {
          "name": "Regeneration",
          "desc": "The shield guardian regains 10 hit points at the start of its turn if it has at least 1 hit. point.",
          "attack_bonus": 0
        },
        {
          "name": "Spell Storing",
          "desc": "A spellcaster who wears the shield guardian's amulet can cause the guardian to store one spell of 4th level or lower. To do so, the wearer must cast the spell on the guardian. The spell has no effect but is stored within the guardian. When commanded to do so by the wearer or when a situation arises that was predefined by the spellcaster, the guardian casts the stored spell with any parameters set by the original caster, requiring no components. When the spell is cast or a new spell is stored, any previously stored spell is lost.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The guardian makes two fist attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Fist",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ],
      "reactions": [
        {
          "name": "Shield",
          "desc": "When a creature makes an attack against the wearer of the guardian's amulet, the guardian grants a +2 bonus to the wearer's AC if the guardian is within 5 feet of the wearer.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Shrieker",
      "size": "Medium",
      "type": "plant",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 5,
      "hit_points": 13,
      "hit_dice": "3d8",
      "speed": "0 ft.",
      "strength": 1,
      "dexterity": 1,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 3,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "blinded, deafened, frightened",
      "senses": "blindsight 30 ft. (blind beyond this radius), passive Perception 6",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "False Appearance",
          "desc": "While the shrieker remains motionless, it is indistinguishable from an ordinary fungus.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Shriek",
          "desc": "When bright light or a creature is within 30 feet of the shrieker, it emits a shriek audible within 300 feet of it. The shrieker continues to shriek until the disturbance moves out of range and for 1d4 of the shrieker's turns afterward",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Silver Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 17,
      "hit_points": 45,
      "hit_dice": "6d8",
      "speed": "30 ft., fly 60 ft.",
      "strength": 19,
      "dexterity": 10,
      "constitution": 17,
      "intelligence": 12,
      "wisdom": 11,
      "charisma": 15,
      "dexterity_save": 2,
      "constitution_save": 5,
      "wisdom_save": 2,
      "charisma_save": 4,
      "perception": 4,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "2",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 9 (1d10 + 4) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d10",
          "damage_bonus": 4
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nCold Breath. The dragon exhales an icy blast in a 15-foot cone. Each creature in that area must make a DC 13 Constitution saving throw, taking 18 (4d8) cold damage on a failed save, or half as much damage on a successful one.\nParalyzing Breath. The dragon exhales paralyzing gas in a 15-foot cone. Each creature in that area must succeed on a DC 13 Constitution saving throw or be paralyzed for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "4d8"
        }
      ]
    },
    {
      "name": "Skeleton",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 13,
      "hit_points": 13,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 14,
      "constitution": 15,
      "intelligence": 6,
      "wisdom": 8,
      "charisma": 5,
      "damage_vulnerabilities": "bludgeoning",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "understands all languages it spoke in life but can't speak",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Shortbow",
          "desc": "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Solar",
      "size": "Large",
      "type": "celestial",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 21,
      "hit_points": 243,
      "hit_dice": "18d10",
      "speed": "50 ft., fly 150 ft.",
      "strength": 26,
      "dexterity": 22,
      "constitution": 26,
      "intelligence": 25,
      "wisdom": 25,
      "charisma": 30,
      "intelligence_save": 14,
      "wisdom_save": 14,
      "charisma_save": 17,
      "perception": 14,
      "damage_vulnerabilities": "",
      "damage_resistances": "radiant; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "necrotic, poison",
      "condition_immunities": "charmed, exhaustion, frightened, poisoned",
      "senses": "truesight 120 ft., passive Perception 24",
      "languages": "all, telepathy 120 ft.",
      "challenge_rating": "21",
      "special_abilities": [
        {
          "name": "Angelic Weapons",
          "desc": "The solar's weapon attacks are magical. When the solar hits with any weapon, the weapon deals an extra 6d8 radiant damage (included in the attack).",
          "attack_bonus": 0
        },
        {
          "name": "Divine Awareness",
          "desc": "The solar knows if it hears a lie.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The solar's spell casting ability is Charisma (spell save DC 25). It can innately cast the following spells, requiring no material components:\nAt will: detect evil and good, invisibility (self only)\n3/day each: blade barrier, dispel evil and good, resurrection\n1/day each: commune, control weather",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The solar has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The solar makes two greatsword attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greatsword",
          "desc": "Melee Weapon Attack: +15 to hit, reach 5 ft., one target. Hit: 22 (4d6 + 8) slashing damage plus 27 (6d8) radiant damage.",
          "attack_bonus": 15,
          "damage_dice": "4d6 + 6d8",
          "damage_bonus": 8
        },
        {
          "name": "Slaying Longbow",
          "desc": "Ranged Weapon Attack: +13 to hit, range 150/600 ft., one target. Hit: 15 (2d8 + 6) piercing damage plus 27 (6d8) radiant damage. If the target is a creature that has 190 hit points or fewer, it must succeed on a DC 15 Constitution saving throw or die.",
          "attack_bonus": 13,
          "damage_dice": "2d8 + 6d8",
          "damage_bonus": 6
        },
        {
          "name": "Flying Sword",
          "desc": "The solar releases its greatsword to hover magically in an unoccupied space within 5 ft. of it. If the solar can see the sword, the solar can mentally command it as a bonus action to fly up to 50 ft. and either make one attack against a target or return to the solar's hands. If the hovering sword is targeted by any effect, the solar is considered to be holding it. The hovering sword falls if the solar dies.",
          "attack_bonus": 0
        },
        {
          "name": "Healing Touch (4/Day)",
          "desc": "The solar touches another creature. The target magically regains 40 (8d8 + 4) hit points and is freed from any curse, disease, poison, blindness, or deafness.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Teleport",
          "desc": "The solar magically teleports, along with any equipment it is wearing or carrying, up to 120 ft. to an unoccupied space it can see.",
          "attack_bonus": 0
        },
        {
          "name": "Searing Burst (Costs 2 Actions)",
          "desc": "The solar emits magical, divine energy. Each creature of its choice in a 10 -foot radius must make a DC 23 Dexterity saving throw, taking 14 (4d6) fire damage plus 14 (4d6) radiant damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0
        },
        {
          "name": "Blinding Gaze (Costs 3 Actions)",
          "desc": "The solar targets one creature it can see within 30 ft. of it. If the target can see it, the target must succeed on a DC 15 Constitution saving throw or be blinded until magic such as the lesser restoration spell removes the blindness.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Specter",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "0 ft., fly 50 ft. (hover)",
      "strength": 1,
      "dexterity": 14,
      "constitution": 11,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 11,
      "damage_vulnerabilities": "",
      "damage_resistances": "acid, cold, fire, lightning, thunder; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "necrotic, poison",
      "condition_immunities": "charmed, exhaustion, grappled, paralyzed, petrified, poisoned, prone, restrained, unconscious",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "understands all languages it knew in life but can't speak",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Incorporeal Movement",
          "desc": "The specter can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.",
          "attack_bonus": 0
        },
        {
          "name": "Sunlight Sensitivity",
          "desc": "While in sunlight, the specter has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Life Drain",
          "desc": "Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 10 (3d6) necrotic damage. The target must succeed on a DC 10 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken. This reduction lasts until the creature finishes a long rest. The target dies if this effect reduces its hit point maximum to 0.",
          "attack_bonus": 4,
          "damage_dice": "3d6"
        }
      ]
    },
    {
      "name": "Spider",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "20 ft., climb 20 ft.",
      "strength": 2,
      "dexterity": 14,
      "constitution": 8,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 2,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 30 ft., passive Perception 12",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Spider Climb",
          "desc": "The spider can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Web Sense",
          "desc": "While in contact with a web, the spider knows the exact location of any other creature in contact with the same web.",
          "attack_bonus": 0
        },
        {
          "name": "Web Walker",
          "desc": "The spider ignores movement restrictions caused by webbing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 1 piercing damage, and the target must succeed on a DC 9 Constitution saving throw or take 2 (1d4) poison damage.",
          "attack_bonus": 4,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Spirit Naga",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 15,
      "hit_points": 75,
      "hit_dice": "10d10",
      "speed": "40 ft.",
      "strength": 18,
      "dexterity": 17,
      "constitution": 14,
      "intelligence": 16,
      "wisdom": 15,
      "charisma": 16,
      "dexterity_save": 6,
      "constitution_save": 5,
      "wisdom_save": 5,
      "charisma_save": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "charmed, poisoned",
      "senses": "darkvision 60 ft., passive Perception 12",
      "languages": "Abyssal, Common",
      "challenge_rating": "8",
      "special_abilities": [
        {
          "name": "Rejuvenation",
          "desc": "If it dies, the naga returns to life in 1d6 days and regains all its hit points. Only a wish spell can prevent this trait from functioning.",
          "attack_bonus": 0
        },
        {
          "name": "Spellcasting",
          "desc": "The naga is a 10th-level spellcaster. Its spellcasting ability is Intelligence (spell save DC 14, +6 to hit with spell attacks), and it needs only verbal components to cast its spells. It has the following wizard spells prepared:\n\n• Cantrips (at will): mage hand, minor illusion, ray of frost\n• 1st level (4 slots): charm person, detect magic, sleep\n• 2nd level (3 slots): detect thoughts, hold person\n• 3rd level (3 slots): lightning bolt, water breathing\n• 4th level (3 slots): blight, dimension door\n• 5th level (2 slots): dominate person",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one creature. Hit: 7 (1d6 + 4) piercing damage, and the target must make a DC 13 Constitution saving throw, taking 31 (7d8) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 7,
          "damage_dice": "1d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Sprite",
      "size": "Tiny",
      "type": "fey",
      "subtype": "",
      "alignment": "neutral good",
      "armor_class": 15,
      "hit_points": 2,
      "hit_dice": "1d4",
      "speed": "10 ft., fly 40 ft.",
      "strength": 3,
      "dexterity": 18,
      "constitution": 10,
      "intelligence": 14,
      "wisdom": 13,
      "charisma": 11,
      "perception": 3,
      "stealth": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "Common, Elvish, Sylvan",
      "challenge_rating": "1/4",
      "actions": [
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 1 slashing damage.",
          "attack_bonus": 2,
          "damage_bonus": 1
        },
        {
          "name": "Shortbow",
          "desc": "Ranged Weapon Attack: +6 to hit, range 40/160 ft., one target. Hit: 1 piercing damage, and the target must succeed on a DC 10 Constitution saving throw or become poisoned for 1 minute. If its saving throw result is 5 or lower, the poisoned target falls unconscious for the same duration, or until it takes damage or another creature takes an action to shake it awake.",
          "attack_bonus": 6,
          "damage_bonus": 1
        },
        {
          "name": "Heart Sight",
          "desc": "The sprite touches a creature and magically knows the creature's current emotional state. If the target fails a DC 10 Charisma saving throw, the sprite also knows the creature's alignment. Celestials, fiends, and undead automatically fail the saving throw.",
          "attack_bonus": 0
        },
        {
          "name": "Invisibility",
          "desc": "The sprite magically turns invisible until it attacks or casts a spell, or until its concentration ends (as if concentrating on a spell). Any equipment the sprite wears or carries is invisible with it.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Spy",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 12,
      "hit_points": 27,
      "hit_dice": "6d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 15,
      "constitution": 10,
      "intelligence": 12,
      "wisdom": 14,
      "charisma": 16,
      "deception": 5,
      "insight": 4,
      "investigation": 5,
      "perception": 6,
      "persuasion": 5,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 16",
      "languages": "any two languages",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Cunning Action",
          "desc": "On each of its turns, the spy can use a bonus action to take the Dash, Disengage, or Hide action.",
          "attack_bonus": 0
        },
        {
          "name": "Sneak Attack (1/Turn)",
          "desc": "The spy deals an extra 7 (2d6) damage when it hits a target with a weapon attack and has advantage on the attack roll, or when the target is within 5 ft. of an ally of the spy that isn't incapacitated and the spy doesn't have disadvantage on the attack roll.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The spy makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Hand Crossbow",
          "desc": "Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Steam Mephit",
      "size": "Small",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 10,
      "hit_points": 21,
      "hit_dice": "6d6",
      "speed": "30 ft., fly 30 ft.",
      "strength": 5,
      "dexterity": 11,
      "constitution": 10,
      "intelligence": 11,
      "wisdom": 10,
      "charisma": 12,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire, poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Aquan, Ignan",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Death Burst",
          "desc": "When the mephit dies, it explodes in a cloud of steam. Each creature within 5 ft. of the mephit must succeed on a DC 10 Dexterity saving throw or take 4 (1d8) fire damage.",
          "attack_bonus": 0,
          "damage_dice": "1d8"
        },
        {
          "name": "Innate Spellcasting (1/Day)",
          "desc": "The mephit can innately cast blur, requiring no material components. Its innate spellcasting ability is Charisma.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one creature. Hit: 2 (1d4) slashing damage plus 2 (1d4) fire damage.",
          "attack_bonus": 2,
          "damage_dice": "2d4"
        },
        {
          "name": "Steam Breath (Recharge 6)",
          "desc": "The mephit exhales a 15-foot cone of scalding steam. Each creature in that area must succeed on a DC 10 Dexterity saving throw, taking 4 (1d8) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Mephits (1/Day)",
          "desc": "The mephit has a 25 percent chance of summoning 1d4 mephits of its kind. A summoned mephit appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other mephits. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Stirge",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 2,
      "hit_dice": "1d4",
      "speed": "10 ft., fly 40 ft.",
      "strength": 4,
      "dexterity": 16,
      "constitution": 11,
      "intelligence": 2,
      "wisdom": 8,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "1/8",
      "actions": [
        {
          "name": "Blood Drain",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 5 (1d4 + 3) piercing damage, and the stirge attaches to the target. While attached, the stirge doesn't attack. Instead, at the start of each of the stirge's turns, the target loses 5 (1d4 + 3) hit points due to blood loss.\nThe stirge can detach itself by spending 5 feet of its movement. It does so after it drains 10 hit points of blood from the target or the target dies. A creature, including the target, can use its action to detach the stirge.",
          "attack_bonus": 5,
          "damage_dice": "1d4",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Stone Giant",
      "size": "Huge",
      "type": "giant",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 17,
      "hit_points": 126,
      "hit_dice": "11d12",
      "speed": "40 ft.",
      "strength": 23,
      "dexterity": 15,
      "constitution": 20,
      "intelligence": 10,
      "wisdom": 12,
      "charisma": 9,
      "dexterity_save": 5,
      "constitution_save": 8,
      "wisdom_save": 4,
      "athletics": 12,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Giant",
      "challenge_rating": "7",
      "special_abilities": [
        {
          "name": "Stone Camouflage",
          "desc": "The giant has advantage on Dexterity (Stealth) checks made to hide in rocky terrain.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The giant makes two greatclub attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greatclub",
          "desc": "Melee Weapon Attack: +9 to hit, reach 15 ft., one target. Hit: 19 (3d8 + 6) bludgeoning damage.",
          "attack_bonus": 9,
          "damage_dice": "3d8",
          "damage_bonus": 6
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +9 to hit, range 60/240 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage. If the target is a creature, it must succeed on a DC 17 Strength saving throw or be knocked prone.",
          "attack_bonus": 9,
          "damage_dice": "4d10",
          "damage_bonus": 6
        }
      ],
      "reactions": [
        {
          "name": "Rock Catching",
          "desc": "If a rock or similar object is hurled at the giant, the giant can, with a successful DC 10 Dexterity saving throw, catch the missile and take no bludgeoning damage from it.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Stone Golem",
      "size": "Large",
      "type": "construct",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 17,
      "hit_points": 178,
      "hit_dice": "17d10",
      "speed": "30 ft.",
      "strength": 22,
      "dexterity": 9,
      "constitution": 20,
      "intelligence": 3,
      "wisdom": 11,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison, psychic; bludgeoning, piercing, and slashing from nonmagical weapons that aren't adamantine",
      "condition_immunities": "charmed, exhaustion, frightened, paralyzed, petrified, poisoned",
      "senses": "darkvision 120 ft., passive Perception 10",
      "languages": "understands the languages of its creator but can't speak",
      "challenge_rating": "10",
      "special_abilities": [
        {
          "name": "Immutable Form",
          "desc": "The golem is immune to any spell or effect that would alter its form.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The golem has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The golem's weapon attacks are magical.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The golem makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 19 (3d8 + 6) bludgeoning damage.",
          "attack_bonus": 10,
          "damage_dice": "3d8",
          "damage_bonus": 6
        },
        {
          "name": "Slow (Recharge 5-6)",
          "desc": "The golem targets one or more creatures it can see within 10 ft. of it. Each target must make a DC 17 Wisdom saving throw against this magic. On a failed save, a target can't use reactions, its speed is halved, and it can't make more than one attack on its turn. In addition, the target can take either an action or a bonus action on its turn, not both. These effects last for 1 minute. A target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Storm Giant",
      "size": "Huge",
      "type": "giant",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 16,
      "hit_points": 230,
      "hit_dice": "20d12",
      "speed": "50 ft., swim 50 ft.",
      "strength": 29,
      "dexterity": 14,
      "constitution": 20,
      "intelligence": 16,
      "wisdom": 18,
      "charisma": 18,
      "strength_save": 14,
      "constitution_save": 10,
      "wisdom_save": 9,
      "charisma_save": 9,
      "arcana": 8,
      "athletics": 14,
      "history": 8,
      "perception": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold",
      "damage_immunities": "lightning, thunder",
      "condition_immunities": "",
      "senses": "passive Perception 19",
      "languages": "Common, Giant",
      "challenge_rating": "13",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The giant can breathe air and water.",
          "attack_bonus": 0
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The giant's innate spellcasting ability is Charisma (spell save DC 17). It can innately cast the following spells, requiring no material components:\n\nAt will: detect magic, feather fall, levitate, light\n3/day each: control weather, water breathing",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The giant makes two greatsword attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Greatsword",
          "desc": "Melee Weapon Attack: +14 to hit, reach 10 ft., one target. Hit: 30 (6d6 + 9) slashing damage.",
          "attack_bonus": 14,
          "damage_dice": "6d6",
          "damage_bonus": 9
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +14 to hit, range 60/240 ft., one target. Hit: 35 (4d12 + 9) bludgeoning damage.",
          "attack_bonus": 14,
          "damage_dice": "4d12",
          "damage_bonus": 9
        },
        {
          "name": "Lightning Strike (Recharge 5-6)",
          "desc": "The giant hurls a magical lightning bolt at a point it can see within 500 feet of it. Each creature within 10 feet of that point must make a DC 17 Dexterity saving throw, taking 54 (12d8) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "12d8"
        }
      ]
    },
    {
      "name": "Succubus/Incubus",
      "size": "Medium",
      "type": "fiend",
      "subtype": "shapechanger",
      "alignment": "neutral evil",
      "armor_class": 15,
      "hit_points": 66,
      "hit_dice": "12d8",
      "speed": "30 ft., fly 60 ft.",
      "strength": 8,
      "dexterity": 17,
      "constitution": 13,
      "intelligence": 15,
      "wisdom": 12,
      "charisma": 20,
      "deception": 9,
      "insight": 5,
      "perception": 5,
      "persuasion": 9,
      "stealth": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire, lightning, poison; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 15",
      "languages": "Abyssal, Common, Infernal, telepathy 60 ft.",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Telepathic Bond",
          "desc": "The fiend ignores the range restriction on its telepathy when communicating with a creature it has charmed. The two don't even need to be on the same plane of existence.",
          "attack_bonus": 0
        },
        {
          "name": "Shapechanger",
          "desc": "The fiend can use its action to polymorph into a Small or Medium humanoid, or back into its true form. Without wings, the fiend loses its flying speed. Other than its size and speed, its statistics are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Claw (Fiend Form Only)",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Charm",
          "desc": "One humanoid the fiend can see within 30 feet of it must succeed on a DC 15 Wisdom saving throw or be magically charmed for 1 day. The charmed target obeys the fiend's verbal or telepathic commands. If the target suffers any harm or receives a suicidal command, it can repeat the saving throw, ending the effect on a success. If the target successfully saves against the effect, or if the effect on it ends, the target is immune to this fiend's Charm for the next 24 hours.\nThe fiend can have only one target charmed at a time. If it charms another, the effect on the previous target ends.",
          "attack_bonus": 0
        },
        {
          "name": "Draining Kiss",
          "desc": "The fiend kisses a creature charmed by it or a willing creature. The target must make a DC 15 Constitution saving throw against this magic, taking 32 (5d10 + 5) psychic damage on a failed save, or half as much damage on a successful one. The target's hit point maximum is reduced by an amount equal to the damage taken. This reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0.",
          "attack_bonus": 0,
          "damage_dice": "5d10",
          "damage_bonus": 5
        },
        {
          "name": "Etherealness",
          "desc": "The fiend magically enters the Ethereal Plane from the Material Plane, or vice versa.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Swarm of Bats",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "0 ft., fly 30 ft.",
      "strength": 5,
      "dexterity": 15,
      "constitution": 10,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "blindsight 60 ft., passive Perception 11",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Echolocation",
          "desc": "The swarm can't use its blindsight while deafened.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing",
          "desc": "The swarm has advantage on Wisdom (Perception) checks that rely on hearing.",
          "attack_bonus": 0
        },
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny bat. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +4 to hit, reach 0 ft., one creature in the swarm's space. Hit: 5 (2d4) piercing damage, or 2 (1d4) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 4,
          "damage_dice": "2d4"
        }
      ]
    },
    {
      "name": "Swarm of Beetles",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "20 ft., burrow 5 ft., climb 20 ft.",
      "strength": 3,
      "dexterity": 13,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "blindsight 10 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny insect. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +3 to hit, reach 0 ft., one target in the swarm's space. Hit: 10 (4d4) piercing damage, or 5 (2d4) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 3,
          "damage_dice": "4d4"
        }
      ]
    },
    {
      "name": "Swarm of Centipedes",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "20 ft., climb 20 ft.",
      "strength": 3,
      "dexterity": 13,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "blindsight 10 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny insect. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +3 to hit, reach 0 ft., one target in the swarm's space. Hit: 10 (4d4) piercing damage, or 5 (2d4) piercing damage if the swarm has half of its hit points or fewer.\nA creature reduced to 0 hit points by a swarm of centipedes is stable but poisoned for 1 hour, even after regaining hit points, and paralyzed while poisoned in this way.",
          "attack_bonus": 3,
          "damage_dice": "4d4"
        }
      ]
    },
    {
      "name": "Swarm of Insects",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "20 ft., climb 20 ft.",
      "strength": 3,
      "dexterity": 13,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "blindsight 10 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny insect. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +3 to hit, reach 0 ft., one target in the swarm's space. Hit: 10 (4d4) piercing damage, or 5 (2d4) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 3,
          "damage_dice": "4d4"
        }
      ]
    },
    {
      "name": "Swarm of Poisonous Snakes",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 14,
      "hit_points": 36,
      "hit_dice": "8d8",
      "speed": "30 ft., swim 30 ft.",
      "strength": 8,
      "dexterity": 18,
      "constitution": 11,
      "intelligence": 1,
      "wisdom": 10,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "blindsight 10 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny snake. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +6 to hit, reach 0 ft., one creature in the swarm's space. Hit: 7 (2d6) piercing damage, or 3 (1d6) piercing damage if the swarm has half of its hit points or fewer. The target must make a DC 10 Constitution saving throw, taking 14 (4d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 6,
          "damage_dice": "2d6"
        }
      ]
    },
    {
      "name": "Swarm of Quippers",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 28,
      "hit_dice": "8d8",
      "speed": "0 ft., swim 40 ft.",
      "strength": 13,
      "dexterity": 16,
      "constitution": 9,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "darkvision 60 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Blood Frenzy",
          "desc": "The swarm has advantage on melee attack rolls against any creature that doesn't have all its hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny quipper. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Water Breathing",
          "desc": "The swarm can breathe only underwater.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +5 to hit, reach 0 ft., one creature in the swarm's space. Hit: 14 (4d6) piercing damage, or 7 (2d6) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 5,
          "damage_dice": "4d6"
        }
      ]
    },
    {
      "name": "Swarm of Rats",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 24,
      "hit_dice": "7d8",
      "speed": "30 ft.",
      "strength": 9,
      "dexterity": 11,
      "constitution": 9,
      "intelligence": 2,
      "wisdom": 10,
      "charisma": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "darkvision 30 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The swarm has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny rat. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +2 to hit, reach 0 ft., one target in the swarm's space. Hit: 7 (2d6) piercing damage, or 3 (1d6) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 2,
          "damage_dice": "2d6"
        }
      ]
    },
    {
      "name": "Swarm of Ravens",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 24,
      "hit_dice": "7d8",
      "speed": "10 ft., fly 50 ft.",
      "strength": 6,
      "dexterity": 14,
      "constitution": 8,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "passive Perception 15",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny raven. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Beaks",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target in the swarm's space. Hit: 7 (2d6) piercing damage, or 3 (1d6) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 4,
          "damage_dice": "2d6"
        }
      ]
    },
    {
      "name": "Swarm of Spiders",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "20 ft., climb 20 ft.",
      "strength": 3,
      "dexterity": 13,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, paralyzed, petrified, prone, restrained, stunned",
      "senses": "blindsight 10 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny insect. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The swarm can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Web Sense",
          "desc": "While in contact with a web, the swarm knows the exact location of any other creature in contact with the same web.",
          "attack_bonus": 0
        },
        {
          "name": "Web Walker",
          "desc": "The swarm ignores movement restrictions caused by webbing.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +3 to hit, reach 0 ft., one target in the swarm's space. Hit: 10 (4d4) piercing damage, or 5 (2d4) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 3,
          "damage_dice": "4d4"
        }
      ]
    },
    {
      "name": "Swarm of Wasps",
      "size": "Medium",
      "type": "swarm of Tiny beasts",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 22,
      "hit_dice": "5d8",
      "speed": "5 ft., fly 30 ft.",
      "strength": 3,
      "dexterity": 13,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 7,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "bludgeoning, piercing, slashing",
      "damage_immunities": "",
      "condition_immunities": "charmed, frightened, grappled, paralyzed, petrified, prone, restrained, stunned",
      "senses": "blindsight 10 ft., passive Perception 8",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Swarm",
          "desc": "The swarm can occupy another creature's space and vice versa, and the swarm can move through any opening large enough for a Tiny insect. The swarm can't regain hit points or gain temporary hit points.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bites",
          "desc": "Melee Weapon Attack: +3 to hit, reach 0 ft., one target in the swarm's space. Hit: 10 (4d4) piercing damage, or 5 (2d4) piercing damage if the swarm has half of its hit points or fewer.",
          "attack_bonus": 3,
          "damage_dice": "4d4"
        }
      ]
    },
    {
      "name": "Tarrasque",
      "size": "Gargantuan",
      "type": "monstrosity",
      "subtype": "titan",
      "alignment": "unaligned",
      "armor_class": 25,
      "hit_points": 676,
      "hit_dice": "33d20",
      "speed": "40 ft.",
      "strength": 30,
      "dexterity": 11,
      "constitution": 30,
      "intelligence": 3,
      "wisdom": 11,
      "charisma": 11,
      "intelligence_save": 5,
      "wisdom_save": 9,
      "charisma_save": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire, poison; bludgeoning, piercing, and slashing from nonmagical weapons",
      "condition_immunities": "charmed, frightened, paralyzed, poisoned",
      "senses": "blindsight 120 ft., passive Perception 10",
      "languages": "",
      "challenge_rating": "30",
      "special_abilities": [
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the tarrasque fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The tarrasque has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Reflective Carapace",
          "desc": "Any time the tarrasque is targeted by a magic missile spell, a line spell, or a spell that requires a ranged attack roll, roll a d6. On a 1 to 5, the tarrasque is unaffected. On a 6, the tarrasque is unaffected, and the effect is reflected back at the caster as though it originated from the tarrasque, turning the caster into the target.",
          "attack_bonus": 0
        },
        {
          "name": "Siege Monster",
          "desc": "The tarrasque deals double damage to objects and structures.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The tarrasque can use its Frightful Presence. It then makes five attacks: one with its bite, two with its claws, one with its horns, and one with its tai l. It can use its Swallow instead of its bite.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +19 to hit, reach 10 ft., one target. Hit: 36 (4d12 + 10) piercing damage. If the target is a creature, it is grappled (escape DC 20). Until this grapple ends, the target is restrained, and the tarrasque can't bite another target.",
          "attack_bonus": 19,
          "damage_dice": "4d12",
          "damage_bonus": 10
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +19 to hit, reach 15 ft., one target. Hit: 28 (4d8 + 10) slashing damage.",
          "attack_bonus": 19,
          "damage_dice": "4d8",
          "damage_bonus": 10
        },
        {
          "name": "Horns",
          "desc": "Melee Weapon Attack: +19 to hit, reach 10 ft., one target. Hit: 32 (4d10 + 10) piercing damage.",
          "attack_bonus": 19,
          "damage_dice": "4d10",
          "damage_bonus": 10
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +19 to hit, reach 20 ft., one target. Hit: 24 (4d6 + 10) bludgeoning damage. If the target is a creature, it must succeed on a DC 20 Strength saving throw or be knocked prone.",
          "attack_bonus": 19,
          "damage_dice": "4d6",
          "damage_bonus": 10
        },
        {
          "name": "Frightful Presence",
          "desc": "Each creature of the tarrasque's choice within 120 feet of it and aware of it must succeed on a DC 17 Wisdom saving throw or become frightened for 1 minute. A creature can repeat the saving throw at the end of each of its turns, with disadvantage if the tarrasque is within line of sight, ending the effect on itself on a success. If a creature's saving throw is successful or the effect ends for it, the creature is immune to the tarrasque's Frightful Presence for the next 24 hours.",
          "attack_bonus": 0
        },
        {
          "name": "Swallow",
          "desc": "The tarrasque makes one bite attack against a Large or smaller creature it is grappling. If the attack hits, the target takes the bite's damage, the target is swallowed, and the grapple ends. While swallowed, the creature is blinded and restrained, it has total cover against attacks and other effects outside the tarrasque, and it takes 56 (16d6) acid damage at the start of each of the tarrasque's turns.\nIf the tarrasque takes 60 damage or more on a single turn from a creature inside it, the tarrasque must succeed on a DC 20 Constitution saving throw at the end of that turn or regurgitate all swallowed creatures, which fall prone in a space within 10 feet of the tarrasque. If the tarrasque dies, a swallowed creature is no longer restrained by it and can escape from the corpse by using 30 feet of movement, exiting prone.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Attack",
          "desc": "The tarrasque makes one claw attack or tail attack.",
          "attack_bonus": 0
        },
        {
          "name": "Move",
          "desc": "The tarrasque moves up to half its speed.",
          "attack_bonus": 0
        },
        {
          "name": "Chomp (Costs 2 Actions)",
          "desc": "The tarrasque makes one bite attack or uses its Swallow.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Thug",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any non-good alignment",
      "armor_class": 11,
      "hit_points": 32,
      "hit_dice": "5d8",
      "speed": "30 ft.",
      "strength": 15,
      "dexterity": 11,
      "constitution": 14,
      "intelligence": 10,
      "wisdom": 10,
      "charisma": 11,
      "intimidation": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language (usually Common)",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Pack Tactics",
          "desc": "The thug has advantage on an attack roll against a creature if at least one of the thug's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The thug makes two melee attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Mace",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) bludgeoning damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Heavy Crossbow",
          "desc": "Ranged Weapon Attack: +2 to hit, range 100/400 ft., one target. Hit: 5 (1d10) piercing damage.",
          "attack_bonus": 2,
          "damage_dice": "1d10"
        }
      ]
    },
    {
      "name": "Tiger",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 12,
      "hit_points": 37,
      "hit_dice": "5d10",
      "speed": "40 ft.",
      "strength": 17,
      "dexterity": 15,
      "constitution": 14,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 8,
      "perception": 3,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "",
      "challenge_rating": "1",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The tiger has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pounce",
          "desc": "If the tiger moves at least 20 ft. straight toward a creature and then hits it with a claw attack on the same turn, that target must succeed on a DC 13 Strength saving throw or be knocked prone. If the target is prone, the tiger can make one bite attack against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d10",
          "damage_bonus": 3
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Treant",
      "size": "Huge",
      "type": "plant",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 16,
      "hit_points": 138,
      "hit_dice": "12d12",
      "speed": "30 ft.",
      "strength": 23,
      "dexterity": 8,
      "constitution": 21,
      "intelligence": 12,
      "wisdom": 16,
      "charisma": 12,
      "damage_vulnerabilities": "fire",
      "damage_resistances": "bludgeoning, piercing",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "Common, Druidic, Elvish, Sylvan",
      "challenge_rating": "9",
      "special_abilities": [
        {
          "name": "False Appearance",
          "desc": "While the treant remains motionless, it is indistinguishable from a normal tree.",
          "attack_bonus": 0
        },
        {
          "name": "Siege Monster",
          "desc": "The treant deals double damage to objects and structures.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The treant makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 16 (3d6 + 6) bludgeoning damage.",
          "attack_bonus": 10,
          "damage_dice": "3d6",
          "damage_bonus": 6
        },
        {
          "name": "Rock",
          "desc": "Ranged Weapon Attack: +10 to hit, range 60/180 ft., one target. Hit: 28 (4d10 + 6) bludgeoning damage.",
          "attack_bonus": 10,
          "damage_dice": "4d10",
          "damage_bonus": 6
        },
        {
          "name": "Animate Trees (1/Day)",
          "desc": "The treant magically animates one or two trees it can see within 60 feet of it. These trees have the same statistics as a treant, except they have Intelligence and Charisma scores of 1, they can't speak, and they have only the Slam action option. An animated tree acts as an ally of the treant. The tree remains animate for 1 day or until it dies; until the treant dies or is more than 120 feet from the tree; or until the treant takes a bonus action to turn it back into an inanimate tree. The tree then takes root if possible.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Tribal Warrior",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 12,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "30 ft.",
      "strength": 13,
      "dexterity": 11,
      "constitution": 12,
      "intelligence": 8,
      "wisdom": 11,
      "charisma": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "any one language",
      "challenge_rating": "1/8",
      "special_abilities": [
        {
          "name": "Pack Tactics",
          "desc": "The warrior has advantage on an attack roll against a creature if at least one of the warrior's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Spear",
          "desc": "Melee or Ranged Weapon Attack: +3 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 4 (1d6 + 1) piercing damage, or 5 (1d8 + 1) piercing damage if used with two hands to make a melee attack.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Triceratops",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 95,
      "hit_dice": "10d12",
      "speed": "50 ft.",
      "strength": 22,
      "dexterity": 9,
      "constitution": 17,
      "intelligence": 2,
      "wisdom": 11,
      "charisma": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 10",
      "languages": "",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Trampling Charge",
          "desc": "If the triceratops moves at least 20 ft. straight toward a creature and then hits it with a gore attack on the same turn, that target must succeed on a DC 13 Strength saving throw or be knocked prone. If the target is prone, the triceratops can make one stomp attack against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Gore",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 24 (4d8 + 6) piercing damage.",
          "attack_bonus": 9,
          "damage_dice": "4d8",
          "damage_bonus": 6
        },
        {
          "name": "Stomp",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one prone creature. Hit: 22 (3d10 + 6) bludgeoning damage",
          "attack_bonus": 9,
          "damage_dice": "3d10",
          "damage_bonus": 6
        }
      ]
    },
    {
      "name": "Troll",
      "size": "Large",
      "type": "giant",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 15,
      "hit_points": 84,
      "hit_dice": "8d10",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 13,
      "constitution": 20,
      "intelligence": 7,
      "wisdom": 9,
      "charisma": 7,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 12",
      "languages": "Giant",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Keen Smell",
          "desc": "The troll has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        },
        {
          "name": "Regeneration",
          "desc": "The troll regains 10 hit points at the start of its turn. If the troll takes acid or fire damage, this trait doesn't function at the start of the troll's next turn. The troll dies only if it starts its turn with 0 hit points and doesn't regenerate.",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Loathsome Limbs",
          "desc": "Whenever the troll takes at least 15 slashing damage at one time, roll a d20 to determine what else happens to it:\n1-10: Nothing else happens.\n11-14: One leg is severed from the troll if it has any legs left.\n15- 18: One arm is severed from the troll if it has any arms left.\n19-20: The troll is decapitated, but the troll dies only if it can't regenerate. If it dies, so does the severed head.\nIf the troll finishes a short or long rest without reattaching a severed limb or head, the part regrows. At that point, the severed part dies. Until then, a severed part acts on the troll's initiative and has its own action and movement. A severed part has AC 13, 10 hit points, and the troll's Regeneration trait.\nA severed leg is unable to attack and has a speed of 5 feet.\nA severed arm has a speed of 5 feet and can make one claw attack on its turn, with disadvantage on the attack roll unless the troll can see the arm and its target. Each time the troll loses an arm, it loses a claw attack.\nIf its head is severed, the troll loses its bite attack and its body is blinded unless the head can see it. The severed head has a speed of 0 feet and the troll's Keen Smell trait. It can make a bite attack but only against a target in its space.\nThe troll's speed is halved if it's missing a leg. If it loses both legs, it falls prone. If it has both arms, it can crawl. With only one arm, it can still crawl, but its speed is halved. With no arms or legs, its speed is 0, and it can't benefit from bonuses to speed.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The troll makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 7 (1d6 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "1d6",
          "damage_bonus": 4
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Tyrannosaurus Rex",
      "size": "Huge",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 136,
      "hit_dice": "13d12",
      "speed": "50 ft.",
      "strength": 25,
      "dexterity": 10,
      "constitution": 19,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 9,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "",
      "challenge_rating": "8",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The tyrannosaurus makes two attacks: one with its bite and one with its tail. It can't make both attacks against the same target.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 33 (4d12 + 7) piercing damage. If the target is a Medium or smaller creature, it is grappled (escape DC 17). Until this grapple ends, the target is restrained, and the tyrannosaurus can't bite another target.",
          "attack_bonus": 10,
          "damage_dice": "4d12",
          "damage_bonus": 7
        },
        {
          "name": "Tail",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 20 (3d8 + 7) bludgeoning damage.",
          "attack_bonus": 10,
          "damage_dice": "3d8",
          "damage_bonus": 7
        }
      ]
    },
    {
      "name": "Unicorn",
      "size": "Large",
      "type": "celestial",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 12,
      "hit_points": 67,
      "hit_dice": "9d10",
      "speed": "50 ft.",
      "strength": 18,
      "dexterity": 14,
      "constitution": 15,
      "intelligence": 11,
      "wisdom": 17,
      "charisma": 16,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "charmed, paralyzed, poisoned",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "Celestial, Elvish, Sylvan, telepathy 60 ft.",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Charge",
          "desc": "If the unicorn moves at least 20 ft. straight toward a target and then hits it with a horn attack on the same turn, the target takes an extra 9 (2d8) piercing damage. If the target is a creature, it must succeed on a DC 15 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d8"
        },
        {
          "name": "Innate Spellcasting",
          "desc": "The unicorn's innate spellcasting ability is Charisma (spell save DC 14). The unicorn can innately cast the following spells, requiring no components:\n\nAt will: detect evil and good, druidcraft, pass without trace\n1/day each: calm emotions, dispel evil and good, entangle",
          "attack_bonus": 0
        },
        {
          "name": "Magic Resistance",
          "desc": "The unicorn has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        },
        {
          "name": "Magic Weapons",
          "desc": "The unicorn's weapon attacks are magical.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The unicorn makes two attacks: one with its hooves and one with its horn.",
          "attack_bonus": 0
        },
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft ., one target. Hit: 11 (2d6 + 4) bludgeoning damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Horn",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft ., one target. Hit: 8 (1d8 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Healing Touch (3/Day)",
          "desc": "The unicorn touches another creature with its horn. The target magically regains 11 (2d8 + 2) hit points. In addition, the touch removes all diseases and neutralizes all poisons afflicting the target.",
          "attack_bonus": 0
        },
        {
          "name": "Teleport (1/Day)",
          "desc": "The unicorn magically teleports itself and up to three willing creatures it can see within 5 ft. of it, along with any equipment they are wearing or carrying, to a location the unicorn is familiar with, up to 1 mile away.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Hooves",
          "desc": "The unicorn makes one attack with its hooves.",
          "attack_bonus": 0
        },
        {
          "name": "Shimmering Shield (Costs 2 Actions)",
          "desc": "The unicorn creates a shimmering, magical field around itself or another creature it can see within 60 ft. of it. The target gains a +2 bonus to AC until the end of the unicorn's next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Heal Self (Costs 3 Actions)",
          "desc": "The unicorn magically regains 11 (2d8 + 2) hit points.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Vampire",
      "size": "Medium",
      "type": "undead",
      "subtype": "shapechanger",
      "alignment": "lawful evil",
      "armor_class": 16,
      "hit_points": 144,
      "hit_dice": "17d8",
      "speed": "30 ft.",
      "strength": 18,
      "dexterity": 18,
      "constitution": 18,
      "intelligence": 17,
      "wisdom": 15,
      "charisma": 18,
      "dexterity_save": 9,
      "wisdom_save": 7,
      "charisma_save": 9,
      "perception": 7,
      "stealth": 9,
      "damage_vulnerabilities": "",
      "damage_resistances": "necrotic; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 120 ft., passive Perception 17",
      "languages": "the languages it knew in life",
      "challenge_rating": "13",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "If the vampire isn't in sun light or running water, it can use its action to polymorph into a Tiny bat or a Medium cloud of mist, or back into its true form.\nWhile in bat form, the vampire can't speak, its walking speed is 5 feet, and it has a flying speed of 30 feet. Its statistics, other than its size and speed, are unchanged. Anything it is wearing transforms with it, but nothing it is carrying does. It reverts to its true form if it dies.\nWhile in mist form, the vampire can't take any actions, speak, or manipulate objects. It is weightless, has a flying speed of 20 feet, can hover, and can enter a hostile creature's space and stop there. In addition, if air can pass through a space, the mist can do so without squeezing, and it can't pass through water. It has advantage on Strength, Dexterity, and Constitution saving throws, and it is immune to all nonmagical damage, except the damage it takes from sunlight.",
          "attack_bonus": 0
        },
        {
          "name": "Legendary Resistance (3/Day)",
          "desc": "If the vampire fails a saving throw, it can choose to succeed instead.",
          "attack_bonus": 0
        },
        {
          "name": "Misty Escape",
          "desc": "When it drops to 0 hit points outside its resting place, the vampire transforms into a cloud of mist (as in the Shapechanger trait) instead of falling unconscious, provided that it isn't in sunlight or running water. If it can't transform, it is destroyed.\nWhile it has 0 hit points in mist form, it can't revert to its vampire form, and it must reach its resting place within 2 hours or be destroyed. Once in its resting place, it reverts to its vampire form. It is then paralyzed until it regains at least 1 hit point. After spending 1 hour in its resting place with 0 hit points, it regains 1 hit point.",
          "attack_bonus": 0
        },
        {
          "name": "Regeneration",
          "desc": "The vampire regains 20 hit points at the start of its turn if it has at least 1 hit point and isn't in sunlight or running water. If the vampire takes radiant damage or damage from holy water, this trait doesn't function at the start of the vampire's next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The vampire can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Vampire Weaknesses",
          "desc": "The vampire has the following flaws:\nForbiddance. The vampire can't enter a residence without an invitation from one of the occupants.\nHarmed by Running Water. The vampire takes 20 acid damage if it ends its turn in running water.\nStake to the Heart. If a piercing weapon made of wood is driven into the vampire's heart while the vampire is incapacitated in its resting place, the vampire is paralyzed until the stake is removed.\nSunlight Hypersensitivity. The vampire takes 20 radiant damage when it starts its turn in sunlight. While in sunlight, it has disadvantage on attack rolls and ability checks.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack (Vampire Form Only)",
          "desc": "The vampire makes two attacks, only one of which can be a bite attack.",
          "attack_bonus": 0
        },
        {
          "name": "Unarmed Strike (Vampire Form Only)",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one creature. Hit: 8 (1d8 + 4) bludgeoning damage. Instead of dealing damage, the vampire can grapple the target (escape DC 18).",
          "attack_bonus": 9,
          "damage_dice": "1d8",
          "damage_bonus": 4
        },
        {
          "name": "Bite (Bat or Vampire Form Only)",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one willing creature, or a creature that is grappled by the vampire, incapacitated, or restrained. Hit: 7 (1d6 + 4) piercing damage plus 10 (3d6) necrotic damage. The target's hit point maximum is reduced by an amount equal to the necrotic damage taken, and the vampire regains hit points equal to that amount. The reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0. A humanoid slain in this way and then buried in the ground rises the following night as a vampire spawn under the vampire's control.",
          "attack_bonus": 9,
          "damage_dice": "1d6 + 3d6",
          "damage_bonus": 4
        },
        {
          "name": "Charm",
          "desc": "The vampire targets one humanoid it can see within 30 ft. of it. If the target can see the vampire, the target must succeed on a DC 17 Wisdom saving throw against this magic or be charmed by the vampire. The charmed target regards the vampire as a trusted friend to be heeded and protected. Although the target isn't under the vampire's control, it takes the vampire's requests or actions in the most favorable way it can, and it is a willing target for the vampire's bit attack.\nEach time the vampire or the vampire's companions do anything harmful to the target, it can repeat the saving throw, ending the effect on itself on a success. Otherwise, the effect lasts 24 hours or until the vampire is destroyed, is on a different plane of existence than the target, or takes a bonus action to end the effect.",
          "attack_bonus": 0
        },
        {
          "name": "Children of the Night (1/Day)",
          "desc": "The vampire magically calls 2d4 swarms of bats or rats, provided that the sun isn't up. While outdoors, the vampire can call 3d6 wolves instead. The called creatures arrive in 1d4 rounds, acting as allies of the vampire and obeying its spoken commands. The beasts remain for 1 hour, until the vampire dies, or until the vampire dismisses them as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "legendary_actions": [
        {
          "name": "Move",
          "desc": "The vampire moves up to its speed without provoking opportunity attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Unarmed Strike",
          "desc": "The vampire makes one unarmed strike.",
          "attack_bonus": 0
        },
        {
          "name": "Bite (Costs 2 Actions)",
          "desc": "The vampire makes one bite attack.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Vampire Spawn",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 15,
      "hit_points": 82,
      "hit_dice": "11d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 16,
      "constitution": 16,
      "intelligence": 11,
      "wisdom": 10,
      "charisma": 12,
      "dexterity_save": 6,
      "wisdom_save": 3,
      "perception": 3,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "necrotic; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "the languages it knew in life",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Regeneration",
          "desc": "The vampire regains 10 hit points at the start of its turn if it has at least 1 hit point and isn't in sunlight or running water. If the vampire takes radiant damage or damage from holy water, this trait doesn't function at the start of the vampire's next turn.",
          "attack_bonus": 0
        },
        {
          "name": "Spider Climb",
          "desc": "The vampire can climb difficult surfaces, including upside down on ceilings, without needing to make an ability check.",
          "attack_bonus": 0
        },
        {
          "name": "Vampire Weaknesses",
          "desc": "The vampire has the following flaws:\nForbiddance. The vampire can't enter a residence without an invitation from one of the occupants.\nHarmed by Running Water. The vampire takes 20 acid damage when it ends its turn in running water.\nStake to the Heart. The vampire is destroyed if a piercing weapon made of wood is driven into its heart while it is incapacitated in its resting place.\nSunlight Hypersensitivity. The vampire takes 20 radiant damage when it starts its turn in sunlight. While in sunlight, it has disadvantage on attack rolls and ability checks.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The vampire makes two attacks, only one of which can be a bite attack.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one willing creature, or a creature that is grappled by the vampire, incapacitated, or restrained. Hit: 6 (1d6 + 3) piercing damage plus 7 (2d6) necrotic damage. The target's hit point maximum is reduced by an amount equal to the necrotic damage taken, and the vampire regains hit points equal to that amount. The reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0.",
          "attack_bonus": 61
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 8 (2d4 + 3) slashing damage. Instead of dealing damage, the vampire can grapple the target (escape DC 13).",
          "attack_bonus": 6,
          "damage_dice": "2d4",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Veteran",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "any race",
      "alignment": "any alignment",
      "armor_class": 17,
      "hit_points": 58,
      "hit_dice": "9d8",
      "speed": "30 ft.",
      "strength": 16,
      "dexterity": 13,
      "constitution": 14,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 10,
      "athletics": 5,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "any one language (usually Common)",
      "challenge_rating": "3",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The veteran makes two longsword attacks. If it has a shortsword drawn, it can also make a shortsword attack.",
          "attack_bonus": 0
        },
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage, or 8 (1d10 + 3) slashing damage if used with two hands.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Shortsword",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) piercing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Heavy Crossbow",
          "desc": "Ranged Weapon Attack: +3 to hit, range 100/400 ft., one target. Hit: 6 (1d10 + 1) piercing damage.",
          "attack_bonus": 3,
          "damage_dice": "1d10",
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Violet Fungus",
      "size": "Medium",
      "type": "plant",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 5,
      "hit_points": 18,
      "hit_dice": "4d8",
      "speed": "5 ft.",
      "strength": 3,
      "dexterity": 1,
      "constitution": 10,
      "intelligence": 1,
      "wisdom": 3,
      "charisma": 1,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "blinded, deafened, frightened",
      "senses": "blindsight 30 ft. (blind beyond this radius), passive Perception 6",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "False Appearance",
          "desc": "While the violet fungus remains motionless, it is indistinguishable from an ordinary fungus.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The fungus makes 1d4 Rotting Touch attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Rotting Touch",
          "desc": "Melee Weapon Attack: +2 to hit, reach 10 ft., one creature. Hit: 4 (1d8) necrotic damage.",
          "attack_bonus": 2,
          "damage_dice": "1d8"
        }
      ]
    },
    {
      "name": "Vrock",
      "size": "Large",
      "type": "fiend",
      "subtype": "demon",
      "alignment": "chaotic evil",
      "armor_class": 15,
      "hit_points": 104,
      "hit_dice": "11d10",
      "speed": "40 ft., fly 60 ft.",
      "strength": 17,
      "dexterity": 15,
      "constitution": 18,
      "intelligence": 8,
      "wisdom": 13,
      "charisma": 8,
      "dexterity_save": 5,
      "wisdom_save": 4,
      "charisma_save": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "cold, fire, lightning; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "darkvision 120 ft., passive Perception 11",
      "languages": "Abyssal, telepathy 120 ft.",
      "challenge_rating": "6",
      "special_abilities": [
        {
          "name": "Magic Resistance",
          "desc": "The vrock has advantage on saving throws against spells and other magical effects.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The vrock makes two attacks: one with its beak and one with its talons.",
          "attack_bonus": 0
        },
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Talons",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 14 (2d10 + 3) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "2d10",
          "damage_bonus": 3
        },
        {
          "name": "Spores (Recharge 6)",
          "desc": "A 15-foot-radius cloud of toxic spores extends out from the vrock. The spores spread around corners. Each creature in that area must succeed on a DC 14 Constitution saving throw or become poisoned. While poisoned in this way, a target takes 5 (1d10) poison damage at the start of each of its turns. A target can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success. Emptying a vial of holy water on the target also ends the effect on it.",
          "attack_bonus": 0
        },
        {
          "name": "Stunning Screech (1/Day)",
          "desc": "The vrock emits a horrific screech. Each creature within 20 feet of it that can hear it and that isn't a demon must succeed on a DC 14 Constitution saving throw or be stunned until the end of the vrock's next turn .",
          "attack_bonus": 0
        },
        {
          "name": "Variant: Summon Demon (1/Day)",
          "desc": "The demon chooses what to summon and attempts a magical summoning.\nA vrock has a 30 percent chance of summoning 2d4 dretches or one vrock.\nA summoned demon appears in an unoccupied space within 60 feet of its summoner, acts as an ally of its summoner, and can't summon other demons. It remains for 1 minute, until it or its summoner dies, or until its summoner dismisses it as an action.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Vulture",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 10,
      "hit_points": 5,
      "hit_dice": "1d8",
      "speed": "10 ft., fly 50 ft.",
      "strength": 7,
      "dexterity": 10,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 4,
      "perception": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Sight and Smell",
          "desc": "The vulture has advantage on Wisdom (Perception) checks that rely on sight or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The vulture has advantage on an attack roll against a creature if at least one of the vulture's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Beak",
          "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft., one target. Hit: 2 (1d4) piercing damage.",
          "attack_bonus": 2,
          "damage_dice": "1d4"
        }
      ]
    },
    {
      "name": "Warhorse",
      "size": "Large",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 11,
      "hit_points": 19,
      "hit_dice": "3d10",
      "speed": "60 ft.",
      "strength": 18,
      "dexterity": 12,
      "constitution": 13,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 11",
      "languages": "",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Trampling Charge",
          "desc": "If the horse moves at least 20 ft. straight toward a creature and then hits it with a hooves attack on the same turn, that target must succeed on a DC 14 Strength saving throw or be knocked prone. If the target is prone, the horse can make another attack with its hooves against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Warhorse Skeleton",
      "size": "Large",
      "type": "undead",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 13,
      "hit_points": 22,
      "hit_dice": "3d10",
      "speed": "60 ft.",
      "strength": 18,
      "dexterity": 12,
      "constitution": 15,
      "intelligence": 2,
      "wisdom": 8,
      "charisma": 5,
      "damage_vulnerabilities": "bludgeoning",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "exhaustion, poisoned",
      "senses": "darkvision 60 ft., passive Perception 9",
      "languages": "",
      "challenge_rating": "1/2",
      "actions": [
        {
          "name": "Hooves",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) bludgeoning damage.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Water Elemental",
      "size": "Large",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 14,
      "hit_points": 114,
      "hit_dice": "12d10",
      "speed": "30 ft., swim 90 ft.",
      "strength": 18,
      "dexterity": 14,
      "constitution": 18,
      "intelligence": 5,
      "wisdom": 10,
      "charisma": 8,
      "damage_vulnerabilities": "",
      "damage_resistances": "acid; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "poison",
      "condition_immunities": "exhaustion, grappled, paralyzed, petrified, poisoned, prone, restrained, unconscious",
      "senses": "darkvision 60 ft., passive Perception 10",
      "languages": "Aquan",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Water Form",
          "desc": "The elemental can enter a hostile creature's space and stop there. It can move through a space as narrow as 1 inch wide without squeezing.",
          "attack_bonus": 0
        },
        {
          "name": "Freeze",
          "desc": "If the elemental takes cold damage, it partially freezes; its speed is reduced by 20 ft. until the end of its next turn.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The elemental makes two slam attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) bludgeoning damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Whelm (Recharge 4-6)",
          "desc": "Each creature in the elemental's space must make a DC 15 Strength saving throw. On a failure, a target takes 13 (2d8 + 4) bludgeoning damage. If it is Large or smaller, it is also grappled (escape DC 14). Until this grapple ends, the target is restrained and unable to breathe unless it can breathe water. If the saving throw is successful, the target is pushed out of the elemental's space.\nThe elemental can grapple one Large creature or up to two Medium or smaller creatures at one time. At the start of each of the elemental's turns, each target grappled by it takes 13 (2d8 + 4) bludgeoning damage. A creature within 5 feet of the elemental can pull a creature or object out of it by taking an action to make a DC 14 Strength and succeeding.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Weasel",
      "size": "Tiny",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 1,
      "hit_dice": "1d4",
      "speed": "30 ft.",
      "strength": 3,
      "dexterity": 16,
      "constitution": 8,
      "intelligence": 2,
      "wisdom": 12,
      "charisma": 3,
      "perception": 3,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "0",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The weasel has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one creature. Hit: 1 piercing damage.",
          "attack_bonus": 5,
          "damage_bonus": 1
        }
      ]
    },
    {
      "name": "Werebear",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "human",
      "alignment": "neutral good",
      "armor_class": 10,
      "hit_points": 135,
      "hit_dice": "18d8",
      "speed": "30 ft. (40 ft., climb 30 ft. in bear or hybrid form)",
      "strength": 19,
      "dexterity": 10,
      "constitution": 17,
      "intelligence": 11,
      "wisdom": 12,
      "charisma": 12,
      "perception": 7,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "bludgeoning, piercing, and slashing damage from nonmagical weapons that aren't silvered",
      "condition_immunities": "",
      "senses": "passive Perception 17",
      "languages": "Common (can't speak in bear form)",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The werebear can use its action to polymorph into a Large bear-humanoid hybrid or into a Large bear, or back into its true form, which is humanoid. Its statistics, other than its size and AC, are the same in each form. Any equipment it. is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Smell",
          "desc": "The werebear has advantage on WisGlom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "In bear form, the werebear makes two claw attacks. In humanoid form, it makes two greataxe attacks. In hybrid form, it can attack like a bear or a humanoid.",
          "attack_bonus": 0
        },
        {
          "name": "Bite (Bear or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 15 (2d10 + 4) piercing damage. If the target is a humanoid, it must succeed on a DC 14 Constitution saving throw or be cursed with were bear lycanthropy.",
          "attack_bonus": 7,
          "damage_dice": "2d10",
          "damage_bonus": 4
        },
        {
          "name": "Claw (Bear or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Greataxe (Humanoid or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 10 (1d12 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "1d12",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Wereboar",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "human",
      "alignment": "neutral evil",
      "armor_class": 10,
      "hit_points": 78,
      "hit_dice": "12d8",
      "speed": "30 ft. (40 ft. in boar form)",
      "strength": 17,
      "dexterity": 10,
      "constitution": 15,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 8,
      "perception": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "bludgeoning, piercing, and slashing damage from nonmagical weapons that aren't silvered",
      "condition_immunities": "",
      "senses": "passive Perception 12",
      "languages": "Common (can't speak in boar form)",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The wereboar can use its action to polymorph into a boar-humanoid hybrid or into a boar, or back into its true form, which is humanoid. Its statistics, other than its AC, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Charge (Boar or Hybrid Form Only)",
          "desc": "If the wereboar moves at least 15 feet straight toward a target and then hits it with its tusks on the same turn, the target takes an extra 7 (2d6) slashing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.",
          "attack_bonus": 0,
          "damage_dice": "2d6"
        },
        {
          "name": "Relentless (Recharges after a Short or Long Rest)",
          "desc": "If the wereboar takes 14 damage or less that would reduce it to 0 hit points, it is reduced to 1 hit point instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack (Humanoid or Hybrid Form Only)",
          "desc": "The wereboar makes two attacks, only one of which can be with its tusks.",
          "attack_bonus": 0
        },
        {
          "name": "Maul (Humanoid or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) bludgeoning damage.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        },
        {
          "name": "Tusks (Boar or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage. If the target is a humanoid, it must succeed on a DC 12 Constitution saving throw or be cursed with wereboar lycanthropy.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Wererat",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "human",
      "alignment": "lawful evil",
      "armor_class": 12,
      "hit_points": 33,
      "hit_dice": "6d8",
      "speed": "30 ft.",
      "strength": 10,
      "dexterity": 15,
      "constitution": 12,
      "intelligence": 11,
      "wisdom": 10,
      "charisma": 8,
      "perception": 2,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "bludgeoning, piercing, and slashing damage from nonmagical weapons that aren't silvered",
      "condition_immunities": "",
      "senses": "darkvision 60 ft. (rat form only), passive Perception 12",
      "languages": "Common (can't speak in rat form)",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The wererat can use its action to polymorph into a rat-humanoid hybrid or into a giant rat, or back into its true form, which is humanoid. Its statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Smell",
          "desc": "The wererat has advantage on Wisdom (Perception) checks that rely on smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack (Humanoid or Hybrid Form Only)",
          "desc": "The wererat makes two attacks, only one of which can be a bite.",
          "attack_bonus": 0
        },
        {
          "name": "Bite (Rat or Hybrid Form Only).",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 4 (1d4 + 2) piercing damage. If the target is a humanoid, it must succeed on a DC 11 Constitution saving throw or be cursed with wererat lycanthropy.",
          "attack_bonus": 4,
          "damage_dice": "1d4",
          "damage_bonus": 2
        },
        {
          "name": "Shortsword (Humanoid or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Hand Crossbow (Humanoid or Hybrid Form Only)",
          "desc": "Ranged Weapon Attack: +4 to hit, range 30/120 ft., one target. Hit: 5 (1d6 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Weretiger",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "human",
      "alignment": "neutral",
      "armor_class": 12,
      "hit_points": 120,
      "hit_dice": "16d8",
      "speed": "30 ft. (40 ft. in tiger form)",
      "strength": 17,
      "dexterity": 15,
      "constitution": 16,
      "intelligence": 10,
      "wisdom": 13,
      "charisma": 11,
      "perception": 5,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "bludgeoning, piercing, and slashing damage from nonmagical weapons that aren't silvered",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 15",
      "languages": "Common (can't speak in tiger form)",
      "challenge_rating": "4",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The weretiger can use its action to polymorph into a tiger-humanoid hybrid or into a tiger, or back into its true form, which is humanoid. Its statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing and Smell",
          "desc": "The weretiger has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pounce (Tiger or Hybrid Form Only)",
          "desc": "If the weretiger moves at least 15 feet straight toward a creature and then hits it with a claw attack on the same turn, that target must succeed on a DC 14 Strength saving throw or be knocked prone. If the target is prone, the weretiger can make one bite attack against it as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack (Humanoid or Hybrid Form Only)",
          "desc": "In humanoid form, the weretiger makes two scimitar attacks or two longbow attacks. In hybrid form, it can attack like a humanoid or make two claw attacks.",
          "attack_bonus": 0
        },
        {
          "name": "Bite (Tiger or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 8 (1d10 + 3) piercing damage. If the target is a humanoid, it must succeed on a DC 13 Constitution saving throw or be cursed with weretiger lycanthropy.",
          "attack_bonus": 5,
          "damage_dice": "1d10",
          "damage_bonus": 3
        },
        {
          "name": "Claw (Tiger or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d8",
          "damage_bonus": 3
        },
        {
          "name": "Scimitar (Humanoid or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.",
          "attack_bonus": 5,
          "damage_dice": "1d6",
          "damage_bonus": 3
        },
        {
          "name": "Longbow (Humanoid or Hybrid Form Only)",
          "desc": "Ranged Weapon Attack: +4 to hit, range 150/600 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Werewolf",
      "size": "Medium",
      "type": "humanoid",
      "subtype": "human",
      "alignment": "chaotic evil",
      "armor_class": 11,
      "hit_points": 58,
      "hit_dice": "9d8",
      "speed": "30 ft. (40 ft. in wolf form)",
      "strength": 15,
      "dexterity": 13,
      "constitution": 14,
      "intelligence": 10,
      "wisdom": 11,
      "charisma": 10,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "bludgeoning, piercing, and slashing damage from nonmagical weapons that aren't silvered",
      "condition_immunities": "",
      "senses": "passive Perception 14",
      "languages": "Common (can't speak in wolf form)",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Shapechanger",
          "desc": "The werewolf can use its action to polymorph into a wolf-humanoid hybrid or into a wolf, or back into its true form, which is humanoid. Its statistics, other than its AC, are the same in each form. Any equipment it is wearing or carrying isn't transformed. It reverts to its true form if it dies.",
          "attack_bonus": 0
        },
        {
          "name": "Keen Hearing and Smell",
          "desc": "The werewolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack (Humanoid or Hybrid Form Only)",
          "desc": "The werewolf makes two attacks: one with its bite and one with its claws or spear.",
          "attack_bonus": 0
        },
        {
          "name": "Bite (Wolf or Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) piercing damage. If the target is a humanoid, it must succeed on a DC 12 Constitution saving throw or be cursed with werewolf lycanthropy.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        },
        {
          "name": "Claws (Hybrid Form Only)",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 7 (2d4 + 2) slashing damage.",
          "attack_bonus": 4,
          "damage_dice": "2d4",
          "damage_bonus": 2
        },
        {
          "name": "Spear (Humanoid Form Only)",
          "desc": "Melee or Ranged Weapon Attack: +4 to hit, reach 5 ft. or range 20/60 ft., one creature. Hit: 5 (1d6 + 2) piercing damage, or 6 (1d8 + 2) piercing damage if used with two hands to make a melee attack.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": -2
        }
      ]
    },
    {
      "name": "White Dragon Wyrmling",
      "size": "Medium",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 16,
      "hit_points": 32,
      "hit_dice": "5d8",
      "speed": "30 ft., burrow 15 ft., fly 60 ft., swim 30 ft.",
      "strength": 14,
      "dexterity": 10,
      "constitution": 14,
      "intelligence": 5,
      "wisdom": 10,
      "charisma": 11,
      "dexterity_save": 2,
      "constitution_save": 4,
      "wisdom_save": 2,
      "charisma_save": 2,
      "perception": 4,
      "stealth": 2,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 10 ft., darkvision 60 ft., passive Perception 14",
      "languages": "Draconic",
      "challenge_rating": "2",
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (1d10 + 2) piercing damage plus 2 (1d4) cold damage.",
          "attack_bonus": 4,
          "damage_dice": "1d10 + 1d4",
          "damage_bonus": 2
        },
        {
          "name": "Cold Breath (Recharge 5-6)",
          "desc": "The dragon exhales an icy blast of hail in a 15-foot cone. Each creature in that area must make a DC 12 Constitution saving throw, taking 22 (5d8) cold damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "5d8"
        }
      ]
    },
    {
      "name": "Wight",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 14,
      "hit_points": 45,
      "hit_dice": "6d8",
      "speed": "30 ft.",
      "strength": 15,
      "dexterity": 14,
      "constitution": 16,
      "intelligence": 10,
      "wisdom": 13,
      "charisma": 15,
      "perception": 3,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "necrotic; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 13",
      "languages": "the languages it knew in life",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Sunlight Sensitivity",
          "desc": "While in sunlight, the wight has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The wight makes two longsword attacks or two longbow attacks. It can use its Life Drain in place of one longsword attack.",
          "attack_bonus": 0
        },
        {
          "name": "Life Drain",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one creature. Hit: 5 (1d6 + 2) necrotic damage. The target must succeed on a DC 13 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken. This reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0.\nA humanoid slain by this attack rises 24 hours later as a zombie under the wight's control, unless the humanoid is restored to life or its body is destroyed. The wight can have no more than twelve zombies under its control at one time.",
          "attack_bonus": 4,
          "damage_dice": "1d6",
          "damage_bonus": 2
        },
        {
          "name": "Longsword",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 6 (1d8 + 2) slashing damage, or 7 (1d10 + 2) slashing damage if used with two hands.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        },
        {
          "name": "Longbow",
          "desc": "Ranged Weapon Attack: +4 to hit, range 150/600 ft., one target. Hit: 6 (1d8 + 2) piercing damage.",
          "attack_bonus": 4,
          "damage_dice": "1d8",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Will-o'-Wisp",
      "size": "Tiny",
      "type": "undead",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 19,
      "hit_points": 22,
      "hit_dice": "9d4",
      "speed": "0 ft., fly 50 ft. (hover)",
      "strength": 1,
      "dexterity": 28,
      "constitution": 10,
      "intelligence": 13,
      "wisdom": 14,
      "charisma": 11,
      "damage_vulnerabilities": "",
      "damage_resistances": "acid, cold, fire, necrotic, thunder; bludgeoning, piercing, and slashing from nonmagical weapons",
      "damage_immunities": "lightning, poison",
      "condition_immunities": "exhaustion, grappled, paralyzed, poisoned, prone, restrained, unconscious",
      "senses": "darkvision 120 ft., passive Perception 12",
      "languages": "the languages it knew in life",
      "challenge_rating": "2",
      "special_abilities": [
        {
          "name": "Consume Life",
          "desc": "As a bonus action, the will-o'-wisp can target one creature it can see within 5 ft. of it that has 0 hit points and is still alive. The target must succeed on a DC 10 Constitution saving throw against this magic or die. If the target dies, the will-o'-wisp regains 10 (3d6) hit points.",
          "attack_bonus": 0
        },
        {
          "name": "Ephemeral",
          "desc": "The will-o'-wisp can't wear or carry anything.",
          "attack_bonus": 0
        },
        {
          "name": "Incorporeal Movement",
          "desc": "The will-o'-wisp can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.",
          "attack_bonus": 0
        },
        {
          "name": "Variable Illumination",
          "desc": "The will-o'-wisp sheds bright light in a 5- to 20-foot radius and dim light for an additional number of ft. equal to the chosen radius. The will-o'-wisp can alter the radius as a bonus action.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Shock",
          "desc": "Melee Spell Attack: +4 to hit, reach 5 ft., one creature. Hit: 9 (2d8) lightning damage.",
          "attack_bonus": 4,
          "damage_dice": "2d8"
        },
        {
          "name": "Invisibility",
          "desc": "The will-o'-wisp and its light magically become invisible until it attacks or uses its Consume Life, or until its concentration ends (as if concentrating on a spell).",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Winter Wolf",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 13,
      "hit_points": 75,
      "hit_dice": "10d10",
      "speed": "50 ft.",
      "strength": 18,
      "dexterity": 13,
      "constitution": 14,
      "intelligence": 7,
      "wisdom": 12,
      "charisma": 8,
      "perception": 5,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "passive Perception 15",
      "languages": "Common, Giant, Winter Wolf",
      "challenge_rating": "3",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The wolf has advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        },
        {
          "name": "Snow Camouflage",
          "desc": "The wolf has advantage on Dexterity (Stealth) checks made to hide in snowy terrain.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) piercing damage. If the target is a creature, it must succeed on a DC 14 Strength saving throw or be knocked prone.",
          "attack_bonus": 6,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Cold Breath (Recharge 5-6)",
          "desc": "The wolf exhales a blast of freezing wind in a 15-foot cone. Each creature in that area must make a DC 12 Dexterity saving throw, taking 18 (4d8) cold damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "4d8"
        }
      ]
    },
    {
      "name": "Wolf",
      "size": "Medium",
      "type": "beast",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 11,
      "hit_dice": "2d8",
      "speed": "40 ft.",
      "strength": 12,
      "dexterity": 15,
      "constitution": 12,
      "intelligence": 3,
      "wisdom": 12,
      "charisma": 6,
      "perception": 3,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "passive Perception 13",
      "languages": "",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The wolf has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        },
        {
          "name": "Pack Tactics",
          "desc": "The wolf has advantage on an attack roll against a creature if at least one of the wolf's allies is within 5 ft. of the creature and the ally isn't incapacitated.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 7 (2d4 + 2) piercing damage. If the target is a creature, it must succeed on a DC 11 Strength saving throw or be knocked prone.",
          "attack_bonus": 4,
          "damage_dice": "2d4",
          "damage_bonus": 2
        }
      ]
    },
    {
      "name": "Worg",
      "size": "Large",
      "type": "monstrosity",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 13,
      "hit_points": 26,
      "hit_dice": "4d10",
      "speed": "50 ft.",
      "strength": 16,
      "dexterity": 13,
      "constitution": 13,
      "intelligence": 7,
      "wisdom": 11,
      "charisma": 8,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "Goblin, Worg",
      "challenge_rating": "1/2",
      "special_abilities": [
        {
          "name": "Keen Hearing and Smell",
          "desc": "The worg has advantage on Wisdom (Perception) checks that rely on hearing or smell.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) piercing damage. If the target is a creature, it must succeed on a DC 13 Strength saving throw or be knocked prone.",
          "attack_bonus": 5,
          "damage_dice": "2d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Wraith",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 13,
      "hit_points": 67,
      "hit_dice": "9d8",
      "speed": "0 ft., fly 60 ft. (hover)",
      "strength": 6,
      "dexterity": 16,
      "constitution": 16,
      "intelligence": 12,
      "wisdom": 14,
      "charisma": 15,
      "damage_vulnerabilities": "",
      "damage_resistances": "acid, cold, fire, lightning, thunder; bludgeoning, piercing, and slashing from nonmagical weapons that aren't silvered",
      "damage_immunities": "necrotic, poison",
      "condition_immunities": "charmed, exhaustion, grappled, paralyzed, petrified, poisoned, prone, restrained",
      "senses": "darkvision 60 ft., passive Perception 12",
      "languages": "the languages it knew in life",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Incorporeal Movement",
          "desc": "The wraith can move through other creatures and objects as if they were difficult terrain. It takes 5 (1d10) force damage if it ends its turn inside an object.",
          "attack_bonus": 0
        },
        {
          "name": "Sunlight Sensitivity",
          "desc": "While in sunlight, the wraith has disadvantage on attack rolls, as well as on Wisdom (Perception) checks that rely on sight.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Life Drain",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one creature. Hit: 21 (4d8 + 3) necrotic damage. The target must succeed on a DC 14 Constitution saving throw or its hit point maximum is reduced by an amount equal to the damage taken. This reduction lasts until the target finishes a long rest. The target dies if this effect reduces its hit point maximum to 0.",
          "attack_bonus": 6,
          "damage_dice": "4d8",
          "damage_bonus": 3
        },
        {
          "name": "Create Specter",
          "desc": "The wraith targets a humanoid within 10 feet of it that has been dead for no longer than 1 minute and died violently. The target's spirit rises as a specter in the space of its corpse or in the nearest unoccupied space. The specter is under the wraith's control. The wraith can have no more than seven specters under its control at one time.",
          "attack_bonus": 0
        }
      ]
    },
    {
      "name": "Wyvern",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "unaligned",
      "armor_class": 13,
      "hit_points": 110,
      "hit_dice": "13d10",
      "speed": "20 ft., fly 80 ft.",
      "strength": 19,
      "dexterity": 10,
      "constitution": 16,
      "intelligence": 5,
      "wisdom": 12,
      "charisma": 6,
      "perception": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., passive Perception 14",
      "languages": "",
      "challenge_rating": "6",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The wyvern makes two attacks: one with its bite and one with its stinger. While flying, it can use its claws in place of one other attack.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one creature. Hit: 11 (2d6 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Claws",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 13 (2d8 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d8",
          "damage_bonus": 4
        },
        {
          "name": "Stinger",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one creature. Hit: 11 (2d6 + 4) piercing damage. The target must make a DC 15 Constitution saving throw, taking 24 (7d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        }
      ]
    },
    {
      "name": "Xorn",
      "size": "Medium",
      "type": "elemental",
      "subtype": "",
      "alignment": "neutral",
      "armor_class": 19,
      "hit_points": 73,
      "hit_dice": "7d8",
      "speed": "20 ft., burrow 20 ft.",
      "strength": 17,
      "dexterity": 10,
      "constitution": 22,
      "intelligence": 11,
      "wisdom": 10,
      "charisma": 11,
      "perception": 6,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "piercing and slashing from nonmagical weapons that aren't adamantine",
      "damage_immunities": "",
      "condition_immunities": "",
      "senses": "darkvision 60 ft., tremorsense 60 ft., passive Perception 16",
      "languages": "Terran",
      "challenge_rating": "5",
      "special_abilities": [
        {
          "name": "Earth Glide",
          "desc": "The xorn can burrow through nonmagical, unworked earth and stone. While doing so, the xorn doesn't disturb the material it moves through.",
          "attack_bonus": 0
        },
        {
          "name": "Stone Camouflage",
          "desc": "The xorn has advantage on Dexterity (Stealth) checks made to hide in rocky terrain.",
          "attack_bonus": 0
        },
        {
          "name": "Treasure Sense",
          "desc": "The xorn can pinpoint, by scent, the location of precious metals and stones, such as coins and gems, within 60 ft. of it.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The xorn makes three claw attacks and one bite attack.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 13 (3d6 + 3) piercing damage.",
          "attack_bonus": 6,
          "damage_dice": "3d6",
          "damage_bonus": 3
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 6 (1d6 + 3) slashing damage.",
          "attack_bonus": 6,
          "damage_dice": "1d6",
          "damage_bonus": 3
        }
      ]
    },
    {
      "name": "Young Black Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 18,
      "hit_points": 127,
      "hit_dice": "15d10",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 19,
      "dexterity": 14,
      "constitution": 17,
      "intelligence": 12,
      "wisdom": 11,
      "charisma": 15,
      "dexterity_save": 5,
      "constitution_save": 6,
      "wisdom_save": 3,
      "charisma_save": 5,
      "perception": 6,
      "stealth": 5,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 16",
      "languages": "Common, Draconic",
      "challenge_rating": "7",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage plus 4 (1d8) acid damage.",
          "attack_bonus": 7,
          "damage_dice": "2d10 + 1d8",
          "damage_bonus": 4
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Acid Breath (Recharge 5-6)",
          "desc": "The dragon exhales acid in a 30-foot line that is 5 feet wide. Each creature in that line must make a DC 14 Dexterity saving throw, taking 49 (11d8) acid damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "11d8"
        }
      ]
    },
    {
      "name": "Young Blue Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 18,
      "hit_points": 152,
      "hit_dice": "16d10",
      "speed": "40 ft., burrow 40 ft., fly 80 ft.",
      "strength": 21,
      "dexterity": 10,
      "constitution": 19,
      "intelligence": 14,
      "wisdom": 13,
      "charisma": 17,
      "dexterity_save": 4,
      "constitution_save": 8,
      "wisdom_save": 5,
      "charisma_save": 7,
      "perception": 9,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 19",
      "languages": "Common, Draconic",
      "challenge_rating": "9",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +9 to hit, reach 10 ft., one target. Hit: 16 (2d10 + 5) piercing damage plus 5 (1d10) lightning damage.",
          "attack_bonus": 9,
          "damage_dice": "2d10 + 1d10",
          "damage_bonus": 5
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.",
          "attack_bonus": 9,
          "damage_dice": "2d6",
          "damage_bonus": 5
        },
        {
          "name": "Lightning Breath (Recharge 5-6)",
          "desc": "The dragon exhales lightning in an 60-foot line that is 5 feet wide. Each creature in that line must make a DC 16 Dexterity saving throw, taking 55 (10d10) lightning damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "10d10"
        }
      ]
    },
    {
      "name": "Young Brass Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 17,
      "hit_points": 110,
      "hit_dice": "13d10",
      "speed": "40 ft., burrow 20 ft., fly 80 ft.",
      "strength": 19,
      "dexterity": 10,
      "constitution": 17,
      "intelligence": 12,
      "wisdom": 11,
      "charisma": 15,
      "dexterity_save": 3,
      "constitution_save": 6,
      "wisdom_save": 3,
      "charisma_save": 5,
      "perception": 6,
      "persuasion": 5,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 16",
      "languages": "Common, Draconic",
      "challenge_rating": "6",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d10",
          "damage_bonus": 4
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nFire Breath. The dragon exhales fire in a 40-foot line that is 5 feet wide. Each creature in that line must make a DC 14 Dexterity saving throw, taking 42 (12d6) fire damage on a failed save, or half as much damage on a successful one.\nSleep Breath. The dragon exhales sleep gas in a 30-foot cone. Each creature in that area must succeed on a DC 14 Constitution saving throw or fall unconscious for 5 minutes. This effect ends for a creature if the creature takes damage or someone uses an action to wake it.",
          "attack_bonus": 0,
          "damage_dice": "12d6"
        }
      ]
    },
    {
      "name": "Young Bronze Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 18,
      "hit_points": 142,
      "hit_dice": "15d10",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 21,
      "dexterity": 10,
      "constitution": 19,
      "intelligence": 14,
      "wisdom": 13,
      "charisma": 17,
      "dexterity_save": 3,
      "constitution_save": 7,
      "wisdom_save": 4,
      "charisma_save": 6,
      "insight": 4,
      "perception": 7,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "lightning",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 17",
      "languages": "Common, Draconic",
      "challenge_rating": "8",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +8 to hit, reach 10 ft., one target. Hit: 16 (2d10 + 5) piercing damage.",
          "attack_bonus": 8,
          "damage_dice": "2d10",
          "damage_bonus": 5
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft., one target. Hit: 12 (2d6 + 5) slashing damage.",
          "attack_bonus": 8,
          "damage_dice": "2d6",
          "damage_bonus": 5
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nLightning Breath. The dragon exhales lightning in a 60-foot line that is 5 feet wide. Each creature in that line must make a DC 15 Dexterity saving throw, taking 55 (10d10) lightning damage on a failed save, or half as much damage on a successful one.\nRepulsion Breath. The dragon exhales repulsion energy in a 30-foot cone. Each creature in that area must succeed on a DC 15 Strength saving throw. On a failed save, the creature is pushed 40 feet away from the dragon.",
          "attack_bonus": 0,
          "damage_dice": "10d10"
        }
      ]
    },
    {
      "name": "Young Copper Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic good",
      "armor_class": 17,
      "hit_points": 119,
      "hit_dice": "14d10",
      "speed": "40 ft., climb 40 ft., fly 80 ft.",
      "strength": 19,
      "dexterity": 12,
      "constitution": 17,
      "intelligence": 16,
      "wisdom": 13,
      "charisma": 15,
      "dexterity_save": 4,
      "constitution_save": 6,
      "wisdom_save": 4,
      "charisma_save": 5,
      "deception": 5,
      "perception": 7,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "acid",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 17",
      "languages": "Common, Draconic",
      "challenge_rating": "7",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d10",
          "damage_bonus": 4
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nAcid Breath. The dragon exhales acid in an 40-foot line that is 5 feet wide. Each creature in that line must make a DC 14 Dexterity saving throw, taking 40 (9d8) acid damage on a failed save, or half as much damage on a successful one.\nSlowing Breath. The dragon exhales gas in a 30-foot cone. Each creature in that area must succeed on a DC 14 Constitution saving throw. On a failed save, the creature can't use reactions, its speed is halved, and it can't make more than one attack on its turn. In addition, the creature can use either an action or a bonus action on its turn, but not both. These effects last for 1 minute. The creature can repeat the saving throw at the end of each of its turns, ending the effect on itself with a successful save.",
          "attack_bonus": 0,
          "damage_dice": "9d8"
        }
      ]
    },
    {
      "name": "Young Gold Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 18,
      "hit_points": 178,
      "hit_dice": "17d10",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 23,
      "dexterity": 14,
      "constitution": 21,
      "intelligence": 16,
      "wisdom": 13,
      "charisma": 20,
      "dexterity_save": 6,
      "constitution_save": 9,
      "wisdom_save": 5,
      "charisma_save": 9,
      "insight": 5,
      "perception": 9,
      "persuasion": 9,
      "stealth": 6,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 19",
      "languages": "Common, Draconic",
      "challenge_rating": "10",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.",
          "attack_bonus": 10,
          "damage_dice": "2d10",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 10,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nFire Breath. The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 17 Dexterity saving throw, taking 55 (10d10) fire damage on a failed save, or half as much damage on a successful one.\nWeakening Breath. The dragon exhales gas in a 30-foot cone. Each creature in that area must succeed on a DC 17 Strength saving throw or have disadvantage on Strength-based attack rolls, Strength checks, and Strength saving throws for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "10d10"
        }
      ]
    },
    {
      "name": "Young Green Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful evil",
      "armor_class": 18,
      "hit_points": 136,
      "hit_dice": "16d10",
      "speed": "40 ft., fly 80 ft., swim 40 ft.",
      "strength": 19,
      "dexterity": 12,
      "constitution": 17,
      "intelligence": 16,
      "wisdom": 13,
      "charisma": 15,
      "dexterity_save": 4,
      "constitution_save": 6,
      "wisdom_save": 4,
      "charisma_save": 5,
      "deception": 5,
      "perception": 7,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "poison",
      "condition_immunities": "poisoned",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 17",
      "languages": "Common, Draconic",
      "challenge_rating": "8",
      "special_abilities": [
        {
          "name": "Amphibious",
          "desc": "The dragon can breathe air and water.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage plus 7 (2d6) poison damage.",
          "attack_bonus": 7,
          "damage_dice": "2d10 + 2d6",
          "damage_bonus": 4
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Poison Breath (Recharge 5-6)",
          "desc": "The dragon exhales poisonous gas in a 30-foot cone. Each creature in that area must make a DC 14 Constitution saving throw, taking 42 (12d6) poison damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "12d6"
        }
      ]
    },
    {
      "name": "Young Red Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 18,
      "hit_points": 178,
      "hit_dice": "17d10",
      "speed": "40 ft., climb 40 ft., fly 80 ft.",
      "strength": 23,
      "dexterity": 10,
      "constitution": 21,
      "intelligence": 14,
      "wisdom": 11,
      "charisma": 19,
      "dexterity_save": 4,
      "constitution_save": 9,
      "wisdom_save": 4,
      "charisma_save": 8,
      "perception": 8,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "fire",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 18",
      "languages": "Common, Draconic",
      "challenge_rating": "10",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage plus 3 (1d6) fire damage.",
          "attack_bonus": 10,
          "damage_dice": "2d10 + 1d6",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 10,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Fire Breath (Recharge 5-6)",
          "desc": "The dragon exhales fire in a 30-foot cone. Each creature in that area must make a DC 17 Dexterity saving throw, taking 56 (16d6) fire damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "16d6"
        }
      ]
    },
    {
      "name": "Young Silver Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "lawful good",
      "armor_class": 18,
      "hit_points": 168,
      "hit_dice": "16d10",
      "speed": "40 ft., fly 80 ft.",
      "strength": 23,
      "dexterity": 10,
      "constitution": 21,
      "intelligence": 14,
      "wisdom": 11,
      "charisma": 19,
      "dexterity_save": 4,
      "constitution_save": 9,
      "wisdom_save": 4,
      "charisma_save": 8,
      "arcana": 6,
      "history": 6,
      "perception": 8,
      "stealth": 4,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 18",
      "languages": "Common, Draconic",
      "challenge_rating": "9",
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +10 to hit, reach 10 ft., one target. Hit: 17 (2d10 + 6) piercing damage.",
          "attack_bonus": 10,
          "damage_dice": "2d10",
          "damage_bonus": 6
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +10 to hit, reach 5 ft., one target. Hit: 13 (2d6 + 6) slashing damage.",
          "attack_bonus": 10,
          "damage_dice": "2d6",
          "damage_bonus": 6
        },
        {
          "name": "Breath Weapons (Recharge 5-6)",
          "desc": "The dragon uses one of the following breath weapons.\nCold Breath. The dragon exhales an icy blast in a 30-foot cone. Each creature in that area must make a DC 17 Constitution saving throw, taking 54 (12d8) cold damage on a failed save, or half as much damage on a successful one.\nParalyzing Breath. The dragon exhales paralyzing gas in a 30-foot cone. Each creature in that area must succeed on a DC 17 Constitution saving throw or be paralyzed for 1 minute. A creature can repeat the saving throw at the end of each of its turns, ending the effect on itself on a success.",
          "attack_bonus": 0,
          "damage_dice": "12d8"
        }
      ]
    },
    {
      "name": "Young White Dragon",
      "size": "Large",
      "type": "dragon",
      "subtype": "",
      "alignment": "chaotic evil",
      "armor_class": 17,
      "hit_points": 133,
      "hit_dice": "14d10",
      "speed": "40 ft., burrow 20 ft., fly 80 ft., swim 40 ft.",
      "strength": 18,
      "dexterity": 10,
      "constitution": 18,
      "intelligence": 6,
      "wisdom": 11,
      "charisma": 12,
      "dexterity_save": 3,
      "constitution_save": 7,
      "wisdom_save": 3,
      "charisma_save": 4,
      "perception": 6,
      "stealth": 3,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "cold",
      "condition_immunities": "",
      "senses": "blindsight 30 ft., darkvision 120 ft., passive Perception 16",
      "languages": "Common, Draconic",
      "challenge_rating": "6",
      "special_abilities": [
        {
          "name": "Ice Walk",
          "desc": "The dragon can move across and climb icy surfaces without needing to make an ability check. Additionally, difficult terrain composed of ice or snow doesn't cost it extra moment.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Multiattack",
          "desc": "The dragon makes three attacks: one with its bite and two with its claws.",
          "attack_bonus": 0
        },
        {
          "name": "Bite",
          "desc": "Melee Weapon Attack: +7 to hit, reach 10 ft., one target. Hit: 15 (2d10 + 4) piercing damage plus 4 (1d8) cold damage.",
          "attack_bonus": 7,
          "damage_dice": "2d10 + 1d8",
          "damage_bonus": 4
        },
        {
          "name": "Claw",
          "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft., one target. Hit: 11 (2d6 + 4) slashing damage.",
          "attack_bonus": 7,
          "damage_dice": "2d6",
          "damage_bonus": 4
        },
        {
          "name": "Cold Breath (Recharge 5-6)",
          "desc": "The dragon exhales an icy blast in a 30-foot cone. Each creature in that area must make a DC 15 Constitution saving throw, taking 45 (10d8) cold damage on a failed save, or half as much damage on a successful one.",
          "attack_bonus": 0,
          "damage_dice": "10d8"
        }
      ]
    },
    {
      "name": "Zombie",
      "size": "Medium",
      "type": "undead",
      "subtype": "",
      "alignment": "neutral evil",
      "armor_class": 8,
      "hit_points": 22,
      "hit_dice": "3d8",
      "speed": "20 ft.",
      "strength": 13,
      "dexterity": 6,
      "constitution": 16,
      "intelligence": 3,
      "wisdom": 6,
      "charisma": 5,
      "wisdom_save": 0,
      "damage_vulnerabilities": "",
      "damage_resistances": "",
      "damage_immunities": "",
      "condition_immunities": "poisoned",
      "senses": "darkvision 60 ft., passive Perception 8",
      "languages": "understands all languages it spoke in life but can't speak",
      "challenge_rating": "1/4",
      "special_abilities": [
        {
          "name": "Undead Fortitude",
          "desc": "If damage reduces the zombie to 0 hit points, it must make a Constitution saving throw with a DC of 5+the damage taken, unless the damage is radiant or from a critical hit. On a success, the zombie drops to 1 hit point instead.",
          "attack_bonus": 0
        }
      ],
      "actions": [
        {
          "name": "Slam",
          "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft., one target. Hit: 4 (1d6 + 1) bludgeoning damage.",
          "attack_bonus": 3,
          "damage_dice": "1d6",
          "damage_bonus": 1
        }
      ]
    }
  ]

  return {
    add: this.add,
    find: this.find,
    findOrCreateBy: this.findOrCreateBy,
    data: this.data
  }
}()
;
const Persistence = function() {
  this.save = (tracker) => {
    localStorage.setItem('agents', JSON.stringify(tracker.index()))
  }

  this.load = () => {
    const tracker = new Tracker
    tracker.load(JSON.parse(localStorage.getItem('agents')))
    return new AppComponent(Elements.main, tracker)
  }

  return {
    save: this.save,
    load: this.load
  }
}()
;
const Dice = function() {
  this.number = (diceString) => {
    return diceString.match(/^(\d+)/)[0]
  }

  this.type = (diceString) => {
    return diceString.match(/^\d+d(\d+)/)[1]
  }

  return {
    number: this.number,
    type: this.type
  }
}()
;
const Roll = function(diceString) {
  const numberOfDice = diceString.match(/^(\d+)/)[0]
  const typeOfDice = diceString.match(/^\d+d(\d+)/)[1]

  let accumulator = 0
  for(var i = 0; i < numberOfDice; i++) {
    accumulator += Math.floor(Math.random() * typeOfDice) + 1
  }
  return accumulator
} 
;
const Modifier = function(raw) {
  return Math.floor((parseFloat(raw) - 10) / 2)
}
;
const AbilityScores = function() {
  const ABILITY_SCORES = [
    "strength", 
    "dexterity", 
    "constitution", 
    "intelligence", 
    "wisdom", 
    "charisma"
  ]

  this.short = () => {
    return ABILITY_SCORES.map((score) => score.slice(0, 3).capitalize())
  }

  this.full = () => {
    return ABILITY_SCORES
  }

  return {
    short: this.short(),
    full: this.full()
  }
}()
;
const Agent = function(id, name, initiative, ac, hp, status) {
  this.PROPERTIES = ['initiative', 'ac', 'hp', 'status']

  this.id     = id
  this.name   = name || "Untitled Creature"
  this.initiative = initiative || Roll("1d20")
  this.ac     = ac || 10
  this.hp     = hp || 0
  this.status = status || ""

  this.isKilled = () => {
    return this.hp < 0
  }
}
;
const Tracker = function() {
  this.agents = []
  this.serial = 1

  this.index = () => {
    return this.agents.sort((agent1, agent2) => agent2.initiative - agent1.initiative)
  }

  this.upsert = (agent) => {
    if (!this.agents.includes(agent)) {
      this._add(agent)
    }
  }

  this.load = (agents) => {
    for(let i = 0; i < agents.length; i++) {
      const agent = new Agent(
        this.serial++,
        agents[i].name,
        parseInt(agents[i].initiative),
        parseInt(agents[i].ac),
        parseInt(agents[i].hp),
        agents[i].status
      )
      this._add(agent)
    }
  }

  this._add = (agent) => {
    agent.id = this.serial++
    this.agents.push(agent)
  }
}
;
const AppComponent = function(rootElement, tracker) {
  this.render = () => {
    this.el = document.createElement('div')
    this.el.id = 'app'

    this.infoBox = new InfoBox(this)

    this.el.appendChild(new ButtonBar(this))
    this.el.appendChild(new InitiativeTable(this, tracker))
    this.el.appendChild(this.infoBox)

    if(previous = document.getElementById('app'))
      rootElement.replaceChild(this.el, previous)
    else
      rootElement.appendChild(this.el)
  }

  this.save = () => {
    Persistence.save(tracker)
  }

  this.load = () => {
    App = Persistence.load()
  }

  this.hover = (agent) => {
    this.infoBox = new InfoBox(this, agent)
    this.el.replaceChild(new InfoBox(this, agent), document.getElementById('info-box'))
  }

  return this.render()
}
;
const ButtonBar = function(parent) {
  this.render = () => {
    let el = document.createElement('aside')
    el.className = 'btn-toolbar'

    el.appendChild(new SaveComponent(this))
    el.appendChild(new LoadComponent(this))

    return el
  }

  this.save = () => {
    parent.save()
  }

  this.load = () => {
    parent.load()
  }

  return this.render()
}
;
const InitiativeTable = function(parent, tracker) {
  this.render = () => {
    let el = document.createElement('table')
    el.className = 'table initiative-table'

    el.appendChild(new HeadersComponent(this, ['Creature', 'Initiative', 'AC', 'Health', 'Status']))
    el.appendChild(new TrackerComponent(this, tracker))

    return el
  }

  this.change = () => {
    parent.render()
  }

  this.hover = (agent) => {
    parent.hover(agent)
  }

  return this.render()
}
;
const HeadersComponent = function(parent, headers) {
  this.render = () => {
    let el = document.createElement('thead')

    headers.forEach((header) => {
      let headerElement = document.createElement('td')
      headerElement.appendChild(document.createTextNode(header))
      el.appendChild(headerElement)
    })

    return el
  }

  return this.render();
}
;
const TrackerComponent = function(parent, tracker) {
  this.render = () => {
    let el = document.createElement('tbody')
    tracker.index().forEach((agent) => {
      el.appendChild(new AgentComponent(this, agent))
    })
    el.appendChild(new AgentComponent(this, new Agent, "agent--new"))

    return el
  }

  this.change = (agent) => {
    tracker.upsert(agent)

    parent.change()
  }

  this.hover = (agent) => {
    parent.hover(agent)
  }

  return this.render()
}
;
const AgentComponent = function(parent, agent, classes = []) {
  this.render = () => {
    let el = document.createElement('tr')
    el.className = `agent ${this._classes()}`

    el.appendChild(new CreatureSelectorComponent(this, agent))

    agent.PROPERTIES.forEach((property) => {
      el.appendChild(new PropertyComponent(this, agent, property))
    })

    el.onmouseenter = () => { this._hover() }

    return el
  }

  this._classes = () => {
    if (agent.isKilled())
      classes.push('agent--killed')
    return classes
  }

  this.change = (creature) => {
    agent.name       = creature.name
    agent.initiative = parseInt(agent.initiative + Modifier(creature.dexterity || 10))
    agent.ac         = parseInt(creature.armor_class)
    agent.hp         = parseInt(creature.hit_points)

    parent.change(agent)
  }

  this.changeProperty = (property, value) => {
    agent[property] = value

    parent.change(agent)
  }

  this._hover = () => {
    parent.hover(agent)
  }

  return this.render()
}
;
const PropertyComponent = function(parent, agent, property) {
  this.render = () => {
    let el = document.createElement("td")
    el.className = "property"
    el.onblur = () => { this._change(el.textContent) }
    el.onfocus = () => { el.textContent = '' }
    el.oninput = (event) => { this._handleEnter(event, el) }
    el.contentEditable = true
    el.appendChild(document.createTextNode(agent[property]))

    return el
  }

  this._change = (value) => {
    parent.changeProperty(property, value)
  }

  this._handleEnter = (event, el) => {
    if (event.inputType == 'insertText' && event.data == null)
      el.blur()
  }

  return this.render()
}
;
const CreatureSelectorComponent = function(parent, agent) {
  this.render = () => {
    let el = document.createElement('td')
    el.className = 'property creature-selector'

    let select = document.createElement('select')

    this._enablePlaceholders(select)

    Creatures.data.forEach((creature) => {
      select.appendChild(new CreatureOptionComponent(this, creature, creature.name == agent.name))
    })

    select.onchange = () => { this._change(select.value) }

    el.appendChild(select)

    $(select).select2({
      placeholder: "Select or create creature",
      tags: true
    })

    return el
  }

  this._enablePlaceholders = (select) => {
    select.appendChild(document.createElement('option'))
  }

  this._change = (name) => {
    parent.change(Creatures.findOrCreateBy(name))
  }

  return this.render()
}
;
const CreatureOptionComponent = function(parent, creature, selected) {
  this.render = () => {
    let el = document.createElement('option')
    el.appendChild(document.createTextNode(creature.name))
    el.selected = selected

    return el
  }

  return this.render()
}
;
const SaveComponent = function(parent) {
  this.render = () => {
    let el = document.createElement('button')
    el.appendChild(document.createTextNode('Save'))
    el.className = 'btn btn-info btn--save'
    el.onclick = () => { this.save() }
    return el
  }

  this.save = () => {
    parent.save()
  }

  return this.render()
}
;
const LoadComponent = function(parent) {
  this.render = () => {
    let el = document.createElement('button')
    el.appendChild(document.createTextNode('Load'))
    el.className = 'btn btn-warning btn--load'
    el.onclick = () => { this.load() }
    return el
  }

  this.load = () => {
    parent.load()
  }

  return this.render()
}
;
const InfoBox = function(parent, agent) {
  this.render = () => {
    let el = document.createElement('aside')
    el.id = 'info-box'
    el.className = 'info-box'

    if(agent) {
      const creature = Creatures.find(agent.name)
      el.appendChild(this._header(`${agent.name}${agent.isKilled() ? ' (killed)' : ''}`))

      if(creature) {
        // uncomment to render an image for this creature
        // el.appendChild(new ImageComponent(this, creature))

        el.appendChild(this._paragraph(`${creature.size} ${creature.type}${creature.subtype.length > 0 ? ` (${creature.subtype})` : ''}, ${creature.alignment}`))
        el.appendChild(this._paragraph(creature.armor_class, 'Armor Class'))
        el.appendChild(this._paragraph(`${agent.hp} (${creature.hit_dice}${ creature.constitution > 10 ? ` + ${ Dice.number(creature.hit_dice) * Modifier(creature.constitution)}` : '' })`, 'Hit Points'))
        el.appendChild(this._paragraph(creature.speed, 'Speed'))

        el.appendChild(new AbilityScoresBox(this, creature))
        el.appendChild(new SavingThrowsBox(this, creature))
      }
    }

    return el
  }

  this._header = (content) => {
    let header = document.createElement('h2')
    header.appendChild(document.createTextNode(content))
    return header
  }

  this._paragraph = (content, label) => {
    let paragraph = document.createElement('p')
    if(label) 
      paragraph.appendChild(this._bold(label))
    paragraph.appendChild(document.createTextNode(content))
    return paragraph
  }

  this._bold = (content) => {
    let bold = document.createElement('span')
    bold.className = 'label--strong'
    bold.appendChild(document.createTextNode(content))
    return bold
  }

  return this.render()
}
;
const ImageComponent = function(parent, creature) {
  this.render = () => {
    let el = document.createElement('img')
    el.className = "image"
    el.src = "/assets/images/default.png"

    return el
  }

  return this.render()
}
;
const AbilityScoresBox = function(parent, creature) {
  this.render = () => {
    let el = document.createElement('table')
    el.className = 'table table--ability-scores'

    el.appendChild(new HeadersComponent(this, AbilityScores.short))
    el.appendChild(this._tbody())

    return el
  }

  this._tbody = () => {
    let tbody = document.createElement('tbody')
    AbilityScores.full.forEach(function(abilityScore) {
      let cell = document.createElement('td')
      let score = creature[abilityScore]
      let modifier = Modifier(score)
      let modifierSign = Math.sign(modifier) == -1 ? "-" : "+"
      cell.appendChild(document.createTextNode(`${score} (${modifierSign}${Math.abs(modifier)})`))
      tbody.appendChild(cell)
    })

    return tbody
  }

  return this.render()
}
;
const SavingThrowsBox = function(parent, creature) {
  this.render = () => {
    let throws = []

    AbilityScores.full.forEach((abilityScore) => {
      let save
      if(save = creature[`${abilityScore}_save`])
        throws.push(`${abilityScore.slice(0, 3).capitalize()} +${save}`)
    })

    if(throws.length > 0)
      return this._paragraph(throws.join(", "), "Saving Throws")
    
    return document.createElement('spacer') 
  }

  this._paragraph = (content, label) => {
    let paragraph = document.createElement('p')
    if(label) 
      paragraph.appendChild(this._bold(label))
    paragraph.appendChild(document.createTextNode(content))
    return paragraph
  }

  this._bold = (content) => {
    let bold = document.createElement('span')
    bold.className = 'label--strong'
    bold.appendChild(document.createTextNode(content))
    return bold
  }

  return this.render()
}
;
const Elements = function() {
  return {
    main: document.getElementById('main')
  }
}()
;
//------------------------------------
//	#Bootstrap JS Components
//------------------------------------



































let tracker = new Tracker
let App = new AppComponent(Elements.main, tracker)
;
