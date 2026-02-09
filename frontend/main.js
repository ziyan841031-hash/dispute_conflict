// 定义后端接口基础地址。
const API_BASE = 'http://localhost:8080/api';

// 提交文字案件。
async function submitText() {
  // 组装请求载荷。
  const payload = {
    // 读取案件描述。
    caseText: document.getElementById('caseText').value,
    // 读取当事人。
    partyName: document.getElementById('partyName').value,
    // 读取对方当事人。
    counterpartyName: document.getElementById('counterpartyName').value,
    // 读取纠纷类型。
    disputeType: document.getElementById('disputeType').value,
    // 读取风险等级。
    riskLevel: document.getElementById('riskLevel').value,
    // 读取办理进度。
    handlingProgress: document.getElementById('handlingProgress').value,
    // 读取接待人。
    receiver: document.getElementById('receiver').value
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
}

// 提交Excel案件。
async function submitExcel() {
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
}

// 提交音频案件。
async function submitAudio() {
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
