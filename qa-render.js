// Development-only visual smoke test; Playwright is not needed by the delivered app.
const {chromium}=require('C:/Users/YC-DESKTOP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
(async()=>{let browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu']}),page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.route('http://**',r=>r.abort());await page.route('https://**',r=>r.abort());
for(let [name,file] of [['SP','12004-fdcbd69ad4d62c71-SPA-random-20261027.html'],['DP','33000-3b8adde719129ba1-DPA-random-42.html']]){
 await page.goto(pathToFileURL(path.join(__dirname,'reports',file)).href);await page.waitForSelector('#stats .card');assert.equal(await page.locator('#error').innerText(),'');assert.equal(await page.locator('#stats .panel').count(),6);
 await page.screenshot({path:path.join(__dirname,'reports',`qa-${name}.png`),fullPage:true});
 let normal=await page.locator('#plot').innerHTML();await page.selectOption('#mode','mirror');await page.click('#apply');assert.notEqual(await page.locator('#plot').innerHTML(),normal);assert.equal(await page.locator('#error').innerText(),'');
 await page.selectOption('#mode','custom');await page.fill('#mapping','1111111');await page.click('#apply');assert((await page.locator('#error').innerText()).includes('映射'));
 await page.setViewportSize({width:390,height:844});await page.selectOption('#mode','normal');await page.click('#apply');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(__dirname,'reports',`qa-${name}-mobile.png`),fullPage:true});await page.setViewportSize({width:1440,height:1100});
}assert.deepEqual(errors,[]);await browser.close();console.log('PASS: SP/DP browser render, 6 graph panels, random switching, invalid mapping feedback, mobile layout, offline HTML');})().catch(e=>{console.error(e);process.exit(1);});
