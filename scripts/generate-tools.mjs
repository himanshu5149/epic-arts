// Free, public one-page printer test sheet. Vector-only, deterministic, no external assets.
// This is a diagnostic chart, not artwork or a closeness match on any printer's own test page.
import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { palettes } from '../shared/designs.mjs';

const out = resolve('public/epic-arts-test-print.pdf');
mkdirSync(resolve('public'),{recursive:true});
const doc = new PDFDocument({size:'A4',margin:40,info:{Title:'Epic Arts — Printer & paper test sheet',Author:'Epic Arts',Subject:'A free one-page test print before you print your art',Creator:'Epic Arts design engine'}});
doc.pipe(createWriteStream(out));
const W = 595.28, M = 40, CW = W - 2*M;
// Heritage-inspired double rules
doc.rect(24,24,W-48,793).lineWidth(1.1).stroke('#293e32');
doc.rect(30,30,W-60,781).lineWidth(0.35).stroke('#b45d3e');
// Header
doc.font('Helvetica-Bold').fontSize(8).fillColor('#b45d3e').text('E P I C   A R T S',M,48,{characterSpacing:2});
doc.font('Helvetica').fontSize(24).fillColor('#293e32').text('Printer & paper test sheet',M,62);
doc.fontSize(8.3).fillColor('#5d6a51').text('Print at 100% (“actual size”) on the paper you plan to use. Check the rulers measure true centimetres, the fine lines stay separate, and colors look close between warm and cool paper.',M,96,{width:CW});
// 1 · True-size rulers (19 cm across, 5 cm tall)
let y = 136;
doc.font('Helvetica-Bold').fontSize(7).fillColor('#293e32').text('01  RULERS — SO “ACTUAL SIZE” IS ACTUALLY ACTUAL SIZE',M,y);
y += 13;
const cm = 28.3465;
doc.lineWidth(0.6).strokeColor('#293e32');
for(let i=0;i<=38;i++){const mm=i*0.5*cm;const x=M+mm;if(i%2===0){doc.moveTo(x,y).lineTo(x,y+(i%10===0?10:6)).stroke();if(i%10===0&&i>0)doc.fontSize(6).fillColor('#293e32').text(String(i/20),x+2,y+2);}else doc.moveTo(x,y).lineTo(x,y+3.5).stroke();}
doc.moveTo(M,y).lineTo(M+19*cm,y).stroke();
// ruler box 10 x 10 cm
const sqY = y+22;
doc.rect(M,sqY,10*cm,5*cm).lineWidth(0.8).stroke('#293e32');
doc.fontSize(6.5).fillColor('#5d6a51').text('This frame is 10 × 5 cm. Measure it with a ruler.',M+6,sqY+6);
// 2 · Palette swatches
let y2 = sqY + 5*cm + 26;
doc.font('Helvetica-Bold').fontSize(7).fillColor('#293e32').text('02  PALETTES — CHECK WARM VS. COOL PAPER',M,y2);y2+=13;
const swW=(CW-7*8)/8;
palettes.forEach((p,i)=>{const x=M+i*(swW+8);p.colors.slice(0,5).forEach((c,j)=>{doc.rect(x+j*(swW/5),y2,swW/5,34).fill(c);});doc.rect(x,y2,swW,34).lineWidth(0.3).strokeColor('#293e32').stroke();doc.fontSize(5.4).fillColor('#5d6a51').text(p.name,x,y2+38,{width:swW});});
y2+=56;
// 3 · Line ladders
doc.font('Helvetica-Bold').fontSize(7).fillColor('#293e32').text('03  LINE WEIGHTS — FOLK-ART LINES STAY ALIVE',M,y2);y2+=13;
const weights=[0.25,0.5,0.75,1,1.5,2,3];
weights.forEach((w,i)=>{const x=M+i*(swW+8);doc.fontSize(5.4).fillColor('#5d6a51').text(w+' pt',x,y2);doc.moveTo(x,y2+11).lineTo(x+swW,y2+11).lineWidth(w).strokeColor('#293e32').stroke();});
y2+=30;
// 4 · Fine pattern band (hatching + diagonals)
doc.font('Helvetica-Bold').fontSize(7).fillColor('#293e32').text('04  FINE PATTERN — LINES SHOULD STAY SEPARATE',M,y2);y2+=13;
doc.save();doc.rect(M,y2,CW,52).clip();
for(let i=0;i<190;i++){const x=M+i*3;doc.moveTo(x,y2).lineTo(x+22,y2+52).lineWidth(0.35).strokeColor('#293e32').stroke();}
doc.restore();doc.rect(M,y2,CW,52).lineWidth(0.5).stroke('#293e32');
y2+=68;
// 5 · Gradient ramp + circles
doc.font('Helvetica-Bold').fontSize(7).fillColor('#293e32').text('05  TONES — A GENTLE RAMP, NO BANDING',M,y2);y2+=13;
const steps=14,bw=(CW/2-30)/steps;
for(let i=0;i<steps;i++){const g=Math.round(255-(i/(steps-1))*195);doc.rect(M+i*bw,y2,bw,26).fill(`rgb(${g},${g},${Math.max(0,g-8)})`);}
doc.rect(M,y2,bw*steps,26).lineWidth(0.5).strokeColor('#293e32').stroke();
for(let i=5;i>=1;i--){doc.circle(M+bw*steps+58,y2+13,i*4.2).lineWidth(0.5).strokeColor('#293e32').stroke();}
doc.circle(M+bw*steps+58,y2+13,1.4).fill('#b45d3e');
y2+=44;
// 6 · Checker + registration cross
doc.font('Helvetica-Bold').fontSize(7).fillColor('#293e32').text('06  ALIGNMENT — EVEN SQUARES, STEADY CROSS',M,y2);y2+=13;
for(let r=0;r<3;r++)for(let c=0;c<14;c++){if((r+c)%2===0)doc.rect(M+c*10,y2+r*10,10,10).fill('#293e32');}
doc.rect(M,y2,140,30).lineWidth(0.5).strokeColor('#5d6a51').stroke();
const cx=M+bw*steps+58,cy=y2+15;doc.moveTo(cx-14,cy).lineTo(cx+14,cy).moveTo(cx,cy-14).lineTo(cx,cy+14).circle(cx,cy,8).lineWidth(0.7).strokeColor('#b45d3e').stroke();
// Footer
const fy=768;doc.moveTo(M,fy).lineTo(W-M,fy).lineWidth(.5).strokeColor('#c9cab9').stroke();
doc.fontSize(6.8).fillColor('#5d6a51').text(['A free diagnostic sheet from Epic Arts. Not artwork · not for resale.','Every Epic Arts digital edition includes 5 × 7 in, 8 × 10 in, and A4 print-ready PDFs with their own neat border.','Screens flatter; paper tells the truth. A matte fine-art paper around 200–300 gsm is a kind place to start.'],M,fy+7,{width:CW,lineGap:2.5});
doc.end();
console.log('Printer test sheet written:',out);
