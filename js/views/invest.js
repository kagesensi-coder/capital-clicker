const InvestView = {
  category: 'stocks',
  labels: { stocks: 'Акции', realty: 'Недвижимость', crypto: 'Криптовалюта' },
  precision: { stocks: 6, realty: 4, crypto: 8 },
  render() {
    const tabs = document.querySelectorAll('#invest-tabs [data-invest]'); tabs.forEach(tab => tab.classList.toggle('is-active', tab.dataset.invest === this.category));
    const available = document.getElementById('invest-available'), owned = document.getElementById('invest-owned'); if (!available || !owned) return;
    const holdings = State.investments[this.category], digits = this.precision[this.category] || 6;
    available.innerHTML = (CONFIG[this.category]?.data || []).map(item => {
      const quote = Economy.getMarketQuote(this.category, item.id), moving = ['stocks', 'crypto'].includes(this.category);
      const changeClass = quote.changePercent > 0 ? 'market-change--up' : quote.changePercent < 0 ? 'market-change--down' : 'market-change--flat';
      const changeText = quote.changePercent > 0 ? `+${quote.changePercent.toFixed(2)}%` : `${quote.changePercent.toFixed(2)}%`;
      return `<article class="card asset-card" data-asset-card="${item.id}"><div class="asset-card__heading"><strong>${Utils.escape(item.name)}</strong><small>${item.ticker || (this.category === 'realty' ? 'Аренда' : 'Актив')}</small></div><div class="market-quote"><b data-market-price="${item.id}">${Utils.fmtMoney(quote.price, false)}</b>${moving ? `<span class="market-change ${changeClass}" data-market-change="${item.id}">${changeText}</span>` : ''}</div><label class="quantity-label">Количество<input class="asset-quantity" data-quantity="${item.id}" type="number" min="0" step="any" inputmode="decimal" value="1" aria-label="Количество: ${Utils.escape(item.name)}"></label><button class="btn btn--ghost max-quantity" data-action="max-quantity" data-id="${item.id}" type="button">Макс.</button><div class="trade-total" data-total="${item.id}">Итого: ${Utils.fmtMoney(quote.price, false)}</div><button class="btn btn--primary buy-asset" data-action="buy-asset" data-id="${item.id}" type="button">Купить</button></article>`;
    }).join('');
    this.refreshCards(); this.renderOwned();
    const title = document.getElementById('invest-avail-title'); if (title) title.textContent = `${this.labels[this.category]} — доступно для покупки`;
  },
  renderOwned() {
    const owned = document.getElementById('invest-owned'); if (!owned) return;
    const holdings = State.investments[this.category], digits = this.precision[this.category] || 6;
    const rows = Object.entries(holdings).filter(([, holding]) => holding.qty > 0).map(([id, holding]) => {
      const item = Economy.find(this.category, id), quote = Economy.getMarketQuote(this.category, id), currentValue = quote ? quote.price * holding.qty : 0;
      const pnl = quote ? (quote.price - holding.averagePrice) * holding.qty : 0;
      return `<article class="card asset-card owned"><div class="asset-card__heading"><strong>${Utils.escape(item?.name || id)}</strong><small>${Number(holding.qty.toFixed(digits))} шт. · ${Utils.fmtMoney(currentValue, false)}${['stocks', 'crypto'].includes(this.category) ? ` · ${pnl >= 0 ? '+' : ''}${Utils.fmtMoney(pnl, false)}` : ''}</small></div><label class="quantity-label">Количество<input class="sell-quantity" data-sell-quantity="${id}" type="number" min="0" max="${holding.qty}" step="any" inputmode="decimal" value="${Math.min(1, holding.qty)}"></label><button class="btn btn--ghost sell-asset" data-action="sell-asset" data-id="${id}" type="button">Продать</button></article>`;
    }).join('');
    owned.innerHTML = rows || '<div class="empty">Портфель пока пуст</div>';
  },
  refreshMarket() {
    const available = document.getElementById('invest-available');
    if (!available) return;
    available.querySelectorAll('[data-asset-card]').forEach(card => {
      const id = card.dataset.assetCard, item = Economy.find(this.category, id), quote = Economy.getMarketQuote(this.category, id);
      if (!item || !quote) return;
      const priceNode = card.querySelector('[data-market-price]'); if (priceNode) priceNode.textContent = Utils.fmtMoney(quote.price, false);
      const changeNode = card.querySelector('[data-market-change]');
      if (changeNode) {
        changeNode.textContent = `${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`;
        changeNode.classList.toggle('market-change--up', quote.changePercent > 0);
        changeNode.classList.toggle('market-change--down', quote.changePercent < 0);
        changeNode.classList.toggle('market-change--flat', quote.changePercent === 0);
      }
    });
    this.refreshCards(); this.renderOwned();
  },
  refreshCards() {
    document.querySelectorAll('#invest-available [data-asset-card]').forEach(card => {
      const id = card.dataset.assetCard, item = Economy.find(this.category, id), quote = Economy.getMarketQuote(this.category, id), input = card.querySelector('[data-quantity]'); if (!item || !quote || !input) return;
      const quantity = Number(input.value), rawTotal = quote.price * quantity, total = Number.isFinite(quantity) && quantity > 0 ? Economy.roundMoney(rawTotal) : 0;
      const totalNode = card.querySelector('[data-total]'); if (totalNode) totalNode.textContent = `Итого: ${Utils.fmtMoney(total, false)}`;
      const buy = card.querySelector('[data-action="buy-asset"]'); if (buy) buy.disabled = !(quantity > 0 && Number.isFinite(quantity) && total > 0 && rawTotal <= State.data.balance + 1e-8);
    });
  },
  init() {
    document.getElementById('invest-tabs')?.addEventListener('click', event => { const tab = event.target.closest('[data-invest]'); if (tab) { this.category = tab.dataset.invest; State.data.settings.activeTab = 'invest'; this.render(); } });
    document.getElementById('invest-available')?.addEventListener('input', event => { if (event.target.matches('[data-quantity]')) this.refreshCards(); });
    document.getElementById('invest-available')?.addEventListener('click', event => {
      const button = event.target.closest('[data-action]'); if (!button) return; const id = button.dataset.id;
      if (button.dataset.action === 'max-quantity') { const card = button.closest('[data-asset-card]'), input = card?.querySelector('[data-quantity]'); if (input) { input.value = String(Economy.maxQuantity(this.category, id)); this.refreshCards(); } return; }
      const card = button.closest('[data-asset-card]'), input = card?.querySelector('[data-quantity]'), result = Economy.trade(this.category, id, input?.value);
      UI.showToast(result.message, result.ok ? 'success' : 'error'); if (result.ok) { State.save(); UI.renderAll(); }
    });
    document.getElementById('invest-owned')?.addEventListener('click', event => { const button = event.target.closest('[data-action="sell-asset"]'); if (!button) return; const input = document.querySelector(`[data-sell-quantity="${CSS.escape(button.dataset.id)}"]`), result = Economy.sell(this.category, button.dataset.id, input?.value); UI.showToast(result.message, result.ok ? 'success' : 'error'); if (result.ok) { State.save(); UI.renderAll(); } });
  }
};
