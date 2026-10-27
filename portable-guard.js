// Test-only guard: reject any file reads/writes outside the shipped folder.
const fs=require('node:fs'),path=require('node:path');let base=__dirname.toLowerCase()+path.sep;
for(let method of ['readFileSync','writeFileSync','openSync','readdirSync','statSync','mkdirSync']){let original=fs[method];fs[method]=function(p,...args){if(typeof p==='string'||p instanceof URL){let resolved=path.resolve(String(p)).toLowerCase();if(resolved!==__dirname.toLowerCase()&&!resolved.startsWith(base))throw Error('Portable guard rejected external access: '+p);}return original.call(this,p,...args);};}
