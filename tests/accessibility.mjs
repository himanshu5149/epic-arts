import {chromium} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFileSync} from 'node:fs';
const base=process.env.TEST_URL||'http://localhost:3000';
const b=await chromium.launch();const context=await b.newContext({viewport:{width:1440,height:1000}});const p=await context.newPage();const reports=[];await p.emulateMedia({reducedMotion:'reduce'});
for(const path of ['/','/shop','/shop?page=2','/studio','/collections','/trending','/art/mithila-garden-003','/art/tree-of-life','/library','/faq','/print-guide','/journal','/our-story','/policies/privacy','/journal/stories-in-mithila']){
 await p.goto(base+''+path,{waitUntil:'networkidle'});const results=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();reports.push({path,violations:results.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
 console.log(path,JSON.stringify(results.violations.map(v=>({id:v.id,impact:v.impact,count:v.nodes.length}))))
}
await p.evaluate(()=>localStorage.setItem('epic-cart-v1',JSON.stringify(['tree-of-life'])));await p.goto(base+'/checkout',{waitUntil:'networkidle'});const checkout=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();reports.push({path:'/checkout',violations:checkout.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});console.log('/checkout',JSON.stringify(checkout.violations.map(v=>({id:v.id,count:v.nodes.length}))));
writeFileSync('tests/accessibility-report.json',JSON.stringify(reports,null,2));await b.close();
