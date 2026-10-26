const BusinessView = {
  refreshAvailability() {
    document.querySelectorAll('#business-list [data-action]').forEach(button => {
      const id = button.dataset.id, action = button.dataset.action, owned = State.business.get(id);
      const fleet = Economy.getFleetConfig(id);
      let disabled = false;
      if (action === 'buy-business') disabled = owned.units >= CONFIG.business.maxUnits || State.data.balance + 1e-8 < Economy.getBusinessCost(id);
      if (action === 'merge-business') disabled = owned.units < 2 || owned.merge >= CONFIG.business.maxMerge || State.data.balance + 1e-8 < Economy.getBusinessMergeCost(id);
      if (action === 'buy-vehicle') disabled = owned.units < 1 || owned.fleet >= owned.slots || State.data.balance + 1e-8 < Economy.getFleetVehicleCost(id);
      if (action === 'upgrade-slots') disabled = owned.units < 1 || owned.slots >= fleet.maxSlots || State.data.balance + 1e-8 < Economy.getFleetSlotCost(id);
      if (action === 'buy-fuel') disabled = owned.units < 1 || owned.fuel >= CONFIG.business.fuel.capacity || State.data.balance + 1e-8 < Economy.getFuelTankerCost(id);
      if (action === 'merge-business') button.textContent = owned.merge >= CONFIG.business.maxMerge ? 'Максимальный уровень' : `Слияние · ${Utils.fmtCompact(Economy.getBusinessMergeCost(id))}`;
      if (action === 'buy-vehicle') button.textContent = `Купить ${fleet.shortLabel} · ${Utils.fmtCompact(Economy.getFleetVehicleCost(id))}`;
      if (action === 'upgrade-slots') button.textContent = owned.slots >= fleet.maxSlots ? 'Максимум мест' : `Расширить места · ${Utils.fmtCompact(Economy.getFleetSlotCost(id))}`;
      if (action === 'buy-fuel') button.textContent = owned.fuel >= CONFIG.business.fuel.capacity ? 'Бак полон' : `Цистерна · ${Utils.fmtCompact(Economy.getFuelTankerCost(id))}`;
      button.disabled = disabled;
      button.classList.toggle('disabled', disabled);
    });
  },
  render() {
    const list = document.getElementById('business-list'); if (!list) return;
    let units = 0, merges = 0;
    list.innerHTML = CONFIG.business.data.map(item => {
      const owned = State.business.get(item.id), cost = Economy.getBusinessCost(item.id), mergeCost = Economy.getBusinessMergeCost(item.id), income = Economy.getBusinessIncome(item.id), fleet = Economy.getFleetConfig(item.id);
      units += owned.units; merges += owned.merge;
      let logistics = '';
      if (fleet) logistics = `<div class="business-card__logistics"><span>${Utils.escape(fleet.label)}: ${owned.fleet} / ${owned.slots} мест · ${Math.min(owned.units, owned.fleet)} из ${owned.units} объектов работают</span><div class="business-card__actions"><button class="btn btn--ghost" data-action="buy-vehicle" data-id="${item.id}"></button><button class="btn btn--ghost" data-action="upgrade-slots" data-id="${item.id}"></button></div></div>`;
      if (item.id === 'azs') {
        const fuelConfig = CONFIG.business.fuel, percent = Math.min(100, owned.fuel / fuelConfig.capacity * 100), usagePerHour = owned.units * Math.pow(CONFIG.business.mergeMultiplier, owned.merge) * fuelConfig.consumptionPerHour;
        const remaining = usagePerHour > 0 && owned.fuel > 0 ? Utils.formatTime(owned.fuel / usagePerHour * 3600) : '—';
        logistics = `<div class="business-card__logistics"><span>Топливо: ${Math.floor(owned.fuel)} / ${fuelConfig.capacity} л · примерно ${remaining}</span><div class="fuel-meter" role="meter" aria-valuemin="0" aria-valuemax="${fuelConfig.capacity}" aria-valuenow="${Math.floor(owned.fuel)}"><div class="fuel-meter__fill" style="width:${percent}%"></div></div><small>${owned.fuel > 0 ? 'АЗС работает' : 'Доход приостановлен — нужна цистерна топлива'}</small><button class="btn btn--ghost" data-action="buy-fuel" data-id="azs"></button></div>`;
      }
      return `<article class="card business-card" data-business-card="${item.id}"><div class="business-card__header"><span class="business-card__icon">${item.icon}</span><div><strong>${Utils.escape(item.name)}</strong><small>${Utils.escape(item.category)}</small></div></div><div class="business-card__stats"><span>${owned.units} / ${CONFIG.business.maxUnits} объектов · уровень слияния ${owned.merge} / ${CONFIG.business.maxMerge}</span><span>${Utils.fmtMoney(income, false)} / ч</span></div>${logistics}<div class="business-card__actions"><button class="btn btn--primary" data-action="buy-business" data-id="${item.id}">${owned.units >= CONFIG.business.maxUnits ? 'Максимум 20' : `Открыть · ${Utils.fmtCompact(cost)}`}</button><button class="btn btn--ghost" data-action="merge-business" data-id="${item.id}">${owned.merge >= CONFIG.business.maxMerge ? 'Максимальный уровень' : `Слияние · ${Utils.fmtCompact(mergeCost)}`}</button></div></article>`;
    }).join('');
    const unitsNode = document.getElementById('business-units'); if (unitsNode) unitsNode.textContent = `${units} объектов · ${merges} слияний`;
    this.refreshAvailability();
  },
  refreshFuelCard() {
    const card = document.querySelector('#business-list [data-business-card="azs"]'); if (!card) return;
    const owned = State.business.get('azs'), config = CONFIG.business.fuel, usagePerHour = owned.units * Math.pow(CONFIG.business.mergeMultiplier, owned.merge) * config.consumptionPerHour;
    const remaining = usagePerHour > 0 && owned.fuel > 0 ? Utils.formatTime(owned.fuel / usagePerHour * 3600) : '—';
    const text = card.querySelector('.business-card__logistics > span'); if (text) text.textContent = `Топливо: ${Math.floor(owned.fuel)} / ${config.capacity} л · примерно ${remaining}`;
    const meter = card.querySelector('.fuel-meter'); if (meter) { meter.setAttribute('aria-valuenow', String(Math.floor(owned.fuel))); const fill = meter.querySelector('.fuel-meter__fill'); if (fill) fill.style.width = `${Math.min(100, owned.fuel / config.capacity * 100)}%`; }
    const status = card.querySelector('.business-card__logistics small'); if (status) status.textContent = owned.fuel > 0 ? 'АЗС работает' : 'Доход приостановлен — нужна цистерна топлива';
  },
  init() {
    document.getElementById('business-list')?.addEventListener('click', event => {
      const button = event.target.closest('[data-action]'); if (!button) return;
      const { action, id } = button.dataset;
      const operations = { 'buy-business': () => Economy.buyBusiness(id), 'merge-business': () => Economy.mergeBusiness(id), 'buy-vehicle': () => Economy.buyFleetVehicle(id), 'upgrade-slots': () => Economy.upgradeFleetSlots(id), 'buy-fuel': () => Economy.buyFuelTanker(id) };
      const operation = operations[action]; if (!operation) return;
      const result = operation(); UI.showToast(result.message, result.ok ? 'success' : 'error');
      if (result.ok) { TelegramAPI.notify('success'); State.save(); UI.renderAll(); }
    });
  }
};
