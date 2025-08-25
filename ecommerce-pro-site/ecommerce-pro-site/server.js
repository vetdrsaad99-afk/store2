import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import db from './db.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_KEY = process.env.ADMIN_KEY || 'changeme-admin-key';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const products = JSON.parse(fs.readFileSync('products.json','utf8'));

// SSE listeners
const orderListeners = new Set();
function broadcastOrder(){ for(const res of orderListeners){ try{ res.write(`data: order\n\n`);}catch(e){} } }

// Optional email transporter
let transporter = null;
if(process.env.EMAIL_NOTIFICATIONS === 'true'){
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE||'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

// API
app.get('/api/products', (req,res)=> res.json(products));

app.post('/api/orders', (req,res)=>{
  try{
    const {customer, items} = req.body;
    if(!customer || !items || !Array.isArray(items) || items.length===0){
      return res.status(400).send('Invalid order payload');
    }
    const insertUser = db.prepare(`INSERT INTO users(name,email,phone,address) VALUES(?,?,?,?)`);
    const userId = insertUser.run(customer.name, customer.email, customer.phone, customer.address).lastInsertRowid;

    let total = 0;
    const lineItems = items.map(({id, qty})=>{
      const p = products.find(x=>x.id===id);
      if(!p) throw new Error('Product not found: '+id);
      if(qty<=0) throw new Error('Invalid qty for product: '+id);
      total += p.price * qty;
      return { product_id: p.id, title: p.title, price: p.price, qty };
    });

    const insertOrder = db.prepare(`INSERT INTO orders(user_id,total) VALUES(?,?)`);
    const orderId = insertOrder.run(Number(userId), total).lastInsertRowid;

    const insertItem = db.prepare(`INSERT INTO order_items(order_id,product_id,title,price,qty) VALUES(?,?,?,?,?)`);
    const trx = db.transaction(items => { for(const it of items){ insertItem.run(orderId, it.product_id, it.title, it.price, it.qty); } });
    trx(lineItems);

    // Optional email
    if(transporter){
      const to = process.env.NOTIFY_EMAIL_TO || process.env.SMTP_USER;
      transporter.sendMail({
        from: process.env.SMTP_USER,
        to,
        subject: `New Order #${orderId}`,
        text: `You've got an order!\nOrder #${orderId}\nTotal: ${total} PKR\nCustomer: ${customer.name} (${customer.email}, ${customer.phone})`
      }).catch(err=>console.error('Email error',err));
    }

    broadcastOrder();
    res.json({ ok:true, orderId, total });
  }catch(err){
    console.error(err); res.status(500).send(err.message||'Server error');
  }
});

// Admin endpoints
function requireAdmin(req,res,next){
  const key = req.get('x-admin-key') || req.query.key;
  if(key !== ADMIN_KEY) return res.status(401).send('Unauthorized');
  next();
}
app.get('/api/admin/orders', requireAdmin, (req,res)=>{
  const orders = db.prepare(`SELECT * FROM orders ORDER BY id DESC LIMIT 200`).all();
  const getUser = db.prepare(`SELECT * FROM users WHERE id=?`);
  const getItems = db.prepare(`SELECT title,price,qty FROM order_items WHERE order_id=?`);
  const out = orders.map(o => ({
    id: o.id, total: o.total, created_at: o.created_at,
    customer: (()=>{ const u=getUser.get(o.user_id); return {name:u.name,email:u.email,phone:u.phone,address:u.address}; })(),
    items: getItems.all(o.id)
  }));
  res.json(out);
});
app.get('/api/admin/stream', requireAdmin, (req,res)=>{
  res.setHeader('Content-Type','text/event-stream');
  res.setHeader('Cache-Control','no-cache');
  res.setHeader('Connection','keep-alive');
  res.flushHeaders?.();
  orderListeners.add(res);
  req.on('close', ()=> orderListeners.delete(res));
});

// Contact form (stub; extend to email/store if desired)
app.post('/api/contact', express.urlencoded({extended:true}), (req,res)=>{
  res.json({ ok:true });
});

// Fallback
app.get('*', (req,res)=> res.sendFile(path.join(process.cwd(),'public','index.html')));

app.listen(PORT, ()=> console.log('Server running on http://localhost:'+PORT));
