const API_BASE = 'http://localhost:8080/api';

async function submitText() {
  const payload = {
    caseText: document.getElementById('caseText').value,
    partyName: document.getElementById('partyName').value,
    counterpartyName: document.getElementById('counterpartyName').value,
    disputeType: document.getElementById('disputeType').value,
    riskLevel: document.getElementById('riskLevel').value,
    handlingProgress: document.getElementById('handlingProgress').value,
    receiver: document.getElementById('receiver').value
  };

  const res = await fetch(`${API_BASE}/cases/ingest/text`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  renderResult(await res.json());
}

async function submitExcel() {
  const file = document.getElementById('excelFile').files[0];
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/cases/ingest/excel`, {method: 'POST', body: form});
  renderResult(await res.json());
}

async function submitAudio() {
  const file = document.getElementById('audioFile').files[0];
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/cases/ingest/audio`, {method: 'POST', body: form});
  renderResult(await res.json());
}

function renderResult(data) {
  const result = document.getElementById('result');
  if (result) {
    result.textContent = JSON.stringify(data, null, 2);
  }
}

async function loadCases() {
  const keyword = document.getElementById('keyword').value;
  const disputeType = document.getElementById('disputeType').value;
  const eventSource = document.getElementById('eventSource').value;
  const riskLevel = document.getElementById('riskLevel').value;
  const params = new URLSearchParams({keyword, disputeType, eventSource, riskLevel, pageNo: 1, pageSize: 20});
  const res = await fetch(`${API_BASE}/cases?${params}`);
  const json = await res.json();
  const tbody = document.getElementById('caseTableBody');
  tbody.innerHTML = '';

  (json.data.records || []).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.caseNo}</td><td>${item.partyName}</td><td>${item.counterpartyName}</td><td>${item.disputeType}</td><td>${item.eventSource}</td><td>${item.riskLevel}</td><td>${item.handlingProgress}</td><td>${item.receiver}</td><td>${item.registerTime}</td>`;
    tbody.appendChild(tr);
  });
}
