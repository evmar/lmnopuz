function smoothScroll(element, desiredScrollTop) {
  var kFrameDelay = 30;  // Delay (in ms) between frames of animation.

  if (desiredScrollTop != undefined) {
    // If we're getting called with a new position, we update the desired
    // position and then return if a position was already set (i.e. we're
    // already being scrolled).
    var inProgress = element.desiredScrollTop != undefined;
    desiredScrollTop = Math.max(0, desiredScrollTop);
    desiredScrollTop = Math.min(element.scrollHeight - element.clientHeight,
                                desiredScrollTop);
    element.desiredScrollTop = parseInt(desiredScrollTop);
    if (inProgress) return;  // The already-running timer will update us.
  }

  if (element.desiredScrollTop != undefined) {
    var offset = parseInt((element.desiredScrollTop + element.scrollTop) / 2
                          - element.scrollTop);
    if (offset >= -1 && offset <= 1) {
      element.scrollTop = element.desiredScrollTop;
      element.desiredScrollTop = undefined;
    } else {
      element.scrollTop += offset;
      setTimeout(function() { smoothScroll(element); }, kFrameDelay);
    }
  }
}

// from http://blog.firetree.net/2005/07/04/javascript-find-position/
// written by Peter-Paul Koch & Alex Tingle
function findPosX(obj) {
  var curleft = 0;
  if (obj.offsetParent) {
    while(1) {
      curleft += obj.offsetLeft;
      if (!obj.offsetParent) break;
      obj = obj.offsetParent;
    }
  } else if (obj.x) {
    curleft += obj.x;
  }
  return curleft;
};

function findPosY(obj) {
  var curtop = 0;
  if (obj.offsetParent) {
    while (1) {
      curtop += obj.offsetTop;
      if (!obj.offsetParent) break;
      obj = obj.offsetParent;
    }
  } else if (obj.y) {
    curtop += obj.y;
  }
  return curtop;
};

function toWidth(num, width) {
  var out = num.toString();
  while (out.length < width) out = '0' + out;
  return out;
};


function parseHexColor(str) {
  var res = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(str);
  if (res) {
    r = res[1]+res[1]; g = res[2]+res[2]; b = res[3]+res[3];
  } else {
    res = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(str);
    if (res) {
      r = res[1]; g = res[2]; b = res[3];
    } else {
      return null;
    }
  }
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
};

function makeHexColor(rgb_array) {
  var out = '#';
  for (var i = 0; i < 3; i++) {
    out += toWidth(parseInt(rgb_array[i]).toString(16), 2);
  }
  return out;
};

function darkenHexColor(str, pct) {
  var rgb = parseHexColor(str);
  for (var i = 0; i < 3; i++) rgb[i] *= pct;
  return makeHexColor(rgb);
};

// TODO: This is pretty cheesy.  We should instead use a more general
// method, like that of String.prototype.unescapeHTML() in
// http://dev.rubyonrails.org/browser/spinoffs/scriptaculous/lib/prototype.js
function unescapeHTML(str) {
  return str.replace(/&amp;/g, '&').replace(/&quot;/g, '"').
      replace(/&lt;/g, '<').replace(/&gt;/g, '>');
};
