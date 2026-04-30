// ═══════════════════════════════════════════════
// prets.js – Simulation et gestion des prêts
// ═══════════════════════════════════════════════

let _simulationCourante = null;

function onPretClientChange() {
  const clientId = document.getElementById('pretClient').value;
  const compteSelect = document.getElementById('pretCompte');
  compteSelect.innerHTML = '<option value="">-- Compte --</option>';

  if (!clientId) return;

  const comptes = Storage.getComptes().filter(c => c.clientId === clientId);
  comptes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.type} – ${formatMontant(c.solde)} FCFA`;
    compteSelect.appendChild(opt);
  });

  // Auto-adapter le type de prêt selon le client
  const client = Storage.getClients().find(c => c.id === clientId);
  const pretTypeSelect = document.getElementById('pretType');
  if (client) {
    if (client.type === 'Salarié' && client.contrat === 'CDI') {
      pretTypeSelect.value = 'long';
    } else {
      pretTypeSelect.value = 'court';
    }
  }
}

function simulerPret() {
  const clientId = document.getElementById('pretClient').value;
  const compteId = document.getElementById('pretCompte').value;
  const montant = parseFloat(document.getElementById('pretMontant').value);
  const duree = parseInt(document.getElementById('pretDuree').value);
  const taux = parseFloat(document.getElementById('pretTaux').value);
  const typePret = document.getElementById('pretType').value;
  const avecAssurance = document.getElementById('pretAssurance').checked;

  if (!clientId || !compteId) { showToast('Sélectionnez un client et un compte.', 'error'); return; }
  if (!montant || montant <= 0) { showToast('Montant invalide.', 'error'); return; }
  if (!duree || duree <= 0) { showToast('Durée invalide.', 'error'); return; }
  if (!taux || taux <= 0) { showToast('Taux invalide.', 'error'); return; }

  const client = Storage.getClients().find(c => c.id === clientId);
  const compte = Storage.getComptes().find(c => c.id === compteId);

  // ── Calcul mensualité (formule annuité constante) ──
  const tauxMensuel = taux / 100 / 12;
  let mensualite;
  if (tauxMensuel === 0) {
    mensualite = montant / duree;
  } else {
    mensualite = montant * tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -duree));
  }

  const coutTotal = mensualite * duree;
  const coutInterets = coutTotal - montant;

  // Assurance
  const mensualiteAssurance = avecAssurance ? (montant * 0.003 / 12) : 0;
  const mensualiteTotale = mensualite + mensualiteAssurance;

  // ── Vérification admissibilité ──
  let eligible = true;
  let raisonRefus = '';

  if (client.type === 'Salarié') {
    if (client.contrat === 'CDI') {
      // Prêt doit se terminer avant 65 ans
      const ageFinPret = client.age + Math.ceil(duree / 12);
      if (ageFinPret > 65) {
        eligible = false;
        raisonRefus = `Le prêt se terminerait à ${ageFinPret} ans, ce qui dépasse la limite de 65 ans.`;
      }
    } else if (client.contrat === 'CDD') {
      // Durée prêt ≤ durée contrat restant
      if (duree > client.dureeContrat) {
        eligible = false;
        raisonRefus = `Durée du prêt (${duree} mois) supérieure à la durée du contrat CDD (${client.dureeContrat} mois).`;
      }
    }
  } else {
    // Particulier / Entreprise : montant ≤ 3 × solde moyen 6 derniers mois
    const soldesMoyens = getSoldeMoyen6Mois(compteId);
    const plafond = 3 * soldesMoyens;
    if (montant > plafond) {
      eligible = false;
      raisonRefus = `Montant (${formatMontant(montant)} FCFA) dépasse le plafond autorisé de 3 × solde moyen des 6 derniers mois = ${formatMontant(plafond)} FCFA.`;
    }
  }

  // Taux d'endettement (mensualité ne doit pas dépasser 40% du salaire)
  if (eligible && client.salaire) {
    const tauxEndettement = mensualiteTotale / client.salaire;
    if (tauxEndettement > 0.40) {
      eligible = false;
      raisonRefus = `Mensualité (${formatMontant(Math.round(mensualiteTotale))} FCFA) dépasse 40% du revenu mensuel (${formatMontant(Math.round(client.salaire * 0.4))} FCFA).`;
    }
  }

  // Mémoriser simulation
  _simulationCourante = {
    clientId, compteId, montant, duree, taux, typePret, avecAssurance,
    mensualite, mensualiteTotale, mensualiteAssurance, coutTotal, coutInterets,
    eligible
  };

  // Affichage résultat
  const resultDiv = document.getElementById('pretResult');
  const badge = document.getElementById('admissibilityBadge');
  const grid = document.getElementById('resultGrid');
  const note = document.getElementById('resultNote');
  const btnValider = document.getElementById('btnValiderPret');

  badge.textContent = eligible ? '✔ Admissible' : '✘ Refusé';
  badge.className = 'admissibility-badge ' + (eligible ? 'eligible' : 'ineligible');

  grid.innerHTML = `
    <div class="result-item">
      <div class="result-item-label">Mensualité</div>
      <div class="result-item-value">${formatMontant(Math.round(mensualite))} F</div>
    </div>
    <div class="result-item">
      <div class="result-item-label">Mensualité + Assurance</div>
      <div class="result-item-value">${formatMontant(Math.round(mensualiteTotale))} F</div>
    </div>
    <div class="result-item">
      <div class="result-item-label">Coût total du prêt</div>
      <div class="result-item-value">${formatMontant(Math.round(coutTotal))} F</div>
    </div>
    <div class="result-item">
      <div class="result-item-label">Coût des intérêts</div>
      <div class="result-item-value">${formatMontant(Math.round(coutInterets))} F</div>
    </div>
    ${avecAssurance ? `<div class="result-item">
      <div class="result-item-label">Prime assurance / mois</div>
      <div class="result-item-value">${formatMontant(Math.round(mensualiteAssurance))} F</div>
    </div>` : ''}
    <div class="result-item">
      <div class="result-item-label">Taux mensuel</div>
      <div class="result-item-value">${(taux/12).toFixed(3)}%</div>
    </div>
  `;

  if (raisonRefus) {
    note.innerHTML = `<strong>Motif de refus :</strong> ${raisonRefus}`;
    note.className = 'result-note error';
  } else {
    note.innerHTML = `Simulation réalisée pour <strong>${client.prenom} ${client.nom}</strong> sur <strong>${duree} mois</strong> au taux de <strong>${taux}%/an</strong>. Le prêt représente <strong>${((mensualiteTotale/client.salaire)*100).toFixed(1)}%</strong> du revenu mensuel.`;
    note.className = 'result-note';
  }

  btnValider.style.display = eligible ? 'block' : 'none';
  resultDiv.style.display = 'block';
}

function getSoldeMoyen6Mois(compteId) {
  // Calculer le solde moyen des 6 derniers mois via l'historique des opérations
  const now = new Date();
  const sixMoisAvant = new Date(now);
  sixMoisAvant.setMonth(sixMoisAvant.getMonth() - 6);

  const ops = Storage.getOperations()
    .filter(o => o.compteId === compteId && new Date(o.date) >= sixMoisAvant)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (ops.length === 0) {
    const compte = Storage.getComptes().find(c => c.id === compteId);
    return compte ? compte.solde : 0;
  }

  // Solde moyen = moyenne des soldeFinal de toutes les ops
  const somme = ops.reduce((acc, op) => acc + op.soldeFinal, 0);
  return somme / ops.length;
}

function validerPret() {
  if (!_simulationCourante || !_simulationCourante.eligible) return;

  const prets = Storage.getPrets();
  const sim = _simulationCourante;
  const client = Storage.getClients().find(c => c.id === sim.clientId);

  prets.push({
    id: Storage.nextId('PR'),
    clientId: sim.clientId,
    compteId: sim.compteId,
    montant: sim.montant,
    duree: sim.duree,
    taux: sim.taux,
    typePret: sim.typePret,
    avecAssurance: sim.avecAssurance,
    mensualite: sim.mensualite,
    mensualiteTotale: sim.mensualiteTotale,
    coutTotal: sim.coutTotal,
    dateDebut: new Date().toISOString(),
    statut: 'En cours',
    clientNom: `${client.prenom} ${client.nom}`,
  });

  Storage.savePrets(prets);
  _simulationCourante = null;
  document.getElementById('pretResult').style.display = 'none';

  renderPretsList();
  updateStats();
  showToast('Prêt validé et enregistré avec succès.', 'success');
}

function renderPretsList() {
  const prets = Storage.getPrets();
  const container = document.getElementById('pretsList');

  if (prets.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Aucun prêt enregistré.</p></div>`;
    return;
  }

  container.innerHTML = prets.map(p => `
    <div class="pret-row">
      <div class="pret-info">
        <h4>${p.clientNom}</h4>
        <p>ID: ${p.id} · ${p.typePret === 'long' ? 'Long terme' : 'Court terme'} · ${p.duree} mois · ${p.taux}%/an ${p.avecAssurance ? '· Assuré' : ''}</p>
        <p>Depuis le ${formatDate(p.dateDebut)}</p>
      </div>
      <div class="pret-amounts">
        <div class="pret-mensualite">${formatMontant(Math.round(p.mensualiteTotale))} F<small>/mois</small></div>
        <div class="pret-total">Total : ${formatMontant(Math.round(p.coutTotal))} FCFA</div>
        <div class="pret-total">Montant : ${formatMontant(p.montant)} FCFA</div>
      </div>
      <button class="btn-danger btn-sm" onclick="supprimerPret('${p.id}')">Supprimer</button>
    </div>`).join('');
}

function supprimerPret(id) {
  if (!confirm('Supprimer ce prêt ?')) return;
  const prets = Storage.getPrets().filter(p => p.id !== id);
  Storage.savePrets(prets);
  renderPretsList();
  updateStats();
  showToast('Prêt supprimé.', 'info');
}