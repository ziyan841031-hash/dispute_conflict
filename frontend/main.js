function safeInit() {
    if (typeof initUploadDropzones === 'function') {
        initUploadDropzones();
    }
    normalizeSidebarNavigation();
}

function normalizeSidebarNavigation() {
    var pathname = (window.location.pathname || '').replace(/\\/g, '/');
    var page = pathname.split('/').pop() || 'index.html';
    var links = [
        { href: 'index.html', label: '\u9996\u9875', active: page === 'index.html' || page === 'home.html' || page === '' },
        { href: 'gov-consult.html', label: '\u54a8\u8be2\u670d\u52a1', active: page === 'gov-consult.html' },
        { href: 'case-import.html', label: '\u6848\u4ef6\u5bfc\u5165', active: page === 'case-import.html' },
        { href: 'cases.html', label: '\u6848\u4ef6\u7ba1\u7406', active: page === 'cases.html' || page === 'assistant.html' },
        { href: 'insight-bubble.html', label: '\u6570\u636e\u6d1e\u5bdf', active: page === 'insight-bubble.html' || page === 'stats-insight.html' },
        { href: 'smart-tools.html', label: '\u667a\u80fd\u5de5\u5177', active: page === 'smart-tools.html' }
    ];

    document.querySelectorAll('.sidebar').forEach(function (sidebar) {
        var title = sidebar.querySelector('h1');
        if (!title) {
            return;
        }
        Array.prototype.slice.call(sidebar.querySelectorAll('a')).forEach(function (anchor) {
            anchor.remove();
        });
        links.forEach(function (item) {
            var anchor = document.createElement('a');
            anchor.href = item.href;
            anchor.textContent = item.label;
            if (item.active) {
                anchor.classList.add('active');
            }
            sidebar.appendChild(anchor);
        });
    });
}

window.normalizeSidebarNavigation = normalizeSidebarNavigation;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', safeInit);
} else {
    safeInit();
}