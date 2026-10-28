import Database from 'better-sqlite3';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export function openDatabase(dir){mkdirSync(dir,{recursive:true});const db=new Database(resolve(dir,'epic-arts.sqlite'));db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');db.pragma('busy_timeout = 5000');
 db.exec(`
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,created_at TEXT NOT NULL,expires_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS orders(
 id TEXT PRIMARY KEY,session_hash TEXT NOT NULL REFERENCES sessions(hash),name TEXT NOT NULL,email TEXT NOT NULL,
 ids_json TEXT NOT NULL,total_cents INTEGER NOT NULL CHECK(total_cents>=0),discount_cents INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL CHECK(status IN ('pending','demo','paid','expired','failed','refunded','disputed')),
 created_at TEXT NOT NULL,consent_at TEXT NOT NULL,terms_version TEXT NOT NULL,
 idempotency_key TEXT NOT NULL,request_hash TEXT NOT NULL,stripe_session_id TEXT UNIQUE,checkout_url TEXT,
 payment_intent TEXT,receipt_sent INTEGER NOT NULL DEFAULT 0,
 UNIQUE(session_hash,idempotency_key));
 CREATE TABLE IF NOT EXISTS order_items(order_id TEXT NOT NULL REFERENCES orders(id),product_id TEXT NOT NULL,document TEXT NOT NULL,PRIMARY KEY(order_id,product_id));
 CREATE TABLE IF NOT EXISTS access_tokens(hash TEXT PRIMARY KEY,order_id TEXT NOT NULL REFERENCES orders(id),created_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS orders_session ON orders(session_hash,created_at);
 CREATE INDEX IF NOT EXISTS order_tokens ON access_tokens(order_id);
 CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY AUTOINCREMENT,product_id TEXT NOT NULL,name TEXT NOT NULL,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),title TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,order_id TEXT NOT NULL REFERENCES orders(id),UNIQUE(product_id,order_id));
 CREATE TABLE IF NOT EXISTS newsletter(email TEXT PRIMARY KEY,created_at TEXT NOT NULL,consent_version TEXT NOT NULL);
 `);
 // Additive migrations keep existing orders valid; columns stay NULL for non-gift orders.
 const orderCols=db.pragma('table_info(orders)').map(c=>c.name);
 if(!orderCols.includes('gift_recipient'))db.exec('ALTER TABLE orders ADD COLUMN gift_recipient TEXT');
 if(!orderCols.includes('gift_message'))db.exec('ALTER TABLE orders ADD COLUMN gift_message TEXT');
 // Multi-gateway support: gateway records which provider collected payment ('demo'/'stripe'/'razorpay'/'paypal'),
 // gateway_ref is the provider-side payment capture/reference id (provider order ids live in checkout_url storage).
 const cols2=db.pragma('table_info(orders)').map(c=>c.name);
 if(!cols2.includes('gateway')){
  db.exec("ALTER TABLE orders ADD COLUMN gateway TEXT");
  db.exec("ALTER TABLE orders ADD COLUMN gateway_ref TEXT");
  db.exec("UPDATE orders SET gateway=CASE WHEN stripe_session_id IS NOT NULL THEN 'stripe' WHEN status='demo' THEN 'demo' ELSE NULL END WHERE gateway IS NULL");
  db.exec("CREATE INDEX IF NOT EXISTS orders_gateway_ref ON orders(gateway,gateway_ref)");
 }
 return db;
}
