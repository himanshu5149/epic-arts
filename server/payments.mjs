import {createHmac,timingSafeEqual} from 'node:crypto';
import {HttpError} from './core.mjs';
// Pluggable payment gateways. Every paid mode is opt-in via environment secrets;
// nothing is collected, charged or shown as available without a configured provider.
// Demo mode remains the honest default for this preview.
export const PAYMENT_MODES=['demo','stripe','razorpay','paypal'];
export const GATEWAY_INFO={
 demo:{label:'Free demo',tagline:'Real files. No payment collected.',methods:['No payment'],currency:'USD'},
 stripe:{label:'Cards & wallets',tagline:'Cards, Apple Pay, Google Pay, Link — via Stripe',methods:['Visa','Mastercard','Apple Pay','Google Pay','Link'],currency:'USD'},
 razorpay:{label:'UPI, cards & netbanking',tagline:'UPI, cards, netbanking, wallets — via Razorpay',methods:['UPI','QR','Cards','NetBanking','Wallets'],currency:'INR'},
 paypal:{label:'PayPal',tagline:'PayPal balance or card — buyer protection included',methods:['PayPal balance','Bank via PayPal','Cards'],currency:'USD'}
};
export function createPayments({db,env=process.env,fetchImpl=fetch}){
 const configuredOrigin=env.SITE_URL?new URL(env.SITE_URL).origin:'';
 const enabled={
  stripe:!!(env.STRIPE_SECRET_KEY&&env.STRIPE_WEBHOOK_SECRET&&configuredOrigin),
  razorpay:!!(env.RAZORPAY_KEY_ID&&env.RAZORPAY_KEY_SECRET),
  paypal:!!(env.PAYPAL_CLIENT_ID&&env.PAYPAL_CLIENT_SECRET&&configuredOrigin)
 };
 // USD→INR conversion for Razorpay is a fixed, documented shop rate (default ₹84/$),
 // clamped to a sane band rather than pretending to be a live mid-market quote.
 const inrRate=Math.max(1,Math.min(200,Number(env.USD_INR_RATE)||84));
 const usdCentsToPaise=cents=>Math.round(cents*inrRate);
 const now=()=>new Date().toISOString();
 const fresh=(id)=>db.prepare('SELECT * FROM orders WHERE id=?').get(id);
 const pending=(id,order)=>{if(!order)throw new HttpError(404,'That order couldn’t be found.');if(order.status==='paid')return false;if(order.status!=='pending')throw new HttpError(409,'That checkout has expired. Please refresh to start a new one.');return true;};
 function markPaid(orderId,gateway,ref,verifiedCents){
  const order=fresh(orderId);if(!order)return null;
  if(order.status==='paid')return order; // idempotent replays are safe
  if(order.status!=='pending')throw new HttpError(409,'That payment session is no longer available.');
  if(order.total_cents!==verifiedCents)throw new HttpError(409,'The payment amount didn’t match the artwork value.');
  if(order.gateway&&order.gateway!==gateway)throw new HttpError(409,'The payment reference didn’t match this order.');
  db.prepare("UPDATE orders SET status='paid',gateway=?,gateway_ref=? WHERE id=? AND status='pending'").run(gateway,ref,orderId);
  return fresh(orderId);
 }
 function markFailed(orderId,gateway,ref,status='failed'){
  db.prepare("UPDATE orders SET status=? WHERE id=? AND gateway=? AND gateway_ref=? AND status='pending'").run(status,orderId,gateway,ref);
 }
 function describe({demoEnabled=false}={}){
  const modes=[...(demoEnabled?['demo']:[]),...PAYMENT_MODES.slice(1).filter(m=>enabled[m])];
  return modes.map(id=>({id,...GATEWAY_INFO[id]}));
 }
 function requireEnabled(mode){if(!enabled[mode])throw new HttpError(503,`${GATEWAY_INFO[mode].label} is not configured. No payment was collected.`);}
 const equalHex=(a,b)=>{try{const x=Buffer.from(String(a),'hex'),y=Buffer.from(String(b),'hex');return x.length===y.length&&x.length>0&&timingSafeEqual(x,y);}catch{return false;}};
 // --- Razorpay (UPI, cards, netbanking, wallets — amounts in INR paise) ---
 async function razorpayCreate(order,base,returnToken){
  requireEnabled('razorpay');
  const url=`${base}/pay/razorpay/${order.id}?token=${returnToken}`;
  if(order.gateway_ref)return {url,ref:order.gateway_ref}; // reuse on refresh = idempotent
  const r=await fetchImpl('https://api.razorpay.com/v1/orders',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Basic '+Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')},body:JSON.stringify({amount:usdCentsToPaise(order.total_cents),currency:'INR',receipt:order.id,notes:{order_id:order.id}}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new HttpError(502,'The payment gateway is having a little trouble. Please try again in a moment.');
  const d=await r.json();if(typeof d?.id!=='string'||!/^order_[A-Za-z0-9]+$/.test(d.id))throw new HttpError(502,'The payment gateway returned an unreadable reference.');
  return {url,ref:d.id,amountPaise:usdCentsToPaise(order.total_cents)};
 }
 function razorpayVerifySignature(orderRef,paymentId,signature){return equalHex(createHmac('sha256',env.RAZORPAY_KEY_SECRET||'').update(`${orderRef}|${paymentId}`).digest('hex'),signature);}
 function razorpayWebhook(body,signature){
  if(!env.RAZORPAY_WEBHOOK_SECRET)throw new HttpError(503,'Payment webhooks are not configured.');
  if(!equalHex(createHmac('sha256',env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex'),signature))throw new HttpError(400,'Invalid webhook signature.');
  const event=JSON.parse(body.toString());const p=event?.payload?.payment?.entity;const orderId=p?.notes?.order_id;
  if(typeof orderId!=='string'||!/^EA-\d{6}-[A-F0-9]{6}$/.test(orderId))return {ignored:true};
  if(event.event==='payment.captured'&&p.status==='captured'){const order=markPaid(orderId,'razorpay',p.id,Math.round(Number(p.amount)/inrRate));if(order)return {order};}
  if(event.event==='payment.failed'){const order=fresh(orderId);if(order)markFailed(orderId,'razorpay',p.id);return {failed:true};}
  return {ignored:true};
 }
 // --- PayPal (Orders API v2, server-to-server create/capture; no browser SDK) ---
 const ppBase=(env.PAYPAL_ENV||'sandbox')==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
 let ppToken={value:'',expiry:0};
 async function paypalToken(){
  if(Date.now()<ppToken.expiry)return ppToken.value;
  const r=await fetchImpl(`${ppBase}/v1/oauth2/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Authorization:'Basic '+Buffer.from(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`).toString('base64')},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new HttpError(502,'The payment gateway is having a little trouble. Please try again in a moment.');
  const d=await r.json();ppToken={value:String(d.access_token),expiry:Date.now()+Math.max(60,(Number(d.expires_in)||900)-60)*1000};return ppToken.value;
 }
 function usdString(cents){return (cents/100).toFixed(2);}
 async function paypalCreate(order,base){
  requireEnabled('paypal');
  if(order.checkout_url&&order.gateway_ref)return {url:order.checkout_url,ref:order.gateway_ref};
  const token=await paypalToken();
  const r=await fetchImpl(`${ppBase}/v2/checkout/orders`,{method:'POST',headers:{'Content-Type':'application/json','PayPal-Request-Id':`epic-${order.id}`,Authorization:`Bearer ${token}`},body:JSON.stringify({intent:'CAPTURE',purchase_units:[{reference_id:order.id,custom_id:order.id,invoice_id:order.id,description:'Epic Arts digital editions — instant download, no shipping',amount:{currency_code:'USD',value:usdString(order.total_cents)}}],payment_source:{paypal:{experience_context:{brand_name:'Epic Arts',user_action:'PAY_NOW',shipping_preference:'NO_SHIPPING',return_url:base+'/api/payments/paypal/return',cancel_url:base+'/checkout?cancelled=1'}}}}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new HttpError(502,'The payment gateway is having a little trouble. Please try again in a moment.');
  const d=await r.json();const approve=(d.links||[]).find(l=>l.rel==='payer-action'||l.rel==='approve')?.href;
  if(typeof d?.id!=='string'||!approve)throw new HttpError(502,'The payment gateway returned an unreadable reference.');
  return {url:approve,ref:d.id};
 }
 async function paypalCapture(ppOrderId){
  requireEnabled('paypal');const token=await paypalToken();
  const r=await fetchImpl(`${ppBase}/v2/checkout/orders/${encodeURIComponent(ppOrderId)}/capture`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
  if(!r.ok){const order=db.prepare("SELECT * FROM orders WHERE gateway='paypal' AND gateway_ref=?").get(ppOrderId);if(order)markFailed(order.id,'paypal',ppOrderId);throw new HttpError(402,'That payment was not completed. No payment was collected.');}
  const d=await r.json();if(d.status!=='COMPLETED')throw new HttpError(402,'That payment is not confirmed yet.');
  const unit=(d.purchase_units||[])[0];const orderId=unit?.reference_id||unit?.custom_id;const captureId=unit?.payments?.captures?.[0]?.id||d.id;
  const capturedCents=Math.round(Number(unit?.payments?.captures?.[0]?.amount?.value||0)*100);
  const order=markPaid(orderId,'paypal',captureId,capturedCents);if(!order)throw new HttpError(404,'The payment couldn’t be matched to an order.');
  return order;
 }
 async function create(mode,order,base,returnToken){
  if(mode==='razorpay')return razorpayCreate(order,base,returnToken);
  if(mode==='paypal')return paypalCreate(order,base);
  throw new HttpError(400,'Please choose an available checkout method.');
 }
 return {enabled,describe,create,usdCentsToPaise,inrRate:()=>inrRate,razorpayKeyId:env.RAZORPAY_KEY_ID||'',razorpayVerifySignature,razorpayWebhook,paypalCapture,markPaid,markFailed,pending};
}
