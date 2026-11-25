require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { PORT, FRONTEND_DIR } = require('./config/constants');
const { pool } = require('./utils/mysqlDb');
const handleMenuRoutes = require('./routes/menuRoutes');
const handleOrderRoutes = require('./routes/orderRoutes');
const handleWebhookRoutes = require('./routes/webhookRoutes');

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

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Parse Body for non-GET requests
  let body = {};
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await parseBody(req);
    } catch (e) {}
  }

  try {
    if (pathname.startsWith('/api/menu')) {
      const handled = await handleMenuRoutes(req, res, pathname, method, body);
      if (handled) return;
    }

    if (pathname.startsWith('/api/orders')) {
      const handled = await handleOrderRoutes(req, res, pathname, method, body);
      if (handled) return;
    }

    if (pathname.startsWith('/api/payment')) {
      const handled = await handleWebhookRoutes(req, res, pathname, method, body);
      if (handled) return;
    }
  } catch (error) {
    console.error('[API ERROR]', error);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Lỗi máy chủ khi xử lý dữ liệu' }));
    } else {
      res.end();
    }
    return;
  }

  // Static File Serving (from frontend directory)
  let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);

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

pool.query('SELECT 1')
  .then(() => {
    server.listen(PORT, () => {
      console.log(`\n==================================================`);
      console.log(`🍵 SERVER TRÀ VIỆT BACKEND CHẠY TẠI: http://localhost:${PORT}`);
      console.log(`🍳 BẢNG QUẢN TRỊ KDS: http://localhost:${PORT}/admin.html`);
      console.log(`🗄️ MySQL database: ${process.env.MYSQL_DATABASE || 'traviet'}`);
      console.log(`==================================================\n`);
    });
  })
  .catch((error) => {
    console.error('[MYSQL CONNECTION ERROR] Kiểm tra MySQL đang chạy, file .env và quyền truy cập database.', error);
    process.exitCode = 1;
  });

module.exports = server;
