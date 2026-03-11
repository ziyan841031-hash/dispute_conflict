(function () {
    var TEXT = {
        eyebrow: '\u6848\u4ef6\u52a9\u624b',
        back: '\u8fd4\u56de\u6848\u4ef6\u5217\u8868',
        pageTitle: '\u6848\u4ef6\u534f\u540c\u63a8\u8fdb',
        chatTitle: '\u667a\u80fd\u5bf9\u8bdd',
        chatDesc: '\u56f4\u7ed5\u6848\u4ef6\u8981\u70b9\u3001\u90e8\u95e8\u63a8\u8fdb\u548c\u98ce\u9669\u8fdb\u884c\u8f85\u52a9\u4ea4\u6d41',
        infoTitle: '\u6848\u4ef6\u4fe1\u606f',
        infoDesc: '\u6848\u4ef6\u57fa\u7840\u4fe1\u606f\u3001\u6848\u4ef6\u8be6\u60c5\u3001\u6848\u4ef6\u8ffd\u8e2a\u4e0e\u6587\u4ef6\u7ba1\u7406',
        send: '\u53d1\u9001',
        sending: '\u53d1\u9001\u4e2d...',
        inputPlaceholder: '\u8bf7\u8f93\u5165\u4f60\u60f3\u4e86\u89e3\u7684\u95ee\u9898\uff0c\u4f8b\u5982\uff1a\u5f53\u524d\u98ce\u9669\u70b9\u6709\u54ea\u4e9b\uff1f',
        detailBtn: '\u6848\u4ef6\u8be6\u60c5',
        analysisBtn: '\u6848\u4ef6\u7814\u5224',
        traceTitle: '\u6848\u4ef6\u8ffd\u8e2a',
        filesTitle: '\u6587\u4ef6\u7ba1\u7406',
        modalClose: '\u5173\u95ed',
        noCase: '\u7f3a\u5c11\u6848\u4ef6ID\uff0c\u65e0\u6cd5\u52a0\u8f7d\u8be6\u60c5\u3002',
        loadFail: '\u6848\u4ef6\u8be6\u60c5\u52a0\u8f7d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
        noSummary: '\u6682\u65e0\u6848\u4ef6\u6458\u8981',
        noText: '\u6682\u65e0\u53ef\u5c55\u793a\u8be6\u60c5',
        noEmotion: '\u5f85\u8865\u5145',
        processing: '\u5904\u7406\u4e2d',
        success: '\u6210\u529f',
        failed: '\u5931\u8d25',
        caseOverview: '\u6848\u4ef6\u6982\u8ff0',
        riskHint: '\u98ce\u9669\u63d0\u793a',
        deptReason: '\u63a8\u8350\u90e8\u95e8\u4f9d\u636e',
        nextStep: '\u4e0b\u4e00\u6b65\u52a8\u4f5c',
        expand: '\u5168\u90e8',
        collapse: '\u6536\u8d77',
        traceDetail: '\u8be6\u60c5',
        currentQuestion: '\u5f53\u524d\u95ee\u9898',
        assistantMeta: '\u667a\u80fd\u52a9\u624b',
        summaryMeta: '\u6848\u4ef6\u6458\u8981',
        detailTitle: '\u6848\u4ef6\u8be6\u60c5',
        analysisTitle: '\u6848\u4ef6\u7814\u5224',
        traceDetailTitle: '\u52a8\u6001\u8be6\u60c5',
        baseInfo: '\u57fa\u7840\u4fe1\u606f',
        partyInfo: '\u5f53\u4e8b\u4eba\u4fe1\u606f',
        caseType: '\u6848\u4ef6\u5206\u7c7b',
        caseRaw: '\u6848\u4ef6\u539f\u6587',
        emotion: '\u5ba2\u6237\u60c5\u611f\u5206\u6790',
        factSummary: '\u4e8b\u5b9e\u6458\u8981',
        judgement: '\u88c1\u91cf\u4f9d\u636e',
        mediationAdvice: '\u8c03\u89e3\u5efa\u8bae',
        sidebarTitle: '\u77db\u76fe\u7ea0\u7eb7\u9884\u9632\u548c\u5316\u89e3\n\u667a\u80fd\u4f53\u5e94\u7528\u7cfb\u7edf',
        navHome: '\u9996\u9875',
        navTools: '\u667a\u80fd\u4f53\u96c6',
        navConsult: '\u54a8\u8be2\u670d\u52a1',
        navCases: '\u6848\u4ef6\u7ba1\u7406',
        navStats: '\u6848\u4ef6\u7edf\u8ba1',
        navInsight: '\u6d1e\u5bdf\u7edf\u8ba1',
        caseMaterialTitle: '\u6848\u4ef6\u8be6\u60c5',
        initLoading: '\u6b63\u5728\u751f\u6210\u90e8\u95e8\u63a8\u8350...',
        feedbackTitle: '\u8bf7\u8f93\u5165\u672c\u6b21\u53cd\u9988\u5185\u5bb9',
        feedbackPlaceholder: '\u4f8b\u5982\uff1a\u8fd9\u6761\u56de\u590d\u8fd8\u9700\u8981\u8865\u5145\u54ea\u4e9b\u4fe1\u606f\uff1f',
        feedbackSubmit: '\u63d0\u4ea4',
        feedbackCancel: '\u53d6\u6d88',
        fileEmpty: '\u5f53\u524d\u6682\u65e0\u53ef\u4e0b\u8f7d\u7684\u6848\u4ef6\u6587\u4ef6\uff0c\u5f85\u6848\u4ef6\u63a8\u8fdb\u5230\u5bf9\u5e94\u9636\u6bb5\u540e\u4f1a\u5728\u8fd9\u91cc\u751f\u6210\u3002',
        copy: '\u590d\u5236',
        copied: '\u5df2\u590d\u5236',
        like: '\u70b9\u8d5e',
        dislike: '\u4e0d\u8d5e',
        responseTime: '\u54cd\u5e94\u5b8c\u6210\u65f6\u95f4',
        pushFail: '\u90e8\u95e8\u63a8\u9001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
        traceLoading: '\u6b63\u5728\u52a0\u8f7d\u6848\u4ef6\u52a8\u6001...',
        traceEmpty: '\u6682\u65e0\u6848\u4ef6\u52a8\u6001',
        traceSummaryLabel: '\u8be6\u60c5'
    };

    var assistantState = {
        caseId: '',
        detail: null,
        trackingEvents: [],
        trackingLoaded: false,
        trackingLoading: false,
        expandedEventIds: {},
        chatMessages: [],
        isSending: false,
        sideTab: 'detail',
        messageSeq: 0
    };

    var assistantMarkdownRenderer = null;
    var PROCESS_STEPS = ['\u90e8\u95e8\u63a8\u8350', '\u6848\u4ef6\u63a8\u9001', '\u6848\u4ef6\u76d1\u7763', '\u6848\u4ef6\u5f52\u6863'];
    var STATUS = {
        accepted: '\u6848\u4ef6\u5df2\u53d7\u7406',
        mediating: '\u6848\u4ef6\u8c03\u89e3\u4e2d',
        mediatingShort: '\u8c03\u89e3\u4e2d',
        success: '\u6848\u4ef6\u8c03\u89e3\u6210\u529f',
        successShort: '\u8c03\u89e3\u6210\u529f',
        failed: '\u6848\u4ef6\u8c03\u89e3\u5931\u8d25',
        failedShort: '\u8c03\u89e3\u5931\u8d25',
        archived: '\u5df2\u5f52\u6863',
        litigation: '\u8bc9\u8bbc'
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
            steps[3] = STATUS.litigation;
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

    function resolveCurrentStageName(detail) {
        var status = plainText(detail && detail.mediationStatus);
        var steps = resolveProcessSteps(detail);
        if (status === STATUS.archived) {
            return steps[3];
        }
        if (isMediationCompletedStatus(status)) {
            return steps[3];
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
        return text.indexOf('\u6210\u529f') >= 0 || text.indexOf('\u5931\u8d25') >= 0;
    }

    function updateAssistantSendingState(isSending) {
        var sendBtn = document.getElementById('assistantChatSendBtn');
        var input = document.getElementById('assistantChatInput');
        assistantState.isSending = !!isSending;
        if (sendBtn) {
            sendBtn.disabled = !!isSending;
            sendBtn.textContent = isSending ? TEXT.sending : TEXT.send;
        }
        if (input) {
            input.disabled = !!isSending;
        }
    }

    function applyStaticText() {
        var mapping = {
            assistantSidebarTitle: TEXT.sidebarTitle,
            assistantNavHome: TEXT.navHome,
            assistantNavTools: TEXT.navTools,
            assistantNavConsult: TEXT.navConsult,
            assistantNavCases: TEXT.navCases,
            assistantNavStats: TEXT.navStats,
            assistantNavInsight: TEXT.navInsight,
            assistantEyebrow: TEXT.eyebrow,
            assistantBackLink: TEXT.back,
            assistantPageTitle: TEXT.pageTitle,
            assistantChatTitle: TEXT.chatTitle,
            assistantChatDesc: TEXT.chatDesc,
            assistantInfoTitle: TEXT.infoTitle,
            assistantInfoDesc: TEXT.infoDesc,
            assistantChatSendBtn: TEXT.send,
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
        if (input) {
            input.placeholder = TEXT.inputPlaceholder;
        }
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
            return { activeStage: 4, completedStage: 4, animatedLine: 0 };
        }
        if (isMediationCompletedStatus(status)) {
            return { activeStage: 4, completedStage: 4, animatedLine: 0 };
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
        var pieces = [];
        for (var i = 0; i < processSteps.length; i += 1) {
            var stepIndex = i + 1;
            var stepClasses = [];
            if (stepIndex <= processState.completedStage) {
                stepClasses.push('is-complete');
            }
            if (stepIndex === processState.activeStage) {
                stepClasses.push('is-active');
            }
            pieces.push('<div class="assistant-step ' + stepClasses.join(' ') + '"><span class="assistant-step-num">' + stepIndex + '</span><span class="assistant-step-label">' + escapeHtml(processSteps[i]) + '</span></div>');
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
                time: detail && (detail.diversionCompletedAt || detail.updatedAt || detail.createdAt)
            });
        }
        if (archiveReportPath) {
            items.push({
                id: 'archive-report',
                title: '\u5f52\u6863\u62a5\u544a',
                fileName: fileNameFromPath(archiveReportPath),
                path: archiveReportPath,
                endpoint: '/dify/archive-report/download',
                time: detail && (detail.archiveCompletedAt || detail.updatedAt || detail.createdAt)
            });
        }
        if (archiveDocumentPath) {
            items.push({
                id: 'archive-document',
                title: '\u8c03\u89e3\u4e66',
                fileName: fileNameFromPath(archiveDocumentPath),
                path: archiveDocumentPath,
                endpoint: '/dify/archive-document/download',
                time: detail && (detail.archiveCompletedAt || detail.mediationCompletedAt || detail.updatedAt || detail.createdAt)
            });
        }
        return items;
    }

    function iconSvg(name) {
        var icons = {
            copy: '<img src="./img/copy.png" alt="??">',
            like: '<img src="./img/zan.png" alt="??">',
            dislike: '<img src="./img/nozan.png" alt="???">',
            time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
            file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path></svg>',
            download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v10"></path><path d="m8 10 4 4 4-4"></path><path d="M5 20h14"></path></svg>'
        };
        return icons[name] || '';
    }

    function renderFileList(detail) {
        var root = document.getElementById('assistantFileList');
        var count = document.getElementById('assistantFileCount');
        if (!root) {
            return;
        }
        var files = buildFileItems(detail);
        if (count) {
            count.textContent = String(files.length);
        }
        if (!files.length) {
            root.innerHTML = '<div class="assistant-file-empty"><div class="assistant-file-icon">' + iconSvg('file') + '</div><div class="assistant-file-empty-title">\u6682\u65e0\u53ef\u4e0b\u8f7d\u6587\u4ef6</div><div class="assistant-file-empty-text">' + TEXT.fileEmpty + '</div></div>';
            return;
        }
        root.innerHTML = files.map(function (item) {
            return '<button type="button" class="assistant-file-card" data-file-download="' + escapeHtml(item.path) + '" data-file-endpoint="' + escapeHtml(item.endpoint) + '" title="' + escapeHtml(item.fileName) + '">'
                + '<div class="assistant-file-title">' + escapeHtml(item.title) + '</div>'
                + '</button>';
        }).join('');
    }

    function renderSideModules(detail) {
        renderCaseDetailPanel(detail);
        renderTrackingList();
        renderFileList(detail);
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

    function seedChat() {
        assistantState.chatMessages = [];
        assistantState.messageSeq = 0;
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
            + '<div class="assistant-msg-actions">'
            + '<button type="button" class="assistant-msg-action' + (message.copied ? ' is-active' : '') + '" data-msg-action="copy" data-message-id="' + escapeHtml(message.id) + '" title="' + escapeHtml(message.copied ? TEXT.copied : TEXT.copy) + '">' + iconSvg('copy') + '</button>'
            + '<button type="button" class="assistant-msg-action' + (message.liked ? ' is-active' : '') + '" data-msg-action="like" data-message-id="' + escapeHtml(message.id) + '" title="' + escapeHtml(TEXT.like) + '">' + iconSvg('like') + '</button>'
            + '<button type="button" class="assistant-msg-action' + (dislikeActive ? ' is-active' : '') + '" data-msg-action="dislike" data-message-id="' + escapeHtml(message.id) + '" title="' + escapeHtml(TEXT.dislike) + '">' + iconSvg('dislike') + '</button>'
            + '</div>'
            + '<span class="assistant-msg-time" title="' + escapeHtml(TEXT.responseTime) + '">' + iconSvg('time') + '<span>' + escapeHtml(formatAssistantMessageTime(message.finishedAt)) + '</span></span>'
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
        var status = plainText(detail && detail.mediationStatus);
        if (isExpediteSuperviseQuestion(question)) {
            return true;
        }
        if (isDisputeMediationQuestion(question)) {
            return true;
        }
        return !status || isAcceptedStatus(status);
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
        if (!root) {
            return;
        }
        var safeContent = normalizeAssistantMarkdown(content);
        if (!safeContent) {
            return;
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
        assistantState.chatMessages.push({
            id: 'assistant-msg-' + (++assistantState.messageSeq),
            role: 'assistant',
            content: safeContent,
            finishedAt: new Date().toISOString(),
            liked: false,
            feedbackSubmitted: false,
            dislikeOpen: false,
            dislikeDraft: '',
            copied: false
        });
        renderChat();
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
            var bodyHtml = message.role === 'assistant'
                ? renderAssistantMarkdown(message.content)
                : renderUserMessage(message.content);
            var toolbarHtml = message.role === 'assistant' ? renderAssistantMessageToolbar(message) : '';
            return '<article class="assistant-msg ' + message.role + '" data-message-id="' + escapeHtml(message.id) + '"><div class="assistant-msg-content">' + bodyHtml + '</div>' + toolbarHtml + '</article>';
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

        if (shouldTriggerDepartmentPush(assistantState.detail, question)) {
            updateAssistantSendingState(true);
            try {
                var confirmed = isConfirmText(question);
                var pushData = await requestDepartmentPush(assistantState.detail || {}, question);
                var responseBriefing = plainText(pushData && pushData.briefing);
                if (pushData && typeof pushData === 'object') {
                    assistantState.detail = Object.assign({}, assistantState.detail || {}, pushData || {});
                }
                assistantState.detail.recommendReason = resolveAssistantRecommendReason(assistantState.detail || {});
                assistantState.detail.briefing = resolveAssistantBriefing(assistantState.detail || {});
                await loadTrackingEvents(true);
                renderPage(assistantState.detail || {}, { preserveChat: true });
                var pushedMessage = !confirmed && responseBriefing
                    ? responseBriefing
                    : resolveAssistantInitialMessage(assistantState.detail || {});
                if (pushedMessage) {
                    await typeAssistantMessage(pushedMessage, { mode: resolveAssistantTypingMode(assistantState.detail || {}) });
                }
            } catch (error) {
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
            return;
        }

        updateAssistantSendingState(true);
        try {
            await typeAssistantMessage(buildAssistantReply(question), { mode: 'char' });
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
    }

    async function loadAssistantDetail() {
        var params = new URLSearchParams(window.location.search);
        assistantState.caseId = String(params.get('caseId') || '').trim();
        assistantState.trackingLoaded = false;
        if (!assistantState.caseId) {
            assistantState.trackingEvents = [];
            assistantState.trackingLoaded = true;
            renderPage({ caseId: '-', caseNo: '-', caseText: TEXT.noCase });
            return;
        }
        showAssistantInitLoading(TEXT.initLoading);
        try {
            var response = await fetch(API_BASE + '/cases/assistant-detail?caseId=' + encodeURIComponent(assistantState.caseId));
            var json = await response.json();
            assistantState.detail = json && json.data ? json.data : { caseId: assistantState.caseId };
            try {
                var workflowData = await requestRecommendedDepartment(assistantState.detail || {});
                if (workflowData && typeof workflowData === 'object') {
                    assistantState.detail = Object.assign({}, assistantState.detail || {}, workflowData || {});
                }
            } catch (workflowError) {
                console.warn('request recommended department failed', workflowError);
            }
        } catch (error) {
            assistantState.detail = { caseId: assistantState.caseId, caseNo: assistantState.caseId, caseText: TEXT.loadFail, factsSummary: TEXT.loadFail };
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
            await typeAssistantMessage(initialMessage, { mode: resolveAssistantTypingMode(assistantState.detail) });
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

        if (sendBtn) {
            sendBtn.onclick = function () { sendChatQuestion(); };
        }
        if (input) {
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendChatQuestion();
                }
            });
        }
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
            sideRoot.addEventListener('click', function (event) {
                var tabTarget = event.target.closest('[data-side-tab]');
                var audioTarget = event.target.closest('[data-case-audio-toggle]');
                var fileTarget = event.target.closest('[data-file-download]');
                if (tabTarget) {
                    var nextTab = tabTarget.getAttribute('data-side-tab');
                    assistantState.sideTab = nextTab === 'trace' || nextTab === 'files' || nextTab === 'detail' ? nextTab : 'detail';
                    renderSideModules(assistantState.detail || {});
                    if (assistantState.sideTab === 'trace') {
                        loadTrackingEvents(true);
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

    applyStaticText();
    bindEvents();
    loadAssistantDetail();
})();












