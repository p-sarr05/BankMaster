// ═══════════════════════════════════════════════
// clients.js – Gestion des clients
// ═══════════════════════════════════════════════

function toggleClientFields() {
  const type = document.getElementById('cType').value;
  const salaryFields = document.getElementById('salaryFields');
  salaryFields.style.display = type === 'Salarié' ? 'block' : 'none';
}

function toggleCDDDuration() {
  const contrat = document.getElementById('cContrat').value;
  document.getElementById('cDureeGroup').style.display = contrat === 'CDD' ? 'block' : 'none';
}

function enregistrerClient() {
  const nom = document.getElementById('cNom').value.trim();
  const prenom = document.getElementById('cPrenom').value.trim();
  const age = parseInt(document.getElementById('cAge').value);
  const type = document.getElementById('cType').value;
  const salaire = parseFloat(document.getElementById('cSalaire').value);

  if (!nom || !prenom || !age || !salaire) {
    showToast('Veuillez remplir tous les champs obligatoires.', 'error');
    return;
  }

  if (age < 18 || age > 90) {
    showToast("L'âge doit être entre 18 et 90 ans.", 'error');
    return;
  }

  const client = {
    id: Storage.nextId('CL'),
    nom,
    prenom,
    age,
    type,
    salaire,
    dateCreation: new Date().toISOString(),
  };

  if (type === 'Salarié') {
    const contrat = document.getElementById('cContrat').value;
    client.contrat = contrat;
    if (contrat === 'CDD') {
      const duree = parseInt(document.getElementById('cDureeContrat').value);
      if (!duree || duree < 1) {
        showToast('Indiquez la durée du contrat CDD.', 'error');
        return;
      }
      client.dureeContrat = duree;
    }
  }

  const clients = Storage.getClients();
  clients.push(client);
  Storage.saveClients(clients);

  closeModal('modalClient');
  clearClientForm();
  renderClients();
  updateSelects();
  updateStats();
  showToast(`Client ${prenom} ${nom} enregistré avec succès.`, 'success');
}

function clearClientForm() {
  ['cNom','cPrenom','cAge','cSalaire','cDureeContrat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('cType').value = 'Particulier';
  document.getElementById('cContrat').value = 'CDI';
  document.getElementById('salaryFields').style.display = 'none';
  document.getElementById('cDureeGroup').style.display = 'none';
}

function supprimerClient(id) {
  if (!confirm('Supprimer ce client et tous ses comptes / opérations ?')) return;
  let clients = Storage.getClients().filter(c => c.id !== id);
  let comptes = Storage.getComptes().filter(c => c.clientId !== id);
  const compteIds = comptes.map(c => c.id);
  let ops = Storage.getOperations().filter(o => compteIds.includes(o.compteId));
  let prets = Storage.getPrets().filter(p => p.clientId !== id);

  Storage.saveClients(clients);
  Storage.saveComptes(comptes);
  Storage.saveOperations(ops);
  Storage.savePrets(prets);

  renderClients();
  renderComptes();
  renderHistorique();
  renderPretsList();
  updateSelects();
  updateStats();
  showToast('Client supprimé.', 'info');
}

function renderClients() {
  const clients = Storage.getClients();
  const container = document.getElementById('clientsList');

  if (clients.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">👤</div>
      <p>Aucun client enregistré. Cliquez sur "+ Nouveau client" pour commencer.</p>
    </div>`;
    return;
  }

  container.innerHTML = clients.map(c => {
    const initials = (c.prenom[0] + c.nom[0]).toUpperCase();
    const comptes = Storage.getComptes().filter(co => co.clientId === c.id);
    const badgeColor = c.type === 'Particulier' ? '#5dade2' : c.type === 'Salarié' ? '#2ecc71' : '#c9a84c';
    return `
      <div class="client-card">
        <div class="card-top">
          <div class="client-avatar">${initials}</div>
          <span class="client-badge" style="color:${badgeColor};background:${badgeColor}22">${c.type}</span>
        </div>
        <div class="client-name">${c.prenom} ${c.nom}</div>
        <div class="client-id">ID: ${c.id}</div>
        <div class="client-details">
          <div class="detail-item">
            <span class="detail-label">Âge</span>
            <span class="detail-value">${c.age} ans</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Revenu mensuel</span>
            <span class="detail-value">${formatMontant(c.salaire)} FCFA</span>
          </div>
          ${c.contrat ? `<div class="detail-item">
            <span class="detail-label">Contrat</span>
            <span class="detail-value">${c.contrat}${c.dureeContrat ? ' – '+c.dureeContrat+' mois' : ''}</span>
          </div>` : ''}
          <div class="detail-item">
            <span class="detail-label">Comptes ouverts</span>
            <span class="detail-value">${comptes.length}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Inscription</span>
            <span class="detail-value">${formatDate(c.dateCreation)}</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-danger btn-sm" onclick="supprimerClient('${c.id}')">Supprimer</button>
        </div>
      </div>`;
  }).join('');
}