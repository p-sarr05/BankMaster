// ═══════════════════════════════════════════════
// operations.js – Dépôts, retraits, historique
// ═══════════════════════════════════════════════

function loadOpComptes() {
  const clientId = document.getElementById('opClient').value;
  const compteSelect = document.getElementById('opCompte');
  compteSelect.innerHTML = '<option value="">-- Sélectionner un compte --</option>';

  if (!clientId) return;

  const comptes = Storage.getComptes().filter(c => c.clientId === clientId);
  comptes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.type} (${c.id}) – ${formatMontant(c.solde)} FCFA`;
    compteSelect.appendChild(opt);
  });
}

function effectuerOperation() {
  const compteId = document.getElementById('opCompte').value;
  const type = document.querySelector('input[name="opType"]:checked')?.value;
  const montant = parseFloat(document.getElementById('opMontant').value);
  const desc = document.getElementById('opDesc').value.trim() || (type === 'depot' ? 'Dépôt' : 'Retrait');

  if (!compteId) { showToast('Sélectionnez un compte.', 'error'); return; }
  if (!montant || montant <= 0) { showToast('Montant invalide.', 'error'); return; }

  const comptes = Storage.getComptes();
  const idx = comptes.findIndex(c => c.id === compteId);
  if (idx === -1) return;

  const compte = comptes[idx];

  // Vérification épargne bloquée
  if (compte.type === 'Épargne bloquée' && type === 'retrait') {
    if (compte.dateDeblocage && new Date() < new Date(compte.dateDeblocage)) {
      showToast(`Retrait impossible : compte bloqué jusqu'au ${formatDateOnly(compte.dateDeblocage)}.`, 'error');
      return;
    }
  }

  // Vérification solde insuffisant
  if (type === 'retrait' && montant > compte.solde) {
    showToast('Solde insuffisant pour ce retrait.', 'error');
    return;
  }

  // Mise à jour solde
  if (type === 'depot') compte.solde += montant;
  else compte.solde -= montant;

  comptes[idx] = compte;
  Storage.saveComptes(comptes);

  // Enregistrement opération
  const ops = Storage.getOperations();
  ops.push({
    id: Storage.nextId('OP'),
    compteId,
    clientId: compte.clientId,
    type,
    montant,
    description: desc,
    date: new Date().toISOString(),
    soldeFinal: compte.solde,
  });
  Storage.saveOperations(ops);

  // Reset form
  document.getElementById('opMontant').value = '';
  document.getElementById('opDesc').value = '';

  renderComptes();
  renderHistorique();
  updateStats();
  showToast(`${type === 'depot' ? 'Dépôt' : 'Retrait'} de ${formatMontant(montant)} FCFA effectué.`, 'success');
}

function renderHistorique() {
  const filterCompteId = document.getElementById('filterOpCompte')?.value || '';
  let ops = Storage.getOperations();
  if (filterCompteId) ops = ops.filter(o => o.compteId === filterCompteId);

  // Trier par date décroissante
  ops.sort((a, b) => new Date(b.date) - new Date(a.date));

  const container = document.getElementById('historiqueOps');
  if (!container) return;

  if (ops.length === 0) {
    container.innerHTML = `<div class="history-wrap"><div class="history-empty">Aucune opération enregistrée.</div></div>`;
    return;
  }

  const clients = Storage.getClients();
  const comptes = Storage.getComptes();

  container.innerHTML = `
    <div class="history-wrap">
      <table class="history-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Compte</th>
            <th>Type</th>
            <th>Description</th>
            <th>Montant</th>
            <th>Solde final</th>
          </tr>
        </thead>
        <tbody>
          ${ops.map(op => {
            const compte = comptes.find(c => c.id === op.compteId);
            const client = clients.find(c => c.id === op.clientId || c.id === compte?.clientId);
            return `<tr>
              <td style="font-family:monospace;font-size:11px;color:var(--text-muted)">${op.id}</td>
              <td>${formatDate(op.date)}</td>
              <td>
                <div style="font-size:12px">${compte?.type || '—'}</div>
                <div style="font-size:11px;color:var(--text-muted)">${op.compteId}</div>
              </td>
              <td><span class="op-type-${op.type}">${op.type === 'depot' ? '↑ Dépôt' : '↓ Retrait'}</span></td>
              <td style="color:var(--text-muted)">${op.description}</td>
              <td style="font-weight:600;color:${op.type==='depot'?'var(--success)':'var(--danger)'}">
                ${op.type==='depot'?'+':'-'}${formatMontant(op.montant)} F
              </td>
              <td style="font-family:'Cormorant Garamond',serif;font-size:16px;color:var(--gold-light)">
                ${formatMontant(op.soldeFinal)} F
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}