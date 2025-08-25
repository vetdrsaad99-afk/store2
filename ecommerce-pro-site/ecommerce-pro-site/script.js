const BACKEND_URL = "https://your-backend.onrender.com"; // change after deploying backend

function placeOrder(product) {
  fetch(`${BACKEND_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product }),
  })
    .then(res => res.json())
    .then(data => {
      alert("Order placed successfully!");
    })
    .catch(err => {
      console.error(err);
      alert("Failed to place order.");
    });
}
