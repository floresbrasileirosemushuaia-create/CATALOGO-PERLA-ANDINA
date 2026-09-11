'use strict';
const zlib=require('zlib');
const DATA=[
  require('./_ui_b_00'),
  require('./_ui_b_01'),
  require('./_ui_b_02'),
  require('./_ui_b_03'),
  require('./_ui_b_04'),
  require('./_ui_c_00'),
  require('./_ui_c_01'),
  require('./_ui_d_00'),
  require('./_ui_d_01'),
  require('./_ui_d_02'),
];
let cache='';
function fallbackUi(){if(!cache)cache=zlib.brotliDecompressSync(Buffer.from(DATA.join(''),'base64')).toString('utf8');return cache}
module.exports={fallbackUi};
