// 通用工具函数

function fetchWithTimeout(url, options = {}, timeoutMs = EXCEL_BATCH_WAIT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return fetch(url, {...options, signal: controller.signal});
    } finally {
        clearTimeout(timer);
    }
}

function isLikelyMojibake(text) {
    const value = String(text == null ? '' : text).trim();
    if (!value) {
        return false;
    }
    const suspiciousChars = [0xFFFD, 0x951F];
    const suspiciousFragments = [
        '鏅鸿', '姝ｅ湪', '璇风', '缁撳悎', '妗堜欢', '鐢熸垚', '寤鸿', '绋嶅', '澶勭悊'
    ];
    for (let i = 0; i < value.length; i++) {
        if (suspiciousChars.includes(value.charCodeAt(i))) {
            return true;
        }
    }
    return suspiciousFragments.some((fragment) => value.includes(fragment));
}

function safeUiCopy(text, fallback) {
    const raw = String(text == null ? '' : text).trim();
    const backup = String(fallback == null ? '' : fallback).trim();
    if (!raw || isLikelyMojibake(raw)) {
        if (backup && !isLikelyMojibake(backup)) {
            return backup;
        }
        return '';
    }
    return raw;
}

function normalizeRiskLevel(level) {
    const raw = (level || '').toString().trim();
    const RISK_LEVEL_DESC = {
        '低': '仅咨询 / 信息不足 / 冲突极轻微，无升级迹象',
        '中': '矛盾较明显，存在纠纷或情绪激动，有一定对抗但无明确人身安全威胁',
        '高': '存在明显升级或现实危险，涉及威胁、骚扰、暴力苗头、脆弱群体权益、疑似违法或紧急安全风险'
    };
    if (RISK_LEVEL_DESC[raw]) {
        return raw;
    }
    const normalized = raw.toUpperCase();
    const map = {
        R0: '低',
        R1: '低',
        R2: '中',
        R3: '高',
        R4: '高',
        LOW: '低',
        MEDIUM: '中',
        HIGH: '高'
    };
    return map[normalized] || '';
}

function buildRiskTags(data, summaryText) {
    const tags = [];
    const text = `${String(summaryText || '')} ${String((data && data.caseText) || '')}`;
    if (String((data && data.riskLevel) || '').trim() === '高') {
        tags.push('建议优先处置');
    }
    if (/未成年|学生|儿童/.test(text)) {
        tags.push('未成年人相关');
    }
    if (/冲突|肢体|打|伤/.test(text)) {
        tags.push('疑似肢体冲突');
    }
    if (/网络|舆情|传播|围观/.test(text)) {
        tags.push('舆情传播风险');
    }
    if (!tags.length) {
        tags.push('建议优先核验');
        tags.push('关注情绪变化');
    }
    return Array.from(new Set(tags)).slice(0, 6);
}

function buildExcelBatchIdempotencyKey(rows, file) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const filePart = file ? `${file.name || ''}|${file.size || 0}|${file.lastModified || 0}` : '';
    const rowPart = safeRows.map((item) => `${(item && item.caseText) || ''}#${(item && item.eventSource) || ''}`).join('||');
    const raw = `${filePart}::${rowPart}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash) + raw.charCodeAt(i);
        hash |= 0;
    }
    return `excel-batch-${safeRows.length}-${Math.abs(hash)}`;
}

function formatAudioDuration(seconds) {
    const sec = Math.max(0, Math.floor(Number(seconds) || 0));
    const minute = Math.floor(sec / 60);
    const rest = sec % 60;
    return `${String(minute).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function formatTimelineTime(value) {
    if (!value) {
        return '-';
    }
    const date = parseTimelineDate(value);
    if (!date) {
        return String(value);
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function parseTimelineDate(value) {
    if (!value) {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
}

function formatClueTimeDisplay(value) {
    if (!value) {
        return '-';
    }
    const text = String(value).trim();
    if (!text) {
        return '-';
    }
    return text.replace('T', ' ').slice(0, 16);
}

function toClueDateTimeLocal(value) {
    if (!value) {
        return '';
    }
    const normalized = String(value).trim().replace(' ', 'T');
    return normalized.slice(0, 16);
}
