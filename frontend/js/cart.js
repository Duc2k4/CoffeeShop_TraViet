/* ============================================================
   TRÀ VIỆT – cart.js
   Hệ thống Quản lý Giỏ Hàng, Customization Modal & Fly-to-Cart
   ============================================================ */

const TMD_CART_KEY = 'tmd_cart_v1';
const TMD_TOPPINGS_LIST = [
  { id: 't1', name: 'Trân châu đen', price: 7000 },
  { id: 't2', name: 'Trân châu trắng', price: 7000 },
  { id: 't3', name: 'Thạch nha đam', price: 7000 },
  { id: 't4', name: 'Thạch trái cây', price: 7000 },
  { id: 't5', name: 'Pudding trứng', price: 7000 },
  { id: 't6', name: 'Kem phô mai', price: 7000 },
  { id: 't7', name: 'Thạch cà phê', price: 7000 },
  { id: 't8', name: 'Nước cốt dừa', price: 7000 }
];

class TMDCartSystem {
  constructor() {
    this.cart = this.loadCart();
    this.currentModalProduct = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.injectCartUI();
      this.injectModalUI();
      this.updateUI();
      this.bindGlobalEvents();
      this.syncStockStatus();
    });
  }

  async syncStockStatus() {
    try {
      const res = await fetch('/api/menu');
      if (!res.ok) return;
      const items = await res.json();
      items.forEach(item => {
        if (item.isOutOfStock) {
          const card = document.getElementById(item.id) || document.querySelector(`[data-product-id="${item.id}"]`)?.closest('.menu-item, .product-card');
          if (card) {
            const btn = card.querySelector('.btn-add-cart, .btn-primary');
            if (btn) {
              btn.disabled = true;
              btn.className = 'btn btn-secondary btn-sm disabled';
              btn.innerHTML = '<i class="fa-solid fa-ban"></i> Tạm Hết Hàng';
            }
            if (!card.querySelector('.out-of-stock-badge')) {
              const badge = document.createElement('span');
              badge.className = 'product-badge out-of-stock-badge';
              badge.style.cssText = 'background:#e63946;color:#fff;';
              badge.textContent = 'Tạm Hết Hàng';
              const imgWrap = card.querySelector('.menu-item-img, .product-img-wrap');
              if (imgWrap) imgWrap.appendChild(badge);
            }
          }
        }
      });
    } catch (e) {}
  }

  // ─── Storage Methods ───
  loadCart() {
    try {
      const data = localStorage.getItem(TMD_CART_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error loading cart:', e);
      return [];
    }
  }

  saveCart() {
    try {
      localStorage.setItem(TMD_CART_KEY, JSON.stringify(this.cart));
      this.updateUI();
      window.dispatchEvent(new CustomEvent('tmdCartUpdated', { detail: { cart: this.cart } }));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }

  generateKey(item) {
    const toppingKeys = (item.toppings || []).map(t => t.name).sort().join('|');
    return `${item.id}_${item.size || 'M'}_${item.sugar || '100%'}_${item.ice || '100%'}_${toppingKeys}_${(item.notes || '').trim()}`;
  }

  addItem(itemData) {
    const key = this.generateKey(itemData);
    const existingIndex = this.cart.findIndex(i => i.key === key);

    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += (itemData.quantity || 1);
    } else {
      this.cart.push({
        ...itemData,
        key,
        quantity: itemData.quantity || 1
      });
    }
    this.saveCart();
  }

  updateQuantity(key, delta) {
    const item = this.cart.find(i => i.key === key);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(i => i.key !== key);
    }
    this.saveCart();
  }

  removeItem(key) {
    this.cart = this.cart.filter(i => i.key !== key);
    this.saveCart();
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }

  getCartTotal() {
    return this.cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }

  getCartCount() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ─── Format Currency ───
  formatMoney(amount) {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

  // ─── Fly-to-Cart Animation ───
  flyToCart(startEl) {
    const cartBtn = document.getElementById('tmd-floating-cart-btn') || document.querySelector('.navbar-cart-badge');
    if (!cartBtn || !startEl) return;

    const startRect = startEl.getBoundingClientRect();
    const endRect = cartBtn.getBoundingClientRect();

    // Create animated cloned image or element
    const flyer = document.createElement('div');
    flyer.className = 'tmd-flyer';

    // If startEl is an img, use its src, otherwise generic tea cup icon
    let imgSrc = '';
    if (startEl.tagName === 'IMG') {
      imgSrc = startEl.src;
    } else {
      const childImg = startEl.querySelector('img');
      if (childImg) imgSrc = childImg.src;
    }

    if (imgSrc) {
      flyer.innerHTML = `<img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`;
    } else {
      flyer.innerHTML = `<span style="font-size:2rem;">🧋</span>`;
    }

    const startX = startRect.left + startRect.width / 2 - 25;
    const startY = startRect.top + startRect.height / 2 - 25;
    const endX = endRect.left + endRect.width / 2 - 25;
    const endY = endRect.top + endRect.height / 2 - 25;

    flyer.style.cssText = `
      position: fixed;
      top: ${startY}px;
      left: ${startX}px;
      width: 50px;
      height: 50px;
      z-index: 999999;
      pointer-events: none;
      transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.25, 1), opacity 0.8s ease;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      border-radius: 50%;
      background: #ffffff;
      padding: 4px;
      border: 2px solid var(--color-gold, #c8a96e);
    `;

    document.body.appendChild(flyer);

    // Quadratic path using scale and translation
    requestAnimationFrame(() => {
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      flyer.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.2) rotate(360deg)`;
      flyer.style.opacity = '0.5';
    });

    setTimeout(() => {
      flyer.remove();
      // Animate cart button bounce
      cartBtn.classList.add('tmd-bounce');
      setTimeout(() => cartBtn.classList.remove('tmd-bounce'), 400);
    }, 800);
  }

  // ─── Inject Floating Cart & Drawer HTML ───
  injectCartUI() {
    if (document.getElementById('tmd-cart-drawer')) return;

    // ─── Cart Drawer & Overlay (inject vào body) ───
    const drawerHTML = `
      <!-- Cart Drawer Overlay -->
      <div class="tmd-drawer-overlay" id="tmd-drawer-overlay"></div>

      <!-- Cart Drawer -->
      <aside class="tmd-cart-drawer" id="tmd-cart-drawer" aria-label="Giỏ hàng của bạn">
        <div class="drawer-header">
          <div class="drawer-title">
            <i class="fa-solid fa-basket-shopping" style="color:var(--color-green);"></i>
            <h3>Giỏ Hàng Của Bạn (<span id="drawer-count">0</span>)</h3>
          </div>
          <button class="drawer-close-btn" id="tmd-drawer-close" aria-label="Đóng giỏ hàng">&times;</button>
        </div>

        <!-- Freeship Bar -->
        <div class="freeship-notice" id="freeship-notice">
          <div class="freeship-text" id="freeship-text">Đang tính phí giao hàng...</div>
          <div class="freeship-bar"><div class="freeship-progress" id="freeship-progress"></div></div>
        </div>

        <!-- Drawer Body (Items) -->
        <div class="drawer-body" id="tmd-drawer-items">
          <!-- Rendered dynamically -->
        </div>

        <!-- Drawer Footer -->
        <div class="drawer-footer">
          <div class="summary-line">
            <span>Tạm tính:</span>
            <strong class="summary-total" id="drawer-total">0đ</strong>
          </div>
          <div class="promo-quick-box">
            <input type="text" id="drawer-promo-input" placeholder="Nhập mã ưu đãi (ví dụ: TRAVIET20)" />
            <button id="drawer-promo-btn">Áp dụng</button>
          </div>
          <div class="drawer-actions">
            <a href="checkout.html" class="btn btn-primary btn-block drawer-checkout-btn" id="drawer-checkout-link">
              <span>Thanh Toán Ngay</span>
              <i class="fa-solid fa-arrow-right"></i>
            </a>
            <button class="clear-cart-link" id="tmd-clear-cart">Xóa tất cả món</button>
          </div>
        </div>
      </aside>
    `;

    document.body.insertAdjacentHTML('beforeend', drawerHTML);

    // ─── Floating Cart Button → chèn vào .float-contact container ───
    const cartBtnHTML = `
      <button class="tmd-floating-cart-btn" id="tmd-floating-cart-btn" aria-label="Xem giỏ hàng">
        <div class="cart-icon-wrapper">
          <i class="fa-solid fa-bag-shopping"></i>
          <span class="tmd-cart-badge" id="tmd-cart-badge">0</span>
        </div>
        <span class="cart-btn-label">Giỏ hàng</span>
      </button>
    `;

    const floatContact = document.querySelector('.float-contact');
    if (floatContact) {
      // Chèn nút giỏ hàng làm phần tử đầu tiên trong .float-contact
      floatContact.insertAdjacentHTML('afterbegin', cartBtnHTML);
    } else {
      // Nếu không có .float-contact, tạo wrapper mới
      const wrapper = document.createElement('div');
      wrapper.className = 'float-contact';
      wrapper.innerHTML = cartBtnHTML;
      document.body.appendChild(wrapper);
    }

    // Also update Navbar cart counter if element exists
    const navRight = document.querySelector('.navbar-cta');
    if (navRight && !document.querySelector('.navbar-cart-trigger')) {
      const navCartBtn = document.createElement('button');
      navCartBtn.className = 'navbar-cart-trigger';
      navCartBtn.innerHTML = `
        <i class="fa-solid fa-cart-shopping"></i>
        <span class="navbar-cart-badge tmd-cart-badge">0</span>
      `;
      navRight.insertBefore(navCartBtn, navRight.firstChild);
      navCartBtn.addEventListener('click', () => this.openDrawer());
    }
  }

  // ─── Inject Option Modal HTML ───
  injectModalUI() {
    if (document.getElementById('tmd-option-modal')) return;

    const modalHTML = `
      <div class="tmd-modal-overlay" id="tmd-option-modal-overlay"></div>
      <div class="tmd-option-modal" id="tmd-option-modal" role="dialog" aria-modal="true">
        <button class="modal-close-btn" id="tmd-modal-close">&times;</button>
        
        <div class="modal-header">
          <img id="modal-item-img" src="" alt="" />
          <div class="modal-header-info">
            <span class="modal-category-badge" id="modal-item-category">Trà Việt</span>
            <h3 id="modal-item-name">Tên sản phẩm</h3>
            <p id="modal-item-desc">Mô tả sản phẩm...</p>
            <div class="modal-price-tag" id="modal-item-price">0đ</div>
          </div>
        </div>

        <div class="modal-body">
          <!-- Size Selector -->
          <div class="option-group">
            <label class="option-label"><i class="fa-solid fa-ruler-combined"></i> Chọn Size <span class="required">*</span></label>
            <div class="option-chips" id="modal-size-options">
              <label class="chip-option active">
                <input type="radio" name="modal-size" value="M" checked data-price="0" />
                <span>Size M (Standard)</span>
              </label>
              <label class="chip-option">
                <input type="radio" name="modal-size" value="L" data-price="7000" />
                <span>Size L (+7.000đ)</span>
              </label>
            </div>
          </div>

          <!-- Sugar Selector -->
          <div class="option-group">
            <label class="option-label"><i class="fa-solid fa-cube"></i> Chọn Độ Ngọt</label>
            <div class="option-chips" id="modal-sugar-options">
              <label class="chip-option active"><input type="radio" name="modal-sugar" value="100%" checked /><span>100% Tiêu chuẩn</span></label>
              <label class="chip-option"><input type="radio" name="modal-sugar" value="70%" /><span>70% Ít ngọt</span></label>
              <label class="chip-option"><input type="radio" name="modal-sugar" value="50%" /><span>50% Vừa</span></label>
              <label class="chip-option"><input type="radio" name="modal-sugar" value="30%" /><span>30% Rất ít ngọt</span></label>
              <label class="chip-option"><input type="radio" name="modal-sugar" value="0%" /><span>0% Không đường</span></label>
            </div>
          </div>

          <!-- Ice Selector -->
          <div class="option-group">
            <label class="option-label"><i class="fa-solid fa-snowflake"></i> Chọn Mức Đá</label>
            <div class="option-chips" id="modal-ice-options">
              <label class="chip-option active"><input type="radio" name="modal-ice" value="100%" checked /><span>100% Đá riêng/Bình thường</span></label>
              <label class="chip-option"><input type="radio" name="modal-ice" value="70%" /><span>70% Ít đá</span></label>
              <label class="chip-option"><input type="radio" name="modal-ice" value="50%" /><span>50% Vừa</span></label>
              <label class="chip-option"><input type="radio" name="modal-ice" value="Không đá" /><span>Không đá</span></label>
            </div>
          </div>

          <!-- Topping Selector -->
          <div class="option-group">
            <label class="option-label"><i class="fa-solid fa-circle-dot"></i> Topping Thêm (+7.000đ/loại)</label>
            <div class="option-checkboxes" id="modal-topping-options">
              ${TMD_TOPPINGS_LIST.map(t => `
                <label class="checkbox-option">
                  <input type="checkbox" name="modal-topping" value="${t.name}" data-price="${t.price}" />
                  <span class="checkbox-box"><i class="fa-solid fa-check"></i></span>
                  <span class="checkbox-label">${t.name} (+7k)</span>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Special Note -->
          <div class="option-group">
            <label class="option-label"><i class="fa-solid fa-pen"></i> Ghi Chú Đồ Uống</label>
            <textarea id="modal-notes" placeholder="Ví dụ: Cho ít sữa, trà đậm vị, để đá riêng..." rows="2"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <div class="quantity-picker">
            <button type="button" class="qty-btn" id="modal-qty-minus">-</button>
            <span class="qty-val" id="modal-qty-val">1</span>
            <button type="button" class="qty-btn" id="modal-qty-plus">+</button>
          </div>
          <button type="button" class="btn btn-primary modal-add-btn" id="modal-add-to-cart-btn">
            <span>Thêm vào giỏ hàng</span>
            <strong id="modal-calculated-total">0đ</strong>
          </button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.bindModalEvents();
  }

  // ─── Bind UI Events ───
  bindGlobalEvents() {
    const floatBtn = document.getElementById('tmd-floating-cart-btn');
    const overlay = document.getElementById('tmd-drawer-overlay');
    const closeBtn = document.getElementById('tmd-drawer-close');
    const clearBtn = document.getElementById('tmd-clear-cart');

    if (floatBtn) floatBtn.addEventListener('click', () => this.openDrawer());
    if (overlay) overlay.addEventListener('click', () => this.closeDrawer());
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeDrawer());
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn xóa toàn bộ món trong giỏ hàng?')) {
          this.clearCart();
        }
      });
    }

    // Attach click delegate for drawer item quantity & remove
    const drawerItems = document.getElementById('tmd-drawer-items');
    if (drawerItems) {
      drawerItems.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;
        const key = target.dataset.key;
        const action = target.dataset.action;

        if (action === 'plus') this.updateQuantity(key, 1);
        if (action === 'minus') this.updateQuantity(key, -1);
        if (action === 'delete') this.removeItem(key);
      });
    }

    // Quick Promo Code Button in Drawer
    const promoBtn = document.getElementById('drawer-promo-btn');
    const promoInput = document.getElementById('drawer-promo-input');
    if (promoBtn && promoInput) {
      promoBtn.addEventListener('click', () => {
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return;
        if (code === 'TRAVIET20') {
          if (window.showToast) window.showToast('🎉 Đã lưu mã TRAVIET20! Giảm 20k tại trang Thanh Toán.');
          localStorage.setItem('tmd_applied_coupon', 'TRAVIET20');
        } else if (code === 'FREESHIP') {
          if (window.showToast) window.showToast('🚚 Đã lưu mã FREESHIP! Miễn phí giao hàng tại trang Thanh Toán.');
          localStorage.setItem('tmd_applied_coupon', 'FREESHIP');
        } else {
          if (window.showToast) window.showToast('⚠️ Mã ưu đãi không hợp lệ. Thử TRAVIET20 hoặc FREESHIP');
        }
      });
    }

    // Auto-bind click handlers for items across pages
    document.addEventListener('click', (e) => {
      const orderBtn = e.target.closest('.btn-add-cart, .btn-order-trigger, [data-product-id]');
      if (orderBtn && !orderBtn.closest('#tmd-option-modal')) {
        e.preventDefault();
        const pData = this.extractProductData(orderBtn);
        this.openCustomizationModal(pData, orderBtn);
      }
    });
  }

  extractProductData(el) {
    const card = el.closest('.menu-item, .product-card, .featured-item') || el;
    
    // Dataset overrides
    const id = el.dataset.productId || card.id || 'p_' + Math.random().toString(36).substr(2, 6);
    const name = el.dataset.productName || card.querySelector('.menu-item-name, .product-name, h3')?.textContent?.trim() || 'Trà Đặc Biệt';
    
    // Extract price from text (e.g. "38.000 đồng" or "38.000đ")
    let priceRaw = el.dataset.productPrice;
    if (!priceRaw) {
      const priceText = card.querySelector('.menu-item-price, .product-price, .price')?.textContent || '35000';
      priceRaw = priceText.replace(/[^0-9]/g, '');
    }
    const basePrice = parseInt(priceRaw, 10) || 35000;

    const img = el.dataset.productImg || card.querySelector('img')?.src || 'images/product_lotus.png';
    const desc = card.querySelector('.menu-item-desc, .product-desc, p')?.textContent?.trim() || 'Thức uống thơm ngon đậm vị trà Việt.';
    const category = card.dataset.category || 'Trà Thượng Hạng';

    return { id, name, basePrice, img, desc, category };
  }

  // ─── Modal Logic & Event Binding ───
  bindModalEvents() {
    const overlay = document.getElementById('tmd-option-modal-overlay');
    const closeBtn = document.getElementById('tmd-modal-close');
    const modal = document.getElementById('tmd-option-modal');

    const closeFn = () => {
      overlay.classList.remove('active');
      modal.classList.remove('active');
    };

    overlay.addEventListener('click', closeFn);
    closeBtn.addEventListener('click', closeFn);

    // Option selections styling
    modal.querySelectorAll('.chip-option input').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const container = e.target.closest('.option-chips');
        container.querySelectorAll('.chip-option').forEach(c => c.classList.remove('active'));
        e.target.closest('.chip-option').classList.add('active');
        this.recalculateModalPrice();
      });
    });

    modal.querySelectorAll('.checkbox-option input').forEach(chk => {
      chk.addEventListener('change', (e) => {
        e.target.closest('.checkbox-option').classList.toggle('active', chk.checked);
        this.recalculateModalPrice();
      });
    });

    // Qty minus / plus
    const qtyVal = document.getElementById('modal-qty-val');
    document.getElementById('modal-qty-minus').addEventListener('click', () => {
      let current = parseInt(qtyVal.textContent, 10) || 1;
      if (current > 1) {
        qtyVal.textContent = current - 1;
        this.recalculateModalPrice();
      }
    });

    document.getElementById('modal-qty-plus').addEventListener('click', () => {
      let current = parseInt(qtyVal.textContent, 10) || 1;
      qtyVal.textContent = current + 1;
      this.recalculateModalPrice();
    });

    // Add to cart click inside modal
    document.getElementById('modal-add-to-cart-btn').addEventListener('click', () => {
      if (!this.currentModalProduct) return;

      const sizeRadio = modal.querySelector('input[name="modal-size"]:checked');
      const sugarRadio = modal.querySelector('input[name="modal-sugar"]:checked');
      const iceRadio = modal.querySelector('input[name="modal-ice"]:checked');
      
      const sizeVal = sizeRadio ? sizeRadio.value : 'M';
      const sizePrice = sizeRadio ? parseInt(sizeRadio.dataset.price || '0', 10) : 0;
      const sugarVal = sugarRadio ? sugarRadio.value : '100%';
      const iceVal = iceRadio ? iceRadio.value : '100%';

      const toppings = [];
      let toppingPriceTotal = 0;
      modal.querySelectorAll('input[name="modal-topping"]:checked').forEach(chk => {
        const tPrice = parseInt(chk.dataset.price || '7000', 10);
        toppings.push({ name: chk.value, price: tPrice });
        toppingPriceTotal += tPrice;
      });

      const qty = parseInt(document.getElementById('modal-qty-val').textContent, 10) || 1;
      const notes = document.getElementById('modal-notes').value.trim();

      const unitPrice = this.currentModalProduct.basePrice + sizePrice + toppingPriceTotal;

      const itemPayload = {
        id: this.currentModalProduct.id,
        name: this.currentModalProduct.name,
        img: this.currentModalProduct.img,
        basePrice: this.currentModalProduct.basePrice,
        unitPrice: unitPrice,
        size: sizeVal,
        sugar: sugarVal,
        ice: iceVal,
        toppings: toppings,
        notes: notes,
        quantity: qty
      };

      this.addItem(itemPayload);

      // Trigger fly animation
      const modalImg = document.getElementById('modal-item-img');
      this.flyToCart(this.sourceElement || modalImg);

      closeFn();

      if (window.showToast) {
        window.showToast(`✨ Đã thêm <strong>${itemPayload.name} (${itemPayload.size})</strong> vào giỏ!`);
      }
    });
  }

  openCustomizationModal(product, sourceEl = null) {
    this.currentModalProduct = product;
    this.sourceElement = sourceEl;

    const modal = document.getElementById('tmd-option-modal');
    const overlay = document.getElementById('tmd-option-modal-overlay');

    document.getElementById('modal-item-img').src = product.img;
    document.getElementById('modal-item-name').textContent = product.name;
    document.getElementById('modal-item-desc').textContent = product.desc;
    document.getElementById('modal-item-price').textContent = this.formatMoney(product.basePrice);
    document.getElementById('modal-item-category').textContent = product.category || 'Trà Việt';

    // Reset fields
    document.getElementById('modal-qty-val').textContent = '1';
    document.getElementById('modal-notes').value = '';

    // Reset Radios & Checkboxes
    const defaultSize = modal.querySelector('input[name="modal-size"][value="M"]');
    if (defaultSize) { defaultSize.checked = true; defaultSize.dispatchEvent(new Event('change')); }

    const defaultSugar = modal.querySelector('input[name="modal-sugar"][value="100%"]');
    if (defaultSugar) { defaultSugar.checked = true; defaultSugar.dispatchEvent(new Event('change')); }

    const defaultIce = modal.querySelector('input[name="modal-ice"][value="100%"]');
    if (defaultIce) { defaultIce.checked = true; defaultIce.dispatchEvent(new Event('change')); }

    modal.querySelectorAll('input[name="modal-topping"]').forEach(chk => {
      chk.checked = false;
      chk.closest('.checkbox-option').classList.remove('active');
    });

    this.recalculateModalPrice();

    overlay.classList.add('active');
    modal.classList.add('active');
  }

  recalculateModalPrice() {
    if (!this.currentModalProduct) return;
    const modal = document.getElementById('tmd-option-modal');
    if (!modal) return;

    const sizeRadio = modal.querySelector('input[name="modal-size"]:checked');
    const sizePrice = sizeRadio ? parseInt(sizeRadio.dataset.price || '0', 10) : 0;

    let toppingTotal = 0;
    modal.querySelectorAll('input[name="modal-topping"]:checked').forEach(chk => {
      toppingTotal += parseInt(chk.dataset.price || '7000', 10);
    });

    const qty = parseInt(document.getElementById('modal-qty-val').textContent, 10) || 1;
    const unitPrice = this.currentModalProduct.basePrice + sizePrice + toppingTotal;
    const total = unitPrice * qty;

    document.getElementById('modal-calculated-total').textContent = this.formatMoney(total);
  }

  // ─── Drawer Open / Close ───
  openDrawer() {
    document.getElementById('tmd-drawer-overlay').classList.add('active');
    document.getElementById('tmd-cart-drawer').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  closeDrawer() {
    document.getElementById('tmd-drawer-overlay').classList.remove('active');
    document.getElementById('tmd-cart-drawer').classList.remove('active');
    document.body.style.overflow = '';
  }

  // ─── Update UI Rendering ───
  updateUI() {
    const totalCount = this.getCartCount();
    const totalPrice = this.getCartTotal();

    // Update badges
    document.querySelectorAll('.tmd-cart-badge').forEach(badge => {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });

    const drawerCount = document.getElementById('drawer-count');
    if (drawerCount) drawerCount.textContent = totalCount;

    const drawerTotal = document.getElementById('drawer-total');
    if (drawerTotal) drawerTotal.textContent = this.formatMoney(totalPrice);

    // Freeship bar logic (Freeship threshold: 150.000đ)
    const freeshipNotice = document.getElementById('freeship-notice');
    const freeshipText = document.getElementById('freeship-text');
    const freeshipProgress = document.getElementById('freeship-progress');
    const FREESHIP_TARGET = 150000;

    if (freeshipNotice && freeshipText && freeshipProgress) {
      if (totalPrice === 0) {
        freeshipText.innerHTML = `🎁 Đơn hàng từ <strong>150.000đ</strong> sẽ được <strong>Miễn phí giao hàng</strong>!`;
        freeshipProgress.style.width = '0%';
      } else if (totalPrice >= FREESHIP_TARGET) {
        freeshipText.innerHTML = `🎉 Tuyệt vời! Bạn đã đạt điều kiện <strong>Miễn phí giao hàng</strong>!`;
        freeshipProgress.style.width = '100%';
        freeshipProgress.style.background = 'var(--color-green)';
      } else {
        const remaining = FREESHIP_TARGET - totalPrice;
        const percent = Math.min(100, Math.round((totalPrice / FREESHIP_TARGET) * 100));
        freeshipText.innerHTML = `Mua thêm <strong>${this.formatMoney(remaining)}</strong> để được <strong>FREESHIP</strong>!`;
        freeshipProgress.style.width = `${percent}%`;
      }
    }

    // Render Cart Items List
    const drawerItems = document.getElementById('tmd-drawer-items');
    const checkoutBtn = document.getElementById('drawer-checkout-link');

    if (drawerItems) {
      if (this.cart.length === 0) {
        drawerItems.innerHTML = `
          <div class="cart-empty-state">
            <div class="empty-icon">🧋</div>
            <h4>Giỏ hàng của bạn đang trống</h4>
            <p>Hãy chọn những ly trà thơm ngon từ menu nhé!</p>
            <a href="menu.html" class="btn btn-primary btn-sm" style="margin-top:1rem;" onclick="tmdCart.closeDrawer()">Khám Phá Menu</a>
          </div>
        `;
        if (checkoutBtn) checkoutBtn.classList.add('disabled');
      } else {
        if (checkoutBtn) checkoutBtn.classList.remove('disabled');

        drawerItems.innerHTML = this.cart.map(item => {
          const toppingText = (item.toppings || []).map(t => t.name).join(', ');
          return `
            <div class="cart-item-row" data-key="${item.key}">
              <img src="${item.img}" alt="${item.name}" class="cart-item-img" />
              <div class="cart-item-details">
                <div class="cart-item-title-row">
                  <h4 class="cart-item-name">${item.name}</h4>
                  <button class="cart-item-remove" data-action="delete" data-key="${item.key}" title="Xóa món">&times;</button>
                </div>
                <div class="cart-item-opts">
                  <span class="opt-pill">Size ${item.size}</span>
                  <span class="opt-pill">${item.sugar} đường</span>
                  <span class="opt-pill">${item.ice} đá</span>
                </div>
                ${toppingText ? `<div class="cart-item-toppings"><strong>Topping:</strong> ${toppingText}</div>` : ''}
                ${item.notes ? `<div class="cart-item-notes"><i class="fa-solid fa-pen"></i> ${item.notes}</div>` : ''}
                <div class="cart-item-price-row">
                  <div class="cart-item-price">${this.formatMoney(item.unitPrice * item.quantity)}</div>
                  <div class="cart-item-qty">
                    <button class="qty-btn-sm" data-action="minus" data-key="${item.key}">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-btn-sm" data-action="plus" data-key="${item.key}">+</button>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }
}

// Global instance
window.tmdCart = new TMDCartSystem();
