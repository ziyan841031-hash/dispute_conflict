(function () {
    const govConsultState = {
        sessionId: '',
        pending: false,
        typingTimer: null,
        activeTypingNode: null
    };

    function createGovConsultSessionId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return 'gov-' + Date.now() + '-' + Math.random().toString(16).slice(2, 10);
    }

    function renderGovConsultAssistantContent(node, text) {
        if (!node) {
            return;
        }
        const content = typeof text === 'string' ? text : '';
        const normalized = content.split(String.fromCharCode(13) + String.fromCharCode(10)).join(String.fromCharCode(10));
        node.classList.remove('is-typing');
        if (window.markdownit && typeof window.markdownit === 'function') {
            const md = window.markdownit({breaks: true, linkify: true, html: false});
            const rendered = md.render(normalized);
            node.innerHTML = rendered.replace(/^<p>/, '').replace(/<\/p>\s*$/, '');
            return;
        }
        if (window.marked && typeof window.marked.parse === 'function') {
            const rendered = window.marked.parse(normalized, {breaks: true, gfm: true});
            node.innerHTML = rendered.replace(/^<p>/, '').replace(/<\/p>\s*$/, '');
            return;
        }
        node.textContent = normalized;
    }

    function renderGovConsultTypingFrame(node, text) {
        if (!node) {
            return;
        }
        node.classList.add('is-typing');
        node.textContent = text || '';
    }


    function stopGovConsultTyping() {
        if (govConsultState.typingTimer) {
            window.clearTimeout(govConsultState.typingTimer);
            govConsultState.typingTimer = null;
        }
        if (govConsultState.activeTypingNode) {
            govConsultState.activeTypingNode.classList.remove('is-typing');
            govConsultState.activeTypingNode = null;
        }
    }

    function typeGovConsultAssistantContent(node, text) {
        stopGovConsultTyping();
        const content = typeof text === 'string' ? text : '';
        if (!node) {
            return Promise.resolve();
        }
        if (!content) {
            renderGovConsultAssistantContent(node, '');
            return Promise.resolve();
        }
        govConsultState.activeTypingNode = node;
        let index = 0;
        return new Promise((resolve) => {
            const tick = function () {
                const nextChar = content.charAt(index);
                const newlineChar = String.fromCharCode(10);
                const isBreakChar = nextChar === newlineChar;
                const isPauseChar = [',', '.', '!', '?', ';', ':'].indexOf(nextChar) >= 0;
                const step = isBreakChar ? 1 : (isPauseChar ? 2 : 3);
                index = Math.min(content.length, index + step);
                renderGovConsultTypingFrame(node, content.slice(0, index));
                const list = document.getElementById('govConsultChatList');
                if (list) {
                    list.scrollTop = list.scrollHeight;
                }
                if (index >= content.length) {
                    govConsultState.typingTimer = null;
                    govConsultState.activeTypingNode = null;
                    renderGovConsultAssistantContent(node, content);
                    resolve();
                    return;
                }
                govConsultState.typingTimer = window.setTimeout(tick, isBreakChar ? 36 : 14);
            };
            tick();
        });
    }

    function appendGovConsultMessage(role, text) {
        const list = document.getElementById('govConsultChatList');
        if (!list) {
            return null;
        }
        const item = document.createElement('div');
        item.className = `law-agent-msg ${role === 'user' ? 'user' : 'assistant'}`;
        const body = document.createElement('div');
        body.className = 'law-agent-msg-body';
        item.appendChild(body);
        if (role === 'assistant') {
            renderGovConsultAssistantContent(body, text || '');
        } else {
            body.textContent = text || '';
        }
        list.appendChild(item);
        list.scrollTop = list.scrollHeight;
        return item;
    }

    function appendGovConsultWaitingMessage() {
        const node = appendGovConsultMessage('assistant', '');
        if (!node) {
            return null;
        }
        node.classList.add('law-agent-waiting');
        const body = node.querySelector('.law-agent-msg-body') || node;
        body.innerHTML = '<span class="law-agent-waiting-ios"><span class="law-agent-waiting-dot"></span><span class="law-agent-waiting-dot"></span><span class="law-agent-waiting-dot"></span></span>';
        return node;
    }

    function clearGovConsultWaitingState(node) {
        if (!node || !node.classList || !node.classList.contains('law-agent-waiting')) {
            return;
        }
        node.classList.remove('law-agent-waiting');
        const body = node.querySelector('.law-agent-msg-body') || node;
        body.innerHTML = '';
    }

    function setGovConsultSendingState(pending) {
        govConsultState.pending = pending;
        const input = document.getElementById('govConsultInput');
        const button = document.getElementById('govConsultSendBtn');
        if (input) {
            input.disabled = pending;
        }
        if (button) {
            button.disabled = pending;
            button.textContent = pending ? '发送中...' : '发送';
        }
    }

    async function requestGovConsultMessage(payload) {
        const response = await fetch(`${API_BASE}/dify/gov-consult-message`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const json = await response.json();
        if (!json || json.code !== 0 || !json.data) {
            throw new Error((json && (json.message || json.msg)) || '请求失败');
        }
        return json.data;
    }

    window.initGovConsultPage = function () {
        govConsultState.sessionId = createGovConsultSessionId();
        const list = document.getElementById('govConsultChatList');
        if (list) {
            list.innerHTML = '';
        }
        appendGovConsultMessage('assistant', '你好，这里是政务平台咨询服务助手。请输入你的问题，我会基于当前会话的最新记录继续解答。');
    };

    window.onGovConsultInputKeydown = function (event) {
        if (event && event.key === 'Enter') {
            event.preventDefault();
            sendGovConsultMessage();
        }
    };

    window.sendGovConsultMessage = async function () {
        if (govConsultState.pending) {
            return;
        }
        const input = document.getElementById('govConsultInput');
        if (!input) {
            return;
        }
        const question = String(input.value || '').trim();
        if (!question) {
            return;
        }

        setGovConsultSendingState(true);
        appendGovConsultMessage('user', question);
        input.value = '';
        const waitingNode = appendGovConsultWaitingMessage();

        try {
            const data = await requestGovConsultMessage({
                sessionId: govConsultState.sessionId,
                question
            });
            const answer = String((data && data.answer) || '').trim();
            clearGovConsultWaitingState(waitingNode);
            const waitingBody = waitingNode && waitingNode.querySelector('.law-agent-msg-body');
            await typeGovConsultAssistantContent(waitingBody, answer || '????????????????');
        } catch (error) {
            clearGovConsultWaitingState(waitingNode);
            const waitingBody = waitingNode && waitingNode.querySelector('.law-agent-msg-body');
            renderGovConsultAssistantContent(waitingBody, `?????${(error && error.message) || '?????'}`);
        } finally {
            setGovConsultSendingState(false);
            const list = document.getElementById('govConsultChatList');
            if (list) {
                list.scrollTop = list.scrollHeight;
            }
        }
    };
})();
