// components/canvas-drag/index.js
import { loadImage, throttle } from './util.js';


// 20191115 新的canvas需要这样设置才能正常渲染
const screenWidth = wx.getSystemInfoSync().screenWidth;
const factor = screenWidth / 750;
function zoom(val){
  val = +val || 0;
  return val / factor;
}

const DELETE_ICON_URL = './icon/close.png'; // 删除按钮
const DRAG_ICON_URL = './icon/scale.png'; // 缩放按钮
let DELETE_ICON = null;
let DRAG_ICON = null;
const STROKE_COLOR = 'red';
const ROTATE_ENABLED = true;
let isMove = false; // 标识触摸后是否有移动，用来判断是否需要增加操作历史

const DEBUG_MODE = false; // 打开调试后会渲染操作区域边框（无背景时有效）

// 删除按钮区域左上角的坐标和区域的高度宽度
const delW = zoom(30);
const delH = zoom(30);
// 变换按钮区域左上角的坐标和区域的高度宽度
const scaleW = zoom(30);
const scaleH = zoom(30);

let requestID = null; // 用来cancelAnimationFrame

const dragGraph = function ({
  x = 30,
  y = 30,
  w,
  h,
  type,
  text,
  fontSize = 20,
  color = 'red',
  url = null,
  rotate = 0,
  sourceId = null,
  selected = true
}, canvas) {
  this.fileUrl = url;
  this.text = text;
  this.fontSize = zoom(fontSize);
  this.color = color;
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.rotate = rotate;
  this.type = type;
  this.selected = selected;
  this.sourceId = sourceId;
  this.MIN_WIDTH = zoom(20);
  this.MIN_FONTSIZE = zoom(10);
  x = zoom(x);
  y = zoom(y);
  w = zoom(w);
  h = zoom(h);

  if (type === 'text') {
    // console.log(this.fontSize)
    this.ctx.font = `${this.fontSize}px serif`;
    let textWidth = this.ctx.measureText(this.text).width;
    let textHeight = this.fontSize + 20;

    this.centerX = x + textWidth / 2;
    this.centerY = y + textHeight / 2;
    this.w = textWidth;
    this.h = textHeight;
    // console.log(this.centerX,this.centerY,textWidth,textHeight)
  } else {
    this.centerX = x + w / 2;
    this.centerY = y + h / 2;
    this.w = w;
    this.h = h;
    this._img = null;
  }

  this.x = x;
  this.y = y;

  // 4个顶点坐标
  this.square = [
    [this.x, this.y],
    [this.x + this.w, this.y],
    [this.x + this.w, this.y + this.h],
    [this.x, this.y + this.h]
  ];

  if (this.type == 'image'){
    loadImage(this.canvas,this.fileUrl)
    .then((img)=>{
      this._img = img;
    })
  }
};

dragGraph.prototype = {
  /**
   * 绘制元素
   */
  paint() {
    if (this.type == 'image'){
      if(!this._img){
        console.log('img loading 还不能渲染')
        // return;
        loadImage(this.canvas,this.fileUrl)
        .then((img)=>{
          this._img = img;
          this._paintImg()
        });
      }else{
        this._paintImg();
      }
    }else{
      this._paintText();
    }
  },

  _paintImg(){
    this.ctx.save();

    // 旋转元素
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.rotate * Math.PI / 180);
    this.ctx.translate(-this.centerX, -this.centerY);
    // 渲染元素
    // console.log(this.x, this.y, this.w, this.h);
    this.ctx.drawImage(this._img, this.x, this.y, this.w, this.h);

    // 如果是选中状态，绘制选择虚线框，和缩放图标、删除图标
    if (this.selected) {
      this.ctx.setLineDash([2, 5]);
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = STROKE_COLOR;
      this.ctx.lineDashOffset = 6;

      this.ctx.strokeRect(this.x, this.y, this.w, this.h);
      this.ctx.drawImage(DELETE_ICON, this.x - delW/2, this.y - delH/2, delW, delH);
      this.ctx.drawImage(DRAG_ICON, this.x + this.w - scaleW/2, this.y + this.h - scaleH/2, scaleW, scaleH);

      // 调试模式，标识可操作区域
      if (DEBUG_MODE) {
        // 标识删除按钮区域
        this.ctx.strokeStyle = "green";
        this.ctx.strokeRect(this.x - delW/2, this.y - delH/2, delW, delH);
        // 标识旋转/缩放按钮区域
        this.ctx.strokeStyle = "black";
        this.ctx.strokeRect(this.x + this.w - scaleW/2, this.y + this.h - scaleH/2, scaleW, scaleH);
      }
    }

    this.ctx.restore();
  },
  _paintText(){
    this.ctx.save();
    // 由于measureText获取文字宽度依赖于样式，所以如果是文字元素需要先设置样式
    let textWidth = 0;
    let textHeight = 0;

    this.ctx.font = `${this.fontSize}px serif`;
    this.ctx.textBaseline = "middle";
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = this.color;
    // textWidth = zoom(this.ctx.measureText(this.text).width);
    textWidth = this.ctx.measureText(this.text).width;
    textHeight = this.fontSize + 20;
    // 字体区域中心点不变，左上角位移
    this.x = this.centerX - textWidth / 2;
    this.y = this.centerY - textHeight / 2;
    this.w = textWidth;
    this.h = textHeight;

    // 旋转元素
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.rotate(this.rotate * Math.PI / 180);
    this.ctx.translate(-this.centerX, -this.centerY);
    // 渲染元素
    this.ctx.fillText(this.text, this.centerX, this.centerY);

    // 如果是选中状态，绘制选择虚线框，和缩放图标、删除图标
    if (this.selected) {
      this.ctx.setLineDash([4, 10]);
      this.ctx.lineWidth = 4;
      this.ctx.strokeStyle = STROKE_COLOR;
      this.ctx.lineDashOffset = 12;

      this.ctx.strokeRect(this.x, this.y, textWidth, textHeight);
      this.ctx.drawImage(DELETE_ICON, this.x - delW/2, this.y - delH/2, delW, delH);
      this.ctx.drawImage(DRAG_ICON, this.x + this.w - scaleW/2, this.y + this.h - scaleH/2, scaleW, scaleH);

      // 调试模式，标识可操作区域
      if (DEBUG_MODE) {
        // 标识删除按钮区域
        this.ctx.strokeStyle = "green";
        // this.ctx.strokeRect(this.x - 15, this.y - 15, delW, delH);
        this.ctx.strokeRect(this.x - delW/2, this.y - delH/2, delW, delH);
        // 标识旋转/缩放按钮区域
        this.ctx.strokeStyle = "black";
        // this.ctx.strokeRect(this.x + this.w - 15, this.y + this.h - 15, scaleW, scaleH);
        this.ctx.strokeRect(this.x + this.w - scaleW/2, this.y + this.h - scaleH/2, scaleW, scaleH);

      }
    }

    this.ctx.restore();
  },

  /**
   * 画一条线
   * @param ctx
   * @param a
   * @param b
   * @private
   */
  // _draw_line(ctx, a, b) {
  //   ctx.moveTo(a[0], a[1]);
  //   ctx.lineTo(b[0], b[1]);
  //   ctx.stroke();
  // },
  /**
   * 判断点击的坐标落在哪个区域
   * @param {*} x 点击的坐标
   * @param {*} y 点击的坐标
   */
  isInGraph(x, y) {
    // 旋转后的删除区域坐标，中心点
    const [transformDelCenterX,transformDelCenterY] = this._rotatePoint(this.x, this.y, this.centerX, this.centerY, this.rotate);
    // 旋转后的变换区域坐标，中心点
    const [transformScaleCenterX,transformScaleCenterY] = this._rotatePoint(this.x + this.w, this.y + this.h, this.centerX, this.centerY, this.rotate);

    if (x >= transformDelCenterX - delW/2 && y >= transformDelCenterY - delH/2 &&
      x <= transformDelCenterX + delW/2 && y <= transformDelCenterY + delH/2) {
      // 删除区域
      console.log('删除区域')
      return 'del';
    } else if (x >= transformScaleCenterX - scaleW/2 && y >= transformScaleCenterY - scaleH/2 &&
      x <= transformScaleCenterX + scaleW/2 && y <= transformScaleCenterY + scaleH/2) {
      // 缩放区域
      console.log('缩放区域')
      return 'transform';
    } else if (this.insidePolygon(this.square, [x, y])) {
      return 'move';
    }
    // 不在选择区域里面
      // console.log('不在选择区域里面')
    return false;
  },
  /**
   *  判断一个点是否在多边形内部
   *  @param points 多边形坐标集合
   *  @param testPoint 测试点坐标
   *  返回true为真，false为假
   *  */
  insidePolygon(points, testPoint) {
    let x = testPoint[0],
      y = testPoint[1];
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      let xi = points[i][0],
        yi = points[i][1];
      let xj = points[j][0],
        yj = points[j][1];

      let intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },
  /**
   * 计算旋转后矩形四个顶点的坐标（相对于画布）
   * @private
   */
  _rotateSquare() {
    this.square = [
      this._rotatePoint(this.x, this.y, this.centerX, this.centerY, this.rotate),
      this._rotatePoint(this.x + this.w, this.y, this.centerX, this.centerY, this.rotate),
      this._rotatePoint(this.x + this.w, this.y + this.h, this.centerX, this.centerY, this.rotate),
      this._rotatePoint(this.x, this.y + this.h, this.centerX, this.centerY, this.rotate),
    ];
  },
  /**
   * 计算旋转后的新坐标（相对于画布）
   * @param x
   * @param y
   * @param centerX
   * @param centerY
   * @param degrees
   * @returns {*[]}
   * @private
   */
  _rotatePoint(x, y, centerX, centerY, degrees) {
    let newX = (x - centerX) * Math.cos(degrees * Math.PI / 180) - (y - centerY) * Math.sin(degrees * Math.PI / 180) + centerX;
    let newY = (x - centerX) * Math.sin(degrees * Math.PI / 180) + (y - centerY) * Math.cos(degrees * Math.PI / 180) + centerY;
    return [newX, newY];
  },
  /**
   *
   * @param {*} px 手指按下去的坐标
   * @param {*} py 手指按下去的坐标
   * @param {*} x 手指移动到的坐标
   * @param {*} y 手指移动到的坐标
   * @param {*} currentGraph 当前图层的信息
   */
  transform(px, py, x, y, currentGraph) {
    // 获取选择区域的宽度高度
    if (this.type === 'text') {
      this.ctx.font = `${this.fontSize}px serif`;
      let textWidth = this.ctx.measureText(this.text).width;
      let textHeight = zoom(this.fontSize + 20);
      this.w = textWidth;
      this.h = textHeight;
      // 字体区域中心点不变，左上角位移
      this.x = this.centerX - textWidth / 2;
      this.y = this.centerY - textHeight / 2;
    } else {
      this.centerX = this.x + this.w / 2;
      this.centerY = this.y + this.h / 2;
    }

    const diffXBefore = px - this.centerX;
    const diffYBefore = py - this.centerY;
    const diffXAfter = x - this.centerX;
    const diffYAfter = y - this.centerY;

    const angleBefore = Math.atan2(diffYBefore, diffXBefore) / Math.PI * 180;
    const angleAfter = Math.atan2(diffYAfter, diffXAfter) / Math.PI * 180;

    // 旋转的角度
    if (ROTATE_ENABLED) {
      this.rotate = currentGraph.rotate + angleAfter - angleBefore;
    }

    const lineA = Math.sqrt(Math.pow((this.centerX - px), 2) + Math.pow((this.centerY - py), 2));
    const lineB = Math.sqrt(Math.pow((this.centerX - x), 2) + Math.pow((this.centerY - y), 2));
    if (this.type === 'image') {
      let resize_rito = lineB / lineA;
      let new_w = currentGraph.w * resize_rito;
      let new_h = currentGraph.h * resize_rito;

      if (currentGraph.w < currentGraph.h && new_w < this.MIN_WIDTH) {
        new_w = this.MIN_WIDTH;
        new_h = this.MIN_WIDTH * currentGraph.h / currentGraph.w;
      } else if (currentGraph.h < currentGraph.w && new_h < this.MIN_WIDTH) {
        new_h = this.MIN_WIDTH;
        new_w = this.MIN_WIDTH * currentGraph.w / currentGraph.h;
      }

      this.w = new_w;
      this.h = new_h;
      this.x = currentGraph.x - (new_w - currentGraph.w) / 2;
      this.y = currentGraph.y - (new_h - currentGraph.h) / 2;

    } else if (this.type === 'text') {
      const newFontSize = currentGraph.fontSize * ((lineB - lineA) / lineA + 1);
      this.fontSize = newFontSize <= this.MIN_FONTSIZE ? this.MIN_FONTSIZE : newFontSize;

      // 旋转位移后重新计算坐标
      this.ctx.font = `${this.fontSize}px serif`;
      let textWidth = this.ctx.measureText(this.text).width;
      let textHeight = this.fontSize + 20;
      this.w = textWidth;
      this.h = textHeight;
      // 字体区域中心点不变，左上角位移
      this.x = this.centerX - textWidth / 2;
      this.y = this.centerY - textHeight / 2;
    }
  },
};

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    graph: {
      type: Object,
      value: {},
      observer: 'onGraphChange',
    },
    bgColor: {
      type: String,
      value: '',
    },
    bgImageSrc: {
      type: String,
      value: '',
    },
    bgImage: {
      type: Object,
      value: null,
    },
    bgSourceId: {
      type: String,
      value: '',
    },
    width: {
      type: Number,
      value: 750,
    },
    height: {
      type: Number,
      value: 750,
      observer: '_resize',
    },
    enableUndo: {
      type: Boolean,
      value: false,
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    history: [],
  },
  lifetimes: {
    attached() {
      let that = this;

      if (typeof this.drawArr === 'undefined') {
        this.drawArr = [];
      }

      this.createSelectorQuery()
        .select('#canvas-label')
        .fields({
          node: true,
        })
        .exec(function (res) {
          that.init(res[0].node);
        });
    },
    error(err) {
      console.error(err)
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    init(currentCanvas) {
      this.canvas = currentCanvas;
      this.ctx = this.canvas.getContext('2d');

      // 20191115 新的canvas需要这样设置才能正常渲染
      this.canvas.width = this.data.width
      this.canvas.height = this.data.height


      loadImage(this.canvas,DELETE_ICON_URL)
      .then((img)=>{
        DELETE_ICON = img;
      });

      loadImage(this.canvas,DRAG_ICON_URL)
      .then((img)=>{
        DRAG_ICON = img;
      });

      // this.draw = throttle(this._draw,40,this);
      // this.move = throttle(this._move,40,this);
      this.draw = this._draw;
      this.move = this._move;
    },
    initBg() {
      this.data.bgColor = '';
      this.data.bgSourceId = '';
      this.data.bgImageSrc = '';
      this.data.bgImage = null;
    },
    initHistory() {
      this.data.history = [];
    },
    recordHistory() {
      if (!this.data.enableUndo) {
        return;
      }
      this.exportJson()
        .then((imgArr) => {
          this.data.history.push(JSON.stringify(imgArr));
        })
        .catch((e) => {
          console.error(e);
        });
    },
    undo() {
      if (!this.data.enableUndo) {
        console.log(`后退功能未启用，请设置enableUndo="{{true}}"`);
        return;
      }
      if (this.data.history.length > 1) {
        this.data.history.pop()
        let newConfigObj = this.data.history[this.data.history.length - 1];
        this.initByArr(JSON.parse(newConfigObj));
      } else {
        console.log('已是第一步，不能回退');
      }
    },
    _resize(n,o){
      console.log("重设canvas尺寸 height",n)
      this.canvas.height = n;
      // todo 改变高度后，canvas内容会丢失，从历史重新渲染会错位
      // let newConfigObj = this.data.history[this.data.history.length - 1];
      //   this.initByArr(JSON.parse(newConfigObj));
    },
    onGraphChange(n, o) {
      if (JSON.stringify(n) === '{}') return;
      this.drawArr.push(new dragGraph(Object.assign({
        x: 30,
        y: 30,
      }, n), this.canvas));
      this.draw();
      // 参数有变化时记录历史
      this.recordHistory();
    },
    initByArr(newArr) {
      this.drawArr = []; // 重置绘画元素
      this.initBg(); // 重置绘画背景
      // 循环插入 drawArr
      newArr.forEach((item, index) => {
        switch (item.type) {
          case 'bgColor':
            this.data.bgImageSrc = '';
            this.data.bgImage = null;
            this.data.bgSourceId = '';
            this.data.bgColor = item.color;
            break;
          case 'bgImage':
            this.data.bgColor = '';
            this.data.bgImageSrc = item.url;
            this.data.bgImage = null;
            if (item.sourceId) {
              this.data.bgSourceId = item.sourceId;
            }
            loadImage(this.canvas,this.data.bgImageSrc)
            .then((img)=>{
              this.data.bgImage = img;
            });

            break;
          case 'image':
          case 'text':
            if (index === newArr.length - 1) {
              item.selected = true;
            } else {
              item.selected = false;
            }
            this.drawArr.push(new dragGraph(item, this.canvas));
            break;
        }

      });
      this.draw();
    },
    _draw(){
      // 先清空画布
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      return this._drawBg()
      .then(()=>{
        this.drawArr.forEach((item) => {
          // console.log(item);
          item.paint();
        });
      });
    },
    _drawBg(){
      // console.log('enter draw BG',this.data);
      if (this.data.bgColor !== '') {
        // console.log('with bg color');
        this.ctx.save();
        this.ctx.fillStyle = this.data.bgColor;
        this.ctx.fillRect(0, 0, this.data.width, this.data.height);
        this.ctx.restore();
        return new Promise((resolve) => {
          resolve();
        });
      }else if (this.data.bgImageSrc !== '') {
        // console.log('with bgImageSrc ')
        if (this.data.bgImage){
          // console.log('draw from this.data.bgImage ')
          this.ctx.drawImage(this.data.bgImage, 0, 0, this.data.width, this.data.height);
          return new Promise((resolve) => {
            resolve();
          });
        }else{
          console.log('load from this.data.bgImageSrc')
          return loadImage(this.canvas,this.data.bgImageSrc)
          .then((img)=>{
            // console.log('draw from this.data.bgImageSrc')
            this.data.bgImage = img;
            this.ctx.drawImage(this.data.bgImage, 0, 0, this.data.width, this.data.height);
          });
        }
      }else{
        // console.log('no bg or bgc')
        return new Promise((resolve) => {
          resolve();
        });
      }
    },
    start(e) {
      isMove = false; // 重置移动标识
      const {
        x,
        y
      } = e.touches[0];
      const pointerX = zoom(x);
      const pointerY = zoom(y);
      this.tempGraphArr = [];
      let lastDelIndex = null; // 记录最后一个需要删除的索引
      if (this.drawArr && this.drawArr.length) {
        this.drawArr.forEach((item, index) => {
          const action = item.isInGraph(pointerX, pointerY);
          if (action) {
            item.action = action;
            this.tempGraphArr.push(item);
            // 保存点击时的坐标
            this.currentTouch = {
              pointerX,
              pointerY
            };
            if (action === 'del') {
              lastDelIndex = index; // 标记需要删除的元素
            }
          } else {
            item.action = false;
            item.selected = false;
          }
        })
      }
      // 保存点击时元素的信息
      if (this.tempGraphArr.length > 0) {
        for (let i = 0; i < this.tempGraphArr.length; i++) {
          let lastIndex = this.tempGraphArr.length - 1;
          // 对最后一个元素做操作
          if (i === lastIndex) {
            // 未选中的元素，不执行删除和缩放操作
            if (lastDelIndex !== null && this.tempGraphArr[i].selected) {
              if (this.drawArr[lastDelIndex].action === 'del') {
                this.drawArr.splice(lastDelIndex, 1);
                this.ctx.clearRect(0, 0, this.data.width, this.data.height);
              }
            } else {
              this.tempGraphArr[lastIndex].selected = true;
              this.currentGraph = Object.assign({}, this.tempGraphArr[lastIndex]);
            }
          } else {
            // 不是最后一个元素，不需要选中，也不记录状态
            this.tempGraphArr[i].action = false;
            this.tempGraphArr[i].selected = false;
          }
        }
      }

      this.draw()
    },
    _move(e) {
      const {
        x,
        y
      } = e.touches[0];
      const pointerX = zoom(x);
      const pointerY = zoom(y);
      if (this.tempGraphArr && this.tempGraphArr.length > 0) {
        isMove = true; // 有选中元素，并且有移动时，设置移动标识
        const currentGraph = this.tempGraphArr[this.tempGraphArr.length - 1];
        if (currentGraph.action === 'move') {
          currentGraph.centerX = this.currentGraph.centerX + (pointerX - this.currentTouch.pointerX);
          currentGraph.centerY = this.currentGraph.centerY + (pointerY - this.currentTouch.pointerY);
          // 使用中心点坐标计算位移，不使用 x,y 坐标，因为会受旋转影响。
          if (currentGraph.type !== 'text') {
            currentGraph.x = currentGraph.centerX - this.currentGraph.w / 2;
            currentGraph.y = currentGraph.centerY - this.currentGraph.h / 2;
          }
        } else if (currentGraph.action === 'transform') {
          currentGraph.transform(this.currentTouch.pointerX, this.currentTouch.pointerY, pointerX, pointerY, this.currentGraph);
        }
        // 更新4个坐标点（相对于画布的坐标系）
        currentGraph._rotateSquare();

        this.draw()
        // this.canvas.requestAnimationFrame(this.draw());
        return false;
      }
    },
    end(e) {
      this.tempGraphArr = [];
      if (isMove) {
        isMove = false; // 重置移动标识
        // 用户操作结束时记录历史
        this.recordHistory();
      }
    },
    export() {
      return new Promise((resolve, reject) => {
        this.drawArr = this.drawArr.map((item) => {
          item.selected = false;
          return item;
        });
        this.draw().then(() => {
          wx.canvasToTempFilePath({
            // canvasId: 'canvas-label',
            // https://developers.weixin.qq.com/community/develop/doc/000ae64c240f78b7125932b375b400
            canvas:this.canvas, 
            success: (res) => {
              resolve(res.tempFilePath);
            },
            fail: (e) => {
              reject(e);
            },
          }, this);
        });
      });
    },
    exportJson() {
      return new Promise((resolve, reject) => {
        let exportArr = this.drawArr.map((item) => {
          item.selected = false;
          switch (item.type) {
            case 'image':
              return {
                type: 'image',
                url: item.fileUrl,
                y: item.y,
                x: item.x,
                w: item.w,
                h: item.h,
                rotate: item.rotate,
                sourceId: item.sourceId,
              };
              break;
            case 'text':
              return {
                type: 'text',
                text: item.text,
                color: item.color,
                fontSize: item.fontSize,
                y: item.y,
                x: item.x,
                w: item.w,
                h: item.h,
                rotate: item.rotate,
              };
              break;
          }
        });
        if (this.data.bgImage) {
          let tmp_img_config = {
            type: 'bgImage',
            url: this.data.bgImageSrc,
          };
          if (this.data.bgSourceId) {
            tmp_img_config['sourceId'] = this.data.bgSourceId;
          }
          exportArr.unshift(tmp_img_config);
        } else if (this.data.bgColor) {
          exportArr.unshift({
            type: 'bgColor',
            color: this.data.bgColor
          });
        }

        resolve(exportArr);
      })
    },
    changColor(color) {
      const selected = this.drawArr.filter((item) => item.selected);
      if (selected.length > 0) {
        selected[0].color = color;
      }
      this.draw();
      // 改变文字颜色时记录历史
      this.recordHistory();
    },
    changeBgColor(color) {
      this.data.bgImageSrc = '';
      this.data.bgImage = null;
      this.data.bgColor = color;
      this.draw();
      // 改变背景颜色时记录历史
      this.recordHistory();
    },
    changeBgImage(newBgImg) {
      this.data.bgColor = '';
      if (typeof newBgImg == 'string') {
        this.data.bgSourceId = '';
        this.data.bgImageSrc = newBgImg;
        this.data.bgImage = null;
      } else {
        this.data.bgSourceId = newBgImg.sourceId;
        this.data.bgImageSrc = newBgImg.url;
        this.data.bgImage = null;
      }

      loadImage(this.canvas,this.data.bgImageSrc)
      .then((img)=>{
        this.data.bgImage = img;
        this.draw();
        // 改变背景图片时记录历史
        this.recordHistory();
      });
    },
    clearCanvas() {
      this.ctx.clearRect(0, 0, this.data.width, this.data.height);
      this.drawArr = [];
      this.initBg(); // 重置绘画背景
      this.initHistory(); // 清空历史记录
    }
  }
});