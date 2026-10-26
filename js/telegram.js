const TelegramAPI = {
  webApp: null,
  init() {
    this.webApp = window.Telegram?.WebApp || null;
    if (!this.webApp) {
      console.info('Telegram Web App SDK unavailable; browser fallback enabled.');
      return;
    }
    try {
      this.webApp.ready();
      this.webApp.expand();
      if (this.webApp.colorScheme) document.documentElement.dataset.telegramTheme = this.webApp.colorScheme;
      this.webApp.onEvent?.('themeChanged', () => {
        if (!State.data?.settings?.theme) document.documentElement.dataset.telegramTheme = this.webApp.colorScheme;
      });
    } catch (error) { console.warn('Telegram initialization failed', error); }
  },
  vibrate(type = 'light') {
    try {
      if (this.webApp?.HapticFeedback) this.webApp.HapticFeedback.impactOccurred(type);
      else if (navigator.vibrate) navigator.vibrate(type === 'heavy' ? 35 : 10);
    } catch (_) { /* haptics are optional */ }
  },
  notify(type = 'success') {
    try { this.webApp?.HapticFeedback?.notificationOccurred(type); } catch (_) { /* optional */ }
  },
  sendAlert(message) {
    try {
      if (this.webApp?.showAlert) this.webApp.showAlert(message);
      else window.alert(message);
    } catch (_) { window.alert(message); }
  }
};
