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
                    
                    // Scroll the matched row into view
                    tr[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Scroll the search bar into view with a delay
                    setTimeout(() => {
                        document.getElementById("searchContainer").scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 500);

                    return;
                }
            }
        }
    }

    // If no match found, reset the index and start over
    currentIndex = -1;
}
