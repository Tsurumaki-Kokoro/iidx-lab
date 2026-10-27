from pathlib import Path
r=Path(__file__).resolve().parent
(r/'frontend/src').mkdir(parents=True,exist_ok=True)
p=r/'lab.js';s=p.read_text(encoding='utf-8');a=s.index('// Stable application-specific');b=s.index('function escape(',a)
(r/'frontend/src/core.mjs').write_text(s[a:b]+'\nexport {prng,permutation,transform,analyze};\n',encoding='utf-8')
s=s[:a]+"const {prng,permutation,transform,analyze}=require('./frontend/src/core.mjs');\n"+s[b:];p.write_text(s,encoding='utf-8')
p=r/'render.js';s=p.read_text(encoding='utf-8').replace('module.exports={svg,measureLayout,dashboard,reportHtml};','export {svg,measureLayout,dashboard,reportHtml};')
(r/'frontend/src/render.mjs').write_text(s,encoding='utf-8')
p.write_text("// CLI adapter: browser and CLI share the same rendering code.\nmodule.exports=require('./frontend/src/render.mjs');\n",encoding='utf-8')
