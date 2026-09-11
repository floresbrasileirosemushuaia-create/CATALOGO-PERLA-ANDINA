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
  require('./_ui_c_02'),
  require('./_ui_c_03'),
  require('./_ui_c_04'),
  require('./_ui_c_05'),
  require('./_ui_c_06'),
  require('./_ui_c_07'),
  require('./_ui_c_08'),
  require('./_ui_c_09'),
  require('./_ui_c_10'),
  require('./_ui_c_11'),
  require('./_ui_c_12'),
  require('./_ui_c_13'),
  require('./_ui_c_14'),
];
let cache='';
function fallbackUi(){if(!cache)cache=zlib.brotliDecompressSync(Buffer.from(DATA.join(''),'base64')).toString('utf8');return cache}
module.exports={fallbackUi};
