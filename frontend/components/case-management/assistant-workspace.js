(function () {
  const state = {
    activeTopic: 'suggestion',
    messages: [],
    caseData: {},
    adviceData: null
  };

  const TOPIC_TABS = [
    { key: 'suggestion', label: '办理建议', prompt: '请根据当前案件给出办理建议。' },
    { key: 'risk', label: '风险研判', prompt: '请帮我判断是否需要升级处置。' },
    { key: 'law', label: '法律依据', prompt: '请给出对应法律依据和适用前提。' },
    { key: 'summary', label: '处置记录总结', prompt: '请总结当前案件办理建议与下一步动作。' }
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getTopicPrompt(key) {
    const match = TOPIC_TABS.find((item) => item.key === key);
    return match ? match.prompt : TOPIC_TABS[0].prompt;
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

  function SummaryHeader() {
    return `
      <section class="ui-card summary-header-card">
        <div class="summary-header-top">
          <div class="summary-header-main">
            <h2 class="summary-title">案件管理智能助手</h2>
            <p class="summary-subtitle">以案件摘要、智能问答与建议结果卡片协同办理</p>
          </div>
          <div id="assistantSummaryActions" class="summary-right"></div>
        </div>
        <div class="summary-info-wrap">
          <div id="assistantTopInfo" class="summary-grid"></div>
        </div>
      </section>
    `;
  }

  function RiskAlertCard() {
    return '<section id="assistantRiskAlert" class="risk-alert-card"></section>';
  }

  function AssistantToolbar() {
    const tabs = TOPIC_TABS.map((item) => `<button type="button" class="chat-scope-tab ${item.key === state.activeTopic ? 'active' : ''}" data-topic="${item.key}">${item.label}</button>`).join('');
    return `
      <section class="ui-card chat-workspace">
        <header class="assistant-toolbar">
          <div class="assistant-toolbar-head">
            <div>
              <div class="assistant-toolbar-title">智能问答</div>
              <div id="assistantToolbarCaseNo" class="assistant-toolbar-case">当前案件：-</div>
            </div>
            <div class="assistant-toolbar-actions">
              <button type="button" class="ui-btn ui-btn-secondary" id="assistantNewChatBtn">新建问答</button>
              <button type="button" class="ui-btn ui-btn-secondary" id="assistantClearChatBtn">清空上下文</button>
            </div>
          </div>
          <div class="chat-scope-tabs" id="assistantScopeTabs">${tabs}</div>
        </header>

        <div id="assistantChatMessages" class="chat-message-list"></div>
        <div id="assistantSuggestedQuestions" class="chat-suggested"></div>

        <footer class="chat-input-panel">
          <div class="chat-input-wrap">
            <textarea id="assistantChatInput" class="chat-input" placeholder="请根据当前案件给出办理建议"></textarea>
            <div class="chat-input-actions">
              <button type="button" class="ui-btn ui-btn-secondary" id="assistantAttachBtn">引用案件信息</button>
              <button type="button" class="ui-btn ui-btn-primary" id="assistantSendBtn">发送</button>
            </div>
          </div>
        </footer>
      </section>
    `;
  }

  function AssistantSidebar() {
    return `
      <aside class="ui-card assistant-sidebar">
        <div class="assistant-side-tabs">
          <button class="bookmark-tab active" data-tab="guide" type="button" onclick="switchAssistantTab('guide')">智能建议</button>
          <button class="bookmark-tab" data-tab="timeline" type="button" onclick="switchAssistantTab('timeline')">最近记录</button>
          <button class="bookmark-tab" data-tab="rules" type="button" onclick="switchAssistantTab('rules')">规则依据</button>
        </div>
        <div class="assistant-side-panels">
          <div class="guide-panel" data-panel="guide">
            <div id="guideList"></div>
          </div>
          <div class="timeline-panel hidden" data-panel="timeline">
            <div id="timelineList" class="activity-feed"></div>
          </div>
          <div class="timeline-panel hidden" data-panel="rules">
            <div id="ruleList"></div>
          </div>
        </div>
      </aside>
    `;
  }

  function renderShell() {
    return `
      <div class="layout">
        ${renderSidebar()}
        <main class="content assistant-page-content">
          <section class="assistant-shell">
            ${SummaryHeader()}
            ${RiskAlertCard()}
            <section class="assistant-main-workspace">
              ${AssistantToolbar()}
              ${AssistantSidebar()}
            </section>
          </section>
        </main>
      </div>
    `;
  }

  function getSuggestedQuestions() {
    const map = {
      suggestion: [
        '是否建议优先行政调解？',
        '帮我总结当前案件办理建议',
        '建议的办理顺序是什么？'
      ],
      risk: [
        '是否需要转公安部门？',
        '涉及未成年人时处置重点是什么？',
        '是否建议升级处置等级？'
      ],
      law: [
        '请给出适用法律条款摘要',
        '这些条款的适用前提是什么？',
        '请补充规则依据说明'
      ],
      summary: [
        '帮我生成沟通话术',
        '请总结近期办理记录',
        '输出下一步行动清单'
      ]
    };
    return map[state.activeTopic] || map.suggestion;
  }

  function AiAnswerCard(data) {
    const safe = data || {};
    const recommendation = esc((safe.recommendedDepartment || '-').toString());
    const riskLevel = esc((safe.riskLevel || '-').toString());
    const summary = esc((safe.factsSummary || safe.summaryText || safe.caseText || '-').toString().slice(0, 120));
    const advice = esc((safe.mediationAdvice || '-').toString().replace(/<[^>]+>/g, '').slice(0, 150));

    return `
      <div class="ai-answer-card">
        <h4 class="ai-answer-title">结论摘要</h4>
        <div>${summary || '-'}</div>
      </div>
      <div class="ai-answer-card">
        <h4 class="ai-answer-title">推荐处理建议</h4>
        <ol class="ai-answer-list">
          <li>建议优先联系责任部门并确认受理状态。</li>
          <li>结合风险等级 ${riskLevel} 做分级跟进。</li>
          <li>按建议路径推进至 ${recommendation}。</li>
        </ol>
      </div>
      <div class="ai-answer-card">
        <h4 class="ai-answer-title">依据与沟通要点</h4>
        <div>${advice || '暂无明确建议文本'}</div>
      </div>
      <div class="ai-ref-block">引用信息：案件编号 ${esc(safe.caseNo || '-')}; 纠纷类型 ${esc(safe.disputeType || '-')} / ${esc(safe.disputeSubType || '-')}</div>
    `;
  }

  function ChatMessageBubble(msg) {
    const role = msg.role === 'user' ? 'user' : 'ai';
    const roleText = role === 'user' ? '我' : 'AI';
    const text = esc(msg.text || '');
    const structured = msg.structured ? AiAnswerCard(state.caseData) : '';
    return `
      <div class="chat-msg-row ${role}">
        ${role === 'ai' ? `<span class="chat-role-pill">${roleText}</span>` : ''}
        <div class="chat-bubble">${text ? `<div>${text}</div>` : ''}${structured}</div>
        ${role === 'user' ? `<span class="chat-role-pill">${roleText}</span>` : ''}
      </div>
    `;
  }

  function ChatMessageList() {
    const box = document.getElementById('assistantChatMessages');
    if (!box) return;
    box.innerHTML = state.messages.map(ChatMessageBubble).join('');
    box.scrollTop = box.scrollHeight;
  }

  function SuggestedQuestions() {
    const box = document.getElementById('assistantSuggestedQuestions');
    if (!box) return;
    box.innerHTML = getSuggestedQuestions().map((q) => `<button type="button" class="chat-chip" data-question="${esc(q)}">${esc(q)}</button>`).join('');
  }

  function ask(questionText, fromUser) {
    const text = String(questionText || '').trim();
    if (!text) return;
    if (fromUser) {
      state.messages.push({ role: 'user', text, structured: false });
    }
    state.messages.push({
      role: 'ai',
      text: '已结合当前案件信息生成建议，请参考下方结构化结果。',
      structured: true
    });
    ChatMessageList();
  }

  function resetChat(withGreeting) {
    state.messages = [];
    if (withGreeting) {
      state.messages.push({
        role: 'ai',
        text: '你好，我是案件智能问答助手。可从办理建议、风险研判、法律依据等角度为你提供辅助。',
        structured: true
      });
    }
    ChatMessageList();
    SuggestedQuestions();
  }

  function bindEvents() {
    const scopeBox = document.getElementById('assistantScopeTabs');
    const sendBtn = document.getElementById('assistantSendBtn');
    const input = document.getElementById('assistantChatInput');
    const clearBtn = document.getElementById('assistantClearChatBtn');
    const newBtn = document.getElementById('assistantNewChatBtn');
    const chipBox = document.getElementById('assistantSuggestedQuestions');
    const attachBtn = document.getElementById('assistantAttachBtn');

    if (scopeBox) {
      scopeBox.addEventListener('click', (event) => {
        const btn = event.target.closest('[data-topic]');
        if (!btn) return;
        state.activeTopic = btn.getAttribute('data-topic') || 'suggestion';
        scopeBox.querySelectorAll('[data-topic]').forEach((node) => {
          node.classList.toggle('active', node === btn);
        });
        if (input) {
          input.value = getTopicPrompt(state.activeTopic);
        }
        SuggestedQuestions();
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        if (!input) return;
        const text = input.value;
        input.value = '';
        ask(text, true);
      });
    }

    if (input) {
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          const text = input.value;
          input.value = '';
          ask(text, true);
        }
      });
    }

    if (chipBox) {
      chipBox.addEventListener('click', (event) => {
        const chip = event.target.closest('[data-question]');
        if (!chip) return;
        const text = chip.getAttribute('data-question') || '';
        if (input) {
          input.value = text;
          input.focus();
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        resetChat(true);
      });
    }

    if (newBtn) {
      newBtn.addEventListener('click', () => {
        resetChat(true);
        if (input) {
          input.value = getTopicPrompt(state.activeTopic);
          input.focus();
        }
      });
    }

    if (attachBtn) {
      attachBtn.addEventListener('click', () => {
        if (!input) return;
        const caseNo = state.caseData && state.caseData.caseNo ? state.caseData.caseNo : '-';
        const appendText = `【引用案件信息：${caseNo}】`;
        input.value = `${input.value ? `${input.value}\n` : ''}${appendText}`;
        input.focus();
      });
    }
  }

  function renderSummaryActionArea() {
    const box = document.getElementById('assistantSummaryActions');
    if (!box) return;
    box.innerHTML = `
      <div class="summary-actions summary-actions-top">
        <button id="caseDetailBtn" type="button" class="ui-btn ui-btn-primary" onclick="openAssistantCaseDetail()">查看案件详情</button>
        <a href="cases.html" class="summary-link">返回案件列表</a>
      </div>
    `;
  }

  function mount() {
    const root = document.getElementById('assistantPageRoot');
    if (!root) return;
    root.innerHTML = renderShell();
    bindEvents();
    resetChat(true);
    if (window.onAssistantCanvasReady) {
      window.onAssistantCanvasReady();
    }
  }

  function syncContext(caseData, adviceData) {
    state.caseData = caseData || {};
    state.adviceData = adviceData || null;
    const caseNo = (state.caseData && state.caseData.caseNo) || '-';
    const info = document.getElementById('assistantToolbarCaseNo');
    if (info) {
      info.textContent = `当前案件：${caseNo}`;
    }
    renderSummaryActionArea();
  }

  window.AssistantWorkspace = {
    mount,
    syncContext,
    resetChat,
    ask
  };
})();









