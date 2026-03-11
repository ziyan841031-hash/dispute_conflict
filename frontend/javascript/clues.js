// 线索管理相关函数

function openClueRecordsDialog() {
    openHomeToolDialog('区域施工与活动记录', 'clue-records.html?popup=1');
}

function getClueFormValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

function buildCluePayloadFromForm() {
    return {
        district: getClueFormValue('clueFormDistrict'),
        streetTown: getClueFormValue('clueFormStreetTown'),
        clue: getClueFormValue('clueFormClue'),
        clueInterpretation: getClueFormValue('clueFormInterpretation'),
        clueSource: getClueFormValue('clueFormSource'),
        clueTime: getClueFormValue('clueFormTime') ? `${getClueFormValue('clueFormTime')}:00` : '',
        status: getClueFormValue('clueFormStatus')
    };
}

function resetClueFormFields() {
    ['clueFormDistrict', 'clueFormStreetTown', 'clueFormClue', 'clueFormInterpretation', 'clueFormSource', 'clueFormTime'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
        }
    });
    const statusEl = document.getElementById('clueFormStatus');
    if (statusEl) {
        statusEl.value = '待核实';
    }
}

function openClueForm(item) {
    const modal = document.getElementById('clueFormModal');
    const titleEl = document.getElementById('clueFormTitle');
    if (!modal || !titleEl) {
        return;
    }
    clueFormEditingId = item && item.id ? item.id : null;
    titleEl.textContent = clueFormEditingId ? '编辑记录' : '新增记录';
    resetClueFormFields();
    if (item) {
        const districtEl = document.getElementById('clueFormDistrict');
        const streetEl = document.getElementById('clueFormStreetTown');
        const clueEl = document.getElementById('clueFormClue');
        const interpretationEl = document.getElementById('clueFormInterpretation');
        const sourceEl = document.getElementById('clueFormSource');
        const timeEl = document.getElementById('clueFormTime');
        const statusEl = document.getElementById('clueFormStatus');
        if (districtEl) districtEl.value = item.district || '';
        if (streetEl) streetEl.value = item.streetTown || '';
        if (clueEl) clueEl.value = item.clue || '';
        if (interpretationEl) interpretationEl.value = item.clueInterpretation || '';
        if (sourceEl) sourceEl.value = item.clueSource || '';
        if (timeEl) timeEl.value = toClueDateTimeLocal(item.clueTime);
        if (statusEl) statusEl.value = item.status || '待核实';
    }
    modal.classList.remove('hidden');
    modal.onclick = function (event) {
        if (event.target === modal) {
            closeClueForm();
        }
    };
}

function closeClueForm() {
    const modal = document.getElementById('clueFormModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    clueFormEditingId = null;
}

function resetClueFilters() {
    ['clueKeyword', 'clueDistrict', 'clueStreetTown'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
        }
    });
    const statusEl = document.getElementById('clueStatus');
    if (statusEl) {
        statusEl.value = '';
    }
    loadClueRecords();
}

async function loadClueRecords() {
    const tbody = document.getElementById('clueTableBody');
    if (!tbody) {
        return;
    }
    tbody.innerHTML = '<tr><td colspan="8" class="cases-empty">加载中...</td></tr>';
    const params = new URLSearchParams({
        keyword: getClueFormValue('clueKeyword'),
        district: getClueFormValue('clueDistrict'),
        streetTown: getClueFormValue('clueStreetTown'),
        status: getClueFormValue('clueStatus')
    });
    try {
        const res = await fetch(`${API_BASE}/clues?${params.toString()}`);
        const json = await res.json();
        const rows = Array.isArray(json && json.data) ? json.data : [];
        tbody.innerHTML = '';
        rows.forEach((item) => {
            const tr = document.createElement('tr');
            const clueText = item.clue || '-';
            const interpretationText = item.clueInterpretation || '-';
            tr.innerHTML = `
        <td>${item.district || '-'}</td>
        <td>${item.streetTown || '-'}</td>
        <td title="${clueText}">${clueText}</td>
        <td title="${interpretationText}">${interpretationText}</td>
        <td>${item.clueSource || '-'}</td>
        <td>${formatClueTimeDisplay(item.clueTime)}</td>
        <td><span class="clue-status-badge">${item.status || '-'}</span></td>
        <td class="action-col">
          <div class="clue-action-row">
            <button type="button" class="clue-link-btn" onclick='editClueRecord(${JSON.stringify(item.id)})'>编辑</button>
            <button type="button" class="clue-link-btn clue-link-btn-danger" onclick="deleteClueRecord(${item.id})">删除</button>
          </div>
        </td>`;
            tr.dataset.row = JSON.stringify(item);
            tbody.appendChild(tr);
        });
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="cases-empty">暂无记录</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" class="cases-empty">加载失败，请稍后重试</td></tr>';
    }
}

async function editClueRecord(id) {
    if (!id) {
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/clues/${id}`);
        const json = await res.json();
        if (!json || json.code !== 0 || !json.data) {
            throw new Error('加载失败');
        }
        openClueForm(json.data);
    } catch (error) {
        alert('记录加载失败，请稍后重试');
    }
}

async function saveClueRecord() {
    const payload = buildCluePayloadFromForm();
    if (!payload.district || !payload.streetTown || !payload.clue || !payload.clueTime || !payload.status) {
        alert('请完整填写区、街道、线索、时间、状态');
        return;
    }
    const editingId = clueFormEditingId;
    const url = editingId ? `${API_BASE}/clues/${editingId}` : `${API_BASE}/clues`;
    const method = editingId ? 'PUT' : 'POST';
    try {
        const res = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (!json || json.code !== 0) {
            throw new Error((json && json.message) || '保存失败');
        }
        closeClueForm();
        loadClueRecords();
    } catch (error) {
        alert(error && error.message ? error.message : '保存失败，请稍后重试');
    }
}

async function deleteClueRecord(id) {
    if (!id) {
        return;
    }
    if (!window.confirm('确认删除这条记录吗？')) {
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/clues/${id}`, {method: 'DELETE'});
        const json = await res.json();
        if (!json || json.code !== 0) {
            throw new Error((json && json.message) || '删除失败');
        }
        loadClueRecords();
    } catch (error) {
        alert(error && error.message ? error.message : '删除失败，请稍后重试');
    }
}
