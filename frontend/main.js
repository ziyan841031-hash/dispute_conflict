const API_BASE = 'http://localhost:8080/api';

async function submitText() {
  const caseText = document.getElementById('caseText').value;
  const res = await fetch(`${API_BASE}/cases/ingest/text`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({caseText})
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
  const sourceType = document.getElementById('sourceType').value;
  const params = new URLSearchParams({keyword, sourceType, pageNo: 1, pageSize: 20});
  const res = await fetch(`${API_BASE}/cases?${params}`);
  const json = await res.json();
  const tbody = document.getElementById('caseTableBody');
  tbody.innerHTML = '';

  (json.data.records || []).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${item.caseNo}</td><td>${item.sourceType}</td><td>${item.status}</td><td>${item.caseText}</td><td>${item.createdAt}</td>`;
    tbody.appendChild(tr);
  });
}
