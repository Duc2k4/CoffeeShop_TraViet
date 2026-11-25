const fs = require('fs/promises');
const path = require('path');
const { pool } = require('../utils/mysqlDb');

const dataDir = path.join(__dirname, '..', 'data');

const readJson = async (filename) => JSON.parse(
  await fs.readFile(path.join(dataDir, filename), 'utf8')
);

const main = async () => {
  const [menu, orders] = await Promise.all([
    readJson('menu.json'),
    readJson('orders.json')
  ]);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    for (const item of menu) {
      await connection.execute(
        `INSERT INTO menu_items
          (id, name, base_price, img, category, description, is_out_of_stock)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = VALUES(id)`,
        [
          item.id,
          item.name,
          item.basePrice,
          item.img || null,
          item.category || null,
          item.desc || null,
          Boolean(item.isOutOfStock)
        ]
      );
    }

    for (const order of orders) {
      const createdAt = new Date(order.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        throw new Error(`Ngày tạo không hợp lệ trong đơn hàng ${order.id}`);
      }

      await connection.execute(
        `INSERT INTO orders
          (id, customer, items, subtotal, shipping_fee, discount, grand_total,
           payment_method, payment_status, order_status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = VALUES(id)`,
        [
          order.id,
          JSON.stringify(order.customer || {}),
          JSON.stringify(order.items || []),
          order.subtotal || 0,
          order.shippingFee || 0,
          order.discount || 0,
          order.grandTotal || 0,
          order.paymentMethod || 'cod',
          order.paymentStatus || 'unpaid',
          order.orderStatus || 'pending',
          createdAt
        ]
      );
    }

    await connection.commit();
    console.log(`Đã nhập ${menu.length} món và ${orders.length} đơn hàng vào MySQL.`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
};

main().catch((error) => {
  console.error('[MYSQL MIGRATION ERROR]', error);
  process.exitCode = 1;
});
