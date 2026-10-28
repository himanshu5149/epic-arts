from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import json, math, zipfile, io

root = Path(__file__).resolve().parent.parent
source = root/'assets/source'
public = root/'public'
private = root/'private/downloads'
private.mkdir(parents=True, exist_ok=True)
products = json.loads((root/'shared/catalog.json').read_text())
for image in source.glob('*.png'):
    im=Image.open(image).convert('RGB')
    im.thumbnail((1450,1450) if image.stem=='hero-room' else (900,1125))
    im.save(public/'artworks'/f'{image.stem}.webp',quality=89,method=6)
    if image.stem!='hero-room':
        im.thumbnail((160,200))
        im.save(public/'artworks'/f'{image.stem}-thumb.webp',quality=80,method=6)

# Bundle previews are actual product compositions, not placeholder images.
def bundle_preview(slug, ids):
    base=Image.new('RGB',(1000,1250),'#e6e0d3')
    poses=[(70,250,410,513),(520,430,410,513)] if len(ids)==2 else [(110,160,370,463),(510,180,330,413),(365,690,350,438)]
    if len(ids)>2: ids=['tree-of-life','lotus-pond','surya']
    for id,(x,y,w,h) in zip(ids,poses):
        shadow=Image.new('RGBA',base.size)
        sd=ImageDraw.Draw(shadow);sd.rectangle((x+12,y+18,x+w+20,y+h+25),fill=(45,30,10,75))
        base=Image.alpha_composite(base.convert('RGBA'),shadow.filter(ImageFilter.GaussianBlur(15))).convert('RGB')
        d=ImageDraw.Draw(base);d.rectangle((x-8,y-8,x+w+8,y+h+8),fill='#463a29');d.rectangle((x,y,x+w,y+h),fill='#f9f4e8')
        art=Image.open(source/f'{id}.png').convert('RGB').resize((w-22,h-22),Image.Resampling.LANCZOS)
        base.paste(art,(x+11,y+11))
    base.save(public/'artworks'/f'{slug}.webp',quality=90,method=6)
    base.thumbnail((160,200));base.save(public/'artworks'/f'{slug}-thumb.webp',quality=80)
bundle_preview('earth-sky-pair',['tree-of-life','peacock-pair'])
bundle_preview('heritage-collection',['tree-of-life','peacock-pair','surya'])

LICENSE='''EPIC ARTS — PERSONAL-USE DIGITAL LICENSE\n\nYour edition is for personal use only. You may print copies for your own home or as a personal gift.\nYou may not resell, share, redistribute, sublicense, upload, or commercially reproduce the digital files.\nFrames, printing, and physical delivery are not included.\n\nDEMO CONTENT & PROVENANCE\nThis is an AI-assisted contemporary digital interpretation inspired by South Asian visual traditions.\nIt is not an authenticated antique, traditional hand-painted original, or an attributed artisan work.\nCopyright protection for AI-assisted works may vary by jurisdiction.\nThis sample license does not override local consumer rights.\n'''
GUIDE='''A LITTLE GUIDE TO YOUR NEW ART\n\n1. Download and unzip the folder on your computer or phone.\n2. Choose an included PDF: 5 x 7 inches, 8 x 10 inches, or A4 (with a white border).\n3. Print at 100% / actual size. Disable 'fit to page' and automatic color enhancement.\n4. We recommend a matte fine-art or textured paper of 200–300 gsm, with a test print first.\n5. Slip it into a favorite frame and make it yours.\n\nFILES & IMAGE QUALITY\nThe JPG is 2400 x 3000 pixels with 300 DPI metadata, upscaled from an AI-assisted\n1122 x 1402 pixel source. DPI metadata is not native detail. For best results,\nwe recommend printing at 8 x 10 inches or smaller. A4 includes generous margins.\nThe original source proportions are preserved. Screen and print colors may differ.\nNo physical artwork, frame, or shipping is included.\n\nKeep a backup of your downloaded folder. Enjoy your little piece of heritage.\n'''
for p in products:
    if len(p['artworks'])!=1: continue
    original=Image.open(source/f"{p['id']}.png").convert('RGB')
    jpg=io.BytesIO()
    original.resize((2400,3000),Image.Resampling.LANCZOS).save(jpg,'JPEG',quality=89,subsampling=2,dpi=(300,300))
    with zipfile.ZipFile(private/f"{p['id']}.zip",'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        z.writestr(f"{p['id']}/01-{p['id']}-8x10.jpg",jpg.getvalue())
        for name,w,h in [('5x7',5*72,7*72),('8x10',8*72,10*72),('A4',595.28,841.89)]:
            out=io.BytesIO();pdf=canvas.Canvas(out,pagesize=(w,h));pdf.setTitle(p['name']+' — '+name);pdf.setAuthor('Epic Arts')
            margin=18 if name=='A4' else 0
            aw,ah=w-2*margin,h-2*margin
            ratio=original.width/original.height
            if aw/ah>ratio: dw,dh=ah*ratio,ah
            else: dw,dh=aw,aw/ratio
            # JPEG compression keeps the download size sensible.
            jpeg_src=io.BytesIO();original.save(jpeg_src,'JPEG',quality=84)
            pdf.drawImage(ImageReader(io.BytesIO(jpeg_src.getvalue())),(w-dw)/2,(h-dh)/2,dw,dh)
            pdf.showPage();pdf.save()
            z.writestr(f"{p['id']}/02-{p['id']}-{name}.pdf",out.getvalue())
        z.writestr(f"{p['id']}/PRINT-ME-FIRST.txt",GUIDE)
        z.writestr(f"{p['id']}/PERSONAL-USE-LICENSE.txt",LICENSE)
for p in products:
    if len(p['artworks'])<=1: continue
    with zipfile.ZipFile(private/f"{p['id']}.zip",'w',compression=zipfile.ZIP_STORED) as z:
        for art in p['artworks']:
            z.write(private/f'{art}.zip',f'{p["id"]}/{art}.zip')
        z.writestr(f"{p['id']}/START-HERE.txt",'Your art collection\n\nEach artwork is in its own ZIP folder. Unzip each one to access the JPG, three print-ready PDFs, print guide, and personal-use license.\n\n'+GUIDE)

# App icons: a simple flower/sun mark hand-built at high resolution.
for size in [192,512]:
    im=Image.new('RGB',(size,size),'#273d31');d=ImageDraw.Draw(im)
    cx=cy=size/2
    for i in range(12):
        a=i*math.pi/6
        x=cx+size*.235*math.cos(a);y=cy+size*.235*math.sin(a)
        r=size*.07
        d.ellipse((x-r,y-r,x+r,y+r),outline='#e9dfc9',width=max(2,int(size*.012)))
    r=size*.11;d.ellipse((cx-r,cy-r,cx+r,cy+r),outline='#e9dfc9',width=max(2,int(size*.012)))
    r=size*.035;d.ellipse((cx-r,cy-r,cx+r,cy+r),fill='#cc7149')
    im.save(public/'icons'/f'icon-{size}.png')
# Social preview.
og=Image.new('RGB',(1200,630),'#f5f1e8');d=ImageDraw.Draw(og)
serif=ImageFont.truetype(str(public/'fonts/instrument-serif-400-normal.ttf'),86)
small=ImageFont.truetype(str(public/'fonts/dm-sans-400-normal.ttf'),20)
d.text((65,70),'epic arts',font=serif,fill='#273d31')
d.text((65,230),'Ancient stories.\nA new home.',font=serif,fill='#273d31',spacing=0)
d.text((68,510),'Heritage-inspired digital art. Instantly yours.',font=small,fill='#6f7568')
for i,art in enumerate(['peacock-pair','tree-of-life']):
    im=Image.open(source/f'{art}.png').convert('RGB').resize((245,306))
    x=655+i*240;y=170-i*80
    d.rectangle((x-10,y-10,x+255,y+316),fill='#574631')
    og.paste(im,(x,y))
og.save(public/'og-image.jpg',quality=90)
print('Web imagery, PWA icons, social image, and eight real downloadable editions prepared.')
for p in private.glob('*.zip'): print(p.name,round(p.stat().st_size/1024/1024,2),'MB')
