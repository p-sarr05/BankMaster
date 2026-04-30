// ═══════════════════════════════════════════════
// app.js – Orchestrateur principal
// ═══════════════════════════════════════════════

// ── Navigation ──
const PAGE_TITLES = {
  accueil: 'Accueil',
  clients: 'Clients',
  comptes: 'Comptes Bancaires',
  operations: 'Transactions',
  prets: 'Simulation de Prêt',
  dashboard: 'Tableau de Bord',
  export: 'Export des Données',
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    navigateTo(page);
    // Fermer sidebar mobile
    if (window.innerWidth < 768) {
      document.getElementById('sidebar').classList.remove('open');
    }
  });
});

function navigateTo(page) {
  // Mettre à jour nav
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });

  // Masquer toutes les pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

  // Afficher la page cible
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Mettre à jour le titre topbar
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[page] || page;

  // Actions spécifiques à la page
  if (page === 'operations') {
    loadOpComptes();
    renderHistorique();
  }
  if (page === 'dashboard') {
    renderDashboard();
  }
  if (page === 'prets') {
    renderPretsList();
  }
  if (page === 'accueil') {
    updateStats();
  }
}

// ── Sidebar mobile ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Modals ──
function openModal(id) {
  document.getElementById(id).classList.add('open');
  // Focus sur premier input
  setTimeout(() => {
    const input = document.querySelector(`#${id} input`);
    if (input) input.focus();
  }, 100);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Fermer modal en cliquant à l'extérieur
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
    }
  });
});

// ── Toast ──
let _toastTimeout;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(_toastTimeout);
  _toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
}

// ── Formatters ──
function formatMontant(n) {
  if (isNaN(n)) return '0';
  return Math.round(n).toLocaleString('fr-FR');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Mise à jour des <select> ──
function updateSelects() {
  const clients = Storage.getClients();
  const comptes = Storage.getComptes();

  // Select comptes modal
  const compteClientSel = document.getElementById('compteClient');
  if (compteClientSel) {
    const prev = compteClientSel.value;
    compteClientSel.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.prenom} ${c.nom} (${c.type})`;
      compteClientSel.appendChild(opt);
    });
    if (prev) compteClientSel.value = prev;
  }

  // Select opération client
  const opClientSel = document.getElementById('opClient');
  if (opClientSel) {
    const prev = opClientSel.value;
    opClientSel.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.prenom} ${c.nom}`;
      opClientSel.appendChild(opt);
    });
    if (prev) { opClientSel.value = prev; loadOpComptes(); }
  }

  // Select filtre clients / comptes
  const filterClientCompte = document.getElementById('filterClientCompte');
  if (filterClientCompte) {
    const prev = filterClientCompte.value;
    filterClientCompte.innerHTML = '<option value="">Tous les clients</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.prenom} ${c.nom}`;
      filterClientCompte.appendChild(opt);
    });
    if (prev) filterClientCompte.value = prev;
  }

  // Select filtre opérations
  const filterOpCompte = document.getElementById('filterOpCompte');
  if (filterOpCompte) {
    const prev = filterOpCompte.value;
    filterOpCompte.innerHTML = '<option value="">Tous les comptes</option>';
    comptes.forEach(c => {
      const client = clients.find(cl => cl.id === c.clientId) || {};
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.type} – ${client.prenom||''} ${client.nom||''} (${c.id})`;
      filterOpCompte.appendChild(opt);
    });
    if (prev) filterOpCompte.value = prev;
  }

  // Select prêt client
  const pretClientSel = document.getElementById('pretClient');
  if (pretClientSel) {
    const prev = pretClientSel.value;
    pretClientSel.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.prenom} ${c.nom} (${c.type})`;
      pretClientSel.appendChild(opt);
    });
    if (prev) pretClientSel.value = prev;
  }

  // Select dashboard
  const dashSel = document.getElementById('dashboardClient');
  if (dashSel) {
    const prev = dashSel.value;
    dashSel.innerHTML = '<option value="">Sélectionner un client</option>';
    clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.prenom} ${c.nom}`;
      dashSel.appendChild(opt);
    });
    if (prev) dashSel.value = prev;
  }
}

// ── Stats accueil ──
function updateStats() {
  const c = Storage.getClients();
  const co = Storage.getComptes();
  const op = Storage.getOperations();
  const pr = Storage.getPrets();
  document.getElementById('statClients').textContent = c.length;
  document.getElementById('statComptes').textContent = co.length;
  document.getElementById('statOps').textContent = op.length;
  document.getElementById('statPrets').textContent = pr.length;
}

// ── Date topbar ──
function updateTopbarDate() {
  const d = new Date();
  document.getElementById('topbarDate').textContent = d.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ── Réinitialisation ──
function resetAll() {
  if (!confirm('Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible.')) return;
  Storage.reset();
  renderClients();
  renderComptes();
  renderHistorique();
  renderPretsList();
  updateSelects();
  updateStats();
  showToast('Toutes les données ont été réinitialisées.', 'info');
}

// ══════════════════ INITIALISATION ══════════════════
window.addEventListener('DOMContentLoaded', () => {
  updateTopbarDate();
  updateSelects();
  renderClients();
  renderComptes();
  renderHistorique();
  renderPretsList();
  updateStats();
  navigateTo('accueil');
});