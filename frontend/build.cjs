const fs=require('node:fs'),path=require('node:path');
const root=__dirname,dist=path.join(root,'dist'),source=path.resolve(root,'../dataset'),includeData=!process.argv.includes('--code-only');
fs.mkdirSync(dist,{recursive:true});for(const f of ['core.mjs','render.mjs','index.mjs','browse.mjs','difficulty.mjs','example.html'])fs.copyFileSync(path.join(root,'src',f),path.join(dist,f));
const customization=path.resolve(root,'../research/customization/demo');
const qpro=path.resolve(root,'../qpro-data/web');
const theme=path.resolve(root,'../theme-data/web');
if(fs.existsSync(path.join(theme,'catalog.json')))fs.cpSync(theme,path.join(dist,'theme'),{recursive:true});
if(fs.existsSync(path.join(qpro,'catalog.json')))fs.cpSync(qpro,path.join(dist,'qpro'),{recursive:true});
if(fs.existsSync(path.join(customization,'catalog.json'))){
 fs.mkdirSync(path.join(dist,'customization'),{recursive:true});
 fs.copyFileSync(path.join(customization,'catalog.json'),path.join(dist,'customization/catalog.json'));
 fs.cpSync(path.join(customization,'assets'),path.join(dist,'customization/assets'),{recursive:true});
}
if(includeData){
 const songs=JSON.parse(fs.readFileSync(path.join(source,'catalog.json'))).songs.map(s=>{let metadata=[...s.sources].reverse().find(p=>p.metadata)?.metadata||{title:s.id,levels:{}};return {key:s.key,id:s.id,sha256:s.sha256,file:s.file,charts:s.charts,metadata,sources:s.sources.map(p=>({source:p.source}))};});
 fs.mkdirSync(path.join(dist,'data/songs'),{recursive:true});fs.writeFileSync(path.join(dist,'data/catalog.json'),JSON.stringify({schema:1,songs}));
 const retained=new Set(songs.map(s=>path.basename(s.file))),songDirectory=path.resolve(dist,'data/songs');for(const file of fs.readdirSync(songDirectory)){const target=path.resolve(songDirectory,file);if(target.startsWith(songDirectory+path.sep)&&file.endsWith('.json.gz')&&!retained.has(file))fs.unlinkSync(target);}
 for(const s of songs){let from=path.join(source,s.file),to=path.join(dist,'data',s.file);if(!fs.existsSync(to)||fs.statSync(to).size!==fs.statSync(from).size)fs.copyFileSync(from,to);}
 console.log(`Static dataset: ${songs.length} song variants; raw HDD files and runtime excluded.`);
}console.log('Ready: '+dist);
