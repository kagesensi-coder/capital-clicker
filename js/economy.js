const Economy = {
  find(category, id) { return CONFIG[category]?.data.find(item => item.id === id); },
  levelRequirement(level) { return Math.floor(CONFIG.levelXp.base * Math.pow(CONFIG.levelXp.exp, Math.max(1, level))); },
  multipliers() {
    let tap = 1, passive = 1, invest = 1, crit = 1, offline = 1;
    for (const item of CONFIG.items.data) if (State.items[item.id] > 0 && item.kind === 'permanent') {
      if (item.effect === 'tap') tap *= item.mult; if (item.effect === 'passive') passive *= item.mult;
      if (item.effect === 'invest') invest *= item.mult; if (item.effect === 'all') { tap *= item.mult; passive *= item.mult; invest *= item.mult; } if (item.effect === 'offline') offline *= item.mult;
    }
    for (const boost of State.boosts) { const item = CONFIG.items.data.find(x => x.id === boost.id); if (!item) continue; if (item.effect === 'tap') tap *= item.mult; if (item.effect === 'passive') passive *= item.mult; if (item.effect === 'crit') crit *= item.mult; }
    return { tap, passive, invest, crit, offline };
  },
  getClickValue() { return Math.round(CONFIG.click.base * Math.pow(State.data.level, CONFIG.click.exp) * this.multipliers().tap * 100) / 100; },
  roundMoney(value) { return Math.round((value + Number.EPSILON) * 100) / 100; },
  hasActiveBoost(id) { return State.boosts.some(boost => boost.id === id && boost.until > Date.now()); },
  maxQuantity(category, id) { const quote = this.getMarketQuote(category, id); if (!quote || quote.price <= 0) return 0; return Math.floor((State.data.balance / quote.price + 1e-10) * 1e8) / 1e8; },
  getMarketQuote(category, id) {
    const item = this.find(category, id); if (!item) return null;
    if (!['stocks', 'crypto'].includes(category)) return { price: item.price, previousPrice: item.price, changePercent: 0 };
    return State.data.market?.quotes?.[category]?.[id] || { price: item.price, previousPrice: item.price, changePercent: 0 };
  },
  updateMarket(now = Date.now(), random = Math.random) {
    const market = State.data.market || (State.data.market = State.initialMarket(now));
    const interval = CONFIG.market.updateIntervalMs;
    const elapsed = Math.max(0, now - market.updatedAt);
    const steps = Math.min(CONFIG.market.maxCatchUpSteps, Math.floor(elapsed / interval));
    if (!steps) return false;
    for (let step = 0; step < steps; step++) {
      for (const category of ['stocks', 'crypto']) for (const item of CONFIG[category].data) {
        const quote = market.quotes[category][item.id];
        const volatility = CONFIG.market.volatility[category];
        const drift = (item.drift ?? CONFIG.market.drift) * (random() < 0.5 ? -1 : 1);
        const shock = (random() * 2 - 1) * volatility;
        const min = item.price * CONFIG.market.minPriceFactor, max = item.price * CONFIG.market.maxPriceFactor;
        const previousPrice = quote.price;
        const price = Math.min(max, Math.max(min, previousPrice * (1 + drift + shock)));
        quote.previousPrice = previousPrice;
        quote.price = Math.round(price * 1e8) / 1e8;
        quote.changePercent = previousPrice > 0 ? (quote.price / previousPrice - 1) * 100 : 0;
      }
    }
    market.updatedAt += steps * interval;
    if (steps === CONFIG.market.maxCatchUpSteps && now - market.updatedAt >= interval) market.updatedAt = now;
    return true;
  },
  getBusinessCost(id) { const item = this.find('business', id); if (!item) return Infinity; const owned = State.business.get(id); return this.roundMoney(item.baseCost * Math.pow(CONFIG.business.costGrowth, owned.units + owned.merge)); },
  getBusinessMergeCost(id) { const item = this.find('business', id); if (!item) return Infinity; const owned = State.business.get(id); return this.roundMoney(item.baseCost * CONFIG.business.mergeCostFactor * Math.pow(CONFIG.business.costGrowth, owned.units + owned.merge - 2)); },
  getFleetConfig(id) { return CONFIG.business.fleet[id] || null; },
  getBusinessIncome(id) {
    const item = this.find('business', id), owned = State.business.get(id); if (!item) return 0;
    const multiplier = Math.pow(CONFIG.business.mergeMultiplier, owned.merge);
    if (id === 'azs') return owned.fuel > 0 ? item.baseIncome * owned.units * multiplier : 0;
    const fleet = this.getFleetConfig(id);
    return item.baseIncome * (fleet ? Math.min(owned.units, owned.fleet) : owned.units) * multiplier;
  },
  getBusinessIncomePerHour() { return CONFIG.business.data.reduce((sum, item) => sum + this.getBusinessIncome(item.id), 0); },
  getFleetVehicleCost(id) { const item = this.find('business', id), fleet = this.getFleetConfig(id); return item && fleet ? this.roundMoney(item.baseCost * fleet.vehicleCostFactor) : Infinity; },
  getFleetSlotCost(id) { const item = this.find('business', id), fleet = this.getFleetConfig(id), owned = State.business.get(id); if (!item || !fleet) return Infinity; const upgrades = Math.max(0, Math.floor((owned.slots - fleet.initialSlots) / fleet.slotStep)); return this.roundMoney(item.baseCost * fleet.vehicleCostFactor * fleet.slotCostFactor * Math.pow(fleet.slotCostGrowth, upgrades)); },
  getFuelTankerCost(id = 'azs') { const item = this.find('business', id); return item && id === 'azs' ? this.roundMoney(item.baseCost * CONFIG.business.fuel.tankerCostFactor) : Infinity; },
  getInvestmentIncomePerHour() {
    let total = 0; const mult = this.multipliers().invest;
    for (const category of ['stocks', 'realty', 'crypto']) for (const [id, holding] of Object.entries(State.investments[category])) { const item = this.find(category, id); if (!item) continue; const price = this.getMarketQuote(category, id).price; const income = category === 'realty' ? item.rent : price * (item.yieldPercent || 0); total += income * holding.qty * mult; }
    return total;
  },
  accruePassive(elapsedSeconds) {
    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    if (!elapsed) return 0;
    let amount = 0;
    const ordinaryBusinessIncome = CONFIG.business.data.reduce((sum, item) => item.id === 'azs' ? sum : sum + this.getBusinessIncome(item.id), 0);
    amount += (ordinaryBusinessIncome + this.getInvestmentIncomePerHour()) * elapsed / 3600;
    const azs = State.business.get('azs'), azsItem = this.find('business', 'azs');
    if (azsItem && azs.units > 0 && azs.fuel > 0) {
      const output = azs.units * Math.pow(CONFIG.business.mergeMultiplier, azs.merge);
      const fuelRate = output * CONFIG.business.fuel.consumptionPerHour;
      const fundedHours = Math.min(elapsed / 3600, azs.fuel / fuelRate);
      amount += azsItem.baseIncome * output * fundedHours;
      azs.fuel = Math.max(0, azs.fuel - fuelRate * fundedHours);
    }
    return amount * this.multipliers().passive;
  },
  getPassivePerSecond() { return (this.getBusinessIncomePerHour() + this.getInvestmentIncomePerHour()) / 3600 * this.multipliers().passive; },
  getOfflineMultiplier() { return this.multipliers().offline; },
  getNetWorth() {
    let total = State.data.balance;
    for (const item of CONFIG.business.data) { const owned = State.business.get(item.id); for (let i = 0; i < owned.units; i++) total += item.baseCost * Math.pow(CONFIG.business.costGrowth, i + owned.merge); }
    for (const category of ['stocks', 'realty', 'crypto']) for (const [id, holding] of Object.entries(State.investments[category])) { const quote = this.getMarketQuote(category, id); if (quote) total += quote.price * holding.qty; }
    for (const item of CONFIG.items.data) total += (State.items[item.id] || 0) * item.price * CONFIG.items.resaleRate;
    for (const item of CONFIG.business.data) {
      const owned = State.business.get(item.id), fleet = this.getFleetConfig(item.id);
      if (fleet) total += owned.fleet * this.getFleetVehicleCost(item.id) * CONFIG.items.resaleRate;
      if (item.id === 'azs') total += owned.fuel * (this.getFuelTankerCost('azs') / CONFIG.business.fuel.tankerSize) * CONFIG.items.resaleRate;
    }
    return this.roundMoney(total);
  },
  buyBusiness(id) { const item = this.find('business', id), owned = State.business.get(id), cost = this.getBusinessCost(id); if (!item) return { ok: false, message: 'Бизнес не найден' }; if (owned.units >= CONFIG.business.maxUnits) return { ok: false, message: 'Достигнут лимит 20 бизнесов' }; if (!Number.isFinite(cost) || State.data.balance + 1e-8 < cost) return { ok: false, message: 'Недостаточно средств' }; State.data.balance = this.roundMoney(Math.max(0, State.data.balance - cost)); State.business.add(id); return { ok: true, message: 'Бизнес открыт' }; },
  mergeBusiness(id) {
    const owned = State.business.get(id), cost = this.getBusinessMergeCost(id);
    if (!this.find('business', id)) return { ok: false, message: 'Бизнес не найден' };
    if (owned.units < 2) return { ok: false, message: 'Нужно минимум 2 одинаковых бизнеса' };
    if (owned.merge >= CONFIG.business.maxMerge) return { ok: false, message: 'Достигнут максимальный уровень слияния' };
    if (!Number.isFinite(cost) || State.data.balance + 1e-8 < cost) return { ok: false, message: 'Недостаточно средств для слияния' };
    State.data.balance = this.roundMoney(Math.max(0, State.data.balance - cost));
    State.business.remove(id, 1);
    State.data.businesses[id].merge += 1;
    return { ok: true, message: 'Бизнесы объединены' };
  },
  buyFleetVehicle(id) {
    const fleet = this.getFleetConfig(id), item = this.find('business', id), owned = State.business.get(id), cost = this.getFleetVehicleCost(id);
    if (!item || !fleet || owned.units < 1) return { ok: false, message: 'Сначала откройте бизнес' };
    if (owned.fleet >= owned.slots) return { ok: false, message: 'Нет свободных мест — расширьте вместимость' };
    if (State.data.balance + 1e-8 < cost) return { ok: false, message: 'Недостаточно средств' };
    State.data.balance = this.roundMoney(Math.max(0, State.data.balance - cost));
    State.data.businesses[id].fleet += 1;
    return { ok: true, message: `${fleet.shortLabel} добавлены` };
  },
  upgradeFleetSlots(id) {
    const fleet = this.getFleetConfig(id), owned = State.business.get(id), cost = this.getFleetSlotCost(id);
    if (!fleet || owned.units < 1) return { ok: false, message: 'Сначала откройте бизнес' };
    if (owned.slots >= fleet.maxSlots) return { ok: false, message: 'Достигнута максимальная вместимость' };
    if (State.data.balance + 1e-8 < cost) return { ok: false, message: 'Недостаточно средств' };
    State.data.balance = this.roundMoney(Math.max(0, State.data.balance - cost));
    State.data.businesses[id].slots = Math.min(fleet.maxSlots, owned.slots + fleet.slotStep);
    return { ok: true, message: 'Вместимость увеличена' };
  },
  buyFuelTanker(id = 'azs') {
    const item = this.find('business', id), owned = State.business.get(id), config = CONFIG.business.fuel, cost = this.getFuelTankerCost(id);
    if (!item || id !== 'azs' || owned.units < 1) return { ok: false, message: 'Сначала откройте АЗС' };
    if (owned.fuel + 1e-8 >= config.capacity) return { ok: false, message: 'Топливный бак полон' };
    const delivered = Math.min(config.tankerSize, config.capacity - owned.fuel), charge = this.roundMoney(cost * delivered / config.tankerSize);
    if (State.data.balance + 1e-8 < charge) return { ok: false, message: 'Недостаточно средств' };
    State.data.balance = this.roundMoney(Math.max(0, State.data.balance - charge));
    State.data.businesses[id].fuel = Math.min(config.capacity, owned.fuel + delivered);
    return { ok: true, message: 'Цистерна топлива закуплена' };
  },
  trade(category, id, quantity) {
    const item = this.find(category, id), amount = Number(quantity), quote = this.getMarketQuote(category, id);
    if (!item || !quote || !Number.isFinite(amount) || amount <= 0) return { ok: false, message: 'Укажите корректное количество' };
    const rawTotal = quote.price * amount, total = this.roundMoney(rawTotal), balance = this.roundMoney(State.data.balance);
    if (balance + 1e-8 < rawTotal) return { ok: false, message: 'Недостаточно средств' };
    const holdings = State.investments[category][id] || { qty: 0, averagePrice: 0 };
    State.data.balance = this.roundMoney(Math.max(0, balance - total));
    holdings.averagePrice = (holdings.averagePrice * holdings.qty + total) / (holdings.qty + amount);
    holdings.qty = Math.round((holdings.qty + amount) * 1e8) / 1e8; State.investments[category][id] = holdings;
    return { ok: true, message: `Куплено: ${amount}` };
  },
  sell(category, id, quantity) {
    const item = this.find(category, id), amount = Number(quantity), holdings = State.investments[category][id], quote = this.getMarketQuote(category, id);
    if (!item || !quote || !Number.isFinite(amount) || amount <= 0 || !holdings || holdings.qty + 1e-8 < amount) return { ok: false, message: 'Недостаточно активов' };
    holdings.qty = Math.round(Math.max(0, holdings.qty - amount) * 1e8) / 1e8;
    State.addMoney(this.roundMoney(quote.price * amount * .95)); if (holdings.qty <= 1e-8) delete State.investments[category][id];
    return { ok: true, message: `Продано: ${amount}` };
  },
  buyItem(id) { const item = CONFIG.items.data.find(x => x.id === id); if (!item || (item.kind === 'permanent' && State.items[id])) return { ok: false, message: 'Предмет уже куплен' }; if (item.kind === 'consumable' && this.hasActiveBoost(id)) return { ok: false, message: 'Этот буст уже активен' }; if (!State.spendMoney(item.price)) return { ok: false, message: 'Недостаточно средств' }; if (item.kind === 'permanent') State.items[id] = 1; else State.items[id] = (State.items[id] || 0) + 1; return { ok: true, message: `${item.name} добавлен` }; },
  activateItem(id) { const item = CONFIG.items.data.find(x => x.id === id); if (!item || item.kind !== 'consumable' || !(State.items[id] > 0)) return { ok: false, message: 'Предмет недоступен' }; if (this.hasActiveBoost(id)) return { ok: false, message: 'Этот буст уже активен' }; State.items[id] -= 1; State.addBoost(id, item.duration); return { ok: true, message: `${item.name} активирован` }; }
};
