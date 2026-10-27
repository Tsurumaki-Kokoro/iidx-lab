import {prng,permutation,transform,analyze} from './core.mjs';
import {svg,measureLayout,dashboard,reportHtml} from './render.mjs';
import {browseSongs} from './browse.mjs';
export {browseSongs,versionLabel,titleFolder,getOmniInfo,isOmniSource} from './browse.mjs';
export {difficultyPresentation} from './difficulty.mjs';
export {transform,analyze,measureLayout};
export const renderChartSVG=svg;
export const renderStatsHTML=dashboard;
export {svgToPNG} from './render.mjs';
export function createReportHTML(bundle,binMs=1000,options={}){return reportHtml(bundle,binMs,{prng,permutation,transform,analyze},options);}

/** A static dataset client. Only fetches selected charts, no service API required. */
export function createDataset(baseURL,{fetch:fetcher=globalThis.fetch}={}){
  const root=new URL(String(baseURL).replace(/\/?$/,'/'),import.meta.url);
  let catalogPromise;
  const cache=new Map();
  async function read(url){const response=await fetcher(url);if(!response.ok)throw Error(`数据读取失败 (${response.status}): ${url}`);return response;}
  async function catalog(){if(!catalogPromise)catalogPromise=read(new URL('catalog.json',root)).then(r=>r.json()).then(d=>d.songs).catch(e=>{catalogPromise=undefined;throw e;});return catalogPromise;}
  async function search(query=''){let q=String(query).toLowerCase();return(await catalog()).filter(s=>[s.id,s.key,s.metadata.title,s.metadata.artist].join(' ').toLowerCase().includes(q));}
  async function loadSong(key){
    const songs=await catalog(),matches=songs.filter(s=>s.key===key||s.id===String(key).padStart(5,'0'));
    if(matches.length!==1)throw Error(matches.length?'歌曲有多个内容版本，请传完整 key':'未找到歌曲：'+key);
    const song=matches[0];if(!cache.has(song.key)){
      const pending=(async()=>{let response=await read(new URL(song.file,root)),bytes=new Uint8Array(await response.arrayBuffer()),stream=new Blob([bytes]).stream();
        if(bytes[0]===0x1f&&bytes[1]===0x8b){if(!globalThis.DecompressionStream)throw Error('浏览器不支持 gzip 解压，请使用新版 Chrome、Edge、Firefox 或 Safari');stream=stream.pipeThrough(new DecompressionStream('gzip'));}
        return {song,metadata:song.metadata,data:await new Response(stream).json()};})();
      cache.set(song.key,pending);pending.catch(()=>cache.delete(song.key));if(cache.size>12)cache.delete(cache.keys().next().value);
    }return cache.get(song.key);
  }
  async function loadChart(key,difficulty){let {song,metadata,data}=await loadSong(key),chart=data.charts.find(c=>c.difficulty===difficulty);if(!chart)throw Error('没有这个难度：'+difficulty);return {schema:1,time_unit:'millisecond',song,metadata,chart};}
  return {catalog,search,browse:async options=>browseSongs(await catalog(),options),loadSong,loadChart,clearCache:()=>cache.clear()};
}
