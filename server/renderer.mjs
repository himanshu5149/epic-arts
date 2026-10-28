import sharp from 'sharp';
import PDFDocument from 'pdfkit';
import SVGtoPDF from 'svg-to-pdfkit';
import {zip} from 'fflate';
import {mkdir,writeFile,readFile,rename,stat,readdir,unlink} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {renderArt} from './art-engine.mjs';
import {ENGINE_VERSION} from '../shared/designs.mjs';
import {HttpError} from './core.mjs';
sharp.cache({memory:24,files:0,items:32});sharp.concurrency(2);
export class WorkPool{
 constructor(limit=2,maxQueued=60){this.limit=limit;this.maxQueued=maxQueued;this.active=0;this.queue=[];}
 async run(fn){if(this.active>=this.limit){if(this.queue.length>=this.maxQueued)throw new HttpError(503,'The studio is busy. Please try again in a moment.');await new Promise(resolve=>this.queue.push(resolve));}else this.active++;try{return await fn();}finally{const next=this.queue.shift();if(next)next();else this.active--;}}
}
function pdf(svg,title,width,height,{border=false,raster}={}){return new Promise((resolve,reject)=>{
 const doc=new PDFDocument({size:[width,height],margin:0,info:{Title:title,Author:'Epic Arts',Subject:'Digital artwork - personal use'}}),chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
 try{const padding=border?22:0,aw=width-padding*2,ah=height-padding*2,scale=Math.min(aw/800,ah/1000),w=800*scale,h=1000*scale,x=(width-w)/2,y=(height-h)/2;
 if(raster)doc.image(raster,x,y,{width:w,height:h});else SVGtoPDF(doc,svg,x,y,{width:w,height:h,assumePt:true,preserveAspectRatio:'xMidYMid meet'});
 doc.end();}catch(error){reject(error);}
});}
function guide(p){return new Promise((resolve,reject)=>{const doc=new PDFDocument({size:'A4',margin:54,info:{Title:'Your Epic Arts print guide'}}),chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);doc.fillColor('#294638').fontSize(30).text('A little art.\nA beautiful beginning.').moveDown();doc.fontSize(11).text(p.name).moveDown().fillColor('#333333').text(p.kind==='generative'?'Your artwork is a native vector design made with the Epic Arts generative engine. No AI upscaling was used. The SVG and artwork PDFs scale without pixelation. PNG and JPG files are 2400 x 3000 pixels at 300 DPI: ideal for 8 x 10 inch prints.':'Your artwork is an AI-generated raster image, not a handmade original. The raster source dimensions and print recommendations are in edition.json. Enlarging it does not create additional detail.').moveDown().text('1. Choose the PDF that matches your paper: 5 x 7 inches, 8 x 10 inches, or A4. The A4 version and 5 x 7 have a border to preserve the complete composition.\n\n2. Print at 100% / actual size. Avoid fit-to-page when using the matching PDF. Matte fine-art paper around 200-300 gsm is a lovely starting point.\n\n3. Colors vary between screens, printers, inks, and paper. Make a small proof before committing to a large print.\n\n4. Your personal-use license permits prints for your own space or as a personal gift. No file sharing, resale, commercial reproduction, NFTs, or stock redistribution. See LICENSE.txt.\n\n5. Keep a backup. No physical frame, print, or shipping is included.').moveDown().fontSize(9).text('A contemporary digital edition. Heritage-inspired designs are interpretations, not historical artifacts or artisan-made originals. Your local consumer rights remain unchanged.');doc.end();});}
export function createRenderer(root){
 const cache=resolve(root,process.env.CACHE_DIR||'.cache'),previews=resolve(cache,'art-previews',ENGINE_VERSION),exports=resolve(cache,'private-exports',ENGINE_VERSION),source=resolve(root,process.env.DATA_DIR||'store','source-images');
 const previewPool=new WorkPool(3),exportPool=new WorkPool(1,12),pending=new Map();let writes=0;
 async function once(key,fn){if(pending.has(key))return pending.get(key);const promise=fn().finally(()=>pending.delete(key));pending.set(key,promise);return promise;}
 async function atomic(path,data){await mkdir(resolve(path,'..'),{recursive:true});const tmp=path+'.'+process.pid+'.tmp';await writeFile(tmp,data,{mode:0o600});await rename(tmp,path);}
 async function cleanup(){if(++writes%32)return;const dirs=[previews,exports],files=[];for(const dir of dirs){for(const name of await readdir(dir).catch(()=>[])){if(!/\.(webp|zip)$/.test(name))continue;const path=resolve(dir,name),s=await stat(path);files.push({path,bytes:s.size,time:s.mtimeMs});}}
 let bytes=files.reduce((n,x)=>n+x.bytes,0),max=Math.max(64,Number(process.env.MAX_CACHE_MB)||256)*1024*1024;for(const file of files.sort((a,b)=>a.time-b.time)){if(bytes<=max)break;await unlink(file.path).catch(()=>{});bytes-=file.bytes;}}
 async function preview(p){const path=resolve(previews,p.id+'.webp');if(existsSync(path))return path;return once('preview:'+p.id,()=>previewPool.run(async()=>{
 const input=p.kind==='ai'?await readFile(resolve(source,p.id+'.png')):Buffer.from(renderArt(p.recipe,{preview:true,title:p.name}));
 const data=await sharp(input).resize(720,900,{fit:'contain',background:p.background}).webp({quality:84,effort:3}).toBuffer();await atomic(path,data);await cleanup();return path;
 }));}
 async function archive(p){
 if(!p.kind)return resolve(root,'private/downloads',p.id+'.zip');
 const path=resolve(exports,p.id+'.zip');if(existsSync(path))return path;
 return once('export:'+p.id,()=>exportPool.run(async()=>{
 const svg=p.kind==='generative'?renderArt(p.recipe,{title:p.name}):null,original=p.kind==='ai'?await readFile(resolve(source,p.id+'.png')):null,input=svg?Buffer.from(svg):original;
 const files={},prefix=p.id+'/';
 files[prefix+'artwork-2400x3000.png']=[await sharp(input).resize(2400,3000,{fit:'contain',background:p.background}).withMetadata({density:300}).png({compressionLevel:6}).toBuffer(),{level:0}];
 files[prefix+'artwork-2400x3000.jpg']=[await sharp(input).resize(2400,3000,{fit:'contain',background:p.background}).flatten({background:p.background}).withMetadata({density:300}).jpeg({quality:96,chromaSubsampling:'4:4:4'}).toBuffer(),{level:0}];
 if(svg)files[prefix+'artwork-scalable.svg']=Buffer.from(svg);else files[prefix+'original-source.png']=[original,{level:0}];
 for(const [name,w,h,border]of[['5x7-inch',360,504,true],['8x10-inch',576,720,false],['A4',595.28,841.89,true]])files[prefix+'print-'+name+'.pdf']=await pdf(svg,p.name,w,h,{border,raster:original});
 files[prefix+'PRINTING-GUIDE.pdf']=await guide(p);
 files[prefix+'edition.json']=Buffer.from(JSON.stringify({name:p.name,id:p.id,kind:p.kind,engineVersion:p.kind==='generative'?ENGINE_VERSION:undefined,recipe:p.recipe||null,provider:p.kind==='ai'?'OpenAI image generation':undefined,sourcePixels:original?await sharp(original).metadata().then(m=>[m.width,m.height]):'Native vector',rasterExportPixels:[2400,3000],license:'Personal use only',digitalOnly:true,created:p.created},null,2));
 files[prefix+'LICENSE.txt']=Buffer.from('EPIC ARTS - PERSONAL-USE LICENSE\n\nYou may print this digital edition for your personal space or as a personal, noncommercial gift. You may keep personal backup copies. You may not share, sell, sublicense, redistribute, mint as an NFT, or use the files for commercial reproduction or stock assets. No exclusive rights or guarantee of copyright protection is granted. Algorithmic designs and AI-generated outputs may have limited copyright protection in some jurisdictions. No physical product is included. Your mandatory consumer rights remain unchanged.\n\n'+p.name+'\nEdition: '+p.id+'\n');
 const data=await new Promise((resolve,reject)=>zip(files,{level:6},(e,d)=>e?reject(e):resolve(d)));await atomic(path,data);await cleanup();return path;
 }));
 }
 return {preview,archive,source,health:()=>({previewWorkers:previewPool.active,exportWorkers:exportPool.active,queuedExports:exportPool.queue.length})};
}
