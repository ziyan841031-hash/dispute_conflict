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
let disposalOrgOptions = [];
let currentWorkflowNodeId = 'accept';
const selectedOrgByCategory = {};
const confirmedNodeByCategory = {};
let workflowAdviceRecord = null;
let workflowAdviceLoading = false;
const THIRD_LEVEL_NODE_MAP = {
  people: '人民调解',
  admin: '行政调解',
  professional: '专业调解'
};

// 加载智能助手页面。
async function loadAssistantPage() {
  if (!document.getElementById('assistantTopInfo')) {
    return;
  }

  window.onWorkflowNodeChange = async function (nodeId) {
    currentWorkflowNodeId = nodeId || 'accept';

    const mediationType = THIRD_LEVEL_NODE_MAP[currentWorkflowNodeId] || '';
    if (mediationType) {
      workflowAdviceLoading = true;
      showWorkflowWaitingModal();
      try {
        const nextAdvice = await triggerDisposalWorkflow(assistantDataCache, mediationType);
        if (nextAdvice) {
          workflowAdviceRecord = nextAdvice;
        }
      } finally {
        workflowAdviceLoading = false;
        hideWorkflowWaitingModal();
      }
    }

    renderGuide(assistantDataCache);
  };

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

  let detailData = {};
  let orgData = [];

  try {
    const [detailRes, orgRes] = await Promise.all([
      fetch(`${API_BASE}/cases/assistant-detail?caseId=${caseId}`),
      fetch(`${API_BASE}/disposal-orgs`)
    ]);

    const detailJson = await detailRes.json();
    detailData = (detailJson && detailJson.data) ? detailJson.data : {};

    const orgJson = await orgRes.json();
    orgData = (orgJson && orgJson.data) ? orgJson.data : [];
  } catch (error) {
    detailData = {parseError: '智能助手数据加载失败，请检查后端服务。'};
    orgData = [];
  }

  assistantDataCache = detailData || {};
  disposalOrgOptions = orgData || [];

  workflowAdviceLoading = true;
  renderGuide(assistantDataCache);
  workflowAdviceRecord = await triggerDisposalWorkflow(assistantDataCache);
  workflowAdviceLoading = false;

  syncWorkflowSelectionFromAdvice(workflowAdviceRecord);

  renderAssistantTop(assistantDataCache);
  renderGuide(assistantDataCache);
  renderTimeline(assistantDataCache);
  switchAssistantTab('guide');
  bindFlowInteraction();
}


async function triggerDisposalWorkflow(detailData, mediationType = "") {
  const payload = {
    caseId: detailData.caseId || null,
    query: '1',
    variables: {
      dispute_text: detailData.factsSummary || '',
      category_level_1: detailData.disputeType || '',
      category_level_2: detailData.disputeSubType || ''
    }
  };

  if (mediationType) {
    payload.variables.mediation_type = mediationType;
  }

  try {
    const res = await fetch(`${API_BASE}/dify/workflow-run`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    return (json && json.data) ? json.data : null;
  } catch (error) {
    console.warn('纠纷处置workflow调用失败', error);
    return null;
  }
}

function mapFlowLevelToNodeId(level1, level2, level3) {
  const l1 = (level1 || '').trim();
  const l2 = (level2 || '').trim();
  const l3 = (level3 || '').trim();
  if (l1 !== '已受理') {
    return 'accept';
  }
  if (l2 !== '调解') {
    return 'accept';
  }
  if (l3 === '人民调解') {
    return 'people';
  }
  if (l3 === '行政调解') {
    return 'admin';
  }
  if (l3 === '专业调解') {
    return 'professional';
  }
  return 'mediation';
}

function syncWorkflowSelectionFromAdvice(record) {
  if (!record) {
    return;
  }
  const nodeId = mapFlowLevelToNodeId(record.flowLevel1, record.flowLevel2, record.flowLevel3);
  currentWorkflowNodeId = nodeId;
  window.initialWorkflowNodeId = nodeId;
  if (record.recommendedDepartment && record.flowLevel3) {
    selectedOrgByCategory[record.flowLevel3] = record.recommendedDepartment;
  }
  if (window.setWorkflowActiveNode) {
    window.setWorkflowActiveNode(nodeId);
  } else if (window.onWorkflowNodeChange) {
    window.onWorkflowNodeChange(nodeId);
  }
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
  const riskDesc = riskCode ? `${riskCode}(${RISK_LEVEL_DESC[riskCode]})` : (data.riskLevel || '-');
  const riskClass = riskCode ? `risk-${riskCode.toLowerCase()}` : '';
  const emotionTextRaw = data.emotionAssessmentText || '-';
  const emotionText = emotionTextRaw.includes('：')
    ? `${emotionTextRaw.split('：')[0]}(${emotionTextRaw.split('：').slice(1).join('：')})`
    : emotionTextRaw;
  top.innerHTML = `
    <div class="assistant-info-row assistant-info-title">
      <strong>案件信息</strong>
      <span>案件编号：${data.caseNo || '-'}</span>
    </div>
    <div class="assistant-info-row assistant-info-meta">
      <div><strong>当事人信息：</strong>${party}（对方：${counterparty}）</div>
      <div><strong>纠纷类型：</strong>${dispute}</div>
      <div><strong>风险等级：</strong><span class="risk-level ${riskClass}">${riskDesc}</span></div>
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
  const modal = document.getElementById('caseMaterialModal');
  const contentBox = document.getElementById('caseMaterialContent');
  const closeBtn = document.getElementById('closeCaseMaterialBtn');
  if (!modal || !contentBox) {
    return;
  }

  const content = (text || '暂无原始材料').toString();
  contentBox.textContent = content;
  modal.classList.remove('hidden');

  if (closeBtn) {
    closeBtn.onclick = closeCaseMaterial;
  }
  modal.onclick = function (event) {
    if (event.target === modal) {
      closeCaseMaterial();
    }
  };
}

// 关闭案件原始材料弹框。
function closeCaseMaterial() {
  const modal = document.getElementById('caseMaterialModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}


// 展示工作流推荐等待弹框。
function showWorkflowWaitingModal() {
  const modal = document.getElementById('workflowWaitingModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// 关闭工作流推荐等待弹框。
function hideWorkflowWaitingModal() {
  const modal = document.getElementById('workflowWaitingModal');
  if (modal) {
    modal.classList.add('hidden');
  }
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
  if (!box) {
    return;
  }

  const currentNode = currentWorkflowNodeId || 'accept';
  const mediationCategory = THIRD_LEVEL_NODE_MAP[currentNode] || '';

  if (!mediationCategory) {
    const basics = [
      ['当前节点', '已受理'],
      ['案件编号', data.caseNo || '-'],
      ['当事人', `${data.partyName || '-'}（对方：${data.counterpartyName || '-'}）`],
      ['纠纷类型', `${data.disputeType || '-'} / ${data.disputeSubType || '-'}`],
      ['风险等级', data.riskLevel || '-'],
      ['办理进度', data.handlingProgress || '-']
    ];
    box.innerHTML = basics.map(item => `
      <div class="guide-row">
        <span class="guide-key">${item[0]}</span>
        <span class="guide-value">${item[1]}</span>
      </div>
    `).join('');
    return;
  }

  const candidates = disposalOrgOptions.filter(item => item.mediationCategory === mediationCategory);
  const preferredOrgName = selectedOrgByCategory[mediationCategory];
  const adviceMatchedOrg = workflowAdviceRecord && workflowAdviceRecord.recommendedDepartment
    ? candidates.find(item => item.orgName === workflowAdviceRecord.recommendedDepartment)
    : null;
  const currentOrg = candidates.find(item => item.orgName === preferredOrgName) || adviceMatchedOrg || candidates[0] || null;

  if (currentOrg) {
    selectedOrgByCategory[mediationCategory] = currentOrg.orgName;
  }

  const optionsHtml = candidates.map(item => `
    <option value="${item.orgName}" ${currentOrg && item.orgName === currentOrg.orgName ? 'selected' : ''}>${item.orgName || '-'}</option>
  `).join('');

  const detailRows = currentOrg ? [
    ['机构电话', currentOrg.orgPhone],
    ['机构地址', currentOrg.orgAddress],
    ['处置中案件', currentOrg.activeCaseCount],
    ['处置成功率', `${currentOrg.successRate}%`],
    ['分管领导', currentOrg.leaderName],
    ['值班人员', currentOrg.dutyPerson],
    ['值班联系电话', currentOrg.dutyPhone]
  ] : [];


  if (workflowAdviceRecord && mediationCategory === (workflowAdviceRecord.flowLevel3 || '')) {
    detailRows.push(['推荐原因', workflowAdviceRecord.recommendReason || '-']);
    detailRows.push(['备选建议', workflowAdviceRecord.backupSuggestion || '-']);
    detailRows.push(['判断依据', formatRuleHintsHit(workflowAdviceRecord.ruleHintsHit)]);
  }

  const nodeConfirmed = Boolean(confirmedNodeByCategory[mediationCategory]);

  box.innerHTML = `
    <div class="guide-row">
      <span class="guide-key">当前节点</span>
      <span class="guide-value guide-current-node-line">
        <span>${mediationCategory}</span>
        <button
          type="button"
          class="guide-confirm-btn"
          onclick="onGuideNodeConfirm()"
          ${nodeConfirmed ? 'disabled' : ''}
        >${nodeConfirmed ? '已确认' : '确认'}</button>
      </span>
    </div>
    <div class="guide-row guide-row-select">
      <span class="guide-key">推荐部门</span>
      <select id="guideOrgSelect" onchange="onGuideOrgChange(this.value)">
        ${optionsHtml || '<option value="">暂无可选机构</option>'}
      </select>
    </div>
    ${detailRows.map(item => `
      <div class="guide-row">
        <span class="guide-key">${item[0]}</span>
        <span class="guide-value">${item[1] ?? '-'}</span>
      </div>
    `).join('')}
  `;
}


function formatRuleHintsHit(ruleHintsHit) {
  if (Array.isArray(ruleHintsHit)) {
    return ruleHintsHit.filter(Boolean).join(',') || '-';
  }

  const rawText = (ruleHintsHit || '').toString().trim();
  if (!rawText) {
    return '-';
  }

  if (rawText.startsWith('[') && rawText.endsWith(']')) {
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).join(',') || '-';
      }
    } catch (error) {
      return rawText
        .replace(/^\[/, '')
        .replace(/\]$/, '')
        .replace(/"\s*,\s*"/g, ',')
        .replace(/^"|"$/g, '')
        .trim() || '-';
    }
  }

  return rawText;
}

function onGuideNodeConfirm() {
  const mediationCategory = THIRD_LEVEL_NODE_MAP[currentWorkflowNodeId] || '';
  if (!mediationCategory) {
    return;
  }
  confirmedNodeByCategory[mediationCategory] = true;
  renderGuide(assistantDataCache);
}

function onGuideOrgChange(orgName) {
  const mediationCategory = THIRD_LEVEL_NODE_MAP[currentWorkflowNodeId] || '';
  if (!mediationCategory) {
    return;
  }
  selectedOrgByCategory[mediationCategory] = orgName;
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
