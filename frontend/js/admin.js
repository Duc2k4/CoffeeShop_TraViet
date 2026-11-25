/* ============================================================
   TRÀ VIỆT – admin.js
   Logic Quản trị Real-Time, Kitchen KDS & SSE Event Listener
   ============================================================ */

class TMDAdminDashboard {
  constructor() {
    this.orders = [];
    this.menuItems = [];
    this.currentFilter = 'all';
    this.soundEnabled = true;
    this.sseSource = null;

    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.bindTabNavigation();
      this.fetchInitialData();
      this.connectSSE();
      this.bindEvents();
    });
  }

  // ─── Fetch Initial Data ───
  async fetchInitialData() {
    try {
      const [resOrders, resMenu] = await Promise.all([
        fetch('/api/orders').catch(() => null),
        fetch('/api/menu').catch(() => null)
      ]);

      if (resOrders && resOrders.ok) {
        this.orders = await resOrders.json();
      } else {
        // Fallback sample
        this.orders = this.getFallbackOrders();
      }

      if (resMenu && resMenu.ok) {
        this.menuItems = await resMenu.json();
      } else {
        this.menuItems = this.getFallbackMenu();
      }

      this.renderMetrics();
      this.renderKDS();
      this.renderMenuTable();
      this.populateWebhookSelect();
    } catch (e) {
      console.error('Error fetching admin data:', e);
    }
  }

  // ─── Connect Real-Time SSE Stream ───
  connectSSE() {
    const badge = document.getElementById('sse-status-badge');
    
    try {
      this.sseSource = new EventSource('/api/orders/stream');

      this.sseSource.addEventListener('connected', () => {
        if (badge) {
          badge.className = 'sse-status-pill online';
          badge.innerHTML = '<i class="fa-solid fa-signal"></i> SSE Real-Time Active';
        }
      });

      // Handle New Incoming Order!
      this.sseSource.addEventListener('newOrder', (e) => {
        const newOrder = JSON.parse(e.data);
        console.log('⚡ [SSE ALERT] Đơn hàng mới:', newOrder);

        this.orders.unshift(newOrder);
        this.playChimeSound();
        this.renderMetrics();
        this.renderKDS(newOrder.id);
        this.populateWebhookSelect();

        if (window.tmdShowToast) {
          window.tmdShowToast(`🔔 ĐƠN HÀNG MỚI: ${newOrder.id} - ${newOrder.customer.fullname || 'Khách'}`);
        }
      });

      // Handle Order Updates
      this.sseSource.addEventListener('orderUpdated', (e) => {
        const updated = JSON.parse(e.data);
        const idx = this.orders.findIndex(o => o.id === updated.id);
        if (idx > -1) this.orders[idx] = updated;
        this.renderMetrics();
        this.renderKDS();
        this.populateWebhookSelect();
      });

      // Handle Menu Updates
      this.sseSource.addEventListener('menuUpdated', () => {
        this.fetchMenuData();
      });

      this.sseSource.onerror = () => {
        if (badge) {
          badge.className = 'sse-status-pill';
          badge.innerHTML = '<i class="fa-solid fa-wifi"></i> Offline (Thử lại...)';
        }
      };
    } catch (e) {
      console.log('SSE not supported or server offline fallback');
    }
  }

  async fetchMenuData() {
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        this.menuItems = await res.json();
        this.renderMenuTable();
      }
    } catch (e) {}
  }

  // ─── Synthesize Audio Sound Chime ───
  playChimeSound() {
    if (!this.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch (e) {
      console.log('Audio chime error:', e);
    }
  }

  // ─── Render Analytics Metrics ───
  renderMetrics() {
    const todayOrders = this.orders;
    const totalCount = todayOrders.length;
    const pendingCount = todayOrders.filter(o => o.orderStatus === 'pending').length;
    const completedCount = todayOrders.filter(o => o.orderStatus === 'completed').length;
    const revenue = todayOrders
      .filter(o => o.orderStatus !== 'cancelled')
      .reduce((sum, o) => sum + (o.grandTotal || 0), 0);

    document.getElementById('metric-revenue').textContent = revenue.toLocaleString('vi-VN') + 'đ';
    document.getElementById('metric-total-orders').textContent = totalCount;
    document.getElementById('metric-pending-orders').textContent = pendingCount;
    document.getElementById('metric-completed-orders').textContent = completedCount;
  }

  // ─── Render KDS Kitchen Orders ───
  renderKDS(highlightId = null) {
    const container = document.getElementById('kds-orders-container');
    if (!container) return;

    let filtered = this.orders;
    if (this.currentFilter !== 'all') {
      filtered = this.orders.filter(o => o.orderStatus === this.currentFilter);
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:4rem;background:rgba(0,0,0,0.2);border-radius:12px;">
          <div style="font-size:3rem;">☕</div>
          <h4 style="color:#fff;margin-top:0.5rem;">Không có đơn hàng nào trong mục này</h4>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(o => {
      const isNew = o.id === highlightId;
      const c = o.customer || {};
      const statusTextMap = {
        pending: 'Mới / Đợi pha chế',
        brewing: 'Đang pha chế',
        delivering: 'Đang giao hàng',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy'
      };

      return `
        <div class="order-card ${isNew ? 'new-pulse' : ''}" data-id="${o.id}">
          <div class="order-header">
            <div>
              <div class="order-id">${o.id}</div>
              <div class="order-time"><i class="fa-regular fa-clock"></i> ${this.formatTime(o.createdAt)}</div>
            </div>
            <span class="status-badge ${o.orderStatus}">${statusTextMap[o.orderStatus] || o.orderStatus}</span>
          </div>

          <div class="order-customer">
            <p><strong>👤 ${c.fullname || 'Khách lẻ'}</strong> - 📞 ${c.phone || 'N/A'}</p>
            <p>📍 ${c.address || 'Tại quán'}</p>
            ${c.notes ? `<p style="color:var(--color-gold);margin-top:0.3rem;"><i class="fa-solid fa-pen"></i> Ghi chú: ${c.notes}</p>` : ''}
          </div>

          <div class="order-items-list">
            ${(o.items || []).map(item => `
              <div class="kds-item-row">
                <div>
                  <strong>x${item.quantity} ${item.name}</strong>
                  <div class="kds-item-opts">Size ${item.size} | ${item.sugar} | ${item.ice}</div>
                  ${(item.toppings || []).length ? `<div style="font-size:0.7rem;color:#81c784;">+ Topping: ${item.toppings.map(t=>t.name).join(', ')}</div>` : ''}
                </div>
                <div style="font-weight:700;">${(item.unitPrice * item.quantity).toLocaleString('vi-VN')}đ</div>
              </div>
            `).join('')}
          </div>

          <div class="order-footer">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.9rem;">
              <span>Thanh toán: <strong style="color:${o.paymentStatus==='paid'?'#81c784':'#ffb74d'};">${o.paymentStatus==='paid'?'Đã TT':'Chưa TT'} (${(o.paymentMethod||'COD').toUpperCase()})</strong></span>
              <strong style="font-size:1.15rem;color:var(--color-gold);">${(o.grandTotal||0).toLocaleString('vi-VN')}đ</strong>
            </div>

            <div class="kds-action-btns">
              ${o.orderStatus === 'pending' ? `<button class="kds-btn" style="background:#2196f3;color:#fff;" onclick="tmdAdmin.updateOrderStatus('${o.id}', 'brewing')">Pha Chế</button>` : ''}
              ${o.orderStatus === 'brewing' ? `<button class="kds-btn" style="background:#9c27b0;color:#fff;" onclick="tmdAdmin.updateOrderStatus('${o.id}', 'delivering')">Cho Giao Hàng</button>` : ''}
              ${o.orderStatus === 'delivering' ? `<button class="kds-btn" style="background:#4caf50;color:#fff;" onclick="tmdAdmin.updateOrderStatus('${o.id}', 'completed')">Hoàn Thành</button>` : ''}
              ${o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled' ? `<button class="kds-btn" style="background:#f44336;color:#fff;" onclick="tmdAdmin.updateOrderStatus('${o.id}', 'cancelled')">Hủy Đơn</button>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // ─── Update Order Status ───
  async updateOrderStatus(id, newStatus) {
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: newStatus })
      });

      if (res.ok) {
        const updated = await res.json();
        const idx = this.orders.findIndex(o => o.id === id);
        if (idx > -1) this.orders[idx] = updated;
        this.renderMetrics();
        this.renderKDS();
      } else {
        // Fallback local update
        const order = this.orders.find(o => o.id === id);
        if (order) {
          order.orderStatus = newStatus;
          this.renderMetrics();
          this.renderKDS();
        }
      }
    } catch (e) {
      console.error('Update order status error:', e);
    }
  }

  // ─── Render Menu Management Table & Stock Toggle ───
  renderMenuTable() {
    const tbody = document.getElementById('admin-menu-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.menuItems.map(item => `
      <tr>
        <td><img src="${item.img}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;" /></td>
        <td><strong>${item.name}</strong></td>
        <td><span class="meta-tag">${item.category || 'Trà'}</span></td>
        <td style="font-weight:700;color:var(--color-gold);">${(item.basePrice||0).toLocaleString('vi-VN')}đ</td>
        <td>
          <label class="switch">
            <input type="checkbox" ${item.isOutOfStock ? 'checked' : ''} onchange="tmdAdmin.toggleStock('${item.id}')" />
            <span class="slider"></span>
          </label>
          <span style="font-size:0.75rem;margin-left:0.5rem;color:${item.isOutOfStock?'#f44336':'#81c784'};">
            ${item.isOutOfStock ? 'HẾT HÀNG' : 'Còn hàng'}
          </span>
        </td>
        <td>
          <button style="color:#f44336;font-size:1rem;" onclick="tmdAdmin.deleteMenuItem('${item.id}')" title="Xóa món"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  // ─── Toggle Stock State ───
  async toggleStock(id) {
    try {
      const res = await fetch(`/api/menu/${id}/toggle-stock`, { method: 'PATCH' });
      if (res.ok) {
        const item = await res.json();
        const idx = this.menuItems.findIndex(i => i.id === id);
        if (idx > -1) this.menuItems[idx] = item;
        this.renderMenuTable();
      } else {
        const item = this.menuItems.find(i => i.id === id);
        if (item) {
          item.isOutOfStock = !item.isOutOfStock;
          this.renderMenuTable();
        }
      }
    } catch (e) {
      console.error('Toggle stock error:', e);
    }
  }

  // ─── Delete Menu Item ───
  async deleteMenuItem(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi menu?')) return;
    try {
      await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      this.menuItems = this.menuItems.filter(i => i.id !== id);
      this.renderMenuTable();
    } catch (e) {}
  }

  // ─── Populate Webhook Select ───
  populateWebhookSelect() {
    const sel = document.getElementById('sim-order-select');
    if (!sel) return;

    const pendingOrders = this.orders.filter(o => o.paymentStatus !== 'paid');
    if (pendingOrders.length === 0) {
      sel.innerHTML = `<option value="">-- Tất cả đơn hàng đã được thanh toán --</option>`;
      return;
    }

    sel.innerHTML = pendingOrders.map(o => `
      <option value="${o.id}">${o.id} - ${o.customer.fullname || 'Khách'} (${(o.grandTotal||0).toLocaleString('vi-VN')}đ)</option>
    `).join('');
  }

  // ─── Trigger Mock Webhook ───
  async triggerWebhook() {
    const sel = document.getElementById('sim-order-select');
    const amountInput = document.getElementById('sim-amount');
    const log = document.getElementById('webhook-log');

    const orderId = sel ? sel.value : null;
    const amount = amountInput ? parseInt(amountInput.value, 10) : 0;

    if (!orderId) {
      alert('Vui lòng chọn đơn hàng cần giả lập thanh toán!');
      return;
    }

    if (log) log.innerHTML = `> Đang phát tín hiệu Webhook VietQR cho ${orderId}...`;

    try {
      const res = await fetch('/api/payment/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount })
      });

      if (res.ok) {
        const data = await res.json();
        if (log) log.innerHTML = `> ✅ BÁO CÁO WEBHOOK THÀNH CÔNG:\n${JSON.stringify(data, null, 2)}`;
        
        const order = this.orders.find(o => o.id === orderId);
        if (order) order.paymentStatus = 'paid';
        
        this.renderMetrics();
        this.renderKDS();
        this.populateWebhookSelect();
      }
    } catch (e) {
      if (log) log.innerHTML = `> ⚠️ Webhook offline mode - Đã cập nhật trạng thái địa phương cho ${orderId}`;
      const order = this.orders.find(o => o.id === orderId);
      if (order) order.paymentStatus = 'paid';
      this.renderMetrics();
      this.renderKDS();
    }
  }

  // ─── UI Bind Events ───
  bindTabNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        const targetId = tab.dataset.tab;
        const targetContent = document.getElementById(targetId);
        if (targetContent) targetContent.style.display = 'block';
      });
    });
  }

  bindEvents() {
    // Sound Toggle
    const soundBtn = document.getElementById('btn-toggle-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        soundBtn.innerHTML = this.soundEnabled
          ? '<i class="fa-solid fa-volume-high"></i> Chuông Báo'
          : '<i class="fa-solid fa-volume-xmark"></i> Tắt Chuông';
      });
    }

    // KDS Filter Buttons
    document.querySelectorAll('.kds-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.kds-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderKDS();
      });
    });

    // Add Menu Modal
    const modal = document.getElementById('add-menu-modal');
    const overlay = document.getElementById('add-menu-overlay');
    const openBtn = document.getElementById('btn-open-add-menu-modal');
    const closeBtn = document.getElementById('add-menu-close');
    const saveBtn = document.getElementById('btn-save-new-product');

    if (openBtn) {
      openBtn.addEventListener('click', () => {
        overlay.classList.add('active');
        modal.classList.add('active');
      });
    }

    const closeModalFn = () => {
      overlay.classList.remove('active');
      modal.classList.remove('active');
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModalFn);
    if (overlay) overlay.addEventListener('click', closeModalFn);

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const name = document.getElementById('new-p-name').value.trim();
        const price = parseInt(document.getElementById('new-p-price').value, 10);
        const category = document.getElementById('new-p-cat').value;
        const img = document.getElementById('new-p-img').value || 'images/product_lotus.png';
        const desc = document.getElementById('new-p-desc').value.trim();

        if (!name || !price) {
          alert('Vui lòng điền Tên sản phẩm và Giá tiền!');
          return;
        }

        const payload = {
          id: 'p_' + Math.random().toString(36).substr(2, 6),
          name, basePrice: price, category, img, desc, isOutOfStock: false
        };

        try {
          const res = await fetch('/api/menu', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (res.ok) {
            const newItem = await res.json();
            this.menuItems.push(newItem);
          } else {
            this.menuItems.push(payload);
          }
        } catch (e) {
          this.menuItems.push(payload);
        }

        this.renderMenuTable();
        closeModalFn();
      });
    }

    // Webhook Trigger Button
    const webhookBtn = document.getElementById('btn-trigger-webhook');
    if (webhookBtn) webhookBtn.addEventListener('click', () => this.triggerWebhook());
  }

  // ─── Utility Helpers ───
  formatTime(isoStr) {
    if (!isoStr) return 'Vừa xong';
    const date = new Date(isoStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }

  getFallbackOrders() {
    return [
      {
        id: '#TV-849201',
        customer: { fullname: 'Nguyễn Văn An', phone: '0987654321', address: '123 Lê Lợi, Q.1', notes: 'Cho ít ngọt' },
        items: [{ name: 'Trà Ô Long Kem Sữa', size: 'L', sugar: '70%', ice: '50%', quantity: 2, unitPrice: 59000, toppings: [{ name: 'Trân châu đen' }] }],
        grandTotal: 118000, paymentMethod: 'vietqr', paymentStatus: 'paid', orderStatus: 'pending', createdAt: new Date().toISOString()
      }
    ];
  }

  getFallbackMenu() {
    return [
      { id: 'sen-vang', name: 'Trà Sen Vàng', basePrice: 38000, img: 'images/product_lotus.png', category: 'nguyen-ban', isOutOfStock: false },
      { id: 'oolong-cream', name: 'Trà Ô Long Kem Sữa', basePrice: 45000, img: 'images/product_oolong.png', category: 'tra-sua', isOutOfStock: false }
    ];
  }
}

// Global instance
window.tmdAdmin = new TMDAdminDashboard();
