/* Game balance and catalog. All recurring income is stored per hour. */
const CONFIG = Object.freeze({
  version: 2,
  storageKey: 'capital_clicker_state_v2',
  offline: { maxSeconds: 8 * 60 * 60, efficiency: 0.5 },
  market: {
    updateIntervalMs: 5000,
    maxCatchUpSteps: 12,
    drift: 0.0004,
    minPriceFactor: 0.2,
    maxPriceFactor: 8,
    volatility: { stocks: 0.012, crypto: 0.028 }
  },
  antiCheat: {
    maxEventsPerSecond: 14,
    windowMs: 1000,
    regularitySamples: 9,
    regularityToleranceMs: 4,
    regularityMaxIntervalMs: 140,
    cooldownMs: 1600
  },
  levelXp: { base: 120, exp: 1.55 },
  click: { base: 1, exp: 1.28, critChance: 0.05, critMult: 5 },
  business: {
    costGrowth: 1.15, incomeGrowth: 1.06, mergeMultiplier: 2,
    mergeCostFactor: 1.6, resaleRate: 0.7,
    data: [
      { id: 'coffee', name: 'Кофейня «Утро»', category: 'business', icon: '☕', baseCost: 100, baseIncome: 30 },
      { id: 'shaurma', name: 'Ларёк с шаурмой', category: 'business', icon: '🌯', baseCost: 750, baseIncome: 200 },
      { id: 'carwash', name: 'Автомойка', category: 'business', icon: '🚿', baseCost: 4500, baseIncome: 1000 },
      { id: 'taxi', name: 'Таксопарк', category: 'transport', icon: '🚕', baseCost: 25000, baseIncome: 5000 },
      { id: 'market', name: 'Магазин продуктов', category: 'business', icon: '🏪', baseCost: 60000, baseIncome: 10000 },
      { id: 'trucks', name: 'Грузовой автопарк', category: 'transport', icon: '🚛', baseCost: 180000, baseIncome: 26000 },
      { id: 'azs', name: 'Сеть АЗС', category: 'business', icon: '⛽', baseCost: 500000, baseIncome: 60000 },
      { id: 'it', name: 'IT-стартап', category: 'business', icon: '💻', baseCost: 1800000, baseIncome: 180000 },
      { id: 'airline', name: 'Авиакомпания', category: 'transport', icon: '✈️', baseCost: 6500000, baseIncome: 550000 },
      { id: 'oil', name: 'Нефтяная вышка', category: 'business', icon: '🛢️', baseCost: 22000000, baseIncome: 1600000 },
      { id: 'space', name: 'Космопорт', category: 'transport', icon: '🚀', baseCost: 90000000, baseIncome: 5500000 }
    ]
  },
  stocks: { data: [
    { id: 'nvda', name: 'NVIDIA Corp.', ticker: 'NVDA', price: 120, yieldPercent: .025 },
    { id: 'aapl', name: 'Apple Inc.', ticker: 'AAPL', price: 160, yieldPercent: .018 },
    { id: 'tsla', name: 'Tesla', ticker: 'TSLA', price: 700, yieldPercent: .005 },
    { id: 'ko', name: 'Coca-Cola', ticker: 'KO', price: 50, yieldPercent: .032 }
  ] },
  realty: { data: [
    { id: 'garage', name: 'Гараж', price: 800, rent: 8 },
    { id: 'flat', name: 'Квартира-студия', price: 15000, rent: 140 },
    { id: 'house', name: 'Загородный дом', price: 90000, rent: 780 },
    { id: 'office', name: 'Офисное здание', price: 650000, rent: 5200 },
    { id: 'hotel', name: 'Отель 4★', price: 4200000, rent: 31000 },
    { id: 'mall', name: 'Торговый центр', price: 25000000, rent: 175000 }
  ] },
  crypto: { data: [
    { id: 'btc', name: 'Bitcoin', ticker: 'BTC', price: 68000, yieldPercent: 0 },
    { id: 'eth', name: 'Ethereum', ticker: 'ETH', price: 3200, yieldPercent: 0 },
    { id: 'ton', name: 'Toncoin', ticker: 'TON', price: 5.4, yieldPercent: 0 },
    { id: 'sol', name: 'Solana', ticker: 'SOL', price: 145, yieldPercent: 0 },
    { id: 'doge', name: 'Dogecoin', ticker: 'DOGE', price: .12, yieldPercent: 0 }
  ] },
  items: { resaleRate: .7, data: [
    { id: 'gold_tap', name: 'Золотой тап', icon: '🪙', kind: 'permanent', effect: 'tap', mult: 2, price: 2500, desc: 'Удваивает доход за клик' },
    { id: 'chip', name: 'Кремниевый чип', icon: '🧠', kind: 'permanent', effect: 'passive', mult: 2, price: 25000, desc: 'Удваивает пассивный доход' },
    { id: 'offline', name: 'Офлайн-менеджер', icon: '🌙', kind: 'permanent', effect: 'offline', mult: 1.5, price: 15000, desc: '+50% к офлайн-доходу' },
    { id: 'vip', name: 'VIP-статус', icon: '👑', kind: 'permanent', effect: 'all', mult: 1.25, price: 250000, desc: '+25% ко всем доходам' },
    { id: 'terminal', name: 'Трейдинг-терминал', icon: '📈', kind: 'permanent', effect: 'invest', mult: 1.3, price: 120000, desc: '+30% к дивидендам и ренте' },
    { id: 'coffee_boost', name: 'Кофе', icon: '☕', kind: 'consumable', effect: 'tap', mult: 1.5, duration: 60, price: 300, desc: 'Доход за клик ×1,5 на 60 секунд' },
    { id: 'turbo', name: 'Турбо-буст', icon: '⚡', kind: 'consumable', effect: 'tap', mult: 2, duration: 120, price: 1200, desc: 'Доход за клик ×2 на 2 минуты' },
    { id: 'adrenaline', name: 'Адреналин', icon: '🔥', kind: 'consumable', effect: 'passive', mult: 10, duration: 300, price: 5000, desc: 'Пассивный доход ×10 на 5 минут' },
    { id: 'luck', name: 'Клевер', icon: '🍀', kind: 'consumable', effect: 'crit', mult: 3, duration: 600, price: 900, desc: 'Шанс критического тапа ×3 на 10 минут' }
  ] }
});
