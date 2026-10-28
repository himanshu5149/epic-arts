import {styles,palettes,ENGINE_VERSION} from '../shared/designs.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function rng(seed){let a=seed>>>0;return()=>{a+=0x6d2b79f5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const f=n=>Number(n.toFixed(2));
export function renderArt(recipe,{preview=false,title='Epic Arts generative edition'}={}){
 if(recipe.version&&recipe.version!==ENGINE_VERSION)throw new Error('This edition requires its original versioned renderer.');
 const style=styles.find(s=>s.id===recipe.style),pal=palettes.find(p=>p.id===recipe.palette);
 if(!style||!pal||!Number.isInteger(recipe.seed)||recipe.seed<0||recipe.seed>2147483647)throw new Error('Invalid design recipe');
 const rand=rng(recipe.seed),r=(a,b)=>a+(b-a)*rand(),pick=a=>a[Math.floor(rand()*a.length)],P=pal.colors,[paper,ink,a,b,c]=P,detail=Math.max(1,Math.min(5,recipe.detail||3));
 let out=[];const push=x=>out.push(x),path=(d,fill='none',stroke=ink,sw=1.6,extra='')=>push(`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`),circle=(x,y,rr,fill='none',stroke=ink,sw=1.5)=>push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`),line=(x,y,x2,y2,col=ink,sw=1.5)=>path(`M${f(x)} ${f(y)}L${f(x2)} ${f(y2)}`,'none',col,sw),rect=(x,y,w,h,fill,stroke='none',sw=1)=>push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
 const group=(transform,fn,extra='')=>{push(`<g transform="${transform}" ${extra}>`);fn();push('</g>');};
 const leaf=(x,y,size,angle=0,fill=c)=>group(`translate(${f(x)} ${f(y)}) rotate(${f(angle)})`,()=>{path(`M0 0 Q${-size*.65} ${-size*.5} 0 ${-size} Q${size*.65} ${-size*.5} 0 0Z`,fill,ink,1.5);line(0,-2,0,-size+3,ink,.9);if(detail>2)for(let k=1;k<5;k++){const y=-size*k/6;line(0,y,-size*.19,y-size*.15,ink,.65);line(0,y,size*.19,y-size*.15,ink,.65);}});
 const flower=(x,y,size=30,petals=8,col=a)=>group(`translate(${f(x)} ${f(y)}) rotate(${f(r(0,30))})`,()=>{for(let k=0;k<petals;k++)group(`rotate(${k*360/petals})`,()=>path(`M0 -3 C${-size*.75} ${-size*.45},${-size*.5} ${-size*1.2},0 ${-size} C${size*.5} ${-size*1.2},${size*.75} ${-size*.45},0 -3Z`,col,ink,1.3));circle(0,0,size*.24,b,ink,1.5);circle(0,0,size*.09,ink,ink,.5);});
 const sun=(x,y,size)=>{for(let k=0;k<24;k++){const t=k*Math.PI/12;line(x+Math.cos(t)*size*1.2,y+Math.sin(t)*size*1.2,x+Math.cos(t)*size*1.5,y+Math.sin(t)*size*1.5,b,1.6);}circle(x,y,size,b,ink,1.4);circle(x,y,size*.78,'none',ink,.8);};
 const border=()=>{rect(30,30,740,940,'none',ink,2);rect(38,38,724,924,'none',ink,.8);for(let y=52;y<950;y+=22){leaf(48,y,8,90,a);leaf(752,y,8,-90,a);}for(let x=60;x<750;x+=22){leaf(x,48,8,180,a);leaf(x,952,8,0,a);}};
 const petalRing=(radius,size,count,col,rotation=0)=>{for(let k=0;k<count;k++)group(`translate(400 500) rotate(${k*360/count+rotation}) translate(0 ${-radius})`,()=>path(`M0 0 Q${-size} ${-size} 0 ${-size*2} Q${size} ${-size} 0 0Z`,col,ink,1.5));};
 const branch=(x,y,angle,length,depth)=>group(`translate(${f(x)} ${f(y)}) rotate(${f(angle)})`,()=>{path(`M0 0 Q${-length*.1} ${-length*.5} 0 ${-length}`,'none',ink,Math.max(1.4,depth*2.6));if(depth>0){const spread=r(23,39);branch(0,-length,-spread,length*.70,depth-1);branch(0,-length,spread,length*.70,depth-1);if(depth>2)branch(0,-length,-3,length*.60,depth-1);}else{leaf(0,-length,length*.67,r(-25,25),pick([a,b,c]));if(rand()>.3)flower(0,-length,13,6,pick([a,b]));}if(depth<3){leaf(-1,-length*.45,length*.36,-52,c);leaf(1,-length*.65,length*.36,52,a);}});
 const lotus=(x,y,s)=>group(`translate(${f(x)} ${f(y)}) scale(${s})`,()=>{for(let k=-3;k<=3;k++)group(`rotate(${k*22})`,()=>path('M0 10 C-80 -30,-58 -110,0 -145 C58 -110,80 -30,0 10Z',k%2?a:b,ink,2));path('M-170 0 Q0 130 170 0 Q0 35 -170 0Z',c,ink,2);line(-115,15,115,15,ink,1.2);});
 const bird=(x,y,s,flip=1)=>group(`translate(${x} ${y}) scale(${s*flip} ${s})`,()=>{for(let k=0;k<17+detail*3;k++){const t=(k/(16+detail*3))*Math.PI*1.65-Math.PI*.82,xx=Math.sin(t)*160,yy=-Math.cos(t)*200;path(`M0 70 Q${f(xx*1.3)} ${f(yy*.35)} ${f(xx)} ${f(yy)}`,'none',ink,2);group(`translate(${f(xx)} ${f(yy)}) rotate(${f(t*180/Math.PI)})`,()=>{path('M0 32 Q-28 0 0 -43 Q28 0 0 32Z',pick([a,c]),ink,2);circle(0,-4,11,b,ink,1);circle(0,-5,5,ink,'none');});}path('M-20 125 C-110 75,-70 -5,-15 24 C30 55,64 25,44 -34 C35 -76,94 -87,111 -51 C125 -20,86 -7,81 31 C77 110,30 145,-20 125Z',a,ink,2.5);path('M-36 103 Q-70 32 -5 50 Q45 69 -36 103Z',c,ink,1.5);for(let k=0;k<5;k++)path(`M${-30+k*8} 97 Q-55 50 ${-3+k*6} 58`,'none',ink,.8);circle(91,-49,4,ink,'none');path('M110 -48L134 -37L108 -34Z',b,ink,1.2);for(let k=0;k<4;k++){line(78,-68,70+k*9,-94,ink,1.5);circle(70+k*9,-94,4,b,ink,.8);}line(-2,123,-8,165);line(20,122,30,165);line(-8,165,-28,169);line(30,165,50,168);});
 const stem=(x,y,height,col=a)=>{const bend=r(-60,60);path(`M${x} ${y} Q${x+bend} ${y-height*.5} ${x+bend*.5} ${y-height}`,'none',ink,2);for(let j=1;j<2+detail;j++)leaf(x+bend*.28,y-height*j/(3+detail),r(20,37),j%2?50:-50,pick([c,b]));flower(x+bend*.5,y-height,r(17,28),pick([5,7,9]),col);};
 const specks=()=>{for(let k=0;k<140+detail*90;k++)circle(r(12,788),r(12,988),r(.3,1.1),ink,'none',0);};
 switch(style.motif){
 case 'tree': border();sun(400,170,38);branch(400,845,r(-4,4),170,detail>3?5:detail<2?3:4);path('M175 861 Q400 815 625 861','none',ink,3);for(let k=0;k<10;k++)leaf(200+k*44,880,27,k%2?60:-60,c);for(const x of [122,680]){flower(x,215,35,8,a);flower(x,775,27,8,a);}break;
 case 'peacock': border();sun(400,220,40);bird(265,650,.85);bird(535,650,.85,-1);for(let i=0;i<5;i++)flower(150+i*125,855,28,8,i%2?a:c);path('M115 825 Q400 790 685 825','none',ink,2);for(let k=0;k<9;k++)flower(120+k*70,125,14,6,b);break;
 case 'fish':border();for(let i=0;i<5;i++)for(let j=0;j<3;j++){const x=170+j*230+r(-18,18),y=160+i*165+r(-10,10);group(`translate(${f(x)} ${f(y)}) rotate(${(i+j)%2?25:-25}) scale(${r(.8,1.15)})`,()=>{path('M-80 0 Q0 -74 80 0 Q0 74 -80 0Z',pick([a,b,c]),ink,2);path('M80 0L115 -38L109 38Z',b,ink,2);circle(-47,-3,7,paper,ink,1.5);circle(-49,-3,3,ink,'none');path('M-20 -29 Q-45 0 -20 29','none',ink,1.5);for(let m=0;m<5;m++)for(let n=0;n<3;n++)path(`M${m*15-4} ${n*13-18}q-10 8 0 14`,'none',ink,.8);});}break;
 case 'lotus':border();for(let y=730;y<900;y+=18)path(`M90 ${y} Q220 ${y-18} 390 ${y}T710 ${y}`,'none',c,.9);for(let k=0;k<5;k++){const x=150+k*125,yy=650-r(0,180);line(x,845,x,yy,ink,2);lotus(x,yy,r(.5,.75));}sun(400,190,48);for(let k=0;k<12;k++)circle(r(100,700),r(270,400),r(2,4),b,'none');break;
 case 'palace':border();path('M120 870V345Q120 225 300 160L400 95L500 160Q680 225 680 345V870Z',pal.id==='midnight'?ink:paper,ink,3);path('M142 865V345Q140 245 310 184L400 120L490 184Q660 245 658 345V865','none',a,3);for(let k=0;k<7;k++)stem(195+k*70,850,r(240,490),k%2?a:b);for(let y=330;y<820;y+=90){flower(100,y,15,6,a);flower(700,y,15,6,a);}break;
 case 'warli':{rect(0,0,800,1000,a);const fg=paper;for(let k=0;k<4;k++)rect(30+k*7,30+k*7,740-k*14,940-k*14,'none',fg,k===0?2:.7);sun(r(550,640),r(150,215),r(30,43));for(let ring=0;ring<(detail>1?3:2);ring++){const rr=125+ring*88+r(-8,8),count=10+ring*8+Math.floor(r(0,5))+detail;const phase=r(-8,8);circle(400,510,rr+22,'none',fg,.7);for(let i=0;i<count;i++){const t=i/count*360+phase;group(`translate(400 510) rotate(${t}) translate(0 ${-rr})`,()=>{circle(0,-23,8,fg,'none');path('M0 -10L-16 12L16 12ZM0 36L-16 12L16 12Z',fg,fg,1);line(-12,4,-30,-8,fg,2);line(12,4,30,-8,fg,2);line(-4,31,-12,51,fg,2);line(4,31,14,48,fg,2);});}}for(let x=135;x<700;x+=100){path(`M${x-28} 890V837L${x} 805L${x+28} 837V890Z`,'none',fg,2);path(`M${x-40} 841L${x} 796L${x+40} 841`,'none',fg,2);}break;}
 case 'mandala':border();{const shift=r(0,18);petalRing(240,80,24,c,shift);circle(400,500,285,'none',ink,2);petalRing(175,55,20,a,shift+8);circle(400,500,210,'none',ink,1.5);petalRing(112,48,16,b,shift);petalRing(48,43,12,c,shift+12);circle(400,500,48,a,ink,2);flower(400,500,30,10,b);for(let k=0;k<72;k++){const t=k*Math.PI/36;circle(400+Math.cos(t)*310,500+Math.sin(t)*310,3,b,ink,.6);}for(const [x,y]of[[120,130],[680,130],[120,870],[680,870]])flower(x,y,35,8,a);}break;
 case 'orbit':{rect(0,0,800,1000,paper);const cx=r(350,450),cy=r(450,560);for(let k=0;k<4+detail;k++)push(`<ellipse cx="${cx}" cy="${cy}" rx="${80+k*35}" ry="${180+k*30}" transform="rotate(${k*22} ${cx} ${cy})" fill="none" stroke="${ink}" stroke-width="${k%2?1:1.8}"/>`);sun(cx,cy,48);for(let k=0;k<18;k++){const t=r(0,Math.PI*2),rr=r(120,320);circle(cx+Math.cos(t)*rr,cy+Math.sin(t)*rr*1.1,r(3,15),pick([a,b,c]),ink,1);}for(let k=0;k<80;k++){const x=r(80,720),y=r(80,920);if(Math.abs(x-cx)+Math.abs(y-cy)>380){line(x-3,y,x+3,y,ink,.8);line(x,y-3,x,y+3,ink,.8);}}rect(45,45,710,910,'none',ink,.8);break;}
 case 'lattice':{border();const rotation=r(0,45),scale=r(.78,.93),petals=4+detail*2;for(let y=135;y<900;y+=120)for(let x=130;x<720;x+=120){group(`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`,()=>{rect(-48,-48,96,96,'none',ink,1.6);for(let k=0;k<petals;k++)group(`rotate(${k*360/petals})`,()=>path('M0 0L-16 -35L0 -60L16 -35Z',k%2?a:c,ink,1.1));circle(0,0,13,b,ink,1);});}break;}
 case 'arches':{const arch=(x,y,w,h,col)=>path(`M${x} ${y+h}V${y+w/2}a${w/2} ${w/2} 0 0 1 ${w} 0V${y+h}Z`,col,'none');sun(592,210,58);const n=3+recipe.seed%3;for(let k=0;k<n;k++){const x=100+k*(500/n),y=300+r(-70,100),w=520/n;arch(x,y,w,815-y,pick([a,b,c]));for(let j=1;j<4+detail;j++){const xx=x+j*4,ww=w-j*8;if(ww>15)path(`M${xx} 820V${y+ww/2+j*5}a${ww/2} ${ww/2} 0 0 1 ${ww} 0V820`,'none',paper,.9);}}rect(80,815,640,4,ink);for(let k=0;k<9;k++)path(`M90 ${855+k*7}Q400 ${825+k*10} 710 ${855+k*7}`,'none',c,.7);break;}
 case 'landscape':{circle(r(260,550),250,r(65,110),b,'none');for(let k=0;k<7;k++){let d=`M0 1000V${400+k*74}`;for(let x=0;x<880;x+=100)d+=`Q${x+50} ${f(300+k*90+r(-50,100))} ${x+100} ${f(400+k*74+r(-50,50))}`;path(d+'V1000Z',P[(k%4)+1],'none');}for(let k=0;k<14+detail*8;k++){const y=620+k*9;path(`M70 ${y}Q400 ${y+r(-80,80)} 730 ${y}`,'none',paper,.7);}break;}
 case 'deco':{rect(0,0,800,1000,pal.id==='midnight'?paper:ink);const gold=pal.id==='midnight'?ink:b,unit=r(180,220),height=r(153,174),radius=r(185,215);for(let row=0;row<6;row++)for(let col=0;col<5;col++){const x=col*unit+(row%2?unit/2:0),y=radius+row*height;for(let k=-(3+detail);k<=3+detail;k++){const t=k*(.68/(3+detail)),ex=x+Math.sin(t)*radius,ey=y-Math.cos(t)*radius;line(x,y,ex,ey,gold,1.8);}path(`M${x-120} ${y-160}Q${x} ${y-240} ${x+120} ${y-160}`,'none',gold,2.5);circle(x,y,6,gold,'none');}for(let k=0;k<3;k++)rect(25+k*9,25+k*9,750-k*18,950-k*18,'none',gold,k===0?2:.8);break;}
 case 'abstract':{const cols=3,rows=4,size=205,ox=92,oy=90;for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const x=ox+col*size,y=oy+row*size,colr=pick([a,b,c,ink]),m=Math.floor(r(0,5));group(`translate(${x} ${y})`,()=>{if(m===0){for(let k=0;k<6;k++)rect(k*size/6,0,size/12,size,colr);}else if(m===1){circle(size/2,size/2,size*.45,colr,'none');circle(size/2,size/2,size*.22,paper,'none');}else if(m===2){path(`M0 ${size}V${size/2}a${size/2} ${size/2} 0 0 1 ${size} 0V${size}Z`,colr,'none');for(let j=1;j<6;j++)path(`M${j*15} ${size}V${size/2}a${size/2-j*15} ${size/2-j*15} 0 0 1 ${size-j*30} 0V${size}`,'none',paper,4);}else if(m===3){for(let j=0;j<4;j++)for(let k=0;k<4;k++)if((j+k)%2===0)rect(j*size/4,k*size/4,size/4,size/4,colr);}else{path(`M0 0Q${size} 0 ${size} ${size}Q0 ${size} 0 0Z`,colr,'none');}});}break;}
 case 'meadow':{rect(60,60,680,880,'none',ink,.7);for(let k=0;k<9;k++){const x=130+(k%3)*260,y=330+Math.floor(k/3)*280;stem(x,y,r(150,200),pick([a,b,c]));line(x-38,y+20,x+40,y+20,ink,.6);for(let j=0;j<3;j++)line(x-22+j*15,y+32,x-14+j*15,y+32,ink,.6);}break;}
 case 'blockprint':border();for(let row=0;row<6;row++)for(let col=0;col<4;col++){const x=130+col*180+(row%2?12:-12),y=125+row*145;flower(x,y,37,6,pick([a,c]));leaf(x-30,y+45,29,-50,c);leaf(x+30,y+45,29,50,c);path(`M${x} ${y+10}V${y+65}`,'none',ink,1.4);}break;
 case 'night':{rect(0,0,800,1000,ink);const old=ink;circle(560,205,80,b,'none');circle(588,180,70,old,'none');for(let k=0;k<50;k++){const x=r(65,735),y=r(55,600);circle(x,y,r(1,2),paper,'none');}for(let k=0;k<14;k++){const x=r(70,730),h=r(230,640),xx=x+r(-65,65);path(`M${x} 1000Q${xx} ${1000-h/2} ${x} ${1000-h}`,'none',paper,2);for(let j=1;j<6;j++)leaf(x,1000-h*j/6,r(24,47),j%2?-55:55,pick([b,c,paper]));flower(x,1000-h,r(18,34),8,pick([a,b,paper]));}rect(28,28,744,944,'none',paper,1);break;}
 case 'turtle':{border();sun(400,175,40);
  for(let y=680;y<930;y+=22)path(`M80 ${y} Q250 ${y-18} 400 ${y}T720 ${y}`,'none',c,1);
  group(`translate(400 465) scale(${f(r(.92,1.08))}) rotate(${f(r(-5,5))})`,()=>{
   for(const ang of [215,145,305,60])group(`rotate(${ang})`,()=>path('M0 0 Q-32 -12 -54 10 Q-24 28 0 12Z',b,ink,2));
   path('M0 136 Q-9 168 0 178 Q9 168 0 136Z',b,ink,2);
   path('M0 -132 C96 -152 112 -42 88 22 C112 96 92 148 0 148 C-92 148 -112 96 -88 22 C-112 -42 -96 -152 0 -132Z',a,ink,2.5);
   path('M0 -146 C-27 -196 27 -196 0 -146Z',b,ink,2);circle(-9,-170,3.5,ink,'none');circle(9,-170,3.5,ink,'none');
   circle(0,2,52,'none',ink,1.2);circle(0,2,88,'none',ink,1.2);
   for(let k=0;k<8;k++)group(`rotate(${k*45})`,()=>line(0,52,0,88,ink,1));
   flower(0,2,26,8,c);
   for(let k=0;k<12;k++){const t=k*Math.PI/6;circle(Math.cos(t)*70,Math.sin(t)*70+2,3,b,ink,.8);}
  });
  for(let k=0;k<6;k++)flower(120+k*112,928-r(0,22),15,6,pick([a,b]));break;}
 case 'elephant':{border();
  for(const x of [85,715]){line(x,150,x,900,ink,2);for(let y=200;y<860;y+=115)flower(x,y,19,7,pick([a,b]));}
  for(let k=0;k<9;k++)path(`M150 ${880+k*10}L400 ${862+k*10}L650 ${880+k*10}`,'none',c,.8);
  group(`translate(400 495) scale(${f(r(.9,1.04))})`,()=>{
   path('M-48 -20 C-215 -80 -225 175 -78 185 C-140 95 -130 40 -48 -20Z',b,ink,2.5);
   path('M48 -20 C215 -80 225 175 78 185 C140 95 130 40 48 -20Z',b,ink,2.5);
   for(const s of [-1,1]){for(let k=0;k<5;k++){path(`M${s*86} ${-8+k*36} q${s*50} 10 ${s*68} 42`,'none',ink,.9);circle(s*116,4+k*38,4,c,ink,.8);}}
   path('M-62 78 Q-104 126 -92 176 Q-56 150 -34 92Z',paper,ink,2);
   path('M62 78 Q104 126 92 176 Q56 150 34 92Z',paper,ink,2);
   path('M0 -155 C88 -155 100 -42 80 30 C100 108 64 160 0 160 C-64 160 -100 108 -80 30 C-100 -42 -88 -155 0 -155Z',a,ink,2.8);
   leaf(0,-72,34,180,c);circle(0,-38,8,b,ink,1.2);
   path('M-42 -44 q22 -16 44 0','none',ink,2.4);circle(-19,-38,4.5,ink,'none');
   path('M42 -44 q-22 -16 -44 0','none',ink,2.4);circle(19,-38,4.5,ink,'none');
   path('M0 18 C-30 92 18 118 6 176 C2 198 -22 192 -18 170','none',ink,7);
   path('M0 18 C-30 92 18 118 6 176','none',paper,1.4);
   for(let k=-2;k<=2;k++)group(`translate(${k*42} ${-128+Math.abs(k)*10}) scale(.55)`,()=>flower(0,0,26,8,c));
   for(let k=-3;k<=3;k++)circle(k*30,-102+Math.abs(k)*6,3,b,ink,.8);
  });break;}
 case 'scroll':{border();rect(58,58,684,884,'none',a,1.4);
  for(let y=130;y<920;y+=72)for(const x of [98,662]){group(`translate(${x} ${y})`,()=>{path('M0 0 q-24 -26 0 -48 q24 22 0 48Z',c,ink,1.2);leaf(0,-32,16,-40,b);leaf(0,-12,16,40,a);});}
  line(400,120,400,880,ink,2);for(let y=205;y<830;y+=78){leaf(400,y,22,-50,c);leaf(400,y+39,22,50,c);}
  const medallion=(cy,i)=>group(`translate(400 ${cy})`,()=>{circle(0,0,118,'none',ink,2);circle(0,0,108,paper,ink,1);
   if(i%3===0)lotus(0,42,.55);else if(i%3===1)flower(0,0,46,9,a);else{sun(0,0,30);for(let k=0;k<8;k++)group(`rotate(${k*45})`,()=>leaf(0,-74,17,0,b));}
   for(let k=0;k<14;k++){const t=k*Math.PI/7;circle(Math.cos(t)*93,Math.sin(t)*93,3,pick([a,c]),ink,.7);}});
  medallion(235,0);medallion(500,1);medallion(765,2);break;}
 case 'diya':{border();sun(400,150,42);
  const lamp=(x,y,s,col)=>group(`translate(${f(x)} ${f(y)}) scale(${s})`,()=>{
   circle(0,-64,52,'none',b,1);
   path('M0 -14 C-20 -46 -8 -62 0 -96 C8 -62 20 -46 0 -14Z',col,ink,2);
   path('M0 -22 C-9 -40 -3 -48 0 -66 C3 -48 9 -40 0 -22Z',paper,ink,.9);
   path('M-58 0 Q0 62 58 0 Q0 26 -58 0Z',b,ink,2.2);
   path('M-44 -6 Q0 20 44 -6','none',paper,1.4);
   for(let k=-2;k<=2;k++)circle(k*8,14,2.5,pick([a,c,paper]),ink,.5);
  });
  const rows=detail>2?3:2;for(let i=0;i<rows;i++){const count=3+(i%2),y=455+i*(rows===3?215:275),step=600/count+40;for(let k=0;k<count;k++)lamp(100+k*step+(i%2?step/2:30),y,rows===3?.8:1,pick([a,c]));}
  for(let k=0;k<40+detail*14;k++)circle(r(100,700),r(240,930),r(.8,1.8),b,'none');
  rect(90,905,620,3,ink);break;}
 // --- Public-domain master homages: original generative compositions, never reproductions ---
 case 'wave':{
  rect(28,28,744,944,'none',ink,1.2);sun(660,150,36);
  path('M470 700 L588 452 L712 700Z',b,ink,2.4); // distant peak, geometric and original
  path('M560 486 L588 452 L617 486 L604 497 L590 484 L575 500 L566 492Z',paper,ink,1.4);
  for(let band=0;band<4;band++){const y=520+band*110;path(`M36 ${f(y)} Q${f(250+band*30)} ${f(y-78-band*10)} 480 ${f(y)} T800 ${f(y+r(-26,26))}`,'none',pick([c,ink,b]),2.4-band*.3);}
  for(let w=0;w<2+detail-1;w++){const x=r(90,300),y=r(560,860),s=r(.55,1.05);
   path(`M${f(x)} ${f(y)} q${f(190*s)} ${f(-215*s)} ${f(368*s)} 0`,'none',ink,3*s);
   path(`M${f(x+320*s)} ${f(y-96*s)} q${f(-44*s)} ${f(-78*s)} ${f(-102*s)} ${f(-26*s)}`,'none',ink,2.1*s);
   for(let k=0;k<9;k++){const t=k/8;circle(x+322*s-t*(58+30*s),y-(112-t*34)*s+r(-7,7),r(1.8,4.2)*s,paper,ink,.7);}}
  for(let k=0;k<40;k++)circle(r(70,740),r(680,950),r(1,2.6),paper,'none');
  for(const x of [190,260]){path(`M${x} 905 L${x} 858 L${x+30} 905Z`,paper,ink,1.6);line(x,905,x,856,ink,2);}
  break;}
 case 'nocturne':{
  rect(0,0,800,1000,ink);
  circle(636,168,56,b,'none');circle(666,146,50,ink,'none'); // crescent moon, built from two discs
  for(let s=0;s<6;s++){const cx=r(115,685),cy=r(95,520),base=r(24,42);for(let k=0;k<5;k++){const rr=base+k*21,t0=r(0,6.283);path(`M${f(cx+Math.cos(t0)*rr)} ${f(cy+Math.sin(t0)*rr)} A${f(rr)} ${f(rr)} 0 0 1 ${f(cx+Math.cos(t0+2.3)*rr)} ${f(cy+Math.sin(t0+2.3)*rr)}`,'none',pick([b,c,paper]),k%2?1.1:2.1);}}
  for(let k=0;k<26;k++){const x=r(58,742),y=r(58,556);circle(x,y,r(1.6,3.2),paper,'none');}
  path('M0 700 Q200 656 400 700 T800 688 L800 1000 L0 1000Z',a,ink,2.2);
  path('M0 792 Q225 758 432 796 T800 802 L800 1000 L0 1000Z',b,ink,2);
  for(const x of [112,694]){path(`M${x} 958 C${x-48} 812 ${x-20} 646 ${x} 556 C${x+20} 646 ${x+48} 812 ${x} 958Z`,ink,ink,2);for(let k=1;k<6;k++)line(x-14,958-k*64,x+12,944-k*64,c,1.1);}
  for(let k=0;k<7;k++){const x=200+k*64;rect(x,830,34,52,paper,ink,1.2);rect(x+9,898,16,3,ink);}
  break;}
 case 'adele':{
  rect(0,0,800,1000,a);
  const cell=(x,y,s)=>{const t=pick(['tri','cir','spiral','eye']);if(t==='tri')path(`M${x} ${y} L${x+s} ${y} L${x+s/2} ${y-s*.9}Z`,pick([b,c,paper]),ink,.8);else if(t==='cir')circle(x+s/2,y-s/2,s*.34,pick([b,c]),ink,.8);else if(t==='spiral')path(`M${x+s/2} ${y-s*.15} q${s*.3} -${s*.35} ${s*.05} -${s*.5} q-${s*.25} -${s*.12} -${s*.3} ${s*.1}`,'none',ink,1.1);else{path(`M${x+4} ${y-s/2} q${s*.45} -${s*.32} ${s-8} 0 q-${s*.45} ${s*.32} -${s-8} 0Z`,paper,ink,.9);circle(x+s/2,y-s/2,s*.13,ink,'none');}};
  for(let gy=120;gy<980;gy+=54)for(let gx=40;gx<760;gx+=54)cell(gx+r(-8,8),gy+r(-8,8),r(30,46));
  circle(400,470,r(112,128),b,ink,2.6); // radiant disc behind the muse
  group('translate(400 790) scale(1.5)',()=>{ // abstract geometric muse — triangles, pattern, not a portrait copy
   path('M-70 0 Q0 -190 70 0 Q0 90 -70 0Z',paper,ink,2.2);
   circle(0,-74,42,paper,ink,2);
   path('M-56 -108 Q0 -160 56 -108 Q30 -122 0 -118 Q-30 -122 -56 -108Z',ink,ink,2);
   for(let k=0;k<9;k++)cell(-55+k*13+r(-5,5),-18+k%3*11,r(12,18));
  });
  for(let k=0;k<26;k++)circle(r(70,730),r(220,900),r(1.4,3.4),paper,ink,.5);
  break;}
 case 'orb':{
  rect(0,0,800,1000,ink);
  const cx=400,cy=470;
  for(const s of [-1,1]){path(`M${400+s*330} 930 Q${400+s*180} 690 ${cx} 760`,'none',pick([b,c]),12);path(`M${400+s*260} 950 Q${400+s*120} 720 ${cx} 780`,'none',pick([c,b]),6);}
  for(let k=0;k<7;k++)circle(cx,cy,48+k*35,'none',pick([b,c,paper]),k%2?0.9:1.7);
  circle(cx,cy,158,'none',b,2.6);circle(cx,cy,150,'none',paper,1.2);
  path(`M${cx-104} ${cy-92} q56 -58 130 -52`,'none',paper,4);
  line(cx,cy-150,cx,cy+150,paper,1);line(cx-150,cy,cx+150,cy,paper,1);
  for(let k=0;k<22;k++){const t=r(0,6.283),rr=r(200,330);circle(cx+Math.cos(t)*rr,cy+Math.sin(t)*rr*.92,r(.9,2.4),paper,'none');}
  push(`<rect x="34" y="34" width="732" height="932" fill="none" stroke="${paper}" stroke-width="1.1"/>`);
  break;}
 case 'munch':{
  let y=64;const rows=7+(detail>2?2:0);
  for(let i=0;i<rows;i++){const h=r(58,112);path(`M0 ${f(y)} Q200 ${f(y-44)} 400 ${f(y)} T800 ${f(y+r(-28,28))} L800 ${f(y+h+42)} Q600 ${f(y+h)} 400 ${f(y+h+28)} T0 ${f(y+h)}Z`,pick([a,b,c]),ink,.8);y+=h*.92;}
  line(0,646,800,764,ink,3);line(0,690,800,810,ink,2);
  for(let k=0;k<9;k++)line(20+k*96,650+k*5,60+k*96,688+k*5,ink,1.1); // railing perspective planks
  for(let i=0;i<5;i++){const yy=826+i*36;path(`M64 ${yy} Q300 ${yy-22} 540 ${yy} T756 ${yy}`,'none',pick([c,b,paper]),1.6);}
  group('translate(600 706)',()=>{circle(0,-36,13,ink,'none');path('M-13 -22 Q0 -15 13 -22 L17 64 Q0 72 -17 64Z',ink,ink,1);});
  break;}
 case 'lilies':{
  for(let yy=86;yy<950;yy+=32)for(let x=38;x<756;x+=34){if(rand()<.8)path(`M${x} ${f(yy+r(-8,8))} q15 -6 31 0`,'none',pick([b,c,a,ink]),1.7);}
  for(let g=0;g<3;g++){const x=r(170,630),y=r(300,740);for(let m=0;m<3;m++)circle(x,y,40+m*24,'none',paper,1);}
  const pads=5+detail;
  for(let k=0;k<pads;k++){const x=r(120,680),y=r(360,910),s=r(.5,1.0);
   group(`translate(${f(x)} ${f(y)}) scale(${f(s)})`,()=>{path('M-64 0 Q0 -46 64 0 Q0 46 -64 0Z',c,ink,1.7);line(0,0,60,-5,ink,1);if(k%2)flower(0,-44,r(18,28),pick([6,8]),pick([a,b,paper]));});}
  break;}
 case 'window':{
  rect(150,120,318,520,'none',ink,3);for(let k=1;k<3;k++)line(150+k*106,120,150+k*106,640,ink,2);for(let k=1;k<4;k++)line(150,120+k*130,468,120+k*130,ink,2);
  rect(90,64,58,876,a,ink,1.6);path('M92 64 Q140 300 100 520 Q70 740 118 940','none',ink,1.4); // draped curtain, original
  push(`<polygon points="180,660 430,660 560,930 260,930" fill="${b}" opacity="0.38"/>`);
  rect(520,170,190,240,'none',ink,2.2);for(let k=0;k<3;k++)path(`M${534} ${208+k*62} q46 -22 96 0 t64 8`,'none',c,1.4);for(let k=0;k<9;k++)circle(545+k*18,392,r(1.6,3),a,ink,.5);
  line(600,820,600,940,ink,3);line(548,868,652,868,ink,3);line(548,940,548,868,ink,3);line(652,940,652,868,ink,3);path('M560 868 Q600 830 640 868','none',ink,2);
  break;}
 case 'muse':{
  border();
  circle(400,300,152,'none',b,2.2);circle(400,300,120,'none',ink,1.1);
  for(let k=0;k<24;k++){const t=k*Math.PI/12;line(400+Math.cos(t)*128,300+Math.sin(t)*128,400+Math.cos(t)*148,300+Math.sin(t)*148,b,1.3);}
  circle(400,304,56,paper,ink,2.2);
  path('M344 410 Q400 246 456 410','none',ink,1.4);
  path('M330 424 Q400 382 470 424 Q522 700 560 940 L240 940 Q278 700 330 424Z',b,ink,2.2);
  for(const s of [-1,1]){for(let k=0;k<6;k++)path(`M${400+s*(30+k*12)} 344 C${f(400+s*(122+k*26))} ${f(500+k*30)} ${f(400+s*(64+k*30))} 756 ${f(400+s*(150+k*22))} 936`,'none',pick([a,c,ink]),2.4-k*.2);}
  for(let k=0;k<5;k++)stem(180+k*110,954,r(130,230),pick([a,c]));
  for(let k=0;k<4;k++){flower(120,190+k*180,15,6,a);flower(680,190+k*180,15,6,a);}
  break;}
 }
 // Fine deterministic flecks are part of the vector art, not a raster texture or external font.
 push('<g opacity="0.055">');specks();push('</g>');
 if(preview){rect(257,955,286,24,paper);push(`<text x="400" y="971" text-anchor="middle" font-family="sans-serif" font-size="10" letter-spacing="3" fill="${ink}">EPIC ARTS · PREVIEW</text>`);}
 return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><title>${esc(title)}</title><desc>Epic Arts algorithmic edition. Engine ${ENGINE_VERSION}. Style ${esc(recipe.style)}. Seed ${recipe.seed}. Palette ${esc(recipe.palette)}.</desc><rect width="800" height="1000" fill="${paper}"/><g stroke-linecap="round" stroke-linejoin="round">${out.join('')}</g></svg>`;
}
