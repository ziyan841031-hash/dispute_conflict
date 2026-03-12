// 案件录入相关函数（文本、Excel、音频）

async function requestAudioIngest(formData) {
    const res = await fetchWithTimeout(`${API_BASE}/cases/ingest/audio`, {method: 'POST', body: formData}, AUDIO_INGEST_WAIT_MS);
    if (!res.ok) {
        throw new Error('音频解析失败');
    }
    return await res.json();
}

async function submitText() {
    const caseTextValue = String((document.getElementById('caseText') || {}).value || '').trim();
    if (!caseTextValue) {
        alert('请先输入案件描述后再提交');
        return;
    }

    openParseModal('text');
    setLoading('text');

    const payload = {
        caseText: caseTextValue,
        eventSource: document.getElementById('eventSource').value
    };

    const res = await fetch(`${API_BASE}/cases/ingest/text`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    const textJson = await res.json();
    markDone('text');

    const caseId = textJson && textJson.data ? textJson.data.id : null;

    setLoading('classify');
    const classifyRes = await fetch(`${API_BASE}/cases/intelligent-classify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({caseId, caseText: payload.caseText})
    });
    await classifyRes.json();
    markDone('classify');
    finishParseAndGoCases();
}

async function runExcelBatchWithConcurrency(rows, file, concurrency = 5) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const details = [];
    let cursor = 0;
    const total = safeRows.length;

    async function worker() {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= total) {
                return;
            }
            const row = safeRows[index];
            const idempotencyKey = `${buildExcelBatchIdempotencyKey([row], file)}-${index}`;
            try {
                const res = await fetchWithTimeout(`${API_BASE}/cases/ingest/excel-batch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(row)
                });
                const json = await res.json();
                const data = (json && json.data) ? json.data : {};
                details.push({
                    success: Boolean(data.success),
                    caseId: data.caseId,
                    caseNo: data.caseNo,
                    error: data.error || ''
                });
            } catch (error) {
                details.push({
                    success: false,
                    error: (error && error.message) || '处理失败'
                });
            }
            const finished = details.length;
            updateExcelProgress(total, finished);
        }
    }

    const workerCount = Math.min(Math.max(1, concurrency), Math.max(1, total));
    const tasks = [];
    for (let i = 0; i < workerCount; i++) {
        tasks.push(worker());
    }
    await Promise.all(tasks);

    const success = details.filter((item) => item.success).length;
    const failed = total - success;
    return {total, success, failed, details};
}

async function submitExcel() {
    if (excelSubmitting) {
        return;
    }
    const file = document.getElementById('excelFile').files[0];
    if (!file) {
        alert('请先选择 Excel 文件');
        return;
    }

    excelSubmitting = true;
    setExcelSubmitState(true);
    openParseModal('excel');
    setParseModalMessage('Excel 数据解析中', '正在读取并校验数据，请稍候...');
    updateExcelProgress(0, 0);
    setLoading('text');

    try {
        const form = new FormData();
        form.append('file', file);
        const excelRes = await fetchWithTimeout(`${API_BASE}/cases/ingest/excel`, {method: 'POST', body: form});
        const excelJson = await excelRes.json();
        const parsedRows = Array.isArray(excelJson && excelJson.data) ? excelJson.data : [];
        if (!parsedRows.length) {
            throw new Error('Excel 中未解析到有效数据');
        }
        const excelEventSource = String((document.getElementById('excelEventSource') || {}).value || '部门流转').trim() || '部门流转';
        const rowsForBatch = parsedRows.map((item) => ({
            ...(item || {}),
            eventSource: excelEventSource
        }));

        markDone('text');
        setParseModalMessage('Excel 批量导入中', '正在批量入库，请稍候...');
        const total = rowsForBatch.length;
        updateExcelProgress(total, 0);

        setLoading('classify');
        const batchData = await runExcelBatchWithConcurrency(rowsForBatch, file, 5);
        const finished = Number(batchData.success || 0) + Number(batchData.failed || 0);
        updateExcelProgress(total, finished);

        markDone('classify');
        finishParseAndGoCases();
    } catch (error) {
        console.error(error);
        if (error && error.name === 'AbortError') {
            alert('处理超时，请稍后再试');
        } else {
            alert('Excel 导入失败，请稍后重试');
        }
        closeParseModal();
    } finally {
        excelSubmitting = false;
        setExcelSubmitState(false);
    }
}

async function submitAudio() {
    const file = document.getElementById('audioFile').files[0];
    if (!file) {
        alert('请先选择音频文件');
        return;
    }

    openParseModal('audio');
    setLoading('audio');

    const form = new FormData();
    form.append('file', file);
    setParseModalMessage('音频解析中', '正在进行音频转写和识别，请稍候...');
    let audioData = {};
    try {
        const audioJson = await requestAudioIngest(form);
        audioData = audioJson && audioJson.data ? audioJson.data : {};
    } catch (error) {
        console.error(error);
        alert('音频解析失败，请检查后重试');
        closeParseModal();
        return;
    }

    const recognizedText = (audioData && audioData.text) ? audioData.text : '';
    const audioFileUrl = (audioData && audioData.audioFileUrl) ? audioData.audioFileUrl : '';
    markDone('audio');

    setLoading('text');
    const textPayload = {
        caseText: recognizedText,
        eventSource: '来电求助',
        audioFileUrl
    };
    const textRes = await fetch(`${API_BASE}/cases/ingest/text`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(textPayload)
    });
    const textJson = await textRes.json();
    markDone('text');

    const caseId = textJson && textJson.data ? textJson.data.id : null;

    setLoading('classify');
    const classifyRes = await fetch(`${API_BASE}/cases/intelligent-classify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({caseId, caseText: textPayload.caseText})
    });
    await classifyRes.json();
    markDone('classify');
    finishParseAndGoCases();
}

function finishParseAndGoCases() {
    setTimeout(() => {
        window.location.href = 'cases.html';
    }, 600);
}

// 解析模态框相关
function openParseModal(mode) {
    parseStatus.audio = false;
    parseStatus.text = false;
    parseStatus.classify = false;
    const audioStep = document.getElementById('step-audio');
    if (audioStep) {
        audioStep.classList.toggle('hidden', mode !== 'audio');
    }
    const textStepText = document.querySelector('#icon-text + .parse-step-text');
    const classifyStepText = document.querySelector('#icon-classify + .parse-step-text');
    if (textStepText) {
        textStepText.textContent = mode === 'excel' ? '解析 Excel 数据' : '提取案件要素';
    }
    if (classifyStepText) {
        classifyStepText.textContent = mode === 'excel' ? '批量入库处理' : '智能分类分析';
    }
    setParseModalMessage('正在处理', '请稍候...');
    const progressEl = document.getElementById('excelProgressText');
    if (progressEl) {
        progressEl.classList.toggle('hidden', mode !== 'excel');
        if (mode !== 'excel') {
            progressEl.textContent = '';
        }
    }
    refreshAllIcons();
    document.getElementById('parseModal').classList.remove('hidden');
}

function closeParseModal() {
    document.getElementById('parseModal').classList.add('hidden');
}

function setParseModalMessage(title, tip) {
    const titleEl = document.getElementById('parseModalTitle');
    const tipEl = document.getElementById('parseModalTip');
    const safeTitle = safeUiCopy(title, '正在处理');
    const safeTip = safeUiCopy(tip, '请稍候...');
    if (titleEl) {
        titleEl.textContent = safeTitle;
    }
    if (tipEl) {
        tipEl.textContent = safeTip;
    }
}

function updateExcelProgress(total, done) {
    const progressEl = document.getElementById('excelProgressText');
    if (!progressEl) {
        return;
    }
    progressEl.classList.remove('hidden');
    progressEl.textContent = `总计 ${total} 条，已处理 ${done} 条`;
}

function setLoading(type) {
    const icon = document.getElementById(`icon-${type}`);
    if (!icon) {
        return;
    }
    icon.textContent = '●';
    icon.classList.add('loading');
    icon.classList.remove('done');
}

function markDone(type) {
    parseStatus[type] = true;
    const icon = document.getElementById(`icon-${type}`);
    if (!icon) {
        return;
    }
    icon.textContent = '✓';
    icon.classList.add('done');
    icon.classList.remove('loading');
}

function refreshAllIcons() {
    refreshOneIcon('audio');
    refreshOneIcon('text');
    refreshOneIcon('classify');
}

function refreshOneIcon(type) {
    const icon = document.getElementById(`icon-${type}`);
    if (!icon) {
        return;
    }
    if (parseStatus[type]) {
        icon.textContent = '✓';
        icon.classList.add('done');
        icon.classList.remove('loading');
    } else {
        icon.textContent = '○';
        icon.classList.remove('done');
        icon.classList.remove('loading');
    }
}
