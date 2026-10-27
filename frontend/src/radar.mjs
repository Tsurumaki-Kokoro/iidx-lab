// IIDXLab indicators, not KONAMI's unpublished NOTES RADAR formula.
export function radarValues(chart, stats) {
  const notes=chart.events.filter(e=>(e[1]===0||e[1]===1)&&e[2]>=0&&e[2]<8);
  const sides=chart.difficulty.startsWith('DP')?2:1;
  const duration=Math.max(1,stats.active_duration_seconds);
  const groups=new Map();
  for(const [t,side] of notes){const key=`${side}:${t}`;groups.set(key,(groups.get(key)||0)+1)}
  const chordNotes=[...groups.values()].filter(n=>n>=2).reduce((a,b)=>a+b,0);
  const tempos=chart.events.filter(e=>e[1]===4&&e[2]>0&&e[3]>0).sort((a,b)=>a[0]-b[0]);
  let previous,variation=0;
  for(const [t,,den,num] of tempos){const bpm=num/den;if(t>stats.last_note_end_ms)break;if(previous&&t>=stats.first_note_ms)variation+=Math.abs(Math.log2(bpm/previous));previous=bpm}
  /** @type {[string,number,string][]} */
  const values=[
    ['NOTES',stats.average_heads_per_second/(20*sides),'Average NPS / '+(20*sides)],
    ['PEAK',stats.peak_rolling_1s_heads/(40*sides),'Peak 1s Notes / '+(40*sides)],
    ['SCRATCH',stats.scratch_heads/duration/(5*sides),'Scratch/s / '+(5*sides)],
    ['SOF-LAN',variation/4,'Σ |log₂(BPM ratio)| / 4'],
    ['CHARGE',stats.long_note_heads/Math.max(1,notes.length)/.25,'Long Notes ratio / 25%'],
    ['CHORD',chordNotes/Math.max(1,notes.length)/.8,'Chord Notes ratio / 80%'],
  ];
  return values.map(([axis,ratio,definition])=>({axis,value:Math.round(Math.min(100,Math.max(0,Number(ratio)*100))*10)/10,definition}));
}
