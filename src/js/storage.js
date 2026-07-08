function saveSettings(settings) {
    // Usar sync en lugar de local para Android
    return browser.storage.sync.set({ settings: settings });
}

function loadSettings() {
    return browser.storage.sync.get('settings');
}