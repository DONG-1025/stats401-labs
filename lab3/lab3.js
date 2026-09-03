const dataPath = "../data/books.csv";

d3.csv(dataPath)
    .then(data => {
        console.log("Loaded", data.length, "records");

        d3.select("#record-count").text(data.length);

        const columns = data.columns;

        const table = d3.select("#data-table");

        const header = table.select("thead")
            .append("tr");

        header.selectAll("th")
            .data(columns)
            .join("th")
            .text(d => d)
            .style("cursor", "pointer")
            .style("user-select", "none")
            .append("span")
            .attr("class", "sort-indicator")
            .text(" ↕");

        let ascending = true;
        let currentColumn = null;

        function renderTable(sortedData) {
            table.select("tbody").html("");

            const rows = table.select("tbody")
                .selectAll("tr")
                .data(sortedData)
                .join("tr");

            rows.selectAll("td")
                .data(row => columns.map(col => row[col]))
                .join("td")
                .text(d => d);
        }

        renderTable(data);

        header.selectAll("th")
            .on("click", function(event, column) {
                if (currentColumn === column) {
                    ascending = !ascending;
                } else {
                    currentColumn = column;
                    ascending = true;
                }

                header.selectAll(".sort-indicator")
                    .text(" ↕");

                d3.select(this)
                    .select(".sort-indicator")
                    .text(ascending ? " ↑" : " ↓");

                const sorted = [...data].sort((a, b) => {
                    const valA = a[column];
                    const valB = b[column];

                    if (!isNaN(+valA) && !isNaN(+valB)) {
                        return ascending ? +valA - +valB : +valB - +valA;
                    }

                    return ascending
                        ? valA.localeCompare(valB)
                        : valB.localeCompare(valA);
                });

                renderTable(sorted);
            });

    })
    .catch(error => {
        console.error("Failed to load data:", error);
        d3.select("#record-count").text("Failed to load");
        d3.select("#table-container")
            .append("p")
            .style("color", "red")
            .text("Unable to load data file. Please ensure data/books.csv exists.");
    });