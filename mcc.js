<!DOCTYPE html>
<html>
<head>
    <style>
        .highlight {
            background-color: yellow;
        }
    </style>
</head>
<body>

<input type="text" id="searchInput" placeholder="Search for equipment...">
<button onclick="searchTable()">Search</button>

<table id="equipmentTable">
    <tr>
        <th>Equipment</th>
        <th>Details</th>
    </tr>
    <tr>
        <td>Hammer</td>
        <td>Tool</td>
    </tr>
    <tr>
        <td>Wrench</td>
        <td>Tool</td>
    </tr>
    <tr>
        <td>Drill</td>
        <td>Tool</td>
    </tr>
    <tr>
        <td>Saw</td>
        <td>Tool</td>
    </tr>
</table>

<script>
var currentIndex = 0;

function searchTable() {
    var input, filter, table, tr, td, i, j, txtValue;
    input = document.getElementById("searchInput");
    filter = input.value.toUpperCase();
    table = document.getElementById("equipmentTable");
    tr = table.getElementsByTagName("tr");

    // Remove previous highlights
    for (i = 1; i < tr.length; i++) {
        tr[i].classList.remove("highlight");
    }

    var found = false;

    // Start searching from the current index
    for (i = currentIndex + 1; i < tr.length; i++) {
        td = tr[i].getElementsByTagName("td");
        for (j = 0; j < td.length; j++) {
            if (td[j]) {
                txtValue = td[j].textContent || td[j].innerText;
                if (txtValue.toUpperCase().indexOf(filter) > -1) {
                    tr[i].classList.add("highlight");
                    currentIndex = i;
                    found = true;
                    break;
                }
            }
        }
        if (found) {
            break;
        }
    }

    // If no match found, reset the index and try again
    if (!found) {
        currentIndex = 0;
        searchTable();
    }
}
</script>

</body>
</html>
