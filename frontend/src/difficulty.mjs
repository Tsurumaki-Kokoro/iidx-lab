// In the imported .1 schema, slot code SPB/DPB means BEGINNER.
// Black Another needs an explicit variant marker; never infer it from level.
export function difficultyPresentation(chart){
 const code=String(chart.difficulty||'').toUpperCase(),kind=String(chart.variant||chart.kind||'').toLowerCase();
 if(['black','black_another','black another'].includes(kind)||code.includes('BLACK'))return {label:code.startsWith('DP')?'DPB':'SPB',tone:'black',name:'BLACK ANOTHER'};
 if(code==='BEGINNER'||/^[SD]PB$/.test(code))return {label:code.startsWith('DP')?'DP BEGINNER':'BEGINNER',tone:'beginner',name:'BEGINNER'};
 const suffix=code.slice(2),tones={N:'normal',H:'hyper',A:'another',L:'leggendaria'},names={N:'NORMAL',H:'HYPER',A:'ANOTHER',L:'LEGGENDARIA'};
 return {label:code,tone:tones[suffix]||'unknown',name:names[suffix]||code};
}
