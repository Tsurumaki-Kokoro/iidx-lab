const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const root=__dirname,next=path.join(root,'dataset-next'),original=path.join(root,fs.existsSync(path.join(root,'dataset-source'))?'dataset-source':'dataset');
const library=JSON.parse(fs.readFileSync(path.join(next,'catalog.json'))).songs,source=JSON.parse(fs.readFileSync(path.join(original,'catalog.json'))).songs;
assert.equal(new Set(library.map(s=>s.id)).size,library.length);assert(!JSON.stringify(library).includes('LDJ-23'));
let count=0,supplement=0;
for(const song of library){const d=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(next,song.file))));for(const chart of d.charts){
 const p=chart.provenance;assert(/^LDJ-3[34]\//.test(p.source));const origin=source.find(s=>s.key===p.original_key);assert(origin);const bytes=fs.readFileSync(path.join(original,'raw',origin.sha256+'.1')),offset=bytes.readUInt32LE(chart.slot*8),length=bytes.readUInt32LE(chart.slot*8+4),events=[];
 for(let n=offset;n<offset+length;n+=8){if(bytes.readInt32LE(n)===0x7fffffff)break;events.push([bytes.readInt32LE(n),bytes[n+4],bytes[n+5],bytes.readInt16LE(n+6)]);}assert.deepEqual(chart.events,events);
 const candidates=source.filter(s=>s.id===song.id&&s.charts.some(c=>c.slot===chart.slot));
 if(p.source.startsWith('LDJ-34')){supplement++;assert(!candidates.some(s=>s.sources.some(p=>p.source.startsWith('LDJ-33/'))));}
 if(p.source.startsWith('LDJ-33/data/'))assert(!candidates.some(s=>s.sources.some(p=>p.source.startsWith('LDJ-33/data_mods/omnimix'))));count++;
 }}console.log(`PASS: ${library.length} unique song IDs, ${count} charts identical to selected source bytes; ${supplement} supplements only where 33 has no slot; no 23 provenance.`);
