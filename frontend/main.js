// 定义后端接口基础地址。
const API_BASE = 'http://localhost:8080/api';

// 定义解析状态。
const parseStatus = {
  text: false,
  excel: false,
  audio: false
};

// 提交文字案件。
async function submitText() {
  // 打开解析弹窗。
  openParseModal();
  // 标记文字接口处理中。
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
    // 指定请求方法。
    method: 'POST',
    // 指定请求头。
    headers: {'Content-Type': 'application/json'},
    // 指定请求体。
    body: JSON.stringify(payload)
  });
  // 渲染返回结果。
  renderResult(await res.json());
  // 标记文字接口完成。
  markDone('text');
}

// 提交Excel案件。
async function submitExcel() {
  // 打开解析弹窗。
  openParseModal();
  // 标记Excel接口处理中。
  setLoading('excel');

  // 获取文件对象。
  const file = document.getElementById('excelFile').files[0];
  // 创建form-data对象。
  const form = new FormData();
  // 附加文件字段。
  form.append('file', file);
  // 发起POST请求。
  const res = await fetch(`${API_BASE}/cases/ingest/excel`, {method: 'POST', body: form});
  // 渲染返回结果。
  renderResult(await res.json());
  // 标记Excel接口完成。
  markDone('excel');
}

// 提交音频案件。
async function submitAudio() {
  // 打开解析弹窗。
  openParseModal();
  // 标记音频接口处理中。
  setLoading('audio');

  // 获取文件对象。
  const file = document.getElementById('audioFile').files[0];
  // 创建form-data对象。
  const form = new FormData();
  // 附加文件字段。
  form.append('file', file);
  // 发起POST请求。
  const res = await fetch(`${API_BASE}/cases/ingest/audio`, {method: 'POST', body: form});
  // 渲染返回结果。
  renderResult(await res.json());
  // 标记音频接口完成。
  markDone('audio');
}

// 打开解析弹窗。
function openParseModal() {
  // 获取弹窗节点。
  const modal = document.getElementById('parseModal');
  // 移除隐藏样式。
  modal.classList.remove('hidden');
  // 刷新图标状态。
  refreshAllIcons();
}

// 关闭解析弹窗。
function closeParseModal() {
  // 获取弹窗节点。
  const modal = document.getElementById('parseModal');
  // 添加隐藏样式。
  modal.classList.add('hidden');
}

// 设置某接口为处理中。
function setLoading(type) {
  // 获取图标节点。
  const icon = document.getElementById(`icon-${type}`);
  // 更新图标为处理中。
  icon.textContent = '◔';
  // 添加处理中样式。
  icon.classList.add('loading');
  // 去除完成样式。
  icon.classList.remove('done');
}

// 标记某接口完成。
function markDone(type) {
  // 写入完成状态。
  parseStatus[type] = true;
  // 获取图标节点。
  const icon = document.getElementById(`icon-${type}`);
  // 更新图标为完成。
  icon.textContent = '✔';
  // 添加完成样式。
  icon.classList.add('done');
  // 去除处理中样式。
  icon.classList.remove('loading');
}

// 刷新全部图标。
function refreshAllIcons() {
  // 刷新文字图标。
  refreshOneIcon('text');
  // 刷新Excel图标。
  refreshOneIcon('excel');
  // 刷新音频图标。
  refreshOneIcon('audio');
}

// 刷新单个图标。
function refreshOneIcon(type) {
  // 获取图标节点。
  const icon = document.getElementById(`icon-${type}`);
  // 判断是否完成。
  if (parseStatus[type]) {
    // 设置完成图标。
    icon.textContent = '✔';
    // 增加完成样式。
    icon.classList.add('done');
    // 移除处理中样式。
    icon.classList.remove('loading');
  } else {
    // 设置未完成图标。
    icon.textContent = '○';
    // 移除完成样式。
    icon.classList.remove('done');
    // 移除处理中样式。
    icon.classList.remove('loading');
  }
}

// 显示响应结果。
function renderResult(data) {
  // 获取结果节点。
  const result = document.getElementById('result');
  // 判断节点是否存在。
  if (result) {
    // 写入JSON文本。
    result.textContent = JSON.stringify(data, null, 2);
  }
}

// 查询案件列表。
async function loadCases() {
  // 读取关键词。
  const keyword = document.getElementById('keyword').value;
  // 读取纠纷类型。
  const disputeType = document.getElementById('disputeType').value;
  // 读取事件来源。
  const eventSource = document.getElementById('eventSource').value;
  // 读取风险等级。
  const riskLevel = document.getElementById('riskLevel').value;
  // 组装查询参数。
  const params = new URLSearchParams({keyword, disputeType, eventSource, riskLevel, pageNo: 1, pageSize: 20});
  // 发起GET请求。
  const res = await fetch(`${API_BASE}/cases?${params}`);
  // 解析JSON结果。
  const json = await res.json();
  // 获取表格主体节点。
  const tbody = document.getElementById('caseTableBody');
  // 清空表格旧数据。
  tbody.innerHTML = '';

  // 遍历记录集合。
  (json.data.records || []).forEach(item => {
    // 创建行节点。
    const tr = document.createElement('tr');
    // 生成操作按钮。
    const actionBtn = `<button onclick="viewCase('${item.caseNo}')">查看</button>`;
    // 填充行内容。
    tr.innerHTML = `<td>${item.caseNo}</td><td>${item.partyName}</td><td>${item.counterpartyName}</td><td>${item.disputeType}</td><td>${item.eventSource}</td><td>${item.riskLevel}</td><td>${item.handlingProgress}</td><td>${item.receiver}</td><td>${item.registerTime}</td><td>${actionBtn}</td>`;
    // 挂载到表格。
    tbody.appendChild(tr);
  });
}

// 查看案件详情（占位）。
function viewCase(caseNo) {
  // 弹出提示框。
  alert(`案件 ${caseNo} 的详情页面待实现`);
}
