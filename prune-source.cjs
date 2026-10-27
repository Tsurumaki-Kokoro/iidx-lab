// Remove excluded generated imports from the retained import registry only.
const fs=require('node:fs'),path=require('node:path');const root=fs.realpathSync(__dirname),base=path.join(root,'dataset-source'),stage=path.join(root,'dataset-next');
if(fs.realpathSync(base)!==base)throw Error('Unexpected source directory');
function safe(file){const p=path.resolve(file);if(!p.startsWith(base+path.sep))throw Error('Outside import registry: '+p);return p;}
const catalog=JSON.parse(fs.readFileSync(path.join(stage,'source-catalog.json'))),allowed=p=>/^LDJ-3[34]\//.test(p.source);
fs.writeFileSync(path.join(base,'catalog.json'),JSON.stringify(catalog));
for(const file of ['metadata.json','inventory.json','errors.json','source_warnings.json']){let data=JSON.parse(fs.readFileSync(path.join(base,file)));fs.writeFileSync(path.join(base,file),JSON.stringify(data.filter(allowed)));}
const inventory=JSON.parse(fs.readFileSync(path.join(base,'inventory.json'))),keepRaw=new Set(catalog.songs.map(s=>s.sha256+'.1')),keepSongs=new Set(catalog.songs.map(s=>path.basename(s.file))),keepUnparsed=new Set(inventory.filter(i=>i.unparsed_copy).map(i=>path.basename(i.unparsed_copy)));
for(const [folder,keep] of [['raw',keepRaw],['songs',keepSongs],['unparsed',keepUnparsed]])for(const name of fs.readdirSync(path.join(base,folder)))if(!keep.has(name))fs.unlinkSync(safe(path.join(base,folder,name)));
for(const file of ['charts.csv','analysis.csv','audit.json','audit-summary.log','summary.json'])if(fs.existsSync(path.join(base,file)))fs.unlinkSync(safe(path.join(base,file)));
console.log(`Retained ${catalog.songs.length} 33/34 import variants. Excluded 23-only files and provenance removed.`);
