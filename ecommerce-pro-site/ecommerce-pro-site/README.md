# E-commerce Pro Site (HTML/CSS/JS + Node/Express + SQLite)

A professional, responsive web store. Multi-page frontend (Home, Products, About, Contact), connected to a Node/Express backend with a SQLite database. Orders are stored and you get **live "you've got an order" alerts** on the Admin page (optional email alerts too).

## Quick Start (Local)
1. Install **Node.js 18+**.
2. Unzip this project and open a terminal in the folder.
3. Run:
   ```bash
   npm install
   cp .env.example .env
   # edit .env: set ADMIN_KEY and (optional) email settings
   npm run dev
   ```
4. Open:
   - Store: `http://localhost:8080/`
   - Products: `http://localhost:8080/products.html`
   - Admin: `http://localhost:8080/admin.html` (enter ADMIN_KEY)

## Deploy (Render/Railway/etc. — free tier)
- Build command: `npm install`
- Start command: `node server.js`
- Add the environment vars from your `.env` (at least ADMIN_KEY).

## Update Products
Edit `products.json` to change product titles, prices, stock and images. The Products page reads this file through the backend (`/api/products`).

## Tech
- Frontend: HTML, CSS, Vanilla JS (responsive, accessible, mobile-friendly)
- Backend: Node.js + Express
- Database: SQLite (via better-sqlite3), auto-created at `data/store.db`
- Alerts: Server-Sent Events (SSE) on Admin page + optional email via SMTP
