function FocusBox(color, border, zindex) {
  this.left = this.createEdge(color, zindex);
  this.right = this.createEdge(color, zindex);
  this.top = this.createEdge(color, zindex);
  this.bottom = this.createEdge(color, zindex);

  this.cur_x = this.cur_y = this.cur_w = this.cur_h = 0;
  this.des_x = this.des_y = this.des_w = this.des_h = 0;

  this.border = border;

  document.body.appendChild(this.left);
  document.body.appendChild(this.right);
  document.body.appendChild(this.top);
  document.body.appendChild(this.bottom);
};

FocusBox.prototype.createEdge = function(color, zindex) {
  var edge = document.createElement('div');
  edge.className = 'focusbox';
  edge.style.backgroundColor = color;
  edge.style.zIndex = zindex;
  return edge;
};

FocusBox.prototype.setColor = function(color) {
  this.left.style.backgroundColor = color;
  this.right.style.backgroundColor = color;
  this.top.style.backgroundColor = color;
  this.bottom.style.backgroundColor = color;
};

FocusBox.prototype.drawEdge = function(edge, left, top, width, height) {
  edge.style.left = left;
  edge.style.top = top;
  edge.style.width = width;
  edge.style.height = height;
};

FocusBox.prototype.drawBox = function(x, y, w, h) {
  if (w == 0 && h == 0) {
    this.left.style.display = 'none';
    this.right.style.display = 'none';
    this.top.style.display = 'none';
    this.bottom.style.display = 'none';
  } else if (this.cur_w == 0 && this.cur_h == 0 && (w != 0 || h != 0)) {
    this.left.style.display = 'block';
    this.right.style.display = 'block';
    this.top.style.display = 'block';
    this.bottom.style.display = 'block';
  }

  this.cur_x = x;
  this.cur_y = y;
  this.cur_w = w;
  this.cur_h = h;

  this.drawEdge(this.left, x - this.border, y - this.border,
                this.border, h + 2 * this.border);
  this.drawEdge(this.right, x + w, y - this.border,
                this.border, h + 2 * this.border);
  this.drawEdge(this.top, x, y - this.border, w, this.border);
  this.drawEdge(this.bottom, x, y + h, w, this.border);
};

FocusBox.prototype.animate = function(box) {
  var kFrameDelay = 20;

  //log("des: x=" + box.des_x + " y=" + box.des_y +
  //    " w=" + box.des_w + " h=" + box.des_h);
  //log("cur: x=" + box.cur_x + " y=" + box.cur_y +
  //    " w=" + box.cur_w + " h=" + box.cur_h);

  if (box.cur_x == box.des_x &&
      box.cur_y == box.des_y &&
      box.cur_w == box.des_w &&
      box.cur_h == box.des_h) {
    box.timer = null;
    return;
  }

  var new_x = parseInt(box.cur_x + (box.des_x - box.cur_x) / 2);
  var new_y = parseInt(box.cur_y + (box.des_y - box.cur_y) / 2);
  var new_w = parseInt(box.cur_w + (box.des_w - box.cur_w) / 2);
  var new_h = parseInt(box.cur_h + (box.des_h - box.cur_h) / 2);

  if (new_x - box.cur_x >= -1 && new_x - box.cur_x <= 1) new_x = box.des_x;
  if (new_y - box.cur_y >= -1 && new_y - box.cur_y <= 1) new_y = box.des_y;
  if (new_w - box.cur_w >= -1 && new_w - box.cur_w <= 1) new_w = box.des_w;
  if (new_h - box.cur_h >= -1 && new_h - box.cur_h <= 1) new_h = box.des_h;

  box.drawBox(new_x, new_y, new_w, new_h);

  box.timer = setTimeout(function() { box.animate(box) }, kFrameDelay);
};

FocusBox.prototype.moveTo = function(x, y, w, h, animate) {
  //log("req: x=" + x + " y=" + y + " w=" + w + " h=" + h);
  this.des_x = x;
  this.des_y = y;
  this.des_w = w;
  this.des_h = h;
  if (animate) {
    if (!this.timer) this.animate(this);
  } else {
    this.drawBox(x, y, w, h);
  }
};
