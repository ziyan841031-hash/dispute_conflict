// 定义后端接口基础地址。
const API_BASE = 'http://localhost:8080/api';

// 定义文字案件解析状态。
const parseStatus = {
  audio: false,
  text: false,
  classify: false
};

let casesPageNo = 1;
const CASES_PAGE_SIZE = 20;

// 提交文字案件。
async function submitText() {
  // 打开解析弹窗。
  openParseModal('text');
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
  finishParseAndGoCases();
}



function finishParseAndGoCases() {
  setTimeout(() => {
    window.location.href = 'cases.html';
  }, 600);
}

// 提交Excel案件。
async function submitExcel() {
  const file = document.getElementById('excelFile').files[0];
  if (!file) {
    alert('请先选择Excel文件');
    return;
  }

  openParseModal('excel');
  setParseModalMessage('Excel案件批量受理', '表格解析中...');
  updateExcelProgress(0, 0);
  setLoading('text');

  try {
    const form = new FormData();
    form.append('file', file);
    const excelRes = await fetch(`${API_BASE}/cases/ingest/excel`, {method: 'POST', body: form});
    const excelJson = await excelRes.json();
    const caseTextList = Array.isArray(excelJson && excelJson.data) ? excelJson.data : [];

    markDone('text');
    setParseModalMessage('Excel案件批量受理', '案件受理中...');
    const total = caseTextList.length;
    updateExcelProgress(total, 0);

    let finished = 0;
    for (const caseText of caseTextList) {
      setLoading('classify');
      const textRes = await fetch(`${API_BASE}/cases/ingest/text`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({caseText: String(caseText || ''), eventSource: '部门流转'})
      });
      const textJson = await textRes.json();
      const caseId = textJson && textJson.data ? textJson.data.id : null;

      const classifyRes = await fetch(`${API_BASE}/cases/intelligent-classify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({caseId, caseText: String(caseText || '')})
      });
      await classifyRes.json();

      finished += 1;
      updateExcelProgress(total, finished);
    }

    markDone('classify');
    finishParseAndGoCases();
  } catch (error) {
    console.error(error);
    alert('Excel案件处理失败，请稍后重试');
    closeParseModal();
  }
}

// 提交音频案件。
async function submitAudio() {
  const file = document.getElementById('audioFile').files[0];
  if (!file) {
    alert('请先选择音频文件');
    return;
  }

  openParseModal('audio');
  setLoading('audio');

  const form = new FormData();
  form.append('file', file);
  const audioRes = await fetch(`${API_BASE}/cases/ingest/audio`, {method: 'POST', body: form});
  const audioJson = await audioRes.json();
  const audioData = audioJson && audioJson.data ? audioJson.data : {};
  const recognizedText = (audioData && audioData.text) ? audioData.text : '';
  const audioFileUrl = (audioData && audioData.audioFileUrl) ? audioData.audioFileUrl : '';
  markDone('audio');

  setLoading('text');
  const textPayload = {
    caseText: recognizedText,
    eventSource: '来电求助',
    audioFileUrl
  };
  const textRes = await fetch(`${API_BASE}/cases/ingest/text`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(textPayload)
  });
  const textJson = await textRes.json();
  markDone('text');

  const caseId = textJson && textJson.data ? textJson.data.id : null;

  setLoading('classify');
  const classifyRes = await fetch(`${API_BASE}/cases/intelligent-classify`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({caseId, caseText: textPayload.caseText})
  });
  await classifyRes.json();
  markDone('classify');
  finishParseAndGoCases();
}

// 打开解析弹窗。
function openParseModal(mode) {
  parseStatus.audio = false;
  parseStatus.text = false;
  parseStatus.classify = false;
  const audioStep = document.getElementById('step-audio');
  if (audioStep) {
    audioStep.classList.toggle('hidden', mode !== 'audio');
  }
  const textStepText = document.querySelector('#icon-text + .parse-step-text');
  const classifyStepText = document.querySelector('#icon-classify + .parse-step-text');
  if (textStepText) {
    textStepText.textContent = mode === 'excel' ? '表格解析中' : '智能体要素提取中';
  }
  if (classifyStepText) {
    classifyStepText.textContent = mode === 'excel' ? '案件受理中' : '智能分类中';
  }
  setParseModalMessage('案件处理中', '请稍候...');
  const progressEl = document.getElementById('excelProgressText');
  if (progressEl) {
    progressEl.classList.toggle('hidden', mode !== 'excel');
    if (mode !== 'excel') {
      progressEl.textContent = '';
    }
  }
  refreshAllIcons();
  document.getElementById('parseModal').classList.remove('hidden');
}

// 关闭解析弹窗。
function closeParseModal() {
  document.getElementById('parseModal').classList.add('hidden');
}


function setParseModalMessage(title, tip) {
  const titleEl = document.getElementById('parseModalTitle');
  const tipEl = document.getElementById('parseModalTip');
  if (titleEl) {
    titleEl.textContent = title;
  }
  if (tipEl) {
    tipEl.textContent = tip;
  }
}

function updateExcelProgress(total, done) {
  const progressEl = document.getElementById('excelProgressText');
  if (!progressEl) {
    return;
  }
  progressEl.classList.remove('hidden');
  progressEl.textContent = `文件待受理：${total}，文件已受理：${done}`;
}

// 设置处理中图标。
function setLoading(type) {
  const icon = document.getElementById(`icon-${type}`);
  if (!icon) {
    return;
  }
  icon.textContent = '◔';
  icon.classList.add('loading');
  icon.classList.remove('done');
}

// 标记完成图标。
function markDone(type) {
  parseStatus[type] = true;
  const icon = document.getElementById(`icon-${type}`);
  if (!icon) {
    return;
  }
  icon.textContent = '✔';
  icon.classList.add('done');
  icon.classList.remove('loading');
}

// 刷新全部图标。
function refreshAllIcons() {
  refreshOneIcon('audio');
  refreshOneIcon('text');
  refreshOneIcon('classify');
}

// 刷新单个图标。
function refreshOneIcon(type) {
  const icon = document.getElementById(`icon-${type}`);
  if (!icon) {
    return;
  }
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
  const params = new URLSearchParams({keyword, disputeType, eventSource, riskLevel, pageNo: casesPageNo, pageSize: CASES_PAGE_SIZE});
  const res = await fetch(`${API_BASE}/cases?${params}`);
  const json = await res.json();
  const tbody = document.getElementById('caseTableBody');
  tbody.innerHTML = '';

  (json.data.records || []).forEach(item => {
    const tr = document.createElement('tr');
    caseListCache[item.id] = item;
    const actionBtn = `<button onclick="openAssistant(${item.id})">案件管理</button>`;
    tr.innerHTML = `<td>${item.caseNo || '-'}</td><td>${item.partyName || '-'}</td><td>${item.counterpartyName || '-'}</td><td>${item.disputeType || '-'}</td><td>${item.disputeSubType || '-'}</td><td>${item.eventSource || '-'}</td><td>${item.riskLevel || '-'}</td><td>${item.handlingProgress || '-'}</td><td>${item.receiver || '-'}</td><td>${item.registerTime || '-'}</td><td class="action-col">${actionBtn}</td>`;
    tbody.appendChild(tr);
  });
}

async function exportCasesCurrentPage() {
  const keyword = document.getElementById('keyword').value;
  const disputeType = document.getElementById('disputeType').value;
  const eventSource = document.getElementById('eventSource').value;
  const riskLevel = document.getElementById('riskLevel').value;
  const params = new URLSearchParams({keyword, disputeType, eventSource, riskLevel, pageNo: casesPageNo, pageSize: CASES_PAGE_SIZE});
  try {
    const res = await fetch(`${API_BASE}/cases/export?${params.toString()}`);
    if (!res.ok) {
      throw new Error('导出失败');
    }
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `cases-export-page-${casesPageNo}.xlsx`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    alert('导出失败，请稍后重试');
  }
}



// 加载案件统计批次列表。
async function loadStatsBatches() {
  const tbody = document.getElementById('statsBatchBody');
  if (!tbody) {
    return;
  }
  // 请求批次列表。
  const res = await fetch(`${API_BASE}/case-stats/batches`);
  const json = await res.json();
  const rows = (json && json.data) ? json.data : [];
  tbody.innerHTML = '';
  rows.forEach(item => {
    const tr = document.createElement('tr');
    const reportCell = item.reportFileUrl ? `<button type="button" onclick="downloadStatsReport('${item.reportFileUrl}')">下载</button>` : '-';
    tr.innerHTML = `
      <td>${item.batchNo || '-'}</td>
      <td>${item.recordCount || 0}</td>
      <td>${item.importedAt || '-'}</td>
      <td>${item.reportGeneratedAt || '-'}</td>
      <td>${reportCell}</td>
      <td><button onclick="openStatsDetail(${item.id})">查看明细</button></td>
    `;
    tbody.appendChild(tr);
  });
}



// 当前页触发报告下载，不跳转页面。
async function downloadStatsReport(reportUrl) {
  if (!reportUrl) {
    return;
  }
  let url = reportUrl;
  if (!reportUrl.startsWith('http')) {
    const apiRoot = API_BASE.replace(/\/api\/?$/, '');
    url = reportUrl.startsWith('/api/') ? `${apiRoot}${reportUrl}` : `${API_BASE}${reportUrl}`;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`下载失败: ${res.status}`);
    }
    // 将响应体转换为二进制文件流。
    const blob = await res.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    // 优先使用后端响应头中的附件文件名，避免URL末段无后缀导致文件无法打开。
    const disposition = res.headers.get('Content-Disposition') || '';
    let fileName = 'case-stats-report.pptx';
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
    if (utf8Match && utf8Match[1]) {
      fileName = decodeURIComponent(utf8Match[1]);
    } else if (plainMatch && plainMatch[1]) {
      fileName = plainMatch[1];
    } else {
      const pathParts = reportUrl.split('/');
      const urlName = pathParts[pathParts.length - 1] || '';
      if (urlName && urlName.includes('.')) {
        fileName = urlName;
      }
    }
    // 若响应头未给出扩展名，则按内容类型补全后缀。
    if (!/\.[A-Za-z0-9]+$/.test(fileName)) {
      const contentType = (res.headers.get('Content-Type') || '').toLowerCase();
      if (contentType.includes('presentation') || contentType.includes('powerpoint')) {
        fileName = `${fileName}.pptx`;
      } else {
        fileName = `${fileName}.pptx`;
      }
    }
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    alert('报告下载失败，请稍后重试');
  }
}

// 导入案件统计Excel。
async function importStatsExcel() {
  const fileInput = document.getElementById('statsExcelFile');
  const file = fileInput && fileInput.files ? fileInput.files[0] : null;
  if (!file) {
    alert('请先选择Excel文件');
    return;
  }
  const generatingModal = document.getElementById('statsGeneratingModal');
  if (generatingModal) {
    generatingModal.classList.remove('hidden');
  }
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch(`${API_BASE}/case-stats/import-excel`, {method: 'POST', body: form});
    const json = await res.json();
    if (json && json.code === 0) {
      if (fileInput) {
        fileInput.value = '';
      }
      await loadStatsBatches();
      return;
    }
    alert((json && json.message) || '导入失败');
  } catch (error) {
    alert('导入失败');
  } finally {
    if (generatingModal) {
      generatingModal.classList.add('hidden');
    }
  }
}

// 打开统计明细弹窗。
async function openStatsDetail(batchId) {
  const modal = document.getElementById('statsDetailModal');
  const tbody = document.getElementById('statsDetailBody');
  if (!modal || !tbody) {
    return;
  }
  const res = await fetch(`${API_BASE}/case-stats/batches/${batchId}/details`);
  const json = await res.json();
  const rows = (json && json.data) ? json.data : [];
  tbody.innerHTML = '';
  rows.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.serialNo || '-'}</td>
      <td>${item.eventTime || '-'}</td>
      <td>${item.district || '-'}</td>
      <td>${item.streetTown || '-'}</td>
      <td>${item.registerSource || '-'}</td>
      <td>${item.caseType || '-'}</td>
      <td>${item.registerTime || '-'}</td>
      <td>${item.currentStatus || '-'}</td>
    `;
    tbody.appendChild(tr);
  });
  modal.classList.remove('hidden');
}

function closeStatsDetailModal() {
  const modal = document.getElementById('statsDetailModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 打开智能助手页面。
function openAssistant(caseId) {
  const rowData = caseListCache[caseId];
  if (rowData) {
    sessionStorage.setItem('assistantPrefill', JSON.stringify(rowData));
  }
  const waitingModal = document.getElementById('assistantEnterWaitingModal');
  if (waitingModal) {
    waitingModal.classList.remove('hidden');
  }
  setTimeout(() => {
    window.location.href = `assistant.html?caseId=${caseId}`;
  }, 220);
}

// 智能指引补充记录。
const assistantGuideNotes = [];
let assistantDataCache = {};
const caseListCache = {};
let disposalOrgOptions = [];
let currentWorkflowNodeId = 'accept';
const selectedOrgByCategory = {};
let workflowAdviceRecord = null;
let workflowAdviceLoading = false;
let assistantInitialWorkflowDone = false;
let assistantCanvasReady = false;
let timelineTickTimer = null;
const THIRD_LEVEL_NODE_MAP = {
  people: '人民调解',
  admin: '行政调解',
  professional: '专业调解'
};

function mapMediationCategoryToNodeId(category) {
  const value = (category || '').trim();
  if (value === '人民调解') {
    return 'people';
  }
  if (value === '行政调解') {
    return 'admin';
  }
  if (value === '专业调解') {
    return 'professional';
  }
  return '';
}

function getMediationStatusText() {
  return (workflowAdviceRecord && workflowAdviceRecord.mediationStatus) || assistantDataCache.mediationStatus || '';
}

function syncWorkflowLockMeta() {
  const locked = hasMediationStatusLocked();
  const selectedThirdNodeId = mapMediationCategoryToNodeId((workflowAdviceRecord && workflowAdviceRecord.flowLevel3) || assistantDataCache.flowLevel3 || '');
  window.workflowLockMeta = {locked, selectedThirdNodeId};
  if (window.updateWorkflowMediationStatus) {
    window.updateWorkflowMediationStatus(getMediationStatusText() || '');
  }
  if (window.setWorkflowPreferredStatusParent && selectedThirdNodeId) {
    window.setWorkflowPreferredStatusParent(selectedThirdNodeId);
  }
}

window.canWorkflowNodeClick = function (nodeId) {
  const meta = window.workflowLockMeta || {};
  if (!meta.locked) {
    return true;
  }
  const allowed = new Set(['status']);
  if (meta.selectedThirdNodeId) {
    allowed.add(meta.selectedThirdNodeId);
  }
  return allowed.has(nodeId);
};

function hasMediationStatusLocked() {
  const status = getMediationStatusText();
  return Boolean(String(status).trim());
}


// 加载智能助手页面。
async function loadAssistantPage() {
  if (!document.getElementById('assistantTopInfo')) {
    return;
  }

  resetAssistantInitialWaitingState();
  window.onAssistantCanvasReady = function () {
    assistantCanvasReady = true;
    tryHideAssistantInitialWaiting();
  };

  window.onWorkflowNodeChange = async function (nodeId) {
    currentWorkflowNodeId = nodeId || 'accept';

    const mediationType = THIRD_LEVEL_NODE_MAP[currentWorkflowNodeId] || '';
    if (mediationType) {
      if (hasMediationStatusLocked()) {
        renderGuide(assistantDataCache);
        return;
      }
      workflowAdviceLoading = true;
      showWorkflowWaitingModal();
      try {
        const nextAdvice = await triggerDisposalWorkflow(assistantDataCache, mediationType);
        if (nextAdvice) {
          workflowAdviceRecord = nextAdvice;
          syncWorkflowLockMeta();
        }
      } finally {
        workflowAdviceLoading = false;
        hideWorkflowWaitingModal();
      }
    }

    syncWorkflowLockMeta();
    renderGuide(assistantDataCache);
  };

  const caseId = new URLSearchParams(window.location.search).get('caseId');
  if (!caseId) {
    document.getElementById('assistantTopInfo').innerHTML = '<p>缺少 caseId 参数。</p>';
    return;
  }

  const prefill = sessionStorage.getItem('assistantPrefill');
  let prefillDataForCase = null;
  if (prefill) {
    try {
      const prefillData = JSON.parse(prefill);
      if (String(prefillData.id || '') === String(caseId)) {
        prefillDataForCase = prefillData;
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

  assistantDataCache = {
    ...(prefillDataForCase || {}),
    ...(detailData || {})
  };
  if (!assistantDataCache.eventSource && prefillDataForCase && prefillDataForCase.eventSource) {
    assistantDataCache.eventSource = prefillDataForCase.eventSource;
  }
  disposalOrgOptions = orgData || [];

  workflowAdviceLoading = true;
  showWorkflowWaitingModal();
  syncWorkflowLockMeta();
  renderGuide(assistantDataCache);
  try {
    workflowAdviceRecord = await triggerDisposalWorkflow(assistantDataCache);
  } finally {
    workflowAdviceLoading = false;
    assistantInitialWorkflowDone = true;
    tryHideAssistantInitialWaiting();
  }

  if (!workflowAdviceRecord && assistantDataCache && assistantDataCache.caseId) {
    workflowAdviceRecord = {
      caseId: assistantDataCache.caseId,
      flowLevel1: assistantDataCache.flowLevel1 || '',
      flowLevel2: assistantDataCache.flowLevel2 || '',
      flowLevel3: assistantDataCache.flowLevel3 || '',
      recommendedDepartment: assistantDataCache.recommendedDepartment || '',
      mediationStatus: assistantDataCache.mediationStatus || ''
    };
  }

  if (!window.initialWorkflowPreferredStatusParent && assistantDataCache && assistantDataCache.flowLevel3) {
    window.initialWorkflowPreferredStatusParent = mapMediationCategoryToNodeId(assistantDataCache.flowLevel3);
  }

  syncWorkflowSelectionFromAdvice(workflowAdviceRecord);
  syncWorkflowLockMeta();

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

function mapFlowLevelToNodeId(level1, level2, level3, mediationStatus) {
  const l1 = (level1 || '').trim();
  const l2 = (level2 || '').trim();
  const l3 = (level3 || '').trim();
  if (l1 !== '已受理') {
    return 'accept';
  }
  if (l2 !== '调解') {
    return 'accept';
  }
  const statusText = (mediationStatus || '').trim();
  if (statusText) {
    return 'status';
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
  const nodeId = mapFlowLevelToNodeId(record.flowLevel1, record.flowLevel2, record.flowLevel3, record.mediationStatus);
  const hasFullFlowLevel = Boolean((record.flowLevel1 || '').trim() && (record.flowLevel2 || '').trim() && (record.flowLevel3 || '').trim());
  const thirdNodeId = mapMediationCategoryToNodeId(record.flowLevel3 || '');
  currentWorkflowNodeId = nodeId;
  window.initialWorkflowNodeId = nodeId;
  if (hasFullFlowLevel && thirdNodeId) {
    window.initialWorkflowPreferredStatusParent = thirdNodeId;
  }
  if (record.recommendedDepartment && record.flowLevel3) {
    selectedOrgByCategory[record.flowLevel3] = record.recommendedDepartment;
  }
  syncWorkflowLockMeta();
  if (window.setWorkflowPreferredStatusParent && thirdNodeId) {
    window.setWorkflowPreferredStatusParent(thirdNodeId);
  }
  if (window.setWorkflowActiveNode) {
    window.setWorkflowActiveNode(nodeId);
  } else if (window.onWorkflowNodeChange) {
    window.onWorkflowNodeChange(nodeId);
  }
}

// 风险等级说明映射。
const RISK_LEVEL_DESC = {
  低: '仅咨询 / 信息不足 / 冲突极轻微，无升级迹象',
  中: '矛盾较明显，存在纠纷或情绪激动，有一定对抗但无明确人身安全威胁',
  高: '存在明显升级或现实危险，涉及威胁、骚扰、暴力苗头、脆弱群体权益、疑似违法或紧急安全风险'
};

// 归一化风险等级。
function normalizeRiskLevel(level) {
  const raw = (level || '').toString().trim();
  if (RISK_LEVEL_DESC[raw]) {
    return raw;
  }
  const normalized = raw.toUpperCase();
  const map = {
    R0: '低',
    R1: '低',
    R2: '中',
    R3: '高',
    R4: '高',
    LOW: '低',
    MEDIUM: '中',
    HIGH: '高'
  };
  return map[normalized] || '';
}

// 渲染顶部案件信息。
function renderAssistantTop(data) {
  const top = document.getElementById('assistantTopInfo');
  const party = data.partyName || '-';
  const counterparty = data.counterpartyName || '-';
  const summary = data.judgementBasisText || data.factsSummary || data.caseText || '-';
  const dispute = `${data.disputeType || '-'} / ${data.disputeSubType || '-'}`;
  const riskLevel = normalizeRiskLevel(data.riskLevel);
  const riskDesc = riskLevel ? `${riskLevel}(${RISK_LEVEL_DESC[riskLevel]})` : (data.riskLevel || '-');
  const riskClassMap = { 低: 'risk-low', 中: 'risk-medium', 高: 'risk-high' };
  const riskClass = riskLevel ? (riskClassMap[riskLevel] || '') : '';
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
      showCaseMaterial(data);
    });
  }
  if (window.updateWorkflowAcceptTime) {
    window.updateWorkflowAcceptTime(data.registerTime || '--');
  }
}

// 格式化案件详情字段展示值。
function formatDetailValue(value) {
  if (value === null || value === undefined) {
    return '-';
  }
  const text = String(value).trim();
  return text ? text : '-';
}

// 展示案件详情。
function showCaseMaterial(data) {
  const modal = document.getElementById('caseMaterialModal');
  const contentBox = document.getElementById('caseMaterialContent');
  const closeBtn = document.getElementById('closeCaseMaterialBtn');
  const optimizeBtn = document.getElementById('openCaseOptimizeBtn');
  const audioBtn = document.getElementById('playCaseAudioBtn');
  if (!modal || !contentBox) {
    return;
  }

  const safeData = data || {};
  const rawMaterial = safeData.caseText || safeData.materialText || safeData.rawMaterial;

  const partyItems = [
    {label: '姓名', value: safeData.partyName},
    {label: '身份证号', value: safeData.partyId},
    {label: '联系电话', value: safeData.partyPhone},
    {label: '联系地址', value: safeData.partyAddress}
  ];

  const counterpartyItems = [
    {label: '姓名', value: safeData.counterpartyName},
    {label: '身份证号', value: safeData.counterpartyId},
    {label: '联系电话', value: safeData.counterpartyPhone},
    {label: '联系地址', value: safeData.counterpartyAddress}
  ];

  const caseTopItems = [
    {label: '案件编号', value: safeData.caseNo},
    {label: '登记时间', value: safeData.registerTime},
    {label: '事件来源', value: safeData.eventSource},
    {label: '办理进度', value: safeData.handlingProgress}
  ];

  const caseBasicItems = [
    {label: '纠纷类型', value: safeData.disputeType},
    {label: '纠纷子类型', value: safeData.disputeSubType},
    {label: '纠纷发生地', value: safeData.disputeLocation},
    {label: '风险等级', value: safeData.riskLevel},
    {label: '接待人', value: safeData.receiver}
  ];

  const smartSummary = safeData.judgementBasisText || safeData.factsSummary || safeData.summaryText || '-';

  const renderGrid = items => `<div class="case-detail-grid">${items.map(item => `<div class="case-detail-item"><span class="case-detail-label">${item.label}</span><span class="case-detail-value">${formatDetailValue(item.value)}</span></div>`).join('')}</div>`;

  contentBox.innerHTML = `
    <section class="case-detail-section case-detail-raw">
      <h4>案件原文</h4>
      <div class="case-detail-text">${formatDetailValue(rawMaterial)}</div>
      ${renderGrid(caseTopItems)}
    </section>
    <section class="case-detail-section">
      <h4>案件基本信息</h4>
      ${renderGrid(caseBasicItems)}
    </section>
    <div class="case-detail-bottom-grid">
      <section class="case-detail-section">
        <h4>当事人信息</h4>
        ${renderGrid(partyItems)}
      </section>
      <section class="case-detail-section">
        <h4>对方当事人信息</h4>
        ${renderGrid(counterpartyItems)}
      </section>
    </div>
    <section class="case-detail-section case-detail-summary">
      <h4>案件智能摘要</h4>
      <div class="case-detail-text">${formatDetailValue(smartSummary)}</div>
    </section>
  `;
  modal.classList.remove('hidden');

  if (closeBtn) {
    closeBtn.onclick = closeCaseMaterial;
  }
  if (optimizeBtn) {
    optimizeBtn.onclick = function () {
      openCaseOptimizeDialog(safeData);
    };
  }
  if (audioBtn) {
    audioBtn.textContent = '▶ 音频';
    audioBtn.onclick = function () {
      toggleCaseAudioPlay(safeData);
    };
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
  if (caseAudioPlayer) {
    caseAudioPlayer.pause();
  }
  stopCaseAudioCountdown();
  const audioBtn = document.getElementById('playCaseAudioBtn');
  if (audioBtn) {
    audioBtn.textContent = '▶ 音频';
    audioBtn.classList.remove('audio-counting');
  }
}


let currentCaseOptimizeData = null;
let caseAudioPlayer = null;
let caseAudioCountdownTimer = null;
let caseOptimizeSubmitting = false;

function openCaseOptimizeDialog(data) {
  const modal = document.getElementById('caseOptimizeModal');
  const content = document.getElementById('caseOptimizeContent');
  const input = document.getElementById('caseOptimizeInput');
  if (!modal || !content) {
    return;
  }
  currentCaseOptimizeData = data || {};
  const caseNo = formatDetailValue(currentCaseOptimizeData.caseNo);
  content.innerHTML = `
    <div class="case-optimize-chat-msg bot">您好，感谢您使用本系统。请您用一句话描述本案办理中最希望优化的点，我们会持续改进。</div>
    <div class="case-optimize-chat-meta">当前案件编号：${caseNo}</div>
  `;
  if (input) {
    input.value = '';
  }
  modal.classList.remove('hidden');
}

function onCaseOptimizeInputKeydown(event) {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    submitCaseOptimizeFeedback();
  }
}

async function submitCaseOptimizeFeedback() {
  const input = document.getElementById('caseOptimizeInput');
  const content = document.getElementById('caseOptimizeContent');
  const submitBtn = document.getElementById('caseOptimizeSubmitBtn');
  if (!input || !content || caseOptimizeSubmitting) {
    return;
  }
  const correctionHint = String(input.value || '').trim();
  if (!correctionHint) {
    alert('请输入评价建议');
    return;
  }
  const caseId = currentCaseOptimizeData && currentCaseOptimizeData.caseId;
  if (!caseId) {
    alert('案件信息缺失，无法提交建议');
    return;
  }
  caseOptimizeSubmitting = true;
  if (submitBtn) {
    submitBtn.disabled = true;
  }
  input.disabled = true;

  content.insertAdjacentHTML('beforeend', `<div class="case-optimize-chat-msg user">${correctionHint}</div>`);
  const waitingId = `optimize-waiting-${Date.now()}`;
  content.insertAdjacentHTML('beforeend', `<div id="${waitingId}" class="case-optimize-chat-msg bot case-optimize-waiting">智能体分析中<span class="dotting">...</span></div>`);
  content.scrollTop = content.scrollHeight;
  input.value = '';
  try {
    const res = await fetch(`${API_BASE}/cases/optimization-feedback`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({caseId, caseText: String((currentCaseOptimizeData && currentCaseOptimizeData.caseText) || ''), correctionHint})
    });
    const json = await res.json();
    const waitingEl = document.getElementById(waitingId);
    if (waitingEl) {
      waitingEl.remove();
    }
    if (json && json.code === 0) {
      content.insertAdjacentHTML('beforeend', '<div class="case-optimize-chat-msg bot">感谢您的评价建议，已提交成功。</div>');
      return;
    }
    content.insertAdjacentHTML('beforeend', `<div class="case-optimize-chat-msg bot">提交失败：${(json && json.message) || '请稍后重试'}</div>`);
  } catch (error) {
    const waitingEl = document.getElementById(waitingId);
    if (waitingEl) {
      waitingEl.remove();
    }
    content.insertAdjacentHTML('beforeend', '<div class="case-optimize-chat-msg bot">提交失败，请稍后重试。</div>');
  } finally {
    caseOptimizeSubmitting = false;
    input.disabled = false;
    if (submitBtn) {
      submitBtn.disabled = false;
    }
    content.scrollTop = content.scrollHeight;
  }
}

function closeCaseOptimizeDialog() {
  const modal = document.getElementById('caseOptimizeModal');
  if (modal) {
    modal.classList.add('hidden');
  }
  currentCaseOptimizeData = null;
  caseOptimizeSubmitting = false;
}


function toggleCaseAudioPlay(data) {
  const btn = document.getElementById('playCaseAudioBtn');
  if (!btn) {
    return;
  }
  const audioUrl = data && data.audioFileUrl ? String(data.audioFileUrl) : '';
  if (!audioUrl) {
    alert('当前案件暂无音频文件');
    return;
  }
  if (!caseAudioPlayer || caseAudioPlayer.src !== audioUrl) {
    if (caseAudioPlayer) {
      caseAudioPlayer.pause();
    }
    stopCaseAudioCountdown();
    caseAudioPlayer = new Audio(audioUrl);
    caseAudioPlayer.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(caseAudioPlayer.duration) && caseAudioPlayer.duration > 0) {
        btn.textContent = `▶ 音频 ${formatAudioDuration(caseAudioPlayer.duration)}`;
      }
    });
    caseAudioPlayer.addEventListener('timeupdate', () => {
      if (!caseAudioPlayer.paused) {
        renderCaseAudioRemaining();
      }
    });
    caseAudioPlayer.addEventListener('ended', () => {
      stopCaseAudioCountdown();
      btn.classList.remove('audio-counting');
      btn.textContent = '▶ 音频 00:00';
    });
  }

  if (caseAudioPlayer.paused) {
    caseAudioPlayer.play().then(() => {
      btn.classList.add('audio-counting');
      renderCaseAudioRemaining();
      startCaseAudioCountdown();
    }).catch(() => {
      alert('音频播放失败，请检查链接是否可访问');
    });
    return;
  }
  caseAudioPlayer.pause();
  stopCaseAudioCountdown();
  btn.classList.remove('audio-counting');
  renderCaseAudioRemaining('▶');
}

function startCaseAudioCountdown() {
  stopCaseAudioCountdown();
  caseAudioCountdownTimer = setInterval(() => {
    renderCaseAudioRemaining();
  }, 1000);
}

function stopCaseAudioCountdown() {
  if (caseAudioCountdownTimer) {
    clearInterval(caseAudioCountdownTimer);
    caseAudioCountdownTimer = null;
  }
}

function renderCaseAudioRemaining(icon = '⏸') {
  const btn = document.getElementById('playCaseAudioBtn');
  if (!btn || !caseAudioPlayer) {
    return;
  }
  const duration = Number(caseAudioPlayer.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    btn.textContent = `${icon} 音频`;
    return;
  }
  const current = Number(caseAudioPlayer.currentTime) || 0;
  const remaining = Math.max(0, duration - current);
  btn.textContent = `${icon} 音频 ${formatAudioDuration(remaining)}`;
}

function formatAudioDuration(seconds) {
  const sec = Math.max(0, Math.floor(Number(seconds) || 0));
  const minute = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${String(minute).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}


async function loadOptimizationFeedbacks() {
  const tbody = document.getElementById('feedbackTableBody');
  if (!tbody) {
    return;
  }
  const res = await fetch(`${API_BASE}/cases/optimization-feedbacks`);
  const json = await res.json();
  const rows = Array.isArray(json && json.data) ? json.data : [];
  tbody.innerHTML = '';
  rows.forEach((item) => {
    const tr = document.createElement('tr');
    const detailBtn = `<button type="button" onclick="openFeedbackDetail(${item.id || 0})">详情</button>`;
    tr.innerHTML = `<td>${item.id || '-'}</td><td>${item.caseId || '-'}</td><td>${item.caseNo || '-'}</td><td>${item.suggestionContent || '-'}</td><td>${item.createdAt || '-'}</td><td class="action-col">${detailBtn}</td>`;
    tr.dataset.feedbackRow = JSON.stringify(item || {});
    tbody.appendChild(tr);
  });
}

function openFeedbackDetail(feedbackId) {
  const modal = document.getElementById('feedbackDetailModal');
  const pre = document.getElementById('feedbackDetailContent');
  if (!modal || !pre) {
    return;
  }
  const row = Array.from(document.querySelectorAll('#feedbackTableBody tr')).find((tr) => {
    try {
      const data = JSON.parse(tr.dataset.feedbackRow || '{}');
      return String(data.id || '') === String(feedbackId || '');
    } catch (error) {
      return false;
    }
  });
  if (!row) {
    pre.textContent = '-';
    modal.classList.remove('hidden');
    return;
  }
  let data = {};
  try {
    data = JSON.parse(row.dataset.feedbackRow || '{}');
  } catch (error) {
    data = {};
  }
  const difyResponse = data && data.difyResponse ? String(data.difyResponse) : '';
  pre.textContent = formatFeedbackDetailText(difyResponse);
  modal.classList.remove('hidden');
}

function formatFeedbackDetailText(rawText) {
  const text = String(rawText || '').trim();
  if (!text) {
    return '暂无接口响应报文';
  }
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      const outputs = parsed.outputs && typeof parsed.outputs === 'object' ? parsed.outputs : null;
      const dataOutputs = parsed.data && parsed.data.outputs && typeof parsed.data.outputs === 'object' ? parsed.data.outputs : null;
      const textParts = [];

      const pushIfText = (value) => {
        if (value === null || value === undefined) {
          return;
        }
        if (typeof value === 'string') {
          const v = value.trim();
          if (v) {
            textParts.push(v);
          }
          return;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
          textParts.push(String(value));
          return;
        }
        if (Array.isArray(value)) {
          value.forEach(pushIfText);
          return;
        }
        if (typeof value === 'object') {
          Object.keys(value).forEach((key) => {
            pushIfText(value[key]);
          });
        }
      };

      const collectPreferred = (obj) => {
        if (!obj || typeof obj !== 'object') {
          return;
        }
        pushIfText(obj.text);
        pushIfText(obj.answer);
        pushIfText(obj.result);
        pushIfText(obj.result_json);
        pushIfText(obj.summary);
        pushIfText(obj.advice);
      };

      collectPreferred(outputs);
      collectPreferred(dataOutputs);
      if (!textParts.length) {
        pushIfText(parsed);
      }

      const deduped = Array.from(new Set(textParts.map((item) => item.trim()).filter(Boolean)));
      if (deduped.length) {
        return deduped.join('\n\n');
      }
    }
  } catch (error) {
  }
  return text;
}

function closeFeedbackDetailModal() {
  const modal = document.getElementById('feedbackDetailModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// 展示工作流推荐等待弹框。
function showWorkflowWaitingModal(titleText = '智能体推荐中', descText = '正在结合案件特征匹配推荐部门，请稍候...') {
  const modal = document.getElementById('workflowWaitingModal');
  const title = document.getElementById('workflowWaitingTitle');
  const desc = document.getElementById('workflowWaitingDesc');
  if (title) {
    title.textContent = titleText;
  }
  if (desc) {
    desc.textContent = descText;
  }
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


function tryHideAssistantInitialWaiting() {
  if (assistantInitialWorkflowDone && assistantCanvasReady) {
    hideWorkflowWaitingModal();
  }
}

function resetAssistantInitialWaitingState() {
  assistantInitialWorkflowDone = false;
  assistantCanvasReady = false;
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

function buildMediationAdviceBlock(adviceHtml) {
  const html = (adviceHtml || '').toString().trim();
  if (!html) {
    return '';
  }
  return `
    <div class="guide-advice-block">
      <div class="guide-advice-title">调解建议</div>
      <div class="guide-advice-html">${html}</div>
    </div>
  `;
}

// 渲染智能指引。
function renderGuide(data) {
  const box = document.getElementById('guideList');
  if (!box) {
    return;
  }

  const currentNode = currentWorkflowNodeId || 'accept';
  const mediationCategory = THIRD_LEVEL_NODE_MAP[currentNode] || '';
  const mediationAdviceHtml = (workflowAdviceRecord && workflowAdviceRecord.mediationAdvice) || data.mediationAdvice || '';
  const isThirdNodeSelected = ['people', 'admin', 'professional'].includes(currentNode);

  if (currentNode === 'status' && getMediationStatusText() === '调解中') {
    box.classList.add('guide-advice-only');
    box.innerHTML = buildMediationAdviceBlock(mediationAdviceHtml || '<p>暂无调解建议</p>');
    return;
  }
  box.classList.remove('guide-advice-only');

  if (!mediationCategory) {
    const basics = [
      ['当前节点', hasMediationStatusLocked() ? '调解状态' : '已受理'],
      ['案件编号', data.caseNo || '-'],
      ['当事人', `${data.partyName || '-'}（对方：${data.counterpartyName || '-'}）`],
      ['纠纷类型', `${data.disputeType || '-'} / ${data.disputeSubType || '-'}`],
      ['风险等级', data.riskLevel || '-'],
      ['办理进度', data.handlingProgress || '-']
    ];
    if (hasMediationStatusLocked()) {
      basics.push(['调解状态', getMediationStatusText() || data.mediationStatus || '-']);
    }
    box.innerHTML = basics.map(item => `
      <div class="guide-row">
        <span class="guide-key">${item[0]}</span>
        <span class="guide-value">${item[1]}</span>
      </div>
    `).join('') + buildMediationAdviceBlock(mediationAdviceHtml);
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

  const statusLocked = hasMediationStatusLocked();
  const mediationStatusText = getMediationStatusText();

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

  if (mediationStatusText) {
    detailRows.push(['调解状态', mediationStatusText]);
  }

  box.innerHTML = `
    <div class="guide-row">
      <span class="guide-key">当前节点</span>
      <span class="guide-value guide-current-node-line">
        <span class="guide-current-node-name">${mediationCategory}</span>
        <button
          type="button"
          class="guide-confirm-btn"
          onclick="onGuideNodeConfirm()"
          ${statusLocked ? 'disabled' : ''}
>${statusLocked ? '已确认' : '确认'}</button>
      </span>
    </div>
    <div class="guide-row guide-row-select">
      <span class="guide-key">推荐部门</span>
      <select id="guideOrgSelect" onchange="onGuideOrgChange(this.value)" ${statusLocked ? 'disabled' : ''}>
        ${optionsHtml || '<option value="">暂无可选机构</option>'}
      </select>
    </div>
    ${detailRows.map(item => `
      <div class="guide-row">
        <span class="guide-key">${item[0]}</span>
        <span class="guide-value">${item[1] ?? '-'}</span>
      </div>
    `).join('')}
    ${isThirdNodeSelected ? '' : buildMediationAdviceBlock(mediationAdviceHtml)}
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

async function onGuideNodeConfirm() {
  const mediationCategory = THIRD_LEVEL_NODE_MAP[currentWorkflowNodeId] || '';
  if (!mediationCategory || hasMediationStatusLocked()) {
    return;
  }
  const caseId = (assistantDataCache && assistantDataCache.caseId) || (workflowAdviceRecord && workflowAdviceRecord.caseId);
  if (!caseId) {
    return;
  }

  try {
    showWorkflowWaitingModal('智能体推荐中', '调解建议生成中');
    const res = await fetch(`${API_BASE}/dify/workflow-confirm`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        caseId,
        variables: {
          case_summary: assistantDataCache.factsSummary || '',
          case_category: assistantDataCache.modelSuggestedCategoryL2 || assistantDataCache.disputeSubType || '',
          department_name: (workflowAdviceRecord && workflowAdviceRecord.recommendReason) || ''
        }
      })
    });
    const json = await res.json();
    const payload = json && json.data ? json.data : null;
    const record = payload && payload.record ? payload.record : payload;
    if (record) {
      workflowAdviceRecord = record;
      assistantDataCache.mediationStatus = record.mediationStatus || '调解中';
      assistantDataCache.mediationAdvice = record.mediationAdvice || assistantDataCache.mediationAdvice || '';
      assistantDataCache.diversionCompletedAt = record.diversionCompletedAt || assistantDataCache.diversionCompletedAt || '';
      assistantDataCache.mediationCompletedAt = record.mediationCompletedAt || assistantDataCache.mediationCompletedAt || '';
      assistantDataCache.workflowCreatedAt = record.workflowCreatedAt || record.createdAt || assistantDataCache.workflowCreatedAt || '';
      workflowAdviceRecord.flowLevel3 = workflowAdviceRecord.flowLevel3 || mediationCategory;
      currentWorkflowNodeId = 'status';
      syncWorkflowLockMeta();
      if (window.setWorkflowActiveNode) {
        window.setWorkflowActiveNode('status');
      }
    }
  } finally {
    hideWorkflowWaitingModal();
    syncWorkflowLockMeta();
    renderGuide(assistantDataCache);
    renderTimeline(assistantDataCache);
    renderAssistantTop(assistantDataCache);
  }
}

function onGuideOrgChange(orgName) {
  const mediationCategory = THIRD_LEVEL_NODE_MAP[currentWorkflowNodeId] || '';
  if (!mediationCategory) {
    return;
  }
  if (hasMediationStatusLocked()) {
    return;
  }
  selectedOrgByCategory[mediationCategory] = orgName;
  renderGuide(assistantDataCache);
}

// 渲染案件时间线（竖状）。
function renderTimeline(data) {
  const box = document.getElementById('timelineList');
  if (!box) {
    return;
  }
  if (timelineTickTimer) {
    clearInterval(timelineTickTimer);
    timelineTickTimer = null;
  }

  const diversionCompletedAt = data.diversionCompletedAt;
  const mediationCompletedAt = data.mediationCompletedAt;
  const mediationStatus = String(data.mediationStatus || '').trim();

  const diversionEnter = formatTimelineTime(data.workflowCreatedAt || data.createdAt);
  const diversionDone = formatTimelineTime(diversionCompletedAt);
  const statusEnterTime = parseTimelineDate(diversionCompletedAt);
  const statusEnter = formatTimelineTime(statusEnterTime);
  const mediationDone = formatTimelineTime(mediationCompletedAt);
  const showCurrentProcessingTime = mediationStatus === '调解中';

  const actionButtons = mediationStatus === '调解中'
    ? `
      <div class="timeline-action-row timeline-action-row-top">
        <button type="button" class="timeline-action-btn" onclick="onTimelineUrge()">⚡ 催办</button>
        <button type="button" class="timeline-action-btn timeline-action-btn-warning" onclick="onTimelineSupervise()">🛡 督办</button>
      </div>
    `
    : '';

  const timeline = [
    {
      name: '调解状态',
      enter: statusEnter,
      done: showCurrentProcessingTime
        ? '<span id="timelineCurrentProcessingTime" class="timeline-dynamic-time">-</span>'
        : mediationDone,
      enterLabel: '进入时间',
      doneLabel: '处理完成时间',
      extra: actionButtons
    },
    {
      name: '调解分流',
      enter: diversionEnter,
      done: diversionDone,
      enterLabel: '进入时间',
      doneLabel: '处理完成时间',
      extra: ''
    }
  ];

  const statusPill = mediationStatus
    ? `<span class="timeline-status-pill ${mediationStatus === '调解中' ? 'is-processing' : 'is-finished'}">${mediationStatus}</span>`
    : '<span class="timeline-status-pill">已受理</span>';

  const timelineHtml = timeline.map(item => {
    const cards = [];
    if (hasTimelineValue(item.enter)) {
      cards.push(`
        <div class="timeline-time-card">
          <span class="timeline-time-label">${item.enterLabel}</span>
          <span class="timeline-time-value">${item.enter}</span>
        </div>
      `);
    }
    if (hasTimelineValue(item.done)) {
      cards.push(`
        <div class="timeline-time-card">
          <span class="timeline-time-label">${item.doneLabel}</span>
          <span class="timeline-time-value">${item.done}</span>
        </div>
      `);
    }
    if (cards.length === 0 && !item.extra) {
      return '';
    }
    return `
      <div class="timeline-row timeline-row-ios">
        <div class="timeline-stage-title">${item.name}</div>
        <div class="timeline-time-grid">${cards.join('')}</div>
        ${item.extra || ''}
      </div>
    `;
  }).join('');

  box.innerHTML = `
    <div class="timeline-ios-head">
      <strong>办理状态时间轴</strong>
      ${statusPill}
    </div>
    ${timelineHtml}
  `;

  if (showCurrentProcessingTime) {
    const target = document.getElementById('timelineCurrentProcessingTime');
    const refresh = () => {
      if (!target) {
        return;
      }
      target.textContent = formatTimelineDuration(statusEnterTime, new Date());
    };
    refresh();
    timelineTickTimer = setInterval(refresh, 1000);
  }
}

function hasTimelineValue(value) {
  if (value === null || value === undefined) {
    return false;
  }
  const text = String(value).trim();
  return text !== '' && text !== '-';
}

function formatTimelineTime(value) {
  if (!value) {
    return '-';
  }
  const date = parseTimelineDate(value);
  if (!date) {
    return String(value);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function parseTimelineDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function formatTimelineDuration(start, end) {
  if (!start || !end) {
    return '-';
  }
  const seconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainSeconds = seconds % 60;
  return `${days}天${hours}时${minutes}分${remainSeconds}秒`;
}

function onTimelineUrge() {
  alert('已发起催办');
}

function onTimelineSupervise() {
  alert('已发起督办');
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


let lawAgentRole = '普通市民';
let lawAgentLoginToken = '';
let lawAgentRequestType = 0;
let lawAgentLastRawResponse = '0';

function openRealtimeTranscription() {
  openHomeToolDialog('语音实时转录', 'http://218.78.134.191:17989');
}

function openAddToolTip() {
  alert('更多智能工具即将上线');
}


function openHomeToolDialog(title, url) {
  const modal = document.getElementById('homeToolModal');
  const frame = document.getElementById('homeToolFrame');
  const titleEl = document.getElementById('homeToolTitle');
  if (!modal || !frame || !titleEl) {
    if (url) {
      window.open(url, '_blank');
    }
    return;
  }
  titleEl.textContent = title || '工具窗口';
  frame.src = url || 'about:blank';
  modal.classList.remove('hidden');
  modal.onclick = function (event) {
    if (event.target === modal) {
      closeHomeToolDialog();
    }
  };
}

function closeHomeToolDialog() {
  const modal = document.getElementById('homeToolModal');
  const frame = document.getElementById('homeToolFrame');
  if (modal) {
    modal.classList.add('hidden');
  }
  if (frame) {
    frame.src = 'about:blank';
  }
}

function openHomeFeedbackDialog() {
  openHomeToolDialog('评价反馈', 'feedback-list.html?popup=1');
}

async function openLawServiceDialog() {
  const modal = document.getElementById('lawAgentModal');
  const list = document.getElementById('lawAgentChatList');
  if (!modal || !list) {
    return;
  }
  const loginOk = await loginLawServiceAgent();
  if (!loginOk) {
    alert('获取失败请稍后再试');
    return;
  }
  modal.classList.remove('hidden');
  refreshLawRoleButtons();
  if (!list.dataset.inited) {
    appendLawAgentMessage('assistant', '您好，我是法律服务对话智能体。请描述您的问题，我将为您提供法律参考建议。');
    list.dataset.inited = '1';
  }
}


async function loginLawServiceAgent() {
  try {
    const res = await fetch(`${API_BASE}/dify/xbg/login`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({role: lawAgentRole})
    });
    const json = await res.json();
    if (!json || json.code !== 0 || !json.data) {
      return false;
    }
    lawAgentLoginToken = json.data;
    return true;
  } catch (error) {
    return false;
  }
}

function selectLawAgentRole(role) {
  lawAgentRole = role === '解纷工作人员' ? '解纷工作人员' : '普通市民';
  refreshLawRoleButtons();
}

function refreshLawRoleButtons() {
  const citizen = document.getElementById('lawRoleCitizen');
  const worker = document.getElementById('lawRoleWorker');
  if (citizen) {
    citizen.classList.toggle('active', lawAgentRole === '普通市民');
  }
  if (worker) {
    worker.classList.toggle('active', lawAgentRole === '解纷工作人员');
  }
}

function closeLawServiceDialog() {
  const modal = document.getElementById('lawAgentModal');
  const list = document.getElementById('lawAgentChatList');
  if (modal) {
    modal.classList.add('hidden');
  }
  if (list) {
    list.querySelectorAll('.law-agent-msg').forEach(item => {
      if (item._typingTimer) {
        clearInterval(item._typingTimer);
        item._typingTimer = null;
      }
    });
    list.innerHTML = '';
    list.dataset.inited = '';
  }
  lawAgentRequestType = 0;
  lawAgentLastRawResponse = '0';
}

function onLawAgentInputKeydown(event) {
  if (event && event.key === 'Enter') {
    event.preventDefault();
    sendLawAgentMessage();
  }
}

async function sendLawAgentMessage() {
  const input = document.getElementById('lawAgentInput');
  if (!input) {
    return;
  }
  const question = String(input.value || '').trim();
  if (!question) {
    return;
  }
  appendLawAgentMessage('user', question);
  input.value = '';

  const waitingNode = appendLawAgentMessage('assistant', '智能体思考中...');
  try {
    const res = await fetch(`${API_BASE}/dify/chat-message`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        question,
        role: lawAgentRole,
        token: lawAgentLoginToken,
        type: lawAgentRequestType,
        rawResponse: lawAgentLastRawResponse
      })
    });
    const json = await res.json();
    const payload = json && json.data ? json.data : {};
    const dataObj = payload && payload.data ? payload.data : payload;
    const answer = dataObj.answer || dataObj.text || dataObj.output || dataObj.content || '';
    const rawResponse = dataObj.rawResponse || answer || '';
    if (answer) {
      updateLawAgentMessage(waitingNode, answer, lawAgentRequestType !== 2);
      lawAgentLastRawResponse = rawResponse || lawAgentLastRawResponse;
      lawAgentRequestType = 1;
      return;
    }
  } catch (error) {
  }
  updateLawAgentMessage(waitingNode, '智能体思考中...', false);
}

async function askLawAgentRecommendation(tag) {
  if (!lawAgentLoginToken || !lawAgentLastRawResponse || lawAgentLastRawResponse === '0') {
    return;
  }
  const waitingNode = appendLawAgentMessage('assistant', '智能体思考中...');
  try {
    const res = await fetch(`${API_BASE}/dify/chat-message`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        question: tag,
        role: lawAgentRole,
        token: lawAgentLoginToken,
        type: 2,
        rawResponse: lawAgentLastRawResponse
      })
    });
    const json = await res.json();
    const payload = json && json.data ? json.data : {};
    const dataObj = payload && payload.data ? payload.data : payload;
    const answer = dataObj.answer || dataObj.text || dataObj.output || dataObj.content || '';
    if (answer) {
      updateLawAgentMessage(waitingNode, answer, false);
      return;
    }
  } catch (error) {
  }
  updateLawAgentMessage(waitingNode, '智能体思考中...', false);
}

function appendLawAgentMessage(role, text) {
  const list = document.getElementById('lawAgentChatList');
  if (!list) {
    return null;
  }
  const item = document.createElement('div');
  item.className = `law-agent-msg ${role === 'user' ? 'user' : 'assistant'}`;
  item.textContent = text || '';
  list.appendChild(item);
  list.scrollTop = list.scrollHeight;
  return item;
}

function updateLawAgentMessage(node, text, withRecommendLinks) {
  if (!node) {
    return;
  }
  animateLawAgentTyping(node, text || '', () => {
    if (withRecommendLinks) {
      const actions = document.createElement('div');
      actions.className = 'law-agent-recommend-links';
      const lawLink = document.createElement('button');
      lawLink.type = 'button';
      lawLink.className = 'law-agent-link-btn';
      lawLink.textContent = '相关法条推荐';
      lawLink.onclick = () => askLawAgentRecommendation('相关法条推荐');
      const caseLink = document.createElement('button');
      caseLink.type = 'button';
      caseLink.className = 'law-agent-link-btn';
      caseLink.textContent = '相关类案推荐';
      caseLink.onclick = () => askLawAgentRecommendation('相关类案推荐');
      actions.appendChild(lawLink);
      actions.appendChild(caseLink);
      node.appendChild(actions);
    }
    const list = document.getElementById('lawAgentChatList');
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  });
}

function animateLawAgentTyping(node, text, onDone) {
  if (!node) {
    return;
  }
  if (node._typingTimer) {
    clearInterval(node._typingTimer);
    node._typingTimer = null;
  }
  node.textContent = '';
  const content = String(text || '');
  let index = 0;
  const step = () => {
    index += 1;
    node.textContent = content.slice(0, index);
    const list = document.getElementById('lawAgentChatList');
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
    if (index >= content.length) {
      if (node._typingTimer) {
        clearInterval(node._typingTimer);
        node._typingTimer = null;
      }
      if (onDone) {
        onDone();
      }
    }
  };
  if (!content) {
    if (onDone) {
      onDone();
    }
    return;
  }
  step();
  node._typingTimer = setInterval(step, 22);
}
