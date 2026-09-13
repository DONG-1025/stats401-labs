const width = 900;
const height = 600;

const tooltip = d3.select("#tooltip");

Promise.all([
    d3.csv("../data/lab5_assignment_stations.csv", d => ({
        id: d.id,
        name: d.station_name,
        district: d.district,
        daily_passengers: +d.daily_passengers,
        station_type: d.station_type
    })),
    d3.csv("../data/lab5_assignment_routes.csv", d => ({
        source: d.source,
        target: d.target,
        travel_time: +d.travel_time_min,
        route_type: d.route_type
    }))
]).then(([nodes, links]) => {

    console.log("Nodes:", nodes);
    console.log("Links:", links);

    const districts = Array.from(new Set(nodes.map(d => d.district)));
    const colorScale = d3.scaleOrdinal()
        .domain(districts)
        .range(d3.schemeTableau10);

    const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(nodes, d => d.daily_passengers))
        .range([8, 25]);

    const routeTypes = Array.from(new Set(links.map(d => d.route_type)));
    const routeColorScale = d3.scaleOrdinal()
        .domain(routeTypes)
        .range(["#3498db", "#e74c3c", "#f39c12"]);

    const linkWidthScale = d3.scaleLinear()
        .domain(d3.extent(links, d => d.travel_time))
        .range([1.5, 5]);

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(80))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(25));

    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", d => routeColorScale(d.route_type))
        .attr("stroke-opacity", 0.7)
        .attr("stroke-width", d => linkWidthScale(d.travel_time))
        .attr("stroke-dasharray", d => {
            if (d.route_type === "Express") return "8,4";
            if (d.route_type === "Shuttle") return "3,3";
            return null;
        });

    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", d => sizeScale(d.daily_passengers))
        .attr("fill", d => colorScale(d.district))
        .attr("stroke", "#2c3e50")
        .attr("stroke-width", d => {
            if (d.station_type === "Terminal") return 3;
            if (d.station_type === "Transfer") return 2;
            return 1;
        })
        .attr("stroke-dasharray", d => {
            if (d.station_type === "Transfer") return "4,2";
            return null;
        })
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", dragStarted)
            .on("drag", dragged)
            .on("end", dragEnded)
        );

    const label = svg.append("g")
        .selectAll("text")
        .data(nodes)
        .join("text")
        .text(d => d.name)
        .attr("font-size", 10)
        .attr("dx", 14)
        .attr("dy", 4)
        .attr("pointer-events", "none");

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

    function dragStarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragEnded(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }

    function isConnected(a, b) {
        return links.some(l =>
            (l.source.id === a.id && l.target.id === b.id) ||
            (l.source.id === b.id && l.target.id === a.id)
        );
    }

    node.on("mouseover", function(event, d) {
        node.attr("opacity", other =>
            (other.id === d.id || isConnected(d, other)) ? 1 : 0.15
        );
        link.attr("opacity", l =>
            (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
        );
        label.attr("opacity", other =>
            (other.id === d.id || isConnected(d, other)) ? 1 : 0.15
        );

        tooltip
            .style("opacity", 1)
            .html(`
                <strong>${d.name}</strong><br>
                District: ${d.district}<br>
                Passengers: ${d.daily_passengers.toLocaleString()}<br>
                Type: ${d.station_type}
            `);
    })
    .on("mousemove", function(event) {
        tooltip
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY + 15) + "px");
    })
    .on("mouseout", function() {
        node.attr("opacity", 1);
        link.attr("opacity", 1);
        label.attr("opacity", 1);
        tooltip.style("opacity", 0);
    });

    const legendSvg = d3.select("#chart")
        .append("div")
        .style("margin-top", "15px");

    const districtLegend = legendSvg.append("div")
        .attr("class", "legend-box");

    districtLegend.append("h4").text("District (color)");
    districts.forEach(d => {
        const row = districtLegend.append("div").attr("class", "legend-item");
        row.append("span")
            .style("width", "14px")
            .style("height", "14px")
            .style("background", colorScale(d))
            .style("border-radius", "50%");
        row.append("span").text(d);
    });

    const typeLegend = legendSvg.append("div")
        .attr("class", "legend-box");

    typeLegend.append("h4").text("Station Type (border)");
    ["Local", "Transfer", "Terminal"].forEach(t => {
        const row = typeLegend.append("div").attr("class", "legend-item");
        row.append("span")
            .style("width", "14px")
            .style("height", "14px")
            .style("border-radius", "50%")
            .style("border", "2px solid #2c3e50")
            .style("background", "white");
        row.append("span").text(t);
    });

    const routeLegend = legendSvg.append("div")
        .attr("class", "legend-box");

    routeLegend.append("h4").text("Route Type (line)");
    routeTypes.forEach(t => {
        const row = routeLegend.append("div").attr("class", "legend-item");
        row.append("span")
            .style("width", "20px")
            .style("height", "3px")
            .style("background", routeColorScale(t))
            .style("display", "inline-block");
        row.append("span").text(t);
    });

    const sortedNodes = [...nodes].sort((a, b) => {
        if (a.district < b.district) return -1;
        if (a.district > b.district) return 1;
        return a.id.localeCompare(b.id);
    });

    const matrixSize = 500;
    const matrixX = d3.scaleBand()
        .domain(sortedNodes.map(d => d.id))
        .range([0, matrixSize])
        .padding(0.02);

    const matrixY = d3.scaleBand()
        .domain(sortedNodes.map(d => d.id))
        .range([0, matrixSize])
        .padding(0.02);

    const matrixData = [];
    sortedNodes.forEach(rowNode => {
        sortedNodes.forEach(colNode => {
            const foundLink = links.find(l =>
                (l.source.id === rowNode.id && l.target.id === colNode.id) ||
                (l.source.id === colNode.id && l.target.id === rowNode.id)
            );
            matrixData.push({
                row: rowNode.id,
                col: colNode.id,
                weight: foundLink ? foundLink.travel_time : 0,
                type: foundLink ? foundLink.route_type : null
            });
        });
    });

    const matrixSvg = d3.select("#matrix")
        .append("svg")
        .attr("width", 650)
        .attr("height", 650);

    const matrixGroup = matrixSvg.append("g")
        .attr("transform", "translate(100, 50)");

    matrixGroup.selectAll("rect")
        .data(matrixData)
        .join("rect")
        .attr("x", d => matrixX(d.col))
        .attr("y", d => matrixY(d.row))
        .attr("width", matrixX.bandwidth())
        .attr("height", matrixY.bandwidth())
        .attr("fill", d => d.weight > 0 ? routeColorScale(d.type) : "#f3f3f3")
        .attr("fill-opacity", d => d.weight > 0 ? 0.8 : 1)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 0.5);

    matrixGroup.selectAll(".row-label")
        .data(sortedNodes)
        .join("text")
        .attr("class", "row-label")
        .attr("x", -5)
        .attr("y", d => matrixY(d.id) + matrixY.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("dy", 4)
        .attr("font-size", 8)
        .attr("fill", d => colorScale(d.district))

    matrixGroup.selectAll(".col-label")
        .data(sortedNodes)
        .join("text")
        .attr("class", "col-label")
        .attr("x", d => matrixX(d.id) + matrixX.bandwidth() / 2)
        .attr("y", -5)
        .attr("text-anchor", "start")
        .attr("font-size", 8)
        .attr("fill", d => colorScale(d.district))
        .attr("transform", d => `rotate(-90, ${matrixX(d.id) + matrixX.bandwidth() / 2}, -5)`)
        .text(d => d.id);

}).catch(error => {
    console.error("Error loading data:", error);
    d3.select("#chart")
        .append("p")
        .style("color", "red")
        .text("Failed to load network data.");
});