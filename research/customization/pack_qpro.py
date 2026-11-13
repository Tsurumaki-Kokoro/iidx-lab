"""Publish game-ID-indexed neutral-pose layers for the standalone React viewer."""
from pathlib import Path
import json,shutil,sys
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
DATA=ROOT/'qpro-data';WEB=DATA/'web';(WEB/'layers').mkdir(parents=True,exist_ok=True)
manifest=json.loads((DATA/'manifest.json').read_text(encoding='utf-8'))
suffixes={'head':['_b','_f'],'hair':['_b','_f'],'hand':['_r','_l'],'body':[''],'face':[''],'back':['']}
known={(cat,p['sha256']):p['id'] for cat,parts in manifest['versions']['33'].items() for p in reversed(parts) if p['sha256']}
catalog={'schema':1,'pose':'neutral','canvas':[520,704],'categories':{},'missing':[],'sourceVersions':[33,34]}
copied=set()
for category,parts in manifest['versions']['34'].items():
    result=[]
    for part in parts:
        original=known.get((category,part['sha256'])) if part['sha256'] else None
        version=33 if original is not None else 34
        sourceid=original if original is not None else part['id']
        entry={**part,'stem':Path(part['ifs']).stem,'family':Path(part['ifs']).stem.rsplit('_',1)[0],'layers':[],'ready':True,'renderMode':'native-neutral' if version==33 else 'atlas-static-compat'}
        if category=='back' and part['id']==0:entry['empty']=True;result.append(entry);continue
        for suffix in suffixes[category]:
            filename=f'{category}_{sourceid}{suffix}.avif'
            source=DATA/('static33' if version==33 else 'static34-compat')/'qpro_assets'/filename
            target=f'{version}_{category}_{sourceid}{suffix}.png'
            if not source.exists():entry['ready']=False;catalog['missing'].append({'category':category,'id':part['id'],'source':str(source.relative_to(DATA))});continue
            if target not in copied:
                with Image.open(source) as image:
                    if image.size!=(520,704):raise ValueError((source,image.size))
                    if image.format=='PNG':shutil.copyfile(source,WEB/'layers'/target)
                    else:image.convert('RGBA').save(WEB/'layers'/target)
                copied.add(target)
            entry['layers'].append({'suffix':suffix,'file':'layers/'+target})
        result.append(entry)
    catalog['categories'][category]=result
(WEB/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False),encoding='utf-8')
print('Catalog', {c:len(p) for c,p in catalog['categories'].items()},'layers',len(copied),'missing',len(catalog['missing']))
if catalog['missing'] and '--allow-incomplete' not in sys.argv:raise SystemExit('Native conversion still incomplete; catalog records missing layers explicitly')
