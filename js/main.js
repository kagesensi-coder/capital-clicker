(() => {
  function tick() {
    const now = Date.now(), previous = State.data.lastTick || now, elapsed = Math.min(Math.max(0, (now - previous) / 1000), 60);
    if (elapsed > 0) State.addMoney(Economy.accruePassive(elapsed));
    const marketChanged = Economy.updateMarket(now);
    State.data.lastTick = now; State.data.lastSeen = now; State.save();
    UI.renderBalance(); UI.renderBoosts(); BusinessView.refreshFuelCard();
    if (marketChanged) { InvestView.refreshMarket(); ProfileView.render(); }
  }
  function boot() {
    TelegramAPI.init(); State.load(); Economy.updateMarket(); UI.init(); ClickerView.init(); BusinessView.init(); InvestView.init(); ItemsView.init(); ProfileView.init(); Nav.init(); UI.renderAll();
    window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { State.data.lastSeen = Date.now(); State.save(); }
      else { State.data.lastTick = Date.now(); State.load(); Economy.updateMarket(); UI.renderAll(); }
    });
    window.addEventListener('pagehide', () => { State.data.lastSeen = Date.now(); State.save(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
