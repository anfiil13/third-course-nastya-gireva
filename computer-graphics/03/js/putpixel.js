(function (global) {
  "use strict";

  const CELL = 16; 

  class Raster {
    constructor(canvas, cols, rows) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.cols = cols;
      this.rows = rows;
      this.cell = CELL;

      this.canvas.width = cols * CELL;
      this.canvas.height = rows * CELL;

      this.clear();
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    inBounds(x, y) {
      return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
    }

    putPixel(x, y, color = "#1a1d23") {
      if (!this.inBounds(x, y)) return false;
      const c = this.cell;
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x * c, y * c, c, c);
      return true;
    }

    strokePixel(x, y, color = "#e11d48") {
      if (!this.inBounds(x, y)) return false;
      const c = this.cell;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x * c + 1, y * c + 1, c - 2, c - 2);
      return true;
    }

    drawGrid(color = "#e6e9f0") {
      const c = this.cell;
      const w = this.canvas.width;
      const h = this.canvas.height;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 1;

      this.ctx.beginPath();
      for (let x = 0; x <= this.cols; x++) {
        const px = x * c + 0.5;
        this.ctx.moveTo(px, 0);
        this.ctx.lineTo(px, h);
      }
      for (let y = 0; y <= this.rows; y++) {
        const py = y * c + 0.5;
        this.ctx.moveTo(0, py);
        this.ctx.lineTo(w, py);
      }
      this.ctx.stroke();
    }
  }

  global.Raster = Raster;
  global.RASTER_CELL = CELL;
})(window);