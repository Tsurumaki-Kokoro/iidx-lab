"""Read-only IIDX export. Python + vendor/ifstools only needed for extraction."""
from pathlib import Path
import sys, struct, json, hashlib, gzip, csv, time, io, contextlib
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT/'vendor'))
from ifstools import IFS

LABELS = {0:'SPH',1:'SPN',2:'SPA',3:'SPB',4:'SPL',6:'DPH',7:'DPN',8:'DPA',10:'DPL'}
OUT=ROOT/'dataset-source'
for sub in ['songs','raw']: (OUT/sub).mkdir(parents=True,exist_ok=True)
errors=[]; databases=[]; catalog=[]; seen={}; metadata={}; metadata_versions={}; inventory=[]

def dump(p,v): p.write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

def db_read(p):
    b=p.read_bytes()
    if b[:4]!=b'IIDX': raise ValueError('Not IIDX database')
    v,n=struct.unpack_from('<IH',b,4)
    total=struct.unpack_from('<I',b,12)[0] if v>=32 else struct.unpack_from('<I',b,10)[0]
    pos=16+total*(4 if v>=32 and v!=80 else 2)
    rows=[]
    for _ in range(n):
        start=pos
        lengths=([128,64,128,128] if v==80 else [256,64,128,256,256] if v>=32 else [64]*4)
        strings=[]
        for i,l in enumerate(lengths):
            enc='utf-16-le' if v>=32 and v!=80 and i!=1 else 'cp932'
            strings.append(b[pos:pos+l].decode(enc,errors='replace').rstrip('\0')); pos+=l
        pos+=24 if v>=32 and v!=80 else 20
        font,style=struct.unpack_from('<IH',b,pos); pos+=6
        pos+=14 if v>=32 and v!=80 else 6
        ls=list(b[pos:pos+(10 if v>=27 else 8)]);pos+=len(ls)
        names=['SPB','SPN','SPH','SPA','SPL','DPB','DPN','DPH','DPA','DPL'] if v>=27 else ['SPN','SPH','SPA','DPN','DPH','DPA','SPB','DPB']
        pos+=0x2c6 if v==80 else 0x286 if v>=27 else 0xa0
        mid,vol=struct.unpack_from('<II',b,pos);pos+=8
        ident=list(b[pos:pos+len(ls)]);pos+=len(ls)+2
        if v<=26 or v==80:pos+=2
        pos+=32
        if v==80:pos+=2
        pos+=4+(10 if v>=22 else 9)*32
        if v>=26:pos+=4
        if pos>len(b):raise ValueError(f'Truncated database at entry {_}')
        rows.append(dict(id=str(mid).zfill(5),title=strings[0],title_ascii=strings[1],genre=strings[2],artist=strings[3],subtitle=strings[4] if len(strings)>4 else '',style=style,levels=dict(zip(names,ls)),identifiers=dict(zip(names,ident)),record_bytes=pos-start))
    return dict(version=v,records=rows,consumed=pos,size=len(b))

def parse(b):
    if len(b)<96:raise ValueError('Short .1 header')
    charts=[]
    for slot in range(12):
        off,length=struct.unpack_from('<II',b,slot*8)
        if not length:continue
        if off<96 or length%8 or off+length>len(b):raise ValueError(f'Invalid chart bounds slot {slot}: {off}, {length}, {len(b)}')
        events=[];terminated=False
        for t,cmd,param,value in struct.iter_unpack('<iBBh',b[off:off+length]):
            if t==0x7fffffff:terminated=True;break
            events.append([t,cmd,param,value])
        if not terminated:raise ValueError(f'Missing terminator slot {slot}')
        notes=[e for e in events if e[1] in (0,1)]
        charts.append(dict(slot=slot,difficulty=LABELS.get(slot,f'SLOT{slot}'),events=events,note_heads=len(notes),long_notes=sum(e[3]!=0 for e in notes),scratch_heads=sum(e[2]==7 for e in notes),max_time_ms=max((e[0]+max(0,e[3]) for e in notes),default=0)))
    return charts

def consume(b,source,inner,mid,meta):
    sha=hashlib.sha256(b).hexdigest()
    key=(sha,mid)
    provenance=dict(source=source,member=inner,metadata=meta)
    if key in seen:seen[key]['sources'].append(provenance);return
    charts=parse(b)
    if not charts:raise ValueError('No charts')
    name=f'{mid}-{sha[:16]}'
    raw=OUT/'raw'/f'{sha}.1'
    if not raw.exists():raw.write_bytes(b)
    data=dict(schema=1,id=mid,sha256=sha,time_unit='millisecond',event_columns=['time_ms','command','parameter_unsigned','value_signed'],charts=charts)
    with gzip.open(OUT/'songs'/f'{name}.json.gz','wt',encoding='utf-8') as f:json.dump(data,f,ensure_ascii=False,separators=(',',':'))
    item=dict(key=name,id=mid,sha256=sha,file=f'songs/{name}.json.gz',sources=[provenance],charts=[{k:v for k,v in c.items() if k!='events'} for c in charts])
    seen[key]=item;catalog.append(item)

def main():
    hdd=Path(sys.argv[1] if len(sys.argv)>1 else ROOT.parents[1]).resolve()
    repair='--repair' in sys.argv
    repair_sources=set()
    if repair:
        old_errors=json.loads((OUT/'errors.json').read_text(encoding='utf-8'))
        repair_sources={e['source'] for e in old_errors}
        catalog.extend(json.loads((OUT/'catalog.json').read_text(encoding='utf-8'))['songs'])
        for item in catalog:seen[(item['sha256'],item['id'])]=item
        inventory.extend(x for x in json.loads((OUT/'inventory.json').read_text(encoding='utf-8')) if x['source'] not in repair_sources)
    roots=[p for p in hdd.iterdir() if p.is_dir() and p.name in ('LDJ-33','LDJ-34')]
    for game in roots:
        print('Scanning',game.name,flush=True)
        dbs=sorted(set(game.rglob('music_data.bin'))|set(game.rglob('music_omni.bin'))|set(game.rglob('music_diff.bin')))
        for p in dbs:
            rel=p.relative_to(hdd).as_posix()
            try:
                result=db_read(p);databases.append(dict(source=rel,**result))
                # metadata resolution restricted to the matching data / mod tree
                tree=p.parents[1] if p.parent.name=='info' else p.parents[2]
                tree_key=str(tree);incoming={r['id']:r for r in result['records']}
                if result['version']>=metadata_versions.get(tree_key,0):
                    metadata[tree_key]={**metadata.get(tree_key,{}),**incoming};metadata_versions[tree_key]=result['version']
                else:metadata[tree_key]={**incoming,**metadata.get(tree_key,{})}
                print('DB',rel,result['version'],len(result['records']),result['consumed']==result['size'],flush=True)
            except Exception as e:errors.append(dict(source=rel,stage='database',error=str(e)))
        sound_dirs=sorted(p for p in game.rglob('sound') if p.is_dir() and p.parent.name not in ['_cache'])
        for sound in sound_dirs:
            # Exclude cache material; preserve separate original and mod datasets.
            if '_cache' in sound.parts:continue
            meta=metadata.get(str(sound.parent),{})
            files=sorted(list(sound.rglob('*.1'))+list(sound.rglob('*.ifs')))
            print('SOUND',sound.relative_to(hdd),len(files),flush=True)
            for p in files:
                rel=p.relative_to(hdd).as_posix()
                if repair and rel not in repair_sources:continue
                entry=dict(source=rel,charts_found=0)
                try:
                    with p.open('rb') as magicfile:magic=magicfile.read(4)
                    if p.suffix=='.1' and magic!=bytes.fromhex('6cad8f89'):
                        mid=p.stem.zfill(5);consume(p.read_bytes(),rel,None,mid,meta.get(mid));entry['charts_found']=1
                    else:
                        log=io.StringIO()
                        with contextlib.redirect_stdout(log):
                            try:archive=IFS(str(p))
                            except OSError as e:
                                if 'but it does not exist' not in str(e):raise
                                archive=IFS(str(p),super_disable=True)
                                print('WARNING: Missing parent IFS; extracted only self-contained members:',e)
                            try:
                                for f in archive.tree.all_files:
                                    inner=str(f)
                                    if inner.lower().endswith('.1'):
                                        mid=Path(inner).stem.zfill(5)
                                        consume(f.load(),rel,inner,mid,meta.get(mid));entry['charts_found']+=1
                            finally:archive.close()
                        if log.getvalue():entry['warnings']=log.getvalue()
                except Exception as e:
                    entry['error']=str(e);errors.append(dict(source=rel,stage='chart',error=str(e)))
                    blob=p.read_bytes(); digest=hashlib.sha256(blob).hexdigest()
                    (OUT/'unparsed').mkdir(exist_ok=True)
                    dest=OUT/'unparsed'/f'{digest}.bin'
                    if not dest.exists():dest.write_bytes(blob)
                    entry['unparsed_copy']=f'unparsed/{digest}.bin'
                if not entry['charts_found'] and 'error' not in entry:
                    blob=p.read_bytes();digest=hashlib.sha256(blob).hexdigest()
                    (OUT/'unparsed').mkdir(exist_ok=True)
                    (OUT/'unparsed'/f'{digest}.bin').write_bytes(blob)
                    entry['unparsed_copy']=f'unparsed/{digest}.bin'
                inventory.append(entry)
            print('Progress',len(catalog),'unique song variants;',len(errors),'errors',flush=True)
    for item in catalog:
        for provenance in item['sources']:
            parts=Path(provenance['source']).parts
            if 'sound' in parts:
                tree=hdd.joinpath(*parts[:parts.index('sound')])
                provenance['metadata']=metadata.get(str(tree),{}).get(item['id'])
    dump(OUT/'catalog.json',dict(schema=1,songs=catalog))
    dump(OUT/'metadata.json',databases)
    dump(OUT/'inventory.json',inventory)
    dump(OUT/'errors.json',errors)
    summary=dict(song_variants=len(catalog),unique_raw_files=len({c['sha256'] for c in catalog}),chart_variants=sum(len(c['charts']) for c in catalog),source_files=len(inventory),databases=len(databases),errors=len(errors),no_chart_archives=sum(x['charts_found']==0 and 'error' not in x for x in inventory))
    dump(OUT/'summary.json',summary)
    with (OUT/'charts.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f);w.writerow(['key','id','title','difficulty','level','note_heads','long_notes','scratch_heads','max_time_ms','source'])
        for s in catalog:
            m=next((p['metadata'] for p in reversed(s['sources']) if p['metadata']),{})
            for c in s['charts']:w.writerow([s['key'],s['id'],m.get('title',''),c['difficulty'],m.get('levels',{}).get(c['difficulty'],''),c['note_heads'],c['long_notes'],c['scratch_heads'],c['max_time_ms'],' | '.join(p['source'] for p in s['sources'])])
    print(json.dumps(summary),flush=True)

if __name__=='__main__':main()
