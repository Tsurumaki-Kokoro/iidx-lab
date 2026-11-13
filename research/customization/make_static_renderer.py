"""Create a separate static-PNG converter from 573Renderer v1.2.0 + matching PDB.

Only the downloaded converter copy changes. Game DLLs and original EXE stay intact.
PDB-resolved functions select one frame and route still encoding to the existing PNG
writer (same first four x64 ABI arguments). Output suffixes are normalized on import.
"""
from pathlib import Path
import ctypes as c
from ctypes import wintypes as w
import hashlib,json,struct

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'runtime/573renderer/573Renderer.exe'
DEST=ROOT/'runtime/qpro-static/573Renderer.exe'
class Symbol(c.Structure):
    _fields_=[('SizeOfStruct',w.ULONG),('TypeIndex',w.ULONG),('Reserved',c.c_ulonglong*2),('Index',w.ULONG),('Size',w.ULONG),('ModBase',c.c_ulonglong),('Flags',w.ULONG),('Value',c.c_ulonglong),('Address',c.c_ulonglong),('Register',w.ULONG),('Scope',w.ULONG),('Tag',w.ULONG),('NameLen',w.ULONG),('MaxNameLen',w.ULONG),('Name',w.WCHAR*1)]
k=c.WinDLL('kernel32',use_last_error=True);d=c.WinDLL('dbghelp',use_last_error=True)
k.GetCurrentProcess.restype=w.HANDLE;handle=k.GetCurrentProcess()
d.SymInitializeW.argtypes=[w.HANDLE,w.LPCWSTR,w.BOOL];d.SymInitializeW.restype=w.BOOL
if not d.SymInitializeW(handle,str(SOURCE.parent),False):raise OSError(c.get_last_error())
d.SymSetOptions(0x2|0x10|0x200)
d.SymLoadModuleExW.argtypes=[w.HANDLE,w.HANDLE,w.LPCWSTR,w.LPCWSTR,c.c_ulonglong,w.DWORD,c.c_void_p,w.DWORD];d.SymLoadModuleExW.restype=c.c_ulonglong
base=d.SymLoadModuleExW(handle,None,str(SOURCE),None,0,0,None,0)
if not base:raise OSError(c.get_last_error())
callback_type=c.WINFUNCTYPE(w.BOOL,c.POINTER(Symbol),w.ULONG,c.c_void_p)
symbols={}
@callback_type
def callback(ptr,size,context):
    s=ptr.contents;name=c.wstring_at(c.addressof(s)+Symbol.Name.offset,s.NameLen).rstrip('\0')
    symbols[name]=(s.Address-base,s.Size);return True
d.SymEnumSymbolsW.argtypes=[w.HANDLE,c.c_ulonglong,w.LPCWSTR,callback_type,c.c_void_p]
for name in ['ProbeClipTotal','ReadBackTotal','WriteStillAvif','WritePngBGRA']:
    if not d.SymEnumSymbolsW(handle,base,'*'+name+'*',callback,None):raise OSError(c.get_last_error())
def symbol(name):
    matches=[entry for key,entry in symbols.items() if key.startswith('QproExtract::') and key.endswith('::'+name)]
    if len(matches)!=1:raise ValueError((name,matches))
    return matches[0]
image=bytearray(SOURCE.read_bytes());pe=struct.unpack_from('<I',image,60)[0];n=struct.unpack_from('<H',image,pe+6)[0];sec=pe+24+struct.unpack_from('<H',image,pe+20)[0]
sections=[struct.unpack_from('<III',image,sec+i*40+12) for i in range(n)]
def offset(rva):
    for va,size,raw in sections:
        if va<=rva<va+size:return raw+rva-va
    raise ValueError('RVA not in file')
patches=[]
for name in ['ProbeClipTotal','ReadBackTotal','WriteStillAvif']:
    rva,size=symbol(name)
    if size<6:raise ValueError('Function too small')
    replacement=b'\xb8\x01\0\0\0\xc3' if name!='WriteStillAvif' else b'\xe9'+struct.pack('<i',symbol('WritePngBGRA')[0]-rva-5)
    pos=offset(rva);patches.append({'function':name,'rva':rva,'before':image[pos:pos+len(replacement)].hex(),'after':replacement.hex()});image[pos:pos+len(replacement)]=replacement
DEST.parent.mkdir(parents=True,exist_ok=True);DEST.write_bytes(image)
(DEST.parent/'static-export-patches.json').write_text(json.dumps({'source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'output_sha256':hashlib.sha256(image).hexdigest(),'patches':patches},indent=2))
print(DEST)
