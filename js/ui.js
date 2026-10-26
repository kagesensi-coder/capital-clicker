const UI = {
  toastEl: document.getElementById('toasts'),
  showToast(message, type = 'info', ttl = 2800) {
    if (!this.toastEl) return;
    const toast = Utils.el('div', `toast ${type}`, message); this.toastEl.appendChild(toast);
    setTimeout(() => { toast.classList.add('is-leaving'); setTimeout(() => toast.remove(), 250); }, ttl);
  },
  modal: {
    el: document.getElementById('modal'), title: document.getElementById('modal-title'), body: document.getElementById('modal-body'), foot: document.getElementById('modal-foot'),
    open(title, body, foot = '') { this.title.textContent = title; this.body.innerHTML = body; this.foot.innerHTML = foot; this.el.hidden = false; }, close() { this.el.hidden = true; }
  },
  renderBalance() {
    const balance = Utils.fmtMoney(State.data.balance), hour = Economy.getBusinessIncomePerHour() + Economy.getInvestmentIncomePerHour(), sec = Economy.getPassivePerSecond();
    for (const [id, value] of [['earn-balance', balance], ['earn-income-hour', Utils.fmtMoney(hour, false)], ['earn-income-sec', Utils.fmtMoney(sec, false)], ['business-income', `${Utils.fmtMoney(hour, false)} / ч`], ['topbar-income', `${Utils.fmtMoney(hour, false)} / час`], ['profile-networth', Utils.fmtMoney(Economy.getNetWorth(), false)]]) { const node = document.getElementById(id); if (node) node.textContent = value; }
    BusinessView?.refreshAvailability?.(); ItemsView?.refreshAvailability?.();
  },
  renderLevel() {
    const next = Economy.levelRequirement(State.data.level), percent = Math.min(100, State.data.xp / next * 100);
    const values = [['earn-level-badge', State.data.level], ['earn-click-value', Utils.fmtMoney(Economy.getClickValue(), false)], ['tapzone-reward', `+ ${Utils.fmtMoney(Economy.getClickValue(), false)}`], ['earn-xp', `${Math.floor(State.data.xp)} / ${next} XP`], ['earn-level-hint', `До следующего уровня: ${next} XP`]];
    values.forEach(([id, value]) => { const node = document.getElementById(id); if (node) node.textContent = value; }); const fill = document.getElementById('earn-xp-fill'); if (fill) fill.style.width = `${percent}%`;
  },
  renderAll() { this.renderBalance(); this.renderLevel(); BusinessView?.render?.(); InvestView?.render?.(); ItemsView?.render?.(); ProfileView?.render?.(); this.renderBoosts(); },
  renderBoosts() { const box = document.getElementById('active-boosts'); if (!box) return; const boosts = State.boosts; box.hidden = !boosts.length; box.innerHTML = boosts.map(boost => { const item = CONFIG.items.data.find(x => x.id === boost.id); return `<div class="boost"><span>${Utils.escape(item?.icon || '⚡')} ${Utils.escape(item?.name || boost.id)}</span><b>${Utils.formatTime((boost.until - Date.now()) / 1000)}</b></div>`; }).join(''); },
  init() { document.getElementById('btn-theme')?.addEventListener('click', () => { State.toggleTheme(); this.showToast('Тема изменена'); }); document.querySelectorAll('[data-modal-close]').forEach(node => node.addEventListener('click', () => this.modal.close())); }
};
