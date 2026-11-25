/* ============================================================
   TRÀ VIỆT – menu-filter.js
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const filterBtns  = document.querySelectorAll('.filter-btn');
  const toppingTags = document.querySelectorAll('.topping-tag');

  // ─── Filter logic ───
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      document.querySelectorAll('.menu-item').forEach(item => {
        const categories = (item.dataset.category || '').split(/\s+/);
        const show = filter === 'all' || categories.includes(filter);

        if (show) {
          item.classList.remove('hidden');
          item.style.animation = 'fadeInUp 0.4s ease forwards';
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  // ─── Topping toggle ───
  toppingTags.forEach(tag => {
    tag.addEventListener('click', () => {
      tag.classList.toggle('selected');
    });
  });

  // ─── URL param filter ───
  const params = new URLSearchParams(window.location.search);
  const paramFilter = params.get('filter');
  if (paramFilter) {
    const targetBtn = document.querySelector(`[data-filter="${paramFilter}"]`);
    if (targetBtn) {
      setTimeout(() => targetBtn.click(), 200);
    }
  }

  // ─── Hash-based scroll ───
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.boxShadow = '0 0 0 3px var(--color-gold)';
        setTimeout(() => target.style.boxShadow = '', 2000);
      }, 400);
    }
  }

  // ─── Inject fadeInUp keyframe ───
  if (!document.getElementById('filter-keyframes')) {
    const style = document.createElement('style');
    style.id = 'filter-keyframes';
    style.textContent = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

});
