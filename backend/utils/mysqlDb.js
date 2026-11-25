require('dotenv').config();

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'traviet',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
  dateStrings: true
});

const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value;

const formatMenuItem = (row) => ({
  id: row.id,
  name: row.name,
  basePrice: row.base_price,
  img: row.img,
  category: row.category,
  desc: row.description,
  isOutOfStock: Boolean(row.is_out_of_stock)
});

const formatOrder = (row) => ({
  id: row.id,
  customer: parseJson(row.customer),
  items: parseJson(row.items),
  subtotal: row.subtotal,
  shippingFee: row.shipping_fee,
  discount: row.discount,
  grandTotal: row.grand_total,
  paymentMethod: row.payment_method,
  paymentStatus: row.payment_status,
  orderStatus: row.order_status,
  createdAt: new Date(`${row.created_at.replace(' ', 'T')}Z`).toISOString()
});

module.exports = { pool, formatMenuItem, formatOrder };
