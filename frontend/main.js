// 定义后端接口基础地址。
const API_BASE = 'http://localhost:8080/api';

// 定义文字案件解析状态。
const parseStatus = {
  text: false,
  classify: false
};

// 提交文字案件。
async function submitText() {
  // 打开解析弹窗。
  openParseModal();
  // 设置要素提取处理中。
  setLoading('text');

  // 组装请求载荷。
  const payload = {
    // 读取案件描述。
    caseText: document.getElementById('caseText').value,
    // 读取事件来源。
    eventSource: document.getElementById('eventSource').value
  };

  // 发起POST请求。
  const res = await fetch(`${API_BASE}/cases/ingest/text`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  });
  // 解析文字接口响应。
  const textJson = await res.json();
  // 标记要素提取完成。
  markDone('text');

  // 提取案件ID。
  const caseId = textJson && textJson.data ? textJson.data.id : null;

  // 设置智能分类处理中。
  setLoading('classify');
  // 调用智能分类接口。
  const classifyRes = await fetch(`${API_BASE}/cases/intelligent-classify`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({caseId, caseText: payload.caseText})
  });
  // 消费智能分类响应。
  await classifyRes.json();
  // 标记智能分类完成。
  markDone('classify');
}

// 提交Excel案件。
async function submitExcel() {
  const file = document.getElementById('excelFile').files[0];
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/cases/ingest/excel`, {method: 'POST', body: form});
  await res.json();
}

// 提交音频案件。
async function submitAudio() {
  const file = document.getElementById('audioFile').files[0];
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/cases/ingest/audio`, {method: 'POST', body: form});
  await res.json();
}

// 打开解析弹窗。
function openParseModal() {
  parseStatus.text = false;
  parseStatus.classify = false;
  refreshAllIcons();
  document.getElementById('parseModal').classList.remove('hidden');
}

// 关闭解析弹窗。
function closeParseModal() {
  document.getElementById('parseModal').classList.add('hidden');
}

// 设置处理中图标。
function setLoading(type) {
  const icon = document.getElementById(`icon-${type}`);
  icon.textContent = '◔';
  icon.classList.add('loading');
  icon.classList.remove('done');
}

// 标记完成图标。
function markDone(type) {
  parseStatus[type] = true;
  const icon = document.getElementById(`icon-${type}`);
  icon.textContent = '✔';
  icon.classList.add('done');
  icon.classList.remove('loading');
}

// 刷新全部图标。
function refreshAllIcons() {
  refreshOneIcon('text');
  refreshOneIcon('classify');
}

// 刷新单个图标。
function refreshOneIcon(type) {
  const icon = document.getElementById(`icon-${type}`);
  if (parseStatus[type]) {
    icon.textContent = '✔';
    icon.classList.add('done');
    icon.classList.remove('loading');
  } else {
    icon.textContent = '○';
    icon.classList.remove('done');
    icon.classList.remove('loading');
  }
}

// 查询案件列表。
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
    const actionBtn = `<button onclick="openAssistant(${item.id})">智能助手</button>`;
    tr.innerHTML = `<td>${item.caseNo || '-'}</td><td>${item.partyName || '-'}</td><td>${item.counterpartyName || '-'}</td><td>${item.disputeType || '-'}</td><td>${item.disputeSubType || '-'}</td><td>${item.eventSource || '-'}</td><td>${item.riskLevel || '-'}</td><td>${item.handlingProgress || '-'}</td><td>${item.receiver || '-'}</td><td>${item.registerTime || '-'}</td><td>${actionBtn}</td>`;
    tbody.appendChild(tr);
  });
}

// 打开智能助手页面。
function openAssistant(caseId) {
  window.open(`assistant.html?caseId=${caseId}`, '_blank');
}

// 加载智能助手页面。
async function loadAssistantPage() {
  if (!document.getElementById('assistantTopInfo')) {
    return;
  }
  const caseId = new URLSearchParams(window.location.search).get('caseId');
  if (!caseId) {
    document.getElementById('assistantTopInfo').innerHTML = '<p>缺少 caseId 参数。</p>';
    return;
  }

  let data = {};
  try {
    const res = await fetch(`${API_BASE}/cases/assistant-detail?caseId=${caseId}`);
    const json = await res.json();
    data = (json && json.data) ? json.data : {};
  } catch (error) {
    data = {parseError: '智能助手数据加载失败，请检查后端服务。'};
  }

  renderAssistantTop(data);
  renderGuide(data);
  renderTimeline(data);
  bindFlowInteraction();
}

// 渲染顶部案件信息。
function renderAssistantTop(data) {
  const top = document.getElementById('assistantTopInfo');
  const party = data.partyName || '-';
  const counterparty = data.counterpartyName || '-';
  const summary = data.factsSummary || data.caseText || '-';
  const dispute = `${data.disputeType || '-'} / ${data.disputeSubType || '-'}`;
  top.innerHTML = `
    <div><strong>当事人信息：</strong>${party}（对方：${counterparty}）</div>
    <div><strong>案件编号：</strong>${data.caseNo || '-'}</div>
    <div><strong>纠纷分类：</strong>${dispute}</div>
    <div><strong>当事人案件摘要：</strong>${summary}</div>
  `;
  const acceptTime = document.getElementById('acceptTime');
  if (acceptTime) {
    acceptTime.textContent = data.registerTime || '--';
  }
}

// 渲染智能指导。
function renderGuide(data) {
  const box = document.getElementById('guideList');
  const guides = [
    `风险等级：${data.riskLevel || '-'}`,
    `建议优先路径：${data.modelSuggestedCategoryL1 || data.disputeType || '-'} / ${data.modelSuggestedCategoryL2 || data.disputeSubType || '-'}`,
    '先核对当事人诉求与事实摘要，明确调解目标。',
    '优先采用人民调解，必要时切换行政/专业调解。',
    data.parseError ? `解析提示：${data.parseError}` : '解析状态：正常'
  ];
  box.innerHTML = guides.map(g => `<div class="timeline-item">${g}</div>`).join('');
}

// 渲染案件时间。
function renderTimeline(data) {
  const box = document.getElementById('timelineList');
  const timeline = [
    {time: data.registerTime || '-', text: '案件受理'},
    {time: data.classifyCreatedAt || '-', text: '智能分类完成'},
    {time: data.updatedAt || '-', text: `当前状态：${data.handlingProgress || '-'}`},
    {time: '-', text: '归档处理中'}
  ];
  box.innerHTML = timeline.map(t => `<div class="timeline-item"><div>${t.time}</div><div>${t.text}</div></div>`).join('');
}

// 绑定流程图点击交互。
function bindFlowInteraction() {
  const relations = [
    ['accept', 'mediation', 'l-accept-mediation'],
    ['accept', 'huajie', 'l-accept-huajie'],
    ['accept', 'huanjie', 'l-accept-huanjie'],
    ['accept', 'shujie', 'l-accept-shujie'],
    ['mediation', 'people', 'l-mediation-people'],
    ['mediation', 'admin', 'l-mediation-admin'],
    ['mediation', 'professional', 'l-mediation-prof'],
    ['people', 'finalMediation', 'l-people-final'],
    ['admin', 'finalMediation', 'l-admin-final'],
    ['professional', 'finalMediation', 'l-prof-final'],
    ['finalMediation', 'success', 'l-final-success'],
    ['finalMediation', 'failed', 'l-final-failed']
  ];

  document.querySelectorAll('.flow-node').forEach(node => {
    node.addEventListener('click', () => {
      const current = node.dataset.node;
      document.querySelectorAll('.flow-line').forEach(line => line.classList.remove('active'));
      document.querySelectorAll('.flow-node').forEach(n => n.classList.remove('active'));
      node.classList.add('active');
      relations.forEach(([a, b, lineId]) => {
        if (a === current || b === current) {
          const line = document.getElementById(lineId);
          if (line) {
            line.classList.add('active');
          }
        }
      });
    });
  });
}
