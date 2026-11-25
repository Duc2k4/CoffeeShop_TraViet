const { pool } = require('../utils/mysqlDb');
const { broadcastSSE } = require('../utils/sseManager');

const handleWebhookRoutes = async (req, res, pathname, method, body) => {
  if (pathname === '/api/payment/webhook' && method === 'POST') {
    const { orderId, amount } = body;
    await pool.execute(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      ['paid', orderId]
    );
    const [rows] = await pool.execute('SELECT id FROM orders WHERE id = ?', [orderId]);

    if (rows.length) {
      broadcastSSE('paymentReceived', { orderId, amount });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: `Thanh toán VietQR cho ${orderId} đã được xác nhận!` }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy đơn hàng tương ứng' }));
    }
    return true;
  }
  return false;
};

module.exports = handleWebhookRoutes;
