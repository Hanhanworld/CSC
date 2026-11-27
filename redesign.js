/* ==========================================================================
   CSC 檢修知識庫 — 統一新版互動引擎與「原版 / 新版」即時切換同步器
   ========================================================================== */
(function () {
    'use strict';

    const STORAGE_KEY = 'csc-site-mode';
    const DEFAULT_MODE = 'redesign';

    function getCurrentFile() {
        const path = decodeURIComponent(window.location.pathname || '');
        const file = path.split('/').pop() || 'index.html';
        return file || 'index.html';
    }

    function readMode() {
        try {
            const params = new URLSearchParams(window.location.search);
            const urlMode = params.get('mode');
            if (urlMode === 'original' || urlMode === 'redesign') {
                return urlMode;
            }
        } catch (_) {}

        try {
            if (window.parent && window.parent !== window && window.parent.__CSC_MODE__) {
                return window.parent.__CSC_MODE__;
            }
        } catch (_) {}

        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved === 'original' || saved === 'redesign') {
                return saved;
            }
        } catch (_) {}

        return DEFAULT_MODE;
    }

    function saveMode(mode) {
        window.__CSC_MODE__ = mode;
        try {
            window.localStorage.setItem(STORAGE_KEY, mode);
        } catch (_) {}
    }

    const IS_IN_IFRAME = (function () {
        try {
            return window.self !== window.top;
        } catch (_) {
            return true;
        }
    })();

    const PAGE_FILE = getCurrentFile();
    const PAGE_KEY = PAGE_FILE.toLowerCase();

    // Apply class synchronously before first paint to prevent FOUC
    let currentMode = readMode();
    window.__CSC_MODE__ = currentMode;
    document.documentElement.classList.toggle('csc-redesign', currentMode === 'redesign');
    document.documentElement.classList.toggle('csc-in-iframe', IS_IN_IFRAME);
    if (['4-20ma-converter.html', 'pressure-converter.html', 'temperature-converter.html'].includes(PAGE_KEY)) {
        document.documentElement.classList.add('csc-page-converter-html');
    }

    const modeListeners = [];
    function onModeChange(fn) {
        modeListeners.push(fn);
    }

    function applyMode(mode, options) {
        const opts = options || {};
        const normalized = mode === 'original' ? 'original' : 'redesign';
        currentMode = normalized;
        if (!opts.skipSave) {
            saveMode(normalized);
        }
        document.documentElement.classList.toggle('csc-redesign', normalized === 'redesign');

        // Sync standalone switcher buttons if present
        document.querySelectorAll('[data-csc-mode-btn]').forEach(function (btn) {
            btn.setAttribute('aria-pressed', String(btn.dataset.cscModeBtn === normalized));
        });

        modeListeners.forEach(function (fn) {
            try { fn(normalized); } catch (_) {}
        });

        // Notify parent or child iframe
        if (!opts.skipPostMessage) {
            if (PAGE_KEY === 'index.html') {
                const frame = document.querySelector('iframe[name="contentFrame"]');
                if (frame && frame.contentWindow) {
                    try {
                        frame.contentWindow.postMessage({ type: 'csc-mode-change', mode: normalized }, '*');
                    } catch (_) {}
                }
            } else if (IS_IN_IFRAME && window.parent) {
                try {
                    window.parent.postMessage({ type: 'csc-mode-sync-from-child', mode: normalized }, '*');
                } catch (_) {}
            }
        }
    }

    window.CSCTheme = {
        getMode: function () { return currentMode; },
        setMode: applyMode,
        onModeChange: onModeChange
    };

    // Listen to cross-frame messages
    window.addEventListener('message', function (event) {
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'csc-mode-change' && (data.mode === 'original' || data.mode === 'redesign')) {
            applyMode(data.mode, { skipPostMessage: true });
        } else if (data.type === 'csc-request-mode' && PAGE_KEY === 'index.html') {
            const frame = document.querySelector('iframe[name="contentFrame"]');
            if (frame && frame.contentWindow) {
                try {
                    frame.contentWindow.postMessage({ type: 'csc-mode-change', mode: currentMode }, '*');
                } catch (_) {}
            }
        } else if (data.type === 'csc-mode-sync-from-child' && PAGE_KEY === 'index.html') {
            applyMode(data.mode, { skipPostMessage: true });
        }
    });

    // Listen to storage changes across tabs
    window.addEventListener('storage', function (event) {
        if (event.key === STORAGE_KEY && (event.newValue === 'original' || event.newValue === 'redesign')) {
            applyMode(event.newValue, { skipSave: true });
        }
    });

    // Request current mode from parent if inside iframe
    if (IS_IN_IFRAME && PAGE_KEY !== 'index.html') {
        try {
            window.parent.postMessage({ type: 'csc-request-mode' }, '*');
        } catch (_) {}
    }

    // Notify parent of page metadata when loaded inside iframe
    function notifyParentPageMeta() {
        if (!IS_IN_IFRAME || PAGE_KEY === 'index.html') return;
        const pageMeta = PAGE_TITLES[PAGE_KEY] || { title: document.title || PAGE_FILE, group: '' };
        try {
            window.parent.postMessage({
                type: 'csc-page-loaded',
                file: PAGE_FILE,
                title: pageMeta.title || document.title || PAGE_FILE,
                group: pageMeta.group || ''
            }, '*');
        } catch (_) {}
    }

    // Metadata catalog for breadcrumb, placeholders, and technical docs
    const PAGE_TITLES = {
        'welcome.html': { title: '檢修知識庫首頁', group: '總覽' },
        'electronic-map.html': { title: '電子地圖', group: '參考資料' },
        'manual.html': { title: '使用手冊下載', group: '參考資料' },
        'mcc.html': { title: 'MCC 位置查詢', group: '參考資料' },
        'motor_storage.html': { title: '馬達資料查詢', group: '參考資料' },
        'isolator.html': { title: 'M2DY 與 M2VS 信號隔離器差異', group: '參考資料 · 訊號隔離' },
        's5time.html': { title: 'SIEMENS S7 PLC S5TIME 格式', group: '參考資料 · PLC' },
        'pressure-converter.html': { title: '壓力單位換算', group: '現場換算工具' },
        '4-20ma-converter.html': { title: '4–20 mA 訊號換算', group: '現場換算工具' },
        'temperature-converter.html': { title: '溫度／RTD／TC 換算', group: '現場換算工具' },
        '4cdq_mcc_eocr.html': { title: '4CDQ MCC EOCR 設定與跳脫曲線', group: '參考資料 · 電氣保護' },
        'motorwiring.html': { title: '三相馬達接線圖', group: '參考資料 · 馬達維護' },
        'eckardt.html': { title: 'Eckardt SRI986 氣動閥介紹與校正', group: '修三 · CDQ 氣動閥' },
        'tdog-31.html': { title: '破碎機 VCB2 TOYO TDOG-31 電驛設定', group: '修三 · 煤製備破碎機' },
        'coal-preparation-page2.html': { title: 'SIWAREX 卡片設定與校正程式', group: '修三 · 煤製備秤重皮帶' },
        'coal-preparation-page4.html': { title: '破碎機檢修專區', group: '修三 · 煤製備' },
        'rexa.html': { title: '破碎機檢修選單 (PH12 / PH34)', group: '修三 · 煤製備' },
        'item3-page3.html': { title: 'CDQ 氣動閥廠牌指南', group: '修三 · CDQ' },
        'item3-page4.html': { title: 'AUMA 電動閥接線圖', group: '修三 · CDQ 電動閥' },
        'item3-page5.html': { title: 'Turbine Generator 設備列表', group: '修三 · CDQ' },
        'jordan.html': { title: 'Rotork JORDAN 轉速控制器', group: '修三 · 四階破碎機' },
        'item1-page1.html': { title: '修一 · 爐體周邊', group: '修一' },
        'item1-page2.html': { title: '修一 · 推焦車', group: '修一' },
        'item1-page3.html': { title: '修一 · 加料車', group: '修一' },
        'item1-page4.html': { title: '修一 · 導焦車', group: '修一' },
        'item1-page5.html': { title: '修一 · 淬火車', group: '修一' },
        'item2-page1.html': { title: '修二 · 爐體周邊', group: '修二' },
        'item2-page2.html': { title: '修二 · 推焦車', group: '修二' },
        'item2-page3.html': { title: '修二 · 加料車', group: '修二' },
        'item2-page4.html': { title: '修二 · 導焦車', group: '修二' },
        'item2-page5.html': { title: '修二 · 淬火車', group: '修二' },
        'item3-page1.html': { title: '修三 CDQ · 傳送器', group: '修三 · CDQ' },
        'item3-page2.html': { title: '修三 CDQ · 氣體分析', group: '修三 · CDQ' }
    };

    // =========================================================================
    // Toast Helper
    // =========================================================================
    let toastEl = null;
    let toastTimer = null;

    function showToast(message) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'csc-toast';
            toastEl.setAttribute('role', 'status');
            toastEl.setAttribute('aria-live', 'polite');
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = message;
        toastEl.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () {
            toastEl.classList.remove('is-visible');
        }, 1800);
    }

    function copyText(text, label) {
        const clean = String(text || '').trim();
        if (!clean) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(clean).then(function () {
                showToast('已複製 ' + (label || clean));
            }).catch(function () {
                fallbackCopy(clean, label);
            });
        } else {
            fallbackCopy(clean, label);
        }
    }

    function fallbackCopy(text, label) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('已複製 ' + (label || text));
        } catch (_) {}
        ta.remove();
    }

    // =========================================================================
    // Standalone Floating Mode Switcher (when page opened directly outside iframe)
    // =========================================================================
    function mountStandaloneSwitcher() {
        if (IS_IN_IFRAME || PAGE_KEY === 'index.html') return;
        const bar = document.createElement('div');
        bar.className = 'csc-standalone-switcher';
        bar.setAttribute('role', 'group');
        bar.setAttribute('aria-label', '切換原版與新版');
        bar.innerHTML =
            '<button type="button" data-csc-mode-btn="original" aria-pressed="' + (currentMode === 'original') + '" title="檢視原版網頁">原版</button>' +
            '<button type="button" data-csc-mode-btn="redesign" aria-pressed="' + (currentMode === 'redesign') + '" title="檢視優化新版">新版</button>';
        bar.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                applyMode(btn.dataset.cscModeBtn);
            });
        });
        document.body.appendChild(bar);
    }

    // =========================================================================
    // Universal Image Lightbox (Zoom / Pan / Gallery) for Technical Diagrams
    // =========================================================================
    function initLightbox(images) {
        if (!images || !images.length) return;

        const box = document.createElement('div');
        box.className = 'csc-lightbox';
        box.hidden = true;
        box.innerHTML =
            '<div class="csc-lightbox-bar">' +
                '<div class="csc-lightbox-caption" data-lb-caption></div>' +
                '<div class="csc-lightbox-controls">' +
                    '<button type="button" data-lb-action="out" title="縮小">−</button>' +
                    '<span class="csc-lightbox-zoom" data-lb-zoom>100%</span>' +
                    '<button type="button" data-lb-action="in" title="放大">+</button>' +
                    '<button type="button" data-lb-action="reset" title="重設縮放">重設</button>' +
                    '<button type="button" data-lb-action="close" title="關閉 (Esc)">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="csc-lightbox-stage" data-lb-stage>' +
                '<button type="button" class="csc-lightbox-nav prev" data-lb-action="prev" aria-label="上一張">‹</button>' +
                '<img data-lb-img alt="">' +
                '<button type="button" class="csc-lightbox-nav next" data-lb-action="next" aria-label="下一張">›</button>' +
            '</div>';
        document.body.appendChild(box);

        const lbImg = box.querySelector('[data-lb-img]');
        const lbCaption = box.querySelector('[data-lb-caption]');
        const lbZoom = box.querySelector('[data-lb-zoom]');
        const lbStage = box.querySelector('[data-lb-stage]');
        const prevBtn = box.querySelector('[data-lb-action="prev"]');
        const nextBtn = box.querySelector('[data-lb-action="next"]');

        let idx = 0;
        let scale = 1;
        let tx = 0;
        let ty = 0;
        let dragging = false;
        let startX = 0;
        let startY = 0;

        function renderTransform() {
            lbImg.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
            lbZoom.textContent = Math.round(scale * 100) + '%';
        }

        function resetTransform() {
            scale = 1;
            tx = 0;
            ty = 0;
            renderTransform();
        }

        function showAt(newIdx) {
            idx = (newIdx + images.length) % images.length;
            const target = images[idx];
            const fig = target.closest('figure');
            const cap = fig && fig.querySelector('figcaption')
                ? fig.querySelector('figcaption').textContent.trim()
                : (target.alt || '技術圖面');
            lbImg.src = target.src;
            lbImg.alt = cap;
            lbCaption.textContent = (images.length > 1 ? '(' + (idx + 1) + '/' + images.length + ') ' : '') + cap;
            prevBtn.hidden = images.length <= 1;
            nextBtn.hidden = images.length <= 1;
            resetTransform();
            box.hidden = false;
        }

        function closeBox() {
            box.hidden = true;
        }

        images.forEach(function (img, i) {
            img.classList.add('csc-zoomable-img');
            const fig = img.closest('figure');
            if (fig && !fig.querySelector('.csc-zoom-badge')) {
                const badge = document.createElement('span');
                badge.className = 'csc-zoom-badge csc-only';
                badge.textContent = '🔍 點擊放大';
                fig.appendChild(badge);
            }
            img.addEventListener('click', function () {
                if (currentMode !== 'redesign') return;
                showAt(i);
            });
        });

        box.querySelectorAll('[data-lb-action]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                const action = btn.dataset.lbAction;
                if (action === 'close') closeBox();
                else if (action === 'in') { scale = Math.min(5, scale * 1.25); renderTransform(); }
                else if (action === 'out') { scale = Math.max(0.5, scale / 1.25); renderTransform(); }
                else if (action === 'reset') resetTransform();
                else if (action === 'prev') showAt(idx - 1);
                else if (action === 'next') showAt(idx + 1);
            });
        });

        lbStage.addEventListener('wheel', function (e) {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
            scale = Math.max(0.5, Math.min(5, scale * factor));
            renderTransform();
        }, { passive: false });

        lbStage.addEventListener('dblclick', function () {
            if (scale > 1.05) resetTransform();
            else { scale = 2.2; renderTransform(); }
        });

        lbStage.addEventListener('pointerdown', function (e) {
            if (e.target.closest('button')) return;
            dragging = true;
            startX = e.clientX - tx;
            startY = e.clientY - ty;
            lbStage.classList.add('is-dragging');
            lbStage.setPointerCapture(e.pointerId);
        });

        lbStage.addEventListener('pointermove', function (e) {
            if (!dragging) return;
            tx = e.clientX - startX;
            ty = e.clientY - startY;
            renderTransform();
        });

        function stopDrag() {
            dragging = false;
            lbStage.classList.remove('is-dragging');
        }
        lbStage.addEventListener('pointerup', stopDrag);
        lbStage.addEventListener('pointercancel', stopDrag);

        document.addEventListener('keydown', function (e) {
            if (box.hidden) return;
            if (e.key === 'Escape') closeBox();
            else if (e.key === 'ArrowLeft' && images.length > 1) showAt(idx - 1);
            else if (e.key === 'ArrowRight' && images.length > 1) showAt(idx + 1);
            else if (e.key === '+' || e.key === '=') { scale = Math.min(5, scale * 1.25); renderTransform(); }
            else if (e.key === '-') { scale = Math.max(0.5, scale / 1.25); renderTransform(); }
            else if (e.key === '0') resetTransform();
        });
    }

    // =========================================================================
    // PAGE ENHANCERS
    // =========================================================================

    // --- 1. Welcome Dashboard (welcome.html) ---
    function enhanceWelcomePage() {
        document.body.classList.add('csc-page-welcome');

        const hero = document.createElement('section');
        hero.className = 'csc-welcome-hero csc-only';
        hero.innerHTML =
            '<div class="csc-welcome-hero-inner">' +
                '<div class="csc-hero-eyebrow">CSC · 煉焦與煤製備維護</div>' +
                '<h1>檢修紀錄簿</h1>' +
                '<p>整合現場檢修紀錄、設備操作與維護手冊、MCC／馬達庫存查詢、廠區電子地圖與儀電換算工具。</p>' +
                '<div class="csc-quick-grid">' +
                    '<a class="csc-quick-card" href="electronic-map.html">' +
                        '<span class="csc-quick-icon">🗺️</span>' +
                        '<span class="csc-quick-copy"><strong>電子地圖</strong><small>廠區佈置縮放檢視</small></span>' +
                    '</a>' +
                    '<a class="csc-quick-card" href="MCC.html">' +
                        '<span class="csc-quick-icon">⚡</span>' +
                        '<span class="csc-quick-copy"><strong>MCC 位置查詢</strong><small>依設備名稱快搜盤面</small></span>' +
                    '</a>' +
                    '<a class="csc-quick-card" href="motor_storage.html">' +
                        '<span class="csc-quick-icon">⚙️</span>' +
                        '<span class="csc-quick-copy"><strong>馬達資料查詢</strong><small>W261 儲位與庫存清單</small></span>' +
                    '</a>' +
                    '<a class="csc-quick-card" href="manual.html">' +
                        '<span class="csc-quick-icon">📚</span>' +
                        '<span class="csc-quick-copy"><strong>使用手冊下載</strong><small>設備操作與維修 PDF</small></span>' +
                    '</a>' +
                    '<a class="csc-quick-card" href="4-20ma-converter.html">' +
                        '<span class="csc-quick-icon">📶</span>' +
                        '<span class="csc-quick-copy"><strong>4–20 mA 換算</strong><small>工程值／%／PLC 原始值</small></span>' +
                    '</a>' +
                    '<a class="csc-quick-card" href="temperature-converter.html">' +
                        '<span class="csc-quick-icon">🌡️</span>' +
                        '<span class="csc-quick-copy"><strong>溫度／壓力換算</strong><small>Pt100、Type K/R、壓力</small></span>' +
                    '</a>' +
                '</div>' +
            '</div>';

        const toolbar = document.createElement('div');
        toolbar.className = 'csc-welcome-toolbar csc-only-flex';
        toolbar.innerHTML =
            '<input type="search" class="csc-welcome-search" placeholder="快搜單位名稱、分機號碼、無線電頻道或儲區代號（例如：電修三、#2119、K1EF）…">' +
            '<div class="csc-chip-group" role="tablist" aria-label="篩選目錄分類">' +
                '<button type="button" class="csc-chip is-active" data-cat="all">全部資訊</button>' +
                '<button type="button" class="csc-chip" data-cat="ext">單位分機</button>' +
                '<button type="button" class="csc-chip" data-cat="emergency">緊急通報</button>' +
                '<button type="button" class="csc-chip" data-cat="radio">無線電</button>' +
                '<button type="button" class="csc-chip" data-cat="storage">物料儲區</button>' +
            '</div>' +
            '<p class="csc-welcome-hint">提示：點擊任何分機號碼或儲區代號即可一鍵複製。</p>';

        document.body.insertBefore(toolbar, document.body.firstChild);
        document.body.insertBefore(hero, toolbar);

        // Tag tables and enhance extensions / storage codes / emergency rows
        const tableContainers = Array.from(document.querySelectorAll('.table-container'));
        tableContainers.forEach(function (tc) {
            const firstTh = tc.querySelector('thead th');
            const heading = firstTh ? firstTh.textContent.trim() : '';
            if (heading.includes('維護單位') || heading.includes('操作單位')) {
                tc.dataset.cscCat = 'ext';
            } else if (heading.includes('外單位')) {
                tc.dataset.cscCat = 'ext emergency';
            } else if (heading.includes('無線電')) {
                tc.dataset.cscCat = 'radio';
            } else if (heading.includes('儲區代號')) {
                tc.dataset.cscCat = 'storage';
            }

            let inEmergency = false;
            tc.querySelectorAll('tbody tr').forEach(function (row) {
                const th = row.querySelector('th');
                if (th && th.textContent.includes('通報電話')) {
                    inEmergency = true;
                    row.classList.add('csc-emergency-header');
                    return;
                }
                if (inEmergency) {
                    row.classList.add('csc-emergency-row');
                }

                const tds = row.querySelectorAll('td');
                if (tds.length === 2) {
                    const c0 = tds[0].textContent.trim();
                    const c1 = tds[1].textContent.trim();

                    // Extension numbers in column 2 (#xxxx)
                    if (/^#\d+/.test(c1)) {
                        const originalText = tds[1].textContent;
                        tds[1].innerHTML =
                            '<span class="csc-hide-in-redesign">' + originalText + '</span>' +
                            '<button type="button" class="csc-copy-pill csc-only-inline" data-copy="' + c1 + '" title="點擊複製分機">' + c1 + '</button>';
                    }
                    // Radio channels in column 1 (1..9)
                    if (heading.includes('無線電') && /^\d+$/.test(c0)) {
                        tds[0].innerHTML =
                            '<span class="csc-hide-in-redesign">' + c0 + '</span>' +
                            '<span class="csc-radio-badge csc-only-inline">CH ' + c0 + '</span>';
                    }
                    // Storage codes in column 1 (K1xx / W261xx)
                    if (heading.includes('儲區代號')) {
                        tds[0].innerHTML =
                            '<span class="csc-hide-in-redesign">' + c0 + '</span>' +
                            '<button type="button" class="csc-copy-pill csc-only-inline" data-copy="' + c0 + '" title="點擊複製儲區代號">' + c0 + '</button>';
                    }
                }
            });
        });

        document.body.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-copy]');
            if (btn) {
                copyText(btn.dataset.copy);
            }
        });

        // Search & category filter logic
        const searchInput = toolbar.querySelector('.csc-welcome-search');
        const chips = Array.from(toolbar.querySelectorAll('.csc-chip'));
        let activeCat = 'all';

        function applyWelcomeFilter() {
            const query = searchInput.value.trim().toLowerCase();
            tableContainers.forEach(function (tc) {
                const cats = (tc.dataset.cscCat || '').split(' ');
                const catOk = activeCat === 'all' || cats.includes(activeCat);
                if (!catOk) {
                    tc.style.display = 'none';
                    return;
                }
                let visibleRows = 0;
                tc.querySelectorAll('tbody tr').forEach(function (row) {
                    const isEmergencyHeader = row.classList.contains('csc-emergency-header');
                    if (activeCat === 'emergency' && !isEmergencyHeader && !row.classList.contains('csc-emergency-row')) {
                        row.style.display = 'none';
                        return;
                    }
                    const text = row.textContent.toLowerCase();
                    const match = !query || text.includes(query);
                    row.style.display = (match || (isEmergencyHeader && !query)) ? '' : 'none';
                    if (match && !isEmergencyHeader) visibleRows++;
                });
                tc.style.display = visibleRows > 0 || !query ? '' : 'none';
            });
        }

        searchInput.addEventListener('input', applyWelcomeFilter);
        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                activeCat = chip.dataset.cat;
                chips.forEach(function (c) { c.classList.toggle('is-active', c === chip); });
                applyWelcomeFilter();
            });
        });

        // Reset filter visibility when switching back to original mode so original tables are untouched
        onModeChange(function (mode) {
            if (mode === 'original') {
                tableContainers.forEach(function (tc) {
                    tc.style.display = '';
                    tc.querySelectorAll('tbody tr').forEach(function (row) {
                        row.style.display = '';
                    });
                });
            } else {
                applyWelcomeFilter();
            }
        });
    }

    // --- 2. Manual Directory (manual.html) ---
    function enhanceManualPage() {
        document.body.classList.add('csc-page-manual');

        const table = document.getElementById('equipmentTable');
        if (!table) return;

        // Parse original rowspan table into normalized items without mutating original table
        const items = [];
        let lastCol0 = '';
        let lastCol1 = '';
        let rem0 = 0;
        let rem1 = 0;

        table.querySelectorAll('tbody tr').forEach(function (row) {
            const cells = Array.from(row.children);
            let idx = 0;
            let col0 = lastCol0;
            let col1 = lastCol1;

            if (rem0 <= 0) {
                const c = cells[idx++];
                if (c) {
                    col0 = c.textContent.trim();
                    lastCol0 = col0;
                    rem0 = parseInt(c.getAttribute('rowspan') || '1', 10);
                }
            }
            if (rem1 <= 0) {
                const c = cells[idx++];
                if (c) {
                    col1 = c.textContent.trim();
                    lastCol1 = col1;
                    rem1 = parseInt(c.getAttribute('rowspan') || '1', 10);
                }
            }
            const col2Cell = cells[idx++];
            const col3Cell = cells[idx++];
            rem0--;
            rem1--;

            const equip = col2Cell ? col2Cell.textContent.trim() : '';
            const link = col3Cell ? col3Cell.querySelector('a') : null;
            const href = link ? link.getAttribute('href') : '';
            if (!href) return;

            const combined = (col0 + ' ' + col1 + ' ' + equip).toLowerCase();
            let category = '其他設備';
            if (/vvvf|siemens|abb|acs800|masterdrive|s120|g120|scalance/.test(combined)) category = '變頻器 / 通訊';
            else if (/電動閥|氣動閥|auma|bettis|seibu|flowserve|fisher|dvc6200/.test(combined)) category = '電動閥 / 氣動閥';
            else if (/eocr|電驛|relay|tdog|tdou|thermal/.test(combined)) category = '保護電驛';
            else if (/料位|秤重|siwarex|vega|finetek|ftc325|loadcell|液位/.test(combined)) category = '料位 / 秤重';
            else if (/測溫|溫度|氣體分析|壓力|傳送器|隔離|電錶|顯示錶|fluke|m system|m2dy|m2vs|m5vs|振動|測振|dias|raytek|axe|2590c/.test(combined)) category = '儀控 / 量測';
            else if (/rexa|sew|馬達|破碎|pz5|jordan|avr|encoder|pump|ceia|ft6380|vos2t/.test(combined)) category = '驅動 / 馬達 / 輔助';

            items.push({
                name: col0,
                desc: col1,
                equip: equip,
                href: href,
                category: category,
                searchText: combined
            });
        });

        const categories = ['全部'].concat(Array.from(new Set(items.map(function (it) { return it.category; }))));

        const shell = document.createElement('main');
        shell.className = 'csc-manual-shell csc-only';
        shell.innerHTML =
            '<header class="csc-page-banner">' +
                '<p class="csc-eyebrow">EQUIPMENT MANUALS</p>' +
                '<h1>設備操作／維修手冊下載</h1>' +
                '<p>即時篩選所有現場設備手冊、故障碼與接線圖 PDF，點擊卡片底部按鈕即可於新分頁開啟。</p>' +
            '</header>' +
            '<section class="csc-manual-controls" aria-label="篩選手冊">' +
                '<div class="csc-manual-search-row">' +
                    '<input type="search" class="csc-manual-search-input" placeholder="輸入關鍵字即時篩選（例如：S120、AUMA、EOCR、SIWAREX、故障碼）…" autocomplete="off">' +
                    '<button type="button" class="csc-manual-clear" hidden>清除</button>' +
                '</div>' +
                '<div class="csc-manual-meta-row">' +
                    '<div class="csc-chip-group" data-manual-cats></div>' +
                    '<span class="csc-manual-count" data-manual-count></span>' +
                '</div>' +
            '</section>' +
            '<section class="csc-manual-cards" data-manual-grid aria-label="手冊清單"></section>';

        const footer = document.querySelector('footer');
        document.body.insertBefore(shell, footer || null);

        const input = shell.querySelector('.csc-manual-search-input');
        const clearBtn = shell.querySelector('.csc-manual-clear');
        const catGroup = shell.querySelector('[data-manual-cats]');
        const countEl = shell.querySelector('[data-manual-count]');
        const grid = shell.querySelector('[data-manual-grid]');

        let activeCat = '全部';

        categories.forEach(function (cat) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'csc-chip' + (cat === '全部' ? ' is-active' : '');
            btn.textContent = cat;
            btn.addEventListener('click', function () {
                activeCat = cat;
                catGroup.querySelectorAll('.csc-chip').forEach(function (c) {
                    c.classList.toggle('is-active', c === btn);
                });
                renderManuals();
            });
            catGroup.appendChild(btn);
        });

        function escapeHtml(str) {
            return String(str).replace(/[&<>"']/g, function (m) {
                return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
            });
        }

        function highlight(text, terms) {
            let safe = escapeHtml(text);
            terms.forEach(function (t) {
                if (!t) return;
                const re = new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
                safe = safe.replace(re, '<mark class="search-match">$1</mark>');
            });
            return safe;
        }

        function renderManuals() {
            const raw = input.value.trim();
            clearBtn.hidden = !raw;
            const terms = raw ? raw.toLowerCase().split(/\s+/).filter(Boolean) : [];

            const filtered = items.filter(function (it) {
                if (activeCat !== '全部' && it.category !== activeCat) return false;
                if (!terms.length) return true;
                return terms.every(function (t) { return it.searchText.includes(t); });
            });

            countEl.textContent = '顯示 ' + filtered.length + ' / ' + items.length + ' 份手冊';

            if (!filtered.length) {
                grid.innerHTML = '<div style="grid-column:1/-1;padding:32px;text-align:center;border:1px dashed var(--csc-border);border-radius:12px;color:var(--csc-text-muted);">找不到符合「' + escapeHtml(raw) + '」的手冊資料，請嘗試其他關鍵字或切換分類。</div>';
                return;
            }

            grid.innerHTML = filtered.map(function (it) {
                const subSame = it.desc.toLowerCase() === it.name.toLowerCase();
                return (
                    '<article class="csc-manual-card">' +
                        '<div>' +
                            '<div class="csc-manual-card-top">' +
                                '<h2 class="csc-manual-card-title">' + highlight(it.name, terms) + '</h2>' +
                                '<span class="csc-manual-cat-pill">' + escapeHtml(it.category) + '</span>' +
                            '</div>' +
                            (subSame ? '' : '<p class="csc-manual-card-sub">' + highlight(it.desc, terms) + '</p>') +
                            (it.equip ? '<span class="csc-manual-card-equip">' + highlight(it.equip, terms) + '</span>' : '') +
                        '</div>' +
                        '<a class="csc-manual-download-btn" href="' + escapeHtml(it.href) + '" target="_blank" rel="noopener">📄 開啟 PDF 手冊 ↗</a>' +
                    '</article>'
                );
            }).join('');
        }

        input.addEventListener('input', renderManuals);
        clearBtn.addEventListener('click', function () {
            input.value = '';
            input.focus();
            renderManuals();
        });

        renderManuals();
    }

    // --- 3. MCC & Motor Storage Search Pages ---
    function enhanceSearchPage() {
        document.body.classList.add('csc-page-search');

        const panel = document.querySelector('.search-panel');
        const input = document.getElementById('searchInput');
        if (panel && input) {
            const examples = PAGE_KEY === 'mcc.html'
                ? ['推焦車', '破碎機', '油壓', '集塵', '皮帶', 'CDQ']
                : ['CONVEYOR', 'PUMP', 'FAN', 'CRUSHER', 'K1EF', 'K1EA'];

            const bar = document.createElement('div');
            bar.className = 'csc-quick-examples csc-only-flex';
            bar.innerHTML = '<span class="csc-quick-examples-label">常用快搜：</span>' +
                examples.map(function (kw) {
                    return '<button type="button" class="csc-chip" data-sample-kw="' + kw + '">' + kw + '</button>';
                }).join('');

            bar.querySelectorAll('[data-sample-kw]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    input.value = btn.dataset.sampleKw;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.focus();
                });
            });
            panel.appendChild(bar);
        }

        // Click to copy equipment codes in results
        const resultsEl = document.getElementById('results');
        if (resultsEl) {
            resultsEl.addEventListener('click', function (e) {
                if (currentMode !== 'redesign') return;
                const code = e.target.closest('.equipment-code');
                if (code) {
                    copyText(code.textContent.trim());
                }
            });
        }
    }

    // --- 4. Electronic Map (electronic-map.html) ---
    function enhanceMapPage() {
        document.body.classList.add('csc-page-map');
        const toolbar = document.querySelector('.map-toolbar');
        const viewer = document.querySelector('.map-viewer');
        const fitBtn = toolbar ? toolbar.querySelector('[data-map-action="fit"]') : null;
        if (!toolbar || !viewer) return;

        function triggerFit() {
            if (!fitBtn) return;
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    fitBtn.click();
                });
            });
        }

        // Desktop sidebar expand/collapse shortcut right inside floating map dock
        if (IS_IN_IFRAME) {
            const sideBtn = document.createElement('button');
            sideBtn.type = 'button';
            sideBtn.className = 'text-button csc-only-inline csc-map-sidebar-btn';
            sideBtn.textContent = '⇄ 滿版';
            sideBtn.title = '收合或展開左側導覽列以放大地圖視野';
            sideBtn.addEventListener('click', function () {
                try {
                    window.parent.postMessage({ type: 'csc-toggle-sidebar' }, '*');
                } catch (_) {}
            });
            toolbar.appendChild(sideBtn);
        }

        // Fullscreen toggle button
        const fsBtn = document.createElement('button');
        fsBtn.type = 'button';
        fsBtn.className = 'text-button csc-only-inline';
        fsBtn.textContent = '⛶ 全螢幕';
        fsBtn.title = '切換全螢幕檢視';
        fsBtn.addEventListener('click', function () {
            if (!document.fullscreenElement) {
                const target = document.documentElement;
                const req = target.requestFullscreen || target.webkitRequestFullscreen;
                if (req) req.call(target);
            } else {
                const exit = document.exitFullscreen || document.webkitExitFullscreen;
                if (exit) exit.call(document);
            }
        });
        toolbar.appendChild(fsBtn);

        document.addEventListener('fullscreenchange', function () {
            fsBtn.textContent = document.fullscreenElement ? '✕ 退出' : '⛶ 全螢幕';
            triggerFit();
        });

        // Subtle desktop-only floating gesture hint (outside toolbar so dock stays single-row)
        const tip = document.createElement('div');
        tip.className = 'csc-map-tip csc-only';
        tip.textContent = '滾輪縮放 · 拖曳平移 · 雙擊放大 · 0 適應視窗';
        document.body.appendChild(tip);

        // Double-click / double-tap zooms in smoothly in redesign mode
        viewer.addEventListener('dblclick', function () {
            if (currentMode !== 'redesign') return;
            const zoomInBtn = toolbar.querySelector('[data-map-action="zoom-in"]');
            if (zoomInBtn) {
                zoomInBtn.click();
                zoomInBtn.click();
            }
        });

        // Auto re-fit map cleanly when switching 原版 ⇄ 新版 or resizing/rotating viewport
        onModeChange(triggerFit);
        let resizeTimer;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(triggerFit, 120);
        });
    }

    // --- 5. Field Converters (4-20mA, Pressure, Temperature) ---
    function enhanceConverterPage() {
        const card = document.querySelector('.tool-card');
        if (!card) return;

        if (PAGE_KEY === '4-20ma-converter.html') {
            const currentInput = document.querySelector('[data-current-value]');
            const lowInput = document.querySelector('[data-range-low]');
            const highInput = document.querySelector('[data-range-high]');

            const presetBox = document.createElement('div');
            presetBox.className = 'csc-converter-presets csc-only';
            presetBox.innerHTML =
                '<p class="csc-converter-presets-title">快速校正點 (5 點測試)</p>' +
                '<div class="csc-preset-row">' +
                    '<button type="button" class="csc-preset-btn" data-ma="4">4 mA (0%)</button>' +
                    '<button type="button" class="csc-preset-btn" data-ma="8">8 mA (25%)</button>' +
                    '<button type="button" class="csc-preset-btn" data-ma="12">12 mA (50%)</button>' +
                    '<button type="button" class="csc-preset-btn" data-ma="16">16 mA (75%)</button>' +
                    '<button type="button" class="csc-preset-btn" data-ma="20">20 mA (100%)</button>' +
                '</div>' +
                '<p class="csc-converter-presets-title" style="margin-top:10px;">常用量程預設</p>' +
                '<div class="csc-preset-row">' +
                    '<button type="button" class="csc-preset-btn" data-range="0,100">0 – 100</button>' +
                    '<button type="button" class="csc-preset-btn" data-range="0,10">0 – 10</button>' +
                    '<button type="button" class="csc-preset-btn" data-range="0,200">0 – 200</button>' +
                    '<button type="button" class="csc-preset-btn" data-range="0,500">0 – 500</button>' +
                    '<button type="button" class="csc-preset-btn" data-range="0,1000">0 – 1000</button>' +
                    '<button type="button" class="csc-preset-btn" data-range="-50,150">-50 – 150</button>' +
                '</div>';

            presetBox.querySelectorAll('[data-ma]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    if (!currentInput) return;
                    currentInput.value = btn.dataset.ma;
                    currentInput.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
            presetBox.querySelectorAll('[data-range]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    if (!lowInput || !highInput) return;
                    const parts = btn.dataset.range.split(',');
                    lowInput.value = parts[0];
                    highInput.value = parts[1];
                    lowInput.dispatchEvent(new Event('input', { bubbles: true }));
                    highInput.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
            card.appendChild(presetBox);
        } else if (PAGE_KEY === 'pressure-converter.html') {
            const valInput = document.querySelector('[data-pressure-value]');
            const fromSelect = document.querySelector('[data-pressure-from]');
            if (!valInput || !fromSelect) return;

            const TO_PA = {
                'Pa': 1,
                'kPa': 1000,
                'MPa': 1000000,
                'bar': 100000,
                'psi': 6894.757293168,
                'kgf/cm²': 98066.5,
                'mmHg': 133.322387415,
                'atm': 101325
            };

            const matrix = document.createElement('section');
            matrix.className = 'csc-pressure-matrix csc-only';
            matrix.innerHTML =
                '<p class="csc-converter-presets-title">全單位同步對照（點擊可複製數值）</p>' +
                '<div class="csc-pressure-matrix-grid" data-pressure-grid></div>';
            card.insertAdjacentElement('afterend', matrix);

            const grid = matrix.querySelector('[data-pressure-grid]');

            function fmt(n) {
                if (!Number.isFinite(n)) return '—';
                if (n === 0) return '0';
                const abs = Math.abs(n);
                if (abs >= 1e6 || abs < 1e-4) return n.toExponential(4);
                return Number(n.toPrecision(6)).toString();
            }

            function updateMatrix() {
                const v = parseFloat(valInput.value);
                const unit = fromSelect.value;
                const pa = Number.isFinite(v) ? v * (TO_PA[unit] || 1) : NaN;
                grid.innerHTML = Object.keys(TO_PA).map(function (u) {
                    const out = Number.isFinite(pa) ? fmt(pa / TO_PA[u]) : '—';
                    return '<div class="csc-matrix-cell" data-copy-val="' + out + ' ' + u + '">' +
                        '<span class="csc-matrix-unit">' + u + '</span>' +
                        '<span class="csc-matrix-val">' + out + '</span>' +
                    '</div>';
                }).join('');
            }

            grid.addEventListener('click', function (e) {
                const cell = e.target.closest('[data-copy-val]');
                if (cell) copyText(cell.dataset.copyVal);
            });

            valInput.addEventListener('input', updateMatrix);
            fromSelect.addEventListener('change', updateMatrix);
            document.querySelector('[data-swap-units]')?.addEventListener('click', function () {
                setTimeout(updateMatrix, 10);
            });
            updateMatrix();
        } else if (PAGE_KEY === 'temperature-converter.html') {
            const tempInput = document.querySelector('[data-temperature-value]');
            const unitSelect = document.querySelector('[data-temperature-unit]');
            const presetBox = document.createElement('div');
            presetBox.className = 'csc-converter-presets csc-only';
            presetBox.innerHTML =
                '<p class="csc-converter-presets-title">常用校正溫度點</p>' +
                '<div class="csc-preset-row">' +
                    '<button type="button" class="csc-preset-btn" data-temp="0">0°</button>' +
                    '<button type="button" class="csc-preset-btn" data-temp="25">25°</button>' +
                    '<button type="button" class="csc-preset-btn" data-temp="100">100°</button>' +
                    '<button type="button" class="csc-preset-btn" data-temp="200">200°</button>' +
                    '<button type="button" class="csc-preset-btn" data-temp="500">500°</button>' +
                    '<button type="button" class="csc-preset-btn" data-temp="800">800°</button>' +
                    '<button type="button" class="csc-preset-btn" data-temp="1000">1000°</button>' +
                '</div>';

            presetBox.querySelectorAll('[data-temp]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    if (!tempInput) return;
                    tempInput.value = btn.dataset.temp;
                    tempInput.dispatchEvent(new Event('input', { bubbles: true }));
                });
            });
            if (unitSelect) {
                unitSelect.addEventListener('change', function () {
                    const u = unitSelect.value;
                    presetBox.querySelectorAll('[data-temp]').forEach(function (b) {
                        b.textContent = b.dataset.temp + ' ' + u;
                    });
                });
            }
            card.appendChild(presetBox);
        }
    }

    // --- 6. Technical Diagram & Guide Pages ---
    function enhanceDocPage(config) {
        document.body.classList.add('csc-page-doc');
        if (config.extraBodyClass) {
            document.body.classList.add(config.extraBodyClass);
        }

        const header = document.createElement('header');
        header.className = 'csc-doc-header csc-only';
        header.innerHTML =
            '<div class="csc-doc-header-meta">' +
                '<span class="csc-doc-tag">' + config.tag + '</span>' +
                '<span class="csc-doc-zoom-hint">🔍 點擊任一圖面可全螢幕放大與拖曳檢視</span>' +
            '</div>' +
            '<h1>' + config.title + '</h1>' +
            (config.subtitle ? '<p>' + config.subtitle + '</p>' : '') +
            (config.jumps ? '<div class="csc-doc-jumps">' + config.jumps + '</div>' : '');

        document.body.insertBefore(header, document.body.firstChild);

        // Hide original H1(s) inside container in redesign mode since header displays a clean H1
        if (config.hideOriginalTitles) {
            document.querySelectorAll('body > h1, .container > h1, body > br, .container > br').forEach(function (el) {
                el.classList.add('csc-hide-in-redesign');
            });
        }

        // Special cleanups for TDOG-31.html (only in redesign mode, preserving original DOM!)
        if (PAGE_KEY === 'tdog-31.html') {
            const origPs = Array.from(document.querySelectorAll('body > p, body > h4, body > img.left-pic, body > h5'));
            origPs.forEach(function (el) {
                el.classList.add('csc-hide-in-redesign');
            });

            const testImg = document.querySelector('img.left-pic');
            const callout = document.createElement('section');
            callout.className = 'csc-tdog-callout csc-only';
            callout.innerHTML =
                '<h3>⚡ 保護電驛跳脫測試（RELAY TEST）</h3>' +
                '<div class="csc-tdog-callout-body">' +
                    (testImg ? '<img src="' + testImg.getAttribute('src') + '" alt="保護電驛跳脫測試">' : '') +
                    '<div>' +
                        '<p>保護電驛設定完成後，可由 <strong>RELAY TEST</strong> 測試 VCB 跳脫功能：按 <strong>Δ 鍵</strong> 使 Ta–Tc 導通，確認 VCB 正常跳脫。</p>' +
                        '<p style="margin-top:10px;color:var(--csc-text-muted);font-size:0.84rem;">備註：舊款電流保護電驛型號為 <code>TOYO TMOG-31</code>。</p>' +
                    '</div>' +
                '</div>';
            document.body.appendChild(callout);
        }

        // Quick section anchors for SIWAREX (coal-preparation-page2.html)
        if (PAGE_KEY === 'coal-preparation-page2.html') {
            const h2s = document.querySelectorAll('.container h2');
            if (h2s[0]) h2s[0].id = 'sfb53';
            if (h2s[1]) h2s[1].id = 'sfb52';
        }

        // Wire lightbox to all meaningful diagrams (skip tiny email icon)
        const allImgs = Array.from(document.querySelectorAll('img')).filter(function (img) {
            const src = (img.getAttribute('src') || '').toLowerCase();
            return !src.includes('email.png') && !src.includes('pdf-icon.png') && !img.classList.contains('csc-hide-in-redesign');
        });
        initLightbox(allImgs);
    }

    // --- 7. Sub-Index / Hub / Brand / Tabbed Pages ---
    function enhanceHubPage(config) {
        document.body.classList.add('csc-page-hub');
        if (config.extraBodyClass) {
            document.body.classList.add(config.extraBodyClass);
        }
        const header = document.createElement('header');
        header.className = 'csc-doc-header csc-only';
        header.innerHTML =
            '<div class="csc-doc-header-meta"><span class="csc-doc-tag">' + config.tag + '</span></div>' +
            '<h1>' + config.title + '</h1>' +
            '<p>' + config.subtitle + '</p>';
        document.body.insertBefore(header, document.body.firstChild);

        // Fix Flowserve dead link notice in redesign mode cleanly
        if (PAGE_KEY === 'item3-page3.html') {
            document.querySelectorAll('a[href="Flowserve.html"]').forEach(function (a) {
                const fig = a.closest('figure');
                if (fig) {
                    const cap = fig.querySelector('figcaption');
                    if (cap) {
                        const badge = document.createElement('span');
                        badge.className = 'csc-nav-badge is-wip csc-only-inline';
                        badge.style.marginLeft = '8px';
                        badge.textContent = '建置中';
                        cap.appendChild(badge);
                    }
                }
            });
        }
    }

    function enhanceTabPage() {
        document.body.classList.add('csc-page-tabs');
        const header = document.createElement('header');
        header.className = 'csc-doc-header csc-only';
        header.style.marginBottom = '16px';
        header.innerHTML =
            '<div class="csc-doc-header-meta"><span class="csc-doc-tag">修三 · CDQ</span></div>' +
            '<h1>Turbine Generator 設備列表</h1>' +
            '<p>切換爐區分頁並以關鍵字快速定位 MCC 盤面位置。</p>';
        document.body.insertBefore(header, document.body.firstChild);
    }

    // --- 8. Placeholder / Under-Construction Pages ---
    function enhancePlaceholderPage() {
        document.body.classList.add('csc-page-placeholder');
        const info = PAGE_TITLES[PAGE_KEY] || { title: document.title || PAGE_FILE, group: '檢修知識庫' };
        const isJordan = PAGE_KEY === 'jordan.html';

        const card = document.createElement('section');
        card.className = 'csc-placeholder-card csc-only';
        card.innerHTML =
            '<span class="csc-placeholder-badge">' + (isJordan ? '📄 設備手冊資源' : '🛠️ 資料建置中') + '</span>' +
            '<h1>' + info.title + '</h1>' +
            '<p>' + (isJordan
                ? '此頁面對應四階破碎機 Rotork JORDAN 轉速控制器。您可以直接開啟已收錄的 PDF 操作手冊，或返回查詢其他破碎機資料。'
                : '本單元的現場檢修紀錄與圖面說明目前尚未補齊，您可先透過下方捷徑查詢相關設備手冊、MCC 盤面或馬達庫存資料。') + '</p>' +
            '<div class="csc-placeholder-actions">' +
                (isJordan ? '<a class="is-primary" href="manual/JORDAN.pdf" target="_blank" rel="noopener">📄 開啟 JORDAN 手冊 PDF ↗</a>' : '') +
                '<a class="' + (isJordan ? '' : 'is-primary') + '" href="manual.html">📚 使用手冊下載</a>' +
                '<a href="MCC.html">⚡ MCC 查詢</a>' +
                '<a href="welcome.html">🏠 返回首頁</a>' +
            '</div>';
        document.body.appendChild(card);
    }

    // =========================================================================
    // Initialize Page Enhancer on DOMContentLoaded
    // =========================================================================
    function boot() {
        mountStandaloneSwitcher();
        notifyParentPageMeta();

        if (PAGE_KEY === 'index.html') {
            document.body.classList.add('csc-page-index');
            return;
        }

        if (PAGE_KEY === 'welcome.html') {
            enhanceWelcomePage();
        } else if (PAGE_KEY === 'manual.html') {
            enhanceManualPage();
        } else if (PAGE_KEY === 'mcc.html' || PAGE_KEY === 'motor_storage.html') {
            enhanceSearchPage();
        } else if (PAGE_KEY === 'electronic-map.html') {
            enhanceMapPage();
        } else if (['4-20ma-converter.html', 'pressure-converter.html', 'temperature-converter.html'].includes(PAGE_KEY)) {
            enhanceConverterPage();
        } else if (PAGE_KEY === '4cdq_mcc_eocr.html') {
            enhanceDocPage({
                tag: '電氣保護 · 4CDQ MCC',
                title: '4CDQ MCC EOCR 設定與跳脫時間曲線',
                subtitle: '包含 TSUBAKI EOCR 中文翻譯對照、跳脫時間曲線重點與旋鈕設定教學。',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 'motorwiring.html') {
            enhanceDocPage({
                tag: '馬達維護 · 接線圖',
                title: '三相馬達接線圖',
                subtitle: '收錄富田電機 6 條、9 條、12 條出線與三相馬達出線詳圖對照。',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 'isolator.html') {
            enhanceDocPage({
                tag: '儀控參考 · 訊號隔離器',
                title: 'M2DY 與 M2VS 信號隔離器差異',
                subtitle: '快速比對 M-SYSTEM M2DY 與 M2VS 隔離器接線與規格差異。',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 's5time.html') {
            enhanceDocPage({
                tag: 'PLC 參考 · SIEMENS S7',
                title: 'SIEMENS S7 PLC S5TIME 格式',
                subtitle: 'S5TIME 計時器編碼結構與時間基準對照表。',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 'eckardt.html') {
            enhanceDocPage({
                tag: '儀控校正 · Eckardt SRI986',
                title: 'Eckardt 氣動閥介紹與校正步驟',
                subtitle: '單／雙作用方向調整、端子接線、重點螺絲位置說明與 4–20 mA 零點／量程校正流程。',
                extraBodyClass: 'csc-page-eckardt',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 'tdog-31.html') {
            enhanceDocPage({
                tag: '煤製備破碎機 · VCB2',
                title: 'TOYO TDOG-31 電流保護電驛設定',
                subtitle: 'C4 與 C6 破碎機 VCB2 保護電驛參數設定步驟（共 9 步）與 RELAY TEST 跳脫測試方式。',
                extraBodyClass: 'csc-page-tdog',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 'coal-preparation-page2.html') {
            enhanceDocPage({
                tag: '煤製備 · 秤重皮帶 SIWAREX',
                title: 'SIWAREX 卡片設定、校正程式',
                subtitle: 'PLC 透過 SFB53 (WRREC) 寫入與 SFB52 (RDREC) 讀取 SIWAREX 模組之參數表與運作原理。',
                jumps: '<a href="#sfb53">↓ SFB53 寫入功能</a><a href="#sfb52">↓ SFB52 讀取功能</a>',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 'item3-page4.html') {
            enhanceDocPage({
                tag: '修三 CDQ · 電動閥',
                title: 'AUMA 電動閥接線圖',
                subtitle: 'AUMA 電動閥控制迴路與端子接線圖面，點擊圖片可放大檢視細節。',
                hideOriginalTitles: true
            });
        } else if (PAGE_KEY === 'coal-preparation-page4.html') {
            enhanceHubPage({
                tag: '修三 · 煤製備',
                title: '破碎機檢修專區',
                subtitle: '依煤製備階段（PH12 / PH34）快速進入對應之保護電驛、驅動器與控制器維護說明。'
            });
        } else if (PAGE_KEY === 'item3-page3.html') {
            enhanceHubPage({
                tag: '修三 · CDQ 氣動閥',
                title: '氣動閥廠牌指南',
                subtitle: '選擇氣動閥定位器廠牌以檢視現場校正與維護說明。',
                extraBodyClass: 'csc-page-brands'
            });
        } else if (PAGE_KEY === 'item3-page5.html') {
            enhanceTabPage();
        } else if (PAGE_KEY === 'rexa.html') {
            document.body.classList.add('csc-page-rexa');
        } else if (
            /^item[12]-page[1-5]\.html$/.test(PAGE_KEY) ||
            /^item3-page[12]\.html$/.test(PAGE_KEY) ||
            PAGE_KEY === 'jordan.html'
        ) {
            enhancePlaceholderPage();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
