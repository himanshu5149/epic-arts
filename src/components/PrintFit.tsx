import { useState } from 'react';
import { Download, Ruler } from 'lucide-react';
import { PRINT_SIZES, printAssessment, printSize } from '../../shared/printing.mjs';
const REPRESENTATIVE = {
  vector: {id:'example-vector', kind:'generative', recipe:{version:'1.0.0'}},
  original: {id:'tree-of-life'},
};
export default function PrintFit(){
  const [sizeId,setSizeId]=useState('a4');
  const [kind,setKind]=useState<'vector'|'original'>('vector');
  const a = printAssessment(REPRESENTATIVE[kind] as never, sizeId, 'contain');
  const size = printSize(sizeId);
  const borderMm = (Math.max(a.fit.horizontalBorderMm,a.fit.verticalBorderMm)/10).toFixed(1);
  const guidance = a.nativeVector
    ? 'Native-vector editions scale beautifully: the SVG and artwork PDFs redraw cleanly at any of these sizes. The exported PNG and JPG are 2400 × 3000 px, happily crisp well past A4.'
    : 'The eight-piece original edit is drawn from a 1122 × 1402 px source and upscaled. It is thoughtfully best at 8 × 10 in or smaller; asking more of it is wishful, not optical.';
  return <section className="print-fit section-shell">
    <div className="print-fit-heading"><div><div className="eyebrow"><span/>A LITTLE CERTAINTY BEFORE INK</div><h2>Will it print <em>beautifully?</em></h2><p>Choose a size and a kind of artwork. We’ll show the exact arithmetic behind the recommendation — no quietly invented DPI numbers.</p></div>
      <a href="/epic-arts-test-print.pdf" download className="button button-outline"><Download size={15}/> Free printer test sheet</a></div>
    <div className="print-fit-body">
      <div className="print-fit-controls">
        <span className="mini-label">01 · THE PAPER YOU HAVE IN MIND</span>
        <div className="print-size-grid">{PRINT_SIZES.map(s=><button key={s.id} className={sizeId===s.id?'selected':''} aria-pressed={sizeId===s.id} onClick={()=>setSizeId(s.id)}><strong>{s.label}</strong><small>{s.included?'Included with every edition':'Plan ahead'}</small></button>)}</div>
        <span className="mini-label">02 · THE KIND OF EDITION</span>
        <div className="wall-segment">
          <button className={kind==='vector'?'selected':''} aria-pressed={kind==='vector'} onClick={()=>setKind('vector')}>New generative edition</button>
          <button className={kind==='original'?'selected':''} aria-pressed={kind==='original'} onClick={()=>setKind('original')}>Original eight-piece edit</button>
        </div>
      </div>
      <div className="print-fit-card">
        <div className="print-fit-figure" aria-hidden="true">
          <div className="print-fit-paper" style={{aspectRatio:`${size.widthCm} / ${size.heightCm}`}}>
            <div className="print-fit-art" style={{width:`${(a.fit.artworkWidthCm/size.widthCm)*100}%`,height:`${(a.fit.artworkHeightCm/size.heightCm)*100}%`}}/>
          </div>
        </div>
        <div className="print-fit-copy">
          <span className="mini-label"><Ruler size={11}/> {size.label}</span>
          <h3>{a.includedPdf?'Ready when you are.':'Not in the box — but honest about it.'}</h3>
          <p>{guidance}</p>
          <ul>
            <li>Artwork sits inside a border of about {borderMm} cm on the longer side.</li>
            <li>A native 300 DPI print would ask for {a.requiredPixels.width} × {a.requiredPixels.height} px.</li>
            {a.nativeVector?<li>Included: PDFs for 5×7 in, 8×10 in and A4, plus a native SVG.</li>:a.sourcePpi!==null?<li>Source detail at this size resolves near {a.sourcePpi} effective DPI.</li>:null}
          </ul>
          <p className="small-text muted">Screens flatter; paper tells the truth. Try the free test sheet before committing your good paper.</p>
        </div>
      </div>
    </div>
  </section>;
}
