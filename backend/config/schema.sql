CREATE DATABASE IF NOT EXISTS traviet
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE traviet;

CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  base_price INT UNSIGNED NOT NULL,
  img VARCHAR(500) NULL,
  category VARCHAR(100) NULL,
  description TEXT NULL,
  is_out_of_stock BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  customer JSON NOT NULL,
  items JSON NOT NULL,
  subtotal INT UNSIGNED NOT NULL DEFAULT 0,
  shipping_fee INT UNSIGNED NOT NULL DEFAULT 0,
  discount INT UNSIGNED NOT NULL DEFAULT 0,
  grand_total INT UNSIGNED NOT NULL DEFAULT 0,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cod',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
  order_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at DATETIME(3) NOT NULL,
  INDEX idx_orders_created_at (created_at)
);
