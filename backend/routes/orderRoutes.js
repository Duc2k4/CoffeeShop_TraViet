const { pool, formatOrder } = require('../utils/mysqlDb');
const { addClient, broadcastSSE } = require('../utils/sseManager');

const handleOrderRoutes = async (req, res, pathname, method, body) => {
  // 1. GET /api/orders/stream (Real-Time SSE)
  if (pathname === '/api/orders/stream' && method === 'GET') {
    addClient(req, res);
    return true;
  }

  // 2. GET /api/orders
  if (pathname === '/api/orders' && method === 'GET') {
    const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = rows.map(formatOrder);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(orders));
    return true;
  }

  // 3. POST /api/orders (Create Order)
  if (pathname === '/api/orders' && method === 'POST') {
    const newOrder = {
      id: body.id || '#TV-' + Math.floor(100000 + Math.random() * 900000),
      customer: body.customer || {},
      items: body.items || [],
      subtotal: body.subtotal || 0,
      shippingFee: body.shippingFee || 0,
      discount: body.discount || 0,
      grandTotal: body.grandTotal || 0,
      paymentMethod: body.paymentMethod || 'cod',
      paymentStatus: body.paymentStatus || 'unpaid',
      orderStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    await pool.execute(
      `INSERT INTO orders
        (id, customer, items, subtotal, shipping_fee, discount, grand_total,
         payment_method, payment_status, order_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newOrder.id,
        JSON.stringify(newOrder.customer),
        JSON.stringify(newOrder.items),
        newOrder.subtotal,
        newOrder.shippingFee,
        newOrder.discount,
        newOrder.grandTotal,
        newOrder.paymentMethod,
        newOrder.paymentStatus,
        newOrder.orderStatus,
        new Date(newOrder.createdAt)
      ]
    );

    console.log(`[ORDER CREATED] ${newOrder.id} - Total: ${newOrder.grandTotal}đ`);

    // 🔥 Real-Time Notification to Kitchen KDS
    broadcastSSE('newOrder', newOrder);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(newOrder));
    return true;
  }

  // 4. PATCH /api/orders/:id/status
  if (pathname.startsWith('/api/orders/') && pathname.endsWith('/status') && method === 'PATCH') {
    const orderId = decodeURIComponent(pathname.split('/')[3]);
    await pool.execute(
      `UPDATE orders
       SET order_status = COALESCE(?, order_status),
           payment_status = COALESCE(?, payment_status)
       WHERE id = ?`,
      [body.orderStatus || null, body.paymentStatus || null, orderId]
    );
    const [rows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!rows.length) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy đơn hàng' }));
      return true;
    }

    const order = formatOrder(rows[0]);
    broadcastSSE('orderUpdated', order);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(order));
    return true;
  }

  return false;
};

module.exports = handleOrderRoutes;
