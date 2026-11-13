"""Build a separate texture-only compatibility input for 34's newer mesh format.

Raw extracted AFP/GE2D and original IFS stay untouched. This staging game directory
uses 33's offline renderer engine with 34's static ID table, and intentionally strips
animation from supplementary packages so the existing native atlas fallback can
produce an aligned neutral still. It does not reproduce 34-only animation/effects.
"""
from pathlib import Path
import json,shutil,sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'vendor'))
from ifstools import IFS
data=ROOT/'qpro-data';stage=data/'engine34-texture';graphic=stage/'data/graphic';graphic.mkdir(parents=True,exist_ok=True)
assert stage.resolve().is_relative_to(data.resolve())
(stage/'modules').mkdir(exist_ok=True)
for dll in Path('K:/HDD/LDJ-33/modules').glob('*.dll'):shutil.copyfile(dll,stage/'modules'/dll.name)
shutil.copyfile('K:/HDD/LDJ-34/modules/bm2dx.dll',stage/'modules/bm2dx.dll')
shutil.copyfile('K:/HDD/LDJ-33/data/graphic/qp_main2.ifs',graphic/'qp_main2.ifs')
manifest=json.loads((data/'manifest.json').read_text())
known={(c,p['sha256']) for c,ps in manifest['versions']['33'].items() for p in ps if p['sha256']}
count=0
for category,parts in manifest['versions']['34'].items():
    for p in parts:
        if not p['sha256'] or (category,p['sha256']) in known:continue
        source=data/'raw'/p['sha256'];temp=data/'compat-input'/p['sha256'];temp.mkdir(parents=True,exist_ok=True)
        shutil.copytree(source/'tex',temp/'tex',dirs_exist_ok=True)
        shutil.copyfile(source/'magic',temp/'magic')
        package=IFS(str(temp));package.repack(progress=False,path=str(graphic/p['ifs']))
        count+=1
print('Supplementary texture-only packages:',count)
