#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const a=path.resolve(process.argv[2]||''),b=path.resolve(process.argv[3]||'');
function files(dir){const out={};for(const n of fs.readdirSync(dir)){const p=path.join(dir,n);if(!fs.statSync(p).isFile())continue;if(!/\.(gs|js|html|json)$/.test(n))continue;let key=n.replace(/\.gs$/,'.js');out[key]=fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')}return out}
const A=files(a),B=files(b),keys=[...new Set([...Object.keys(A),...Object.keys(B)])].sort(),diff=[];
for(const k of keys)if((A[k]??null)!==(B[k]??null))diff.push(k);
if(diff.length){console.error(JSON.stringify({ok:false,diff},null,2));process.exit(2)}
console.log(JSON.stringify({ok:true,files:keys.length},null,2));
