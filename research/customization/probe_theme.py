from pathlib import Path
import struct,re
p=Path('K:/HDD/LDJ-34/modules/bm2dx.dll');d=p.read_bytes();pe=struct.unpack_from('<I',d,60)[0];op=pe+24;base=struct.unpack_from('<Q',d,op+24)[0];sections=[]
for i in range(struct.unpack_from('<H',d,pe+6)[0]):
 s=op+struct.unpack_from('<H',d,pe+20)[0]+40*i;rva,size,off=struct.unpack_from('<III',d,s+12);sections.append((rva,size,off))
strings={}
for m in re.finditer(rb'[\x20-\x7e]{3,160}\x00',d):
 t=m[0][:-1].decode()
 if re.search(r'(gmframe|lane\d|notes\d|notes_cn|notes_hcn|beam\d|entry_card|sub_customize|exp\d|turn\d|judge\d|fcombo)',t):
  for r,sz,o in sections:
   if o<=m.start()<o+sz: strings[base+r+m.start()-o]=t
out=[]
for r,sz,o in sections:
 for i in range(o,min(o+sz,len(d))-8,8):
  v=struct.unpack_from('<Q',d,i)[0]
  if v in strings:
   out.append(f'{i:x} {strings[v]} '+d[i+8:i+24].hex(' '))
Path('research/customization/reference/theme-pointer-probe.txt').write_text('\n'.join(out))
print(len(out));print('\n'.join(x for x in out if 'gmframe' in x)[:12000])
