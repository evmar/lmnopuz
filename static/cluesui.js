// Crossword Javascript
// Copyright (c) 2005 Evan Martin <martine@danga.com>

// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:

// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
// BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE. 


function CluesBox(title, clues) {
  var container = document.createElement('div');
  container.className = 'cluesbox';

  var heading = document.createElement('h3')
  heading.appendChild(document.createTextNode(title.toUpperCase()));
  heading.className = (title == 'down') ? 'down' : undefined;
  container.appendChild(heading);

  var scroller = document.createElement('div');
  scroller.frameborder = 0;
  scroller.className = 'scroller';
  this.scroller = scroller;
  var i;
  this.divs = {};
  for (i = 0; i < clues.length; ++i) {
    var number = clues[i][0];
    var entry = document.createElement('div');
    entry.className = 'clue';
    entry.direction = title == 'across';
    entry.number = number;
    entry.onclick = function() {
      Globals.widget.selectByClue(this.number, this.direction);
    };
    entry.innerHTML = number + ' ' + clues[i][1];

    scroller.appendChild(entry);
    this.divs[number] = entry;
  }
  container.appendChild(scroller);

  this.container = container;
};

CluesBox.prototype.unhighlight = function() {
  if (this.highlighted) {
    this.highlighted.className = 'clue';
    this.highlighted = 0;
  }
};

CluesBox.prototype.scrollTo = function(number, primary) {
  if (!this.divs[number])
    return;
  var clue = this.divs[number];
  var offset = clue.offsetTop - this.scroller.offsetTop;
  smoothScroll(this.scroller,
    offset - this.scroller.clientHeight / 2 + clue.clientHeight);
  this.unhighlight();
  clue.className = 'clue ' +
    (primary ? 'primaryhighlighted' : 'otherhighlighted');
  this.highlighted = clue;
};

CluesBox.prototype.getClueText = function(num) {
  var clue = this.divs[num];
  if (!clue) return undefined;
  return '"' + unescapeHTML(clue.innerHTML).
      replace(/^[0-9]+ */, '').replace(/"/g, "'") + '"';
}

function CluesUI(crossword) {
  this.container = document.createElement('div');
  this.across = new CluesBox("across", crossword.across);
  this.container.appendChild(this.across.container);
  this.down = new CluesBox("down", crossword.down);
  this.container.appendChild(this.down.container);
};

CluesUI.prototype.focusClues = function(across_num, down_num, dir_across) {
  if (dir_across) {
    this.across.scrollTo(across_num, true);
    this.down.scrollTo(down_num, false);
  } else {
    this.across.scrollTo(across_num, false);
    this.down.scrollTo(down_num, true);
  }
};

CluesUI.prototype.getClueText = function(num, across) {
  var box = across ? this.across : this.down;
  return box.getClueText(num);
}

CluesUI.prototype.setHeight = function(height) {
  var cluebox_height = parseInt(height / 2);  // round down

  // Set the containers' heights to half of the total height, and the
  // scrollers' heights to that of the container minus that of the heading.
  for (var i = 0; i < 2; i++) {
    var cluebox = this.container.childNodes[i];
    var heading_height = cluebox.childNodes[0].offsetHeight;
    cluebox.style.height = cluebox_height;
    cluebox.childNodes[1].style.height = cluebox_height - heading_height;
  }
};

// vim: set ts=2 sw=2 et :
