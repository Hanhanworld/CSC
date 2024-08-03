function showTab(tabId) {
    var tabs = document.querySelectorAll('.tab');
    var buttons = document.querySelectorAll('button');

    // 隱藏所有分頁
    tabs.forEach(function(tab) {
        tab.style.display = 'none';
    });
    // 顯示所選分頁
    document.getElementById(tabId).style.display = 'block';

    // 移除所有按鈕的高亮樣式
    buttons.forEach(function(button) {
        button.classList.remove("highlighted-tab");
    });

    // 高亮顯示所選按鈕
    var selectedButton = Array.from(buttons).find(button => button.innerText.includes(tabId === 'aFurnace' ? 'A號爐' : 'PH12煉焦爐'));
    if (selectedButton) {
        selectedButton.classList.add("highlighted-tab");
    }

    // 設置搜尋框的 ID 以便於搜尋
    currentSearchInputId = tabId === 'aFurnace' ? 'searchInput' : 'searchInputPH12';

    // 重置搜尋索引
    currentSearchIndex = 0;
    lastSearchTabId = tabId; // 記錄上次搜尋的分頁
}

var currentSearchIndex = 0;
var lastSearchTabId = '';
var currentSearchInputId = '';

function searchNext() {
    var input, filter, tables, tr, td, i, j, k, txtValue;
    input = document.getElementById(currentSearchInputId);
    filter = input.value.toUpperCase();
    tables = document.querySelectorAll('.tab');

    // 移除之前的高亮樣式
    tables.forEach(function(table) {
        table.querySelectorAll('tr').forEach(function(row) {
            row.classList.remove("black-background");
        });
    });

    var found = false;
    for (i = 0; i < tables.length; i++) {
        var table = tables[i].querySelector('table');
        if (!table) continue;
        
        tr = table.getElementsByTagName("tr");
        for (j = currentSearchIndex; j < tr.length; j++) {
            td = tr[j].getElementsByTagName("td");
            for (k = 0; k < td.length; k++) {
                if (td[k]) {
                    txtValue = td[k].textContent || td[k].innerText;
                    if (txtValue.toUpperCase().indexOf(filter) > -1) {
                        tr[j].classList.add("black-background");
                        currentSearchIndex = j + 1;
                        found = true;
                        break;
                    }
                }
            }
            if (found) break;
        }
        if (found) break;
    }

    // 如果沒有找到，重置搜尋索引並從頭開始搜尋
    if (!found) {
        currentSearchIndex = 0;
        searchNext(); // 從頭開始搜尋
    }
}
