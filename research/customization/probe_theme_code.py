import sys
sys.path.insert(0,'runtime/theme-python')
from capstone import Cs,CS_ARCH_X86,CS_MODE_64
from probe_theme import d,base,sections
import struct,re
md=Cs(CS_ARCH_X86,CS_MODE_64)
targets={}
for word in (b'gmframe\0',b'bpls4\0',b'bpls5\0',b'entry_card\0',b'lane\0',b'notes_cn\0'):
 for m in re.finditer(re.escape(word),d):
  for r,sz,o in sections:
   if o<=m.start()<o+sz:targets[base+r+m.start()-o]=word
out=[]
r,sz,o=sections[0]
for i in range(o,o+sz-7):
 if d[i] not in (0x48,0x4c) or d[i+1]!=0x8d or d[i+2]&0xc7!=5:continue
 addr=base+r+i-o;to=addr+7+struct.unpack_from('<i',d,i+3)[0]
 if to not in targets:continue
 out.append(f'=== {targets[to]} {addr:x} ===')
 start=max(o,d.rfind(b'\xcc',max(o,i-650),i)+1)
 if start==o:start=max(o,i-100)
 for ins in md.disasm(d[start:i+500],base+r+start-o):out.append(f'{ins.address:x} {ins.mnemonic} {ins.op_str}')
from pathlib import Path
Path('research/customization/reference/theme-code-probe.txt').write_text('\n'.join(out))
print('\n'.join(out)[:26000])
