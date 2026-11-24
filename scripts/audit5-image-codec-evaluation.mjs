// Audit 5 A5-093. Synthetic AVIF/WebP evaluation only: no clinical assets,
// image pipeline changes, or claims of visual equivalence for medical diagrams.
import sharp from 'sharp';
import {performance} from 'node:perf_hooks';
export function syntheticCodecImage(width=640,height=360,{pattern='photo'}={}){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<16||height<16||width*height>1_000_000||!['photo','line-art'].includes(pattern))throw Error('Invalid synthetic image dimensions');
 const rgb=Buffer.alloc(width*height*3);
 let seed=0x1badd00d;
 const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return seed>>>0};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const idx=(y*width+x)*3;
  if(pattern==='line-art'){
   const ink=x%70===0||y%70===0||Math.abs((x+y)%103-51)<2;
   const color=ink?15:247;rgb[idx]=color;rgb[idx+1]=color;rgb[idx+2]=color;
  }else{
   const noise=random()%37,base=Math.round(60+140*x/width+26*y/height);
   rgb[idx]=Math.min(255,base+noise);
   rgb[idx+1]=Math.min(255,Math.max(0,base-20+noise));
   rgb[idx+2]=Math.min(255,Math.max(0,base+25-noise));
  }
 }
 return {rgb,width,height};
}
export async function comparePhotoCodecs({rgb,width,height},codecOptions={webpQuality:78,avifQuality:55}){
 if(!Buffer.isBuffer(rgb)||rgb.length!==width*height*3||!Number.isSafeInteger(width)||!Number.isSafeInteger(height))throw Error('Invalid raw image fixture');
 const input={raw:{width,height,channels:3}};
 const encode=async(kind)=>{
  const start=performance.now();
  const pipeline=sharp(rgb,input);
  const bytes=kind==='webp'?await pipeline.webp({quality:codecOptions.webpQuality}).toBuffer():await pipeline.avif({quality:codecOptions.avifQuality,effort:4}).toBuffer();
  const encodeMs=performance.now()-start;
  const result=await sharp(bytes).raw().removeAlpha().toBuffer({resolveWithObject:true});
  const data=result.data;
  if(result.info.width!==width||result.info.height!==height||result.info.channels!==3)throw Error('Codec changed image dimensions');
  let difference=0;
  for(let i=0;i<rgb.length;i++)difference+=Math.abs(rgb[i]-data[i]);
  return {format:kind,bytes:bytes.length,encodeMs,meanAbsoluteChannelError:difference/rgb.length,decodedWidth:width,decodedHeight:height};
 };
 return {sourceRGBBytes:rgb.length,webp:await encode('webp'),avif:await encode('avif')};
}
