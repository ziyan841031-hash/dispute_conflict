// 助手页面相关函数

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

function mapMediationCategoryToNodeId(category) {
    const value = (category || '').trim();
    if (value === '人民调解') {
        return 'people';
    }
    if (value === '行政调解' || value.includes('行政')) {
        return 'admin';
    }
    if (value === '专业调解' || value.includes('专业')) {
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
    const statusText = getMediationStatusText();
    const terminalArchive = statusText === '调解成功';
    window.workflowLockMeta = {locked, selectedThirdNodeId, statusText, terminalArchive};
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
    if (meta.terminalArchive) {
        allowed.add('archive');
    }
    if (meta.statusText === '调解失败') {
        allowed.add('failed');
        allowed.add('arbitration');
        allowed.add('litigation');
    }
    if (meta.selectedThirdNodeId) {
        allowed.add(meta.selectedThirdNodeId);
    }
    return allowed.has(nodeId);
};

function hasMediationStatusLocked() {
    const status = getMediationStatusText();
    return Boolean(String(status).trim());
}

async function loadAssistantPage() {
    if (!document.getElementById('assistantTopInfo')) {
        return;
    }

    resetAssistantInitialWaitingState();
    assistantCanvasReady = true;
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
        renderRuleReference(assistantDataCache);
    };

    const caseId = new URLSearchParams(window.location.search).get('caseId');
    if (!caseId) {
        document.getElementById('assistantTopInfo').innerHTML = '<p>缺少 caseId 参数</p>';
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
        detailData = {parseError: '案件详情加载失败，请稍后重试'};
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
    renderRuleReference(assistantDataCache);
    switchAssistantTab('guide');
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
        console.warn('触发 workflow 失败', error);
        return null;
    }
}

function mapFlowLevelToNodeId(level1, level2, level3, mediationStatus) {
    const l1 = String(level1 || '').trim();
    const l2 = String(level2 || '').trim();
    const l3 = String(level3 || '').trim();
    const statusText = String(mediationStatus || '').trim();

    if (statusText === '调解成功') {
        return 'archive';
    }
    if (statusText === '调解失败' || statusText.includes('失败')) {
        return 'failed';
    }
    if (statusText) {
        return 'status';
    }

    if (l3 === '人民调解' || l3.includes('人民')) {
        return 'people';
    }
    if (l3 === '行政调解' || l3.includes('行政')) {
        return 'admin';
    }
    if (l3 === '专业调解' || l3.includes('专业')) {
        return 'professional';
    }

    if (l1 || l2) {
        return 'mediation';
    }
    return 'accept';
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
    const mediationStatusText = String(record.mediationStatus || '').trim();
    if (window.setWorkflowPreferredArchiveParent && mediationStatusText === '调解成功') {
        window.setWorkflowPreferredArchiveParent('success');
    }
    if (window.setWorkflowActiveNode) {
        window.setWorkflowActiveNode(nodeId);
    } else if (window.onWorkflowNodeChange) {
        window.onWorkflowNodeChange(nodeId);
    }
}

const RISK_LEVEL_DESC = {
    '低': '仅咨询 / 信息不足 / 冲突极轻微，无升级迹象',
    '中': '矛盾较明显，存在纠纷或情绪激动，有一定对抗但无明确人身安全威胁',
    '高': '存在明显升级或现实危险，涉及威胁、骚扰、暴力苗头、脆弱群体权益、疑似违法或紧急安全风险'
};

function resolveAssistantSummary(data, allowCaseTextFallback = false) {
    const safeData = data || {};
    const candidates = [
        safeData.judgementBasisText,
        safeData.factsSummary,
        safeData.summaryText,
        safeData.aiSummary,
        safeData.caseSummary,
        safeData.caseSmartSummary
    ];
    for (const item of candidates) {
        const text = String(item || '').trim();
        if (text) {
            return text;
        }
    }
    if (allowCaseTextFallback) {
        const caseText = String(safeData.caseText || '').trim();
        if (caseText) {
            return caseText;
        }
    }
    return '-';
}

function renderAssistantTop(data) {
    const top = document.getElementById('assistantTopInfo');
    if (!top) {
        return;
    }

    const party = `${data.partyName || '-'} / ${data.partyPhone || '-'}`;
    const counterparty = `${data.counterpartyName || '-'} / ${data.counterpartyPhone || '-'}`;
    const dispute = `${data.disputeType || '-'} / ${data.disputeSubType || '-'}`;
    const summary = resolveAssistantSummary(data, false);
    const riskLevel = normalizeRiskLevel(data.riskLevel) || data.riskLevel || '-';
    const handlingStatus = data.handlingProgress || data.mediationStatus || '-';
    const riskDesc = RISK_LEVEL_DESC[riskLevel] || '请结合案件材料进一步核验风险。';

    top.innerHTML = `
    <div class="summary-item">
      <div class="summary-item-label">案件编号</div>
      <div class="summary-item-value">${assistantEscapeHtml(data.caseNo || '-')}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">当事人信息</div>
      <div class="summary-item-value">${assistantEscapeHtml(party)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">对方当事人</div>
      <div class="summary-item-value">${assistantEscapeHtml(counterparty)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">风险等级 / 状态</div>
      <div class="summary-item-value summary-status-inline">
        <span class="ui-badge">风险：${assistantEscapeHtml(riskLevel)}</span>
        <span class="ui-badge">状态：${assistantEscapeHtml(handlingStatus)}</span>
      </div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">纠纷类型 / 子类</div>
      <div class="summary-item-value">${assistantEscapeHtml(dispute)}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">事件来源</div>
      <div class="summary-item-value">${assistantEscapeHtml(data.eventSource || '-')}</div>
    </div>
  `;

    const riskBox = document.getElementById('assistantRiskAlert');
    if (riskBox) {
        const riskTags = buildRiskTags(data, summary);
        const shortSummary = assistantEscapeHtml(summary === '-' ? riskDesc : summary);
        const fullSummary = assistantEscapeHtml(data.caseText || summary || '-');
        riskBox.innerHTML = `
      <div class="risk-alert-head">
        <div class="risk-alert-title">案件风险提示</div>
        <button type="button" class="ui-btn ui-btn-secondary" onclick="toggleRiskDetails()">展开查看完整研判</button>
      </div>
      <div class="risk-alert-summary">${shortSummary}</div>
      <div class="risk-tag-list">${riskTags.map((tag) => `<span class="risk-tag">${assistantEscapeHtml(tag)}</span>`).join('')}</div>
      <div id="assistantRiskMore" class="risk-alert-extra hidden">${fullSummary}</div>
    `;
    }

    if (window.AssistantWorkspace && typeof window.AssistantWorkspace.syncContext === 'function') {
        window.AssistantWorkspace.syncContext(data, workflowAdviceRecord || null);
    }

    const btn = document.getElementById('caseDetailBtn');
    if (btn) {
        btn.onclick = function () {
            showCaseMaterial(data);
        };
    }

    if (window.updateWorkflowAcceptTime) {
        window.updateWorkflowAcceptTime(data.registerTime || '--');
    }
}

function toggleRiskDetails() {
    const panel = document.getElementById('assistantRiskMore');
    if (!panel) {
        return;
    }
    panel.classList.toggle('hidden');
}
function openAssistantCaseDetail() {
    showCaseMaterial(assistantDataCache || {});
}

function formatDetailValue(value) {
    if (value === null || value === undefined) {
        return '-';
    }
    const text = String(value).trim();
    return text ? text : '-';
}

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
    const renderGrid = (items) => `<div class="case-detail-grid">${items.map((item) => `<div class="case-detail-item"><span class="case-detail-label">${item.label}</span><span class="case-detail-value">${formatDetailValue(item.value)}</span></div>`).join("")}</div>`;

    try {
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
            {label: '纠纷子类', value: safeData.disputeSubType},
            {label: '纠纷地点', value: safeData.disputeLocation},
            {label: '风险等级', value: safeData.riskLevel},
            {label: '接待人', value: safeData.receiver}
        ];

        const smartSummary = resolveAssistantSummary(safeData, false);

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
    } catch (error) {
        console.error('showCaseMaterial render failed', error);
        contentBox.innerHTML = `
    <section class="case-detail-section case-detail-raw">
      <h4>案件详情</h4>
      <div class="case-detail-text">${formatDetailValue(rawMaterial || safeData.parseError || "暂无案件详情")}</div>
    </section>
  `;
    }

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
        audioBtn.textContent = '播放音频';
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

function closeCaseMaterial() {
    const modal = document.getElementById('caseMaterialModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    if (caseAudioPlayer) {
        caseAudioPlayer.pause();
    }
    currentCaseAudioUrl = "";
    stopCaseAudioCountdown();
    const audioBtn = document.getElementById('playCaseAudioBtn');
    if (audioBtn) {
        audioBtn.textContent = '播放音频';
        audioBtn.classList.remove('audio-counting');
    }
}

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
    <div class="case-optimize-chat-msg bot">你好，感谢使用智能优化系统，请对案件摘要或判断依据提出修改建议，我将尝试优化。</div>
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
        alert('请输入反馈内容');
        return;
    }
    const caseId = currentCaseOptimizeData && currentCaseOptimizeData.caseId;
    if (!caseId) {
        alert('案件信息缺失，无法提交反馈');
        return;
    }
    caseOptimizeSubmitting = true;
    if (submitBtn) {
        submitBtn.disabled = true;
    }
    input.disabled = true;

    content.insertAdjacentHTML('beforeend', `<div class="case-optimize-chat-msg user">${correctionHint}</div>`);
    const waitingId = `optimize-waiting-${Date.now()}`;
    content.insertAdjacentHTML('beforeend', `<div id="${waitingId}" class="case-optimize-chat-msg bot case-optimize-waiting">正在处理中<span class="dotting">...</span></div>`);
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
            content.insertAdjacentHTML('beforeend', '<div class="case-optimize-chat-msg bot">感谢您的反馈，已记录并优化建议。</div>');
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

function normalizeAudioUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) {
        return '';
    }
    try {
        return new URL(raw, window.location.origin).toString();
    } catch (error) {
        return raw;
    }
}

function toggleCaseAudioPlay(data) {
    const btn = document.getElementById('playCaseAudioBtn');
    if (!btn) {
        return;
    }
    const audioUrl = data && data.audioFileUrl ? String(data.audioFileUrl) : '';
    const normalizedAudioUrl = normalizeAudioUrl(audioUrl);
    if (!normalizedAudioUrl) {
        alert('当前案件没有可播放的音频文件');
        return;
    }
    if (!caseAudioPlayer || currentCaseAudioUrl !== normalizedAudioUrl) {
        if (caseAudioPlayer) {
            caseAudioPlayer.pause();
        }
        stopCaseAudioCountdown();
        caseAudioPlayer = new Audio(normalizedAudioUrl);
        currentCaseAudioUrl = normalizedAudioUrl;
        caseAudioPlayer.addEventListener('loadedmetadata', () => {
            if (Number.isFinite(caseAudioPlayer.duration) && caseAudioPlayer.duration > 0) {
                btn.textContent = `播放音频 ${formatAudioDuration(caseAudioPlayer.duration)}`;
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
            btn.textContent = '播放音频';
        });
    }

    if (caseAudioPlayer.paused) {
        caseAudioPlayer.play().then(() => {
            btn.classList.add('audio-counting');
            renderCaseAudioRemaining();
            startCaseAudioCountdown();
        }).catch(() => {
            btn.classList.remove('audio-counting');
            btn.textContent = '播放音频';
            alert('音频加载失败，请检查文件是否可访问');
        });
        return;
    }
    caseAudioPlayer.pause();
    stopCaseAudioCountdown();
    btn.classList.remove('audio-counting');
    renderCaseAudioRemaining();
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

function renderCaseAudioRemaining(icon = '播放音频') {
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

function showWorkflowWaitingModal(titleText = '智能体处理中', descText = '正在结合案件特征生成建议，请稍候...') {
    const modal = document.getElementById('workflowWaitingModal');
    const title = document.getElementById('workflowWaitingTitle');
    const desc = document.getElementById('workflowWaitingDesc');
    if (title) {
        title.textContent = safeUiCopy(titleText, '智能体处理中');
    }
    if (desc) {
        desc.textContent = safeUiCopy(descText, '正在结合案件特征生成建议，请稍候...');
    }
    if (modal) {
        modal.classList.remove('hidden');
    }
}

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

function switchAssistantTab(tabName) {
    document.querySelectorAll('.bookmark-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('[data-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.panel !== tabName);
    });
    if (tabName === 'rules') {
        renderRuleReference(assistantDataCache);
    }
}

function buildMediationAdviceBlock(adviceHtml) {
    const html = (adviceHtml || '').toString().trim();
    if (!html) {
        return '';
    }
    return `
    <div class="guide-advice-block">
      <div class="guide-advice-title">智能建议</div>
      <div class="guide-advice-html">${html}</div>
    </div>
  `;
}

function downloadArchiveDocument() {
    const rawPath = (workflowAdviceRecord && workflowAdviceRecord.archiveDocumentPath) || assistantDataCache.archiveDocumentPath || '';
    const normalizedPath = String(rawPath || '').trim();
    if (!normalizedPath) {
        alert('未找到可下载的归档文档');
        return;
    }
    const downloadUrl = `${API_BASE}/dify/archive-document/download?path=${encodeURIComponent(normalizedPath)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderGuide(data) {
    const box = document.getElementById('guideList');
    if (!box) {
        return;
    }

    const currentNode = currentWorkflowNodeId || 'accept';
    const mediationCategory = THIRD_LEVEL_NODE_MAP[currentNode] || '待确认';
    const mediationAdviceHtml = (workflowAdviceRecord && workflowAdviceRecord.mediationAdvice) || data.mediationAdvice || '';
    const recommendedDepartment = (workflowAdviceRecord && workflowAdviceRecord.recommendedDepartment) || data.recommendedDepartment || '-';
    const riskLevel = data.riskLevel || '-';
    const statusText = getMediationStatusText() || data.mediationStatus || data.handlingProgress || '-';
    const candidates = disposalOrgOptions.filter(item => item.mediationCategory === mediationCategory);
    const preferredOrgName = selectedOrgByCategory[mediationCategory];
    const currentOrg = candidates.find(item => item.orgName === preferredOrgName) || candidates[0] || null;
    if (currentOrg) {
        selectedOrgByCategory[mediationCategory] = currentOrg.orgName;
    }

    const optionsHtml = candidates.map(item => `
    <option value="${item.orgName}" ${currentOrg && item.orgName === currentOrg.orgName ? 'selected' : ''}>${item.orgName || '-'}</option>
  `).join('');

    const statusLocked = hasMediationStatusLocked();
    const adviceText = String(mediationAdviceHtml || '').replace(/<[^>]+>/g, '').trim() || '暂无建议说明';
    const quickActions = [
        `建议路径：${mediationCategory || '-'}`,
        `风险等级：${riskLevel || '-'}`,
        `推荐部门：${recommendedDepartment || '-'}`,
        `优先动作：${statusLocked ? '继续跟进已确认路径' : '确认调解节点并联动部门'}`
    ];

    box.innerHTML = `
    <section class="assistant-side-card">
      <h4>当前 AI 判断</h4>
      <dl class="kv-list">
        <dt>当前路径</dt><dd>${assistantEscapeHtml(mediationCategory || '-')}</dd>
        <dt>风险等级</dt><dd><span class="ui-badge">${assistantEscapeHtml(riskLevel || '-')}</span></dd>
        <dt>办理状态</dt><dd>${assistantEscapeHtml(statusText || '-')}</dd>
        <dt>推荐部门</dt><dd>${assistantEscapeHtml(recommendedDepartment || '-')}</dd>
      </dl>
    </section>

    <section class="assistant-side-card">
      <h4>办理建议卡</h4>
      <ol class="ai-answer-list">
        ${quickActions.map((item) => `<li>${assistantEscapeHtml(item)}</li>`).join('')}
      </ol>
      <div style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">
        <button type="button" class="ui-btn ui-btn-primary" onclick="onGuideNodeConfirm()" ${statusLocked ? 'disabled' : ''}>确认当前路径</button>
      </div>
    </section>

    <section class="assistant-side-card">
      <h4>案件关键字段</h4>
      <dl class="kv-list">
        <dt>案件编号</dt><dd>${assistantEscapeHtml(data.caseNo || '-')}</dd>
        <dt>当前节点</dt><dd>${assistantEscapeHtml(mediationCategory || '-')}</dd>
        <dt>责任部门</dt><dd>${assistantEscapeHtml((currentOrg && currentOrg.orgName) || recommendedDepartment || '-')}</dd>
        <dt>联系电话</dt><dd>${assistantEscapeHtml((currentOrg && currentOrg.orgPhone) || data.receiverPhone || '-')}</dd>
        <dt>机构地址</dt><dd>${assistantEscapeHtml((currentOrg && currentOrg.orgAddress) || '-')}</dd>
        <dt>近期待办</dt><dd>${assistantEscapeHtml(statusLocked ? '跟进调解状态更新' : '确认处置路径与部门')}</dd>
      </dl>
    </section>

    <section class="assistant-side-card">
      <h4>推荐转办部门</h4>
      <div class="guide-row guide-row-select" style="display:block; border:none; padding:0;">
        <select id="guideOrgSelect" class="ui-select" onchange="onGuideOrgChange(this.value)" ${statusLocked ? 'disabled' : ''}>
          ${optionsHtml || '<option value="">暂无可选部门</option>'}
        </select>
      </div>
      <div class="risk-alert-extra" style="margin-top:8px; color:#475569;">${assistantEscapeHtml(adviceText.slice(0, 180))}</div>
    </section>
  `;
}

function assistantEscapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
        showWorkflowWaitingModal('智能确认处理中', '正在提交并生成最新建议，请稍候...');
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
            assistantDataCache.mediationStatus = record.mediationStatus || '处理中';
            assistantDataCache.mediationAdvice = record.mediationAdvice || assistantDataCache.mediationAdvice || '';
            assistantDataCache.diversionCompletedAt = record.diversionCompletedAt || assistantDataCache.diversionCompletedAt || '';
            assistantDataCache.mediationCompletedAt = record.mediationCompletedAt || assistantDataCache.mediationCompletedAt || '';
            assistantDataCache.archiveCompletedAt = record.archiveCompletedAt || assistantDataCache.archiveCompletedAt || '';
            assistantDataCache.archiveSummary = record.archiveSummary || assistantDataCache.archiveSummary || '';
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
        renderRuleReference(assistantDataCache);
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

function renderRuleReference(data) {
    const box = document.getElementById('ruleList');
    if (!box) {
        return;
    }
    const advice = workflowAdviceRecord || {};
    const hints = formatRuleHintsHit(advice.ruleHintsHit || data.ruleHintsHit || '-');
    const reason = advice.recommendReason || data.recommendReason || '-';
    const backup = advice.backupSuggestion || data.backupSuggestion || '-';
    const summary = resolveAssistantSummary(data, false);

    box.innerHTML = `
    <section class="assistant-side-card">
      <h4>法律条文摘要</h4>
      <div>${assistantEscapeHtml(hints || '-')}</div>
    </section>
    <section class="assistant-side-card">
      <h4>规则说明</h4>
      <div class="rule-item">${assistantEscapeHtml(reason || '-')}</div>
      <div class="rule-item">${assistantEscapeHtml(backup || '-')}</div>
    </section>
    <section class="assistant-side-card">
      <h4>适用前提</h4>
      <div>${assistantEscapeHtml(summary || '-')}</div>
    </section>
  `;
}

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
    const archiveCompletedAt = data.archiveCompletedAt;
    const mediationStatus = String(data.mediationStatus || '').trim();

    const timeline = [
        { title: '已受理', time: formatTimelineTime(data.registerTime || data.createdAt), desc: '案件已进入智能辅助流程' },
        { title: '风险研判完成', time: formatTimelineTime(data.workflowCreatedAt || data.createdAt), desc: `风险等级：${data.riskLevel || '-'}` },
        { title: 'AI建议生成', time: formatTimelineTime(diversionCompletedAt), desc: (workflowAdviceRecord && workflowAdviceRecord.recommendedDepartment) || data.recommendedDepartment || '-' },
        { title: '已联系部门', time: formatTimelineTime(mediationCompletedAt), desc: mediationStatus || '待人工确认' },
        { title: '待人工确认', time: formatTimelineTime(archiveCompletedAt), desc: '确认是否归档或继续跟进' }
    ];

    const actions = mediationStatus === '处理中'
        ? `
      <section class="assistant-side-card">
        <h4>快速操作</h4>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="ui-btn ui-btn-secondary" onclick="onTimelineUrge()">催办</button>
          <button type="button" class="ui-btn ui-btn-secondary" onclick="onTimelineSupervise()">督办</button>
          <button type="button" class="ui-btn ui-btn-primary" onclick="onTimelineMediationSuccess()">调解成功归档</button>
        </div>
      </section>
    `
        : '';

    box.innerHTML = `
    <section class="assistant-side-card">
      <h4>最近记录</h4>
      <div class="activity-feed">
        ${timeline.map((item) => `
          <article class="activity-item">
            <div class="activity-title">${assistantEscapeHtml(item.title)}</div>
            <div class="activity-time">${assistantEscapeHtml(item.time || '-')}</div>
            <div class="activity-time">${assistantEscapeHtml(item.desc || '-')}</div>
          </article>
        `).join('')}
      </div>
    </section>
    ${actions}
  `;
}

function hasTimelineValue(value) {
    if (value === null || value === undefined) {
        return false;
    }
    const text = String(value).trim();
    return text !== '' && text !== '-';
}

function onTimelineUrge() {
    alert('已发起催办');
}

function onTimelineSupervise() {
    alert('已发起督办');
}

async function onTimelineMediationSuccess() {
    const caseId = (assistantDataCache && assistantDataCache.caseId) || (workflowAdviceRecord && workflowAdviceRecord.caseId);
    if (!caseId) {
        return;
    }
    try {
        showWorkflowWaitingModal('智能归档中', '正在更新为调解成功并归档');
        const res = await fetch(`${API_BASE}/dify/workflow-complete`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({caseId})
        });
        const json = await res.json();
        const payload = json && json.data ? json.data : null;
        const record = payload && payload.record ? payload.record : payload;
        if (!record) {
            return;
        }
        workflowAdviceRecord = {
            ...(workflowAdviceRecord || {}),
            ...record
        };
        assistantDataCache.mediationStatus = record.mediationStatus || '调解成功';
        assistantDataCache.mediationCompletedAt = record.mediationCompletedAt || assistantDataCache.mediationCompletedAt || '';
        assistantDataCache.archiveCompletedAt = record.archiveCompletedAt || assistantDataCache.archiveCompletedAt || '';
        assistantDataCache.archiveSummary = record.archiveSummary || assistantDataCache.archiveSummary || '';
        assistantDataCache.diversionCompletedAt = record.diversionCompletedAt || assistantDataCache.diversionCompletedAt || '';
        assistantDataCache.workflowCreatedAt = record.workflowCreatedAt || record.createdAt || assistantDataCache.workflowCreatedAt || '';
        if (window.setWorkflowPreferredArchiveParent) {
            window.setWorkflowPreferredArchiveParent('success');
        }
        currentWorkflowNodeId = 'archive';
        if (window.setWorkflowActiveNode) {
            window.setWorkflowActiveNode('archive');
        }
        syncWorkflowLockMeta();
        renderGuide(assistantDataCache);
        renderRuleReference(assistantDataCache);
        renderTimeline(assistantDataCache);
        renderAssistantTop(assistantDataCache);
    } catch (error) {
        console.warn('调解成功处理失败', error);
        alert('操作失败，请稍后重试');
    } finally {
        hideWorkflowWaitingModal();
    }
}

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
        {from: 'failed', to: 'arbitration', lineId: 'l-failed-arbitration'},
        {from: 'failed', to: 'litigation', lineId: 'l-failed-litigation'}
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
