document.addEventListener('DOMContentLoaded', async () => {
  const menuGrid = document.getElementById('menu-grid');
  if (!menuGrid) return;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

  const categoryLabels = {
    'nguyen-ban': '🍃 Nguyên bản',
    'tra-sua': '🥛 Trà sữa',
    'trai-cay': '🍑 Trà trái cây',
    matcha: '🍵 Matcha'
  };

  try {
    const response = await fetch('/api/menu');
    if (!response.ok) {
      throw new Error(`Tải menu thất bại: HTTP ${response.status}`);
    }

    const menuItems = await response.json();
    menuGrid.innerHTML = menuItems.length
      ? menuItems.map((item) => {
        const id = escapeHtml(item.id);
        const name = escapeHtml(item.name);
        const image = escapeHtml(item.img || 'images/product_lotus.png');
        const category = escapeHtml(item.category || '');
        const description = escapeHtml(item.desc || '');
        const price = Number(item.basePrice) || 0;
        const soldOut = Boolean(item.isOutOfStock);

        return `
          <article class="menu-item" data-category="${category}" id="${id}">
            <div class="menu-item-img">
              <img src="${image}" alt="${name}" loading="lazy" />
              ${soldOut ? '<span class="product-badge" style="background:#e63946;color:#fff;">Tạm hết hàng</span>' : ''}
            </div>
            <div class="menu-item-body">
              <h3 class="menu-item-name">${name}</h3>
              <p class="menu-item-desc">${description}</p>
              <div class="menu-item-meta">
                <span class="meta-tag">${escapeHtml(categoryLabels[item.category] || item.category || 'Trà')}</span>
              </div>
              <div class="menu-item-footer">
                <div class="menu-item-price">${price.toLocaleString('vi-VN')} <small>đồng</small></div>
                <button
                  type="button"
                  class="btn ${soldOut ? 'btn-secondary disabled' : 'btn-primary'} btn-sm btn-add-cart"
                  data-product-id="${id}"
                  data-product-name="${name}"
                  data-product-price="${price}"
                  data-product-img="${image}"
                  ${soldOut ? 'disabled' : ''}>
                  <i class="fa-solid ${soldOut ? 'fa-ban' : 'fa-plus'}"></i>
                  ${soldOut ? 'Tạm hết hàng' : 'Thêm vào giỏ'}
                </button>
              </div>
            </div>
          </article>`;
      }).join('')
      : '<p style="grid-column:1/-1;text-align:center;">Hiện chưa có món nào trong thực đơn.</p>';

    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  } catch (error) {
    console.error('Không thể tải thực đơn từ máy chủ:', error);
  }
});
