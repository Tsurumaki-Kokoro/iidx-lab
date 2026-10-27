const STYLE_NAMES={0:'1st style',1:'substream',2:'2nd style',3:'3rd style',4:'4th style',5:'5th style',6:'6th style',7:'7th style',8:'8th style',9:'9th style',10:'10th style',11:'IIDX RED',12:'HAPPY SKY',13:'DistorteD',14:'GOLD',15:'DJ TROOPERS',16:'EMPRESS',17:'SIRIUS',18:'Resort Anthem',19:'Lincle',20:'tricoro',21:'SPADA',22:'PENDUAL',23:'copula',24:'SINOBUZ',25:'CANNON BALLERS',26:'Rootage',27:'HEROIC VERSE',28:'BISTROVER',29:'CastHour',30:'RESIDENT',31:'EPOLIS',32:'PINKY CRUSH',33:'SPARKLE SHOWER',34:'ZINRAI'};
const CHART_ORDER={B:0,N:1,H:2,A:3,L:4};
export function isOmniSource(source){return /\/data_mods\/omnimix[^/]*\//i.test(String(source||''));}
export function getOmniInfo(song){
 const charts=song.charts||[],hasProvenance=charts.some(c=>c.provenance?.source),legacyOmni=!hasProvenance&&(song.sources||[]).some(p=>isOmniSource(p.source));
 const difficulties=charts.filter(c=>isOmniSource(c.provenance?.source)||legacyOmni).map(c=>c.difficulty);
 return {isOmni:difficulties.length>0,partial:difficulties.length>0&&difficulties.length<charts.length,difficulties};
}
const titleKey=s=>String(s.metadata.title_ascii||s.metadata.title||s.id).normalize('NFKC').trim().toUpperCase();
const compareTitle=(a,b)=>titleKey(a).localeCompare(titleKey(b),'en',{sensitivity:'base'})||a.id.localeCompare(b.id);
export function versionLabel(style){if(style===null||style===undefined)return '未分类';return style<=10?(STYLE_NAMES[style]||String(style)):`${style}${STYLE_NAMES[style]?' · '+STYLE_NAMES[style]:''}`;}
export function titleFolder(song){const first=titleKey(song)[0]||'';return /^[A-Z]$/.test(first)?first:/^[0-9]$/.test(first)?'#':'other';}
/** Game-style folders from original version metadata, chart levels and title_ascii. */
export function browseSongs(songs,{groupBy='version',category='all',playMode='SP',difficulty='all',query=''}={}){
 if(!['version','level','title'].includes(groupBy))throw Error('Unknown folder mode');if(!['SP','DP'].includes(playMode))throw Error('Expected SP or DP');
 const q=String(query).normalize('NFKC').trim().toLowerCase(),all=[];
 for(const song of songs){
  if(q&&![song.id,song.key,song.metadata.title,song.metadata.title_ascii,song.metadata.artist].join(' ').normalize('NFKC').toLowerCase().includes(q))continue;
  const charts=song.charts.filter(c=>c.difficulty.startsWith(playMode)&&(difficulty==='all'||c.difficulty.slice(2)===difficulty));if(!charts.length)continue;
  if(groupBy==='level')for(const chart of charts){const raw=Number(song.metadata.levels?.[chart.difficulty]),level=Number.isInteger(raw)&&raw>=1&&raw<=12?raw:null;all.push({song,chart,difficulty:chart.difficulty,level,folder:level===null?'unknown':String(level),folderLabel:level===null?'未标定 LEVEL':`LEVEL ${level}`});}
  else {const style=song.metadata.style,known=Number.isInteger(style),folder=groupBy==='version'?(known?String(style):'unknown'):titleFolder(song),preferred=charts.find(c=>c.difficulty===playMode+'A')||charts[0];all.push({song,chart:preferred,difficulty:preferred.difficulty,charts,folder,folderLabel:groupBy==='version'?versionLabel(known?style:null):folder==='other'?'其他':folder==='#'?'0–9':folder});}
 }
 function order(a,b){let x=a.folder,y=b.folder;if(x===y)return compareTitle(a.song,b.song)||(CHART_ORDER[a.difficulty.slice(2)]??9)-(CHART_ORDER[b.difficulty.slice(2)]??9);if(x==='unknown'||x==='other')return 1;if(y==='unknown'||y==='other')return -1;return groupBy==='title'?x.localeCompare(y):groupBy==='version'?Number(y)-Number(x):Number(x)-Number(y);}
 all.sort(order);const counts=new Map();for(const e of all){if(!counts.has(e.folder))counts.set(e.folder,{value:e.folder,label:e.folderLabel,count:0});counts.get(e.folder).count++;}
 const entries=all.filter(e=>category==='all'||e.folder===String(category));
 return {entries,folders:[...counts.values()],totalSongs:new Set(entries.map(e=>e.song.id)).size,totalCharts:groupBy==='level'?entries.length:entries.reduce((sum,e)=>sum+e.charts.length,0),groupBy};
}
