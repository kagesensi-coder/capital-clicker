const ProfileView = {
  render() {
    const values = { balance: State.data.balance, business: 0, stocks: 0, realty: 0, transport: 0, crypto: 0 };
    for (const item of CONFIG.business.data) { const owned = State.business.get(item.id); values[item.category] = (values[item.category] || 0) + item.baseCost * owned.units; }
    for (const category of ['stocks', 'realty', 'crypto']) for (const [id, holding] of Object.entries(State.investments[category])) { const quote = Economy.getMarketQuote(category, id); if (quote) values[category] += quote.price * holding.qty; }
    const grid = document.getElementById('profile-grid'); if (grid) grid.innerHTML = Object.entries(values).map(([key, value]) => `<div class="card stat-card"><small>${({ balance: 'Баланс', business: 'Бизнес', stocks: 'Акции', realty: 'Недвижимость', transport: 'Транспорт', crypto: 'Крипта' })[key]}</small><strong>${Utils.fmtCompact(value)}</strong></div>`).join('');
    const stats = document.getElementById('profile-stats'); if (stats) stats.innerHTML = `<div><strong>Тапы:</strong> ${State.data.taps}</div><div><strong>Критические тапы:</strong> ${State.data.crits}</div><div><strong>Всего заработано:</strong> ${Utils.fmtMoney(State.data.totalEarned, false)}</div><div><strong>В игре:</strong> ${Utils.formatTime((Date.now() - State.data.createdAt) / 1000)}</div>`;
  },
  init() { document.getElementById('btn-reset')?.addEventListener('click', () => { if (!window.confirm('Сбросить весь прогресс?')) return; State.reset(); UI.renderAll(); UI.showToast('Прогресс сброшен'); TelegramAPI.notify('warning'); }); }
};
