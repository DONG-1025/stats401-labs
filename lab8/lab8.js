const tooltip = d3.select("#tooltip");

const mapWidth = 900;
const mapHeight = 650;

Promise.all([
    d3.csv("../data/lab8_embedding_map.csv", d => ({
        ...d,
        x: +d.x,
        y: +d.y,
        word_count: +d.word_count,
        cluster: +d.cluster
    })),
    d3.csv("../data/lab8_topic_section_matrix.csv", d => ({
        ...d,
        count: +d.count
    }))
]).then(([data, matrixData]) => {

    const clusters = Array.from(new Set(data.map(d => d.cluster))).sort((a, b) => a - b);
    const clusterNames = {};
    clusters.forEach(c => {
        clusterNames[c] = data.find(d => d.cluster === c).cluster_name || `Topic ${c}`;
    });

    const colorScale = d3.scaleOrdinal()
        .domain(clusters)
        .range(d3.schemeTableau10);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.x)).nice()
        .range([50, mapWidth - 50]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.y)).nice()
        .range([mapHeight - 50, 50]);

    const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(data, d => d.word_count))
        .range([3, 10]);

    const svg = d3.select("#semantic-map")
        .append("svg")
        .attr("width", mapWidth)
        .attr("height", mapHeight);

    const mapGroup = svg.append("g");

    const zoom = d3.zoom()
        .scaleExtent([0.5, 10])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svg.call(zoom);

    const points = mapGroup.selectAll(".passage")
        .data(data)
        .join("circle")
        .attr("class", "passage")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", d => sizeScale(d.word_count))
        .attr("fill", d => colorScale(d.cluster))
        .attr("opacity", 0.7)
        .attr("stroke", "#fff")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer");

    points.on("mouseover", function(event, d) {
        tooltip.style("opacity", 1)
            .html(`
                <strong>${d.section}</strong><br>
                Topic: ${clusterNames[d.cluster]}<br>
                Page: ${d.page}<br>
                Words: ${d.word_count}
            `);
    })
    .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 12) + "px")
            .style("top", (event.pageY + 12) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

    points.on("click", function(event, d) {
        const sectionText = d.section === "Unknown"
            ? `Page ${d.page}`
            : d.section;

        d3.select("#detail-panel").html(`
            <h3>${sectionText}</h3>
            <p><strong>Topic:</strong> ${clusterNames[d.cluster]}<br>
            <strong>Page:</strong> ${d.page}<br>
            <strong>Words:</strong> ${d.word_count}</p>
            <p>${d.text}</p>
        `);
    });

    d3.select("#search").on("input", function() {
        const q = this.value.toLowerCase().trim();
        points.attr("opacity", d =>
            q === "" || d.text.toLowerCase().includes(q) ? 0.9 : 0.05
        );
    });

    const sections = Array.from(new Set(data.map(d => d.section)))
        .sort((a, b) => {
            const aMatch = a.match(/\d+/);
            const bMatch = b.match(/\d+/);
            if (!aMatch || !bMatch) return a.localeCompare(b);
            return parseInt(aMatch[0]) - parseInt(bMatch[0]);
        });

    const sectionSelect = d3.select("#section-filter");
    sections.forEach(s => sectionSelect.append("option").attr("value", s).text(s));

    sectionSelect.on("change", function() {
        const val = this.value;
        points.attr("opacity", d => val === "" || d.section === val ? 0.9 : 0.05);
    });

    const topicSelect = d3.select("#topic-filter");
    clusters.forEach(c => topicSelect.append("option").attr("value", c).text(clusterNames[c]));

    topicSelect.on("change", function() {
        const val = this.value;
        points.attr("opacity", d => val === "" || d.cluster === +val ? 0.9 : 0.05);
    });

    const legend = svg.append("g")
        .attr("transform", `translate(${mapWidth - 180}, 20)`);

    clusters.forEach((c, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
        row.append("circle").attr("r", 6).attr("fill", colorScale(c));
        row.append("text").attr("x", 14).attr("y", 4)
            .style("font-size", "12px").text(clusterNames[c]);
    });

    const matrixSections = Array.from(new Set(matrixData.map(d => d.section)))
        .sort((a, b) => {
            const aMatch = a.match(/\d+/);
            const bMatch = b.match(/\d+/);
            if (!aMatch || !bMatch) return a.localeCompare(b);
            return parseInt(aMatch[0]) - parseInt(bMatch[0]);
        });

    const matrixTopics = Array.from(new Set(matrixData.map(d => d.cluster_name)))
        .sort((a, b) => {
            const aMatch = a.match(/\d+/);
            const bMatch = b.match(/\d+/);
            if (!aMatch || !bMatch) return a.localeCompare(b);
            return parseInt(aMatch[0]) - parseInt(bMatch[0]);
        });

    const cellSize = 50;
    const mWidth = matrixTopics.length * cellSize + 200;
    const mHeight = matrixSections.length * cellSize + 100;

    const mSvg = d3.select("#matrix")
        .append("svg")
        .attr("width", mWidth)
        .attr("height", mHeight);

    const mGroup = mSvg.append("g")
        .attr("transform", "translate(180, 80)");

    const mX = d3.scaleBand()
        .domain(matrixTopics)
        .range([0, matrixTopics.length * cellSize])
        .padding(0.05);

    const mY = d3.scaleBand()
        .domain(matrixSections)
        .range([0, matrixSections.length * cellSize])
        .padding(0.05);

    const maxCount = d3.max(matrixData, d => d.count);
    const colorMatrix = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount]);

    mGroup.selectAll("rect.matrix-cell")
        .data(matrixData)
        .join("rect")
        .attr("class", "matrix-cell")
        .attr("x", d => mX(d.cluster_name))
        .attr("y", d => mY(d.section))
        .attr("width", mX.bandwidth())
        .attr("height", mY.bandwidth())
        .attr("fill", d => colorMatrix(d.count))
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.section}</strong><br>Topic: ${d.cluster_name}<br>Passages: ${d.count}`)
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0))
        .on("click", function(event, d) {
            points.attr("opacity", p =>
                p.section === d.section && clusterNames[p.cluster] === d.cluster_name ? 1 : 0.05
            );
            d3.select("#detail-panel").html(`
                <h3>${d.section} × ${d.cluster_name}</h3>
                <p>${d.count} passages in this section-topic combination.</p>
            `);
        });

    mGroup.selectAll("text.cell-text")
        .data(matrixData)
        .join("text")
        .attr("class", "cell-text")
        .attr("x", d => mX(d.cluster_name) + mX.bandwidth() / 2)
        .attr("y", d => mY(d.section) + mY.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .style("font-size", "12px")
        .style("fill", d => d.count > maxCount * 0.5 ? "white" : "#333")
        .style("pointer-events", "none")
        .text(d => d.count);

    mGroup.selectAll("text.row-label")
        .data(matrixSections)
        .join("text")
        .attr("class", "row-label")
        .attr("x", -10)
        .attr("y", d => mY(d) + mY.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("dy", 4)
        .style("font-size", "12px")
        .text(d => d);

    mGroup.selectAll("text.col-label")
        .data(matrixTopics)
        .join("text")
        .attr("class", "col-label")
        .attr("x", d => mX(d) + mX.bandwidth() / 2)
        .attr("y", -8)
        .attr("text-anchor", "start")
        .style("font-size", "11px")
        .attr("transform", d => `rotate(-45, ${mX(d) + mX.bandwidth() / 2}, -8)`)
        .text(d => d);

}).catch(err => {
    console.error("Error loading data:", err);
    d3.select("body").append("p").style("color", "red")
        .text("Failed to load Lab 8 data files.");
});