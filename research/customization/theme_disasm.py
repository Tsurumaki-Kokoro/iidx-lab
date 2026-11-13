import sys,struct
sys.path[:0]=['runtime/theme-python','research/customization']
from capstone import *
from probe_theme import d,base,sections
md=Cs(CS_ARCH_X86,CS_MODE_64);md.detail=True
def readva(va,n=100):
 for r,s,o in sections:
  if r<=va-base<r+s:return d[o+va-base-r:o+va-base-r+n]
 return b''
for arg in sys.argv[1:]:
 start,end=(int(s,16) for s in arg.split(':'))
 for i in md.disasm(readva(base+start,end-start),base+start):
  extra=''
  for operand in i.operands:
   if operand.type==CS_OP_MEM and operand.mem.base==41:
    va=i.address+i.size+operand.mem.disp;b=readva(va,90);value=b.split(b'\0')[0]
    if value and all(32<=c<127 for c in value):extra+=' ; '+repr(value)
  print(f'{i.address:x} {i.mnemonic} {i.op_str}{extra}')
