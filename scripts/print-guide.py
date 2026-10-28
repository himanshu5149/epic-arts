from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import simpleSplit
from pathlib import Path
root=Path(__file__).resolve().parent.parent
pdfmetrics.registerFont(TTFont('DM',str(root/'public/fonts/dm-sans-400-normal.ttf')))
pdfmetrics.registerFont(TTFont('Instrument',str(root/'public/fonts/instrument-serif-400-normal.ttf')))
c=canvas.Canvas(str(root/'public/epic-arts-print-guide.pdf'),pagesize=(595.28,841.89))
c.setTitle('A little guide to printing beautifully — Epic Arts');c.setAuthor('Epic Arts Studio')
c.setFillColor(HexColor('#f8f6ef'));c.rect(0,0,596,842,fill=1,stroke=0)
c.setFillColor(HexColor('#293e32'));c.setFont('Instrument',28);c.drawString(48,787,'epic arts.')
c.setFont('DM',7);c.drawRightString(548,789,'A LITTLE GUIDE FROM THE STUDIO')
c.setStrokeColor(HexColor('#d7ddca'));c.line(48,768,548,768)
c.setFont('Instrument',43);c.drawString(48,711,'Good art. Beautifully printed.')
c.setFont('DM',9);c.setFillColor(HexColor('#7b886e'));c.drawString(48,686,'A few thoughtful steps from your digital edition to your everyday home.')
y=642
steps=[('01','Choose your file.','Unzip your download. Choose the 5 x 7 inch, 8 x 10 inch, or A4 PDF for your frame. The A4 version has a white border. The JPG is available if your print service requests an image. Generative editions also include SVG and PNG files.'),('02','Find a paper you love.','Try matte fine-art or lightly textured paper, around 200–300 gsm. A warm white gives a gentle, earthy feel. Always test a small print before a final run.'),('03','Keep your settings simple.','Print at 100% / actual size. Turn off fit to page and automatic color enhancement. Select the correct paper type. Screen and print colors may look different.'),('04','Let a local printer help.','Take your PDF to a print shop you trust. Ask about paper, colors, trimming, and a test print. Check the source-quality note below and your edition guide before enlarging.'),('05','Make it your own.','Choose a favorite frame and give the piece a little breathing room. Keep paper prints away from moisture and direct sun. Back up your digital files somewhere safe.')]
for num,title,text in steps:
 c.setFillColor(HexColor('#b45d3e'));c.setFont('DM',8);c.drawString(49,y+3,num)
 c.setFillColor(HexColor('#293e32'));c.setFont('Instrument',23);c.drawString(79,y,title)
 y-=22;c.setFont('DM',8.5);c.setFillColor(HexColor('#7b886e'))
 for line in simpleSplit(text,'DM',8.5,463):c.drawString(79,y,line);y-=13
 y-=23
c.setFillColor(HexColor('#e9eedf'));c.rect(48,95,500,69,fill=1,stroke=0)
c.setFillColor(HexColor('#5e7550'));c.setFont('DM',7.5)
notes='Quality: Built-in generative editions include native vector SVGs and artwork PDFs, plus 2400 x 3000 raster exports. Original AI-assisted editions are upscaled from 1122 x 1402 and best at 8 x 10 in or smaller. Optional image-AI editions are raster-based: see their guide and source dimensions. No physical product. Personal use only; no resale or file sharing.'
ny=147
for line in simpleSplit(notes,'DM',7.5,468):c.drawString(64,ny,line);ny-=11
c.setFont('Instrument',16);c.setFillColor(HexColor('#7b886e'));c.drawString(48,54,'A little art. A lot of soul.')
c.setFont('DM',6.5);c.drawRightString(548,56,'EPIC ARTS / THE DIGITAL EDITION')
c.showPage();c.save()
