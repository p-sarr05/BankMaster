// ═══════════════════════════════════════════════
// dashboard.js – Tableau de bord & graphique
// ═══════════════════════════════════════════════

let _soldeChart = null;

function renderDashboard() {
  const clientId = document.getElementById('dashboardClient').value;
  const container = document.getElementById('dashboardContent');

  if (!clientId) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📊</div><p>Sélectionnez un client pour afficher son tableau de bord</p></div>`;
    return;
  }

  const client = Storage.getClients().find(c => c.id === clientId);
  if (!client) return;

  const comptes = Storage.getComptes().filter(c => c.clientId === clientId);
  const allOps = Storage.getOperations();
  const compteIds = comptes.map(c => c.id);
  const ops = allOps.filter(o => compteIds.includes(o.compteId)).sort((a, b) => new Date(a.date) - new Date(b.date));
  const prets = Storage.getPrets().filter(p => p.clientId === clientId);

  const soldeTotal = comptes.reduce((s, c) => s + c.solde, 0);
  const totalDepots = ops.filter(o => o.type === 'depot').reduce((s, o) => s + o.montant, 0);
  const totalRetraits = ops.filter(o => o.type === 'retrait').reduce((s, o) => s + o.montant, 0);

  container.innerHTML = `
    <div class="dashboard-grid">
      <div class="dash-stat">
        <div class="dash-stat-label">Solde total</div>
        <div class="dash-stat-value">${formatMontant(soldeTotal)}</div>
        <div class="dash-stat-sub">FCFA · ${comptes.length} compte(s)</div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-label">Total dépôts</div>
        <div class="dash-stat-value" style="color:var(--success)">${formatMontant(totalDepots)}</div>
        <div class="dash-stat-sub">FCFA · ${ops.filter(o=>o.type==='depot').length} transactions</div>
      </div>
      <div class="dash-stat">
        <div class="dash-stat-label">Total retraits</div>
        <div class="dash-stat-value" style="color:var(--danger)">${formatMontant(totalRetraits)}</div>
        <div class="dash-stat-sub">FCFA · ${ops.filter(o=>o.type==='retrait').length} transactions</div>
      </div>
    </div>

    <div class="chart-container">
      <div class="chart-title">Évolution du solde</div>
      <canvas id="soldeChart"></canvas>
    </div>

    <div class="dash-bottom">
      <div class="dash-profile">
        <div class="dash-section-h">Profil client</div>
        <div class="profile-list">
          <div class="profile-item">
            <span class="profile-item-label">Nom complet</span>
            <span class="profile-item-value">${client.prenom} ${client.nom}</span>
          </div>
          <div class="profile-item">
            <span class="profile-item-label">ID Client</span>
            <span class="profile-item-value" style="font-family:monospace">${client.id}</span>
          </div>
          <div class="profile-item">
            <span class="profile-item-label">Type</span>
            <span class="profile-item-value">${client.type}</span>
          </div>
          <div class="profile-item">
            <span class="profile-item-label">Âge</span>
            <span class="profile-item-value">${client.age} ans</span>
          </div>
          <div class="profile-item">
            <span class="profile-item-label">Revenu mensuel</span>
            <span class="profile-item-value">${formatMontant(client.salaire)} FCFA</span>
          </div>
          ${client.contrat ? `<div class="profile-item">
            <span class="profile-item-label">Contrat</span>
            <span class="profile-item-value">${client.contrat}${client.dureeContrat?' – '+client.dureeContrat+' mois':''}</span>
          </div>` : ''}
          <div class="profile-item">
            <span class="profile-item-label">Client depuis</span>
            <span class="profile-item-value">${formatDate(client.dateCreation)}</span>
          </div>
          <div class="profile-item">
            <span class="profile-item-label">Prêts actifs</span>
            <span class="profile-item-value">${prets.length}</span>
          </div>
        </div>
      </div>

      <div class="dash-accounts">
        <div class="dash-section-h">Comptes & dernières opérations</div>
        ${comptes.length === 0 ? '<p style="color:var(--text-muted);font-size:14px">Aucun compte.</p>' :
          comptes.map(c => {
            const lastOps = allOps.filter(o => o.compteId === c.id)
              .sort((a,b) => new Date(b.date)-new Date(a.date)).slice(0,3);
            return `<div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--navy-border)">
              <div style="display:flex;justify-content:space-between;margin-bottom:10px">
                <div>
                  <div class="compte-type-label ${getTypeClass(c.type)}">${c.type}</div>
                  <div style="font-size:11px;color:var(--text-muted);font-family:monospace">${c.id}</div>
                </div>
                <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:var(--gold-light);font-weight:700">${formatMontant(c.solde)} F</div>
              </div>
              ${lastOps.map(op => `
                <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-top:1px solid var(--navy-border)">
                  <span style="color:var(--text-muted)">${op.description}</span>
                  <span class="op-type-${op.type}">${op.type==='depot'?'+':'-'}${formatMontant(op.montant)} F</span>
                </div>`).join('')}
            </div>`;
          }).join('')}
      </div>
    </div>
  `;

  // ── Graphique Chart.js ──
  buildSoldeChart(ops, comptes);
}

function buildSoldeChart(ops, comptes) {
  if (_soldeChart) {
    _soldeChart.destroy();
    _soldeChart = null;
  }

  const canvas = document.getElementById('soldeChart');
  if (!canvas) return;

  if (ops.length === 0) {
    canvas.parentElement.innerHTML += '<p style="color:var(--text-muted);text-align:center;padding:30px">Aucune opération pour tracer la courbe.</p>';
    return;
  }

  // Construire données par compte
  const compteIds = comptes.map(c => c.id);
  const typeMap = {};
  comptes.forEach(c => typeMap[c.id] = c.type);

  // Solde agrégé total par opération (cumulé)
  // On reconstitue le solde global jour par jour
  const labels = [];
  const datasets = [];

  // Dataset par compte
  const colors = ['#c9a84c', '#2ecc71', '#5dade2', '#e74c3c', '#9b59b6'];

  comptes.forEach((compte, i) => {
    const compteOps = ops.filter(o => o.compteId === compte.id);
    if (compteOps.length === 0) return;

    const data = compteOps.map(op => ({
      x: formatDateOnly(op.date),
      y: op.soldeFinal,
    }));

    datasets.push({
      label: compte.type,
      data: data.map(d => d.y),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + '18',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: colors[i % colors.length],
      pointRadius: 4,
      pointHoverRadius: 6,
    });

    if (labels.length === 0) {
      compteOps.forEach(op => labels.push(formatDateOnly(op.date)));
    }
  });

  // Si plusieurs comptes, ajouter la ligne "Total"
  if (comptes.length > 1 && ops.length > 0) {
    // Par date, somme des soldeFinal de tous comptes
    const dateMap = {};
    ops.forEach(op => {
      const date = formatDateOnly(op.date);
      if (!dateMap[date]) dateMap[date] = {};
      dateMap[date][op.compteId] = op.soldeFinal;
    });

    const allDates = [...new Set(ops.map(op => formatDateOnly(op.date)))].sort();
    const soldesParCompte = {};
    comptes.forEach(c => soldesParCompte[c.id] = 0);

    const totalData = allDates.map(date => {
      if (dateMap[date]) {
        Object.entries(dateMap[date]).forEach(([cId, s]) => {
          if (soldesParCompte[cId] !== undefined) soldesParCompte[cId] = s;
        });
      }
      return Object.values(soldesParCompte).reduce((a, b) => a + b, 0);
    });

    datasets.push({
      label: 'Total',
      data: totalData,
      borderColor: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderDash: [6,3],
      fill: false,
      tension: 0.4,
      pointRadius: 3,
    });

    // Reconstruire labels
    labels.length = 0;
    allDates.forEach(d => labels.push(d));
    datasets.forEach(ds => {
      if (ds.label !== 'Total') {
        // aligner les data
        const compteId = comptes.find(c => c.type === ds.label)?.id;
        if (compteId) {
          const soldesTemp = {};
          let last = 0;
          allDates.forEach(date => {
            if (dateMap[date] && dateMap[date][compteId] !== undefined) {
              last = dateMap[date][compteId];
            }
            soldesTemp[date] = last;
          });
          ds.data = allDates.map(d => soldesTemp[d]);
        }
      }
    });
  }

  const ctx = canvas.getContext('2d');
  _soldeChart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          labels: { color: '#8fa3bc', font: { family: 'DM Sans', size: 12 } }
        },
        tooltip: {
          backgroundColor: '#1e2f45',
          borderColor: '#243547',
          borderWidth: 1,
          titleColor: '#f0ebe0',
          bodyColor: '#8fa3bc',
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatMontant(ctx.parsed.y)} FCFA`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#5a7290', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.04)' }
        },
        y: {
          ticks: {
            color: '#5a7290',
            font: { size: 11 },
            callback: v => formatMontant(v) + ' F'
          },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
}