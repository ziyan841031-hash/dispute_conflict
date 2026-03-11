// 法律服务对话相关函数

function openRealtimeTranscription() {
    const url = 'http://218.78.134.191:17989';
    window.location.assign(url);
}

function openAddToolTip() {
    alert('更多工具正在整理中，当前可使用语音实时转录、法律服务对话、评价反馈和区域施工与活动记录。');
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
    homeToolLoadDone = false;
    if (homeToolLoadTimer) {
        clearTimeout(homeToolLoadTimer);
        homeToolLoadTimer = null;
    }

    frame.onload = function () {
        homeToolLoadDone = true;
        if (homeToolLoadTimer) {
            clearTimeout(homeToolLoadTimer);
            homeToolLoadTimer = null;
        }
    };

    frame.onerror = function () {
        homeToolLoadDone = false;
    };

    frame.src = url || 'about:blank';
    modal.classList.remove('hidden');
    modal.onclick = function (event) {
        if (event.target === modal) {
            closeHomeToolDialog();
        }
    };

    if (url && /^https?:/i.test(url)) {
        homeToolLoadTimer = setTimeout(() => {
            if (!homeToolLoadDone) {
                const shouldOpen = window.confirm('当前页面可能不支持 iframe 加载，是否改为新窗口打开？');
                if (shouldOpen) {
                    window.open(url, '_blank', 'noopener,noreferrer');
                }
            }
        }, 8000);
    }
}

function closeHomeToolDialog() {
    const modal = document.getElementById('homeToolModal');
    const frame = document.getElementById('homeToolFrame');
    if (homeToolLoadTimer) {
        clearTimeout(homeToolLoadTimer);
        homeToolLoadTimer = null;
    }
    homeToolLoadDone = false;
    if (modal) {
        modal.classList.add('hidden');
    }
    if (frame) {
        frame.src = 'about:blank';
        frame.onload = null;
        frame.onerror = null;
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
        alert('登录失败，请稍后重试');
        return;
    }
    modal.classList.remove('hidden');
    refreshLawRoleButtons();
    if (!list.dataset.inited) {
        appendLawAgentMessage('assistant', '你好，这里是法律服务对话助手。请输入你的问题，我将提供法律参考建议。');
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
    lawAgentRole = role === '工作人员' ? '工作人员' : '普通群众';
    refreshLawRoleButtons();
}

function refreshLawRoleButtons() {
    const citizen = document.getElementById('lawRoleCitizen');
    const worker = document.getElementById('lawRoleWorker');
    if (citizen) {
        citizen.classList.toggle('active', lawAgentRole === '普通群众');
    }
    if (worker) {
        worker.classList.toggle('active', lawAgentRole === '工作人员');
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
    lawAgentChatPending = false;
    lawAgentRecommendPending = false;
    lawAgentApiPending = false;
    if (lawAgentAnswerEventSource) {
        lawAgentAnswerEventSource.close();
        lawAgentAnswerEventSource = null;
    }
    setLawAgentSendingState(false);
}

function onLawAgentInputKeydown(event) {
    if (event && event.key === 'Enter') {
        event.preventDefault();
        sendLawAgentMessage();
    }
}

function setLawAgentSendingState(pending) {
    const input = document.getElementById('lawAgentInput');
    const sendBtn = input && input.parentElement ? input.parentElement.querySelector('button') : null;
    if (input) {
        input.disabled = pending;
    }
    if (sendBtn) {
        sendBtn.disabled = pending;
        sendBtn.textContent = pending ? '发送中...' : '发送';
    }
}

async function requestLawAgentChatMessage(payload) {
    if (lawAgentApiPending) {
        return null;
    }
    lawAgentApiPending = true;
    try {
        const res = await fetch(`${API_BASE}/dify/chat-message`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        const payloadData = json && json.data ? json.data : {};
        return payloadData && payloadData.data ? payloadData.data : payloadData;
    } catch (error) {
        return null;
    } finally {
        lawAgentApiPending = false;
    }
}

function appendLawAgentRecommendLinks(node) {
    if (!node) {
        return;
    }
    const actions = document.createElement('div');
    actions.className = 'law-agent-recommend-links';
    const lawLink = document.createElement('button');
    lawLink.type = 'button';
    lawLink.className = 'law-agent-link-btn';
    lawLink.textContent = '相关法律推荐';
    lawLink.onclick = () => askLawAgentRecommendation('相关法律推荐');
    const caseLink = document.createElement('button');
    caseLink.type = 'button';
    caseLink.className = 'law-agent-link-btn';
    caseLink.textContent = '相似案例推荐';
    caseLink.onclick = () => askLawAgentRecommendation('相似案例推荐');
    actions.appendChild(lawLink);
    actions.appendChild(caseLink);
    node.appendChild(actions);
}

function readFirstTextValue(obj, keys) {
    if (!obj || typeof obj !== 'object') {
        return '';
    }
    for (const key of keys) {
        const value = obj[key];
        if (typeof value === 'string' && value) {
            return value;
        }
    }
    return '';
}

function extractStreamTextFromObject(payload) {
    if (!payload || typeof payload !== 'object') {
        return '';
    }
    const direct = readFirstTextValue(payload, ['answer', 'text', 'output', 'content', 'delta', 'message']);
    if (direct) {
        return direct;
    }
    if (payload.data && typeof payload.data === 'object') {
        const nested = readFirstTextValue(payload.data, ['answer', 'text', 'output', 'content', 'delta', 'message']);
        if (nested) {
            return nested;
        }
    }
    if (Array.isArray(payload.choices) && payload.choices.length > 0) {
        const first = payload.choices[0];
        if (first && typeof first === 'object') {
            if (first.delta && typeof first.delta === 'object' && typeof first.delta.content === 'string') {
                return first.delta.content;
            }
            if (first.message && typeof first.message === 'object' && typeof first.message.content === 'string') {
                return first.message.content;
            }
        }
    }
    return '';
}

function extractTextFromStreamPayload(raw) {
    if (typeof raw !== 'string') {
        return '';
    }
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[DONE]') {
        return '';
    }
    try {
        const payload = JSON.parse(trimmed);
        return extractStreamTextFromObject(payload);
    } catch (e) {
        return raw;
    }
}

function extractDoneTextFromStreamPayload(raw) {
    if (typeof raw !== 'string') {
        return '';
    }
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[DONE]') {
        return '';
    }
    try {
        const payload = JSON.parse(trimmed);
        return extractStreamTextFromObject(payload);
    } catch (e) {
        return '';
    }
}

function normalizeDisplayText(rawText) {
    return typeof rawText === 'string' ? rawText : '';
}

function sanitizeDisplayText(text) {
    return typeof text === 'string' ? text : '';
}

function formatStreamDisplayText(rawText) {
    return sanitizeDisplayText(normalizeDisplayText(rawText));
}

function renderLawAgentAssistantContent(node, text) {
    if (!node) {
        return;
    }
    const content = typeof text === 'string' ? text : '';
    if (window.markdownit && typeof window.markdownit === 'function') {
        const md = window.markdownit({breaks: true, linkify: true, html: false});
        node.innerHTML = md.render(content);
    } else if (window.marked && typeof window.marked.parse === 'function') {
        node.innerHTML = window.marked.parse(content, {breaks: true, gfm: true});
    } else {
        node.textContent = content;
    }
}

function streamLawAgentAnswer(chatId, node, withRecommendLinks) {
    return new Promise(resolve => {
        if (!chatId || !node) {
            resolve('');
            return;
        }
        if (lawAgentAnswerEventSource) {
            lawAgentAnswerEventSource.close();
            lawAgentAnswerEventSource = null;
        }
        let finalText = '';
        let finalRawText = '';
        let streamStarted = false;
        const streamUrl = `${API_BASE}/dify/answer-stream/${encodeURIComponent(chatId)}?useOriginal=true`;
        const eventSource = new EventSource(streamUrl);
        lawAgentAnswerEventSource = eventSource;

        const scrollToBottom = () => {
            const list = document.getElementById('lawAgentChatList');
            if (list) {
                list.scrollTop = list.scrollHeight;
            }
        };

        const ensureStreamStarted = () => {
            if (streamStarted) {
                return;
            }
            streamStarted = true;
            clearLawAgentWaitingState(node);
        };

        const closeWithResult = () => {
            if (withRecommendLinks && finalText) {
                appendLawAgentRecommendLinks(node);
            }
            scrollToBottom();
            if (lawAgentAnswerEventSource === eventSource) {
                lawAgentAnswerEventSource = null;
            }
            eventSource.close();
            resolve(finalText);
        };

        eventSource.addEventListener('delta', event => {
            const deltaRaw = extractTextFromStreamPayload(event.data || '');
            if (!deltaRaw) {
                return;
            }
            ensureStreamStarted();
            finalRawText += deltaRaw;
            finalText = formatStreamDisplayText(finalRawText);
            renderLawAgentAssistantContent(node, finalText);
            scrollToBottom();
        });

        eventSource.addEventListener('done', event => {
            if (event && typeof event.data === 'string' && event.data.trim()) {
                const doneRaw = extractDoneTextFromStreamPayload(event.data);
                const doneText = formatStreamDisplayText(doneRaw);
                if (doneText && doneText.length >= finalText.length && doneText.startsWith(finalText)) {
                    ensureStreamStarted();
                    finalRawText = doneRaw;
                    finalText = doneText;
                    renderLawAgentAssistantContent(node, finalText);
                }
            }
            closeWithResult();
        });

        eventSource.onmessage = event => {
            const msgRaw = extractTextFromStreamPayload(event && typeof event.data === 'string' ? event.data : '');
            if (msgRaw && msgRaw !== '[DONE]') {
                ensureStreamStarted();
                finalRawText += msgRaw;
                finalText = formatStreamDisplayText(finalRawText);
                renderLawAgentAssistantContent(node, finalText);
                scrollToBottom();
            }
        };

        eventSource.addEventListener('error', () => {
            if (!finalText) {
                clearLawAgentWaitingState(node);
                renderLawAgentAssistantContent(node, '请求失败，请稍后重试');
            }
            closeWithResult();
        });
    });
}

async function sendLawAgentMessage() {
    if (lawAgentChatPending) {
        return;
    }
    const input = document.getElementById('lawAgentInput');
    if (!input) {
        return;
    }
    const question = String(input.value || '').trim();
    if (!question) {
        return;
    }
    lawAgentChatPending = true;
    setLawAgentSendingState(true);
    appendLawAgentMessage('user', question);
    input.value = '';

    const waitingNode = appendLawAgentWaitingMessage();
    try {
        const dataObj = await requestLawAgentChatMessage({
            question,
            role: lawAgentRole,
            token: lawAgentLoginToken,
            type: lawAgentRequestType,
            rawResponse: lawAgentLastRawResponse
        });
        const chatId = dataObj && (dataObj.id || dataObj.chatId || '');
        if (chatId) {
            const answerText = await streamLawAgentAnswer(chatId, waitingNode, lawAgentRequestType !== 2);
            if (answerText) {
                lawAgentLastRawResponse = answerText;
                lawAgentRequestType = 1;
                return;
            }
        }
    } finally {
        lawAgentChatPending = false;
        setLawAgentSendingState(false);
    }
    updateLawAgentMessage(waitingNode, '请求失败，请稍后重试', false);
}

async function askLawAgentRecommendation(tag) {
    if (lawAgentRecommendPending || !lawAgentLoginToken || !lawAgentLastRawResponse || lawAgentLastRawResponse === '0') {
        return;
    }
    lawAgentRecommendPending = true;
    const waitingNode = appendLawAgentWaitingMessage();
    try {
        const dataObj = await requestLawAgentChatMessage({
            question: tag,
            role: lawAgentRole,
            token: lawAgentLoginToken,
            type: 2,
            rawResponse: lawAgentLastRawResponse
        });
        const chatId = dataObj && (dataObj.id || dataObj.chatId || '');
        if (chatId) {
            const answerText = await streamLawAgentAnswer(chatId, waitingNode, false);
            if (answerText) {
                lawAgentLastRawResponse = answerText;
                return;
            }
        }
    } finally {
        lawAgentRecommendPending = false;
    }
    updateLawAgentMessage(waitingNode, '请求失败，请稍后重试', false);
}

function appendLawAgentWaitingMessage() {
    const node = appendLawAgentMessage('assistant', '');
    if (!node) {
        return null;
    }
    node.classList.add('law-agent-waiting');
    node.innerHTML = '<span class="law-agent-waiting-ios"><span class="law-agent-waiting-dot"></span><span class="law-agent-waiting-dot"></span><span class="law-agent-waiting-dot"></span></span>';
    return node;
}

function clearLawAgentWaitingState(node) {
    if (!node || !node.classList || !node.classList.contains('law-agent-waiting')) {
        return;
    }
    node.classList.remove('law-agent-waiting');
    node.innerHTML = '';
}

function appendLawAgentMessage(role, text) {
    const list = document.getElementById('lawAgentChatList');
    if (!list) {
        return null;
    }
    const item = document.createElement('div');
    item.className = `law-agent-msg ${role === 'user' ? 'user' : 'assistant'}`;
    if (role === 'assistant') {
        renderLawAgentAssistantContent(item, text || '');
    } else {
        item.textContent = text || '';
    }
    list.appendChild(item);
    list.scrollTop = list.scrollHeight;
    return item;
}

function updateLawAgentMessage(node, text, withRecommendLinks) {
    if (!node) {
        return;
    }
    clearLawAgentWaitingState(node);
    animateLawAgentTyping(node, text || '', () => {
        if (withRecommendLinks) {
            appendLawAgentRecommendLinks(node);
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
