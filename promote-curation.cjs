// Promote a verified generated library; source registry is preserved.
const fs=require('node:fs'),path=require('node:path');const root=fs.realpathSync(__dirname),stage=path.join(root,'dataset-next'),target=path.join(root,'dataset');
const catalog=JSON.parse(fs.readFileSync(path.join(stage,'catalog.json')));if(catalog.policy!=='33_omni_primary_34_missing_slots'||JSON.stringify(catalog).includes('LDJ-23/'))throw Error('Unexpected source policy');
function copy(dir,relative=''){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const rel=path.join(relative,item.name);if(rel==='catalog.json'||rel==='source-catalog.json')continue;const dest=path.resolve(target,rel);if(!dest.startsWith(target+path.sep))throw Error('Unsafe destination');if(item.isDirectory()){fs.mkdirSync(dest,{recursive:true});copy(path.join(dir,item.name),rel);}else fs.copyFileSync(path.join(dir,item.name),dest);}}
copy(stage);fs.copyFileSync(path.join(stage,'catalog.json'),path.join(target,'catalog.json'));
for(const folder of ['raw','songs','unparsed']){let retain=new Set(fs.readdirSync(path.join(stage,folder)));for(const file of fs.readdirSync(path.join(target,folder))){const p=path.resolve(target,folder,file);if(p.startsWith(target+path.sep)&&!retain.has(file))fs.unlinkSync(p);}}
console.log('Promoted canonical 33 + 34 supplement library; run audit.js and frontend/build.cjs.');
