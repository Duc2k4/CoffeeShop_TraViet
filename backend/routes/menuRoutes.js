const { pool, formatMenuItem } = require('../utils/mysqlDb');
const { broadcastSSE } = require('../utils/sseManager');

const handleMenuRoutes = async (req, res, pathname, method, body) => {
  // 1. GET /api/menu
  if (pathname === '/api/menu' && method === 'GET') {
    const [rows] = await pool.query('SELECT * FROM menu_items ORDER BY name');
    const menu = rows.map(formatMenuItem);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(menu));
    return true;
  }

  // 2. POST /api/menu
  if (pathname === '/api/menu' && method === 'POST') {
    const basePrice = Number(body.basePrice);
    if (!body.name || !Number.isSafeInteger(basePrice) || basePrice <= 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tên và giá sản phẩm hợp lệ là bắt buộc!' }));
      return true;
    }
    const item = {
      id: body.id || 'p_' + Date.now(),
      name: body.name,
      basePrice,
      img: body.img || null,
      category: body.category || null,
      desc: body.desc || null,
      isOutOfStock: Boolean(body.isOutOfStock)
    };
    await pool.execute(
      `INSERT INTO menu_items
        (id, name, base_price, img, category, description, is_out_of_stock)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.name, item.basePrice, item.img, item.category, item.desc, item.isOutOfStock]
    );

    broadcastSSE('menuUpdated', { action: 'add', item });

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(item));
    return true;
  }

  // 3. PATCH /api/menu/:id/toggle-stock
  if (pathname.startsWith('/api/menu/') && pathname.endsWith('/toggle-stock') && method === 'PATCH') {
    const parts = pathname.split('/');
    const itemId = parts[3];
    const [result] = await pool.execute(
      'UPDATE menu_items SET is_out_of_stock = NOT is_out_of_stock WHERE id = ?',
      [itemId]
    );
    if (!result.affectedRows) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy sản phẩm' }));
      return true;
    }

    const [rows] = await pool.execute('SELECT * FROM menu_items WHERE id = ?', [itemId]);
    const item = formatMenuItem(rows[0]);

    broadcastSSE('menuUpdated', { action: 'toggleStock', item });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(item));
    return true;
  }

  // 4. PUT /api/menu/:id
  if (pathname.startsWith('/api/menu/') && !pathname.endsWith('/toggle-stock') && method === 'PUT') {
    const itemId = pathname.split('/')[3];
    const [rows] = await pool.execute('SELECT * FROM menu_items WHERE id = ?', [itemId]);
    if (!rows.length) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Không tìm thấy sản phẩm' }));
      return true;
    }

    const item = { ...formatMenuItem(rows[0]), ...body };
    const basePrice = Number(item.basePrice);
    if (!item.name || !Number.isSafeInteger(basePrice) || basePrice <= 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Tên và giá sản phẩm hợp lệ là bắt buộc!' }));
      return true;
    }

    await pool.execute(
      `UPDATE menu_items
       SET name = ?, base_price = ?, img = ?, category = ?, description = ?, is_out_of_stock = ?
       WHERE id = ?`,
      [
        item.name,
        basePrice,
        item.img || null,
        item.category || null,
        item.desc || null,
        Boolean(item.isOutOfStock),
        itemId
      ]
    );

    const updatedItem = { ...item, id: itemId, basePrice };
    broadcastSSE('menuUpdated', { action: 'update', item: updatedItem });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(updatedItem));
    return true;
  }

  // 5. DELETE /api/menu/:id
  if (pathname.startsWith('/api/menu/') && method === 'DELETE') {
    const itemId = pathname.split('/')[3];
    const [result] = await pool.execute('DELETE FROM menu_items WHERE id = ?', [itemId]);
    if (!result.affectedRows) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sản phẩm không tồn tại' }));
      return true;
    }

    broadcastSSE('menuUpdated', { action: 'delete', id: itemId });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: 'Đã xóa sản phẩm thành công' }));
    return true;
  }

  return false;
};

module.exports = handleMenuRoutes;
