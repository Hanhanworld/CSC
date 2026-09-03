let currentIndex = -1;
let lastQuery = '';

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchStatus = document.getElementById('searchStatus');

function getRows() {
    return Array.from(document.querySelectorAll('#equipmentTable tbody tr'));
}

function clearTextHighlights(rows) {
    rows.forEach(row => {
        row.querySelectorAll('mark.search-match').forEach(mark => {
            mark.replaceWith(document.createTextNode(mark.textContent));
        });
    });
}

function highlightText(row, filter) {
    const textNodes = [];
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        if (!walker.currentNode.parentElement.closest('mark')) {
            textNodes.push(walker.currentNode);
        }
    }

    const escapedFilter = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matcher = new RegExp(`(${escapedFilter})`, 'gi');

    textNodes.forEach(node => {
        if (!matcher.test(node.nodeValue)) {
            matcher.lastIndex = 0;
            return;
        }

        matcher.lastIndex = 0;
        const fragment = document.createDocumentFragment();
        node.nodeValue.split(matcher).forEach((part, index) => {
            if (index % 2 === 1) {
                const mark = document.createElement('mark');
                mark.className = 'search-match';
                mark.textContent = part;
                fragment.appendChild(mark);
            } else if (part) {
                fragment.appendChild(document.createTextNode(part));
            }
        });
        node.replaceWith(fragment);
    });
}

function searchTable() {
    const filter = searchInput.value.trim().toLocaleUpperCase();
    const rows = getRows();

    if (filter !== lastQuery) {
        currentIndex = -1;
        lastQuery = filter;
    }

    clearTextHighlights(rows);
    rows.forEach(row => row.classList.remove('highlight'));

    if (!filter) {
        searchStatus.textContent = '請輸入關鍵字開始搜尋';
        return;
    }

    const matches = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.textContent.toLocaleUpperCase().includes(filter));

    matches.forEach(({ row }) => highlightText(row, filter));

    if (matches.length === 0) {
        currentIndex = -1;
        searchStatus.textContent = `找不到「${searchInput.value.trim()}」相關資料`;
        return;
    }

    const nextMatch = matches.find(match => match.index > currentIndex) || matches[0];
    currentIndex = nextMatch.index;
    nextMatch.row.classList.add('highlight');
    nextMatch.row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    searchStatus.textContent = `第 ${matches.findIndex(match => match.index === currentIndex) + 1} / ${matches.length} 筆結果`;
}

searchButton.addEventListener('click', searchTable);
searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
        searchTable();
    }
});
searchInput.addEventListener('input', () => {
    currentIndex = -1;
    lastQuery = '';
    const rows = getRows();
    clearTextHighlights(rows);
    rows.forEach(row => row.classList.remove('highlight'));
    searchStatus.textContent = '';
});
