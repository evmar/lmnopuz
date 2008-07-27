function Roster() {
  this.defaultname = 'anonymous';

  this.container = document.createElement('div');
  this.container.className = 'container';

  this.namediv = document.createElement('div');
  this.namediv.className = 'namediv';
  this.container.appendChild(this.namediv);

  this.nametext = document.createElement('span');
  this.nametext.className = 'nametext';
  this.nametext.innerHTML = 'Name:';
  this.namediv.appendChild(this.nametext);

  this.namelink = document.createElement('a');
  this.namelink.className = 'namelink';
  this.namelink.onclick = function(e) {
    Globals.roster.handleNameClick(e);
    return false;
  };
  this.namelink.innerHTML = this.defaultname;
  this.namelink.setAttribute('href', '#');
  this.namediv.appendChild(this.namelink);

  this.nameinput = document.createElement('input');
  this.nameinput.className = 'nameinput';
  this.nameinput.onkeypress = function(e) {
    return Globals.roster.handleNameKeyPress(e);
  };
  this.nameinput.setAttribute('type', 'text');
  this.nameinput.setAttribute('size', 16);
  this.nameinput.setAttribute('maxlength', 16);
  this.nameinput.style.display = 'none';
  this.namediv.appendChild(this.nameinput);

  this.scroller = document.createElement('div');
  this.scroller.className = 'scroller';
  this.scroller.style.overflow = 'auto';
  this.container.appendChild(this.scroller);
};

Roster.prototype.handleNameClick = function(e) {
  this.namelink.style.display = 'none';
  this.nametext.innerHTML = 'New name:';
  this.nameinput.value = this.namelink.innerHTML;
  this.scroller.style.visibility = 'hidden';
  this.nameinput.style.display = 'inline';
  this.setHeight(this.container.clientHeight);
  this.scroller.style.visibility = 'visible';
  this.nameinput.focus();
  this.nameinput.select();
};

Roster.prototype.handleNameKeyPress = function(e) {
  // Stop the event so the crossword widget won't receive it.
  if (e.stopPropagation) e.stopPropagation();  // mozilla
  if (e.cancelBubble) e.cancelBubble = true;   // ie (untested)

  if (e.keyCode == 13) {
    var name = this.nameinput.value;
    if (name.length > 0) {
      if (name != Globals.mp.getName()) {
        Globals.mp.changeName(name);
      }
      this.nameinput.style.display = 'none';
      this.nametext.innerHTML = 'Name:';
      this.namelink.style.display = 'inline';
      this.namediv.className = 'namediv';
      this.setHeight(this.container.clientHeight);
      Globals.widget.focus();
    }
    return false;
  }
  return true;
};

Roster.prototype.handleFirstLoad = function() {
  Globals.roster.namelink.innerHTML = Globals.mp.getName();
  Globals.roster.namelink.style.background = Globals.mp.getColor();
  if (Globals.roster.namelink.innerHTML == Globals.roster.defaultname) {
    Globals.roster.namediv.className = 'namediv namedivhl';
    Globals.roster.setHeight(Globals.roster.container.clientHeight);
  }
};

Roster.prototype.syncUsers = function(users) {
  while (this.scroller.firstChild) {
    this.scroller.removeChild(this.scroller.firstChild);
  }
  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    var div = document.createElement('div');
    div.className = 'line';

    var name = document.createElement('span');
    name.className = 'name';
    name.style.background = user.color;
    name.innerHTML = user.name;
    div.appendChild(name);

    this.scroller.appendChild(div);
  }
};

Roster.prototype.updateDisplayedName = function(name, color) {
  if (this.namelink.innerHTML != name) {
    this.namelink.innerHTML = name;
  }
  if (this.namelink.style.background != color) {
    this.namelink.style.background = color;
  }
};

// Resize the console and its contents to the specified height.
Roster.prototype.setHeight = function(height) {
  this.container.style.height = height;

  // We make the scroller take up all space in the container available
  // for clients, minus the actual size (including borders and margins)
  // of the name div, minus the size of the border around the scroller.
  this.scroller.style.height =
    this.container.clientHeight - this.namediv.offsetHeight - 1;
};
