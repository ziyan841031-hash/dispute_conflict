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
    caseListCache[item.id] = item;
    const actionBtn = `<button onclick="openAssistant(${item.id})">智能助手</button>`;
    tr.innerHTML = `<td>${item.caseNo || '-'}</td><td>${item.partyName || '-'}</td><td>${item.counterpartyName || '-'}</td><td>${item.disputeType || '-'}</td><td>${item.disputeSubType || '-'}</td><td>${item.eventSource || '-'}</td><td>${item.riskLevel || '-'}</td><td>${item.handlingProgress || '-'}</td><td>${item.receiver || '-'}</td><td>${item.registerTime || '-'}</td><td class="action-col">${actionBtn}</td>`;
    tbody.appendChild(tr);
  });
}

// 打开智能助手页面。
function openAssistant(caseId) {
  const rowData = caseListCache[caseId];
  if (rowData) {
    sessionStorage.setItem('assistantPrefill', JSON.stringify(rowData));
  }
  window.location.href = `assistant.html?caseId=${caseId}`;
}

// 智能指引补充记录。
const assistantGuideNotes = [];
let assistantDataCache = {};
const caseListCache = {};

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

  const prefill = sessionStorage.getItem('assistantPrefill');
  if (prefill) {
    try {
      const prefillData = JSON.parse(prefill);
      if (String(prefillData.id || '') === String(caseId)) {
        renderAssistantTop(prefillData);
      }
    } catch (e) {}
  }

  let data = {};
  try {
    const res = await fetch(`${API_BASE}/cases/assistant-detail?caseId=${caseId}`);
    const json = await res.json();
    data = (json && json.data) ? json.data : {};
  } catch (error) {
    data = {parseError: '智能助手数据加载失败，请检查后端服务。'};
  }

  assistantDataCache = data || {};
  renderAssistantTop(assistantDataCache);
  renderGuide(assistantDataCache);
  renderTimeline(assistantDataCache);
  switchAssistantTab('guide');
  bindFlowInteraction();
}

// 风险等级说明映射。
const RISK_LEVEL_DESC = {
  R0: '仅咨询/信息不足/冲突极轻微，无升级迹象',
  R1: '轻度纠纷，可调解，情绪可控，无威胁无暴力',
  R2: '矛盾较尖锐或反复发生；涉及重要权益或金额较大；辱骂指责明显但无明确暴力威胁',
  R3: '存在升级风险：明确威胁、跟踪骚扰、聚众冲突苗头；或涉未成年人/老人等脆弱群体且对抗尖锐；或疑似违法犯罪线索',
  R4: '紧急高危：正在/近期暴力伤害、持械、明确人身伤害/自杀他杀威胁、严重家暴、重大公共安全风险'
};

// 归一化风险等级。
function normalizeRiskLevel(level) {
  const raw = (level || '').toString().trim().toUpperCase();
  if (RISK_LEVEL_DESC[raw]) {
    return raw;
  }
  const map = { '低': 'R1', '中': 'R2', '高': 'R3' };
  return map[level] || '';
}

// 渲染顶部案件信息。
function renderAssistantTop(data) {
  const top = document.getElementById('assistantTopInfo');
  const party = data.partyName || '-';
  const counterparty = data.counterpartyName || '-';
  const summary = data.judgementBasisText || data.factsSummary || data.caseText || '-';
  const dispute = `${data.disputeType || '-'} / ${data.disputeSubType || '-'}`;
  const riskCode = normalizeRiskLevel(data.riskLevel);
  const riskDesc = riskCode ? `${riskCode}：${RISK_LEVEL_DESC[riskCode]}` : (data.riskLevel || '-');
  const emotionText = data.emotionAssessmentText || '-';
  top.innerHTML = `
    <div class="assistant-info-row assistant-info-title">
      <strong>案件信息</strong>
      <span>案件编号：${data.caseNo || '-'}</span>
    </div>
    <div class="assistant-info-row assistant-info-meta">
      <div><strong>当事人信息：</strong>${party}（对方：${counterparty}）</div>
      <div><strong>纠纷类型：</strong>${dispute}</div>
      <div><strong>风险等级：</strong>${riskDesc}</div>
    </div>
    <div class="assistant-info-row"><strong>当事人情绪分析：</strong>${emotionText}</div>
    <div class="assistant-info-row assistant-info-summary">
      <div class="assistant-summary-text"><strong>案件智能摘要：</strong>${summary}</div>
      <button id="caseDetailBtn" type="button">案件详情</button>
    </div>
  `;
  const btn = document.getElementById('caseDetailBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const rawMaterial = data.caseText || data.materialText || data.rawMaterial || '暂无原始材料';
      showCaseMaterial(rawMaterial);
    });
  }
  if (window.updateWorkflowAcceptTime) {
    window.updateWorkflowAcceptTime(data.registerTime || '--');
  }
}

// 展示案件原始材料。
function showCaseMaterial(text) {
  const content = (text || '暂无原始材料').toString();
  window.alert(content);
}


// 切换智能助手右侧书签页签。
function switchAssistantTab(tabName) {
  document.querySelectorAll('.bookmark-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('[data-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.panel !== tabName);
  });
}

// 渲染智能指引。
function renderGuide(data) {
  const box = document.getElementById('guideList');
  const guides = [
    `风险等级：${data.riskLevel || '-'}`,
    `建议优先路径：${data.modelSuggestedCategoryL1 || data.disputeType || '-'} / ${data.modelSuggestedCategoryL2 || data.disputeSubType || '-'}`,
    '优先核对案件事实摘要与诉求，再选择化解/缓解/疏解策略。',
    '调解分流优先顺序：人民调解 -> 行政调解 -> 专业调解。',
    data.parseError ? `解析提示：${data.parseError}` : '解析状态：正常'
  ].concat(assistantGuideNotes.map((item, idx) => `自定义指引${idx + 1}：${item}`));
  box.innerHTML = guides.map(g => `<div class="timeline-item">${g}</div>`).join('');
}

// 添加智能指引补充内容。
function addGuideNote() {
  const input = document.getElementById('guideInput');
  if (!input) {
    return;
  }
  const text = (input.value || '').trim();
  if (!text) {
    return;
  }
  assistantGuideNotes.unshift(text);
  input.value = '';
  renderGuide(assistantDataCache);
}

// 渲染案件时间线（竖状）。
function renderTimeline(data) {
  const box = document.getElementById('timelineList');
  const timeline = [
    {name: '已受理', enter: data.registerTime || '-', done: data.classifyCreatedAt || '-'},
    {name: '调解分流', enter: data.classifyCreatedAt || '-', done: data.updatedAt || '-'},
    {name: '调解状态', enter: data.updatedAt || '-', done: '-'},
    {name: '案件归档', enter: '-', done: data.handlingProgress || '待归档'}
  ];
  box.innerHTML = timeline.map(item => `
    <div class="timeline-row">
      <div class="timeline-left"><strong>${item.name}</strong><span>进入时间：${item.enter}</span></div>
      <div class="timeline-right"><strong>处理完成时间</strong><span>${item.done}</span></div>
    </div>
  `).join('');
}

// 绑定流程图点击交互（从主节点到当前节点高亮）。
function bindFlowInteraction() {
  const edges = [
    {from: 'accept', to: 'mediation', lineId: 'l-accept-mediation'},
    {from: 'accept', to: 'huajie', lineId: 'l-accept-huajie'},
    {from: 'accept', to: 'huanjie', lineId: 'l-accept-huanjie'},
    {from: 'accept', to: 'shujie', lineId: 'l-accept-shujie'},
    {from: 'mediation', to: 'people', lineId: 'l-mediation-people'},
    {from: 'mediation', to: 'admin', lineId: 'l-mediation-admin'},
    {from: 'mediation', to: 'professional', lineId: 'l-mediation-prof'},
    {from: 'people', to: 'mediationStatus', lineId: 'l-people-status'},
    {from: 'admin', to: 'mediationStatus', lineId: 'l-admin-status'},
    {from: 'professional', to: 'mediationStatus', lineId: 'l-prof-status'},
    {from: 'mediationStatus', to: 'success', lineId: 'l-status-success'},
    {from: 'mediationStatus', to: 'failed', lineId: 'l-status-failed'},
    {from: 'success', to: 'archive', lineId: 'l-success-archive'},
    {from: 'failed', to: 'archive', lineId: 'l-failed-archive'}
  ];

  const parentMap = {};
  edges.forEach(edge => {
    if (!parentMap[edge.to]) {
      parentMap[edge.to] = [];
    }
    parentMap[edge.to].push(edge);
  });

  function collectPathLines(target, lineSet = new Set(), nodeSet = new Set()) {
    nodeSet.add(target);
    if (target === 'accept') {
      return {lineSet, nodeSet};
    }
    const parents = parentMap[target] || [];
    parents.forEach(edge => {
      lineSet.add(edge.lineId);
      collectPathLines(edge.from, lineSet, nodeSet);
    });
    return {lineSet, nodeSet};
  }

  document.querySelectorAll('.flow-node').forEach(node => {
    node.addEventListener('click', () => {
      const current = node.dataset.node;
      document.querySelectorAll('.flow-line').forEach(line => line.classList.remove('active'));
      document.querySelectorAll('.flow-node').forEach(item => item.classList.remove('active'));

      const {lineSet, nodeSet} = collectPathLines(current);
      nodeSet.forEach(nodeName => {
        const nodeEl = document.querySelector(`.flow-node[data-node="${nodeName}"]`);
        if (nodeEl) {
          nodeEl.classList.add('active');
        }
      });
      lineSet.forEach(lineId => {
        const line = document.getElementById(lineId);
        if (line) {
          line.classList.add('active');
        }
      });
    });
  });
}
