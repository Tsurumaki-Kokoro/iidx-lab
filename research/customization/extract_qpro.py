"""Read-only 33/34 Qpro export with PE table IDs and content-addressed resources."""
from pathlib import Path
import collections, hashlib, json, re, struct, sys, time

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'vendor'))
from ifstools import IFS

OUT=ROOT/'qpro-data'
OUT.mkdir(exist_ok=True)
CATEGORIES=('head','hair','hand','body','face','back')

def tables(path):
    data=path.read_bytes(); pe=struct.unpack_from('<I',data,60)[0]
    if data[pe:pe+4]!=b'PE\0\0':raise ValueError('Not PE')
    count=struct.unpack_from('<H',data,pe+6)[0]; optional=pe+24
    optional_size=struct.unpack_from('<H',data,pe+20)[0]
    magic=struct.unpack_from('<H',data,optional)[0]
    base=struct.unpack_from('<Q' if magic==0x20b else '<I',data,optional+(24 if magic==0x20b else 28))[0]
    sections=[]
    for index in range(count):
        start=optional+optional_size+index*40
        rva,size,offset=struct.unpack_from('<III',data,start+12)
        sections.append((rva,size,offset))
    def name_at(va):
        for rva,size,offset in sections:
            if rva<=va-base<rva+size:
                start=offset+va-base-rva; end=data.find(b'\0',start,start+97)
                if end<0:return None
                text=data[start:end]
                if text.startswith(b'qp_') and text.endswith(b'.ifs') and all(32<=b<=126 for b in text):return text.decode('ascii')
        return None
    candidates={}
    for rva,size,offset in sections:
        for index in range(offset,min(offset+size,len(data))-15,8):
            pointer,flags=struct.unpack_from('<QQ',data,index)
            if flags>=65536 or not base<=pointer<base+len(data)*3:continue
            name=name_at(pointer)
            if name:candidates[base+rva+index-offset]=(name,flags)
    kept=[]
    for va in sorted(candidates):
        if va-16 in candidates:continue
        run=[];current=va
        while current in candidates:run.append((current,*candidates[current]));current+=16
        if len(run)>=16:kept.extend(run)
    result={key:[] for key in CATEGORIES}
    for va,name,flags in sorted(kept):
        match=re.search(r'_(body|face|head|hair|hand|bg)\d*\.ifs$',name)
        if not match:continue
        category='back' if match[1]=='bg' else match[1]
        result[category].append({'id':len(result[category]),'ifs':name,'flags':flags&255})
    if any(not result[c] for c in CATEGORIES):raise ValueError('Missing category table')
    return result

def main():
    manifests={}; packages={};errors=[];start=time.time()
    for version in (33,34):
        game=Path(f'K:/HDD/LDJ-{version}')
        manifests[str(version)]=tables(game/'modules/bm2dx.dll')
        print('IDs',version,{c:len(v) for c,v in manifests[str(version)].items()},flush=True)
        for file in sorted((game/'data/graphic').glob('qp_*.ifs')):
            digest=hashlib.sha256(file.read_bytes()).hexdigest()
            if digest not in packages:packages[digest]={'sha256':digest,'file':file,'sources':[]}
            packages[digest]['sources'].append({'version':version,'ifs':file.name})
    (OUT/'tables.json').write_text(json.dumps(manifests,ensure_ascii=False,indent=2),encoding='utf-8')
    for version,cats in manifests.items():
        for category,parts in cats.items():
            for part in parts:
                matching=next((p for p in packages.values() if {'version':int(version),'ifs':part['ifs']} in p['sources']),None)
                part['sha256']=matching['sha256'] if matching else None
                if not matching:errors.append({'version':version,'category':category,'id':part['id'],'error':'IFS missing','ifs':part['ifs']})
    records=[]
    for i,(digest,package) in enumerate(packages.items(),1):
        destination=OUT/'raw'/digest;marker=destination/'export-complete.json'
        try:
            if marker.exists():record=json.loads(marker.read_text(encoding='utf-8'))
            else:
                archive=IFS(str(package['file']))
                try:archive.extract(progress=False,path=str(destination),extract_manifest=True)
                finally:archive.close()
                record={'sha256':digest,'sources':package['sources'],'textures':[str(p.relative_to(destination)).replace('\\','/') for p in destination.rglob('*.png')],'afp':[str(p.relative_to(destination)).replace('\\','/') for p in (destination/'afp').glob('*') if p.is_file()]}
                marker.write_text(json.dumps(record,ensure_ascii=False),encoding='utf-8')
            record['sources']=package['sources'];records.append(record)
        except Exception as e:errors.append({'sources':package['sources'],'error':str(e)})
        if i%50==0 or i==len(packages):
            status={'done':i,'total':len(packages),'errors':len(errors),'seconds':round(time.time()-start)}
            (OUT/'progress.json').write_text(json.dumps(status),encoding='utf-8');print(json.dumps(status),flush=True)
    (OUT/'manifest.json').write_text(json.dumps({'schema':1,'versions':manifests,'packages':records,'errors':errors},ensure_ascii=False),encoding='utf-8')
    print('FINISHED',len(records),'packages',len(errors),'errors',flush=True)

if __name__=='__main__':main()
