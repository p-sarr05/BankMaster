// ═══════════════════════════════════════════════
// storage.js – Couche d'accès localStorage
// ═══════════════════════════════════════════════

const Storage = {
  KEYS: {
    CLIENTS: 'bm_clients',
    COMPTES: 'bm_comptes',
    OPERATIONS: 'bm_operations',
    PRETS: 'bm_prets',
    COUNTER: 'bm_counter',
  },

  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Clients
  getClients() { return this.get(this.KEYS.CLIENTS) || []; },
  saveClients(clients) { this.set(this.KEYS.CLIENTS, clients); },

  // Comptes
  getComptes() { return this.get(this.KEYS.COMPTES) || []; },
  saveComptes(comptes) { this.set(this.KEYS.COMPTES, comptes); },

  // Operations
  getOperations() { return this.get(this.KEYS.OPERATIONS) || []; },
  saveOperations(ops) { this.set(this.KEYS.OPERATIONS, ops); },

  // Prêts
  getPrets() { return this.get(this.KEYS.PRETS) || []; },
  savePrets(prets) { this.set(this.KEYS.PRETS, prets); },

  // Counter pour IDs uniques
  nextId(prefix) {
    const counters = this.get(this.KEYS.COUNTER) || {};
    counters[prefix] = (counters[prefix] || 1000) + 1;
    this.set(this.KEYS.COUNTER, counters);
    return `${prefix}${counters[prefix]}`;
  },

  // Réinitialisation complète
  reset() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
  }
};