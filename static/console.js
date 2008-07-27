function Console(max_lines, chatbox) {
  this.initial_message_cleared = false;
  this.container = document.createElement('div');
  this.container.className = 'container';

  this.scroller = document.createElement('div');
  this.scroller.style.overflow = 'auto';
  this.scroller.style.width = '100%';
  this.scroller.className = 'scroller';

  this.container.appendChild(this.scroller);

  if (chatbox) {
    this.entry = document.createElement('input');
    this.entry.console = this;  // XXX: memory leak?
    this.entry.type = 'text';
    this.entry.value = 'Type here and press Enter to chat.';
    this.entry.className = 'entry';
    this.entry.style.width = '100%';
    this.entry.style.color = '#999';
    this.entry.onfocus = function() {
      if (!this.console.initial_message_cleared) {
        this.value = '';
        this.style.color = '';
        this.onclick = undefined;
        this.console.initial_message_cleared = true;
      }
      this.console.focused = true;
      Globals.focusbox.moveTo(
        findPosX(this),
        findPosY(this),
        this.offsetWidth,
        this.offsetHeight,
        true);
    };
    this.entry.onblur = function() {
      this.className = 'entry';
      this.console.focused = false;
      // XXX calling out to the window's handler like this is ugly, but it
      // won't receive blur events otherwise when the entry has the focus --
      // i should figure out why this is the case.
      handleBlur();
    };
    this.entry.onkeypress = function(e) {
      // Stop the event so the crossword widget won't receive it.
      if (e.stopPropagation) e.stopPropagation();  // mozilla
      if (e.cancelBubble) e.cancelBubble = true;   // ie (untested)

      if (e.keyCode == 13 && this.console.onMessageSent) {  // enter
        var text = this.value;
        if (text.length > 0) this.console.onMessageSent(text);
        this.value = '';
        return false;
      } else if ((e.keyCode == 27 || e.keyCode == 9)) {  // escape or tab
        Globals.widget.focus();
        return false;
      }
      return true;
    }

    // keypress events don't fire for the up and down arrow keys, so we need
    // to listen for keyup to give the focus back to the puzzle.
    this.entry.onkeyup = function(e) {
      if (e.keyCode == 38 || e.keyCode == 63232 ||  // up
          e.keyCode == 40 || e.keyCode == 63233) {  // down
        Globals.widget.focus();
        return false;
      }
      return true;
    }
    this.container.appendChild(this.entry);
  }

  this.max_lines = max_lines;
};

Console.prototype.focus = function() {
  if (this.entry) this.entry.focus();
}

Console.prototype.write = function(str, timestamp, noscroll) {
  while (this.max_lines > 0 &&
         this.scroller.childNodes.length >= this.max_lines) {
    this.scroller.removeChild(this.scroller.childNodes[0]);
  }

  var date = new Date();
  if (timestamp) date.setTime(timestamp * 1000);
  var time = toWidth(date.getHours(), 2) + ":" +
             toWidth(date.getMinutes(), 2) + ":" +
             toWidth(date.getSeconds(), 2);

  var line = document.createElement('div');
  line.innerHTML = '<span class="time">' + time + '</span> ' + str;
  line.className = 'line';
  line.console = this;
  this.scroller.appendChild(line);
  if (!noscroll) this.scroller.scrollTop = line.offsetTop;
};

Console.prototype.scrollToBottom = function() {
  if (this.scroller.childNodes.length > 0) {
    this.scroller.scrollTop =
      this.scroller.childNodes[this.scroller.childNodes.length-1].offsetTop;
  }
};

Console.prototype.flash = function() {
  if (this.focused) return;
  var container = this.container;
  container.className = 'container containerhighlighted';
  window.setTimeout(function() { container.className = 'container'; }, 150);
};

// Swap the page's title between Globals.console.titleToFlash and
// originalTitle 'remaining' times.
Console.prototype.swapTitle = function(remaining) {
  if (!remaining) return;
  var c = Globals.console;
  document.title = (document.title == c.originalTitle) ?
                   c.titleToFlash : c.originalTitle;
  c.titleTimeoutId = window.setTimeout(
    function() { c.swapTitle(remaining - 1); }, 1500);
};

// Make the title begin flashing 'text' if the window isn't focused.
Console.prototype.startTitleFlash = function(text) {
  if (Globals.windowFocused) return;
  this.stopTitleFlash();

  this.titleToFlash = text;
  this.originalTitle = document.title;
  this.swapTitle(10);
};

// Make the title stop flashing.
Console.prototype.stopTitleFlash = function() {
  if (this.titleTimeoutId) {
    window.clearTimeout(this.titleTimeoutId);
    document.title = this.originalTitle;
    this.titleTimeoutId = undefined;
    this.titleToFlash = undefined;
    this.originalTitle = undefined;
  }
};

// Simulate a click on the last link in the console.
Console.prototype.clickLastLink = function() {
  for (var i = this.scroller.childNodes.length-1; i >= 0; i--) {
    var links = this.scroller.childNodes[i].getElementsByTagName('a');
    if (links.length) {
      var link = links[links.length-1];
      // Is there some way to simulate a click?  I've seen references to IE
      // and Opera having click() methods, but it doesn't seem to be there
      // in Firefox.
      if (link.onclick) {
        link.onclick();
      } else {
        window.open(link.href, link.target);
      }
      break;
    }
  }
};

Console.prototype.setHeight = function(height) {
  if (this.entry)
    this.scroller.style.height = height - this.entry.clientHeight;
  else
    this.scroller.style.height = height;
};

function log(str, timestamp) {
  Globals.console.write(str, timestamp, false);
};
function trace(str) {
  log(str);
};
