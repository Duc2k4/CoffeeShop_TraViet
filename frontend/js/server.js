/* ============================================================
   TRÀ VIỆT – server.js
   Standalone Node.js REST API & Real-time SSE Server
   Zero-dependency (Standard HTTP Module)
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const MENU_FILE = path.join(DATA_DIR, 'menu.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// Ensure data dir & files exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// SSE Real-Time Connected Kitchen Clients
let sseClients = [];

// Helper File Storage Reads/Writes
const readJSON = (filePath, fallback = []) => {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error(`Error reading ${filePath}:`, e);
    return fallback;
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing ${filePath}:`, e);
  }
};

// Broadcast SSE Event to all connected Kitchen Dashboards
const broadcastSSE = (eventType, payload) => {
  const dataString = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(dataString);
    } catch (e) {
      console.error('SSE send error:', e);
    }
  });
};

// MIME Types for Static File Serving
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Helper: Parse Request JSON Body
const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
};

// HTTP Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Enable CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ─── API ENDPOINTS ───

  // 1. GET /api/menu
  if (pathname === '/api/menu' && method === 'GET') {
    const menu = readJSON(MENU_FILE, []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(menu));
    return;
  }

  // 2. POST /api/menu (Admin add product)
  if (pathname === '/api/menu' && method === 'POST') {
    try {
      const newItem = await parseBody(req);
      if (!newItem.name || !newItem.basePrice) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Tên và giá sản phẩm là bắt buộc!' }));
        return;
      }
      const menu = readJSON(MENU_FILE, []);
      newItem.id = newItem.id || 'p_' + Date.now();
      newItem.isOutOfStock = newItem.isOutOfStock || false;
      menu.push(newItem);
      writeJSON(MENU_FILE, menu);

      broadcastSSE('menuUpdated', { action: 'add', item: newItem });

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newItem));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Dữ liệu JSON không hợp lệ' }));
    }
    return;
  }

  // 3. PATCH /api/menu/:id/toggle-stock (Admin toggle Out of stock)
  if (pathname.startsWith('/api/menu/') && pathname.endsWith('/toggle-stock') && method === 'PATCH') {
    const parts = pathname.split('/');
    const itemId = parts[3];
    const menu = readJSON(MENU_FILE, []);
    const item = menu.find(i => i.id === itemId);

    if (!item) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy sản phẩm' }));
      return;
    }

    item.isOutOfStock = !item.isOutOfStock;
    writeJSON(MENU_FILE, menu);

    broadcastSSE('menuUpdated', { action: 'toggleStock', item });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(item));
    return;
  }

  // 4. PUT /api/menu/:id (Admin edit product)
  if (pathname.startsWith('/api/menu/') && !pathname.endsWith('/toggle-stock') && method === 'PUT') {
    const itemId = pathname.split('/')[3];
    try {
      const updates = await parseBody(req);
      let menu = readJSON(MENU_FILE, []);
      const index = menu.findIndex(i => i.id === itemId);

      if (index === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Không tìm thấy sản phẩm' }));
        return;
      }

      menu[index] = { ...menu[index], ...updates };
      writeJSON(MENU_FILE, menu);

      broadcastSSE('menuUpdated', { action: 'update', item: menu[index] });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(menu[index]));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Lỗi cập nhật sản phẩm' }));
    }
    return;
  }

  // 5. DELETE /api/menu/:id
  if (pathname.startsWith('/api/menu/') && method === 'DELETE') {
    const itemId = pathname.split('/')[3];
    let menu = readJSON(MENU_FILE, []);
    const initialLen = menu.length;
    menu = menu.filter(i => i.id !== itemId);

    if (menu.length === initialLen) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sản phẩm không tồn tại' }));
      return;
    }

    writeJSON(MENU_FILE, menu);
    broadcastSSE('menuUpdated', { action: 'delete', id: itemId });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Đã xóa sản phẩm thành công' }));
    return;
  }

  // 6. GET /api/orders (List orders)
  if (pathname === '/api/orders' && method === 'GET') {
    const orders = readJSON(ORDERS_FILE, []);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(orders));
    return;
  }

  // 7. POST /api/orders (Create order from Checkout)
  if (pathname === '/api/orders' && method === 'POST') {
    try {
      const orderPayload = await parseBody(req);
      const orders = readJSON(ORDERS_FILE, []);

      const newOrder = {
        id: orderPayload.id || '#TV-' + Math.floor(100000 + Math.random() * 900000),
        customer: orderPayload.customer || {},
        items: orderPayload.items || [],
        subtotal: orderPayload.subtotal || 0,
        shippingFee: orderPayload.shippingFee || 0,
        discount: orderPayload.discount || 0,
        grandTotal: orderPayload.grandTotal || 0,
        paymentMethod: orderPayload.paymentMethod || 'cod',
        paymentStatus: orderPayload.paymentStatus || 'unpaid',
        orderStatus: 'pending', // pending, brewing, delivering, completed, cancelled
        createdAt: new Date().toISOString()
      };

      orders.unshift(newOrder); // newest first
      writeJSON(ORDERS_FILE, orders);

      console.log(`[ORDER CREATED] ${newOrder.id} - Total: ${newOrder.grandTotal}đ`);

      // 🔥 Broadcast SSE Real-time alert to kitchen dashboard!
      broadcastSSE('newOrder', newOrder);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newOrder));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Lỗi tạo đơn hàng' }));
    }
    return;
  }

  // 8. PATCH /api/orders/:id/status (Kitchen/Admin status change)
  if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && method === 'PATCH') {
    const orderId = decodeURIComponent(pathname.split('/')[3]);
    try {
      const { orderStatus, paymentStatus } = await parseBody(req);
      let orders = readJSON(ORDERS_FILE, []);
      const order = orders.find(o => o.id === orderId);

      if (!order) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Không tìm thấy đơn hàng' }));
        return;
      }

      if (orderStatus) order.orderStatus = orderStatus;
      if (paymentStatus) order.paymentStatus = paymentStatus;

      writeJSON(ORDERS_FILE, orders);

      broadcastSSE('orderUpdated', order);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(order));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Lỗi cập nhật đơn hàng' }));
    }
    return;
  }

  // 9. GET /api/orders/stream (SSE Stream for Real-time Kitchen Display)
  if (pathname === '/api/orders/stream' && method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    // Initial ping event
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Kitchen SSE Connected', clientId })}\n\n`);

    req.on('close', () => {
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
    return;
  }

  // 10. POST /api/payment/webhook (Mock VietQR / Casso Payment Webhook)
  if (pathname === '/api/payment/webhook' && method === 'POST') {
    try {
      const webhookData = await parseBody(req);
      const { orderId, amount } = webhookData;

      let orders = readJSON(ORDERS_FILE, []);
      const order = orders.find(o => o.id === orderId);

      if (order) {
        order.paymentStatus = 'paid';
        writeJSON(ORDERS_FILE, orders);
        broadcastSSE('paymentReceived', { orderId, amount });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Thanh toán VietQR cho ${orderId} đã được xác nhận!` }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Không tìm thấy đơn hàng tương ứng' }));
      }
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Lỗi xử lý webhook' }));
    }
    return;
  }

  // ─── STATIC FILE SERVER ───
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Security check: ensure path stays inside workspace
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
      res.end('<h1>404 - Trang không tồn tại (Trà Việt)</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`🍵 SERVER TRÀ VIỆT ĐANG CHẠY TẠI: http://localhost:${PORT}`);
  console.log(`🍳 BẢNG QUẢN TRỊ KDS: http://localhost:${PORT}/admin.html`);
  console.log(`==================================================\n`);
});
