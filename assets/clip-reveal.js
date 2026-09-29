/* Image wipe-up reveal (after ericsin.com's case studies). Each visual is
   uncovered bottom-to-top as it scrolls into view while settling from
   106% to 100% scale. Pairs with the .cr-* rules in shared.css.
   Load with <script src="assets/clip-reveal.js" defer></script>.

   Targets are found automatically. Every gray card (background:
   var(--card)) reveals as one whole box, text and all; an image or video
   inside one goes with its card. Media outside any card is climbed up to
   the outermost wrapper that is still purely visual, so a layered composite
   (a phone bezel over its screens, a video in its rounded frame) reveals
   as one piece. The climb stops at any wrapper that holds text (captions
   stay put), at a scroll column, or where the parent lays out two or more
   visuals side by side (a grid of images reveals item by item).

   Each target animates once. Anything already scrolled past is shown
   instantly, so a fast scroll never leaves blanks. Skipped entirely with
   prefers-reduced-motion. */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Never touched: chrome, hover previews, and the WebGL coin poster
  // (its coins are drawn into one shared canvas, not by these elements).
  var SKIP = 'nav, header, footer, [data-component="nav"], .social-card, .coin-stage, .cr-skip';
  var STOP = 'body, main, section, article, .home-col, .split-stage, [data-component]';
  var MEDIA = 'img, video';

  var seen = new WeakSet();

  function hasText(el) {
    return el.textContent.replace(/\s+/g, '').length > 0;
  }
  function inFlow(el) {
    var p = getComputedStyle(el).position;
    return p !== 'absolute' && p !== 'fixed';
  }
  function isScroller(el) {
    var oy = getComputedStyle(el).overflowY;
    return oy === 'auto' || oy === 'scroll';
  }
  // Two or more in-flow children of `parent` carry media: it's a layout of
  // separate visuals, not one composite.
  function isGallery(parent) {
    var n = 0;
    for (var c = parent.firstElementChild; c; c = c.nextElementSibling) {
      if (inFlow(c) && (c.matches(MEDIA) || c.querySelector(MEDIA))) n++;
      if (n > 1) return true;
    }
    return false;
  }

  // The case-study gray cards (background: var(--card)) are the unit that
  // reveals: the whole box wipes in, whatever is inside it. Resolved to a
  // computed colour once so it can be compared against getComputedStyle.
  var CARD_BG = (function () {
    var probe = document.createElement('div');
    probe.style.background = 'var(--card)';
    document.body.appendChild(probe);
    var c = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return c;
  })();
  function isCard(el) {
    return CARD_BG !== 'rgba(0, 0, 0, 0)' && getComputedStyle(el).backgroundColor === CARD_BG;
  }
  // Outermost gray card around `el`, below the page's layout containers.
  function cardFor(el) {
    var card = null;
    for (var a = el; a && !a.matches(STOP) && !isScroller(a); a = a.parentElement) {
      if (isCard(a)) card = a;
    }
    return card;
  }

  function targetFor(media) {
    var card = cardFor(media);
    if (card) return card;
    var el = media;
    for (;;) {
      var p = el.parentElement;
      if (!p || p.matches(STOP) || isScroller(p) || hasText(p) || isGallery(p)) return el;
      el = p;
    }
  }

  // Small pieces (arrows, avatars, icons) aren't worth a wipe of their own.
  function tiny(el) {
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && (r.width < 64 || r.height < 64);
  }
  // Lightboxes and other fixed overlays stay untouched.
  function inFixed(el) {
    for (var a = el; a && a !== document.body; a = a.parentElement) {
      if (getComputedStyle(a).position === 'fixed') return true;
    }
    return false;
  }

  // Visibility is measured from layout boxes on scroll, not with an
  // IntersectionObserver: the hidden state is a clip-path, and Chrome's
  // observer counts a clipped-away element as not visible, so it would
  // never fire. Each target is checked against the viewport (minus a 40px
  // bottom margin) and every scroll column it sits in (split-scroll pages).
  var pending = [];
  var THRESHOLD = 0.08;

  function check() {
    ticking = false;
    var vh = window.innerHeight;
    pending = pending.filter(function (t) {
      var r = t.el.getBoundingClientRect();
      if (!r.height) return true;
      var top = 0, bottom = vh - 40;
      for (var i = 0; i < t.scrollers.length; i++) {
        var s = t.scrollers[i].getBoundingClientRect();
        top = Math.max(top, s.top);
        bottom = Math.min(bottom, s.bottom);
      }
      if (r.bottom < top) { reveal(t.el, false); return false; } // scrolled past
      var seenPx = Math.min(r.bottom, bottom) - Math.max(r.top, top);
      if (seenPx / r.height >= THRESHOLD || seenPx >= 120) { reveal(t.el, true); return false; }
      return true;
    });
  }
  var ticking = false;
  function schedule() {
    if (ticking || !pending.length) return;
    ticking = true;
    requestAnimationFrame(check);
  }
  window.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);

  function scrollersOf(el) {
    var out = [];
    for (var a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      if (isScroller(a)) out.push(a);
    }
    return out;
  }

  function reveal(el, animate) {
    if (!animate) { el.classList.remove('cr-pending'); return; }
    el.classList.add('cr-in');
    el.addEventListener('animationend', function done(ev) {
      if (ev.target !== el) return;
      el.removeEventListener('animationend', done);
      // Leave no clip-path/scale behind (hover lifts, overflow, etc.)
      el.classList.remove('cr-pending', 'cr-in');
    });
  }

  function scan(root) {
    var all = root.querySelectorAll ? Array.prototype.slice.call(root.querySelectorAll('*')) : [];
    if (root.nodeType === 1) all.unshift(root);
    // Gray cards reveal even when they hold no images (text/diagram cards);
    // outermost first, so a nested card is absorbed by its parent.
    var cards = all.filter(function (el) { return isCard(el) && cardFor(el) === el; });
    var media = all.filter(function (el) { return el.matches(MEDIA); });
    cards.concat(media)
      .forEach(function (m) {
        if (m.closest(SKIP) || inFixed(m)) return;
        var t = m.matches(MEDIA) ? targetFor(m) : m;
        if (seen.has(t) || t.closest(SKIP) || tiny(t)) return;
        // A target nested inside another target is covered by it
        for (var a = t.parentElement; a; a = a.parentElement) if (seen.has(a)) return;
        seen.add(t);
        t.classList.add('cr-pending');
        pending.push({ el: t, scrollers: scrollersOf(t) });
      });
    schedule();
  }

  scan(document.body);

  // Pages that build media after load (React sections, etc.)
  new MutationObserver(function (records) {
    records.forEach(function (r) {
      r.addedNodes.forEach(function (n) { if (n.nodeType === 1) scan(n); });
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
