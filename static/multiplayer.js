function User(name, color) {
  this.name = name;
  this.color = color;
}

function Multiplayer(serverurl, widget, roster, console, initialcallback) {
  this.players = {};
  this.cursors = {};  // uid -> FocusBox
  this.uid = undefined;
  this.events = [];
  this.url = serverurl;
  this.widget = widget;
  this.roster = roster;
  this.console = console;
  this.sendtimeoutid = undefined;
  var mp = this;
  this.widget.onChanged = function(x,y,letter) { mp.addFillEvent(x,y,letter); };
  this.widget.onMessageSent = this.console.onMessageSent =
    function(txt) { mp.addEvent('msg', [txt], true) };
  this.console.onClueLinkClicked = function(num, across) {
    widget.selectByClue(num, across); return false;
  }
  this.initialcallback = initialcallback;
  this.fetchUpdates(true);
};

// Start an XMLHttpRequest that stays blocked until the server has an update.
//   full is true to ask for a "full" update, which includes all game state.
Multiplayer.prototype.fetchUpdates = function(full) {
  // If we're in the process of shutting down, don't fetch any more updates.
  if (this.shutting_down) return;

  var req = new XMLHttpRequest();
  var mp = this;
  var url = this.url + 'state.js';
  if (full) url += '?full=1';

  // Notification of XMLHttpRequest errors in Firefox is pretty jacked.
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=238559 for details.
  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      try {
        if (req.status && req.status == 200) {
          if (req.responseText) {
            var state = eval('('+req.responseText+')');
            if (state) mp.processUpdate(state, full);
          }
          if (!mp.shutting_down) {
            window.setTimeout(function(){mp.fetchUpdates(false)}, 0);
          }
        } else {
          log('Got ' + req.status + ' response "' + req.responseText +
              '" from server; reconnecting in 5 seconds');
          window.setTimeout(function(){mp.fetchUpdates(false)}, 5000);
        }
      } catch (e) {
        log('Caught exception while checking XMLHttpRequest status; ' +
            'reconnecting in 5 seconds');
        window.setTimeout(function(){mp.fetchUpdates(false)}, 5000);
      }
    }
  };

  req.open('POST', url, true);
  req.send('');
};

Multiplayer.prototype.addFillEvent = function(x, y, update) {
  // Super cheesy -- users hit lowercase keys for regular answers and
  // uppercase for guesses, but the client-to-server communication is
  // probably more intuitive if sure answers are uppercase and guesses are
  // lower, so we swap the case here.
  var ch = update.charCodeAt(0);
  if (ch >= 97 && ch <= 122) {
    update = update.toUpperCase();
  } else if (ch >= 65 && ch <= 90) {
    update = update.toLowerCase();
  }
  this.addEvent('xy', [x, y, update], false);
};

Multiplayer.prototype.addCursorEvent = function(x, y) {
  this.addEvent('cursor', [x, y], false);
};

Multiplayer.prototype.addEvent = function(type, vals, immediate) {
  this.events.push([type].concat(vals).join('\t'));
  if (this.sendtimeoutid != undefined) {
    window.clearTimeout(this.sendtimeoutid);
  }
  this.sendtimeoutid = window.setTimeout(
    function() { Globals.mp.sendUpdate(true) }, immediate ? 0 : 200);
}

Multiplayer.prototype.changeName = function(name) {
  this.addEvent('name', [name], true);
}

Multiplayer.prototype.getName = function() {
  if (this.uid) return this.players[this.uid].name;
  return undefined;
}

Multiplayer.prototype.getColor = function() {
  if (this.uid) return this.players[this.uid].color;
  return undefined;
}

// Send an update to the server and forward its response to processUpdate.
Multiplayer.prototype.sendUpdate = function(asynch) {
  this.sendtimeoutid = undefined;
  var update = this.events.join('\n');
  this.events = [];

  var req = new XMLHttpRequest();
  var url = this.url + 'update';

  req.onreadystatechange = function() {
    if (req.readyState == 4) {
      //console.log("event send finished", req, req.status);
      try {
        if (req.status && req.status == 200) {
          if (req.responseText) {
            var state = eval('('+req.responseText+')');
            if (state) Globals.mp.processUpdate(state, false);
          }
        }
      } catch (e) {
        log('Caught exception while checking XMLHttpRequest status');
      }
    }
  }
  req.open('POST', url, asynch);
  req.send(update);
};

Multiplayer.prototype.processUpdate = function(state, full) {
  //trace("processing update");
  if (state.reload) {
    if (!this.shutting_down) {
      log('Reloading page, as requested by server (the server restarted ' +
          'or your network connection is having issues)');
      window.location.reload();
    }
    return;
  }

  if (state.uid) this.uid = state.uid;
  if (state.roster) {
    this.players = {};
    var userlist = [];
    for (var i = 0; i < state.roster.length; ++i) {
      var user = state.roster[i];
      this.players[user.uid] = new User(user.name, user.color);
      if (user.uid != this.uid) userlist[userlist.length] = user;
      var cursor_color = darkenHexColor(user.color, 0.75);
      if (!this.cursors[user.uid]) {
        this.cursors[user.uid] = new FocusBox(cursor_color, 3, 3);
      } else {
        this.cursors[user.uid].setColor(cursor_color);
      }
    }
    var cmp = function(a, b) {
      return (a.name == b.name) ? 0 : (a.name > b.name) * 2 - 1;
    };
    userlist.sort(cmp);
    this.roster.syncUsers(userlist);

    // Make cursors disappear for any users who might've dropped
    for (var cuid in this.cursors) {
      if (!this.players[cuid]) {
        var cursor = this.cursors[cuid];
        cursor.moveTo(cursor.des_x, cursor.des_y, 0, 0);
      }
    }

    // We update the displayed name and color, since if the server
    // restarted, the player would've gotten reset to anonymous.
    this.roster.updateDisplayedName(this.players[this.uid].name,
                                    this.players[this.uid].color);
  }

  if (state.cursors) {
    for (var i = 0; i < state.cursors.length; i += 3) {
      var x = state.cursors.charCodeAt(i);
      var y = state.cursors.charCodeAt(i+1);
      var uid = state.cursors[i+2];
      if (uid == this.uid) continue;
      //log("user " + uid + " at (" + x + ", " + y + ")");
      var square = this.widget.square(x, y);
      if (!square) {
        log("Got cursor info for user " + uid +
            " in bogus square (" + x + ", " + y + ")");
        continue;
      }
      if (!this.cursors[uid]) {
        log("Got cursor info for missing user " + uid);
        continue;
      }
      this.widget.moveFocusBoxToSquare(this.cursors[uid], square);
    }
  }

  if (state.messages) {
    var last_name = undefined;
    for (var i = 0; i < state.messages.length; ++i) {
      var msg = state.messages[i];
      if (msg.uid) {
        var user = this.players[msg.uid];
        if (user) last_name = user.name;
      }
      this.console.write(msg.text, msg.time, true);
    }
    this.console.scrollToBottom();
    if (!full) {
      this.console.flash();
      if (last_name) this.console.startTitleFlash(last_name + ' says...');
    }
  }

  if (state.correct) this.widget.setCorrect();

  if (state.cells) {
    for (var i = 0; i < state.cells.length; i += 4) {
      var x = state.cells.charCodeAt(i);
      var y = state.cells.charCodeAt(i+1);
      var letter = state.cells[i+2];
      var ch = state.cells.charCodeAt(i+2);
      var owner = state.cells[i+3];
      var square = this.widget.square(x, y);
      if (!square) continue;
      square.fill(
        letter,
        owner == '0' ? '#ff7777' :
          owner != ' ' ? this.players[owner].color : '',
        (ch >= 97 && ch <= 122));
    }
  }

  if (this.initialcallback) {
    this.initialcallback();
    this.initialcallback = undefined;
  }
};

Multiplayer.prototype.shutdown = function() {
  this.shutting_down = true;
  this.addEvent('disconnect', [], true);  // synchronous
  this.sendUpdate(false);
}
