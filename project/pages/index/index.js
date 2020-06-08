//index.js
import CanvasDrag from '../../components/canvas-drag/canvas-drag';

Page({
    data: {
        cWidth:700,
        cHeight:750,
        graph: {},
    },

    /**
     * 添加测试图片
     */
    onAddTest() {
        this.setData({
            graph: {
                w: 155,
                h: 135,
                type: 'image',
                url: '../../assets/images/test.png',
            }
        });
    },

    /**
     * 添加图片
     */
    onAddImage() {
        let _this = this;
        wx.chooseImage({
            success: (imgRes) => {
                wx.getImageInfo({
                    src: imgRes.tempFilePaths[0],
                    success(imgInfoRes) {
                        console.log(imgInfoRes.width,imgInfoRes.height)

                        let {w,h} = _this.scaleWH(imgInfoRes.width,imgInfoRes.height);
                        console.log(w,h)
                        _this.setData({
                            graph: {
                                w: w,
                                h: h,
                                type: 'image',
                                url: imgRes.tempFilePaths[0],
                            }
                        });
                    }
                })

                
            }
        })
    },

    scaleWH(w,h){
        const maxSize = 200;
        if(w <= maxSize &&  h <= maxSize){
            return {
                w,
                h
            }
        }

        if(w > h){
            return {
                w:maxSize,
                h:h * maxSize / w,
            }
        }else{
            return {
                w:w*maxSize/h,
                h:maxSize,
            }
        }
    },

    /**
     * 添加文本
     */
    onAddText() {
        this.setData({
            graph: {
                type: 'text',
                text: 'helloworld中文',
            }
        });
    },

    /**
     * 导出图片
     */
    onExport() {
        CanvasDrag.export()
            .then((filePath) => {
                console.log(filePath);
                wx.previewImage({
                    urls: [filePath]
                })
            })
            .catch((e) => {
                console.error(e);
            })
    },

    /**
     * 改变文字颜色
     */
    onChangeColor() {
        CanvasDrag.changFontColor('blue');
    },

    /**
     * 改变背景颜色
     */
    onChangeBgColor() {
        CanvasDrag.changeBgColor('yellow');
    },

    /**
     * 改变背景照片
     */
    onChangeBgImage() {
        CanvasDrag.changeBgImage('../../assets/images/test.png');
    },

    onChangeSize(){
        this.setData({
            cHeight:900,
        })
    },

    /**
     * 导出当前画布为模板
     */
    onExportJSON() {
        CanvasDrag.exportJson()
            .then((imgArr) => {
                console.log(JSON.stringify(imgArr));
            })
            .catch((e) => {
                console.error(e);
            });
    },

    onImport() {
        // 有背景
        // let temp_theme = [{"type":"bgColor","color":"yellow"},{"type":"image","url":"../../assets/images/test.png","y":98.78423143832424,"x":143.78423143832424,"w":155,"h":135,"rotate":-12.58027482265038,"sourceId":null},{"type":"text","text":"helloworld","color":"blue","fontSize":24.875030530031438,"y":242.56248473498428,"x":119.57012176513672,"w":116.73966979980469,"h":34.87503053003144,"rotate":8.873370699754087}];
        // 无背景
        // let temp_theme = [{"type":"image","url":"../../assets/images/test.png","y":103,"x":91,"w":155,"h":135,"rotate":0,"sourceId":null},{"type":"text","text":"helloworld","color":"blue","fontSize":20,"y":243,"x":97,"rotate":0}];
        // 背景图 
        let temp_theme = [{
            "type": "bgImage",
            // "url": "../../assets/images/test.png"
            "url": "https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1591263445595&di=4e48015f6464d7ddf1230297d3f6dba1&imgtype=0&src=http%3A%2F%2Fimg1.imgtn.bdimg.com%2Fit%2Fu%3D1950415271%2C2990416587%26fm%3D214%26gp%3D0.jpg"
        }, {
            "type": "image",
            "url": "../../assets/images/test.png",
            "y": 103,
            "x": 91,
            "w": 155,
            "h": 135,
            "rotate": 0,
            "sourceId": null
        }, {
            "type": "text",
            "text": "helloworld",
            "color": "blue",
            "fontSize": 20,
            "y": 241.4453125,
            "x": 110.0040512084961,
            "w": 86.75991821289062,
            "h": 30,
            "rotate": 0
        }];

        CanvasDrag.initByArr(temp_theme);
    },

    onClearCanvas: function (event) {
        let _this = this;
        _this.setData({
            canvasBg: null
        });
        CanvasDrag.clearCanvas();
    },

    onUndo: function (event) {
        CanvasDrag.undo();
    }
});