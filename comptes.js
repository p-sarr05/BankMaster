// ═══════════════════════════════════════════════
// comptes.js – Gestion des comptes bancaires
// ═══════════════════════════════════════════════

const ACCOUNT_TYPES = {
  'Particulier': ['Épargne libre', 'Épargne bloquée'],
  'Salarié': ['Compte courant'],
  'Entreprise': ['Compte société'],
};

function updateCompteTypes() {
  const clientId = document.getElementById('compteClient').value;
  const typeSelect = document.getElementById('compteType');
  typeSelect.innerHTML = '<option value="">-- Choisir --</option>';

  if (!clientId) return;
  const client = Storage.getClients().find(c => c.id === clientId);
  if (!client) return;

  const types = ACCOUNT_TYPES[client.type] || [];
  types.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    typeSelect.appendChild(opt);
  });
}

function toggleCompteFields() {
  const type = document.getElementById('compteType').value;
  const group = document.getElementById('dateDeblocageGroup');
  group.style.display = type === 'Épargne bloquée' ? 'block' : 'none';
}

function ouvrirCompte() {
  const clientId = document.getElementById('compteClient').value;
  const type = document.getElementById('compteType').value;
  const solde = parseFloat(document.getElementById('compteSolde').value) || 0;

  if (!clientId || !type) {
    showToast('Sélectionnez un client et un type de compte.', 'error');
    return;
  }

  // Vérification apport pour société
  if (type === 'Compte société' && solde < 200000) {
    showToast('Apport minimum requis : 200 000 FCFA pour un compte société.', 'error');
    return;
  }

  const compte = {
    id: Storage.nextId('CPT'),
    clientId,
    type,
    solde,
    dateOuverture: new Date().toISOString(),
  };

  if (type === 'Épargne bloquée') {
    const dateDeblocage = document.getElementById('compteDateDeblocage').value;
    if (!dateDeblocage) {
      showToast('Indiquez la date de déblocage.', 'error');
      return;
    }
    if (new Date(dateDeblocage) <= new Date()) {
      showToast('La date de déblocage doit être dans le futur.', 'error');
      return;
    }
    compte.dateDeblocage = dateDeblocage;
  }

  const comptes = Storage.getComptes();
  comptes.push(compte);
  Storage.saveComptes(comptes);

  // Enregistrer solde initial comme opération
  if (solde > 0) {
    const ops = Storage.getOperations();
    ops.push({
      id: Storage.nextId('OP'),
      compteId: compte.id,
      type: 'depot',
      montant: solde,
      description: 'Solde initial',
      date: new Date().toISOString(),
      soldeFinal: solde,
    });
    Storage.saveOperations(ops);
  }

  closeModal('modalCompte');
  clearCompteForm();
  renderComptes();
  updateSelects();
  updateStats();
  showToast(`Compte ${type} ouvert avec succès.`, 'success');
}

function clearCompteForm() {
  document.getElementById('compteClient').value = '';
  document.getElementById('compteType').innerHTML = '<option value="">-- Choisir --</option>';
  document.getElementById('compteSolde').value = '';
  document.getElementById('dateDeblocageGroup').style.display = 'none';
  document.getElementById('compteDateDeblocage').value = '';
}

function fermerCompte(id) {
  if (!confirm('Fermer ce compte ? Toutes ses opérations seront supprimées.')) return;
  let comptes = Storage.getComptes().filter(c => c.id !== id);
  let ops = Storage.getOperations().filter(o => o.compteId !== id);
  Storage.saveComptes(comptes);
  Storage.saveOperations(ops);
  renderComptes();
  renderHistorique();
  updateSelects();
  updateStats();
  showToast('Compte fermé.', 'info');
}

function renderComptes() {
  const filterClientId = document.getElementById('filterClientCompte')?.value || '';
  let comptes = Storage.getComptes();
  if (filterClientId) comptes = comptes.filter(c => c.clientId === filterClientId);

  const clients = Storage.getClients();
  const container = document.getElementById('comptesList');

  if (comptes.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">💳</div>
      <p>Aucun compte ouvert. Cliquez sur "+ Ouvrir un compte".</p>
    </div>`;
    return;
  }

  container.innerHTML = comptes.map(c => {
    const client = clients.find(cl => cl.id === c.clientId) || {};
    const typeClass = getTypeClass(c.type);

    let extraInfo = '';
    if (c.type === 'Épargne bloquée' && c.dateDeblocage) {
      const unlocked = new Date() >= new Date(c.dateDeblocage);
      extraInfo = `<div class="detail-item">
        <span class="detail-label">Déblocage</span>
        <span class="detail-value ${unlocked ? 'type-courant' : 'op-type-retrait'}">${formatDateOnly(c.dateDeblocage)} ${unlocked ? '✔ Disponible' : '🔒 Bloqué'}</span>
      </div>`;
    }

    return `
      <div class="compte-card">
        <div class="card-top">
          <div>
            <div class="compte-type-label ${typeClass}">${c.type}</div>
            <div class="compte-num">${c.id}</div>
          </div>
        </div>
        <div class="compte-solde">${formatMontant(c.solde)} <small style="font-size:14px;color:var(--text-muted)">FCFA</small></div>
        <div class="compte-owner">Titulaire : ${client.prenom || '—'} ${client.nom || ''}</div>
        <div class="client-details" style="margin-top:16px">
          <div class="detail-item">
            <span class="detail-label">Ouverture</span>
            <span class="detail-value">${formatDate(c.dateOuverture)}</span>
          </div>
          ${extraInfo}
        </div>
        <div class="card-actions">
          <button class="btn-danger btn-sm" onclick="fermerCompte('${c.id}')">Fermer le compte</button>
        </div>
      </div>`;
  }).join('');
}

function getTypeClass(type) {
  if (type === 'Compte courant') return 'type-courant';
  if (type === 'Épargne libre') return 'type-epargne';
  if (type === 'Épargne bloquée') return 'type-epargne-bloquee';
  if (type === 'Compte société') return 'type-societe';
  return '';
}