'use strict';
const zlib=require('zlib');
const DATA=[
  require('./_ui_b_00'),
  require('./_ui_b_01'),
  require('./_ui_b_02'),
  require('./_ui_b_03'),
  require('./_ui_b_04'),
  require('./_ui_b_05'),
  require('./_ui_b_06'),
  require('./_ui_b_07'),
  require('./_ui_b_08'),
  require('./_ui_b_09'),
  require('./_ui_b_10'),
  require('./_ui_b_11'),
  require('./_ui_b_12'),
  require('./_ui_b_13'),
  require('./_ui_b_14'),
  require('./_ui_b_15'),
  require('./_ui_b_16'),
  require('./_ui_b_17'),
  require('./_ui_b_18'),
  require('./_ui_b_19'),
  require('./_ui_b_20'),
  require('./_ui_b_21'),
  require('./_ui_b_22'),
  require('./_ui_b_23'),
  require('./_ui_b_24'),
];
let cache='';
function fallbackUi(){if(!cache)cache=zlib.brotliDecompressSync(Buffer.from(DATA.join(''),'base64')).toString('utf8');return cache}
module.exports={fallbackUi};
