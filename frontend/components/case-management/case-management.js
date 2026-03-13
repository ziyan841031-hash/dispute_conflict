(function () {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeJsSingleQuote(value) {
    return String(value == null ? '' : value)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
  }

  function renderSidebar() {
    return `
      <aside class="sidebar">
        <h1>矛盾纠纷预防和化解<br>智能体应用系统</h1>
        <a href="index.html">首页</a>
        <a href="smart-tools.html">智能体集</a>
    <a href="gov-consult.html">咨询服务</a>
        <a class="active" href="cases.html">案件管理</a>
        <a href="stats.html">案件统计</a>
        <a href="insight-bubble.html">洞察统计</a>
      </aside>
    `;
  }

  function renderFilterBar() {
    return `
      <section class="ui-card cm-filter-card" id="casesFilterBar">
        <div class="cm-filter-grid">
          <input id="keyword" class="ui-input" placeholder="关键词搜索" />
          <input id="disputeType" class="ui-input" placeholder="纠纷类型" />
          <select id="eventSource" class="ui-select">
            <option value="">全部事件来源</option>
            <option value="线下接待">线下接待</option>
            <option value="网上反映">网上反映</option>
            <option value="主动排查">主动排查</option>
            <option value="来电求助">来电求助</option>
            <option value="部门流转">部门流转</option>
          </select>
          <select id="riskLevel" class="ui-select">
            <option value="">全部风险等级</option>
            <option value="低">低</option>
            <option value="中">中</option>
            <option value="高">高</option>
          </select>
          <div class="cm-filter-actions">
            <button type="button" class="ui-btn ui-btn-primary" onclick="searchCases()">查询</button>
            <button type="button" class="ui-btn ui-btn-secondary" onclick="exportCasesCurrentPage()">导出</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderTableShell() {
    return `
      <section class="ui-card cm-table-card" id="casesTableCard">
        <div class="cm-table-wrap">
          <table class="cm-case-table cases-table">
            <thead>
              <tr>
                <th>案件编号</th>
                <th>当事人</th>
                <th>对方当事人</th>
                <th>纠纷类型</th>
                <th>纠纷子类</th>
                <th>事件来源</th>
                <th>风险等级</th>
                <th>办理进度</th>
                <th>接待人</th>
                <th>登记时间</th>
                <th class="cm-action-col action-col">操作</th>
              </tr>
            </thead>
            <tbody id="caseTableBody"></tbody>
          </table>
        </div>
        <div id="casesPagination" class="cm-pager"></div>
      </section>
    `;
  }

  function renderPageShell() {
    return `
      <div class="layout">
        ${renderSidebar()}
        <main class="content cases-page-content">
          <section class="cm-page-shell">
            <h2 class="cm-page-title">案件管理</h2>
            ${renderFilterBar()}
            ${renderTableShell()}
          </section>
        </main>
      </div>
    `;
  }

  function getRiskBadgeClass(level) {
    const text = String(level || '').trim();
    if (text === '高') return 'cm-badge-risk-high';
    if (text === '中') return 'cm-badge-risk-medium';
    return 'cm-badge-risk-low';
  }

  function getProgressBadgeClass(progress) {
    const text = String(progress || '').trim();
    if (!text) return 'cm-badge-progress-pending';
    if (text.includes('完成') || text.includes('办结') || text.includes('归档')) return 'cm-badge-progress-done';
    if (text.includes('待') || text.includes('未')) return 'cm-badge-progress-pending';
    return 'cm-badge-progress-processing';
  }

  function renderStatusBadge(text, type) {
    const safeText = escapeHtml(text || '-');
    const cls = type === 'risk' ? getRiskBadgeClass(text) : getProgressBadgeClass(text);
    return `<span class="ui-badge ${cls}">${safeText}</span>`;
  }

  function renderActionCell(item) {
    const caseId = Number(item && item.id);
    const safeId = Number.isFinite(caseId) ? caseId : 0;
    const caseNo = escapeJsSingleQuote(item && item.caseNo ? item.caseNo : '');
    return `
      <div class="cm-action-cell">
        <button type="button" class="ui-btn ui-btn-primary" onclick="openAssistant(${safeId})">案件助手</button>
      </div>
    `;
  }

  function renderCaseRow(item) {
    const safe = {
      caseNo: escapeHtml(item.caseNo || '-'),
      partyName: escapeHtml(item.partyName || '-'),
      counterpartyName: escapeHtml(item.counterpartyName || '-'),
      disputeType: escapeHtml(item.disputeType || '-'),
      disputeSubType: escapeHtml(item.disputeSubType || '-'),
      eventSource: escapeHtml(item.eventSource || '-'),
      receiver: escapeHtml(item.receiver || '-'),
      registerTime: escapeHtml(item.registerTime || '-')
    };

    return `
      <td>${safe.caseNo}</td>
      <td>${safe.partyName}</td>
      <td>${safe.counterpartyName}</td>
      <td>${safe.disputeType}</td>
      <td>${safe.disputeSubType}</td>
      <td class="cm-cell-muted">${safe.eventSource}</td>
      <td>${renderStatusBadge(item.riskLevel || '-', 'risk')}</td>
      <td>${renderStatusBadge(item.handlingProgress || '-', 'progress')}</td>
      <td class="cm-cell-muted">${safe.receiver}</td>
      <td class="cm-cell-muted">${safe.registerTime}</td>
      <td class="cm-action-col action-col">${renderActionCell(item)}</td>
    `;
  }

  function renderEmptyRow() {
    return '<td colspan="11" class="cm-empty">暂无数据</td>';
  }

  function renderPagination(state) {
    const pageSize = Number(state.pageSize || 20);
    return `
      <div class="cm-pager-info">共 ${state.total} 条，当前 ${state.start}-${state.end}</div>
      <div class="cm-pager-actions">
        <select id="casesPageSize" class="ui-select" onchange="onCasesPageSizeChange(this.value)">
          <option value="20" ${pageSize === 20 ? 'selected' : ''}>20条/页</option>
          <option value="40" ${pageSize === 40 ? 'selected' : ''}>40条/页</option>
          <option value="60" ${pageSize === 60 ? 'selected' : ''}>60条/页</option>
          <option value="80" ${pageSize === 80 ? 'selected' : ''}>80条/页</option>
        </select>
        <button type="button" class="ui-btn ui-btn-secondary" onclick="goCasesPage(1)" ${state.current <= 1 ? 'disabled' : ''}>首页</button>
        <button type="button" class="ui-btn ui-btn-secondary" onclick="goCasesPage(${state.current - 1})" ${state.current <= 1 ? 'disabled' : ''}>上一页</button>
        <span class="cm-pager-current">第 ${state.current} / ${state.pages} 页</span>
        <button type="button" class="ui-btn ui-btn-secondary" onclick="goCasesPage(${state.current + 1})" ${state.current >= state.pages ? 'disabled' : ''}>下一页</button>
        <button type="button" class="ui-btn ui-btn-secondary" onclick="goCasesPage(${state.pages})" ${state.current >= state.pages ? 'disabled' : ''}>末页</button>
      </div>
    `;
  }

  window.openAssistantInNewTab = function (caseId) {
    if (!caseId) return;
    window.open(`assistant.html?caseId=${encodeURIComponent(caseId)}`, '_blank');
  };

  window.copyCaseNo = async function (caseNo) {
    const text = String(caseNo || '').trim();
    if (!text) {
      alert('案件编号为空，无法复制');
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      alert('已复制案件编号');
    } catch (err) {
      alert('复制失败，请手动复制');
    }
  };

  window.closeCaseActionMenus = function () {
    document.querySelectorAll('[data-case-menu-panel]').forEach((panel) => {
      panel.classList.add('hidden');
    });
  };

  window.toggleCaseActionMenu = function (event, caseId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const panel = document.querySelector(`[data-case-menu-panel="${caseId}"]`);
    if (!panel) {
      return;
    }
    const willOpen = panel.classList.contains('hidden');
    window.closeCaseActionMenus();
    if (willOpen) {
      panel.classList.remove('hidden');
    }
  };

  window.CaseManagementUI = {
    mount: function () {
      const root = document.getElementById('casesPageRoot');
      if (!root) return;
      root.innerHTML = renderPageShell();
      document.addEventListener('click', window.closeCaseActionMenus);
    },
    renderCaseRow,
    renderEmptyRow,
    renderPagination
  };
})();

