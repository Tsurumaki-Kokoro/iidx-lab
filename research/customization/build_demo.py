"""Read-only sample conversion and standalone browser proof, never loads game DLLs."""
from pathlib import Path
import argparse, json, sys, shutil

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'vendor'))
from ifstools import IFS
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--game-root', type=Path, default=Path('K:/HDD/LDJ-34'))
args = parser.parse_args()
work = Path(__file__).resolve().parent
demo = work / 'demo'
demo.mkdir(exist_ok=True)
catalog = {'turntable': [], 'frame': [], 'qpro': [], 'other': []}
extra_samples = ['exp00','lane000','notes00','notes_cn00','notes_hcn00','fcombo00','beam00','judge00','entry_card000','sub_customize_bg000','sub_customize_panel000']
sources = list((args.game_root/'data/graphic').glob('turn[0-9][0-9].ifs'))
sources += [args.game_root/'data/graphic'/f'{name}.ifs' for name in ['gmframe34', 'qp_aeon_body','qp_aeon_face','qp_aeon_hair','qp_aeon_hand','qp_aeon_head']]
sources += [args.game_root/'data/graphic'/f'{name}.ifs' for name in extra_samples]
for source in sorted(sources):
    if not source.exists(): continue
    extracted = work/'samples'/source.stem
    if not extracted.exists():
        archive = IFS(str(source))
        try: archive.extract(progress=False,path=str(extracted),extract_manifest=True)
        finally: archive.close()
    category = 'other' if source.stem in extra_samples else 'turntable' if source.stem.startswith('turn') else 'frame' if source.stem.startswith('gmframe') else 'qpro'
    for png in sorted((extracted/'tex').glob('*.png')):
        relative = Path('assets')/source.stem/png.name
        target = demo/relative
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copyfile(png,target)
        with Image.open(png) as image:
            catalog[category].append({'id':source.stem+'/'+png.stem,'file':relative.as_posix(),'size':list(image.size)})
(demo/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False),encoding='utf-8')
template=(work/'demo.template.html').read_text(encoding='utf-8')
(demo/'index.html').write_text(template.replace('/*CATALOG*/',json.dumps(catalog)),encoding='utf-8')
print(json.dumps({key:len(value) for key,value in catalog.items()}))
print(demo/'index.html')
