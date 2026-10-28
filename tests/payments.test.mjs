import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createHmac} from 'node:crypto';
import {openDatabase} from '../server/db.mjs';
import {createPayments,PAYMENT_MODES,GATEWAY_INFO} from '../server/payments.mjs';
import {validateCheckout,priceCart} from '../server/core.mjs';
const env={SITE_URL:'https://epic.example',RAZORPAY_KEY_ID:'rzp_test_key',RAZORPAY_KEY_SECRET:'rzp-test-secret',RAZORPAY_WEBHOOK_SECRET:'rzp-wh-secret',PAYPAL_CLIENT_ID:'pp-id',PAYPAL_CLIENT_SECRET:'pp-secret',PAYPAL_ENV:'sandbox',USD_INR_RATE:'84'};
const now=()=>new Date().toISOString();
function fixture(fetchImpl=async()=>new Response('{}',{status:500})){
 const db=openDatabase(mkdtempSync(resolve(tmpdir(),'epic-pay-')));
 const payments=createPayments({db,env,fetchImpl});
 function makeOrder({status='pending',total=5400,gateway=null,ref=null,session='sess-'+Math.random().toString(36).slice(2)}={}){
  const id='EA-260126-'+Math.random().toString(16).slice(2,8).toUpperCase();
  db.prepare('INSERT INTO sessions(hash,created_at,expires_at) VALUES(?,?,?)').run(session,now(),new Date(Date.now()+86400000).toISOString());
  db.prepare('INSERT INTO orders(id,session_hash,name,email,ids_json,total_cents,discount_cents,status,created_at,consent_at,terms_version,idempotency_key,request_hash,gateway,gateway_ref) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
   .run(id,session,'Test Buyer','buyer@example.com','["mithila-garden-001"]',total,0,status,now(),now(),'2026-10-24','key-'+Math.random().toString(36).slice(2,20),'hash-'+Math.random().toString(36).slice(2),gateway,ref);
  return db.prepare('SELECT * FROM orders WHERE id=?').get(id);
 }
 return {db,payments,makeOrder};
}
const rzpFetch=(impl={})=>async(url,opts)=>{if(url.endsWith('/v1/orders'))return impl.orders?impl.orders(url,opts):new Response(JSON.stringify({id:'order_TEST123ABC'}),{status:200});return new Response('{}',{status:404});};
const ppFetch=(impl={})=>async(url,opts)=>{
 if(url.endsWith('/v1/oauth2/token'))return new Response(JSON.stringify({access_token:'pp-token',expires_in:600}),{status:200});
 if(url.endsWith('/v2/checkout/orders'))return impl.create?impl.create(url,opts):new Response(JSON.stringify({id:'PPORDER123',links:[{rel:'approve',href:'https://www.sandbox.paypal.com/checkoutnow?token=PPORDER123'}]}),{status:200});
 if(url.includes('/capture'))return impl.capture?impl.capture(url,opts):new Response(JSON.stringify({status:'COMPLETED',purchase_units:[{reference_id:impl.orderId,custom_id:impl.orderId,payments:{captures:[{id:'CAPTURE1',amount:{currency_code:'USD',value:(impl.cents/100).toFixed(2)}}]}}]}),{status:200});
 return new Response('{}',{status:404});};
test('gateway modes, labels and enablement are honest',()=>{
 const {payments}=fixture();
 assert.deepEqual(PAYMENT_MODES,['demo','stripe','razorpay','paypal']);
 assert.deepEqual(payments.describe({demoEnabled:true}).map(g=>g.id),['demo','razorpay','paypal']); // stripe key absent in fixture env
 assert.ok(GATEWAY_INFO.razorpay.methods.includes('UPI'));
 assert.equal(GATEWAY_INFO.razorpay.currency,'INR');
 const bare=createPayments({db:openDatabase(mkdtempSync(resolve(tmpdir(),'epic-pay-bare-'))),env:{},fetchImpl:async()=>{throw new Error('network');}});
 assert.deepEqual(bare.describe({demoEnabled:true}),[{id:'demo',...GATEWAY_INFO.demo}]);
});
test('unconfigured gateways refuse honestly before any network call',async()=>{
 const bare=createPayments({db:openDatabase(mkdtempSync(resolve(tmpdir(),'epic-pay-off-'))),env:{},fetchImpl:async()=>{throw new Error('network must not be touched');}});
 assert.equal(bare.enabled.razorpay,false);assert.equal(bare.enabled.paypal,false);assert.equal(bare.enabled.stripe,false);
 await assert.rejects(bare.create('razorpay',{id:'EA-260126-ABCDEF',total_cents:100},'https://x.example','t'),(e)=>e.status===503);
 await assert.rejects(bare.create('paypal',{id:'EA-260126-ABCDEF',total_cents:100},'https://x.example','t'),(e)=>e.status===503);
});
test('USD to INR paise conversion uses the documented shop rate',()=>{
 const {payments}=fixture();
 assert.equal(payments.usdCentsToPaise(5400),453600); // $54 × 84 = ₹4,536.00
 assert.equal(payments.inrRate(),84);
});
test('razorpay create stores a provider reference and is refresh-idempotent',async()=>{
 let calls=0;const {payments,makeOrder}=fixture(rzpFetch({orders:()=>{calls++;return new Response(JSON.stringify({id:'order_ABC777'}),{status:200});}}));
 const order=makeOrder({total:1800});
 const first=await payments.create('razorpay',order,'https://epic.example','tok');
 assert.equal(first.ref,'order_ABC777');assert.ok(first.url.includes('/pay/razorpay/'+order.id));
 assert.equal(first.amountPaise,151200); // $18 → ₹1,512
 const stored={...order,gateway_ref:'order_ABC777',gateway:'razorpay'};
 const again=await payments.create('razorpay',stored,'https://epic.example','tok');
 assert.equal(again.ref,'order_ABC777');assert.equal(calls,1,'no duplicate provider order on refresh');
});
test('razorpay callback verifies the HMAC signature and pays once',async()=>{
 const {payments,makeOrder,db}=fixture();
 const order=makeOrder({total:5400,gateway:'razorpay',ref:'order_SIG'});
 const bad=createHmac('sha256','wrong-secret').update('order_SIG|pay_TESTPAY1').digest('hex');
 assert.ok(!payments.razorpayVerifySignature('order_SIG','pay_TESTPAY1',bad));
 const good=createHmac('sha256',env.RAZORPAY_KEY_SECRET).update('order_SIG|pay_TESTPAY1').digest('hex');
 assert.ok(payments.razorpayVerifySignature('order_SIG','pay_TESTPAY1',good));
 const paid=payments.markPaid(order.id,'razorpay','pay_TESTPAY1',order.total_cents);
 assert.equal(paid.status,'paid');
 const replay=payments.markPaid(order.id,'razorpay','pay_TESTPAY1',order.total_cents);
 assert.equal(replay.status,'paid');
 assert.equal(db.prepare('SELECT count(*) AS n FROM orders WHERE id=? AND status=\'paid\'').get(order.id).n,1);
});
test('razorpay amount mismatch and wrong gateway are refused',async()=>{
 const {payments,makeOrder}=fixture();
 const order=makeOrder({total:5400,gateway:'razorpay',ref:'order_AMT'});
 assert.throws(()=>payments.markPaid(order.id,'razorpay','pay_X1',9999),/didn’t match/);
 assert.throws(()=>payments.markPaid(order.id,'paypal','pay_X1',5400),/didn’t match/);
 assert.equal(payments.markPaid.length>=0,true);
});
test('razorpay webhook signature guards capture and failure events',async()=>{
 const {payments,makeOrder,db}=fixture();
 const order=makeOrder({total:5400,gateway:'razorpay',ref:'order_WH'});
 const payload=JSON.stringify({event:'payment.captured',payload:{payment:{entity:{id:'pay_WH1',status:'captured',amount:453600,notes:{order_id:order.id}}}}});
 const sig=createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');
 assert.throws(()=>payments.razorpayWebhook(Buffer.from(payload),'bad-signature'),/signature/);
 const result=payments.razorpayWebhook(Buffer.from(payload),sig);
 assert.equal(result.order.status,'paid');
 const failp=JSON.stringify({event:'payment.failed',payload:{payment:{entity:{id:'pay_WH2',notes:{order_id:order.id}}}}});
 payments.razorpayWebhook(Buffer.from(failp),createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(failp).digest('hex'));
 assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'paid','paid orders never regress on late failure events');
});
test('paypal create returns an approval link and reuses it on refresh',async()=>{
 let creates=0;const {payments,makeOrder}=fixture(ppFetch({create:()=>{creates++;return new Response(JSON.stringify({id:'PP-9A',links:[{rel:'payer-action',href:'https://paypal.example/pay?token=PP-9A'}]}),{status:200});}}));
 const order=makeOrder({total:2400});
 const first=await payments.create('paypal',order,'https://epic.example');
 assert.equal(first.url,'https://paypal.example/pay?token=PP-9A');
 const again=await payments.create('paypal',{...order,gateway_ref:'PP-9A',checkout_url:first.url},'https://epic.example');
 assert.equal(creates,1);assert.equal(again.ref,'PP-9A');
});
test('paypal capture confirms server-side, matches the order and amount',async()=>{
 const {payments,makeOrder,db}=fixture();
 const order=makeOrder({total:2400,gateway:'paypal',ref:'PP-OK'});
 const pay=createPayments({db,env,fetchImpl:ppFetch({capture:()=>new Response(JSON.stringify({status:'COMPLETED',purchase_units:[{reference_id:order.id,custom_id:order.id,payments:{captures:[{id:'CAP-1',amount:{currency_code:'USD',value:'24.00'}}]}}]}),{status:200})})});
 const paid=await pay.paypalCapture('PP-OK');
 assert.equal(paid.status,'paid');assert.equal(paid.gateway_ref,'CAP-1');
});
test('paypal capture with a fabricated order id or short amount is rejected',async()=>{
 const {db,makeOrder}=fixture();
 const order=makeOrder({total:2400,gateway:'paypal',ref:'PP-BAD'});
 const wrong=createPayments({db,env,fetchImpl:ppFetch({capture:()=>new Response(JSON.stringify({status:'COMPLETED',purchase_units:[{reference_id:'EA-260126-FFFFFF',payments:{captures:[{id:'CAP-2',amount:{value:'24.00'}}]}}]}),{status:200})})});
 await assert.rejects(wrong.paypalCapture('PP-BAD'),/matched/);
 const short=createPayments({db,env,fetchImpl:ppFetch({capture:()=>new Response(JSON.stringify({status:'COMPLETED',purchase_units:[{reference_id:order.id,payments:{captures:[{id:'CAP-3',amount:{value:'1.00'}}]}}]}),{status:200})})});
 await assert.rejects(short.paypalCapture('PP-BAD'),/amount|match/i);
 assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'pending','failed captures leave the order payable');
});
test('incomplete paypal capture marks the attempt failed without charging',async()=>{
 const {db,makeOrder}=fixture();
 const order=makeOrder({total:2400,gateway:'paypal',ref:'PP-FAIL'});
 const pay=createPayments({db,env,fetchImpl:ppFetch({capture:()=>new Response(JSON.stringify({debug_id:'x'}),{status:422})})});
 await assert.rejects(pay.paypalCapture('PP-FAIL'),/not completed/i);
 assert.equal(db.prepare('SELECT status FROM orders WHERE id=?').get(order.id).status,'failed');
});
test('checkout validation accepts every configured mode and rejects strangers',()=>{
 const products=[{id:'mithila-garden-001',price:18}];
 const base={name:'Test Buyer',email:'buyer@example.com',accept:true,ids:['mithila-garden-001']};
 for(const mode of PAYMENT_MODES)assert.equal(validateCheckout({...base,mode},products,PAYMENT_MODES).mode,mode);
 assert.throws(()=>validateCheckout({...base,mode:'crypto'},products,PAYMENT_MODES),/checkout method/);
 assert.throws(()=>validateCheckout({...base,mode:'razorpay'},products,['demo','stripe']),/checkout method/);
 assert.equal(priceCart(['mithila-garden-001'],products).total,1800);
});
