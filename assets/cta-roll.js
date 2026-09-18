/* Rolling-text CTA hover. Pairs with the .roll-cta / .roll-viewport /
   .roll-row / .roll-char rules in shared.css. Runs once at load to
   split each .roll-cta-label's text into two stacked rows of
   per-character spans — no listeners, no animation frames, nothing
   to clean up after. Load with <script src="assets/cta-roll.js" defer></script>
   after shared.css. */
(function () {
  'use strict';

  function buildRow(chars, duplicate) {
    var row = document.createElement('span');
    row.className = duplicate ? 'roll-row roll-row--duplicate' : 'roll-row';
    if (duplicate) row.setAttribute('aria-hidden', 'true');
    chars.forEach(function (ch, i) {
      var span = document.createElement('span');
      span.className = 'roll-char';
      span.style.setProperty('--ci', i);
      span.textContent = ch;
      row.appendChild(span);
    });
    return row;
  }

  document.querySelectorAll('.roll-cta-label').forEach(function (label) {
    var text = label.textContent.trim();
    if (!text) return;
    var chars = text.split('');
    var viewport = document.createElement('span');
    viewport.className = 'roll-viewport';
    viewport.appendChild(buildRow(chars, false));
    viewport.appendChild(buildRow(chars, true));
    label.textContent = '';
    label.appendChild(viewport);
  });
})();
