// Original Epic Arts sizing arithmetic. This does not create additional purchased files.
export const PRINT_SIZES = [
  {id:'5x7',label:'5 × 7 in',widthCm:12.7,heightCm:17.78,included:true},
  {id:'8x10',label:'8 × 10 in',widthCm:20.32,heightCm:25.4,included:true},
  {id:'a4',label:'A4 · 21 × 29.7 cm',widthCm:21,heightCm:29.7,included:true},
  {id:'11x14',label:'11 × 14 in',widthCm:27.94,heightCm:35.56,included:false},
  {id:'16x20',label:'16 × 20 in',widthCm:40.64,heightCm:50.8,included:false},
  {id:'a3',label:'A3 · 29.7 × 42 cm',widthCm:29.7,heightCm:42,included:false},
  {id:'24x36',label:'24 × 36 in',widthCm:60.96,heightCm:91.44,included:false},
];
export function printSize(id){return PRINT_SIZES.find(s=>s.id===id)||PRINT_SIZES[1];}
export function fitArtwork(widthCm,heightCm,mode='contain'){
  if(!Number.isFinite(widthCm)||!Number.isFinite(heightCm)||widthCm<=0||heightCm<=0||widthCm>200||heightCm>200)throw new RangeError('Choose a supported print size.');
  const fit=mode==='cover'?'cover':'contain',scale=(fit==='cover'?Math.max:Math.min)(widthCm/4,heightCm/5);
  const artworkWidthCm=4*scale,artworkHeightCm=5*scale;
  return {mode:fit,artworkWidthCm,artworkHeightCm,horizontalBorderMm:Math.max(0,(widthCm-artworkWidthCm)*5),verticalBorderMm:Math.max(0,(heightCm-artworkHeightCm)*5),cropPercent:fit==='cover'?Math.max(0,(1-widthCm*heightCm/(artworkWidthCm*artworkHeightCm))*100):0};
}
export function printAssessment(product,sizeId='8x10',mode='contain'){
  const size=printSize(sizeId),fit=fitArtwork(size.widthCm,size.heightCm,mode);
  const nativeVector=product?.kind==='generative'&&product?.recipe?.version==='1.0.0';
  // The six original artworks share a documented 1122 x 1402 source. Unknown raster
  // editions are deliberately not assigned invented source dimensions.
  const legacyIds=new Set(['tree-of-life','peacock-pair','lotus-pond','warli-dance','surya','sacred-bloom','earth-sky-pair','heritage-collection']);
  const legacy=!!product&&!product.kind&&legacyIds.has(product.id);
  const inchesW=fit.artworkWidthCm/2.54,inchesH=fit.artworkHeightCm/2.54;
  const exportedPpi=Math.floor(Math.min(2400/inchesW,3000/inchesH));
  const sourcePpi=legacy?Math.floor(Math.min(1122/inchesW,1402/inchesH)):null;
  return {size,fit,nativeVector,legacy,exportedPpi,sourcePpi,quality:nativeVector?'vector':sourcePpi===null?'unknown':sourcePpi>=250?'detailed':sourcePpi>=150?'moderate':'source-limited',requiredPixels:{width:Math.round(size.widthCm/2.54*300),height:Math.round(size.heightCm/2.54*300)},includedPdf:size.included};
}
