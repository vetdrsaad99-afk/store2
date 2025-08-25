const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const state = { products: [], cart: JSON.parse(localStorage.getItem('cart')||'[]') };

function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); updateCartCount(); }
function updateCartCount(){ const el=$('#cart-count'); if(el) el.textContent = state.cart.reduce((s,i)=>s+i.qty,0); }
function addToCart(id){ const p = state.products.find(x=>x.id===id); if(!p) return;
  const it = state.cart.find(x=>x.id===id);
  if(it){ if(it.qty < p.stock) it.qty++; } else { state.cart.push({id, qty:1}); }
  saveCart(); renderCart();
}
function changeQty(id, delta){ const it=state.cart.find(x=>x.id===id); if(!it) return; it.qty+=delta; if(it.qty<=0) state.cart = state.cart.filter(x=>x.id!==id); saveCart(); renderCart(); }
function removeFromCart(id){ state.cart = state.cart.filter(x=>x.id!==id); saveCart(); renderCart(); }

function cartTemplate(){
  return `
  <aside id="cart" class="cart">
    <div class="cart-header">
      <h3>Your Cart</h3>
      <button id="close-cart" class="icon-btn" aria-label="Close cart">✕</button>
    </div>
    <div id="cart-items" class="cart-items"></div>
    <div class="cart-footer">
      <div class="total">Total: <strong id="cart-total">0</strong> PKR</div>
      <div class="actions">
        <button id="clear-cart-btn" class="btn-outline">Clear</button>
        <button id="checkout-btn" class="btn">Checkout</button>
      </div>
    </div>
  </aside>
  <dialog id="checkout-dialog">
    <form id="checkout-form" method="dialog" class="checkout-form">
      <h3>Checkout</h3>
      <div class="row">
        <label>Full Name<input required name="name" /></label>
        <label>Email<input type="email" required name="email" /></label>
      </div>
      <div class="row">
        <label>Phone<input required name="phone" /></label>
      </div>
      <label>Delivery Address<textarea required name="address"></textarea></label>
      <menu>
        <button value="cancel" class="btn-outline">Cancel</button>
        <button id="place-order-btn" value="confirm" class="btn">Place Order</button>
      </menu>
    </form>
  </dialog>`;
}

function ensureCartUI(){
  if(!$('#cart')){ document.body.insertAdjacentHTML('beforeend', cartTemplate()); bindCartUI(); }
  updateCartCount(); renderCart();
}
function bindCartUI(){
  const cartBtn = $('#cart-btn'); const cart = $('#cart'); const closeBtn = $('#close-cart');
  cartBtn?.addEventListener('click', ()=> cart.classList.add('active'));
  closeBtn?.addEventListener('click', ()=> cart.classList.remove('active'));
  $('#clear-cart-btn')?.addEventListener('click', ()=>{ state.cart=[]; saveCart(); renderCart(); });
  $('#checkout-btn')?.addEventListener('click', ()=>{
    if(state.cart.length===0) return alert('Cart is empty');
    $('#checkout-dialog').showModal();
  });
  $('#checkout-form')?.addEventListener('submit', placeOrder);
}

function renderCart(){
  const itemsEl = $('#cart-items'); const totalEl = $('#cart-total');
  if(!itemsEl) return;
  if(state.cart.length===0){ itemsEl.innerHTML = '<p>Your cart is empty.</p>'; if(totalEl) totalEl.textContent='0'; return; }
  let total = 0;
  itemsEl.innerHTML = state.cart.map(ci => {
    const p = state.products.find(x=>x.id===ci.id); if(!p) return '';
    const sub = p.price * ci.qty; total += sub;
    return `<div class="cart-item">
      <div><div class="title">${p.title}</div><small class="muted">${p.price} PKR x ${ci.qty}</small></div>
      <div>
        <button class="icon-btn" onclick="changeQty(${p.id},-1)">−</button>
        <button class="icon-btn" onclick="changeQty(${p.id},1)">+</button>
        <button class="icon-btn" onclick="removeFromCart(${p.id})">Remove</button>
      </div>
    </div>`;
  }).join('');
  if(totalEl) totalEl.textContent = total.toLocaleString();
}

async function loadProducts(){
  try{
    const res = await fetch('/api/products'); state.products = await res.json();
    renderProductsOnPage(); renderFeatured();
  }catch(e){ console.error('Failed to load products', e); }
}

function productCard(p){
  return `<article class="card">
    <img src="${p.image}" alt="${p.title}">
    <div class="content">
      <h3>${p.title}</h3>
      <div class="row" style="justify-content:space-between;">
        <span class="price">${p.price} PKR</span>
        <small class="muted">Stock: ${p.stock}</small>
      </div>
      <div class="row" style="justify-content:space-between;margin-top:8px">
        <button class="btn" onclick="addToCart(${p.id})">Add to Cart</button>
      </div>
    </div>
  </article>`;
}

function renderProductsOnPage(){
  const list = $('#products'); if(!list) return;
  const q = ($('#search')?.value||'').toLowerCase();
  const filtered = state.products.filter(p => p.title.toLowerCase().includes(q));
  list.innerHTML = filtered.map(productCard).join('');
}
function renderFeatured(){
  const list = $('#featured'); if(!list) return;
  const limit = Number(list.dataset.limit||'4');
  list.innerHTML = state.products.slice(0, limit).map(productCard).join('');
}

async function placeOrder(ev){
  ev?.preventDefault();
  const form = new FormData($('#checkout-form'));
  const customer = Object.fromEntries(form.entries());
  const items = state.cart.map(({id,qty})=>({id, qty}));
  const res = await fetch('/api/orders', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({customer, items}) });
  if(!res.ok){ const t=await res.text(); return alert('Order failed: ' + t); }
  const data = await res.json();
  alert(`Order placed! ID: ${data.orderId}\nYou've got an order.`);
  state.cart = []; saveCart(); $('#checkout-dialog').close(); $('#cart').classList.remove('active'); renderCart();
}

function wireSearch(){ const s=$('#search'); s?.addEventListener('input', renderProductsOnPage); }

document.addEventListener('DOMContentLoaded', ()=>{
  $('#year')?.textContent = new Date().getFullYear();
  ensureCartUI(); wireSearch(); loadProducts();
});

// Expose for inline buttons
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
