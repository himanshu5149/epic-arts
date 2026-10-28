import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {openDatabase} from './db.mjs';
import {HttpError,hash,validEmail,promotion,validateCheckout,validateReview} from './core.mjs';
import {metaFor,headFor,sitemapFor} from '../shared/seo.mjs';
import {createCatalog} from './catalog.mjs';
import {createRenderer} from './renderer.mjs';
import {createStudio} from './studio.mjs';
import {createAgentService} from './agents/index.mjs';
import {createReferenceService,validateQuery} from './references.mjs';
import {createPayments,PAYMENT_MODES} from './payments.mjs';
import {catalogQuery} from '../shared/query.mjs';
import {styles,palettes,ENGINE_VERSION} from '../shared/designs.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const production=process.env.NODE_ENV==='production';
const port=Number(process.env.PORT||3000);
const originals=JSON.parse(readFileSync(resolve(root,'shared/catalog.json'),'utf8'));
const db=openDatabase(resolve(root,process.env.DATA_DIR||'store'));
const catalog=createCatalog(db,originals);
// The full catalog is indexed in SQLite, not held in memory: counts and lookups stay
// constant-RAM regardless of edition count (100k+ scale). Only sitemap slices materialize.
const catalogCount=()=>catalog.publicCount();
const renderer=createRenderer(root);
const studio=createStudio(db,catalog,renderer);
const agents=createAgentService(db,catalog);
const references=createReferenceService(root);
const configuredOrigin=process.env.SITE_URL?new URL(process.env.SITE_URL).origin:'';
const demoEnabled=process.env.DEMO_CHECKOUT==='true'||(!production&&process.env.DEMO_CHECKOUT!=='false');
const stripeEnabled=!!(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET&&configuredOrigin);
const stripe=stripeEnabled?new Stripe(process.env.STRIPE_SECRET_KEY):null;
const receiptEnabled=!!(process.env.RESEND_API_KEY&&process.env.MAIL_FROM&&configuredOrigin);
const payments=createPayments({db});
const app=express();app.set('trust proxy',1);app.disable('x-powered-by');
app.use((req,res,next)=>{res.locals.nonce=randomBytes(18).toString('base64');next();});
app.use(helmet({frameguard:false,crossOriginOpenerPolicy:{policy:'same-origin-allow-popups'},contentSecurityPolicy:production?{directives:{defaultSrc:["'self'"],scriptSrc:["'self'",(req,res)=>`'nonce-${res.locals.nonce}'`],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','blob:'],fontSrc:["'self'"],connectSrc:["'self'"],frameAncestors:null,formAction:["'self'",'https://checkout.stripe.com'],upgradeInsecureRequests:null}}:false}));
app.use(compression());app.use(cookieParser());
app.use((req,res,next)=>{if(req.method==='GET'&&req.path.length>1&&req.path.endsWith('/'))return res.redirect(308,req.path.replace(/\/+$/,'')+(req.originalUrl.includes('?')?'?'+req.originalUrl.split('?').slice(1).join('?'):''));next();});
const now=()=>new Date().toISOString();
const originFor=req=>configuredOrigin||`${req.protocol}://${req.get('x-forwarded-host')||req.get('host')}`;
function sessionFor(req,res,create=false){
 const token=req.cookies.epic_session;
 if(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)){const digest=hash(token);const found=db.prepare('SELECT hash FROM sessions WHERE hash=? AND expires_at>?').get(digest,now());if(found)return digest;}
 if(!create)return null;
 const raw=randomBytes(32).toString('hex'),digest=hash(raw);const expiry=new Date(Date.now()+365*86400000).toISOString();
 db.prepare('INSERT INTO sessions(hash,created_at,expires_at) VALUES(?,?,?)').run(digest,now(),expiry);
 // CHIPS keeps HTTPS embedded previews working without weakening the origin/JSON mutation checks.
 res.cookie('epic_session',raw,{httpOnly:true,sameSite:req.secure?'none':'lax',secure:req.secure,partitioned:req.secure,maxAge:365*86400000,path:'/'});return digest;
}
function tokenAllows(orderId,token){return typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)&&!!db.prepare('SELECT hash FROM access_tokens WHERE hash=? AND order_id=?').get(hash(token),orderId);}
function authorize(order,req,res,token){if(!order)throw new HttpError(404,'That order couldn’t be found.');if(order.session_hash!==sessionFor(req,res)&&!tokenAllows(order.id,token))throw new HttpError(403,'This order is private. Open it in the browser where you collected it, or use its private access link.');if(!['paid','demo'].includes(order.status))throw new HttpError(403,'These files aren’t available until payment is confirmed. Refunded or disputed orders cannot be downloaded.');return order;}
function serialize(order){return {id:order.id,name:order.name,email:order.email,products:JSON.parse(order.ids_json).map(id=>{const snapshot=db.prepare('SELECT document FROM order_items WHERE order_id=? AND product_id=?').get(order.id,id);return snapshot?JSON.parse(snapshot.document):catalog.get(id);}).filter(Boolean),total:order.total_cents/100,discount:order.discount_cents/100,status:order.status,gateway:order.gateway||undefined,createdAt:order.created_at,receiptSent:!!order.receipt_sent,gift:order.gift_recipient?{recipient:order.gift_recipient,message:order.gift_message||''}:null};}
function canAccessProduct(row,req,res,token){return row&&(row.visibility==='public'||row.owner_hash===sessionFor(req,res)||(typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)&&hash(token)===row.access_hash));}
function productFor(req,res,id,token){const row=catalog.row(id);let allowed=canAccessProduct(row,req,res,token);
 if(row&&!allowed&&typeof req.query.order==='string'){const order=db.prepare('SELECT * FROM orders WHERE id=?').get(req.query.order);if(order&&['paid','demo'].includes(order.status)&&JSON.parse(order.ids_json).includes(id)&&(order.session_hash===sessionFor(req,res)||tokenAllows(order.id,req.query.token)))allowed=true;}
 if(!allowed)return undefined;const product=catalog.get(id);if(!product)return undefined;return {...product,...(row.visibility==='private'&&typeof token==='string'&&hash(token)===row.access_hash?{accessToken:token}:{})};}
function mintToken(orderId){const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO access_tokens(hash,order_id,created_at) VALUES(?,?,?)').run(hash(token),orderId,now());return token;}
async function emailReceipt(order){
 if(!receiptEnabled||order.receipt_sent)return false;
 const token=mintToken(order.id);const url=`${configuredOrigin}/library?order=${order.id}&token=${token}`;
 try{const result=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`epic-receipt-${order.id}`},body:JSON.stringify({from:process.env.MAIL_FROM,to:[order.email],subject:`Your little collection is ready — ${order.id}`,text:`Hello ${order.name},\n\nYour digital art is ready.\n${order.status==='demo'?'This is a free demo order. No payment was collected.':`Order total: USD ${(order.total_cents/100).toFixed(2)}`}\n\nOpen your private download library:\n${url}\n\nKeep this link private—anyone with it can access your order. Download and back up your ZIP files. No physical products are shipped.\n\nA little art. A lot of soul.\nEpic Arts`}),signal:AbortSignal.timeout(10000)});if(!result.ok)throw new Error(`Email provider status ${result.status}`);db.prepare('UPDATE orders SET receipt_sent=1 WHERE id=?').run(order.id);return true;}catch(error){console.error('Receipt delivery failed for order',order.id,error.message);return false;}
}
async function confirmStripe(session){
 const order=db.prepare('SELECT * FROM orders WHERE stripe_session_id=?').get(session.id);if(!order)throw new HttpError(404,'The payment session couldn’t be matched to an order.');
 if(session.metadata?.order_id!==order.id||session.currency!=='usd')throw new HttpError(409,'The payment reference didn’t match this order.');
 if(order.status==='paid'){await emailReceipt(order);return db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);}
 if(order.status!=='pending')throw new HttpError(409,'This payment session is no longer available.');
 if(session.payment_status!=='paid')throw new HttpError(409,'Your payment is not confirmed yet. Please refresh your library in a moment.');
 if(session.amount_subtotal!==order.total_cents)throw new HttpError(409,'The payment amount didn’t match the artwork value.');
 db.prepare("UPDATE orders SET status='paid',total_cents=?,payment_intent=?,gateway='stripe',gateway_ref=? WHERE id=? AND status='pending'").run(session.amount_total,typeof session.payment_intent==='string'?session.payment_intent:session.payment_intent?.id||null,session.id,order.id);
 const paid=db.prepare('SELECT * FROM orders WHERE id=?').get(order.id);await emailReceipt(paid);return paid;
}
// Stripe's signature must be checked against the unmodified request body.
app.post('/api/stripe/webhook',express.raw({type:'application/json',limit:'500kb'}),async(req,res,next)=>{try{
 if(!stripe)throw new HttpError(503,'Live payments are not configured.');let event;try{event=stripe.webhooks.constructEvent(req.body,req.headers['stripe-signature'],process.env.STRIPE_WEBHOOK_SECRET);}catch{throw new HttpError(400,'Invalid webhook signature.');}
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){if(event.data.object.payment_status==='paid')await confirmStripe(event.data.object);}
 if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type))db.prepare("UPDATE orders SET status=? WHERE stripe_session_id=? AND status='pending'").run(event.type.endsWith('expired')?'expired':'failed',event.data.object.id);
 if(['charge.refunded','charge.dispute.created'].includes(event.type)){const o=event.data.object;const intent=typeof o.payment_intent==='string'?o.payment_intent:o.payment_intent?.id;if(intent&&(o.refunded||event.type==='charge.dispute.created'))db.prepare("UPDATE orders SET status=? WHERE payment_intent=? AND status='paid'").run(event.type==='charge.refunded'?'refunded':'disputed',intent);}
 res.json({received:true});
 }catch(error){next(error);}});
// Razorpay's webhook signature is checked against the unmodified request body.
app.post('/api/payments/razorpay/webhook',express.raw({type:'application/json',limit:'500kb'}),async(req,res,next)=>{try{
 const result=payments.razorpayWebhook(req.body,req.headers['x-razorpay-signature']);
 if(result.order)await emailReceipt(result.order);res.json({received:true});
}catch(error){next(error);}});
app.use(express.json({limit:'20kb',strict:true}));
app.use('/api',(req,res,next)=>{
 res.set('Cache-Control','private, no-store');res.set('Vary','Cookie');res.set('Referrer-Policy','no-referrer');
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)){
  if(!req.is('application/json'))return next(new HttpError(415,'Please send JSON to this endpoint.'));
  const origin=req.get('origin');const allowed=new Set([req.get('host'),req.get('x-forwarded-host'),configuredOrigin?new URL(configuredOrigin).host:''].filter(Boolean));
  if(req.get('sec-fetch-site')==='cross-site')return next(new HttpError(403,'This request must come from the gallery.'));
  if(origin){try{if(!allowed.has(new URL(origin).host))throw new Error();}catch{return next(new HttpError(403,'This request must come from the gallery.'));}}
 }
 next();
});
app.use('/api',rateLimit({windowMs:15*60000,limit:600,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'A little too much activity. Please pause and try again in a few minutes.'}}));
const checkoutLimit=rateLimit({windowMs:15*60000,limit:25,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please wait a little before placing another order.'}});
app.get('/healthz',(req,res)=>res.json({status:'ok',service:'epic-arts',catalog:catalogCount(),engineVersion:ENGINE_VERSION,rendering:renderer.health(),studio:studio.health(),agents:agents.health()}));
app.get('/api/config',(req,res)=>res.json({demoEnabled,stripeEnabled,receiptEnabled,studioEnabled:true,aiEnabled:studio.aiEnabled,advisorEnabled:true,agentLlmConnected:agents.config().llmConnected,catalogCount:catalogCount(),engineVersion:ENGINE_VERSION,gateways:payments.describe({demoEnabled}),inrRate:payments.enabled.razorpay?payments.inrRate():undefined}));
// Bounded, indexed catalog responses: never send the entire inventory to the browser.
app.get(['/api/catalog','/api/products'],(req,res,next)=>{try{res.set('Cache-Control','public, max-age=30, stale-while-revalidate=60').json(catalog.search(req.query));}catch(error){next(error);}});
app.get('/api/catalog/:id',(req,res,next)=>{try{const p=productFor(req,res,req.params.id,req.query.studio_token);if(!p)throw new HttpError(404,'That edition isn’t available.');res.json(p);}catch(error){next(error);}});
const studioLimit=rateLimit({windowMs:60*60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please pause before creating more editions. Your saved art is still available.'}});
app.post('/api/studio/jobs',studioLimit,(req,res,next)=>{try{res.status(202).json(studio.create(req.body,sessionFor(req,res,true)));}catch(error){next(error);}});
app.get('/api/studio/jobs/:id',(req,res,next)=>{try{res.json(studio.result(req.params.id,sessionFor(req,res),req.query.token));}catch(error){next(error);}});
// A separate durable, read-only advisor queue. Capabilities are accepted in headers, never put in links.
const agentLimit=rateLimit({windowMs:60*60000,limit:40,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'The advisor needs a little pause. Your saved brief is still available.'}});
const agentToken=req=>/^Bearer ([a-f0-9]{64})$/.exec(req.get('authorization')||'')?.[1];
app.get('/api/agents/config',(req,res)=>res.json(agents.config()));
app.post('/api/agents/runs',agentLimit,(req,res,next)=>{try{res.status(202).json(agents.create(req.body,sessionFor(req,res,true)));}catch(error){next(error);}});
app.get('/api/agents/runs/:id/audit',(req,res,next)=>{try{res.json(agents.audit(req.params.id,sessionFor(req,res),agentToken(req)));}catch(error){next(error);}});
app.get('/api/agents/runs/:id',(req,res,next)=>{try{res.json(agents.result(req.params.id,sessionFor(req,res),agentToken(req)));}catch(error){next(error);}});
const mediaLimit=rateLimit({windowMs:60*1000,limit:1200,standardHeaders:'draft-8',legacyHeaders:false});
app.get('/media/art/:id.webp',mediaLimit,async(req,res,next)=>{try{if(!/^[a-z0-9-]{1,90}$/.test(req.params.id))throw new HttpError(404,'Preview not found.');const p=catalog.get(req.params.id);if(!p?.kind)throw new HttpError(404,'Preview not found.');const path=await renderer.preview(p);res.set('Cache-Control',p.isPrivate?'private, no-store':'public, max-age=31536000, immutable').type('webp').sendFile(path,{dotfiles:'allow'});}catch(error){next(error);}});
app.get('/api/insights',(req,res)=>res.json({paidOrders:db.prepare("SELECT count(*) AS n FROM orders WHERE status='paid'").get().n,ranking:'Paid orders only; demo orders are excluded.',researchReviewed:'2026-10-24',liveSearchVolumeAvailable:false}));
// The inspiration shelf: keyless, read-only museum references (not products). Failures are
// honest and never block the store; thumbnails are proxied so our CSP stays origin-only.
app.get('/api/references/search',async(req,res)=>{try{
 const q=validateQuery(req.query.q);if(q===null)throw new HttpError(400,'Try 2–60 friendly characters for the museum search.');
 const items=await references.search(q);res.set('Cache-Control','public, max-age=300').json({query:q,source:'Art Institute of Chicago public API (listed in public-apis/public-apis)',items});
}catch(error){if(error instanceof HttpError&&error.status===400)return res.status(400).json({error:error.message});res.status(503).json({error:'The reference museum is unreachable right now. The gallery itself is fine — this shelf is inspiration only.',offline:true,items:[]});}});
app.get('/api/references/thumb/:imageId',async(req,res)=>{try{const buf=await references.thumb(req.params.imageId);res.set('Cache-Control','public, max-age=604800, immutable').type('image/jpeg').send(buf);}catch(error){res.status(error.status||500).json({error:error.status?error.message:'That reference image is unavailable.'});}});
app.get('/api/promo',(req,res,next)=>{try{const promo=promotion(req.query.code);if(!promo.code)throw new HttpError(400,'Add a little code first. Try EPIC10.');res.json(promo);}catch(error){next(error);}});
app.post('/api/checkout',checkoutLimit,async(req,res,next)=>{try{
 const ids=Array.isArray(req.body?.ids)?req.body.ids:[];
 if(ids.some(id=>typeof id!=='string'||!/^[a-z0-9-]{1,90}$/.test(id)))throw new HttpError(400,'Those artwork references aren’t valid.');
 if(ids.length>32)throw new HttpError(400,'Please collect at most 32 digital editions per order.');
 const selected=ids.map(id=>productFor(req,res,id,req.body?.studioAccess?.[id])).filter(Boolean);
 const input=validateCheckout(req.body,selected,PAYMENT_MODES);
 if(input.mode==='demo'&&!demoEnabled)throw new HttpError(403,'Demo checkout is not enabled on this storefront.');
 if(input.mode==='stripe'&&!stripeEnabled)throw new HttpError(503,'Live payments are not configured. No payment was collected.');
 if(input.mode==='razorpay'&&!payments.enabled.razorpay)throw new HttpError(503,'UPI & netbanking checkout is not configured. No payment was collected.');
 if(input.mode==='paypal'&&!payments.enabled.paypal)throw new HttpError(503,'PayPal checkout is not configured. No payment was collected.');
 const key=req.get('Idempotency-Key');if(!key||!/^[A-Za-z0-9_-]{16,100}$/.test(key))throw new HttpError(400,'Please refresh checkout to prepare a safe order reference.');
 const session=sessionFor(req,res,true);const fingerprint=hash(JSON.stringify({ids:[...input.ids].sort(),name:input.name,email:input.email,code:input.promo.code,mode:input.mode,gift:input.gift}));
 let order=db.prepare('SELECT * FROM orders WHERE session_hash=? AND idempotency_key=?').get(session,key);
 if(order&&order.request_hash!==fingerprint)throw new HttpError(409,'Your order details changed. Please refresh checkout before trying again.');
 if(order&&['paid','demo'].includes(order.status))return res.json({order:serialize(order),accessToken:mintToken(order.id)});
 if(order?.checkout_url&&order.status==='pending')return res.json({redirectUrl:order.checkout_url});
 if(order&&order.status!=='pending')throw new HttpError(409,'That checkout has expired. Please refresh to start a new one.');
 if(!order){const id='EA-'+new Date().toISOString().slice(2,10).replace(/-/g,'')+'-'+randomBytes(3).toString('hex').toUpperCase();const time=now();
 db.transaction(()=>{db.prepare('INSERT INTO orders(id,session_hash,name,email,ids_json,total_cents,discount_cents,status,created_at,consent_at,terms_version,idempotency_key,request_hash,gift_recipient,gift_message,gateway) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,session,input.name,input.email,JSON.stringify(input.ids),input.total,input.discount,input.mode==='demo'?'demo':'pending',time,time,'2026-10-24',key,fingerprint,input.gift?input.gift.recipient:null,input.gift?input.gift.message:null,input.mode);
 for(const item of input.items){const {accessToken,...document}=item;db.prepare('INSERT INTO order_items(order_id,product_id,document) VALUES(?,?,?)').run(id,item.id,JSON.stringify(document));}})();
 order=db.prepare('SELECT * FROM orders WHERE id=?').get(id);}
 if(input.mode==='demo'){await emailReceipt(order);return res.status(201).json({order:serialize(db.prepare('SELECT * FROM orders WHERE id=?').get(order.id)),accessToken:mintToken(order.id)});}
 const base=originFor(req);const returnToken=mintToken(order.id);
 if(input.mode==='stripe'){
  const checkout=await stripe.checkout.sessions.create({mode:'payment',client_reference_id:order.id,customer_email:input.email,automatic_payment_methods:{enabled:true},metadata:{order_id:order.id},line_items:input.items.map(p=>({quantity:1,price_data:{currency:'usd',unit_amount:Math.round(p.price*100*(1-input.promo.percent/100)),product_data:{name:p.name+' — Digital edition',description:(p.kind==='generative'?'SVG, PNG, JPG + 3 PDF sizes.': 'JPG + 3 PDF sizes per artwork.')+' Personal-use license. No physical shipping.',images:[base+p.image],metadata:{product_id:p.id}},tax_behavior:'exclusive'}})),...(process.env.STRIPE_AUTOMATIC_TAX==='true'?{automatic_tax:{enabled:true}}:{}),success_url:base+'/library?order='+order.id+'&token='+returnToken+'&session_id={CHECKOUT_SESSION_ID}',cancel_url:base+'/checkout?cancelled=1'},{idempotencyKey:`epic-${order.id}`});
  db.prepare("UPDATE orders SET stripe_session_id=?,checkout_url=?,gateway='stripe' WHERE id=?").run(checkout.id,checkout.url,order.id);return res.json({redirectUrl:checkout.url});
 }
 // Razorpay / PayPal: provider order/capture references are stored; refresh-safe (idempotent) like Stripe.
 const created=await payments.create(input.mode,order,base,returnToken);
 db.prepare('UPDATE orders SET checkout_url=?,gateway=?,gateway_ref=? WHERE id=?').run(created.url,input.mode,created.ref,order.id);
 res.json({redirectUrl:created.url});
 }catch(error){next(error);}});
app.get('/api/checkout/verify',async(req,res,next)=>{try{if(!stripe)throw new HttpError(503,'Live payments are not configured.');const sid=req.query.session_id;if(typeof sid!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(sid))throw new HttpError(400,'That payment reference isn’t valid.');const order=db.prepare('SELECT * FROM orders WHERE stripe_session_id=?').get(sid);if(!order||(order.session_hash!==sessionFor(req,res)&&!tokenAllows(order.id,req.query.token)))throw new HttpError(404,'This payment session isn’t available in this browser.');const session=await stripe.checkout.sessions.retrieve(sid);const confirmed=await confirmStripe(session);res.json({order:serialize(confirmed)});}catch(error){next(error);}});
// --- Razorpay: self-hosted payment page → client checkout.js → signed server callback ---
const paymentLimit=rateLimit({windowMs:15*60000,limit:40,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Please wait a little before confirming a payment again.'}});
// The hosted page needs the provider script/frame; keep the exception scoped to this one route.
const RZP_CSP="default-src 'self';script-src https://checkout.razorpay.com;frame-src https://api.razorpay.com https://checkout.razorpay.com;connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com;style-src 'self' 'unsafe-inline';img-src 'self' data:;base-uri 'self';form-action 'none';frame-ancestors 'self'";
app.get('/pay/razorpay/:orderId',(req,res,next)=>{try{
 const order=db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.orderId);if(!order)throw new HttpError(404,'That order couldn’t be found.');
 if(order.gateway!=='razorpay'||!order.gateway_ref)throw new HttpError(404,'That payment session isn’t available.');
 if(order.session_hash!==sessionFor(req,res)&&!tokenAllows(order.id,req.query.token))throw new HttpError(403,'This payment page is private. Start checkout in this browser, or use its private access link.');
 if(order.status==='paid')return res.redirect(302,`/library?order=${order.id}&token=${req.query.token||''}`);
 if(order.status!=='pending')throw new HttpError(409,'That checkout has expired. Please refresh to start a new one.');
 const paise=payments.usdCentsToPaise(order.total_cents);
 const cfg={key:payments.razorpayKeyId,amount:paise,currency:'INR',name:'Epic Arts',description:'Digital editions — instant download',order_id:order.gateway_ref,prefill:{name:order.name,email:order.email},theme:{color:'#2f5d43'},callback:'/api/payments/razorpay/callback',orderId:order.id,token:typeof req.query.token==='string'?String(req.query.token):''};
 res.set('Content-Security-Policy',RZP_CSP);res.set('Cache-Control','private, no-store');res.set('Referrer-Policy','no-referrer');
 res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Complete your payment | Epic Arts</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8f6ef;color:#293e32;font-family:Georgia,'Times New Roman',serif}main{max-width:420px;padding:32px;text-align:center}.card{background:#fff;border:1px solid #e4ddc8;border-radius:18px;padding:34px 30px;box-shadow:0 24px 60px -30px rgba(41,62,50,.35)}h1{font-size:22px;font-weight:400;margin:0 0 6px}p{color:#6b7a6d;font-size:14px;line-height:1.6}.amount{font-size:30px;margin:14px 0 22px}button{width:100%;border:0;border-radius:999px;background:#2f5d43;color:#fff;font:inherit;font-size:17px;padding:14px 20px;cursor:pointer}button:disabled{opacity:.55;cursor:wait}.err{background:#fbeaea;border:1px solid #ecc;'border-radius':12px;color:#8a3030;padding:10px 14px;font-size:13px;margin-top:14px;display:none}small{display:block;margin-top:16px;color:#98a498;font-size:11px;letter-spacing:.06em;text-transform:uppercase}.spin{display:inline-block;width:14px;height:14px;border:2px solid #ffffff55;border-top-color:#fff;border-radius:50%;animation:r .7s linear infinite;vertical-align:-2px;margin-right:8px}@keyframes r{to{transform:rotate(360deg)}}</style></head><body><main class="card"><h1>A safe little payment</h1><p>UPI, cards, netbanking &amp; wallets,<br/>secured by Razorpay.</p><div class="amount">₹${(paise/100).toLocaleString('en-IN')}</div><button id="pay">Pay securely</button><div class="err" id="err" role="alert"></div><small>Epic Arts · Digital-only gallery · No card details touch our servers</small></main><script src="https://checkout.razorpay.com/v1/checkout.js"></script><script>var CFG=${JSON.stringify(cfg).replace(/</g,'\\u003c')};var btn=document.getElementById('pay'),err=document.getElementById('err');function show(m){err.textContent=m;err.style.display='block';btn.disabled=false;btn.textContent='Try again';}function pay(){btn.disabled=true;btn.innerHTML='<span class="spin"></span>Opening Razorpay…';if(!window.Razorpay)return show('The secure checkout could not load. Please check your connection and try again.');var rz=new Razorpay({key:CFG.key,amount:CFG.amount,currency:CFG.currency,name:CFG.name,description:CFG.description,order_id:CFG.order_id,prefill:CFG.prefill,theme:CFG.theme,modal:{ondismiss:function(){btn.disabled=false;btn.textContent='Pay securely';}},handler:function(res){btn.innerHTML='<span class="spin"></span>Confirming with the gallery…';fetch(CFG.callback,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({order:CFG.orderId,token:CFG.token,razorpay_order_id:res.razorpay_order_id,razorpay_payment_id:res.razorpay_payment_id,razorpay_signature:res.razorpay_signature})}).then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'The gallery could not confirm your payment yet.');window.location.assign('/library?order='+encodeURIComponent(d.order.id)+'&token='+encodeURIComponent(d.accessToken||CFG.token)+'&welcome=1');});}).catch(function(e){show(e.message||'We could not reach the gallery. If your payment succeeded it will appear in your library shortly — webhooks keep it safe.');});}});rz.on('payment.failed',function(){show('That payment did not complete. No amount was collected by us. You can try again.');});rz.open();}btn.addEventListener('click',pay);pay();</script></body></html>`);
 }catch(error){next(error);}});
app.post('/api/payments/razorpay/callback',paymentLimit,async(req,res,next)=>{try{
 const body=req.body||{};const orderId=String(body.order||''),paymentId=String(body.razorpay_payment_id||''),orderRef=String(body.razorpay_order_id||''),sig=String(body.razorpay_signature||'');
 if(!/^EA-\d{6}-[A-F0-9]{6}$/.test(orderId)||!/^order_[A-Za-z0-9]+$/.test(orderRef)||!/^pay_[A-Za-z0-9]+$/.test(paymentId))throw new HttpError(400,'That payment reference isn’t valid.');
 const order=db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
 if(!order||order.gateway!=='razorpay'||order.gateway_ref!==orderRef)throw new HttpError(404,'That payment session isn’t available.');
 if(order.session_hash!==sessionFor(req,res)&&!tokenAllows(order.id,body.token))throw new HttpError(403,'This payment is private.');
 if(!payments.razorpayVerifySignature(orderRef,paymentId,sig))throw new HttpError(400,'The payment signature didn’t verify. If money moved, it stays with Razorpay until verified.');
 const paid=payments.markPaid(order.id,'razorpay',paymentId,order.total_cents);
 if(paid)await emailReceipt(paid);
 res.json({order:serialize(paid||db.prepare('SELECT * FROM orders WHERE id=?').get(orderId)),accessToken:tokenAllows(orderId,body.token)?body.token:undefined});
}catch(error){next(error);}});
// --- PayPal: approval returns here; the capture happens server-to-server before the library opens ---
app.get('/api/payments/paypal/return',paymentLimit,async(req,res,next)=>{try{
 const ref=typeof req.query.token==='string'&&/^[A-Z0-9-]{6,40}$/i.test(req.query.token)?req.query.token:null;
 if(!ref)throw new HttpError(400,'That payment reference isn’t valid.');
 const order=db.prepare("SELECT * FROM orders WHERE gateway='paypal' AND gateway_ref=?").get(ref);
 if(!order)throw new HttpError(404,'That payment session isn’t available.');
 let paid;
 if(order.status==='paid')paid=order;else{try{paid=await payments.paypalCapture(ref);}catch(error){if(error.status===402)return res.redirect(302,'/checkout?cancelled=1');throw error;}}
 const token=mintToken(paid.id);await emailReceipt(paid);res.redirect(302,`/library?order=${paid.id}&token=${token}&welcome=1`);
}catch(error){next(error);}});
app.get('/api/orders',(req,res,next)=>{try{
 const session=sessionFor(req,res);let orders=session?db.prepare("SELECT * FROM orders WHERE session_hash=? AND status IN ('paid','demo') ORDER BY created_at DESC").all(session):[];
 if(req.query.order){const order=db.prepare('SELECT * FROM orders WHERE id=?').get(String(req.query.order));authorize(order,req,res,req.query.token);if(!orders.some(o=>o.id===order.id))orders.unshift(order);}
 res.json(orders.map(serialize));
 }catch(error){next(error);}});
app.post('/api/orders/:id/access-link',(req,res,next)=>{try{const order=authorize(db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id),req,res,req.body?.token);const token=mintToken(order.id);res.json({path:`/library?order=${order.id}&token=${token}`});}catch(error){next(error);}});
app.get('/api/download/:orderId/:productId',async(req,res,next)=>{try{
 const order=authorize(db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.orderId),req,res,req.query.token);
 if(!JSON.parse(order.ids_json).includes(req.params.productId))throw new HttpError(403,'This edition isn’t part of that order.');
 const snapshot=db.prepare('SELECT document FROM order_items WHERE order_id=? AND product_id=?').get(order.id,req.params.productId);const p=snapshot?JSON.parse(snapshot.document):catalog.get(req.params.productId);if(!p)throw new HttpError(404,'This artwork couldn’t be found.');const path=await renderer.archive(p);
 if(!existsSync(path))throw new HttpError(503,'The artwork file is temporarily unavailable. Please try again later.');
 res.set('Content-Type','application/zip');res.download(path,`epic-arts-${p.id}.zip`,{dotfiles:'allow'},error=>{if(error&&!res.headersSent)next(error);});
 }catch(error){next(error);}});
app.get('/api/products/:id/reviews',(req,res,next)=>{if(!productFor(req,res,req.params.id,req.query.studio_token||req.body?.studioToken))return next(new HttpError(404,'Artwork not found.'));const rows=db.prepare('SELECT r.*,o.status FROM reviews r JOIN orders o ON o.id=r.order_id WHERE product_id=? ORDER BY r.created_at DESC LIMIT 100').all(req.params.id);res.json(rows.map(r=>({name:r.name,rating:r.rating,title:r.title,text:r.body,date:r.created_at,location:'Digital collector',isDemo:r.status!=='paid'})));});
app.post('/api/products/:id/reviews',(req,res,next)=>{try{
 if(!productFor(req,res,req.params.id,req.query.studio_token||req.body?.studioToken))throw new HttpError(404,'Artwork not found.');const review=validateReview(req.body);const session=sessionFor(req,res);
 const orders=session?db.prepare("SELECT * FROM orders WHERE session_hash=? AND status IN ('demo','paid') ORDER BY created_at DESC").all(session):[];const order=orders.find(o=>JSON.parse(o.ids_json).includes(req.params.id));
 if(!order)throw new HttpError(403,'Collect this piece first. Only buyers with a completed order in this browser can share a review.');
 if(db.prepare('SELECT id FROM reviews WHERE order_id=? AND product_id=?').get(order.id,req.params.id))throw new HttpError(409,'You’ve already shared your story for this piece. Thank you.');
 const time=now();db.prepare('INSERT INTO reviews(product_id,name,rating,title,body,created_at,order_id) VALUES(?,?,?,?,?,?,?)').run(req.params.id,review.name,review.rating,review.title,review.text,time,order.id);
 res.status(201).json({...review,date:time,location:'Digital collector',isDemo:order.status==='demo'});
 }catch(error){next(error);}});
app.post('/api/newsletter',(req,res,next)=>{try{const email=typeof req.body?.email==='string'?req.body.email.trim().toLowerCase():'';if(!validEmail(email))throw new HttpError(400,'Please enter a valid email address.');db.prepare('INSERT OR IGNORE INTO newsletter(email,created_at,consent_version) VALUES(?,?,?)').run(email,now(),'2026-10-24');res.status(201).json({subscribed:true,message:'Your interest is saved. No marketing campaign is sent by this demo.'});}catch(error){next(error);}});
app.use('/api',(req,res)=>res.status(404).json({error:'That studio endpoint doesn’t exist.'}));
// Never let the development asset server expose private files.
app.use((req,res,next)=>{if(/^\/(private|store|server|scripts|tests|vendor|skills|\.agents|\.cache|\.git)(\/|$)/.test(req.path)||/^\/assets\/source(\/|$)/.test(req.path))return res.status(404).send('Not found');next();});
app.get('/index.html',(req,res)=>res.redirect(308,'/'));
app.get('/sitemap.xml',(req,res)=>res.type('application/xml').send(sitemapFor(catalog.sitemapIds(Number(process.env.SITEMAP_ART_LIMIT)||2000),originFor(req))));
app.get('/robots.txt',(req,res)=>res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /checkout\nDisallow: /library\nSitemap: ${originFor(req)}/sitemap.xml\n`));
app.use(express.static(resolve(root,production?'dist':'public'),{index:false,redirect:false,dotfiles:'deny',maxAge:production?'7d':0,setHeaders:(res,path)=>{if(/(sw\.js|manifest\.webmanifest|precache\.json)$/.test(path))res.set('Cache-Control','no-cache');}}));
let vite;let prodRender;
if(!production){const {createServer}=await import('vite');vite=await createServer({root,server:{middlewareMode:true,host:'0.0.0.0',allowedHosts:true},appType:'custom'});app.use(vite.middlewares);}else{prodRender=(await import('../dist/server/entry-server.js')).render;}
app.use(async(req,res,next)=>{try{
 if(req.method!=='GET'&&req.method!=='HEAD')return res.status(405).send('Method not allowed');
 if(/\.[a-z0-9]{2,6}$/i.test(req.path))return res.status(404).send('Not found');
 let template=readFileSync(resolve(root,production?'dist/index.html':'index.html'),'utf8');
 if(vite)template=await vite.transformIndexHtml(req.originalUrl,template);
 const render=prodRender||(await vite.ssrLoadModule('/src/entry-server.tsx')).render;
 const url=new URL(req.originalUrl,'https://epic.example');const initial={};
 if(['/', '/shop','/trending'].includes(req.path)){
  const params=new URLSearchParams(url.searchParams);if(req.path==='/trending')params.set('sort','trending');
  const key=catalogQuery(params,req.path==='/'?8:req.path==='/trending'?12:24);
  initial.listing={key,data:catalog.search(Object.fromEntries(new URLSearchParams(key)))};
 }
 let metaProducts=[];
 if(req.path.startsWith('/art/')){const p=productFor(req,res,req.path.split('/')[2],req.query.studio_token);if(p){initial.product=p;metaProducts=[p];}}
 const meta=metaFor(req.originalUrl,metaProducts,originFor(req));const body=render(req.originalUrl,initial);
 const boot='<script id="epic-boot" type="application/json" nonce="'+res.locals.nonce+'">'+JSON.stringify(initial).replace(/</g,'\\u003c')+'</script>';
 const privatePage=['/checkout','/library','/studio','/advisor'].includes(req.path)||req.path.startsWith('/art/studio-')||url.searchParams.has('studio_token');res.set('Cache-Control',privatePage?'private, no-store':'public, max-age=0, must-revalidate');if(privatePage)res.set('Referrer-Policy','no-referrer');
 res.status(meta.notFound?404:200).type('html').send(template.replace('<!--app-head-->',headFor(meta,originFor(req),res.locals.nonce)).replace('<!--app-html-->',body).replace('</body>',boot+'</body>'));
 }catch(error){vite?.ssrFixStacktrace(error);next(error);}});
app.use((error,req,res,next)=>{if(res.headersSent)return next(error);const status=error.status||500;if(status>=500)console.error('Studio request failed:',error.message);// 503s carry deliberate, non-sensitive availability messages (e.g. an unconfigured payment gateway); mask only true surprises.
const message=(status<500||status===503)?error.message:'The studio is having a little trouble. Please try again in a moment.';if(req.path.startsWith('/api/'))res.status(status).json({error:message});else res.status(status).type('html').send('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>A little pause | Epic Arts</title></head><body style="background:#f8f6ef;color:#293e32;padding:10%;font-family:Georgia,serif"><h1>A little pause.</h1><p>The gallery is having a moment. Please refresh in a little while.</p><a href="/">Try the gallery again</a></body></html>');});
const server=app.listen(port,'0.0.0.0',()=>console.log(`Epic Arts is open on port ${port} · ${production?'production':'development'} · ${stripeEnabled?'Stripe ready':demoEnabled?'free demo checkout':'checkout disabled'}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{studio.close();agents.close();server.close(()=>{db.close();vite?.close();process.exit(0);});});
