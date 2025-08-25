const ordersEl = document.getElementById('orders');
const adminKeyInput = document.getElementById('admin-key');
const loadBtn = document.getElementById('load-orders');
const noticeEl = document.getElementById('live-notice');
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

async function loadOrders(){
  const key = adminKeyInput.value.trim();
  if(!key) return alert('Enter ADMIN_KEY');
  const res = await fetch('/api/admin/orders', { headers: {'x-admin-key': key} });
  if(!res.ok){ return alert('Failed to load orders'); }
  const orders = await res.json();
  ordersEl.innerHTML = orders.map(o => `
    <div class="order">
      <h4>Order #${o.id} — ${new Date(o.created_at).toLocaleString()}</h4>
      <div><strong>${o.customer.name}</strong> — ${o.customer.email}, ${o.customer.phone}</div>
      <div><small>${o.customer.address}</small></div>
      <ul>${o.items.map(i => `<li>${i.title} × ${i.qty} — ${i.price} PKR</li>`).join('')}</ul>
      <div><strong>Total:</strong> ${o.total} PKR</div>
    </div>
  `).join('');
}

function startSSE(){
  noticeEl.textContent = 'Connecting for live alerts...';
  let es = null;
  function connect(){
    const key = adminKeyInput.value.trim();
    if(!key) return;
    es = new EventSource('/api/admin/stream?key=' + encodeURIComponent(key));
    es.onopen = () => { noticeEl.classList.remove('alert'); noticeEl.textContent = 'Live alerts connected. Waiting for orders...'; };
    es.onerror = () => { noticeEl.classList.add('alert'); noticeEl.textContent = 'Live alerts disconnected. Retrying in 5s...'; es.close(); setTimeout(connect, 5000); };
    es.onmessage = () => { noticeEl.classList.add('alert'); noticeEl.textContent = "You've got an order! Reloading..."; loadOrders().then(()=> setTimeout(()=>{ noticeEl.classList.remove('alert'); noticeEl.textContent = 'Waiting for new orders...'; }, 2500)); };
  }
  adminKeyInput.addEventListener('change', connect);
  connect();
}

loadBtn.addEventListener('click', loadOrders);
startSSE();
