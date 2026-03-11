// 案件列表管理相关函数

function getCasesPageSize() {
    const el = document.getElementById('casesPageSize');
    const value = Number((el && el.value) || casesPageSize || 20);
    if (!Number.isFinite(value) || value <= 0) {
        return 20;
    }
    return value;
}

function onCasesPageSizeChange(value) {
    const parsed = Number(value);
    casesPageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    casesPageNo = 1;
    loadCases();
}

async function loadCases() {
    casesPageSize = getCasesPageSize();
    const keyword = document.getElementById('keyword').value;
    const disputeType = document.getElementById('disputeType').value;
    const eventSource = document.getElementById('eventSource').value;
    const riskLevel = document.getElementById('riskLevel').value;
    const params = new URLSearchParams({keyword, disputeType, eventSource, riskLevel, pageNo: casesPageNo, pageSize: getCasesPageSize()});
    const res = await fetch(`${API_BASE}/cases?${params}`);
    const json = await res.json();
    const pageData = (json && json.data) ? json.data : {};
    const records = Array.isArray(pageData.records) ? pageData.records : [];
    casesTotal = Number(pageData.total || 0);
    casesPages = Math.max(1, Number(pageData.pages || Math.ceil(casesTotal / getCasesPageSize()) || 1));
    const current = Number(pageData.current || casesPageNo || 1);
    casesPageNo = Math.min(Math.max(1, current), casesPages);

    const tbody = document.getElementById('caseTableBody');
    tbody.innerHTML = '';

    records.forEach(item => {
        const tr = document.createElement('tr');
        caseListCache[item.id] = item;
        if (window.CaseManagementUI && typeof window.CaseManagementUI.renderCaseRow === 'function') {
            tr.innerHTML = window.CaseManagementUI.renderCaseRow(item);
        } else {
            const actionBtn = `<button onclick="openAssistant(${item.id})">进入助手</button>`;
            tr.innerHTML = `<td>${item.caseNo || '-'}</td><td>${item.partyName || '-'}</td><td>${item.counterpartyName || '-'}</td><td>${item.disputeType || '-'}</td><td>${item.disputeSubType || '-'}</td><td>${item.eventSource || '-'}</td><td>${item.riskLevel || '-'}</td><td>${item.handlingProgress || '-'}</td><td>${item.receiver || '-'}</td><td>${item.registerTime || '-'}</td><td class="action-col">${actionBtn}</td>`;
        }
        tbody.appendChild(tr);
    });

    if (!records.length) {
        const tr = document.createElement('tr');
        if (window.CaseManagementUI && typeof window.CaseManagementUI.renderEmptyRow === 'function') {
            tr.innerHTML = window.CaseManagementUI.renderEmptyRow();
        } else {
            tr.innerHTML = '<td colspan="11" class="cases-empty">暂无数据</td>';
        }
        tbody.appendChild(tr);
    }

    renderCasesPagination();
}

function searchCases() {
    casesPageNo = 1;
    loadCases();
}

function goCasesPage(pageNo) {
    const nextPage = Number(pageNo || 1);
    if (!Number.isFinite(nextPage)) {
        return;
    }
    const target = Math.min(Math.max(1, nextPage), Math.max(1, casesPages));
    if (target === casesPageNo) {
        return;
    }
    casesPageNo = target;
    loadCases();
}

function renderCasesPagination() {
    const pager = document.getElementById('casesPagination');
    if (!pager) {
        return;
    }
    const total = Number(casesTotal || 0);
    const pages = Math.max(1, Number(casesPages || 1));
    const current = Math.min(Math.max(1, Number(casesPageNo || 1)), pages);
    const start = total === 0 ? 0 : (current - 1) * getCasesPageSize() + 1;
    const end = total === 0 ? 0 : Math.min(current * getCasesPageSize(), total);

    if (window.CaseManagementUI && typeof window.CaseManagementUI.renderPagination === 'function') {
        pager.innerHTML = window.CaseManagementUI.renderPagination({
            total,
            pages,
            current,
            start,
            end,
            pageSize: getCasesPageSize()
        });
        return;
    }

    pager.innerHTML = `
    <div class="cases-pagination-info">共 ${total} 条，当前 ${start}-${end}</div>
    <div class="cases-pagination-actions">
      <select id="casesPageSize" onchange="onCasesPageSizeChange(this.value)">
        <option value="20" ${getCasesPageSize() === 20 ? 'selected' : ''}>20条/页</option>
        <option value="40" ${getCasesPageSize() === 40 ? 'selected' : ''}>40条/页</option>
        <option value="60" ${getCasesPageSize() === 60 ? 'selected' : ''}>60条/页</option>
        <option value="80" ${getCasesPageSize() === 80 ? 'selected' : ''}>80条/页</option>
      </select>
      <button type="button" onclick="goCasesPage(1)" ${current <= 1 ? 'disabled' : ''}>首页</button>
      <button type="button" onclick="goCasesPage(${current - 1})" ${current <= 1 ? 'disabled' : ''}>上一页</button>
      <span class="cases-pagination-current">第 ${current} / ${pages} 页</span>
      <button type="button" onclick="goCasesPage(${current + 1})" ${current >= pages ? 'disabled' : ''}>下一页</button>
      <button type="button" onclick="goCasesPage(${pages})" ${current >= pages ? 'disabled' : ''}>末页</button>
    </div>
  `;
}

async function exportCasesCurrentPage() {
    const keyword = document.getElementById('keyword').value;
    const disputeType = document.getElementById('disputeType').value;
    const eventSource = document.getElementById('eventSource').value;
    const riskLevel = document.getElementById('riskLevel').value;
    const params = new URLSearchParams({keyword, disputeType, eventSource, riskLevel});
    try {
        const res = await fetch(`${API_BASE}/cases/export?${params.toString()}`);
        if (!res.ok) {
            throw new Error('导出失败');
        }
        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = 'cases-export.xlsx';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
        alert('操作失败，请稍后重试');
    }
}

async function loadStatsBatches() {
    const tbody = document.getElementById('statsBatchBody');
    if (!tbody) {
        return;
    }
    const res = await fetch(`${API_BASE}/case-stats/batches`);
    const json = await res.json();
    const rows = (json && json.data) ? json.data : [];
    tbody.innerHTML = '';
    rows.forEach(item => {
        const tr = document.createElement('tr');
        const reportCell = item.reportFileUrl ? `<button type="button" class="ui-btn ui-btn-secondary" onclick="downloadStatsReport('${item.reportFileUrl}')">下载报告</button>` : '-';
        tr.innerHTML = `
      <td>${item.batchNo || '-'}</td>
      <td>${item.recordCount || 0}</td>
      <td>${item.importedAt || '-'}</td>
      <td>${item.reportGeneratedAt || '-'}</td>
      <td>${reportCell}</td>
      <td><button type="button" class="ui-btn ui-btn-primary" onclick="openStatsDetail(${item.id})">查看明细</button></td>
    `;
        tbody.appendChild(tr);
    });
}

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
        const blob = await res.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
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

async function importStatsExcel() {
    const fileInput = document.getElementById('statsExcelFile');
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
    if (!file) {
        alert('请先选择 Excel 文件');
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
      <td>${item.riskLevel || '-'}</td>
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
        const detailBtn = `<button type="button" onclick="openFeedbackDetail(${item.id || 0})">查看</button>`;
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
        return '未获取到有效响应内容';
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
