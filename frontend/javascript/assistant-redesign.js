(function () {
    var TEXT = {
        eyebrow: '案件助手',
        back: '返回案件列表',
        pageTitle: '案件协同推进',
        chatTitle: '辅助办案助手',
        chatDesc: '围绕案件要点、部门推进和风险进行辅助交流',
        infoTitle: '案件信息',
        infoDesc: '案件基础信息、案件详情、案件跟踪与文件管理',
        send: '发送',
        sending: '发送中...',
        inputPlaceholder: '\u8bf7\u8f93\u5165 \u4f60\u60f3\u4e86\u89e3\u7684\u95ee\u9898...',
        detailBtn: '案件详情',
        analysisBtn: '案件研判',
        traceTitle: '案件跟踪',
        filesTitle: '文件管理',
        modalClose: '关闭',
        noCase: '缺少案件ID，无法加载详情。',
        loadFail: '案件详情加载失败，请稍后重试。',
        noSummary: '暂无案件摘要',
        noText: '暂无不可展示详情',
        noEmotion: '待补充',
        processing: '处理中',
        success: '成功',
        failed: '失败',
        caseOverview: '案件概述',
        riskHint: '风险提示',
        deptReason: '推荐部门依据',
        nextStep: '下一步动作',
        expand: '全部',
        collapse: '收起',
        traceDetail: '详情',
        currentQuestion: '当前问题',
        assistantMeta: '智能助手',
        summaryMeta: '案件摘要',
        detailTitle: '案件详情',
        analysisTitle: '案件研判',
        traceDetailTitle: '动态详情',
        baseInfo: '基础信息',
        partyInfo: '当事人信息',
        caseType: '案件分类',
        caseRaw: '案件原文',
        emotion: '客户情感分析',
        factSummary: '事实摘要',
        judgement: '裁量依据',
        mediationAdvice: '调解建议',
        sidebarTitle: '矛盾纠纷预防和化解\n智能体应用系统',
        navHome: '首页',
        navTools: '智能工具',
        navConsult: '咨询服务',
        navCases: '案件管理',
        navImport: '案件导入',
        navInsight: '数据洞察',
        caseMaterialTitle: '案件详情',
        initLoading: '正在生成部门推荐...',
        feedbackTitle: '请输入本次反馈内容',
        feedbackPlaceholder: '例如：这条回复还需要补充哪些信息？',
        feedbackSubmit: '提交',
        feedbackCancel: '取消',
        fileEmpty: '当前暂无可下载的案件文件，待案件推进到对应阶段后会在这里生成。',
        fileLoading: '正在加载文件...',
        fileLoadFail: '文件列表加载失败，请稍后重试。',
        copy: '复制',
        copied: '已复制',
        like: '点赞',
        dislike: '不赞',
        responseTime: '响应完成时间',
        pushFail: '部门推送失败，请稍后重试。',
        traceLoading: '正在加载案件动态...',
        traceEmpty: '暂无案件动态',
        traceSummaryLabel: '详情',
        quickActionsTitle: '快捷操作',
        quickActionsAria: '快捷操作',
        traceShortcut: '\u6848\u4ef6\u8fdb\u5ea6\u8ffd\u8e2a'
    };

    var assistantState = {
        caseId: '',
        detail: null,
        trackingEvents: [],
        trackingLoaded: false,
        trackingLoading: false,
        fileItems: [],
        filesLoaded: false,
        filesLoading: false,
        fileLoadError: '',
        expandedEventIds: {},
        chatMessages: [],
        isSending: false,
        sideTab: 'detail',
        messageSeq: 0,
        quickActionsOpen: false,
        departmentMenuOpen: false,
        departmentMenuMessageId: '',
        departmentActionMessageId: ''
    };

    var assistantMarkdownRenderer = null;
    var PROCESS_STEPS = ['部门推荐', '案件派送', '催办/督办', '调解结果', '案件归档'];
    var QUICK_PROMPTS = [
        { label: '风险点分析', prompt: '风险点分析', description: '识别当前案件潜在风险', icon: 'risk', tone: 'risk' },
        { label: '类似案例', prompt: '类似案例', description: '检索相似案件供参考', icon: 'case', tone: 'case' },
        { label: '法律依据', prompt: '法律依据', description: '查找相关法律法规条文', icon: 'law', tone: 'law' },
        { label: '调解建议', prompt: '调解建议', description: '生成调解方案与话术', icon: 'mediation', tone: 'mediation' },
        { label: '时间线梳理', prompt: '时间线梳理', description: '整理案件关键时间节点', icon: 'timeline', tone: 'timeline' }
    ];
    var STATUS = {
        accepted: '案件已受理',
        mediating: '案件调解中',
        mediatingShort: '调解中',
        success: '案件调解成功',
        successShort: '调解成功',
        failed: '案件调解失败',
        failedShort: '调解失败',
        archived: '已归档',
        litigation: '诉讼'
    };
    function getMarkdownRenderer() {
        if (!assistantMarkdownRenderer && window.markdownit && typeof window.markdownit === 'function') {
            assistantMarkdownRenderer = window.markdownit({ breaks: true, linkify: true, html: false });
        }
        return assistantMarkdownRenderer;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function textValue(value, fallback) {
        var text = String(value == null ? '' : value).trim();
        return text || (fallback || '-');
    }

    function plainText(value) {
        return String(value == null ? '' : value).trim();
    }

    function renderPromptToggleIcon() {
        var iconSrc = assistantState.quickActionsOpen ? './img/selected.png' : './img/selectedBefore.png';
        return '<img class="assistant-prompt-toggle-image" src="' + iconSrc + '" alt="" aria-hidden="true">';
    }

    function renderSendButtonIcon(isSending) {
        if (isSending) {
            return '<span class="assistant-send-icon assistant-send-icon-spinner" aria-hidden="true"></span>';
        }
        return ''
            + '<span class="assistant-send-icon" aria-hidden="true">'
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="M4.75 11.5 19 5.25l-4.95 13.5-2.55-4.75L4.75 11.5Z"></path>'
            + '<path d="M11.5 14 19 5.25"></path>'
            + '</svg>'
            + '</span>';
    }

    function renderPromptCardArrow() {
        return ''
            + '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
            + '<path d="m7 4 6 6-6 6"></path>'
            + '</svg>';
    }

    function renderPromptCardIcon(type) {
        if (type === 'risk') {
            return ''
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
                + '<path d="M12 3.5 20.25 18a1.5 1.5 0 0 1-1.31 2.25H5.06A1.5 1.5 0 0 1 3.75 18L12 3.5Z"></path>'
                + '<path d="M12 9v4.2"></path>'
                + '<circle cx="12" cy="17" r="1"></circle>'
                + '</svg>';
        }
        if (type === 'case') {
            return ''
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
                + '<path d="M3.75 8.25A2.25 2.25 0 0 1 6 6h4.4l1.85 2.1H18A2.25 2.25 0 0 1 20.25 10.35v6.9A2.25 2.25 0 0 1 18 19.5H6a2.25 2.25 0 0 1-2.25-2.25Z"></path>'
                + '</svg>';
        }
        if (type === 'law') {
            return ''
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
                + '<path d="M12 4v14.5"></path>'
                + '<path d="M7 7h10"></path>'
                + '<path d="M7.4 7 5 11.25h4.8L7.4 7Z"></path>'
                + '<path d="M16.6 7 14.2 11.25H19L16.6 7Z"></path>'
                + '<path d="M8.75 19.5h6.5"></path>'
                + '</svg>';
        }
        if (type === 'mediation') {
            return ''
                + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
                + '<path d="M7.25 6.25h5.5A3.25 3.25 0 0 1 16 9.5v1A3.25 3.25 0 0 1 12.75 13.75H10l-3 2v-2H7.25A3.25 3.25 0 0 1 4 10.5v-1a3.25 3.25 0 0 1 3.25-3.25Z"></path>'
                + '<path d="M14.5 11.25h2.25A3.25 3.25 0 0 1 20 14.5v1A3.25 3.25 0 0 1 16.75 18.75H15.5l-2.5 1.75v-1.75"></path>'
                + '</svg>';
        }
        return ''
            + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
            + '<rect x="4" y="5.5" width="16" height="14" rx="2.6"></rect>'
            + '<path d="M8 3.75v3.5"></path>'
            + '<path d="M16 3.75v3.5"></path>'
            + '<path d="M4 9.5h16"></path>'
            + '<path d="M8 13h2"></path>'
            + '<path d="M12 13h2"></path>'
            + '<path d="M8 16.5h2"></path>'
            + '<path d="M12 16.5h2"></path>'
            + '</svg>';
    }

    function syncComposerControls() {
        var sendBtn = document.getElementById('assistantChatSendBtn');
        var input = document.getElementById('assistantChatInput');
        var promptToggleBtn = document.getElementById('assistantPromptToggleBtn');
        var traceShortcutBtn = document.getElementById('assistantTraceShortcutBtn');
        var promptRoot = document.getElementById('assistantPromptActions');
        var hasInputValue = !!(input && plainText(input.value));
        if (sendBtn) {
            sendBtn.innerHTML = renderSendButtonIcon(assistantState.isSending);
            sendBtn.setAttribute('aria-label', assistantState.isSending ? TEXT.sending : TEXT.send);
            sendBtn.disabled = !!assistantState.isSending;
            sendBtn.classList.toggle('is-ready', hasInputValue && !assistantState.isSending);
        }
        if (promptToggleBtn) {
            promptToggleBtn.innerHTML = renderPromptToggleIcon();
            promptToggleBtn.classList.toggle('is-open', !!assistantState.quickActionsOpen);
            promptToggleBtn.setAttribute('aria-expanded', assistantState.quickActionsOpen ? 'true' : 'false');
            promptToggleBtn.setAttribute('aria-label', TEXT.quickActionsAria);
            promptToggleBtn.disabled = !!assistantState.isSending;
        }
        if (promptRoot) {
            promptRoot.classList.toggle('is-open', !!assistantState.quickActionsOpen);
            promptRoot.setAttribute('aria-hidden', assistantState.quickActionsOpen ? 'false' : 'true');
        }
    }

    function setPromptActionsOpen(isOpen) {
        assistantState.quickActionsOpen = !!isOpen && !assistantState.isSending;
        syncComposerControls();
    }
    function getAssistantPrefill(caseId) {
        if (!caseId || typeof sessionStorage === 'undefined') {
            return null;
        }
        try {
            var raw = sessionStorage.getItem('assistantPrefill');
            if (!raw) {
                return null;
            }
            var parsed = JSON.parse(raw);
            if (!parsed || String(parsed.id || '').trim() !== String(caseId).trim()) {
                return null;
            }
            return parsed;
        } catch (error) {
            return null;
        }
    }

    function applyAssistantPrefill(detail, prefill) {
        var merged = detail && typeof detail === 'object' ? Object.assign({}, detail) : {};
        var safePrefill = prefill && typeof prefill === 'object' ? prefill : null;
        if (!safePrefill) {
            return merged;
        }
        var prefillEventSource = plainText(safePrefill.eventSource || safePrefill.caseSource || safePrefill.event_source);
        if (prefillEventSource) {
            merged.eventSource = prefillEventSource;
            merged.caseSource = prefillEventSource;
            merged.event_source = prefillEventSource;
        }
        return merged;
    }
    function isAcceptedStatus(status) {
        return plainText(status) === STATUS.accepted;
    }

    function isMediatingStatus(status) {
        var text = plainText(status);
        return text === STATUS.mediating || text === STATUS.mediatingShort;
    }

    function isMediationSuccessStatus(status) {
        var text = plainText(status);
        return text === STATUS.success || text === STATUS.successShort;
    }

    function isMediationFailureStatus(status) {
        var text = plainText(status);
        return text === STATUS.failed || text === STATUS.failedShort;
    }

    function isMediationCompletedStatus(status) {
        return isMediationSuccessStatus(status) || isMediationFailureStatus(status);
    }

    function resolveProcessSteps(detail) {
        var steps = PROCESS_STEPS.slice();
        if (isMediationFailureStatus(detail && detail.mediationStatus)) {
            steps[4] = STATUS.litigation;
        }
        return steps;
    }

    function showAssistantInitLoading(text) {
        var overlay = document.getElementById('assistantInitLoading');
        var textNode = document.getElementById('assistantInitLoadingText');
        if (!overlay || !textNode) {
            return;
        }
        textNode.textContent = text || TEXT.initLoading;
        overlay.classList.remove('hidden');
        overlay.setAttribute('aria-hidden', 'false');
    }

    function hideAssistantInitLoading() {
        var overlay = document.getElementById('assistantInitLoading');
        if (!overlay) {
            return;
        }
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
    }

    function isAssistantInitLoadingVisible() {
        var overlay = document.getElementById('assistantInitLoading');
        return !!(overlay && !overlay.classList.contains('hidden'));
    }

    function buildRecommendedDepartmentPayload(detail) {
        return {
            caseId: assistantState.caseId ? Number(assistantState.caseId) : null,
            query: '1',
            caseSummary: plainText(detail && (detail.factsSummary || detail.caseSummary || detail.caseSmartSummary || detail.summaryText || detail.caseText)),
            variables: {
                dispute_text: detail && detail.factsSummary ? detail.factsSummary : '',
                category_level_1: detail && detail.disputeType ? detail.disputeType : '',
                category_level_2: detail && detail.disputeSubType ? detail.disputeSubType : ''
            }
        };
    }

    async function requestRecommendedDepartment(detail) {
        var payload = buildRecommendedDepartmentPayload(detail);
        if (!payload.caseId) {
            return null;
        }
        var response = await fetch(API_BASE + '/recommended-department/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await response.json();
        var successCode = json && (json.code === 0 || json.code === 200 || json.code === '0' || json.code === '200');
        if (!response.ok || !json || !successCode) {
            throw new Error((json && json.message) || 'recommended department request failed');
        }
        return json.data || null;
    }

    function buildDepartmentPushPayload(detail, query) {
        return {
            caseId: assistantState.caseId ? Number(assistantState.caseId) : null,
            case_raw_info: plainText(detail && (detail.caseText || detail.factsSummary)),
            recommended_department: plainText(detail && detail.recommendedDepartment),
            case_category: plainText(detail && detail.disputeSubType),
            case_level: plainText(detail && detail.riskLevel),
            current_stage: resolveCurrentStageName(detail),
            event_source: plainText(detail && (detail.eventSource || detail.caseSource || detail.event_source)),
            query: plainText(query)
        };
    }

    async function requestDepartmentPush(detail, query) {
        var payload = buildDepartmentPushPayload(detail, query);
        if (!payload.caseId) {
            return null;
        }
        var response = await fetch(API_BASE + '/recommended-department/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        var json = await response.json();
        var successCode = json && (json.code === 0 || json.code === 200 || json.code === '0' || json.code === '200');
        if (!response.ok || !json || !successCode) {
            throw new Error((json && json.message) || 'department push request failed');
        }
        return json.data || null;
    }

    function normalizeAssistantProgressActions(actions) {
        var items = Array.isArray(actions) ? actions : [];
        var normalized = [];
        for (var i = 0; i < items.length; i += 1) {
            var item = items[i] && typeof items[i] === 'object' ? items[i] : null;
            var queryText = plainText(item && (item.query || item.value || item.label));
            var labelText = plainText(item && (item.label || item.query || item.value));
            if (!queryText || !labelText) {
                continue;
            }
            normalized.push({
                label: labelText,
                query: queryText
            });
        }
        return normalized;
    }

    async function requestTrackingEvents(caseId) {
        if (!caseId) {
            return [];
        }
        var response = await fetch(API_BASE + '/recommended-department/tracking?caseId=' + encodeURIComponent(caseId));
        var json = await response.json();
        var successCode = json && (json.code === 0 || json.code === 200 || json.code === '0' || json.code === '200');
        if (!response.ok || !json || !successCode) {
            throw new Error((json && json.message) || 'tracking request failed');
        }
        return Array.isArray(json.data) ? json.data : [];
    }

    async function requestCaseFiles(caseId) {
        if (!caseId) {
            return [];
        }
        var response = await fetch(API_BASE + '/recommended-department/files?caseId=' + encodeURIComponent(caseId));
        var json = await response.json();
        var successCode = json && (json.code === 0 || json.code === 200 || json.code === '0' || json.code === '200');
        if (!response.ok || !json || !successCode) {
            throw new Error((json && json.message) || 'file request failed');
        }
        return Array.isArray(json.data) ? json.data : [];
    }

    function normalizeTrackingEvents(items) {
        if (!Array.isArray(items)) {
            return [];
        }
        return items.map(function (item, index) {
            return {
                id: String(item && item.id != null ? item.id : ('trace-' + index)),
                name: plainText(item && (item.eventSource || item.event_source)) || '-',
                answer: plainText(item && item.answer),
                summary: plainText(item && item.summary),
                time: plainText(item && (item.eventTime || item.event_time)),
                question: plainText(item && item.question)
            };
        });
    }

    async function loadTrackingEvents(forceRefresh) {
        if (!assistantState.caseId) {
            assistantState.trackingEvents = [];
            assistantState.trackingLoaded = true;
            renderTrackingList();
            return [];
        }
        if (assistantState.trackingLoading) {
            return assistantState.trackingEvents;
        }
        if (assistantState.trackingLoaded && !forceRefresh) {
            renderTrackingList();
            return assistantState.trackingEvents;
        }
        assistantState.trackingLoading = true;
        renderTrackingList();
        try {
            assistantState.trackingEvents = normalizeTrackingEvents(await requestTrackingEvents(assistantState.caseId));
            assistantState.expandedEventIds = {};
            assistantState.trackingLoaded = true;
            return assistantState.trackingEvents;
        } catch (error) {
            console.warn('load tracking events failed', error);
            assistantState.trackingEvents = assistantState.trackingEvents || [];
            assistantState.trackingLoaded = true;
            return assistantState.trackingEvents;
        } finally {
            assistantState.trackingLoading = false;
            renderTrackingList();
        }
    }

    function normalizeFileItems(items) {
        if (!Array.isArray(items)) {
            return [];
        }
        return items.map(function (item, index) {
            var path = plainText(item && item.path);
            var endpoint = plainText(item && item.endpoint);
            var fileName = plainText(item && (item.fileName || item.file_name));
            var id = plainText(item && item.id) || ('file-' + index);
            var title = plainText(item && item.title) || fileName || ('\u6587\u4ef6' + (index + 1));
            var generatedAt = item && (item.generatedAt || item.generated_at || item.time);
            if (id === 'archive-document') {
                title = '\u8c03\u89e3\u534f\u8bae\u4e66';
            }
            if (!path || !endpoint) {
                return null;
            }
            return {
                id: id,
                title: title,
                fileName: fileName || title,
                path: path,
                endpoint: endpoint,
                time: generatedAt || ''
            };
        }).filter(function (item) {
            return !!item;
        });
    }

    async function loadFileItems(forceRefresh) {
        if (!assistantState.caseId) {
            assistantState.fileItems = [];
            assistantState.filesLoaded = true;
            assistantState.fileLoadError = '';
            renderFileList();
            return [];
        }
        if (assistantState.filesLoading) {
            return assistantState.fileItems;
        }
        if (assistantState.filesLoaded && !forceRefresh) {
            renderFileList();
            return assistantState.fileItems;
        }
        assistantState.filesLoading = true;
        assistantState.fileLoadError = '';
        renderFileList();
        try {
            assistantState.fileItems = normalizeFileItems(await requestCaseFiles(assistantState.caseId));
            assistantState.filesLoaded = true;
            return assistantState.fileItems;
        } catch (error) {
            console.warn('load file items failed', error);
            assistantState.fileItems = [];
            assistantState.filesLoaded = true;
            assistantState.fileLoadError = TEXT.fileLoadFail;
            return assistantState.fileItems;
        } finally {
            assistantState.filesLoading = false;
            renderFileList();
        }
    }

    function resolveCurrentStageName(detail) {
        var status = plainText(detail && detail.mediationStatus);
        var steps = resolveProcessSteps(detail);
        if (detail && detail.archiveCompletedAt) {
            return steps[4];
        }
        if (status === STATUS.archived) {
            return steps[4];
        }
        if (isMediationSuccessStatus(status)) {
            return STATUS.successShort;
        }
        if (isMediationFailureStatus(status)) {
            return steps[4];
        }
        if (Number(detail && detail.expediteSuperviseStatus) === 1) {
            return steps[2];
        }
        if (isMediatingStatus(status)) {
            return steps[1];
        }
        return steps[0];
    }

    function isConfirmText(question) {
        return plainText(question) === '\u786e\u8ba4';
    }

    function isExpediteSuperviseQuestion(question) {
        var text = plainText(question);
        return text.indexOf('\u50ac\u529e') >= 0 || text.indexOf('\u7763\u529e') >= 0;
    }

    function isDisputeMediationQuestion(question) {
        var text = plainText(question);
        return text === '\u8c03\u89e3\u6210\u529f' || text === '\u8c03\u89e3\u5931\u8d25' || text === '\u6848\u4ef6\u8c03\u89e3\u6210\u529f' || text === '\u6848\u4ef6\u8c03\u89e3\u5931\u8d25';
    }

    function updateAssistantSendingState(isSending) {
        var input = document.getElementById('assistantChatInput');
        assistantState.isSending = !!isSending;
        if (assistantState.isSending) {
            assistantState.quickActionsOpen = false;
        }
        if (input) {
            input.disabled = !!isSending;
        }
        syncComposerControls();
    }

    function applyStaticText() {
        var mapping = {
            assistantSidebarTitle: TEXT.sidebarTitle,
            assistantNavHome: TEXT.navHome,
            assistantNavConsult: TEXT.navConsult,
            assistantNavImport: TEXT.navImport,
            assistantNavCases: TEXT.navCases,
            assistantNavInsight: TEXT.navInsight,
            assistantNavTools: TEXT.navTools,
            assistantEyebrow: TEXT.eyebrow,
            assistantBackLink: TEXT.back,
            assistantPageTitle: TEXT.pageTitle,
            assistantChatTitle: TEXT.chatTitle,
            assistantChatDesc: TEXT.chatDesc,
            assistantInfoTitle: TEXT.infoTitle,
            assistantInfoDesc: TEXT.infoDesc,
            assistantTraceShortcutBtn: TEXT.traceShortcut,
            assistantDetailTitle: TEXT.detailTitle,
            assistantTraceTitle: TEXT.traceTitle,
            assistantFilesTitle: TEXT.filesTitle,
            assistantModalCloseBtn: TEXT.modalClose,
            assistantModalTitle: TEXT.detailTitle,
            assistantCaseMaterialTitle: TEXT.caseMaterialTitle,
            closeCaseMaterialBtn: TEXT.modalClose
        };
        Object.keys(mapping).forEach(function (id) {
            var node = document.getElementById(id);
            if (!node) {
                return;
            }
            if (id === 'assistantSidebarTitle') {
                node.innerHTML = String(mapping[id]).split(String.fromCharCode(10)).join('<br>');
                return;
            }
            node.textContent = mapping[id];
        });
        var input = document.getElementById('assistantChatInput');
        var promptToggleBtn = document.getElementById('assistantPromptToggleBtn');
        if (input) {
            input.placeholder = TEXT.inputPlaceholder;
        }
        if (promptToggleBtn) {
            promptToggleBtn.setAttribute('aria-label', TEXT.quickActionsAria);
        }
        renderPromptActions();
        syncComposerControls();
        document.title = TEXT.eyebrow;
    }

    function parseEmotionLabel(detail) {
        var candidates = [detail && detail.emotionAssessmentText, detail && detail.emotionAssessment, detail && detail.caseText];
        for (var i = 0; i < candidates.length; i += 1) {
            var text = String(candidates[i] || '').trim();
            if (!text) {
                continue;
            }
            if (text.indexOf('\u6fc0\u52a8') >= 0 || text.indexOf('\u5f3a\u70c8') >= 0) {
                return '\u60c5\u7eea\u6fc0\u52a8';
            }
            if (text.indexOf('\u7126\u8651') >= 0) {
                return '\u7126\u8651\u5173\u6ce8';
            }
            if (text.indexOf('\u5e73\u7a33') >= 0 || text.indexOf('\u7a33\u5b9a') >= 0) {
                return '\u60c5\u7eea\u5e73\u7a33';
            }
            return text.length > 18 ? text.slice(0, 18) + '...' : text;
        }
        return TEXT.noEmotion;
    }

    function normalizeStatus(status) {
        var text = String(status || '').trim();
        if (!text) {
            return TEXT.processing;
        }
        if (text.indexOf('\u6210\u529f') >= 0 || text.indexOf('\u5b8c\u6210') >= 0 || text.indexOf('\u5f52\u6863') >= 0) {
            return TEXT.success;
        }
        if (text.indexOf('\u5931\u8d25') >= 0) {
            return TEXT.failed;
        }
        return TEXT.processing;
    }

    function resolveProcessState(detail) {
        var status = plainText(detail && detail.mediationStatus);
        if (!detail) {
            return { activeStage: 1, completedStage: 1, animatedLine: 1 };
        }
        if (detail.archiveCompletedAt || status === STATUS.archived) {
            return { activeStage: 5, completedStage: 5, animatedLine: 0 };
        }
        if (isMediationSuccessStatus(status)) {
            return { activeStage: 5, completedStage: 5, animatedLine: 0 };
        }
        if (isMediationFailureStatus(status)) {
            return { activeStage: 5, completedStage: 5, animatedLine: 0 };
        }
        if (Number(detail && detail.expediteSuperviseStatus) === 1) {
            return { activeStage: 3, completedStage: 3, animatedLine: 3 };
        }
        if (isMediatingStatus(status)) {
            return { activeStage: 2, completedStage: 2, animatedLine: 2 };
        }
        if (isAcceptedStatus(status) || !status) {
            return { activeStage: 1, completedStage: 1, animatedLine: 1 };
        }
        if (detail.diversionCompletedAt) {
            return { activeStage: 2, completedStage: 2, animatedLine: 2 };
        }
        return { activeStage: 1, completedStage: 1, animatedLine: 1 };
    }

    function renderProcessBar(detail) {
        var root = document.getElementById('assistantProcessBar');
        if (!root) {
            return;
        }
        var processState = resolveProcessState(detail);
        var processSteps = resolveProcessSteps(detail);
        var status = plainText(detail && detail.mediationStatus);
        var highlightResultStages = !!detail && (
            detail.archiveCompletedAt
            || status === STATUS.archived
            || isMediationCompletedStatus(status)
        );
        var pieces = [];
        for (var i = 0; i < processSteps.length; i += 1) {
            var stepIndex = i + 1;
            var stepClasses = [];
            var stepLabel = processSteps[i];
            if (stepIndex <= processState.completedStage) {
                stepClasses.push('is-complete');
            }
            if (stepIndex === processState.activeStage) {
                stepClasses.push('is-active');
            }
            if (highlightResultStages && (stepIndex === 4 || stepIndex === 5) && stepClasses.indexOf('is-active') === -1) {
                stepClasses.push('is-active');
            }
            if (stepIndex === 4 && stepIndex <= processState.completedStage) {
                if (isMediationSuccessStatus(status)) {
                    stepLabel = STATUS.successShort;
                } else if (isMediationFailureStatus(status)) {
                    stepLabel = STATUS.failedShort;
                }
            }
            pieces.push('<div class="assistant-step ' + stepClasses.join(' ') + '"><span class="assistant-step-num">' + stepIndex + '</span><span class="assistant-step-label">' + escapeHtml(stepLabel) + '</span></div>');
            if (i < processSteps.length - 1) {
                var lineIndex = i + 1;
                var lineClasses = [];
                if (lineIndex < processState.completedStage) {
                    lineClasses.push('is-complete');
                }
                if (lineIndex === processState.animatedLine) {
                    lineClasses.push('is-active');
                }
                pieces.push('<div class="assistant-step-line ' + lineClasses.join(' ') + '"></div>');
            }
        }
        root.innerHTML = pieces.join('');
    }

    function buildInfoRows(detail) {
        return [
            [
                { label: '\u6848\u4ef6\u5206\u7c7b', value: detail && detail.disputeType }
            ],
            [
                { label: '\u4e8c\u7ea7\u5206\u7c7b', value: detail && detail.disputeSubType }
            ],
            [
                { label: '\u60c5\u611f\u5206\u6790', value: parseEmotionLabel(detail) }
            ]
        ];
    }

    function buildInfoAvatar(detail) {
        var name = textValue(detail && detail.partyName, '\u6848');
        return escapeHtml(name.slice(0, 1));
    }

    function resolveAssistantSummary(data, allowCaseTextFallback) {
        var safeData = data || {};
        var candidates = [
            safeData.judgementBasisText,
            safeData.factsSummary,
            safeData.summaryText,
            safeData.aiSummary,
            safeData.caseSummary,
            safeData.caseSmartSummary
        ];
        for (var i = 0; i < candidates.length; i += 1) {
            var item = String(candidates[i] || '').trim();
            if (item) {
                return item;
            }
        }
        if (allowCaseTextFallback) {
            var caseText = String(safeData.caseText || '').trim();
            if (caseText) {
                return caseText;
            }
        }
        return '-';
    }

    function formatDetailValue(value) {
        if (value === null || value === undefined) {
            return '-';
        }
        var text = String(value).trim();
        return text ? text : '-';
    }

    function normalizeAudioUrl(url) {
        var raw = String(url || '').trim();
        if (!raw) {
            return '';
        }
        try {
            return new URL(raw, window.location.origin).toString();
        } catch (error) {
            return raw;
        }
    }

    function renderCaseAudioRemaining() {
        var btn = document.getElementById('playCaseAudioBtn');
        if (!btn || !caseAudioPlayer) {
            return;
        }
        var duration = Number(caseAudioPlayer.duration);
        var current = Number(caseAudioPlayer.currentTime) || 0;
        if (caseAudioPlayer.paused && duration > 0 && current >= duration - 0.25) {
            btn.textContent = '\u8bed\u97f3\u64ad\u653e';
            return;
        }
        var prefix = caseAudioPlayer.paused ? '\u8bed\u97f3\u64ad\u653e' : '\u6682\u505c\u64ad\u653e';
        if (!Number.isFinite(duration) || duration <= 0) {
            btn.textContent = prefix;
            return;
        }
        var remaining = Math.max(0, duration - current);
        btn.textContent = prefix + ' ' + formatAudioDuration(remaining);
    }

    function stopCaseAudioCountdown() {
        if (caseAudioCountdownTimer) {
            clearInterval(caseAudioCountdownTimer);
            caseAudioCountdownTimer = null;
        }
    }

    function startCaseAudioCountdown() {
        stopCaseAudioCountdown();
        caseAudioCountdownTimer = setInterval(function () {
            renderCaseAudioRemaining();
        }, 1000);
    }

    function toggleCaseAudioPlay(data) {
        var btn = document.getElementById('playCaseAudioBtn');
        if (!btn) {
            return;
        }
        var normalizedAudioUrl = normalizeAudioUrl(data && data.audioFileUrl ? data.audioFileUrl : '');
        if (!normalizedAudioUrl) {
            alert('\u5f53\u524d\u6848\u4ef6\u6ca1\u6709\u53ef\u64ad\u653e\u7684\u97f3\u9891\u6587\u4ef6');
            return;
        }
        if (!caseAudioPlayer || currentCaseAudioUrl !== normalizedAudioUrl) {
            if (caseAudioPlayer) {
                caseAudioPlayer.pause();
            }
            stopCaseAudioCountdown();
            caseAudioPlayer = new Audio(normalizedAudioUrl);
            currentCaseAudioUrl = normalizedAudioUrl;
            caseAudioPlayer.addEventListener('loadedmetadata', function () {
                renderCaseAudioRemaining();
            });
            caseAudioPlayer.addEventListener('timeupdate', function () {
                if (!caseAudioPlayer.paused) {
                    renderCaseAudioRemaining();
                }
            });
            caseAudioPlayer.addEventListener('ended', function () {
                stopCaseAudioCountdown();
                btn.classList.remove('audio-counting');
                btn.textContent = '\u8bed\u97f3\u64ad\u653e';
            });
        }
        if (caseAudioPlayer.paused) {
            caseAudioPlayer.play().then(function () {
                btn.classList.add('audio-counting');
                renderCaseAudioRemaining();
                startCaseAudioCountdown();
            }).catch(function () {
                btn.classList.remove('audio-counting');
                btn.textContent = '\u8bed\u97f3\u64ad\u653e';
                alert('\u97f3\u9891\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u6587\u4ef6\u662f\u5426\u53ef\u8bbf\u95ee');
            });
            return;
        }
        caseAudioPlayer.pause();
        stopCaseAudioCountdown();
        btn.classList.remove('audio-counting');
        renderCaseAudioRemaining();
    }

    function renderDetailGrid(items) {
        return '<div class="case-detail-grid">' + items.map(function (item) {
            var extraClass = item.wide ? ' case-detail-item-wide' : '';
            return '<div class="case-detail-item' + extraClass + '"><span class="case-detail-label">' + escapeHtml(item.label) + '</span><span class="case-detail-value">' + escapeHtml(formatDetailValue(item.value)) + '</span></div>';
        }).join('') + '</div>';
    }

    function renderCaseDetailPanel(detail) {
        var root = document.getElementById('assistantCaseDetailContent');
        if (!root) {
            return;
        }

        var safeData = detail || {};
        var rawMaterial = safeData.caseText || safeData.materialText || safeData.rawMaterial || safeData.parseError || TEXT.noText;
        var smartSummary = resolveAssistantSummary(safeData, false);
        var normalizedAudioUrl = normalizeAudioUrl(safeData.audioFileUrl);
        var hasAudio = Boolean(normalizedAudioUrl);
        var basicItems = [
            { label: '\u4e8b\u4ef6\u6765\u6e90', value: safeData.eventSource || safeData.caseSource || safeData.event_source },
            { label: '\u529e\u7406\u8fdb\u5ea6', value: safeData.handlingProgress || safeData.mediationStatus },
            { label: '\u7ea0\u7eb7\u5730\u70b9', value: safeData.disputeLocation, wide: true },
            { label: '\u767b\u8bb0\u65f6\u95f4', value: safeData.registerTime, wide: true }
        ];
        var partyItems = [
            { label: '\u59d3\u540d', value: safeData.partyName },
            { label: '\u8eab\u4efd\u8bc1\u53f7', value: safeData.partyId },
            { label: '\u8054\u7cfb\u7535\u8bdd', value: safeData.partyPhone },
            { label: '\u8054\u7cfb\u5730\u5740', value: safeData.partyAddress }
        ];
        var counterpartyItems = [
            { label: '\u59d3\u540d', value: safeData.counterpartyName },
            { label: '\u8eab\u4efd\u8bc1\u53f7', value: safeData.counterpartyId },
            { label: '\u8054\u7cfb\u7535\u8bdd', value: safeData.counterpartyPhone },
            { label: '\u8054\u7cfb\u5730\u5740', value: safeData.counterpartyAddress }
        ];

        root.innerHTML = ''
            + '<div class="assistant-detail-layout">'
            + '<section class="case-detail-section assistant-detail-section assistant-detail-section-wide">'
            + '<div class="assistant-detail-section-head"><h4>\u6848\u4ef6\u57fa\u672c\u4fe1\u606f</h4></div>'
            + renderDetailGrid(basicItems)
            + '</section>'
            + '<div class="assistant-detail-stack">'
            + '<section class="case-detail-section assistant-detail-section">'
            + '<div class="assistant-detail-section-head"><h4>\u5f53\u4e8b\u4eba\u4fe1\u606f</h4></div>'
            + renderDetailGrid(partyItems)
            + '</section>'
            + '<section class="case-detail-section assistant-detail-section">'
            + '<div class="assistant-detail-section-head"><h4>\u5bf9\u65b9\u5f53\u4e8b\u4eba\u4fe1\u606f</h4></div>'
            + renderDetailGrid(counterpartyItems)
            + '</section>'
            + '</div>'
            + '<section class="case-detail-section case-detail-summary assistant-detail-section assistant-detail-section-summary">'
            + '<div class="assistant-detail-section-head"><h4>\u6848\u4ef6\u667a\u80fd\u6458\u8981</h4></div>'
            + '<div class="case-detail-text">' + escapeHtml(formatDetailValue(smartSummary)) + '</div>'
            + '</section>'
            + '<section class="case-detail-section case-detail-raw assistant-detail-section assistant-detail-section-raw">'
            + '<div class="assistant-detail-section-head">'
            + '<h4>\u6848\u4ef6\u539f\u6587</h4>'
            + '<button type="button" id="playCaseAudioBtn" class="assistant-audio-btn" data-case-audio-toggle="1"' + (hasAudio ? '' : ' disabled') + '>'
            + (hasAudio ? '\u8bed\u97f3\u64ad\u653e' : '\u6682\u65e0\u8bed\u97f3')
            + '</button>'
            + '</div>'
            + '<div class="case-detail-text">' + escapeHtml(formatDetailValue(rawMaterial)) + '</div>'
            + '</section>'
            + '</div>';

        if (hasAudio && currentCaseAudioUrl === normalizedAudioUrl && caseAudioPlayer) {
            var audioBtn = document.getElementById('playCaseAudioBtn');
            if (audioBtn) {
                audioBtn.classList.toggle('audio-counting', !caseAudioPlayer.paused);
            }
            renderCaseAudioRemaining();
        }
    }

    function renderInfoSummary(detail) {
        var root = document.getElementById('assistantInfoSummary');
        if (!root) {
            return;
        }
        var rows = buildInfoRows(detail);
        var riskLevel = textValue(detail && detail.riskLevel, '\u5f85\u8bc4\u4f30');
        var caseCode = textValue(detail && (detail.caseNo || detail.caseId || detail.id));
        var riskClass = riskLevel === '\u9ad8' ? 'risk-high' : riskLevel === '\u4e2d' ? 'risk-medium' : riskLevel === '\u4f4e' ? 'risk-low' : '';
        root.innerHTML = ''
            + '<section class="assistant-info-profile">'
            + '<div class="assistant-info-profile-top">'
            + '<div class="assistant-info-identity">'
            + '<div class="assistant-info-avatar">' + buildInfoAvatar(detail) + '</div>'
            + '<div class="assistant-info-name-wrap">'
            + '<div class="assistant-info-name">' + escapeHtml(textValue(detail && detail.partyName, '\u672a\u77e5\u5f53\u4e8b\u4eba')) + '</div>'
            + '<div class="assistant-info-id">ID: ' + escapeHtml(caseCode) + '</div>'
            + '</div>'
            + '</div>'
            + '<div class="assistant-info-risk-wrap">'
            + '<div class="assistant-info-risk-pill ' + riskClass + '"><span class="assistant-info-risk-dot"></span><span>\u98ce\u9669\u7b49\u7ea7\uff1a' + escapeHtml(riskLevel) + '</span></div>'
            + '</div>'
            + '</div>'
            + '<div class="assistant-info-divider"></div>'
            + '<div class="assistant-info-overview-grid">'
            + '<section class="assistant-info-overview-item">'
            + '<div class="assistant-info-overview-label">' + escapeHtml(rows[0][0].label) + '</div>'
            + '<div class="assistant-info-overview-value">' + escapeHtml(textValue(rows[0][0].value)) + '</div>'
            + '</section>'
            + '<section class="assistant-info-overview-item">'
            + '<div class="assistant-info-overview-label">' + escapeHtml(rows[1][0].label) + '</div>'
            + '<div class="assistant-info-overview-value">' + escapeHtml(textValue(rows[1][0].value)) + '</div>'
            + '</section>'
            + '<section class="assistant-info-overview-item assistant-info-overview-item-wide">'
            + '<div class="assistant-info-overview-label">' + escapeHtml(rows[2][0].label) + '</div>'
            + '<div class="assistant-info-overview-value">' + escapeHtml(textValue(rows[2][0].value)) + '</div>'
            + '</section>'
            + '</div>'
            + '</section>';
    }

    function eventSummaryPreview(text, expanded) {
        var raw = textValue(text, '\u6682\u65e0\u6458\u8981');
        if (expanded || raw.length <= 68) {
            return { text: raw, truncated: false };
        }
        return { text: raw.slice(0, 68) + '...', truncated: true };
    }

    function buildTrackingEvents(detail) {
        var pushSummary = '';
        var briefingText = resolveAssistantBriefing(detail);
        if (briefingText) {
            pushSummary = briefingText;
        } else if (detail) {
            pushSummary = '\u6848\u4ef6\u5df2\u8fdb\u5165\u90e8\u95e8\u534f\u540c\u63a8\u8fdb\u9636\u6bb5\uff0c\u5f53\u524d\u529e\u7406\u8fdb\u5ea6\uff1a' + textValue(detail.handlingProgress || detail.mediationStatus);
        }
        var events = [
            { id: 'accept', name: '\u6848\u4ef6\u53d7\u7406', summary: detail && detail.caseText, time: detail && (detail.registerTime || detail.createdAt), status: TEXT.success },
            { id: 'recommend', name: '\u90e8\u95e8\u63a8\u8350', summary: detail ? '\u7cfb\u7edf\u63a8\u8350\u90e8\u95e8\uff1a' + textValue(detail.recommendedDepartment) + '\uff1b\u63a8\u8350\u7406\u7531\uff1a' + textValue(detail.recommendReason) : '', time: detail && (detail.workflowCreatedAt || detail.createdAt), status: detail && detail.recommendedDepartment ? TEXT.success : TEXT.processing },
            { id: 'push', name: '\u6848\u4ef6\u63a8\u9001', summary: pushSummary, time: detail && (detail.diversionCompletedAt || detail.updatedAt || detail.createdAt), status: detail && detail.diversionCompletedAt ? TEXT.success : TEXT.processing },
            { id: 'supervise', name: '\u6848\u4ef6\u8ddf\u8fdb', summary: detail ? '\u8ddf\u8fdb\u72b6\u6001\uff1a' + textValue(detail.mediationStatus || detail.handlingProgress) + '\uff1b\u667a\u80fd\u5efa\u8bae\uff1a' + textValue(detail.mediationAdvice || detail.factsSummary) : '', time: detail && (detail.mediationCompletedAt || detail.updatedAt || detail.createdAt), status: normalizeStatus(detail && detail.mediationStatus) },
            { id: 'archive', name: '\u6848\u4ef6\u5f52\u6863', summary: detail ? '\u5f52\u6863\u603b\u7ed3\uff1a' + textValue(detail.archiveSummary || detail.factsSummary || detail.caseText) : '', time: detail && (detail.archiveCompletedAt || detail.updatedAt || detail.createdAt), status: detail && detail.archiveCompletedAt ? TEXT.success : TEXT.processing }
        ];
        return events.filter(function (item) { return item.summary || item.time || item.status; });
    }

    function traceStatusClass(status) {
        if (status === TEXT.success) {
            return 'assistant-status-success';
        }
        if (status === TEXT.failed) {
            return 'assistant-status-failed';
        }
        return 'assistant-status-processing';
    }

    function renderTrackingList() {
        var root = document.getElementById('assistantTraceList');
        var count = document.getElementById('assistantTraceCount');
        if (!root) {
            return;
        }
        if (count) {
            count.textContent = String(assistantState.trackingEvents.length);
        }
        if (assistantState.trackingLoading) {
            root.innerHTML = '<div class="assistant-trace-empty assistant-trace-loading">' + TEXT.traceLoading + '</div>';
            return;
        }
        if (!assistantState.trackingEvents.length) {
            root.innerHTML = '<div class="assistant-trace-empty">' + TEXT.traceEmpty + '</div>';
            return;
        }
        root.innerHTML = assistantState.trackingEvents.map(function (event) {
            var expanded = !!assistantState.expandedEventIds[event.id];
            var preview = eventSummaryPreview(event.summary || event.answer, expanded);
            var toggleBtn = preview.truncated || expanded
                ? '<button type="button" class="assistant-inline-link" data-trace-toggle="' + escapeHtml(event.id) + '">' + (expanded ? TEXT.collapse : TEXT.expand) + '</button>'
                : '';
            return '<article class="assistant-trace-item">'
                + '<div class="assistant-trace-title-row">'
                + '<div class="assistant-trace-title">' + escapeHtml(event.name) + '</div>'
                + '</div>'
                + '<div class="assistant-trace-answer">' + escapeHtml(textValue(event.answer, TEXT.noText)) + '</div>'
                + '<div class="assistant-trace-meta"><span>\u65f6\u95f4\uff1a' + escapeHtml(textValue(event.time)) + '</span></div>'
                + '<div class="assistant-trace-detail-block">'
                + '<div class="assistant-trace-detail-label">' + TEXT.traceSummaryLabel + '</div>'
                + '<div class="assistant-trace-summary">' + escapeHtml(preview.text) + (toggleBtn ? ' ' + toggleBtn : '') + '</div>'
                + '</div>'
                + '</article>';
        }).join('');
    }

    function fileNameFromPath(pathValue) {
        var normalized = String(pathValue || '').replace(/\\/g, '/');
        var parts = normalized.split('/');
        return parts[parts.length - 1] || '\u6848\u4ef6\u7b80\u62a5.pdf';
    }

    function formatFileDisplayTime(value) {
        if (!value) {
            return '--';
        }
        var date = new Date(value);
        if (isNaN(date.getTime())) {
            return plainText(value, '--');
        }
        return date.getFullYear()
            + '-' + String(date.getMonth() + 1).padStart(2, '0')
            + '-' + String(date.getDate()).padStart(2, '0')
            + ' ' + String(date.getHours()).padStart(2, '0')
            + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    function buildFileItems(detail) {
        var items = [];
        var briefingPath = plainText(detail && (detail.briefingDocumentPath || detail.briefing_document_path));
        var archiveReportPath = plainText(detail && (detail.archiveReportPath || detail.archive_report_path));
        var archiveDocumentPath = plainText(detail && (detail.archiveDocumentPath || detail.archive_document_path));
        if (briefingPath) {
            items.push({
                id: 'briefing',
                title: '\u6848\u4ef6\u7b80\u62a5',
                fileName: fileNameFromPath(briefingPath),
                path: briefingPath,
                endpoint: '/recommended-department/briefing-document/download',
                time: detail && (detail.briefingGeneratedAt || detail.diversionCompletedAt || detail.updatedAt || detail.createdAt)
            });
        }
        if (archiveReportPath) {
            items.push({
                id: 'archive-report',
                title: '\u5f52\u6863\u62a5\u544a',
                fileName: fileNameFromPath(archiveReportPath),
                path: archiveReportPath,
                endpoint: '/dify/archive-report/download',
                time: detail && (detail.archiveReportGeneratedAt || detail.archiveCompletedAt || detail.updatedAt || detail.createdAt)
            });
        }
        if (archiveDocumentPath) {
            items.push({
                id: 'archive-document',
                title: '\u8c03\u89e3\u534f\u8bae\u4e66',
                fileName: fileNameFromPath(archiveDocumentPath),
                path: archiveDocumentPath,
                endpoint: '/dify/archive-document/download',
                time: detail && (detail.mediationDocumentGeneratedAt || detail.archiveCompletedAt || detail.mediationCompletedAt || detail.updatedAt || detail.createdAt)
            });
        }
        return items;
    }

    function iconSvg(name) {
        var icons = {
            copy: '<img src="./img/copy.png" alt="">',
            like: '<img src="./img/zan.png" alt="">',
            dislike: '<img src="./img/nozan.png" alt="">',
            time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
            file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path></svg>',
            download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10"></path><path d="m8 10 4 4 4-4"></path><path d="M5 20h14"></path></svg>'
        };
        return icons[name] || '';
    }

    function getFileType(name) {
        var lowerName = String(name || '').toLowerCase();
        if (/\.pdf$/.test(lowerName)) {
            return 'pdf';
        }
        if (/\.(doc|docx)$/.test(lowerName)) {
            return 'doc';
        }
        if (/\.(jpg|jpeg|png|gif|bmp|webp)$/.test(lowerName)) {
            return 'image';
        }
        return 'file';
    }

    function fileIconSvg(fileName) {
        var type = getFileType(fileName);
        if (type === 'pdf') {
            return '<span class="assistant-file-type-icon is-pdf" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><rect x="3" y="2.5" width="18" height="23" rx="2.5" fill="#ffffff" stroke="#111827" stroke-width="1.8"></rect><path d="M6 5.5h12v17H6z" fill="#ef233c"></path><path d="M21 8.5l4-4v17.5a2.5 2.5 0 0 1-2.5 2.5H21z" fill="#ffffff" opacity="0.95"></path><path d="M21 8.5h4" stroke="#111827" stroke-width="1.6" stroke-linecap="round"></path><path d="M6.5 22.5H18" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"></path></svg></span>';
        }
        if (type === 'doc') {
            return '<span class="assistant-file-type-icon is-doc" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><rect x="3" y="2.5" width="18" height="23" rx="2.5" fill="#ffffff" stroke="#111827" stroke-width="1.8"></rect><path d="M6 5.5h12v17H6z" fill="#4ea8de"></path><path d="M21 8.5l4-4v17.5a2.5 2.5 0 0 1-2.5 2.5H21z" fill="#ffffff" opacity="0.95"></path><path d="M21 8.5h4" stroke="#111827" stroke-width="1.6" stroke-linecap="round"></path><path d="M8.4 10.2h7.2M8.4 13.4h7.2M8.4 16.6h5.2" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"></path></svg></span>';
        }
        if (type === 'image') {
            return '<span class="assistant-file-type-icon is-image" aria-hidden="true"><svg viewBox="0 0 28 28" fill="none"><rect x="3" y="4" width="22" height="18" rx="2.5" fill="#fff7cc" stroke="#111827" stroke-width="1.8"></rect><circle cx="20" cy="9" r="2.2" fill="#ffb703"></circle><path d="M7 18l4.2-4.5 3.2 3 2.8-2.6L22 18" stroke="#38b000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M7 18h15" stroke="#38b000" stroke-width="2" stroke-linecap="round"></path></svg></span>';
        }
        return '<span class="assistant-file-type-icon is-file" aria-hidden="true">' + iconSvg('file') + '</span>';
    }

    function fileIconMarkup() {
        return '<img src="./img/pdf.png" alt="" class="assistant-file-icon-image">';
    }

    function renderFileList() {
        var root = document.getElementById('assistantFileList');
        var count = document.getElementById('assistantFileCount');
        var files = assistantState.fileItems || [];
        if (!root) {
            return;
        }
        if (count) {
            count.textContent = String(files.length);
        }
        if (assistantState.filesLoading) {
            root.innerHTML = '<div class="assistant-trace-empty assistant-trace-loading">' + TEXT.fileLoading + '</div>';
            return;
        }
        if (assistantState.fileLoadError) {
            root.innerHTML = '<div class="assistant-trace-empty">' + escapeHtml(assistantState.fileLoadError) + '</div>';
            return;
        }
        if (!files.length) {
            root.innerHTML = '<div class="assistant-file-empty"><div class="assistant-file-icon-wrap">' + fileIconMarkup() + '</div><div class="assistant-file-empty-title">\u6682\u65e0\u53ef\u4e0b\u8f7d\u6587\u4ef6</div><div class="assistant-file-empty-text">' + TEXT.fileEmpty + '</div></div>';
            return;
        }
        root.innerHTML = files.map(function (item) {
            var displayName = item.title || item.fileName;
            return '<button type="button" class="assistant-file-card" data-file-download="' + escapeHtml(item.path) + '" data-file-endpoint="' + escapeHtml(item.endpoint) + '" title="\u4e0b\u8f7d ' + escapeHtml(displayName) + '">'
                + '<span class="assistant-file-icon-wrap">' + fileIconMarkup() + '</span>'
                + '<span class="assistant-file-main">'
                + '<span class="assistant-file-title">' + escapeHtml(displayName) + '</span>'
                + '<span class="assistant-file-time">生成时间：' + escapeHtml(formatFileDisplayTime(item.time)) + '</span>'
                + '</span>'
                + '</button>';
        }).join('');
    }

    function renderSideModules(detail) {
        renderCaseDetailPanel(detail);
        renderTrackingList();
        renderFileList();
        var sideRoot = document.getElementById('assistantSideModules');
        var detailPanel = document.getElementById('assistantDetailPanel');
        var tracePanel = document.getElementById('assistantTracePanel');
        var filePanel = document.getElementById('assistantFilePanel');
        if (!sideRoot || !detailPanel || !tracePanel || !filePanel) {
            return;
        }
        var activeTab = assistantState.sideTab;
        if (activeTab !== 'trace' && activeTab !== 'files' && activeTab !== 'detail') {
            activeTab = 'detail';
        }
        var buttons = sideRoot.querySelectorAll('[data-side-tab]');
        for (var i = 0; i < buttons.length; i += 1) {
            var isActive = buttons[i].getAttribute('data-side-tab') === activeTab;
            buttons[i].classList.toggle('is-active', isActive);
        }
        detailPanel.classList.toggle('is-active', activeTab === 'detail');
        tracePanel.classList.toggle('is-active', activeTab === 'trace');
        filePanel.classList.toggle('is-active', activeTab === 'files');
    }

    async function openAssistantTraceShortcut() {
        await sendChatQuestion(TEXT.traceShortcut);
    }

    function seedChat() {
        assistantState.chatMessages = [];
        assistantState.messageSeq = 0;
        assistantState.departmentMenuOpen = false;
        assistantState.departmentMenuMessageId = '';
        assistantState.departmentActionMessageId = '';
    }

    function scrollAssistantChatToBottom() {
        var root = document.getElementById('assistantChatList');
        if (root) {
            root.scrollTop = root.scrollHeight;
        }
    }

    function waitAssistantTyping(delay) {
        return new Promise(function (resolve) {
            window.setTimeout(resolve, delay);
        });
    }

    function findChatMessage(messageId) {
        for (var i = 0; i < assistantState.chatMessages.length; i += 1) {
            if (assistantState.chatMessages[i].id === messageId) {
                return assistantState.chatMessages[i];
            }
        }
        return null;
    }

    function removeChatMessage(messageId) {
        for (var i = 0; i < assistantState.chatMessages.length; i += 1) {
            if (assistantState.chatMessages[i].id === messageId) {
                assistantState.chatMessages.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    function pushAssistantWaitingMessage() {
        var id = 'assistant-msg-' + (++assistantState.messageSeq);
        assistantState.chatMessages.push({
            id: id,
            role: 'assistant',
            content: '',
            loading: true
        });
        renderChat();
        return id;
    }

    function renderAssistantWaitingMessage() {
        return '<span class="assistant-waiting-label"></span>'
            + '<span class="assistant-waiting-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
    }
    function formatAssistantMessageTime(value) {
        if (!value) {
            return '';
        }
        var date = new Date(value);
        if (isNaN(date.getTime())) {
            return plainText(value);
        }
        return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
    }

    function renderAssistantMessageToolbar(message) {
        if (!message || message.role !== 'assistant' || !message.finishedAt) {
            return '';
        }
        var dislikeActive = message.dislikeOpen || message.feedbackSubmitted;
        var feedbackHtml = message.dislikeOpen
            ? '<div class="assistant-msg-feedback"><div class="assistant-msg-feedback-title">' + TEXT.feedbackTitle + '</div><textarea data-feedback-input="' + escapeHtml(message.id) + '" placeholder="' + escapeHtml(TEXT.feedbackPlaceholder) + '">' + escapeHtml(message.dislikeDraft || '') + '</textarea><div class="assistant-msg-feedback-actions"><button type="button" class="ui-btn ui-btn-secondary" data-feedback-cancel="' + escapeHtml(message.id) + '">' + TEXT.feedbackCancel + '</button><button type="button" class="ui-btn ui-btn-primary" data-feedback-submit="' + escapeHtml(message.id) + '">' + TEXT.feedbackSubmit + '</button></div></div>'
            : '';
        return '<div class="assistant-msg-toolbar">'
            + '<div class="assistant-msg-actions" role="group" aria-label="message actions">'
            + '<button type="button" class="assistant-msg-action' + (message.copied ? ' is-active' : '') + '" data-msg-action="copy" data-message-id="' + escapeHtml(message.id) + '" title="' + escapeHtml(message.copied ? TEXT.copied : TEXT.copy) + '"><span class="assistant-msg-action-icon" aria-hidden="true">' + iconSvg('copy') + '</span></button>'
            + '<button type="button" class="assistant-msg-action' + (message.liked ? ' is-active' : '') + '" data-msg-action="like" data-message-id="' + escapeHtml(message.id) + '" title="' + escapeHtml(TEXT.like) + '"><span class="assistant-msg-action-icon" aria-hidden="true">' + iconSvg('like') + '</span></button>'
            + '<button type="button" class="assistant-msg-action' + (dislikeActive ? ' is-active' : '') + '" data-msg-action="dislike" data-message-id="' + escapeHtml(message.id) + '" title="' + escapeHtml(TEXT.dislike) + '"><span class="assistant-msg-action-icon" aria-hidden="true">' + iconSvg('dislike') + '</span></button>'
            + '</div>'
            + '<div class="assistant-msg-time" title="' + escapeHtml(TEXT.responseTime) + '">'
            + '<span class="assistant-msg-time-icon" aria-hidden="true">' + iconSvg('time') + '</span>'
            + '<span class="assistant-msg-time-value">' + escapeHtml(formatAssistantMessageTime(message.finishedAt)) + '</span>'
            + '</div>'
            + '</div>'
            + feedbackHtml;
    }

    async function copyTextToClipboard(textValue) {
        var value = String(textValue || '');
        if (!value) {
            return false;
        }
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(value);
            return true;
        }
        var textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.setAttribute('readonly', 'readonly');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        var copied = document.execCommand('copy');
        document.body.removeChild(textarea);
        return copied;
    }

    function downloadCaseFile(pathValue, endpoint) {
        var safePath = plainText(pathValue);
        var safeEndpoint = plainText(endpoint);
        if (!safePath || !safeEndpoint) {
            return;
        }
        var link = document.createElement('a');
        link.href = API_BASE + safeEndpoint + '?path=' + encodeURIComponent(safePath);
        link.target = '_blank';
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function resolveAssistantRecommendReason(detail) {
        if (!detail || typeof detail !== 'object') {
            return '';
        }
        var candidates = [
            detail.recommendReason,
            detail.recommend_reason,
            detail.markdownMessage,
            detail.markdown_message,
            detail.answer
        ];
        for (var i = 0; i < candidates.length; i += 1) {
            var text = plainText(candidates[i]);
            if (text) {
                return text;
            }
        }
        return '';
    }

    function buildAssistantBriefingIntro(detail) {
        var department = plainText(detail && detail.recommendedDepartment) || '\u76f8\u5173';
        return '\u6211\u5df2\u6210\u529f\u628a\u6848\u4ef6\u63a8\u9001\u81f3 ' + department + ' \u90e8\u95e8\uff0c\u5e76\u751f\u6210\u4e86\u6848\u4ef6\u7b80\u62a5\uff0c\u4fbf\u4e8e\u8c03\u89e3\u4eba\u5458\u5feb\u901f\u638c\u63e1\u6848\u4ef6\u4fe1\u606f\u3002';
    }

    function hasAssistantBriefingIntro(text) {
        return plainText(text).indexOf('\u6211\u5df2\u6210\u529f\u628a\u6848\u4ef6\u63a8\u9001\u81f3 ') === 0;
    }

    function resolveAssistantBriefing(detail) {
        if (!detail || typeof detail !== 'object') {
            return '';
        }
        var candidates = [detail.briefing, detail.briefMarkdown, detail.brief_markdown];
        for (var i = 0; i < candidates.length; i += 1) {
            var text = plainText(candidates[i]);
            if (!text) {
                continue;
            }
            if (Number(detail.expediteSuperviseStatus) === 1) {
                return text;
            }
            if (isMediatingStatus(detail.mediationStatus)) {
                if (hasAssistantBriefingIntro(text)) {
                    return text;
                }
                var intro = buildAssistantBriefingIntro(detail);
                return text.indexOf(intro) === 0 ? text : (intro + '\n' + text);
            }
            return text;
        }
        return '';
    }

    function resolveAssistantInitialMessage(detail) {
        var status = plainText(detail && detail.mediationStatus);
        if (isMediatingStatus(status) || isMediationCompletedStatus(status)) {
            return resolveAssistantBriefing(detail) || resolveAssistantRecommendReason(detail);
        }
        if (isAcceptedStatus(status) || !status) {
            return resolveAssistantRecommendReason(detail) || resolveAssistantBriefing(detail);
        }
        return resolveAssistantBriefing(detail) || resolveAssistantRecommendReason(detail);
    }

    function resolveAssistantTypingMode(detail) {
        return 'char';
    }

    function shouldTriggerDepartmentPush(detail, question) {
        return true;
    }

    function normalizeAssistantMarkdown(content) {
        return String(content || '').replace(/\r\n/g, '\n').trim();
    }

    function renderAssistantMarkdown(content) {
        var normalized = normalizeAssistantMarkdown(content);
        if (!normalized) {
            return '';
        }
        var md = getMarkdownRenderer();
        if (md) {
            return md.render(normalized);
        }
        return escapeHtml(normalized).split('\n').join('<br>');
    }

    function renderUserMessage(content) {
        return escapeHtml(String(content || '')).split('\n').join('<br>');
    }

    async function typeAssistantMessage(content, options) {
        var root = document.getElementById('assistantChatList');
        var messageMeta = options && options.messageMeta && typeof options.messageMeta === 'object' ? options.messageMeta : null;
        var message = null;
        if (!root) {
            return '';
        }
        var safeContent = normalizeAssistantMarkdown(content);
        if (!safeContent) {
            return '';
        }
        var mode = options && options.mode === 'line' ? 'line' : 'char';
        var wrapper = document.createElement('article');
        wrapper.className = 'assistant-msg assistant';

        var body = document.createElement('div');
        body.className = 'assistant-msg-content is-typing';
        wrapper.appendChild(body);
        root.appendChild(wrapper);
        scrollAssistantChatToBottom();

        if (mode === 'line') {
            var lines = safeContent.split('\n');
            var currentLineText = '';
            for (var lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
                currentLineText = currentLineText ? (currentLineText + '\n' + lines[lineIndex]) : lines[lineIndex];
                body.innerHTML = renderAssistantMarkdown(currentLineText || safeContent);
                scrollAssistantChatToBottom();
                await waitAssistantTyping(lines[lineIndex].trim() ? Math.min(420, 120 + (lines[lineIndex].length * 12)) : 140);
            }
        } else {
            var current = '';
            for (var i = 0; i < safeContent.length; i += 1) {
                current += safeContent.charAt(i);
                body.innerHTML = renderAssistantMarkdown(current);
                scrollAssistantChatToBottom();
                await waitAssistantTyping(/[\uff0c\u3002\uff01\uff1f\uff1b\uff1a,.!?;:]/.test(safeContent.charAt(i)) ? 22 : 8);
            }
        }

        body.classList.remove('is-typing');
        body.innerHTML = renderAssistantMarkdown(safeContent);
        message = Object.assign({
            id: 'assistant-msg-' + (++assistantState.messageSeq),
            role: 'assistant',
            content: safeContent,
            finishedAt: new Date().toISOString(),
            liked: false,
            feedbackSubmitted: false,
            dislikeOpen: false,
            dislikeDraft: '',
            copied: false
        }, messageMeta || {});
        assistantState.chatMessages.push(message);
        renderChat();
        return message.id;
    }

    function buildAssistantReply(question) {
        var detail = assistantState.detail || {};
        var text = String(question || '').trim();
        if (!text) {
            return '\u53ef\u4ee5\u7ee7\u7eed\u95ee\u6211\u6848\u4ef6\u98ce\u9669\u3001\u63a8\u8350\u90e8\u95e8\u3001\u63a8\u8fdb\u5efa\u8bae\u6216\u6848\u4ef6\u52a8\u6001\u3002';
        }
        if (text.indexOf('\u98ce\u9669') >= 0) {
            return '\u5f53\u524d\u98ce\u9669\u7b49\u7ea7\u4e3a\u201c' + textValue(detail.riskLevel) + '\u201d\u3002\u5efa\u8bae\u7ed3\u5408\u5ba2\u6237\u60c5\u7eea\u201c' + parseEmotionLabel(detail) + '\u201d\u6301\u7eed\u8ddf\u8fdb\uff0c\u5e76\u4f18\u5148\u6838\u67e5\u8fd1\u671f\u52a8\u6001\u8ffd\u8e2a\u4e2d\u7684\u5904\u7406\u4e2d\u8282\u70b9\u3002';
        }
        if (text.indexOf('\u90e8\u95e8') >= 0 || text.indexOf('\u63a8\u8350') >= 0) {
            return '\u5f53\u524d\u63a8\u8350\u90e8\u95e8\u4e3a\u201c' + textValue(detail.recommendedDepartment) + '\u201d\u3002\u63a8\u8350\u7406\u7531\u53ef\u7ed3\u5408\u6848\u4ef6\u7c7b\u578b\u201c' + textValue(detail.disputeType) + ' / ' + textValue(detail.disputeSubType) + '\u201d\u4e00\u8d77\u67e5\u770b\u3002';
        }
        if (text.indexOf('\u5206\u7c7b') >= 0 || text.indexOf('\u5b50\u7c7b') >= 0) {
            return '\u6848\u4ef6\u5206\u7c7b\u4e3a\u201c' + textValue(detail.disputeType) + '\u201d\uff0c\u5b50\u7c7b\u4e3a\u201c' + textValue(detail.disputeSubType) + '\u201d\u3002\u5982\u9700\u8fdb\u4e00\u6b65\u7814\u5224\uff0c\u53ef\u4ee5\u70b9\u51fb\u53f3\u4fa7\u201c\u6848\u4ef6\u7814\u5224\u201d\u3002';
        }
        if (text.indexOf('\u8be6\u60c5') >= 0 || text.indexOf('\u7ecf\u8fc7') >= 0) {
            return textValue(detail.caseText || detail.factsSummary || detail.archiveSummary, TEXT.noText);
        }
        return '\u5df2\u6536\u5230\u4f60\u7684\u95ee\u9898\uff1a\u201c' + text + '\u201d\u3002\u7ed3\u5408\u5f53\u524d\u6848\u4ef6\u72b6\u6001\u201c' + textValue(detail.mediationStatus || detail.handlingProgress, TEXT.processing) + '\u201d\uff0c\u5efa\u8bae\u4f18\u5148\u67e5\u770b\u53f3\u4fa7\u201c\u6848\u4ef6\u52a8\u6001\u8ffd\u8e2a\u201d\u5e76\u786e\u8ba4\u4e0b\u4e00\u6b65\u63a8\u8fdb\u8282\u70b9\u3002';
    }

    function renderChat() {
        var root = document.getElementById('assistantChatList');
        if (!root) {
            return;
        }
        root.innerHTML = assistantState.chatMessages.map(function (message) {
            var isWaiting = !!(message && message.loading);
            var bodyHtml = isWaiting
                ? renderAssistantWaitingMessage()
                : (message.role === 'assistant'
                    ? renderAssistantMarkdown(message.content)
                    : renderUserMessage(message.content));
            var toolbarHtml = message.role === 'assistant' ? renderAssistantMessageToolbar(message) : '';
            var contentClass = 'assistant-msg-content' + (isWaiting ? ' is-waiting' : '');
            return '<article class="assistant-msg ' + message.role + '" data-message-id="' + escapeHtml(message.id) + '"><div class="' + contentClass + '">' + bodyHtml + '</div>' + toolbarHtml + '</article>';
        }).join('');
        scrollAssistantChatToBottom();
    }
    function renderQuickActions() {
        var root = document.getElementById('assistantQuickActions');
        if (!root) {
            return;
        }
        var statusText = textValue(assistantState.detail && assistantState.detail.mediationStatus, '');
        if (!statusText || statusText === '-') {
            root.innerHTML = '';
            root.style.display = 'none';
            return;
        }
        root.style.display = 'flex';
        root.innerHTML = '<button type="button" class="assistant-status-chip" disabled>' + escapeHtml(statusText) + '</button>';
    }

    function renderPromptActions() {
        var root = document.getElementById('assistantPromptActions');
        if (!root) {
            return;
        }
        root.innerHTML = '<div class="assistant-prompt-actions-head">' + escapeHtml(TEXT.quickActionsTitle) + '</div>'
            + QUICK_PROMPTS.map(function (item) {
                return ''
                    + '<button type="button" class="assistant-prompt-card is-tone-' + escapeHtml(item.tone || 'default') + '" data-assistant-prompt="' + escapeHtml(item.prompt) + '">'
                    + '<span class="assistant-prompt-card-icon" aria-hidden="true">' + renderPromptCardIcon(item.icon) + '</span>'
                    + '<span class="assistant-prompt-card-body">'
                    + '<span class="assistant-prompt-card-title">' + escapeHtml(item.label) + '</span>'
                    + '<span class="assistant-prompt-card-desc">' + escapeHtml(item.description || '') + '</span>'
                    + '</span>'
                    + '<span class="assistant-prompt-card-arrow" aria-hidden="true">' + renderPromptCardArrow() + '</span>'
                    + '</button>';
            }).join('');
        syncComposerControls();
    }

    function openModal(title, bodyHtml) {
        var modal = document.getElementById('assistantModal');
        var titleNode = document.getElementById('assistantModalTitle');
        var bodyNode = document.getElementById('assistantModalBody');
        if (!modal || !titleNode || !bodyNode) {
            return;
        }
        titleNode.textContent = title;
        bodyNode.innerHTML = bodyHtml;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        var modal = document.getElementById('assistantModal');
        if (!modal) {
            return;
        }
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    function renderCaseDetailModal() {
        var detail = assistantState.detail || {};
        openModal(TEXT.detailTitle,
            '<div class="assistant-modal-grid">'
            + '<section class="assistant-modal-card"><h4>' + TEXT.baseInfo + '</h4><div class="assistant-modal-text">\u6848\u4ef6ID\uff1a' + escapeHtml(textValue(detail.caseId || detail.id)) + '\n\u6848\u4ef6\u7f16\u53f7\uff1a' + escapeHtml(textValue(detail.caseNo)) + '\n\u4e8b\u4ef6\u6765\u6e90\uff1a' + escapeHtml(textValue(detail.eventSource)) + '\n\u767b\u8bb0\u65f6\u95f4\uff1a' + escapeHtml(textValue(detail.registerTime)) + '</div></section>'
            + '<section class="assistant-modal-card"><h4>' + TEXT.partyInfo + '</h4><div class="assistant-modal-text">\u59d3\u540d\uff1a' + escapeHtml(textValue(detail.partyName)) + '\n\u8054\u7cfb\u65b9\u5f0f\uff1a' + escapeHtml(textValue(detail.partyPhone)) + '\n\u5730\u5740\uff1a' + escapeHtml(textValue(detail.partyAddress)) + '</div></section>'
            + '<section class="assistant-modal-card"><h4>' + TEXT.caseType + '</h4><div class="assistant-modal-text">\u5206\u7c7b\uff1a' + escapeHtml(textValue(detail.disputeType)) + '\n\u5b50\u7c7b\uff1a' + escapeHtml(textValue(detail.disputeSubType)) + '\n\u98ce\u9669\u7b49\u7ea7\uff1a' + escapeHtml(textValue(detail.riskLevel)) + '</div></section>'
            + '<section class="assistant-modal-card"><h4>' + TEXT.caseRaw + '</h4><div class="assistant-modal-text">' + escapeHtml(textValue(detail.caseText)) + '</div></section>'
            + '</div>'
        );
    }

    function renderCaseAnalysisModal() {
        var detail = assistantState.detail || {};
        openModal(TEXT.analysisTitle,
            '<section class="assistant-modal-card"><h4>' + TEXT.emotion + '</h4><div class="assistant-modal-text">' + escapeHtml(parseEmotionLabel(detail)) + '</div></section>'
            + '<section class="assistant-modal-card"><h4>' + TEXT.factSummary + '</h4><div class="assistant-modal-text">' + escapeHtml(textValue(detail.factsSummary || detail.archiveSummary || detail.caseText)) + '</div></section>'
            + '<section class="assistant-modal-card"><h4>' + TEXT.judgement + '</h4><div class="assistant-modal-text">' + escapeHtml(textValue(detail.judgementBasisText || detail.judgementBasis)) + '</div></section>'
            + '<section class="assistant-modal-card"><h4>' + TEXT.mediationAdvice + '</h4><div class="assistant-modal-text">' + escapeHtml(textValue(detail.mediationAdvice || detail.recommendReason || detail.backupSuggestion)) + '</div></section>'
        );
    }

    function renderTraceDetailModal(eventId) {
        var event = assistantState.trackingEvents.filter(function (item) { return item.id === eventId; })[0];
        if (!event) {
            return;
        }
        openModal(TEXT.traceDetailTitle,
            '<section class="assistant-modal-card"><h4>' + escapeHtml(event.name) + '</h4><div class="assistant-modal-text">\u4e8b\u4ef6\u53d1\u751f\u65f6\u95f4\uff1a' + escapeHtml(textValue(event.time)) + '\n\u4e8b\u4ef6\u72b6\u6001\uff1a' + escapeHtml(event.status) + '\n\n' + escapeHtml(textValue(event.summary)) + '</div></section>'
        );
    }

    async function sendChatQuestion(questionText) {
        var input = document.getElementById('assistantChatInput');
        var question = plainText(questionText || (input && input.value));
        var waitingMessageId = '';
        if (!question || assistantState.isSending) {
            return;
        }
        assistantState.chatMessages.push({
            id: 'assistant-msg-' + (++assistantState.messageSeq),
            role: 'user',
            content: question
        });
        renderChat();
        if (input) {
            input.value = '';
        }
        setPromptActionsOpen(false);

        waitingMessageId = pushAssistantWaitingMessage();
        updateAssistantSendingState(true);
        try {
            var confirmed = isConfirmText(question);
            var pushData = await requestDepartmentPush(assistantState.detail || {}, question);
            var progressActions = normalizeAssistantProgressActions(pushData && pushData.progressActions);
            var responseBriefing = plainText(pushData && (pushData.progressDescription || pushData.briefing));
            if (pushData && typeof pushData === 'object') {
                assistantState.detail = Object.assign({}, assistantState.detail || {}, pushData || {});
            }
            assistantState.detail.recommendReason = resolveAssistantRecommendReason(assistantState.detail || {});
            assistantState.detail.briefing = resolveAssistantBriefing(assistantState.detail || {});
            await loadTrackingEvents(true);
            renderPage(assistantState.detail || {}, { preserveChat: true });
            if (assistantState.sideTab === 'files') {
                await loadFileItems(true);
            }

            var pushedMessage = !confirmed && responseBriefing
                ? responseBriefing
                : (resolveAssistantBriefing(assistantState.detail || {})
                    || resolveAssistantRecommendReason(assistantState.detail || {})
                    || resolveAssistantInitialMessage(assistantState.detail || {}));

            if (!pushedMessage) {
                throw new Error('assistant response empty');
            }

            if (waitingMessageId && removeChatMessage(waitingMessageId)) {
                renderChat();
            }
            await typeAssistantMessage(pushedMessage, {
                mode: resolveAssistantTypingMode(assistantState.detail || {}),
                messageMeta: progressActions.length ? { progressActions: progressActions } : null
            });
        } catch (error) {
            if (waitingMessageId && removeChatMessage(waitingMessageId)) {
                renderChat();
            }
            assistantState.chatMessages.push({
                id: 'assistant-msg-' + (++assistantState.messageSeq),
                role: 'assistant',
                content: TEXT.pushFail,
                finishedAt: new Date().toISOString(),
                liked: false,
                feedbackSubmitted: false,
                dislikeOpen: false,
                dislikeDraft: '',
                copied: false
            });
            renderChat();
        } finally {
            updateAssistantSendingState(false);
            if (input) {
                input.focus();
            }
        }
    }
    function renderPage(detail, options) {
        var title = document.getElementById('assistantPageTitle');
        if (title) {
            title.textContent = TEXT.pageTitle + ' | ' + textValue(detail.caseNo || detail.caseId, '\u672a\u547d\u540d\u6848\u4ef6');
        }
        renderProcessBar(detail);
        renderInfoSummary(detail);
        if (!(options && options.preserveChat)) {
            seedChat();
        }
        renderSideModules(detail);
        renderChat();
        renderQuickActions();
        renderPromptActions();
    }

    async function loadAssistantDetail() {
        var params = new URLSearchParams(window.location.search);
        var assistantPrefill = null;
        assistantState.caseId = String(params.get('caseId') || '').trim();
        assistantState.trackingLoaded = false;
        assistantState.fileItems = [];
        assistantState.filesLoaded = false;
        assistantState.filesLoading = false;
        assistantState.fileLoadError = '';
        if (!assistantState.caseId) {
            assistantState.trackingEvents = [];
            assistantState.trackingLoaded = true;
            assistantState.fileItems = [];
            assistantState.filesLoaded = true;
            renderPage({ caseId: '-', caseNo: '-', caseText: TEXT.noCase });
            return;
        }
        assistantPrefill = getAssistantPrefill(assistantState.caseId);
        showAssistantInitLoading(TEXT.initLoading);
        try {
            var response = await fetch(API_BASE + '/cases/assistant-detail?caseId=' + encodeURIComponent(assistantState.caseId));
            var json = await response.json();
            assistantState.detail = applyAssistantPrefill(json && json.data ? json.data : { caseId: assistantState.caseId }, assistantPrefill);
            try {
                var workflowData = await requestRecommendedDepartment(assistantState.detail || {});
                if (workflowData && typeof workflowData === 'object') {
                    assistantState.detail = applyAssistantPrefill(Object.assign({}, assistantState.detail || {}, workflowData || {}), assistantPrefill);
                }
            } catch (workflowError) {
                console.warn('request recommended department failed', workflowError);
            }
        } catch (error) {
            console.warn('load assistant detail failed', error);
            assistantState.detail = applyAssistantPrefill({ caseId: assistantState.caseId, caseNo: assistantState.caseId, caseText: TEXT.loadFail, factsSummary: TEXT.loadFail }, assistantPrefill);
        } finally {
            hideAssistantInitLoading();
        }
        assistantState.detail = assistantState.detail || {};
        assistantState.detail.recommendReason = resolveAssistantRecommendReason(assistantState.detail);
        assistantState.detail.briefing = resolveAssistantBriefing(assistantState.detail);
        await loadTrackingEvents(true);
        renderPage(assistantState.detail);
        var initialMessage = resolveAssistantInitialMessage(assistantState.detail);
        if (initialMessage) {
            await typeAssistantMessage(initialMessage, {
                mode: resolveAssistantTypingMode(assistantState.detail),
                attachDepartmentActions: shouldShowAssistantDepartmentActions(assistantState.detail || {}),
                departmentActionDetail: assistantState.detail || {}
            });
        }
    }

    function bindEvents() {
        var sendBtn = document.getElementById('assistantChatSendBtn');
        var input = document.getElementById('assistantChatInput');
        var modal = document.getElementById('assistantModal');
        var modalClose = document.getElementById('assistantModalCloseBtn');
        var traceRoot = document.getElementById('assistantTraceList');
        var sideRoot = document.getElementById('assistantSideModules');
        var chatRoot = document.getElementById('assistantChatList');
        var promptRoot = document.getElementById('assistantPromptActions');
        var promptToggleBtn = document.getElementById('assistantPromptToggleBtn');
        var traceShortcutBtn = document.getElementById('assistantTraceShortcutBtn');

        if (sendBtn) {
            sendBtn.onclick = function () { sendChatQuestion(); };
        }
        if (traceShortcutBtn) {
            traceShortcutBtn.addEventListener('click', function () {
                openAssistantTraceShortcut();
            });
        }
        if (promptToggleBtn) {
            promptToggleBtn.addEventListener('click', function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (assistantState.isSending) {
                    return;
                }
                setPromptActionsOpen(!assistantState.quickActionsOpen);
            });
        }
        if (input) {
            input.addEventListener('input', function () {
                syncComposerControls();
            });
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendChatQuestion();
                }
                if (event.key === 'Escape' && assistantState.quickActionsOpen) {
                    setPromptActionsOpen(false);
                }
            });
        }
        if (promptRoot) {
            promptRoot.addEventListener('click', function (event) {
                var target = event.target.closest('[data-assistant-prompt]');
                if (!target || !input || input.disabled) {
                    return;
                }
                input.value = target.getAttribute('data-assistant-prompt') || '';
                setPromptActionsOpen(false);
                input.focus();
                if (typeof input.setSelectionRange === 'function') {
                    input.setSelectionRange(input.value.length, input.value.length);
                }
            });
        }
        document.addEventListener('click', function (event) {
            if (!assistantState.quickActionsOpen) {
                return;
            }
            var target = event.target;
            if ((promptRoot && promptRoot.contains(target)) || (promptToggleBtn && promptToggleBtn.contains(target))) {
                return;
            }
            setPromptActionsOpen(false);
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && assistantState.quickActionsOpen) {
                setPromptActionsOpen(false);
            }
        });
        if (modalClose) {
            modalClose.onclick = closeModal;
        }
        if (modal) {
            modal.addEventListener('click', function (event) {
                if (event.target === modal || event.target.classList.contains('assistant-modal-backdrop')) {
                    closeModal();
                }
            });
        }
        if (traceRoot) {
            traceRoot.addEventListener('click', function (event) {
                var toggleTarget = event.target.closest('[data-trace-toggle]');
                var detailTarget = event.target.closest('[data-trace-detail]');
                if (toggleTarget) {
                    var toggleId = toggleTarget.getAttribute('data-trace-toggle');
                    assistantState.expandedEventIds[toggleId] = !assistantState.expandedEventIds[toggleId];
                    renderTrackingList();
                }
                if (detailTarget) {
                    renderTraceDetailModal(detailTarget.getAttribute('data-trace-detail'));
                }
            });
        }
        if (sideRoot) {
            sideRoot.addEventListener('click', async function (event) {
                var tabTarget = event.target.closest('[data-side-tab]');
                var audioTarget = event.target.closest('[data-case-audio-toggle]');
                var fileTarget = event.target.closest('[data-file-download]');
                if (tabTarget) {
                    var nextTab = tabTarget.getAttribute('data-side-tab');
                    assistantState.sideTab = nextTab === 'trace' || nextTab === 'files' || nextTab === 'detail' ? nextTab : 'detail';
                    renderSideModules(assistantState.detail || {});
                    if (assistantState.sideTab === 'trace') {
                        await loadTrackingEvents(true);
                    }
                    if (assistantState.sideTab === 'files') {
                        await loadFileItems(true);
                    }
                    return;
                }
                if (audioTarget) {
                    toggleCaseAudioPlay(assistantState.detail || {});
                    return;
                }
                if (fileTarget) {
                    downloadCaseFile(
                        fileTarget.getAttribute('data-file-download'),
                        fileTarget.getAttribute('data-file-endpoint')
                    );
                }
            });
        }
        if (chatRoot) {
            chatRoot.addEventListener('click', async function (event) {
                var actionTarget = event.target.closest('[data-msg-action]');
                var submitTarget = event.target.closest('[data-feedback-submit]');
                var cancelTarget = event.target.closest('[data-feedback-cancel]');
                if (actionTarget) {
                    var messageId = actionTarget.getAttribute('data-message-id');
                    var action = actionTarget.getAttribute('data-msg-action');
                    var message = findChatMessage(messageId);
                    if (!message) {
                        return;
                    }
                    if (action === 'copy') {
                        try {
                            if (await copyTextToClipboard(message.content)) {
                                message.copied = true;
                                renderChat();
                                window.setTimeout(function () {
                                    var targetMessage = findChatMessage(messageId);
                                    if (targetMessage) {
                                        targetMessage.copied = false;
                                        renderChat();
                                    }
                                }, 1200);
                            }
                        } catch (copyError) {
                            console.warn('copy failed', copyError);
                        }
                        return;
                    }
                    if (action === 'like') {
                        message.liked = !message.liked;
                        if (message.liked) {
                            message.feedbackSubmitted = false;
                            message.dislikeOpen = false;
                            message.dislikeDraft = '';
                        }
                        renderChat();
                        return;
                    }
                    if (action === 'dislike') {
                        if (message.dislikeOpen) {
                            message.dislikeOpen = false;
                        } else {
                            message.liked = false;
                            message.dislikeOpen = true;
                        }
                        renderChat();
                        if (message.dislikeOpen) {
                            window.setTimeout(function () {
                                var textarea = document.querySelector('[data-feedback-input="' + messageId + '"]');
                                if (textarea) {
                                    textarea.focus();
                                }
                            }, 0);
                        }
                        return;
                    }
                }
                if (submitTarget) {
                    var submitMessage = findChatMessage(submitTarget.getAttribute('data-feedback-submit'));
                    if (submitMessage) {
                        submitMessage.feedbackSubmitted = true;
                        submitMessage.dislikeOpen = false;
                        renderChat();
                    }
                    return;
                }
                if (cancelTarget) {
                    var cancelMessage = findChatMessage(cancelTarget.getAttribute('data-feedback-cancel'));
                    if (cancelMessage) {
                        cancelMessage.dislikeOpen = false;
                        if (!cancelMessage.feedbackSubmitted) {
                            cancelMessage.dislikeDraft = '';
                        }
                        renderChat();
                    }
                }
            });
            chatRoot.addEventListener('input', function (event) {
                var inputTarget = event.target.closest('[data-feedback-input]');
                if (!inputTarget) {
                    return;
                }
                var message = findChatMessage(inputTarget.getAttribute('data-feedback-input'));
                if (message) {
                    message.dislikeDraft = inputTarget.value;
                }
            });
        }
    }

    /* assistant department push actions */
    TEXT.confirmPushPrefix = '\u786e\u8ba4\u63a8\u9001\u81f3';
    TEXT.switchDepartment = '\u66f4\u6362\u90e8\u95e8';
    TEXT.switchDepartmentAria = '\u66f4\u6362\u63a8\u9001\u90e8\u95e8';
    TEXT.departmentMenuAria = '\u53ef\u9009\u63a8\u9001\u90e8\u95e8';
    TEXT.switchDepartmentLoading = '\u6b63\u5728\u91cd\u65b0\u751f\u6210\u90e8\u95e8\u63a8\u8350...';
    TEXT.switchDepartmentFail = '\u66f4\u6362\u90e8\u95e8\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002';
    TEXT.committeeDepartment = '\u4eba\u6c11\u8c03\u89e3\u59d4\u5458\u4f1a/\u884c\u4e1a\u4e13\u4e1a\u8c03\u89e3\u59d4\u5458\u4f1a';
    TEXT.hrssDepartment = '\u4eba\u793e\u90e8\u95e8';
    TEXT.housingDepartment = '\u4f4f\u5efa\u90e8\u95e8';
    TEXT.policeDepartment = '\u516c\u5b89\u90e8\u95e8';
    TEXT.environmentDepartment = '\u751f\u6001\u73af\u5883\u90e8\u95e8';

    assistantState.departmentMenuOpen = false;
    assistantState.selectedDepartment = plainText(assistantState.selectedDepartment || '');
    assistantState.activeQuickPrompt = plainText(assistantState.activeQuickPrompt || '');
    assistantState.departmentActionClickBound = false;
    assistantState.departmentActionOutsideBound = false;
    assistantState.promptSelectionClickBound = false;
    assistantState.promptSelectionInputBound = false;

    buildRecommendedDepartmentPayload = function (detail, options) {
        var safeOptions = options && typeof options === "object" ? options : {};
        var changeDepartment = plainText(safeOptions.changeDepartment || safeOptions.change_department);
        var payload = {
            caseId: assistantState.caseId ? Number(assistantState.caseId) : null,
            query: '1',
            caseSummary: plainText(detail && (detail.factsSummary || detail.caseSummary || detail.caseSmartSummary || detail.summaryText || detail.caseText)),
            variables: {
                dispute_text: detail && detail.factsSummary ? detail.factsSummary : '',
                category_level_1: detail && detail.disputeType ? detail.disputeType : '',
                category_level_2: detail && detail.disputeSubType ? detail.disputeSubType : '',
                change_department: changeDepartment
            }
        };
        if (changeDepartment) {
            payload.changeDepartment = changeDepartment;
        }
        return payload;
    };

    requestRecommendedDepartment = async function (detail, options) {
        var safeOptions = options && typeof options === "object" ? options : {};
        var changeDepartment = plainText(safeOptions.changeDepartment || safeOptions.change_department);
        var shouldManageLoading = safeOptions.showLoading !== false && !isAssistantInitLoadingVisible();
        var loadingText = safeOptions.loadingText || (changeDepartment ? TEXT.switchDepartmentLoading : TEXT.initLoading);
        var payload = buildRecommendedDepartmentPayload(detail, safeOptions);
        if (!payload.caseId) {
            return null;
        }
        if (shouldManageLoading) {
            showAssistantInitLoading(loadingText);
        }
        try {
            var response = await fetch(API_BASE + '/recommended-department/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            var json = await response.json();
            var successCode = json && (json.code === 0 || json.code === 200 || json.code === '0' || json.code === '200');
            if (!response.ok || !json || !successCode) {
                throw new Error((json && json.message) || 'recommended department request failed');
            }
            return json.data || null;
        } finally {
            if (shouldManageLoading) {
                hideAssistantInitLoading();
            }
        }
    };

    function resolveQuickPromptSelection(value) {
        var text = plainText(value);
        for (var i = 0; i < QUICK_PROMPTS.length; i += 1) {
            if (plainText(QUICK_PROMPTS[i].prompt) === text) {
                return QUICK_PROMPTS[i].prompt;
            }
        }
        return '';
    }

    function syncPromptActionSelection() {
        var root = document.getElementById("assistantPromptActions");
        if (!root) {
            return;
        }
        var cards = root.querySelectorAll("[data-assistant-prompt]");
        for (var i = 0; i < cards.length; i += 1) {
            var promptValue = plainText(cards[i].getAttribute("data-assistant-prompt"));
            cards[i].classList.toggle("is-selected", !!assistantState.activeQuickPrompt && promptValue === assistantState.activeQuickPrompt);
        }
    }

    function setAssistantActiveQuickPrompt(promptValue) {
        assistantState.activeQuickPrompt = resolveQuickPromptSelection(promptValue);
        syncPromptActionSelection();
    }

    function renderDepartmentActionIcon(type) {
        if (type === "confirm") {
            return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"4.5\" y=\"4.5\" width=\"15\" height=\"15\" rx=\"3.2\"></rect><path d=\"m8.4 12.3 2.35 2.35 4.95-5.25\"></path></svg>";
        }
        if (type === "switch") {
            return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.9\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M8 7h9.5\"></path><path d=\"m14.5 4 3-4-3-4\" transform=\"translate(0 8)\"></path><path d=\"M16 17H6.5\"></path><path d=\"m9.5 4-3 4 3 4\" transform=\"translate(0 8)\"></path></svg>";
        }
        if (type === "caretUp") {
            return "<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m4 12 6-6 6 6\"></path></svg>";
        }
        if (type === "caretDown") {
            return "<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m4 8 6 6 6-6\"></path></svg>";
        }
        if (type === "optionArrow") {
            return "<svg viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m7 4 6 6-6 6\"></path></svg>";
        }
        if (type === "committee") {
            return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"8\" cy=\"9\" r=\"2.3\"></circle><circle cx=\"16\" cy=\"9\" r=\"2.3\"></circle><path d=\"M4.5 18a3.8 3.8 0 0 1 7 0\"></path><path d=\"M12.5 18a3.8 3.8 0 0 1 7 0\"></path></svg>";
        }
        if (type === "hrss") {
            return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"5\" y=\"7\" width=\"14\" height=\"11\" rx=\"2.4\"></rect><path d=\"M9 7V5.5h6V7\"></path><path d=\"M5 11.5h14\"></path></svg>";
        }
        if (type === "housing") {
            return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4.75 19.25h14.5\"></path><path d=\"M7.5 19.25V9.5l4.5-3.5v13.25\"></path><path d=\"M12 8.25h4.5v11\"></path><path d=\"M8.9 12h1.2\"></path><path d=\"M13.9 12h1.2\"></path><path d=\"M13.9 15h1.2\"></path></svg>";
        }
        if (type === "police") {
            return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M7 14.5 8.75 10h6.5L17 14.5\"></path><path d=\"M5 14.5h14v2.25A1.75 1.75 0 0 1 17.25 18.5H6.75A1.75 1.75 0 0 1 5 16.75Z\"></path><circle cx=\"8.2\" cy=\"17.25\" r=\"1\"></circle><circle cx=\"15.8\" cy=\"17.25\" r=\"1\"></circle><path d=\"M9.5 10V8.75h5V10\"></path></svg>";
        }
        if (type === "environment") {
            return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 19.5c0-5.2 2.4-9.45 6.5-12.5 0 6.25-2.25 10.55-6.5 12.5Z\"></path><path d=\"M12 19.5C7.75 17.55 5.5 13.25 5.5 7c4.1 3.05 6.5 7.3 6.5 12.5Z\"></path><path d=\"M12 19.5V8.5\"></path></svg>";
        }
        return "<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"5\" y=\"5\" width=\"14\" height=\"14\" rx=\"3\"></rect><path d=\"M9 12h6\"></path><path d=\"M12 9v6\"></path></svg>";
    }

    function resolveAssistantDepartmentKey(name) {
        var text = plainText(name);
        if (!text) { return 'generic'; }
        if (text.indexOf('\u8c03\u89e3\u59d4\u5458\u4f1a') >= 0) { return 'committee'; }
        if (text.indexOf('\u4eba\u793e') >= 0) { return 'hrss'; }
        if (text.indexOf('\u4f4f\u5efa') >= 0) { return 'housing'; }
        if (text.indexOf('\u516c\u5b89') >= 0) { return 'police'; }
        if (text.indexOf('\u751f\u6001\u73af\u5883') >= 0) { return 'environment'; }
        return 'generic';
    }

    function syncAssistantSelectedDepartment(detail) {
        var nextDepartment = plainText(detail && (detail.recommendedDepartment || detail.recommended_department));
        assistantState.selectedDepartment = nextDepartment;
        if (!nextDepartment) {
            assistantState.departmentMenuOpen = false;
        }
    }

    function resolveAssistantSelectedDepartment(detail) {
        return plainText(assistantState.selectedDepartment || (detail && (detail.recommendedDepartment || detail.recommended_department)) || '');
    }

    function resolveAssistantDepartmentOptions(detail) {
        var currentDepartment = resolveAssistantSelectedDepartment(detail);
        var fixedDepartments = [
            TEXT.committeeDepartment,
            TEXT.hrssDepartment,
            TEXT.housingDepartment,
            TEXT.policeDepartment,
            TEXT.environmentDepartment
        ];
        var names = [];
        var seen = {};
        function appendDepartment(name) {
            var safeName = plainText(name);
            if (!safeName || seen[safeName]) {
                return;
            }
            seen[safeName] = true;
            names.push(safeName);
        }
        appendDepartment(currentDepartment);
        for (var i = 0; i < fixedDepartments.length; i += 1) {
            appendDepartment(fixedDepartments[i]);
        }
        return names.map(function (name) {
            return {
                name: name,
                key: resolveAssistantDepartmentKey(name),
                current: name === currentDepartment
            };
        });
    }

    function shouldShowAssistantDepartmentActions(detail) {
        var safeDetail = detail && typeof detail === "object" ? detail : {};
        var department = plainText(safeDetail.recommendedDepartment || safeDetail.recommended_department);
        var status = plainText(safeDetail.mediationStatus || safeDetail.mediation_status);
        var currentStage = resolveCurrentStageName(safeDetail);
        var recommendStage = resolveProcessSteps(safeDetail)[0];
        if (!department) {
            return false;
        }
        if (safeDetail.diversionCompletedAt || safeDetail.diversion_completed_at || safeDetail.pushCompletedAt) {
            return false;
        }
        if (isMediatingStatus(status) || isMediationCompletedStatus(status)) {
            return false;
        }
        return currentStage === recommendStage;
    }

    function buildAssistantDepartmentActionContext(detail) {
        var safeDetail = detail || {};
        var currentDepartment = resolveAssistantSelectedDepartment(safeDetail);
        var options = resolveAssistantDepartmentOptions(safeDetail);
        if (!currentDepartment || !options.length) {
            return null;
        }
        return {
            currentDepartment: currentDepartment,
            options: options.map(function (item) {
                return Object.assign({}, item);
            })
        };
    }

    function clearAssistantDepartmentActions() {
        assistantState.departmentMenuOpen = false;
        assistantState.departmentMenuMessageId = '';
        assistantState.departmentActionMessageId = '';
        for (var i = 0; i < assistantState.chatMessages.length; i += 1) {
            delete assistantState.chatMessages[i].showDepartmentActions;
            delete assistantState.chatMessages[i].departmentActionContext;
        }
    }

    function markLatestAssistantDepartmentActions(messageId, detail) {
        var targetId = plainText(messageId);
        var safeDetail = detail || assistantState.detail || {};
        var context = null;
        if (!shouldShowAssistantDepartmentActions(safeDetail)) {
            return;
        }
        context = buildAssistantDepartmentActionContext(safeDetail);
        if (!context) {
            return;
        }
        if (!targetId) {
            for (var i = assistantState.chatMessages.length - 1; i >= 0; i -= 1) {
                if (assistantState.chatMessages[i] && assistantState.chatMessages[i].role === 'assistant' && assistantState.chatMessages[i].finishedAt) {
                    targetId = assistantState.chatMessages[i].id;
                    break;
                }
            }
        }
        if (!targetId) {
            return;
        }
        clearAssistantDepartmentActions();
        for (var j = assistantState.chatMessages.length - 1; j >= 0; j -= 1) {
            if (assistantState.chatMessages[j] && assistantState.chatMessages[j].id === targetId) {
                assistantState.chatMessages[j].showDepartmentActions = true;
                assistantState.chatMessages[j].departmentActionContext = context;
                assistantState.departmentActionMessageId = targetId;
                break;
            }
        }
    }

    function setAssistantSelectedDepartment(name) {
        var nextDepartment = plainText(name);
        if (!nextDepartment) {
            return;
        }
        assistantState.selectedDepartment = nextDepartment;
        assistantState.detail = Object.assign({}, assistantState.detail || {}, {
            recommendedDepartment: nextDepartment,
            recommended_department: nextDepartment
        });
    }

    async function switchAssistantRecommendedDepartment(name) {
        var nextDepartment = plainText(name);
        var nextMessage = "";
        var loadingHidden = false;
        if (!nextDepartment) {
            return;
        }
        assistantState.departmentMenuOpen = false;
        assistantState.departmentMenuMessageId = '';
        setAssistantSelectedDepartment(nextDepartment);
        renderChat();
        showAssistantInitLoading(TEXT.switchDepartmentLoading);
        try {
            var requestDetail = Object.assign({}, assistantState.detail || {}, {
                recommendedDepartment: nextDepartment,
                recommended_department: nextDepartment
            });
            var workflowData = await requestRecommendedDepartment(requestDetail, { changeDepartment: nextDepartment });
            assistantState.detail = Object.assign({}, assistantState.detail || {}, workflowData || {});
            if (!plainText(assistantState.detail && (assistantState.detail.recommendedDepartment || assistantState.detail.recommended_department))) {
                assistantState.detail.recommendedDepartment = nextDepartment;
            }
            assistantState.detail.recommendedDepartment = plainText(assistantState.detail.recommendedDepartment || assistantState.detail.recommended_department || nextDepartment);
            assistantState.detail.recommended_department = assistantState.detail.recommendedDepartment;
            assistantState.detail.recommendReason = resolveAssistantRecommendReason(assistantState.detail || {});
            assistantState.detail.briefing = resolveAssistantBriefing(assistantState.detail || {});
            renderPage(assistantState.detail || {}, { preserveChat: true });
            nextMessage = resolveAssistantInitialMessage(assistantState.detail || {});
            hideAssistantInitLoading();
            loadingHidden = true;
            if (nextMessage) {
                await typeAssistantMessage(nextMessage, {
                    mode: resolveAssistantTypingMode(assistantState.detail || {}),
                    attachDepartmentActions: shouldShowAssistantDepartmentActions(assistantState.detail || {}),
                    departmentActionDetail: assistantState.detail || {}
                });
            }
        } catch (error) {
            console.warn("switch recommended department failed", error);
            assistantState.chatMessages.push({
                id: "assistant-msg-" + (++assistantState.messageSeq),
                role: "assistant",
                content: TEXT.switchDepartmentFail,
                finishedAt: new Date().toISOString(),
                liked: false,
                feedbackSubmitted: false,
                dislikeOpen: false,
                dislikeDraft: "",
                copied: false
            });
            renderChat();
        } finally {
            if (!loadingHidden) {
                hideAssistantInitLoading();
            }
        }
    }

    function renderAssistantDepartmentActions(message) {
        var actionContext = null;
        var currentDepartment = '';
        var options = [];
        var isMenuOpen = false;
        if (!message || !message.showDepartmentActions) {
            return '';
        }
        actionContext = message.departmentActionContext || null;
        currentDepartment = plainText(actionContext && actionContext.currentDepartment);
        options = actionContext && actionContext.options ? actionContext.options : [];
        if (!currentDepartment || !options.length) {
            return '';
        }
        isMenuOpen = assistantState.departmentMenuOpen && assistantState.departmentMenuMessageId === message.id;
        return ''
            + '<div class="assistant-msg-dept-actions">'
            + '<div class="assistant-msg-dept-actions-inner">'
            + '<button type="button" class="assistant-msg-dept-btn assistant-msg-dept-btn-confirm" data-dept-confirm="1">'
            + '<span class="assistant-msg-dept-btn-icon" aria-hidden="true">' + renderDepartmentActionIcon('confirm') + '</span>'
            + '<span class="assistant-msg-dept-btn-label">' + escapeHtml(TEXT.confirmPushPrefix + currentDepartment) + '</span>'
            + '</button>'
            + '<div class="assistant-msg-dept-switch">'
            + '<button type="button" class="assistant-msg-dept-btn assistant-msg-dept-btn-switch' + (isMenuOpen ? ' is-open' : '') + '" data-dept-toggle="1" aria-expanded="' + (isMenuOpen ? 'true' : 'false') + '" aria-label="' + escapeHtml(TEXT.switchDepartmentAria) + '">'
            + '<span class="assistant-msg-dept-btn-icon" aria-hidden="true">' + renderDepartmentActionIcon('switch') + '</span>'
            + '<span class="assistant-msg-dept-btn-label">' + escapeHtml(TEXT.switchDepartment) + '</span>'
            + '<span class="assistant-msg-dept-btn-caret" aria-hidden="true">' + renderDepartmentActionIcon(isMenuOpen ? 'caretUp' : 'caretDown') + '</span>'
            + '</button>'
            + (isMenuOpen
                ? '<div class="assistant-msg-dept-menu" role="menu" aria-label="' + escapeHtml(TEXT.departmentMenuAria) + '">' + options.map(function (item) {
                    return ''
                        + '<button type="button" class="assistant-msg-dept-option assistant-msg-dept-option-' + escapeHtml(item.key) + (item.current ? ' is-current' : '') + '" data-dept-option="' + escapeHtml(item.name) + '">'
                        + '<span class="assistant-msg-dept-option-icon is-' + escapeHtml(item.key) + '" aria-hidden="true">' + renderDepartmentActionIcon(item.key) + '</span>'
                        + '<span class="assistant-msg-dept-option-label">' + escapeHtml(item.name) + '</span>'
                        + '<span class="assistant-msg-dept-option-arrow" aria-hidden="true">' + renderDepartmentActionIcon('optionArrow') + '</span>'
                        + '</button>';
                }).join('') + '</div>'
                : '')
            + '</div>'
            + '</div>'
            + '</div>';
    }

    function renderAssistantProgressActions(message) {
        var actions = normalizeAssistantProgressActions(message && message.progressActions);
        if (!actions.length) {
            return '';
        }
        return ''
            + '<div class="assistant-msg-progress-actions" role="group" aria-label="progress actions">'
            + actions.map(function (item) {
                return ''
                    + '<button type="button" class="assistant-msg-progress-btn" data-progress-action="' + escapeHtml(item.query) + '">'
                    + escapeHtml(item.label)
                    + '</button>';
            }).join('')
            + '</div>';
    }

    var baseRenderPromptActions = renderPromptActions;
    renderPromptActions = function () {
        baseRenderPromptActions();
        syncPromptActionSelection();
    };

    var baseRenderPage = renderPage;
    renderPage = function (detail, options) {
        syncAssistantSelectedDepartment(detail);
        return baseRenderPage(detail, options);
    };

    var baseTypeAssistantMessage = typeAssistantMessage;
    typeAssistantMessage = async function (content, options) {
        var messageId = await baseTypeAssistantMessage(content, options);
        if (messageId && options && options.attachDepartmentActions) {
            markLatestAssistantDepartmentActions(messageId, options.departmentActionDetail || assistantState.detail || {});
            renderChat();
        }
        return messageId;
    };

    var baseSendChatQuestion = sendChatQuestion;
    sendChatQuestion = async function (questionText) {
        assistantState.activeQuickPrompt = '';
        syncPromptActionSelection();
        return baseSendChatQuestion(questionText);
    };

    var baseRenderAssistantMessageToolbar = renderAssistantMessageToolbar;
    renderAssistantMessageToolbar = function (message) {
        var toolbarHtml = baseRenderAssistantMessageToolbar(message);
        if (!message || message.role !== 'assistant' || !message.finishedAt) {
            return toolbarHtml;
        }
        return renderAssistantProgressActions(message) + renderAssistantDepartmentActions(message) + toolbarHtml;
    };

    var baseBindEvents = bindEvents;
    bindEvents = function () {
        baseBindEvents();
        var chatRoot = document.getElementById('assistantChatList');
        var promptRoot = document.getElementById('assistantPromptActions');
        var input = document.getElementById('assistantChatInput');
        if (chatRoot && !assistantState.departmentActionClickBound) {
            chatRoot.addEventListener('click', async function (event) {
                var target = event.target;
                var messageTarget = target && target.closest ? target.closest('[data-message-id]') : null;
                var messageId = plainText(messageTarget && messageTarget.getAttribute ? messageTarget.getAttribute('data-message-id') : '');
                var progressActionTarget = target && target.closest ? target.closest('[data-progress-action]') : null;
                var confirmTarget = target && target.closest ? target.closest('[data-dept-confirm]') : null;
                var toggleTarget = target && target.closest ? target.closest('[data-dept-toggle]') : null;
                var optionTarget = target && target.closest ? target.closest('[data-dept-option]') : null;
                if (progressActionTarget) {
                    event.preventDefault();
                    event.stopPropagation();
                    await sendChatQuestion(progressActionTarget.getAttribute('data-progress-action'));
                    return;
                }
                if (confirmTarget) {
                    event.preventDefault();
                    event.stopPropagation();
                    assistantState.departmentMenuOpen = false;
                    assistantState.departmentMenuMessageId = '';
                    setAssistantSelectedDepartment(resolveAssistantSelectedDepartment(assistantState.detail || {}));
                    await sendChatQuestion('\u786e\u8ba4');
                    return;
                }
                if (toggleTarget) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (assistantState.departmentMenuOpen && assistantState.departmentMenuMessageId === messageId) {
                        assistantState.departmentMenuOpen = false;
                        assistantState.departmentMenuMessageId = '';
                    } else {
                        assistantState.departmentMenuOpen = true;
                        assistantState.departmentMenuMessageId = messageId;
                    }
                    renderChat();
                    return;
                }
                if (optionTarget) {
                    event.preventDefault();
                    event.stopPropagation();
                    await switchAssistantRecommendedDepartment(optionTarget.getAttribute('data-dept-option'));
                }
            });
            assistantState.departmentActionClickBound = true;
        }
        if (promptRoot && !assistantState.promptSelectionClickBound) {
            promptRoot.addEventListener('click', function (event) {
                var promptTarget = event.target && event.target.closest ? event.target.closest('[data-assistant-prompt]') : null;
                if (!promptTarget) {
                    return;
                }
                setAssistantActiveQuickPrompt(promptTarget.getAttribute('data-assistant-prompt'));
            });
            assistantState.promptSelectionClickBound = true;
        }
        if (input && !assistantState.promptSelectionInputBound) {
            input.addEventListener('input', function () {
                setAssistantActiveQuickPrompt(input.value);
            });
            assistantState.promptSelectionInputBound = true;
            setAssistantActiveQuickPrompt(input.value);
        }
        if (!assistantState.departmentActionOutsideBound) {
            document.addEventListener('click', function (event) {
                var target = event.target;
                if (!assistantState.departmentMenuOpen) {
                    return;
                }
                if (target && target.closest && target.closest('.assistant-msg-dept-switch')) {
                    return;
                }
                assistantState.departmentMenuOpen = false;
                assistantState.departmentMenuMessageId = '';
                renderChat();
            });
            document.addEventListener('keydown', function (event) {
                if (event.key === 'Escape' && assistantState.departmentMenuOpen) {
                    assistantState.departmentMenuOpen = false;
                    assistantState.departmentMenuMessageId = '';
                    renderChat();
                }
            });
            assistantState.departmentActionOutsideBound = true;
        }
    };

    applyStaticText();
    bindEvents();
    loadAssistantDetail();
})();











