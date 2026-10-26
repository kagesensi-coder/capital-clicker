const Utils = {
  finite(value, fallback = 0) {
    return Number.isFinite(Number(value)) ? Number(value) : fallback;
  },
  positive(value, fallback = 0) {
    return Math.max(0, this.finite(value, fallback));
  },
  fmtMoney(value, withSpace = true) {
    const number = this.finite(value);
    const sign = number < 0 ? '−' : '';
    const fixed = Math.abs(number).toFixed(2).replace('.', ',');
    const [whole, decimals] = fixed.split(',');
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sign}$${withSpace ? ' ' : ''}${grouped},${decimals}`;
  },
  fmtCompact(value) {
    const number = this.positive(value);
    const units = [[1e12, 'Т'], [1e9, 'Б'], [1e6, 'М'], [1e3, 'К']];
    for (const [threshold, suffix] of units) {
      if (number >= threshold) return `$${(number / threshold).toFixed(1).replace(/\.0$/, '').replace('.', ',')}${suffix}`;
    }
    return this.fmtMoney(number, false);
  },
  formatTime(seconds) {
    let left = Math.max(0, Math.floor(this.finite(seconds)));
    const hours = Math.floor(left / 3600); left %= 3600;
    const minutes = Math.floor(left / 60); const secs = left % 60;
    return [hours && `${hours} ч`, minutes && `${minutes} мин`, secs && `${secs} с`].filter(Boolean).join(' ') || '0 с';
  },
  escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  },
  el(tag, className = '', text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  },
  $(selector, root = document) { return root.querySelector(selector); },
  $$(selector, root = document) { return [...root.querySelectorAll(selector)]; },
  uid() { return `id-${Math.random().toString(36).slice(2, 10)}`; }
};
