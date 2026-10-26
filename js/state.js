const State = {
  data: null,
  initialMarket(now = Date.now()) {
    const quotes = { stocks: {}, crypto: {} };
    for (const category of ['stocks', 'crypto']) for (const item of CONFIG[category].data) quotes[category][item.id] = { price: item.price, previousPrice: item.price, changePercent: 0 };
    return { updatedAt: now, quotes };
  },
  sanitizeMarket(raw) {
    const now = Date.now(), market = this.initialMarket(now);
    if (!raw || typeof raw !== 'object') return market;
    market.updatedAt = Utils.positive(raw.updatedAt, now);
    for (const category of ['stocks', 'crypto']) for (const item of CONFIG[category].data) {
      const saved = raw.quotes?.[category]?.[item.id]; if (!saved) continue;
      const min = item.price * CONFIG.market.minPriceFactor, max = item.price * CONFIG.market.maxPriceFactor;
      const price = Math.min(max, Math.max(min, Utils.positive(saved.price, item.price)));
      const previousPrice = Math.min(max, Math.max(min, Utils.positive(saved.previousPrice, price)));
      market.quotes[category][item.id] = { price, previousPrice, changePercent: Utils.finite(saved.changePercent, 0) };
    }
    return market;
  },
  defaults() {
    const now = Date.now();
    return { version: CONFIG.version, balance: 0, xp: 0, level: 1, totalEarned: 0, taps: 0, crits: 0, createdAt: now, lastSeen: now, lastTick: now, businesses: {}, investments: { stocks: {}, realty: {}, crypto: {} }, items: {}, boosts: [], market: this.initialMarket(now), settings: { theme: 'dark', activeTab: 'earn' } };
  },
  businessDefaults(id) {
    const fleet = CONFIG.business.fleet[id];
    return { units: 0, merge: 0, slots: fleet?.initialSlots || 0, fleet: 0, fuel: 0 };
  },
  sanitize(raw) {
    const d = this.defaults(); if (!raw || typeof raw !== 'object') return d; Object.assign(d, raw);
    d.balance = Utils.positive(raw.balance); d.xp = Utils.positive(raw.xp); d.level = Math.max(1, Math.floor(Utils.positive(raw.level, 1))); d.totalEarned = Utils.positive(raw.totalEarned); d.taps = Math.floor(Utils.positive(raw.taps)); d.crits = Math.floor(Utils.positive(raw.crits));
    d.createdAt = Utils.positive(raw.createdAt, d.createdAt); d.lastSeen = Utils.positive(raw.lastSeen, d.createdAt); d.lastTick = Utils.positive(raw.lastTick, d.lastSeen);
    const savedBusinesses = raw.businesses && typeof raw.businesses === 'object' ? raw.businesses : {};
    d.businesses = {};
    for (const item of CONFIG.business.data) {
      const saved = savedBusinesses[item.id] || {}, defaults = this.businessDefaults(item.id), fleetConfig = CONFIG.business.fleet[item.id];
      const units = Math.min(CONFIG.business.maxUnits, Math.floor(Utils.positive(saved.units)));
      const merge = Math.min(CONFIG.business.maxMerge, Math.floor(Utils.positive(saved.merge)));
      const slots = fleetConfig ? Math.min(fleetConfig.maxSlots, Math.max(fleetConfig.initialSlots, Math.floor(Utils.positive(saved.slots, defaults.slots)))) : 0;
      const legacyFleet = fleetConfig && saved.fleet === undefined ? Math.min(units, slots) : 0;
      const fleet = fleetConfig ? Math.min(slots, Math.floor(Utils.positive(saved.fleet, legacyFleet))) : 0;
      const fuel = item.id === 'azs' ? Math.min(CONFIG.business.fuel.capacity, Utils.positive(saved.fuel)) : 0;
      d.businesses[item.id] = { units, merge, slots, fleet, fuel };
    }
    d.investments = { stocks: {}, realty: {}, crypto: {}, ...(raw.investments || {}) };
    for (const category of ['stocks', 'realty', 'crypto']) for (const [id, item] of Object.entries(d.investments[category] || {})) d.investments[category][id] = { qty: Math.round(Utils.positive(item?.qty) * 1e8) / 1e8, averagePrice: Utils.positive(item?.averagePrice) };
    d.items = raw.items && typeof raw.items === 'object' ? raw.items : {}; for (const id of Object.keys(d.items)) d.items[id] = Math.floor(Utils.positive(d.items[id]));
    d.boosts = Array.isArray(raw.boosts) ? raw.boosts.filter(b => b && b.until > Date.now()).map(b => ({ id: String(b.id), until: Utils.positive(b.until) })) : [];
    d.market = this.sanitizeMarket(raw.market);
    d.settings = { theme: 'dark', activeTab: 'earn', ...(raw.settings || {}) }; if (!['dark', 'light'].includes(d.settings.theme)) d.settings.theme = 'dark'; if (!['earn', 'business', 'invest', 'items', 'profile'].includes(d.settings.activeTab)) d.settings.activeTab = 'earn'; d.version = CONFIG.version; return d;
  },
  load() {
    let raw = null; try { raw = JSON.parse(localStorage.getItem(CONFIG.storageKey) || 'null'); } catch (_) { console.warn('Invalid save; creating a new game.'); }
    this.data = this.sanitize(raw); const now = Date.now(), elapsed = Math.min(Math.max(0, (now - this.data.lastSeen) / 1000), CONFIG.offline.maxSeconds);
    if (elapsed > 1 && typeof Economy !== 'undefined') { const payout = Economy.accruePassive(elapsed) * CONFIG.offline.efficiency * Economy.getOfflineMultiplier(); if (payout > 0) { this.addMoney(payout); setTimeout(() => UI?.showToast?.(`Офлайн-доход: +${Utils.fmtMoney(payout, false)}`, 'success'), 0); } }
    this.data.lastSeen = now; this.data.lastTick = now; this.save(); document.documentElement.dataset.theme = this.data.settings.theme;
  },
  save() { try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(this.data)); } catch (_) { /* storage can be unavailable */ } },
  reset() { this.data = this.defaults(); this.save(); },
  addMoney(amount) { const value = Utils.positive(amount); this.data.balance += value; this.data.totalEarned += value; },
  spendMoney(amount) { const value = Utils.positive(amount); if (this.data.balance < value) return false; this.data.balance -= value; return true; },
  addXp(amount) { this.data.xp += Utils.positive(amount); while (this.data.xp >= Economy.levelRequirement(this.data.level)) { this.data.xp -= Economy.levelRequirement(this.data.level); this.data.level += 1; UI?.showToast?.(`Новый уровень: ${this.data.level}`, 'success'); } },
  get business() { const map = this.data.businesses; return { get: id => map[id] || this.businessDefaults(id), add: (id, count = 1) => { if (!map[id]) map[id] = this.businessDefaults(id); map[id].units = Math.min(CONFIG.business.maxUnits, map[id].units + count); }, remove: (id, count = 1) => { if (map[id]) map[id].units = Math.max(0, map[id].units - count); } }; },
  get investments() { return this.data.investments; }, get items() { return this.data.items; }, get boosts() { const now = Date.now(); this.data.boosts = this.data.boosts.filter(b => b.until > now); return this.data.boosts; },
  addBoost(id, seconds) { this.data.boosts.push({ id, until: Date.now() + seconds * 1000 }); },
  setTheme(theme) { this.data.settings.theme = theme === 'light' ? 'light' : 'dark'; document.documentElement.dataset.theme = this.data.settings.theme; this.save(); }, toggleTheme() { this.setTheme(this.data.settings.theme === 'dark' ? 'light' : 'dark'); }
};
