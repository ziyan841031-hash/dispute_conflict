// 文件上传相关函数

function clearSelectedFile(inputId) {
    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(`${inputId}Dropzone`);
    const preview = document.getElementById(`${inputId}Preview`);
    const nameNode = document.getElementById(`${inputId}Name`);
    const audioPlayer = document.getElementById('audioFilePlayer');
    if (input) {
        input.value = '';
    }
    if (nameNode) {
        nameNode.textContent = '未选择文件';
    }
    if (preview) {
        preview.classList.add('hidden');
    }
    if (dropzone) {
        dropzone.classList.remove('hidden');
    }
    if (inputId === 'audioFile' && audioPlayer) {
        if (uploadPreviewUrls.audioFile) {
            URL.revokeObjectURL(uploadPreviewUrls.audioFile);
            uploadPreviewUrls.audioFile = '';
        }
        audioPlayer.removeAttribute('src');
        audioPlayer.load();
    }
}

function initFileDropzone(inputId, acceptChecker) {
    const input = document.getElementById(inputId);
    const dropzone = document.getElementById(`${inputId}Dropzone`);
    const fileName = document.getElementById(`${inputId}Name`);
    const preview = document.getElementById(`${inputId}Preview`);
    const audioPlayer = inputId === 'audioFile' ? document.getElementById('audioFilePlayer') : null;
    if (!input || !dropzone || !fileName || !preview) {
        return;
    }

    const syncView = () => {
        const selected = input.files && input.files[0] ? input.files[0] : null;
        if (!selected) {
            fileName.textContent = '未选择文件';
            preview.classList.add('hidden');
            dropzone.classList.remove('hidden');
            if (audioPlayer) {
                if (uploadPreviewUrls.audioFile) {
                    URL.revokeObjectURL(uploadPreviewUrls.audioFile);
                    uploadPreviewUrls.audioFile = '';
                }
                audioPlayer.removeAttribute('src');
                audioPlayer.load();
            }
            return;
        }

        fileName.textContent = selected.name;
        preview.classList.remove('hidden');
        dropzone.classList.add('hidden');
        if (audioPlayer) {
            if (uploadPreviewUrls.audioFile) {
                URL.revokeObjectURL(uploadPreviewUrls.audioFile);
            }
            uploadPreviewUrls.audioFile = URL.createObjectURL(selected);
            audioPlayer.src = uploadPreviewUrls.audioFile;
        }
    };

    input.addEventListener('change', syncView);

    const setDragState = (isActive) => {
        dropzone.classList.toggle('dragover', Boolean(isActive));
    };

    ['dragenter', 'dragover'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragState(true);
        });
    });

    ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
        dropzone.addEventListener(eventName, (event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragState(false);
        });
    });

    dropzone.addEventListener('drop', (event) => {
        const files = event.dataTransfer && event.dataTransfer.files;
        if (!files || !files.length) {
            return;
        }
        const picked = files[0];
        if (acceptChecker && !acceptChecker(picked)) {
            alert('文件类型不符合要求，请重新选择');
            return;
        }
        const transfer = new DataTransfer();
        transfer.items.add(picked);
        input.files = transfer.files;
        syncView();
    });

    syncView();
}

function initUploadDropzones() {
    initFileDropzone('audioFile', (file) => String(file.type || '').startsWith('audio/'));
    initFileDropzone('excelFile', (file) => /\.(xlsx|xls)$/i.test(file.name || ''));
}

function setExcelSubmitState(submitting) {
    const btn = document.getElementById('excelSubmitBtn');
    if (!btn) {
        return;
    }
    btn.disabled = submitting;
    btn.textContent = submitting ? '提交中...' : '提交批量导入';
}
