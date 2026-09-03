let currentIndex = -1;
let lastQuery = '';

const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchStatus = document.getElementById('searchStatus');

function getRows() {
    return Array.from(document.querySelectorAll('#equipmentTable tbody tr'));
}

function searchTable() {
    const filter = searchInput.value.trim().toLocaleUpperCase();
    const rows = getRows();

    if (filter !== lastQuery) {
        currentIndex = -1;
        lastQuery = filter;
    }

    rows.forEach(row => row.classList.remove('highlight'));

    if (!filter) {
        searchStatus.textContent = '請輸入關鍵字開始搜尋';
        return;
    }

    const matches = rows
        .map((row, index) => ({ row, index }))
        .filter(({ row }) => row.textContent.toLocaleUpperCase().includes(filter));

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
    getRows().forEach(row => row.classList.remove('highlight'));
    searchStatus.textContent = '';
});
