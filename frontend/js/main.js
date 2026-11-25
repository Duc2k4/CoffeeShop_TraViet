/* ============================================================
   TRÀ VIỆT – main.js
   ============================================================ */

const TMD_CONTACT = {
  zaloUrl: 'https://zalo.me/0363226006',
  phone: '0363226006'
};

document.addEventListener('DOMContentLoaded', () => {

  // ─── Navbar scroll effect ───
  const navbar = document.getElementById('navbar');
  const onScroll = () => {
    if (window.scrollY > 60) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── Mobile nav toggle ───
  const toggle = document.getElementById('navbar-toggle');
  const nav    = document.getElementById('navbar-nav');
  const closeBtn = document.getElementById('close-nav');

  if (toggle && nav) {
    const open  = () => { nav.classList.add('open'); document.body.style.overflow = 'hidden'; if(closeBtn) closeBtn.style.display = 'block'; };
    const close = () => { nav.classList.remove('open'); document.body.style.overflow = ''; if(closeBtn) closeBtn.style.display = 'none'; };

    toggle.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);

    // close when a link is clicked
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  // ─── Scroll-reveal animation ───
  const animEls = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    animEls.forEach(el => observer.observe(el));
  } else {
    animEls.forEach(el => el.classList.add('is-visible'));
  }

  // ─── Normalize Zalo contact links ───
  document.querySelectorAll('a[href^="https://zalo.me"]').forEach(anchor => {
    anchor.href = TMD_CONTACT.zaloUrl;
  });

  // ─── Smooth scroll for anchor links ───
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ─── Product wishlist toggle ───
  document.querySelectorAll('.product-wishlist').forEach(btn => {
    btn.addEventListener('click', () => {
      const isActive = btn.textContent.trim() === '❤️';
      btn.textContent = isActive ? '🤍' : '❤️';
      btn.style.transform = 'scale(1.3)';
      setTimeout(() => btn.style.transform = '', 300);
    });
  });

  // ─── Offer form handler ───
  window.handleOfferForm = (e) => {
    e.preventDefault();
    const btn = document.getElementById('offer-submit-btn');
    const name = document.getElementById('offer-name')?.value || '';

    if (btn) {
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
      btn.disabled = true;
    }

    setTimeout(() => {
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Mã đã gửi! Kiểm tra tin nhắn của bạn';
        btn.style.background = 'linear-gradient(135deg,#4a7c59,#6ea87e)';
        btn.style.color = '#fff';
      }
      showToast(`🎉 Chào ${name}! Mã giảm giá TRAVIET20 đã gửi về điện thoại của bạn!`);
    }, 1800);
  };

  // ─── Toast notification ───
  window.showToast = (message, duration = 5000) => {
    const existing = document.querySelector('.tv-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'tv-toast';
    toast.innerHTML = message;
    toast.style.cssText = `
      position:fixed; bottom:7rem; left:50%; transform:translateX(-50%) translateY(100px);
      background:#2e5c3e; color:#fff; padding:1rem 2rem; border-radius:50px;
      font-family:'Be Vietnam Pro',sans-serif; font-size:0.92rem; font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,0.25); z-index:9999; max-width:90vw; text-align:center;
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      toast.style.transform = 'translateX(-50%) translateY(100px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, duration);
  };

  // ─── Gallery lightbox (simple) ───
  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:10000;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        animation:fadeIn 0.3s ease;
      `;
      const imgEl = document.createElement('img');
      imgEl.src = img.src;
      imgEl.alt = img.alt;
      imgEl.style.cssText = 'max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain;';
      overlay.appendChild(imgEl);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });

  // ─── Menu filter URL param handling (for collection links) ───
  const urlParams = new URLSearchParams(window.location.search);
  const filter = urlParams.get('filter');
  if (filter && window.location.pathname.includes('menu')) {
    setTimeout(() => {
      const btn = document.querySelector(`[data-filter="${filter}"]`);
      if (btn) btn.click();
    }, 300);
  }

  // ─── Add fadeIn keyframe ───
  if (!document.getElementById('tv-keyframes')) {
    const style = document.createElement('style');
    style.id = 'tv-keyframes';
    style.textContent = `@keyframes fadeIn { from{opacity:0} to{opacity:1} }`;
    document.head.appendChild(style);
  }

});
