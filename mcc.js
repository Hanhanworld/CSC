let currentIndex = -1;

function searchTable() {
    let input = document.getElementById("searchInput");
    let filter = input.value.toUpperCase();
    let table = document.getElementById("equipmentTable");
    let tr = table.getElementsByTagName("tr");

    // Clear previous highlights
    for (let i = 1; i < tr.length; i++) {
        tr[i].classList.remove("highlight");
    }

    // Find the next match
    for (let i = currentIndex + 1; i < tr.length; i++) {
        let td = tr[i].getElementsByTagName("td");
        for (let j = 0; j < td.length; j++) {
            if (td[j]) {
                let txtValue = td[j].textContent || td[j].innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    tr[i].classList.add("highlight");
                    currentIndex = i;
                    tr[i].scrollIntoView();
                    
                    // Scroll the search bar into view
                    document.getElementById("searchContainer").scrollIntoView();
                    
                    return;
                }
            }
        }
    }

    // If no match found, reset the index and start over
    currentIndex = -1;
}
