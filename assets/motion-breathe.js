/* ──────────────────────────────────────────────────────────────
   Motion C — "Breathe" · behaviour layer
   Pairs with motion-breathe.css. Vanilla JS, no deps.
   Load with <script src="assets/motion-breathe.js" defer></script>
   ────────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Stagger indices + entrance trigger ──────────────────
     Elements declare their order with data-mo="<index>".
     We copy it into --mo-i so CSS can compute the delay.        */

  function initEntrance() {
    document.querySelectorAll('[data-mo]').forEach(function (el) {
      el.style.setProperty('--mo-i', el.getAttribute('data-mo') || '0');
    });
    // one frame (≈60ms) so the initial state paints before transitioning
    if (reduced) {
      document.documentElement.classList.add('mo-in');
    } else {
      setTimeout(function () {
        document.documentElement.classList.add('mo-in');
      }, 60);
    }
  }

  /* ── 2. Card focus: dim the siblings while one is hovered ──── */

  function initCardFocus() {
    document.querySelectorAll('.home-grid-row, .home-right').forEach(function (grid) {
      grid.addEventListener('mouseover', function (e) {
        if (e.target.closest('.proj-card')) grid.classList.add('mo-focusing');
      });
      grid.addEventListener('mouseout', function (e) {
        if (!e.relatedTarget || !e.relatedTarget.closest('.proj-card')) {
          grid.classList.remove('mo-focusing');
        }
      });
    });
  }

  /* ── 3. Wrap card media in the slow-drift layer ─────────────
     Optional: do this in markup instead if you prefer.          */

  function initDrift() {
    if (reduced) return;
    document.querySelectorAll('.proj-media').forEach(function (media) {
      if (media.querySelector(':scope > .mo-drift')) return;
      var node = media.querySelector(':scope > img, :scope > video');
      if (!node) return;
      var wrap = document.createElement('div');
      wrap.className = 'mo-drift';
      media.insertBefore(wrap, node);
      wrap.appendChild(node);
    });
  }

  function init() {
    initDrift();
    initEntrance();
    initCardFocus();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
