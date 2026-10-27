// Dataset-wide quality audit. No source HDD access.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),{analyze}=require('./lab');
let base=path.join(__dirname,'dataset'),songs=JSON.parse(fs.readFileSync(path.join(base,'catalog.json'))).songs,inventory=JSON.parse(fs.readFileSync(path.join(base,'inventory.json'))),ids=new Set(songs.map(s=>s.id)),unknown=[],negativeLengths=[],counts={},slots={},events=0,noMetadata=0,analysisRows=['key,id,title,difficulty,note_heads,long_note_heads,scratch_heads,average_nps,peak_rolling_1s,peak_start_ms,max_chord_span,chord_span_sum,unknown_note_records'];
const csv=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
for(let s of songs){if(!s.sources.some(p=>p.metadata))noMetadata++;
 let d=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(base,s.file))));
 for(let c of d.charts){slots[c.slot]=(slots[c.slot]||0)+1;events+=c.events.length;let uncommon=c.events.filter(e=>[0,1].includes(e[1])&&e[2]>7),negative=c.events.filter(e=>[0,1].includes(e[1])&&e[3]<0);
 if(uncommon.length)unknown.push({key:s.key,difficulty:c.difficulty,events:uncommon});if(negative.length)negativeLengths.push({key:s.key,difficulty:c.difficulty,events:negative});
 let a=analyze(c),m=s.sources.find(p=>p.metadata)?.metadata;analysisRows.push([s.key,s.id,m?.title||'',c.difficulty,a.note_heads,a.long_note_heads,a.scratch_heads,a.average_heads_per_second,a.peak_rolling_1s_heads,a.peak_window_start_ms,a.max_chord_span,a.chord_span_sum,uncommon.length].map(csv).join(','));
 }
}
let failures=inventory.filter(i=>i.error).map(i=>{let id=path.basename(i.source).replace(/-p\d+/, '').split('.')[0].padStart(5,'0');counts[i.error]=(counts[i.error]||0)+1;return {...i,song_id:id,song_id_present_elsewhere:ids.has(id)};});
let empty=inventory.filter(i=>!i.error&&!i.charts_found),unavailable=new Set(failures.filter(f=>!f.song_id_present_elsewhere).map(f=>f.song_id));for(let f of empty){let id=path.basename(f.source).split('.')[0].padStart(5,'0');if(!ids.has(id))unavailable.add(id);}
let report={song_variants:songs.length,unique_song_ids:ids.size,total_events:events,slot_counts:slots,song_variants_without_metadata:noMetadata,unsupported_lane_charts:unknown,negative_length_charts:negativeLengths,failed_source_counts:counts,failed_sources:failures,failed_source_song_ids_not_present:[...new Set(failures.filter(f=>!f.song_id_present_elsewhere).map(f=>f.song_id))],unavailable_song_ids:[...unavailable],archives_with_no_chart:empty,source_warnings:inventory.filter(i=>i.warnings),checksum_warnings:fs.existsSync(path.join(base,'source_warnings.json'))?JSON.parse(fs.readFileSync(path.join(base,'source_warnings.json'))):[]};
fs.writeFileSync(path.join(base,'audit.json'),JSON.stringify(report,null,2));fs.writeFileSync(path.join(base,'analysis.csv'),'\ufeff'+analysisRows.join('\n'));console.log(JSON.stringify({...report,unsupported_lane_charts:unknown.length,failed_sources:failures.length,source_warnings:report.source_warnings.length},null,2));
