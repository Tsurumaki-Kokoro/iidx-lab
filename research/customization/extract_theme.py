"""Full read-only Theme package export, retaining variants and source provenance."""
from pathlib import Path
import hashlib,json,re,sys,time
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'vendor'))
from ifstools import IFS
OUT=ROOT/'theme-data';OUT.mkdir(exist_ok=True)
PAT=re.compile(r'^(?:gmframe.*|basic_frame.*|turn\d+|exp\d+|lane\d+.*|notes\d+.*|notes_(?:cn|hcn)\d+.*|fcombo\d+|beam\d+.*|judge\d+|entry_card\d+.*|sub_customize_.*|graph(?:_[ajk])?|sub_premium_area(?:_[ajk])?|sub_card|common)\.ifs$')

def main():
 packages={};start=time.time()
 for version in (33,34):
  graphic=Path(f'K:/HDD/LDJ-{version}/data/graphic')
  for path in sorted(graphic.rglob('*.ifs')):
   if not PAT.fullmatch(path.name):continue
   sha=hashlib.sha256(path.read_bytes()).hexdigest()
   package=packages.setdefault(sha,{'sha256':sha,'sources':[]})
   package['sources'].append({'version':version,'path':path.relative_to(graphic).as_posix()})
   package['sourceFile']=str(path)
 errors=[]
 for index,p in enumerate(packages.values()):
  dest=OUT/'raw'/p['sha256'];marker=dest/'export-complete.json'
  try:
   if marker.exists():info=json.loads(marker.read_text())
   else:
    archive=IFS(p['sourceFile'])
    try:archive.extract(path=str(dest),progress=False,extract_manifest=True)
    finally:archive.close()
    info={'textures':[f.relative_to(dest).as_posix() for f in sorted(dest.rglob('*.png'))], 'members':len(list(dest.rglob('*')))}
    marker.write_text(json.dumps(info),encoding='utf-8')
   p.update(info)
  except Exception as e:errors.append({'sha256':p['sha256'],'error':str(e)})
  if index%25==0:print(f'{index+1}/{len(packages)} packages, {time.time()-start:.1f}s',flush=True)
 result={'schema':1,'packages':list(packages.values()),'errors':errors}
 (OUT/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'packages':len(packages),'textures':sum(len(p.get('textures',[])) for p in packages.values()),'errors':errors}),flush=True)
 if errors:sys.exit(1)

if __name__=='__main__':main()
