const ItemsView = {
  refreshAvailability() {
    document.querySelectorAll('#items-grid [data-action]').forEach(button => {
      const item = CONFIG.items.data.find(entry => entry.id === button.dataset.id); if (!item) return;
      const owned = State.items[item.id] || 0, active = item.kind === 'consumable' && Economy.hasActiveBoost(item.id);
      const permanentOwned = item.kind === 'permanent' && owned > 0, action = item.kind === 'consumable' && owned > 0 ? 'activate-item' : 'buy-item';
      const disabled = permanentOwned || active || (action === 'buy-item' && State.data.balance + 1e-8 < item.price);
      button.disabled = disabled;
      button.classList.toggle('disabled', disabled);
    });
  },
  render() {
    const grid = document.getElementById('items-grid'); if (!grid) return; grid.innerHTML = CONFIG.items.data.map(item => {
      const owned = State.items[item.id] || 0, active = item.kind === 'consumable' && Economy.hasActiveBoost(item.id), activeBoost = State.boosts.find(boost => boost.id === item.id);
      const permanentOwned = item.kind === 'permanent' && owned > 0, action = item.kind === 'consumable' && owned > 0 ? 'activate-item' : 'buy-item';
      const label = permanentOwned ? 'Куплено' : active ? `Активен · ${Utils.formatTime((activeBoost.until - Date.now()) / 1000)}` : action === 'activate-item' ? `Активировать (${owned})` : `Купить · ${Utils.fmtCompact(item.price)}`;
      const disabled = permanentOwned || active || (action === 'buy-item' && State.data.balance + 1e-8 < item.price);
      return `<article class="card item-card"><div class="item-card__icon">${item.icon}</div><strong>${Utils.escape(item.name)}</strong><p>${Utils.escape(item.desc)}</p><small>${item.kind === 'permanent' ? 'Постоянное усиление' : active ? 'Эффект уже действует' : `В наличии: ${owned}`}</small><button class="btn btn--primary" data-action="${action}" data-id="${item.id}" ${disabled ? 'disabled' : ''}>${label}</button></article>`;
    }).join('');
    this.refreshAvailability();
  },
  init() { document.getElementById('items-grid')?.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (!button) return; const result = button.dataset.action === 'buy-item' ? Economy.buyItem(button.dataset.id) : Economy.activateItem(button.dataset.id); UI.showToast(result.message, result.ok ? 'success' : 'error'); if (result.ok) { State.save(); UI.renderAll(); } }); }
};
