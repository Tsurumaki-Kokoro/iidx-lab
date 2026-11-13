"""Build a standalone full-texture Theme catalog with explicit ID/name evidence."""
from pathlib import Path
import csv,hashlib,json,re,shutil,xml.etree.ElementTree as ET
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'theme-data';WEB=OUT/'web';WEB.mkdir(exist_ok=True)
REF=ROOT/'research/customization/reference'
LOCAL=Path('F:/tools/asphyxia-core-win-x64/plugins/iidx@asphyxia')

def pug_tables(path):
 text=path.read_text(encoding='utf-8');result={}
 for m in re.finditer(r'const\s+(\w+)\s*=\s*\[([\s\S]*?)\]',text):
  values={}
  for v in re.finditer(r"\{\s*val:\s*(\d+),\s*name:\s*'((?:\\.|[^'\\])*)'",m[2]):
   values[int(v[1])]=v[2].replace("\\'", "'").replace('\\\\','\\')
  if values:result[m[1].removesuffix('_types')]=values
 return result

def main():
 manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
 public=pug_tables(REF/'asphyxia-plugins/iidx@asphyxia/webui/profile_----setting.pug')
 local=pug_tables(LOCAL/'webui/profile_----setting.pug')
 text=(REF/'ryu-plugins/iidx@asphyxia/webui/profile_----setting.pug').read_text(encoding='utf-8')
 ryu=json.JSONDecoder().raw_decode(text[text.index('{',text.index('const customData')):])[0]
 # Prefer the complete public table; Ryu fills placeholder labels and missing background names.
 names={k:dict(v) for k,v in public.items()}
 for k,items in ryu.items():
  if k.startswith('qpro') or k in ('frame','note_skin'):continue
  for n,label in enumerate(items):
   old=names.setdefault(k,{}).get(n)
   if old is None or re.fullmatch(r'Turntable \d+',old):names[k][n]=label
 # Local labels are retained as a separate evidence column, never silently substitute wrong IDs.
 provenance={'localPlugin':str(LOCAL),'localSettingSHA256':hashlib.sha256((LOCAL/'webui/profile_----setting.pug').read_bytes()).hexdigest(),
  'sources':['https://github.com/asphyxia-core/plugins','https://github.com/Ryu7w7/asphyxia_plugins'],
  'tables':names,'localTables':local}
 (OUT/'name-evidence.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')
 patterns=[('turntable',r'turn(\d+)'),('note_burst',r'exp(\d+)'),('lane_cover',r'lane(\d+)(?:_(.*))?'),
  ('note_skin',r'notes(\d+)(?:_(.*))?'),('cn_color',r'notes_cn(\d+)(?:_(.*))?'),('hcn',r'notes_hcn(\d+)(?:_(.*))?'),
  ('full_combo_splash',r'fcombo(\d+)'),('note_beam',r'beam(\d+)(?:_(.*))?'),('judge_font',r'judge(\d+)'),
  ('entry_bg',r'entry_card(\d+)(?:_(.*))?'),('premium_bg',r'sub_customize_bg(\d+)(?:_(.*))?'),
  ('premium_skin',r'sub_customize_panel(\d+)(?:_(.*))?')]
 groups={k:[] for k in ['frame','turntable','note_burst','lane_cover','lift_cover','note_skin','cn_color','hcn','full_combo_splash','note_beam','judge_font','pacemaker_cover','premium_skin','premium_bg','premium_bg_concent','entry_bg','breaking_news','first_note_preview','disable_hcn_color','effect']}
 files={};images={};warnings=[]
 # Map each package once; content-identical textures across all packages share one PNG.
 for package in manifest['packages']:
  textures=[]
  for relative in package['textures']:
   source=OUT/'raw'/package['sha256']/relative;sha=hashlib.sha256(source.read_bytes()).hexdigest()
   file=f'assets/{sha}.png';target=WEB/file
   if sha not in images:
    target.parent.mkdir(exist_ok=True)
    if not target.exists():shutil.copyfile(source,target)
    with Image.open(source) as im:size=list(im.size)
    images[sha]={'file':file,'size':size}
   textures.append({'name':Path(relative).stem,**images[sha]})
  for source in package['sources']:
   files[(source['version'],source['path'])]={'package':package['sha256'],'source':source['path'],'textures':textures}

 def add(group,version,id,resource,label=None,evidence='filename',variant='',supported=True):
  ref=files.get((version,resource));name=label or names.get(group,{}).get(id)
  if group in ('cn_color','hcn'):name=names.get('note_skin',{}).get(id)
  localkey={'hcn':'cn_color','cn_color':'cn_color','premium_skin':'lm_skin','premium_bg':'lm_bg','premium_bg_concent':'lm_bg_2','entry_bg':'lm_entry_bg'}.get(group,group)
  localname=local.get(group,{}).get(id)
  conflict=bool(localname and name and localname.casefold()!=name.casefold())
  if conflict and group=='turntable' and id>=22:warnings.append({'group':group,'id':id,'pluginName':localname,'name':name})
  verified=id is not None and (evidence.startswith('game XML') or evidence.startswith('plugin parameter') or evidence=='default frame' or name is not None and not evidence.endswith('not in active XML'))
  item={'key':f'{group}:{version}:{id}:{resource}:{variant}','version':version,'id':id,'idVerified':verified,'name':name or f'名称待核实 · {Path(resource).stem}',
   'nameVerified':bool(name),'idEvidence':evidence,'field':localkey,'pluginName':localname,'pluginConflict':conflict and group=='turntable' and id>=22,
   'variant':variant,'supported':supported,'textures':ref['textures'] if ref else [],'source':resource,'package':ref['package'] if ref else None}
  groups[group].append(item)
  return item

 for version in (33,34):
  # XML mappings override the filename suffix, including default background 0 -> bg001.
  xmlresources=set()
  for group,xmlname in [('premium_bg','sub_customize_bg'),('premium_skin','sub_customize_panel')]:
   for subset in (0,1):
    xml=Path(f'K:/HDD/LDJ-{version}/data/info/{subset}/{xmlname}.xml')
    if not xml.exists():continue
    for node in ET.fromstring(xml.read_text(encoding='cp932')):
     for field in node:
      resource=(field.text or '').strip()
      if not resource.endswith('.ifs'):continue
      xmlresources.add((group,resource))
      add(group,version,int(node.attrib['key']),resource,evidence=f'game XML {subset}/{xmlname}.xml',variant=f'set {subset} / {field.tag}')
  for (ver,resource),ref in sorted(files.items()):
   if ver!=version:continue
   stem=Path(resource).stem
   for group,pattern in patterns:
    m=re.fullmatch(pattern,stem)
    if not m:continue
    if (group,Path(resource).name) in xmlresources:break
    add(group,version,int(m[1]),resource,variant=(m[2] or 'default') if m.lastindex>1 else '',
        evidence='game resource suffix; not in active XML' if group in ('premium_bg','premium_skin') else 'resource suffix / customization table')
    break
   else:
    if 'frame' in stem:
     default=stem==f'gmframe{version}' or stem=='basic_frame'
     label='Default' if default else re.sub(r'^gmframe_', '',stem).replace('_',' ').upper()
     add('frame',version,0 if default else None,resource,label,evidence='default frame' if default else 'ID not verified',variant=resource)
    elif stem.startswith('sub_premium_area') or stem=='common':add('breaking_news',version,None,resource,'Breaking News shared assets',evidence='shared resource; no individual skin ID')
    elif stem.startswith('graph') or stem=='sub_card':add('pacemaker_cover',version,None,resource,'Shared UI assets',evidence='shared resource; no individual skin ID')
  # Lift and Pacemaker use the same cover pool and their own independent profile fields.
  for group in ('lift_cover','pacemaker_cover'):
   for item in list(groups['lane_cover']):
    if item['version']==version:
     copied={**item,'key':item['key'].replace('lane_cover:',group+':',1),'field':group}
     groups[group].append(copied)
  groups['premium_bg_concent'] += [{**i,'key':i['key'].replace('premium_bg:','premium_bg_concent:',1),'field':'lm_bg_2'} for i in groups['premium_bg'] if i['version']==version]
  for group,values in [('first_note_preview',names.get('fnp',{})),('disable_hcn_color',{0:'HCN Colors ON',1:'HCN Colors OFF'}),('effect',names.get('effect',{}))]:
   for id,label in values.items():add(group,version,id,'',label,evidence='plugin parameter; no texture')
 # Supplemental cover names missing from the older local plugin remain clearly identified.
 catalog={'schema':1,'groups':groups,'warnings':warnings,'sourceVersions':[33,34],
  'summary':{'packages':len(manifest['packages']),'rawTextures':sum(len(p['textures']) for p in manifest['packages']),'uniqueTextures':len(images),
             'missingNames':sum(not i['nameVerified'] for values in groups.values() for i in values),'unverifiedIDs':sum(i['id'] is None for values in groups.values() for i in values)}}
 (WEB/'catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 with (WEB/'setting-ids.csv').open('w',encoding='utf-8-sig',newline='') as stream:
  fields=['category','version','field','id','idVerified','name','nameVerified','source','variant','pluginName','pluginConflict']
  writer=csv.DictWriter(stream,fieldnames=fields);writer.writeheader()
  for group,items in groups.items():
   for item in items:writer.writerow({'category':group,**{k:item.get(k) for k in fields if k!='category'}})
 (OUT/'audit.json').write_text(json.dumps(catalog['summary'],indent=2),encoding='utf-8')
 print(json.dumps(catalog['summary']));print({k:len(v) for k,v in groups.items()})

if __name__=='__main__':main()
