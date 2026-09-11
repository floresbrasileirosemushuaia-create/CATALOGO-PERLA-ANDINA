'use strict';
const zlib=require('zlib');
const c0=require('./_ui_fb_00');
const c1=require('./_ui_fb_01');
const c2=require('./_ui_fb_02');
const c3=require('./_ui_fb_03');
const c4=require('./_ui_fb_04');
const c5=require('./_ui_fb_05');
const c6=require('./_ui_fb_06');
const c7=require('./_ui_fb_07');
const DATA=c0+c1+c2+c3+c4+c5+c6+c7;
function fallbackUi(){return zlib.gunzipSync(Buffer.from(DATA,'base64')).toString('utf8')}
module.exports={fallbackUi};
