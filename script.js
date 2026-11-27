// 监听侧边栏切换按钮的点击事件
const sidebar = document.querySelector('.sidebar');
const content = document.querySelector('.content');
const sidebarOverlay = document.querySelector('.sidebar-overlay');
const contentFrame = document.querySelector('iframe[name="contentFrame"]');
const breadcrumbText = document.getElementById('cscCurrentPageTitle');
const openTabLink = document.getElementById('cscOpenTabLink');
const sidebarSearch = document.getElementById('cscSidebarSearch');
const desktopNavToggle = document.getElementById('cscDesktopNavToggle');

function toggleDesktopSidebar(forceCollapsed) {
    if (window.innerWidth <= 768) {
        setSidebarState(!sidebar.classList.contains('show'));
        return;
    }
    const next = typeof forceCollapsed === 'boolean'
        ? forceCollapsed
        : !document.body.classList.contains('csc-sidebar-collapsed');
    document.body.classList.toggle('csc-sidebar-collapsed', next);
    if (desktopNavToggle) {
        desktopNavToggle.setAttribute('aria-pressed', String(!next));
        desktopNavToggle.title = next ? '展開左側選單' : '收合左側選單';
    }
}

if (desktopNavToggle) {
    desktopNavToggle.addEventListener('click', function () {
        toggleDesktopSidebar();
    });
}

function setSidebarState(isOpen) {
    sidebar.classList.toggle('show', isOpen);
    content.classList.toggle('sidebar-visible', isOpen && window.innerWidth > 768);
    sidebarOverlay.classList.toggle('show', isOpen && window.innerWidth <= 768);
    sidebarOverlay.setAttribute('aria-hidden', String(!isOpen));
}

const layoutButtons = Array.from(document.querySelectorAll('[data-site-layout]'));

function applyShellLayout(layout) {
    const isRedesign = layout === 'redesign';
    document.body.classList.toggle('layout-redesign', isRedesign);
    if (!isRedesign) {
        document.body.classList.remove('csc-sidebar-collapsed');
    }
    layoutButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.dataset.siteLayout === layout));
    });
    setSidebarState(isRedesign && window.innerWidth > 768);

    // When switching back to original, clear any active sidebar filter so original navigation stays intact
    if (!isRedesign && sidebarSearch && sidebarSearch.value) {
        sidebarSearch.value = '';
        filterSidebarLinks('');
    }
}

function setSiteLayout(layout) {
    if (window.CSCTheme) {
        window.CSCTheme.setMode(layout);
    } else {
        applyShellLayout(layout);
    }
}

layoutButtons.forEach(function (button) {
    button.addEventListener('click', function () {
        setSiteLayout(button.dataset.siteLayout);
    });
});

if (window.CSCTheme) {
    window.CSCTheme.onModeChange(applyShellLayout);
    applyShellLayout(window.CSCTheme.getMode());
} else {
    applyShellLayout('redesign');
}

// Keep iframe synced on every navigation load
if (contentFrame) {
    contentFrame.addEventListener('load', function () {
        const mode = window.CSCTheme ? window.CSCTheme.getMode() : 'redesign';
        if (contentFrame.contentWindow) {
            try {
                contentFrame.contentWindow.postMessage({ type: 'csc-mode-change', mode: mode }, '*');
            } catch (_) {}
        }
    });
}

window.addEventListener('resize', function () {
    const isRedesign = document.body.classList.contains('layout-redesign');
    if (isRedesign && window.innerWidth > 768) {
        setSidebarState(true);
    } else {
        setSidebarState(sidebar.classList.contains('show'));
    }
});

document.querySelector('.sidebar-toggle').addEventListener('click', function () {
    const isOpen = !sidebar.classList.contains('show');
    setSidebarState(isOpen);

    // 原版模式：當側邊欄顯示時，保持原本全部折疊行為
    if (isOpen && !document.body.classList.contains('layout-redesign')) {
        document.querySelectorAll('.collapsible').forEach(function (collapsible) {
            collapsible.classList.remove('active');
            collapsible.nextElementSibling.classList.remove('show');
        });
    }
});

sidebarOverlay.addEventListener('click', () => setSidebarState(false));

// Badge uncreated/PDF links cleanly (only visible in redesign mode via .csc-only-inline)
const MISSING_PAGES = new Set([
    'item3-page6.html',
    'coal-preparation-page1.html',
    'coal-preparation-page3.html',
    'coal-preparation-page5.html',
    'coal-preparation-page6.html'
]);

const navLinks = Array.from(document.querySelectorAll('.sidebar ul li a'));
navLinks.forEach(function (link) {
    const href = (link.getAttribute('href') || '').trim();
    const file = href.split('/').pop().toLowerCase();
    if (MISSING_PAGES.has(file)) {
        const badge = document.createElement('span');
        badge.className = 'csc-nav-badge is-wip csc-only-inline';
        badge.textContent = '待建置';
        link.appendChild(badge);
    } else if (href.toLowerCase().endsWith('.pdf')) {
        const badge = document.createElement('span');
        badge.className = 'csc-nav-badge is-pdf csc-only-inline';
        badge.textContent = 'PDF';
        link.appendChild(badge);
    }
});

function setActiveNavByFile(file) {
    const target = String(file || '').toLowerCase();
    navLinks.forEach(function (link) {
        const href = (link.getAttribute('href') || '').split('/').pop().toLowerCase();
        const isMatch = Boolean(target) && href === target;
        link.classList.toggle('is-active', isMatch);
        if (isMatch && document.body.classList.contains('layout-redesign')) {
            // Auto-expand ancestor collapsible groups
            let ul = link.closest('ul.collapsible-content');
            while (ul) {
                ul.classList.add('show');
                const heading = ul.previousElementSibling;
                if (heading && heading.classList.contains('collapsible')) {
                    heading.classList.add('active');
                }
                ul = ul.parentElement ? ul.parentElement.closest('ul.collapsible-content') : null;
            }
        }
    });
}

// Listen for page-loaded notifications and map sidebar toggle from subpages inside iframe
window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'csc-toggle-sidebar') {
        toggleDesktopSidebar();
        return;
    }
    if (data.type !== 'csc-page-loaded') return;
    const isMap = String(data.file || '').toLowerCase() === 'electronic-map.html';
    document.body.classList.toggle('csc-viewing-map', isMap);
    if (breadcrumbText) {
        breadcrumbText.textContent = data.group && data.group !== '總覽'
            ? data.group + ' / ' + data.title
            : data.title;
    }
    if (openTabLink && data.file) {
        openTabLink.href = data.file;
    }
    setActiveNavByFile(data.file);
});

// Expand "參考資料" by default on initial load in redesign mode for easy discovery
if (document.body.classList.contains('layout-redesign')) {
    const headings = Array.from(document.querySelectorAll('.sidebar h2.collapsible'));
    const refHeading = headings.find(function (h) { return h.textContent.includes('參考資料'); });
    if (refHeading && refHeading.nextElementSibling) {
        refHeading.classList.add('active');
        refHeading.nextElementSibling.classList.add('show');
    }
}

// 监听侧边栏内选项的点击事件
document.querySelectorAll('.sidebar a').forEach(function (link) {
    link.addEventListener('click', function (e) {
        if (link.classList.contains('sidebar-home-link') && document.body.classList.contains('layout-redesign') && contentFrame) {
            e.preventDefault();
            contentFrame.src = 'welcome.html';
        }
        // 在选择完选项后自动关闭侧边栏（移动端）
        if (window.innerWidth <= 768) {
            setSidebarState(false);
        }
    });
});

// 监听可折叠标题的点击事件
document.querySelectorAll('.collapsible').forEach(function (collapsible) {
    collapsible.addEventListener('click', function () {
        this.classList.toggle('active');
        this.nextElementSibling.classList.toggle('show');
    });
});

// Sidebar quick search filter (Redesign mode)
const emptyNotice = document.createElement('div');
emptyNotice.className = 'csc-sidebar-empty csc-only';
emptyNotice.textContent = '找不到相符的頁面';
emptyNotice.hidden = true;
document.querySelector('.sidebar-content')?.appendChild(emptyNotice);

function filterSidebarLinks(rawQuery) {
    const query = String(rawQuery || '').trim().toLowerCase();
    const topHeadings = Array.from(document.querySelectorAll('.sidebar-content > h2.collapsible'));
    let totalMatches = 0;

    topHeadings.forEach(function (h2) {
        if (h2.style.display === 'none') return; // respect hidden section
        const ul = h2.nextElementSibling;
        if (!ul) return;

        if (!query) {
            h2.style.display = '';
            ul.style.display = '';
            ul.querySelectorAll('li').forEach(function (li) { li.style.display = ''; });
            ul.querySelectorAll('h3.collapsible').forEach(function (h3) {
                h3.style.display = '';
                if (h3.nextElementSibling) h3.nextElementSibling.style.display = '';
            });
            return;
        }

        let sectionHasMatch = false;
        const h2Matches = h2.textContent.toLowerCase().includes(query);

        // Handle direct links and nested h3 groups
        Array.from(ul.children).forEach(function (li) {
            const subH3 = li.querySelector(':scope > h3.collapsible');
            if (subH3) {
                const subUl = subH3.nextElementSibling;
                let subHasMatch = false;
                const h3Matches = subH3.textContent.toLowerCase().includes(query);
                Array.from(subUl.querySelectorAll('li')).forEach(function (subLi) {
                    const m = h2Matches || h3Matches || subLi.textContent.toLowerCase().includes(query);
                    subLi.style.display = m ? '' : 'none';
                    if (m) { subHasMatch = true; totalMatches++; }
                });
                li.style.display = subHasMatch ? '' : 'none';
                if (subHasMatch) {
                    sectionHasMatch = true;
                    subH3.classList.add('active');
                    subUl.classList.add('show');
                }
            } else {
                const m = h2Matches || li.textContent.toLowerCase().includes(query);
                li.style.display = m ? '' : 'none';
                if (m) { sectionHasMatch = true; totalMatches++; }
            }
        });

        h2.style.display = sectionHasMatch ? '' : 'none';
        if (sectionHasMatch) {
            h2.classList.add('active');
            ul.classList.add('show');
        } else {
            ul.classList.remove('show');
        }
    });

    emptyNotice.hidden = !query || totalMatches > 0;
}

if (sidebarSearch) {
    sidebarSearch.addEventListener('input', function () {
        filterSidebarLinks(sidebarSearch.value);
    });

    document.addEventListener('keydown', function (e) {
        if (!document.body.classList.contains('layout-redesign')) return;
        const tag = (document.activeElement && document.activeElement.tagName || '').toLowerCase();
        if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
            e.preventDefault();
            sidebarSearch.focus();
            sidebarSearch.select();
        } else if (e.key === 'Escape' && document.activeElement === sidebarSearch) {
            sidebarSearch.value = '';
            filterSidebarLinks('');
            sidebarSearch.blur();
        }
    });
}
