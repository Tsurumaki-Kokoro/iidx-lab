// Stable application-specific seed. Does not claim compatibility with the game's RNG.
function prng(seed){let h=2166136261;for(let c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function permutation(rng){let a=[0,1,2,3,4,5,6];for(let i=6;i>0;i--){let j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function transform(chart,mode='normal',seed='0',custom){
  if(!['normal','mirror','random','custom'].includes(mode))throw Error('mode: normal / mirror / random / custom');
  let rng=prng(seed), maps=[0,1].map(()=>mode==='random'?permutation(rng):mode==='mirror'?[6,5,4,3,2,1,0]:[0,1,2,3,4,5,6]);
  if(mode==='custom'){
    maps=String(custom||'').split('/').map(s=>s.split('').map(Number).map(n=>n-1));
    if(maps.length===1)maps.push([...maps[0]]);
    if(maps.length!==2||maps.some(a=>a.length!==7||[...a].sort().join('')!=='0123456'))throw Error('自定义映射格式：7654321 或 7654321/1234567，表示原键 1..7 的目标键');
  }
  return {...chart,events:chart.events.map(e=>{let x=[...e];if([0,1,2,3].includes(x[1])&&x[2]<7)x[2]=maps[x[1]%2][x[2]];return x;}),randomization:{mode,seed:String(seed),maps:maps.map(m=>m.map(x=>x+1)),scratch:'unchanged',rng:'IIDXLab FNV1a + Mulberry32; not arcade seed compatible'}};
}
function analyze(chart,binMs=1000){
  if(!(binMs>0&&Number.isFinite(binMs)))throw Error('bin-ms 必须大于 0');
  let notes=chart.events.filter(e=>e[1]===0||e[1]===1).sort((a,b)=>a[0]-b[0]);
  let lanes=Array(16).fill(0),chords={},groups=new Map(),bins=new Map(),last=Array(16).fill(-Infinity),jacks=0,ln=0,scratch=0,unknown=[];
  for(let n of notes){let [t,side,lane,len]=n;if(lane>7){unknown.push(n);continue;}lanes[side*8+lane]++;if(lane===7)scratch++;if(len!==0)ln++;
    if(lane<7&&t>last[side*8+lane]&&t-last[side*8+lane]<=250)jacks++;last[side*8+lane]=t;
    groups.set(t,(groups.get(t)||0)+1);let i=Math.floor(t/binMs);if(!bins.has(i))bins.set(i,{start_ms:i*binMs,heads:0,key_heads:0,scratch_heads:0,long_note_heads:0});let b=bins.get(i);b.heads++;b[lane===7?'scratch_heads':'key_heads']++;if(len!==0)b.long_note_heads++;
  }
  for(let n of groups.values())chords[n]=(chords[n]||0)+1;
  let first=notes[0]?.[0]||0,lastTime=notes.length?Math.max(...notes.map(n=>n[0]+Math.max(0,n[3]))):0;
  let peak=0,left=0,peakStart=first;
  for(let right=0;right<notes.length;right++){while(notes[right][0]-notes[left][0]>=1000)left++;if(right-left+1>peak){peak=right-left+1;peakStart=notes[left][0];}}
  let density=[];for(let i=Math.floor(first/binMs);i<=Math.floor(lastTime/binMs);i++){let b=bins.get(i)||{start_ms:i*binMs,heads:0,key_heads:0,scratch_heads:0,long_note_heads:0};density.push({...b,nps:b.heads*1000/binMs});}
  let chordGroups=new Map(),spanHistogram={},spanSum=0,maxSpan=0;
  for(let [t,s,l] of notes){if(l>6)continue;let k=t+':'+s;if(!chordGroups.has(k))chordGroups.set(k,[]);chordGroups.get(k).push(l);}
  for(let lanes of chordGroups.values()){if(lanes.length<2)continue;let span=Math.max(...lanes)-Math.min(...lanes);spanHistogram[span]=(spanHistogram[span]||0)+1;spanSum+=span;maxSpan=Math.max(maxSpan,span);}
  return {note_heads:notes.length,long_note_heads:ln,scratch_heads:scratch,head_plus_tail_count:notes.length+ln,first_note_ms:first,last_note_end_ms:lastTime,active_duration_seconds:(lastTime-first)/1000,average_heads_per_second:lastTime>first?notes.length*1000/(lastTime-first):0,peak_rolling_1s_heads:peak,peak_window_start_ms:peakStart,peak_window_definition:'[start, start+1000ms)',lane_heads:lanes,key_zone_heads:[0,1].map(side=>({keys_123:lanes.slice(side*8,side*8+3).reduce((a,b)=>a+b,0),key_4:lanes[side*8+3],keys_567:lanes.slice(side*8+4,side*8+7).reduce((a,b)=>a+b,0)})),chord_span_histogram:spanHistogram,chord_span_sum:spanSum,max_chord_span:maxSpan,chord_span_definition:'per side, simultaneous key heads only; max lane minus min lane; geometric proxy, not difficulty',chord_size_histogram:chords,chord_definition:'all sides, exact same timestamp, includes scratch; counts heads only',jack_intervals_le_250ms:jacks,unknown_lane_notes:unknown,warnings:unknown.length?['Unsupported note lane parameters retained in raw events; excluded from lane bins and drawing. Do not treat these charts as fully decoded.']:[],density_bin_ms:binMs,density,randomization:chart.randomization};
}

export {prng,permutation,transform,analyze};
