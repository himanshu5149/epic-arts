from pathlib import Path
import re

def luminance(h):
 c=[int(h[i:i+2],16)/255 for i in (0,2,4)]
 c=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in c]
 return .2126*c[0]+.7152*c[1]+.0722*c[2]
for file in Path('src/styles').glob('*.css'):
 content=file.read_text()
 def block(m):
  selector,decl=m.groups()
  dark=any(s in selector for s in ['.footer','.newsletter','.install-button','.brand-light','.announcement'])
  skip=any(s in selector for s in ['.stars','.rating-picker','.tiny-sun','.brand-dot','.badge-new','.bag-count','.quick-view','.toast','.option-radio','.button-primary','.collection-nature'])
  def color(c):
   val=c.group(1)
   if skip or len(val)!=6:return c.group(0)
   lum=luminance(val)
   if dark and lum<.38:return 'color:#bbc6ae'
   if not dark and .13<lum<.52:return 'color:#5d6a51'
   return c.group(0)
  return selector+'{'+re.sub(r'(?<![\w-])color:#([0-9a-fA-F]{6})(?![0-9a-fA-F])',color,decl)+'}'
 content=re.sub(r'([^{}]+)\{([^{}]*)\}',block,content)
 content=content.replace('--muted:#78796e','--muted:#65705b')
 file.write_text(content)
p=Path('src/pages/Home.tsx');p.write_text(p.read_text().replace('<div className="heritage-stamp" aria-label=', '<div className="heritage-stamp" role="img" aria-label='))
p=Path('tests/accessibility.mjs');p.write_text(p.read_text().replace("const reports=[];","const reports=[];await p.emulateMedia({reducedMotion:'reduce'});"))
