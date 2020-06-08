import Pool from './pool.js';
const imgPool = new Pool('imgPool');

export function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

export function loadImage(canvas,src) {
  const cache = imgPool.get(src);
  if(cache){
    // console.log('cache');
    return new Promise((resolve) => {
      resolve(cache);
    });
  }else{
    console.log('not cache');
    return new Promise((resolve,reject) => {
      const img = canvas.createImage();
      img.onload = () => {
        imgPool.set(src,img);
        resolve(img);
      };
      img.onerror = (e) => {
        reject(e);
      };
      img.src = src;
    });
  }
};
