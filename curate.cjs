// Canonical song library: 33 omni (overlay + base), missing slots from 34.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=__dirname,source=path.join(root,fs.existsSync(path.join(root,'dataset-source'))?'dataset-source':'dataset'),out=path.join(root,'dataset-next');
const read=n=>JSON.parse(fs.readFileSync(path.join(source,n),'utf8')),write=(n,v)=>fs.writeFileSync(path.join(out,n),JSON.stringify(v));
function rank(p){let s=p.source||p;if(s.startsWith('LDJ-33/data_mods/omnimix'))return 0;if(s.startsWith('LDJ-33/data/'))return 1;if(s.startsWith('LDJ-34/data_mods/omnimix'))return 2;if(s.startsWith('LDJ-34/data/'))return 3;return 99;}
function compare(a,b){return rank(a)-rank(b)||Number(!/-p\d+\.ifs$/.test(a.source))-Number(!/-p\d+\.ifs$/.test(b.source))||a.source.localeCompare(b.source);}
fs.mkdirSync(path.join(out,'songs'),{recursive:true});fs.mkdirSync(path.join(out,'raw'),{recursive:true});fs.mkdirSync(path.join(out,'unparsed'),{recursive:true});
const imported=read('catalog.json').songs,groups=new Map(),cache=new Map(),dbs=read('metadata.json').filter(d=>rank(d)<99),meta=new Map();
for(const db of [...dbs].sort(compare)){for(const record of db.records)if(!meta.has(record.id))meta.set(record.id,record);}
for(const item of imported){const sources=item.sources.filter(p=>rank(p)<99).sort(compare);if(!sources.length)continue;for(const p of sources){if(!groups.has(item.id))groups.set(item.id,[]);groups.get(item.id).push({item,p});}}
let songs=[],decisions=[],from33=0,from34=0,merged=0;
for(const [id,options] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
 cache.clear();
 options.sort((a,b)=>compare(a.p,b.p)||a.item.key.localeCompare(b.item.key));let chosen=new Map();
 for(const {item,p} of options)for(const c of item.charts)if(!chosen.has(c.slot))chosen.set(c.slot,{item,p,summary:c});
 const slots=[...chosen.keys()].sort((a,b)=>a-b),charts=[],blocks=[],provenance=[],unique=new Set();
 for(const slot of slots){const {item,p,summary}=chosen.get(slot);if(!cache.has(item.key))cache.set(item.key,{raw:fs.readFileSync(path.join(source,'raw',item.sha256+'.1')),json:JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(source,item.file))))});const data=cache.get(item.key),chart=data.json.charts.find(c=>c.slot===slot);
  charts.push({...chart,provenance:{source:p.source,member:p.member||null,original_key:item.key,original_sha256:item.sha256}});
  const offset=data.raw.readUInt32LE(slot*8),length=data.raw.readUInt32LE(slot*8+4);blocks.push({slot,bytes:data.raw.subarray(offset,offset+length)});
  const sourceKey=p.source+'\0'+(p.member||'');if(!unique.has(sourceKey)){unique.add(sourceKey);provenance.push({...p,metadata:meta.get(id)||p.metadata||null});}
  if(rank(p)<2)from33++;else from34++;
  decisions.push({id,slot,difficulty:chart.difficulty,source:p.source,original_key:item.key,reason:rank(p)<2?'primary_33':'missing_slot_supplement_34'});
 }
 const songMeta=meta.has(id)?{...meta.get(id),levels:{...meta.get(id).levels}}:null;
 if(songMeta){for(const {p,summary} of chosen.values()){const level=p.metadata?.levels?.[summary.difficulty];if(level&&(rank(p)>=2||!songMeta.levels[summary.difficulty]))songMeta.levels[summary.difficulty]=level;}for(const p of provenance)p.metadata=songMeta;meta.set(id,songMeta);}
 const originalKeys=new Set([...chosen.values()].map(c=>c.item.key));let raw;
 if(originalKeys.size===1){const key=[...originalKeys][0];raw=cache.get(key).raw;}else{
  merged++;const header=Buffer.alloc(96);let offset=96;for(const b of blocks){header.writeUInt32LE(offset,b.slot*8);header.writeUInt32LE(b.bytes.length,b.slot*8+4);offset+=b.bytes.length;}raw=Buffer.concat([header,...blocks.map(b=>b.bytes)]);
 }
 const sha=crypto.createHash('sha256').update(raw).digest('hex'),key=id+'-'+sha.slice(0,16),file='songs/'+key+'.json.gz';
 fs.writeFileSync(path.join(out,'raw',sha+'.1'),raw);fs.writeFileSync(path.join(out,file),zlib.gzipSync(JSON.stringify({schema:1,id,sha256:sha,time_unit:'millisecond',event_columns:['time_ms','command','parameter_unsigned','value_signed'],charts}),{level:6}));
 songs.push({key,id,sha256:sha,file,sources:provenance,assembled_from_multiple_packages:originalKeys.size>1,charts:charts.map(({events,...rest})=>rest)});
}
const inventory=read('inventory.json').filter(e=>rank(e)<99),errors=read('errors.json').filter(e=>rank(e)<99),warnings=fs.existsSync(path.join(source,'source_warnings.json'))?read('source_warnings.json').filter(e=>rank(e)<99):[];
for(const item of inventory)if(item.unparsed_copy){const p=path.join(source,item.unparsed_copy);if(fs.existsSync(p))fs.copyFileSync(p,path.join(out,item.unparsed_copy));}
write('catalog.json',{schema:1,policy:'33_omni_primary_34_missing_slots',songs});write('metadata.json',dbs);write('inventory.json',inventory);write('errors.json',errors);write('source_warnings.json',warnings);write('selection.json',{policy:['LDJ-33 omni overlay','LDJ-33 base','LDJ-34 omni overlay (missing slots only)','LDJ-34 base (missing slots only)'],excluded:['LDJ-23','INFINITAS'],primary_33_charts:from33,supplement_34_charts:from34,merged_song_packages:merged,decisions});
const summary={song_variants:songs.length,unique_song_ids:songs.length,unique_raw_files:new Set(songs.map(s=>s.sha256)).size,chart_variants:from33+from34,primary_33_charts:from33,supplement_34_charts:from34,source_files:inventory.length,databases:dbs.length,errors:errors.length,no_chart_archives:inventory.filter(e=>!e.error&&!e.charts_found).length};write('summary.json',summary);
const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';let rows=['key,id,title,difficulty,level,note_heads,long_notes,scratch_heads,max_time_ms,source'];for(const s of songs){const m=meta.get(s.id)||{};for(const c of s.charts)rows.push([s.key,s.id,m.title,c.difficulty,m.levels?.[c.difficulty],c.note_heads,c.long_notes,c.scratch_heads,c.max_time_ms,c.provenance.source].map(csv).join(','));}fs.writeFileSync(path.join(out,'charts.csv'),'\ufeff'+rows.join('\n'));
console.log(JSON.stringify(summary,null,2));
// Export the import registry with 23 sources removed; actual switching/pruning is separate.
const retained=imported.map(s=>({...s,sources:s.sources.filter(p=>rank(p)<99)})).filter(s=>s.sources.length);write('source-catalog.json',{schema:1,songs:retained});
