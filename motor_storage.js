const DATA_URL = 'motor_storage_data.json';
const PAGE_SIZE = 30;

const searchInput = document.getElementById('searchInput');
const clearButton = document.getElementById('clearButton');
const sheetFilter = document.getElementById('sheetFilter');
const resultStatus = document.getElementById('resultStatus');
const results = document.getElementById('results');
const pagination = document.getElementById('pagination');
const previousPage = document.getElementById('previousPage');
const nextPage = document.getElementById('nextPage');
const pageStatus = document.getElementById('pageStatus');

let records = null;
let recordsPromise = null;
let currentMatches = [];
let currentPage = 0;
let searchTimer;
let searchSequence = 0;

function normalize(value) {
    return String(value).normalize('NFKC').toLocaleLowerCase();
}

function showMessage(message) {
    results.replaceChildren();
    const state = document.createElement('p');
    state.className = 'empty-state';
    state.textContent = message;
    results.appendChild(state);
    pagination.hidden = true;
}

async function loadRecords() {
    if (records) {
        return records;
    }

    if (!recordsPromise) {
        resultStatus.textContent = '正在載入資料…';
        recordsPromise = (async () => {
            const response = await fetch(DATA_URL);
            if (!response.ok) {
                throw new Error(`無法載入馬達資料（HTTP ${response.status}）`);
            }

            const data = await response.json();
            if (!Array.isArray(data.records)) {
                throw new Error('資料檔格式不正確，請稍後再試。');
            }

            records = data.records.map(record => {
                if (!Array.isArray(record.fields) || !Array.isArray(record.searchFields)) {
                    throw new Error('資料檔缺少完整欄位或 E、Z 欄搜尋資料。');
                }
                return {
                    ...record,
                    searchText: normalize(record.searchFields.join(' '))
                };
            });

            const sheets = [...new Set(records.map(record => record.sheet))];
            for (const sheet of sheets) {
                const option = document.createElement('option');
                option.value = sheet;
                option.textContent = sheet;
                sheetFilter.appendChild(option);
            }
            sheetFilter.disabled = false;
            return records;
        })().catch(error => {
            recordsPromise = null;
            throw error;
        });
    }

    return recordsPromise;
}

function fieldValue(record, label) {
    const field = record.fields.find(item => item[0] === label);
    return field ? field[1] : '';
}

function makeField(label, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'record-field';

    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;

    wrapper.append(term, description);
    return wrapper;
}

function renderRecord(record) {
    const card = document.createElement('article');
    card.className = 'result-card';

    const heading = document.createElement('div');
    heading.className = 'card-heading';
    const titleBlock = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = fieldValue(record, '名稱') || '（未填名稱）';
    const code = document.createElement('p');
    code.className = 'equipment-code';
    code.textContent = fieldValue(record, '設備編號') || '未填設備編號';
    const category = document.createElement('span');
    category.className = 'category-tag';
    category.textContent = record.sheet;
    titleBlock.append(title, code);
    heading.append(titleBlock, category);
    card.appendChild(heading);

    const specs = ['功率', '電流', '電壓', '級數', '轉速']
        .map(label => [label, fieldValue(record, label)])
        .filter(([, value]) => value);
    if (specs.length) {
        const specList = document.createElement('p');
        specList.className = 'spec-list';
        for (const [label, value] of specs) {
            const item = document.createElement('span');
            item.textContent = `${label} ${value}`;
            specList.appendChild(item);
        }
        card.appendChild(specList);
    }

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = `查看完整資料（${record.fields.length} 欄）`;
    const fields = document.createElement('dl');
    fields.className = 'record-fields';
    for (const [label, value] of record.fields) {
        fields.appendChild(makeField(label, value));
    }
    details.append(summary, fields);
    card.appendChild(details);

    return card;
}

function renderPage() {
    const pageCount = Math.ceil(currentMatches.length / PAGE_SIZE);
    const start = currentPage * PAGE_SIZE;
    const pageRecords = currentMatches.slice(start, start + PAGE_SIZE);
    results.replaceChildren(...pageRecords.map(renderRecord));

    pagination.hidden = pageCount <= 1;
    pageStatus.textContent = `${currentPage + 1} / ${pageCount} 頁`;
    previousPage.disabled = currentPage === 0;
    nextPage.disabled = currentPage + 1 >= pageCount;
}

async function search() {
    const sequence = ++searchSequence;
    const rawQuery = searchInput.value.trim();
    const terms = normalize(rawQuery).split(/\s+/).filter(Boolean);
    clearButton.hidden = rawQuery.length === 0;

    if (!terms.length) {
        currentMatches = [];
        currentPage = 0;
        resultStatus.textContent = '尚未搜尋資料';
        showMessage('輸入關鍵字後，才會載入並顯示符合的資料。');
        return;
    }

    try {
        const allRecords = await loadRecords();
        if (sequence !== searchSequence) {
            return;
        }
        const selectedSheet = sheetFilter.value;
        currentMatches = allRecords.filter(record =>
            (!selectedSheet || record.sheet === selectedSheet) &&
            terms.every(term => record.searchText.includes(term))
        );
        currentPage = 0;

        if (!currentMatches.length) {
            resultStatus.textContent = '沒有符合的資料';
            showMessage(`找不到「${rawQuery}」的相關資料，請試試其他關鍵字或分類。`);
            return;
        }

        resultStatus.textContent = `共 ${currentMatches.length.toLocaleString()} 筆，顯示第 1–${Math.min(PAGE_SIZE, currentMatches.length)} 筆`;
        renderPage();
    } catch (error) {
        if (sequence !== searchSequence) {
            return;
        }
        console.error(error);
        resultStatus.textContent = '資料載入失敗';
        showMessage(`${error.message} 請確認網路連線後重新輸入關鍵字。`);
    }
}

function scheduleSearch() {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(search, 180);
}

searchInput.addEventListener('input', scheduleSearch);
sheetFilter.addEventListener('change', search);
clearButton.addEventListener('click', () => {
    searchInput.value = '';
    sheetFilter.value = '';
    searchInput.focus();
    scheduleSearch();
});
previousPage.addEventListener('click', () => {
    if (currentPage > 0) {
        currentPage -= 1;
        renderPage();
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});
nextPage.addEventListener('click', () => {
    if ((currentPage + 1) * PAGE_SIZE < currentMatches.length) {
        currentPage += 1;
        renderPage();
        results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
});

showMessage('輸入關鍵字後，才會載入並顯示符合的資料。');
