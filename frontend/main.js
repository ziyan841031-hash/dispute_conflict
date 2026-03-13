
// main.js
function safeInit() {
    if (typeof initUploadDropzones === 'function') {
        initUploadDropzones();
    } else {
        console.warn('initUploadDropzones not ready, retrying...');
        setTimeout(safeInit, 50);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
} else {
    safeInit();
}
