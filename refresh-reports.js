// Refresh generated reports in place, retaining embedded charts and random settings.
const fs=require('node:fs'),path=require('node:path'),{reportHtml,svg,load,transform,analyze}=require('./lab');
const folder=path.join(__dirname,'reports');
for(let name of fs.readdirSync(folder).filter(n=>n.endsWith('.html'))){
 let file=path.join(folder,name),old=fs.readFileSync(file,'utf8'),match=old.match(/const bundle=([^\n]+);\r?\n/);if(!match)continue;
 let bundle=JSON.parse(match[1]),json=file.replace(/\.html$/,'.json'),saved=fs.existsSync(json)?JSON.parse(fs.readFileSync(json,'utf8')):null;
 let state=saved?.chart?.randomization||{mode:'normal',seed:'0'},bin=saved?.analysis?.density_bin_ms||1000;
 let id=bundle.song?.id||saved?.song?.id||bundle.metadata.title.match(/^\d{5}/)?.[0];
 if(id){bundle=load(id,bundle.chart.difficulty);if(saved?.chart?.display)bundle.chart={...bundle.chart,display:saved.chart.display};}
 const chart=transform(bundle.chart,state.mode,state.seed,state.mode==='custom'?state.maps.map(m=>m.join('')).join('/'):undefined);if(bundle.chart.display)chart.display=bundle.chart.display;const analysis=analyze(chart,bin);
 let html=reportHtml(bundle,bin).replace('id="seed" value="0"',()=>`id="seed" value="${String(state.seed).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}"`).replace('let current,figure,analysis;',()=>`document.getElementById("mode").value=${JSON.stringify(state.mode)};let current,figure,analysis;`);
 if(state.mode==='custom')html=html.replace('id="mapping" value="1234567/1234567"',()=>`id="mapping" value="${state.maps.map(m=>m.join('')).join('/')}"`);
 fs.writeFileSync(file,html);fs.writeFileSync(file.replace(/\.html$/,'.svg'),svg(chart,bundle.metadata.title+' '+bundle.chart.difficulty));fs.writeFileSync(json,JSON.stringify({...bundle,chart,analysis},null,2));fs.writeFileSync(file.replace(/\.html$/,'-density.csv'),'start_ms,heads,key_heads,scratch_heads,long_note_heads,nps\n'+analysis.density.map(b=>[b.start_ms,b.heads,b.key_heads,b.scratch_heads,b.long_note_heads,b.nps].join(',')).join('\n'));console.log('Updated '+name);
}
