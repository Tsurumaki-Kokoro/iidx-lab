'use strict';
function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function measureLayout(chart){
  const notes=chart.events.filter(e=>e[1]<2),last=Math.max(0,...notes.map(e=>e[0]+Math.max(0,e[3])));
  let tempos=chart.events.filter(e=>e[1]===4&&e[2]>0&&e[3]>0).map(e=>({t:e[0],bpm:e[3]/e[2]})).sort((a,b)=>a.t-b.t);
  const inferredTempo=!tempos.length;if(!tempos.length)tempos=[{t:0,bpm:120}];if(tempos[0].t>0)tempos.unshift({t:0,bpm:tempos[0].bpm});
  function beat(t){let total=0;for(let i=0;i<tempos.length;i++){let a=tempos[i].t,b=Math.min(t,tempos[i+1]?.t??t);if(b>a)total+=(b-a)*tempos[i].bpm/60000;if(b===t)break;}return total;}
  function timeAt(target){for(let i=0;i<tempos.length;i++){let a=beat(tempos[i].t),end=i+1<tempos.length?beat(tempos[i+1].t):Infinity;if(target<=end)return tempos[i].t+(target-a)*60000/tempos[i].bpm;}return 0;}
  const meterAt=t=>{let m=chart.events.filter(e=>e[1]===5&&e[2]>0&&e[3]>0&&e[0]<=t).sort((a,b)=>a[0]-b[0]).pop();return m?{beats:m[3]*4/m[2],label:m[3]+'/'+m[2]}:{beats:4,label:'4/4'};};
  let marks=[...new Set(chart.events.filter(e=>e[1]===12&&e[2]===0&&e[0]>=0).map(e=>e[0]))].sort((a,b)=>a-b),hasBars=marks.length>1;
  if(!marks.length||marks[0]>0)marks.unshift(0);
  if(!hasBars)marks=[0];
  // Game bar events are authoritative. Extend only where boundaries are missing.
  while(marks[marks.length-1]<=last){let t=marks[marks.length-1],next=timeAt(beat(t)+meterAt(t).beats);if(next<=t)break;marks.push(next);if(marks.length>10000)throw Error('小节数量异常');}
  const bars=[];for(let i=0;i<marks.length-1&&marks[i]<=last;i++){let start=marks[i],end=marks[i+1],b0=beat(start),beats=beat(end)-b0,m=meterAt(start);bars.push({number:i+1,start,end,beats:beats||m.beats,meter:m.label,beatStart:b0});}
  function position(t){let lo=0,hi=bars.length-1;while(lo<hi){let mid=Math.ceil((lo+hi)/2);if(bars[mid].start<=t)lo=mid;else hi=mid-1;}let b=bars[lo];return b?lo+Math.max(0,Math.min(1,(beat(t)-b.beatStart)/b.beats)):0;}
  return {bars,tempos,beat,position,inferredBars:!hasBars,inferredTempo};
}
function svg(chart,title,measuresPerColumn=8,options={}){
  const requestedSpeed=Number(options.hiSpeed??chart.display?.hiSpeed??1),hiSpeed=Number.isFinite(requestedSpeed)?Math.max(.25,Math.min(4,requestedSpeed)):1;
  const layout=measureLayout(chart),{bars}=layout,notes=chart.events.filter(e=>e[1]<2),dp=chart.difficulty.startsWith('DP'),lanes=dp?16:8,laneW=17,w=lanes*laneW,strip=w+62,barH=152*hiSpeed,top=104,cols=Math.max(1,Math.ceil(bars.length/measuresPerColumn)),width=Math.max(690,cols*strip+28),height=top+Math.min(bars.length,measuresPerColumn)*barH+35,bottom=height-35;
  const right=!dp&&(options.playSide||chart.display?.playSide)==='2p';
  const changes=layout.tempos.map((t,i)=>({...t,previous:layout.tempos[i-1]?.bpm})).filter(t=>t.previous!==undefined&&Math.abs(t.bpm-t.previous)>1e-8);
  const tempoColor=t=>t.bpm>t.previous?'#ff9f0a':'#bf80ff';
  const laneX=(s,l)=>!dp?(right?(l===7?7:l):(l===7?0:l+1)):s===0?(l===7?0:l+1):8+(l===7?7:l),pos=t=>layout.position(t);
  let out=[`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="按小节排列的谱面" data-read-direction="bottom-up" data-hi-speed="${hiSpeed}" data-play-side="${dp?'both':right?'2p':'1p'}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#101720"/><style>text{font:11px 'Segoe UI',sans-serif;fill:#acbed0}.title{font-size:17px;fill:#eef5ff}</style><text x="16" y="26" class="title">${escape(title)}</text><text x="16" y="49">按小节向上读取 · 每列 ${measuresPerColumn} 小节 · 小节内按拍定位 · 红色 Scratch / 金色 Long Notes</text><text x="16" y="69">${layout.inferredBars?'小节线缺失，按 BPM 与拍号推算':'采用谱面原始小节线 · 橙色粗线加速 / 紫色粗线减速'}${layout.inferredTempo?' · BPM 缺失，暂按 120 推算':''}</text>`];
  for(let col=0;col<cols;col++){
    let x=16+col*strip,first=col*measuresPerColumn,last=Math.min(bars.length,first+measuresPerColumn),ph=(last-first)*barH;
    for(let l=0;l<lanes;l++){let sc=dp?(l===0||l===15):l===(right?7:0),label=sc?'S':dp&&l>=8?l-7:right?l+1:l;out.push(`<rect data-lane="${label}" x="${x+l*laneW}" y="${top}" width="16" height="${bottom-top}" fill="${sc?'#351c2b':Number(label)%2?'#202e3e':'#182431'}"/><text x="${x+l*laneW+4}" y="${top-9}">${label}</text>`);}
    for(let i=first;i<last;i++){
      let b=bars[i],y=bottom-(i-first)*barH,barChanges=changes.filter(t=>t.t>=b.start&&t.t<b.end),highlight=barChanges[0];out.push(`<path ${highlight?'data-tempo-measure="'+b.number+'"':''} d="M${x},${y}h${w}" stroke="${highlight?tempoColor(highlight):'#91a6bd'}" stroke-width="${highlight?3:1}"/><text x="${x+w+5}" y="${y-12}" ${highlight?'style="fill:'+tempoColor(highlight)+';font-weight:700"':''}>#${String(b.number).padStart(3,'0')}</text><text x="${x+w+5}" y="${y-27}">${b.meter}</text>`);
      for(let k=1;k<b.beats-0.02;k++){let yy=y-k/b.beats*barH;out.push(`<path d="M${x},${yy}h${w}" stroke="#43576c" stroke-dasharray="2 3"/>`);}
      for(let k=.5;k<b.beats-.02;k+=1){let yy=y-k/b.beats*barH;out.push(`<path d="M${x},${yy}h${w}" stroke="#2a3c50"/>`);}
      for(let tempo of layout.tempos.filter(t=>t.t>=b.start&&t.t<b.end)){let yy=y-(pos(tempo.t)-i)*barH,change=barChanges.find(t=>t.t===tempo.t&&t.bpm===tempo.bpm),color=change?tempoColor(change):'#acbed0';if(change&&(Math.abs(yy-y)>.1||barChanges.length>=3))out.push(`<path data-bpm-change="${change.previous}→${change.bpm}" d="M${x},${yy}h${w}" stroke="${color}" stroke-width="3"><title>BPM ${change.previous} → ${change.bpm} · ${tempo.t}ms</title></path>`);if(barChanges.length<3)out.push(`<text ${change?'data-bpm-label="change"':''} x="${x+w+4}" y="${change&&Math.abs(yy-y)>.1?yy-4:yy-43}" style="fill:${color};font-weight:${change?700:400}">${change?(change.bpm>change.previous?'↑':'↓'):'♩'}${Number(tempo.bpm.toFixed(2))}</text>`);}
      if(barChanges.length>=3){const bpms=barChanges.map(t=>t.bpm),label=Math.round(Math.min(...bpms))+'–'+Math.round(Math.max(...bpms));out.push(`<text x="${x+w+4}" y="${y-43}" style="fill:${tempoColor(barChanges[0])};font-weight:700">${label}<title>${barChanges.map(t=>t.previous+' → '+t.bpm+' BPM @ '+t.t+'ms').join('; ')}</title></text>`);}
    }
    for(let [t,s,l,v] of notes){if(l>7||s===1&&!dp)continue;let head=pos(t),tail=pos(t+Math.max(0,v));if(tail<first||head>=last)continue;let xx=x+laneX(s,l)*laneW+1,yy=bottom-(Math.min(tail,last)-first)*barH,hh=(Math.min(tail,last)-Math.max(head,first))*barH;
      if(v>0)out.push(`<rect data-long-note="${t}" x="${xx+4}" y="${yy}" width="7" height="${Math.max(2,hh)}" fill="#e8b15d" opacity=".8"/>`);
      if(head>=first)out.push(`<rect data-note-time="${t}" x="${xx}" y="${bottom-(head-first)*barH-3}" width="14" height="3" fill="${l===7?'#ff718c':l%2?'#74bbff':'#edf5ff'}"><title>小节 ${Math.floor(head)+1} · ${t}ms · P${dp?s+1:right?2:1} ${l===7?'Scratch':l+1} · 长度 ${v}ms</title></rect>`);
    }out.push(`<path d="M${x},${bottom-ph}h${w}" stroke="#91a6bd"/>`);
  }out.push('</svg>');return out.join('');
}
function barsChart(values,labels,color='#007aff',suffix=''){
  let max=Math.max(1,...values),w=640,h=210,step=580/Math.max(1,values.length),out=[`<svg viewBox="0 0 ${w} ${h}" role="img"><path d="M40 16V174H626" fill="none" stroke="#d2d2d7"/>`];
  for(let tick=0;tick<=2;tick++){let v=max*tick/2,y=174-tick*72;out.push(`<path d="M40 ${y}H626" stroke="#e8e8ed"/><text x="34" y="${y+4}" text-anchor="end">${Number(v.toFixed(1))}</text>`);}
  values.forEach((v,i)=>{let x=46+i*step,y=174-v/max*144;out.push(`<rect x="${x}" y="${y}" width="${Math.max(1,step-5)}" height="${174-y}" rx="2" fill="${Array.isArray(color)?color[i]:color}"><title>${escape(labels[i])}: ${v}${suffix}</title></rect>`);if(values.length<=18||i%Math.ceil(values.length/12)===0)out.push(`<text x="${x+step/2-2}" y="195" text-anchor="middle">${escape(labels[i])}</text>`);});out.push('</svg>');return out.join('');
}
async function svgToPNG(svgText,{scale=2,maxDimension=16384,maxPixels=64000000}={}){
 const root=new DOMParser().parseFromString(svgText,'image/svg+xml');if(root.querySelector('parsererror'))throw Error('SVG 无法解析');
 const svg=root.documentElement,viewBox=(svg.getAttribute('viewBox')||'').split(/[ ,]+/).map(Number),width=Number(svg.getAttribute('width'))||viewBox[2],height=Number(svg.getAttribute('height'))||viewBox[3];
 if(!(width>0&&height>0&&scale>0&&Number.isFinite(width)&&Number.isFinite(height)&&Number.isFinite(scale)))throw Error('无效的导出尺寸');
 const factor=Math.min(scale,maxDimension/width,maxDimension/height,Math.sqrt(maxPixels/(width*height))),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.floor(width*factor));canvas.height=Math.max(1,Math.floor(height*factor));
 const url=URL.createObjectURL(new Blob([svgText],{type:'image/svg+xml;charset=utf-8'}));try{
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('谱面图像加载失败'));image.src=url;});const context=canvas.getContext('2d');if(!context)throw Error('浏览器无法创建 PNG 画布');context.drawImage(image,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('PNG 导出失败，请改用 SVG')),'image/png'));
 }finally{URL.revokeObjectURL(url);}
}
function dashboard(chart,a){
  let dp=chart.difficulty.startsWith('DP'),layout=measureLayout(chart),valid=chart.events.filter(e=>e[1]<2&&e[2]<8),barCounts=layout.bars.map(()=>0);for(let e of valid){let i=Math.min(barCounts.length-1,Math.floor(layout.position(e[0])));if(i>=0)barCounts[i]++;}
  const panel=(title,body,note='')=>`<section class="panel" title="${escape(note)}"><h2>${title}</h2>${body}</section>`;
  const histogram=(data)=>{let keys=Object.keys(data).sort((a,b)=>a-b);return barsChart(keys.map(k=>data[k]),keys);};
  let labels=Array.from({length:dp?16:8},(_,i)=>(dp?(i<8?'L·':'R·'):'')+(i%8===7?'S':i%8+1)),values=a.lane_heads.slice(0,dp?16:8);
  if(!dp&&chart.display?.playSide!=='2p'){labels.unshift(labels.pop());values.unshift(values.pop());}
  let colors=labels.map(l=>l.endsWith('S')?'#ff637e':'#007aff');
  let maps=chart.randomization?.maps||[[1,2,3,4,5,6,7],[1,2,3,4,5,6,7]],mapping='';for(let side=0;side<(dp?2:1);side++){mapping+=`<h3>${dp?(side?'2P / 右侧':'1P / 左侧'):'7 键映射'}</h3><svg viewBox="0 0 640 128" role="img" aria-label="原键位到目标键位">`;maps[side].forEach((dest,i)=>{let x=70+i*80,xx=70+(dest-1)*80;mapping+=`<path d="M${x} 30L${xx} 95" stroke="hsl(${i*44} 70% 65%)" stroke-width="2" opacity=".7"/><circle cx="${x}" cy="20" r="13" fill="#edf0f5"/><circle cx="${xx}" cy="106" r="13" fill="#edf0f5"/><text x="${x}" y="24" text-anchor="middle">${i+1}</text><text x="${xx}" y="110" text-anchor="middle">${dest}</text>`;});mapping+='</svg>';}
  const cards=[['Notes',a.note_heads.toLocaleString()],['Avg NPS',a.average_heads_per_second.toFixed(2)+' NPS'],['Peak NPS (1s)',a.peak_rolling_1s_heads+' NPS'],['小节数',layout.bars.length],['Long Notes',a.long_note_heads],['Scratch Notes',a.scratch_heads],['Jack Intervals ≤250ms',a.jack_intervals_le_250ms],['Max Chord Span',a.max_chord_span+' 键距']];
  let parts=[`<div class="cards">${cards.map(([label,v])=>`<div class="card"><span>${label}</span><strong>${v}</strong></div>`).join('')}</div>`];
  if(a.warnings.length)parts.push(`<p class="warning">${a.unknown_lane_notes.length} 个特殊轨道事件未解码，未画入常规轨道；原始 JSON 完整保留。</p>`);
  if(layout.inferredBars||layout.inferredTempo)parts.push(`<p class="warning">${layout.inferredBars?'小节线缺失：按 BPM 和拍号推算。':''}${layout.inferredTempo?'BPM 缺失：暂按 120 BPM 推算。':''}</p>`);
  parts.push(`<div class="grid">`);
  parts.push(panel('Notes / Measure',barsChart(barCounts,barCounts.map((_,i)=>i+1)), '横轴：小节编号 · 纵轴：Notes 数（含 Scratch，不含 Long Note End）'));
  parts.push(panel('NPS',barsChart(a.density.map(b=>Number(b.nps.toFixed(2))),a.density.map(b=>(b.start_ms/1000).toFixed(0))),`横轴：秒 · 纵轴：NPS · ${a.density_bin_ms}ms 分箱；滚动峰值始于 ${(a.peak_window_start_ms/1000).toFixed(2)} 秒`));
  parts.push(panel('Lane Distribution',barsChart(values,labels,colors),'横轴：实际显示位置 · 红色为 Scratch · 纵轴：Notes 数'));
  parts.push(panel('Chord Size',histogram(a.chord_size_histogram),'横轴：同时出现的 Notes 数 · 纵轴：次数；DP 合并两侧，包含 Scratch'));
  parts.push(panel('Chord Span',histogram(a.chord_span_histogram),'横轴：最左键与最右键之差 · 纵轴：次数；单侧键盘，不含 Scratch'));
  parts.push(panel('RANDOM Mapping',mapping,'上：原键位 → 下：目标键位；Scratch 固定'));
  parts.push('</div>');return parts.join('');
}

function reportStyle(){return `
*{box-sizing:border-box}body{margin:0;background:#f5f5f7;color:#1d1d1f;font:15px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}main{max-width:1440px;margin:auto;padding:36px}h1{margin:10px 0;font-size:34px;letter-spacing:-1.1px;font-weight:650}h2{font-size:17px;margin:0 0 16px;letter-spacing:-.3px}h3{font-size:12px;color:#6e6e73}p{line-height:1.65}.muted,.subtitle{color:#6e6e73;font-size:12px}.subtitle{letter-spacing:.1px}button,input,select{padding:10px 13px;background:#fff;color:#1d1d1f;border:1px solid #d2d2d7;border-radius:10px;font:inherit;min-height:40px}button{cursor:pointer;transition:background .15s,transform .15s}button:hover{background:#e9e9ed}button:active{transform:scale(.98)}button.primary{background:#007aff;border-color:#007aff;color:white;font-weight:600;box-shadow:0 3px 8px #007aff20}button.primary:hover{background:#0068db}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #007aff55;outline-offset:2px}label{display:flex;gap:7px;flex-direction:column;color:#6e6e73;font-size:11px;font-weight:550}.controls{display:flex;flex-wrap:wrap;align-items:end;gap:10px;margin:28px 0;padding:18px;background:#ffffffb8;border:1px solid #fff;border-radius:18px;box-shadow:0 4px 24px #00000004}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.card,.panel{background:#fff;border:1px solid #e8e8ed;border-radius:20px;padding:22px;box-shadow:0 3px 16px #00000003}.card span{color:#6e6e73;font-size:12px}.card strong{display:block;font-size:29px;font-weight:600;letter-spacing:-.8px;margin-top:10px;font-variant-numeric:tabular-nums}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:20px 0 36px}.panel svg{width:100%;display:block}.panel text{font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;fill:#6e6e73}#plot{overflow:auto;background:#101720;border:1px solid #dedee3;border-radius:18px}#plot>svg{display:block;max-width:none}.warning{padding:13px 17px;border:1px solid #f2d8a2;border-radius:12px;background:#fff8e9;color:#815c17}.analysis-heading{margin:30px 0 18px}#error:empty{display:none}button:disabled{cursor:wait;opacity:.6}details{margin-top:24px;color:#6e6e73;font-size:12px}summary{cursor:pointer}#error{color:#c53535}a{color:#007aff}select:disabled{opacity:.65}@media(max-width:760px){main{padding:20px 16px}.cards{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}h1{font-size:29px}.controls{padding:14px}.card,.panel{padding:18px}.card strong{font-size:24px}}`;}

function reportHtml(bundle,bin,helpers,options={}){
  let safe=JSON.stringify(bundle).replace(/</g,'\\u003c');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>IIDXLab · ${escape(bundle.metadata.title)}</title><style>${reportStyle()}</style><main><h1>${escape(bundle.metadata.title)} <span class="subtitle">${escape(bundle.chart.difficulty)}</span></h1><p class="subtitle">${escape(bundle.metadata.artist||'')} · ${escape(bundle.metadata.genre||'')}</p><div class="controls"><label>排列<select id="mode"><option value="normal">NORMAL</option><option value="random">RANDOM</option><option value="mirror">MIRROR</option><option value="custom">自定义映射</option></select></label><label>种子<input id="seed" value="0" size="12"></label><label>Mapping<input id="mapping" value="1234567/1234567" size="21"></label><label>显示侧<select id="playside" ${bundle.chart.difficulty.startsWith('DP')?'disabled':''}><option value="1p">${bundle.chart.difficulty.startsWith('DP')?'DP 双侧':'1P · Left Scratch'}</option><option value="2p">2P · Right Scratch</option></select></label><button id="shuffle" class="primary">随机一个排列</button><button id="apply">应用排列</button><button id="savePng">下载 PNG</button><button id="saveSvg">下载 SVG</button><button id="saveJson">下载完整 JSON</button></div><p id="error" role="alert"></p><h2>小节谱面</h2><div id="plot"></div><h2 class="analysis-heading">Analysis</h2><div id="stats"></div><details><summary>来源与统计说明</summary><p>歌曲 ID：${escape(bundle.song?.id||'—')} · 数据版本 key：${escape(bundle.song?.key||'—')}</p><p>${escape((bundle.song?.sources||[]).map(s=>s.source).join(' / '))}</p></details></main><script>
const bundle=${safe};
${Object.values(helpers).map(f=>f.toString()).join('\n')}
${escape.toString()}\n${measureLayout.toString()}\n${svg.toString()}\n${barsChart.toString()}\n${dashboard.toString()}\n${svgToPNG.toString()}
let current,figure,analysis;const byId=id=>document.getElementById(id);
function render(){try{current=transform(bundle.chart,byId('mode').value,byId('seed').value,byId('mapping').value);current.display={...bundle.chart.display,playSide:bundle.chart.difficulty.startsWith('DP')?'both':byId('playside').value};analysis=analyze(current,${bin});figure=svg(current,bundle.metadata.title+' '+current.difficulty);byId('plot').innerHTML=figure;byId('stats').innerHTML=dashboard(current,analysis);byId('error').textContent='';if(!bundle.chart.difficulty.startsWith('DP')&&globalThis.parent&&parent!==globalThis)parent.postMessage({type:'iidxlab-view',playSide:byId('playside').value},'*');}catch(e){byId('error').textContent=e.message;}}
function download(name,text,type){let url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
function randomize(){
 const previous=JSON.stringify(current?.randomization?.maps?.slice(0,bundle.chart.difficulty.startsWith('DP')?2:1));let seed;
 for(let attempt=0;attempt<32;attempt++){
  seed=globalThis.crypto?.getRandomValues?Array.from(crypto.getRandomValues(new Uint32Array(2))).map(n=>n.toString(36)).join('-'):Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  let candidate=transform(bundle.chart,'random',seed);if(JSON.stringify(candidate.randomization.maps.slice(0,bundle.chart.difficulty.startsWith('DP')?2:1))!==previous)break;
 }
 byId('mode').value='random';byId('seed').value=seed;render();
}
byId('playside').value=${JSON.stringify(!bundle.chart.difficulty.startsWith('DP')&&(options.playSide||bundle.chart.display?.playSide)==='2p'?'2p':'1p')};
byId('playside').onchange=render;byId('shuffle').onclick=randomize;byId('mode').onchange=()=>byId('mode').value==='random'?randomize():render();
byId('savePng').onclick=async()=>{const button=byId('savePng'),snapshot=figure;button.disabled=true;button.textContent='导出中…';try{download('chart.png',await svgToPNG(snapshot),'image/png');}catch(e){byId('error').textContent=e.message;}finally{button.disabled=false;button.textContent='下载 PNG';}};byId('apply').onclick=render;byId('saveSvg').onclick=()=>download('chart.svg',figure,'image/svg+xml');byId('saveJson').onclick=()=>download('chart.json',JSON.stringify({...bundle,chart:current,analysis},null,2),'application/json');render();</script></html>`;
}
export {svg,measureLayout,dashboard,reportHtml,svgToPNG};
