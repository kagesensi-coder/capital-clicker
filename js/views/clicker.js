const TapGuard = {
  timestamps: [],
  intervals: [],
  blockedUntil: 0,
  lastNoticeAt: 0,
  assess(now = performance.now()) {
    if (now < this.blockedUntil) return { allowed: false, remaining: this.blockedUntil - now };
    const cfg = CONFIG.antiCheat;
    this.timestamps = this.timestamps.filter(time => now - time <= cfg.windowMs);
    if (this.timestamps.length >= cfg.maxEventsPerSecond) {
      this.timestamps = [];
      this.intervals = [];
      this.blockedUntil = now + cfg.cooldownMs;
      return { allowed: false, remaining: cfg.cooldownMs, blocked: true };
    }
    const previous = this.timestamps[this.timestamps.length - 1];
    if (previous !== undefined) {
      const interval = now - previous;
      this.intervals.push(interval);
      this.intervals = this.intervals.slice(-(cfg.regularitySamples - 1));
      if (this.intervals.length >= cfg.regularitySamples - 1 && interval <= cfg.regularityMaxIntervalMs) {
        const spread = Math.max(...this.intervals) - Math.min(...this.intervals);
        if (spread <= cfg.regularityToleranceMs) {
          this.timestamps = [];
          this.intervals = [];
          this.blockedUntil = now + cfg.cooldownMs;
          return { allowed: false, remaining: cfg.cooldownMs, blocked: true };
        }
      } else if (interval > cfg.regularityMaxIntervalMs) this.intervals = [];
    }
    this.timestamps.push(now);
    return { allowed: true };
  }
};

const ClickerView = {
  init() {
    const zone = document.getElementById('tapzone'); if (!zone) return;
    zone.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary) return;
      event.preventDefault(); this.tap(event);
    });
    zone.addEventListener('keydown', event => { if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) { event.preventDefault(); const rect = zone.getBoundingClientRect(); this.tap({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }); } });
  },
  tap(event) {
    const guard = TapGuard.assess();
    if (!guard.allowed) {
      const zone = document.getElementById('tapzone');
      zone?.classList.add('tapzone--cooldown');
      if (guard.blocked) {
        zone?.setAttribute('aria-label', 'Слишком частые одинаковые тапы. Подождите немного.');
        UI.showToast('Слишком частые тапы — подождите секунду', 'error');
        window.setTimeout(() => { zone?.classList.remove('tapzone--cooldown'); zone?.setAttribute('aria-label', 'Нажмите в этой области, чтобы заработать'); }, CONFIG.antiCheat.cooldownMs);
      }
      return;
    }
    const zone = document.getElementById('tapzone'), rect = zone.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top, multipliers = Economy.multipliers();
    const crit = Math.random() < CONFIG.click.critChance * multipliers.crit, amount = Economy.getClickValue() * (crit ? CONFIG.click.critMult : 1);
    State.addMoney(amount); State.addXp(amount); State.data.taps += 1; if (crit) State.data.crits += 1; State.save();
    this.showFloat(x, y, `+${Utils.fmtMoney(amount, false)}${crit ? ' ✦' : ''}`); zone.classList.remove('is-pressed'); requestAnimationFrame(() => zone.classList.add('is-pressed')); setTimeout(() => zone.classList.remove('is-pressed'), 140); TelegramAPI.vibrate(crit ? 'medium' : 'light'); UI.renderBalance(); UI.renderLevel();
  },
  showFloat(x, y, text) { const node = Utils.el('div', 'float-num', text); node.style.left = `${x}px`; node.style.top = `${y}px`; document.getElementById('tapzone')?.appendChild(node); node.addEventListener('animationend', () => node.remove(), { once: true }); }
};
