'use strict';
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const BASE=__dirname, DATA=path.join(BASE,'dataset');
function catalog(){return JSON.parse(fs.readFileSync(path.join(DATA,'catalog.json'),'utf8')).songs;}
function metadata(s){return [...s.sources].reverse().find(p=>p.metadata)?.metadata||{title:s.id,levels:{}};}
function load(key,difficulty){
  let songs=catalog(), candidates=songs.filter(s=>s.key===key||s.id===key.padStart(5,'0'));
  if(!candidates.length)throw Error('找不到歌曲 ID / key：'+key);
  if(candidates.length>1)throw Error('该歌曲有多个版本，请使用完整 key：\n'+candidates.map(s=>`${s.key} ${metadata(s).title} ${s.sources.map(p=>p.source).join(' | ')}`).join('\n'));
  let s=candidates[0],data=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA,s.file))));
  let c=data.charts.find(c=>c.difficulty===difficulty);
  if(!c)throw Error('可用谱面：'+data.charts.map(c=>c.difficulty).join(', '));
  return {song:s,metadata:metadata(s),chart:c,schema:1,time_unit:'millisecond'};
}
const {prng,permutation,transform,analyze}=require('./frontend/src/core.mjs');
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
const renderer=require('./render');
const svg=renderer.svg;
function reportHtml(bundle,bin){return renderer.reportHtml(bundle,bin,{prng,permutation,transform,analyze});}
function main(args){
  let [cmd,...rest]=args;
  if(!cmd||cmd==='help'){console.log('IIDXLab — portable offline chart analysis\nlist [query]\nreport <song-id-or-key> <SPN|SPH|SPA|SPB|SPL|DPN|DPH|DPA|DPL> [--mode normal|random|mirror|custom] [--seed text] [--map 7654321/1234567] [--bin-ms 1000] [--out folder]\nsimulate <key> <difficulty> [samples 1..10000] [seed]\nverify\nAll paths resolved relative to this folder; report outputs default to reports/.');return;}
  if(cmd==='list'){let q=rest.join(' ').toLowerCase();let rows=catalog().filter(s=>[s.id,s.key,metadata(s).title,metadata(s).artist].join(' ').toLowerCase().includes(q));for(let s of rows)console.log(`${s.key}\t${metadata(s).title}\t${s.charts.map(c=>c.difficulty).join(',')}\t${s.sources.map(p=>p.source.split('/')[0]).filter((v,i,a)=>a.indexOf(v)===i).join(',')}`);console.log(rows.length+' song variants');return;}
  if(cmd==='verify'){
    let count=0;for(let s of catalog()){
      let raw=fs.readFileSync(path.join(DATA,'raw',s.sha256+'.1'));
      if(require('node:crypto').createHash('sha256').update(raw).digest('hex')!==s.sha256)throw Error('Hash mismatch '+s.key);
      let d=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(DATA,s.file))));
      for(let c of d.charts){let off=raw.readUInt32LE(c.slot*8),len=raw.readUInt32LE(c.slot*8+4),events=[];for(let p=off;p<off+len;p+=8){if(raw.readInt32LE(p)===0x7fffffff)break;events.push([raw.readInt32LE(p),raw[p+4],raw[p+5],raw.readInt16LE(p+6)]);}if(JSON.stringify(events)!==JSON.stringify(c.events))throw Error('Events mismatch '+s.key+' '+c.difficulty);count++;}
    }console.log(`Verified ${catalog().length} song variants, ${count} charts against original raw bytes. No HDD source access.`);return;
  }
  if(cmd==='simulate'){
    let [key,diff,n='100',seed='0']=rest,count=Number(n);if(!key||!diff||!Number.isInteger(count)||count<1||count>10000)throw Error('simulate <key> <difficulty> [samples 1..10000] [seed]');
    let bundle=load(key,diff.toUpperCase()),rows=[];
    for(let i=0;i<count;i++){let c=transform(bundle.chart,'random',seed+':'+i),a=analyze(c);rows.push({seed:c.randomization.seed,maps:c.randomization.maps,max_chord_span:a.max_chord_span,chord_span_sum:a.chord_span_sum,lane_heads:a.lane_heads,key_zone_heads:a.key_zone_heads});}
    let p=path.join(BASE,'reports',bundle.song.key+'-'+bundle.chart.difficulty+'-simulation.json');fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify({schema:1,key:bundle.song.key,difficulty:bundle.chart.difficulty,sampling:'with replacement; different seeds can produce identical permutations',warning:'Geometric statistics only, not a difficulty rating. RANDOM preserves total temporal density.',rows},null,2));console.log('Saved '+p);return;
  }
  if(cmd!=='report')throw Error('Unknown command '+cmd);
  let [key,diff,...opts]=rest;if(!key||!diff)throw Error('需要歌曲 ID / key 和难度');
  let flags={};for(let i=0;i<opts.length;i+=2){if(!['--mode','--seed','--map','--bin-ms','--out'].includes(opts[i])||opts[i+1]===undefined)throw Error('Invalid option '+opts[i]);flags[opts[i]]=opts[i+1];}
  let bundle=load(key,diff.toUpperCase()),chart=transform(bundle.chart,flags['--mode']||'normal',flags['--seed']||'0',flags['--map']),bin=Number(flags['--bin-ms']||1000),stats=analyze(chart,bin);
  let folder=path.resolve(BASE,flags['--out']||'reports'),name=bundle.song.key+'-'+chart.difficulty+'-'+chart.randomization.mode+'-'+String(chart.randomization.seed).replace(/[^a-zA-Z0-9_-]/g,'_');fs.mkdirSync(folder,{recursive:true});
  fs.writeFileSync(path.join(folder,name+'.json'),JSON.stringify({...bundle,chart,analysis:stats},null,2));
  fs.writeFileSync(path.join(folder,name+'.svg'),svg(chart,bundle.metadata.title+' '+chart.difficulty));
  const selected={...bundle,chart:bundle.chart};let html=reportHtml(selected,bin).replace('id="seed" value="0"','id="seed" value="'+escape(chart.randomization.seed)+'"').replace('id="mapping" value="1234567/1234567"','id="mapping" value="'+escape(flags['--map']||'1234567/1234567')+'"').replace('let current,figure,analysis;','document.getElementById("mode").value='+JSON.stringify(chart.randomization.mode)+';let current,figure,analysis;');
  fs.writeFileSync(path.join(folder,name+'.html'),html);
  fs.writeFileSync(path.join(folder,name+'-density.csv'),'start_ms,heads,key_heads,scratch_heads,long_note_heads,nps\n'+stats.density.map(b=>[b.start_ms,b.heads,b.key_heads,b.scratch_heads,b.long_note_heads,b.nps].join(',')).join('\n'));
  let brief={...stats};delete brief.density;console.log(JSON.stringify(brief,null,2));console.log('Saved '+path.join(folder,name)+'.{html,svg,json} and -density.csv');
}
module.exports={prng,permutation,transform,analyze,svg,reportHtml,load};
if(require.main===module){try{main(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
