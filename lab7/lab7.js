const tooltip = d3.select("#tooltip");

const wWidth = 900;
const wHeight = 500;
const wMargin = { top: 40, right: 150, bottom: 70, left: 70 };

d3.csv("../data/lab7_historical_weather.csv", d => ({
    date: d3.timeParse("%Y-%m-%d")(d.date),
    city: d.city,
    country: d.country,
    temperature_c: +d.temperature_c,
    humidity_pct: +d.humidity_pct,
    wind_speed_mps: +d.wind_speed_mps,
    pressure_hpa: +d.pressure_hpa,
    precipitation_mm: +d.precipitation_mm
})).then(data => {

    const cities = Array.from(new Set(data.map(d => d.city)));
    const colorScale = d3.scaleOrdinal().domain(cities).range(d3.schemeTableau10);

    const grouped = d3.group(data, d => d.city);

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", wWidth)
        .attr("height", wHeight);

    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([wMargin.left, wWidth - wMargin.right]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.temperature_c))
        .nice()
        .range([wHeight - wMargin.bottom, wMargin.top]);

    const xAxis = svg.append("g")
        .attr("transform", `translate(0,${wHeight - wMargin.bottom})`)
        .call(d3.axisBottom(xScale));

    const yAxis = svg.append("g")
        .attr("transform", `translate(${wMargin.left},0)`)
        .call(d3.axisLeft(yScale));

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.temperature_c));

    const linesGroup = svg.append("g");

    function drawLines(metric) {
        yScale.domain(d3.extent(data, d => d[metric])).nice();
        yAxis.transition().duration(500).call(d3.axisLeft(yScale));

        line.y(d => yScale(d[metric]));

        linesGroup.selectAll("path.city-line")
            .data(grouped)
            .join("path")
            .attr("class", "city-line")
            .attr("fill", "none")
            .attr("stroke", d => colorScale(d[0]))
            .attr("stroke-width", 2)
            .transition().duration(500)
            .attr("d", d => line(d[1]));
    }

    drawLines("temperature_c");

    const legend = svg.append("g")
        .attr("transform", `translate(${wWidth - wMargin.right + 10}, ${wMargin.top})`);

    cities.forEach((city, i) => {
        const row = legend.append("g")
            .attr("transform", `translate(0, ${i * 22})`);
        row.append("rect")
            .attr("width", 14).attr("height", 14)
            .attr("fill", colorScale(city)).attr("rx", 2);
        row.append("text")
            .attr("x", 20).attr("y", 12)
            .style("font-size", "12px").text(city);
    });

    d3.select("#metric").on("change", function() {
        drawLines(this.value);
    });

    const bisect = d3.bisector(d => d.date).center;

    svg.append("rect")
        .attr("x", wMargin.left)
        .attr("y", wMargin.top)
        .attr("width", wWidth - wMargin.left - wMargin.right)
        .attr("height", wHeight - wMargin.top - wMargin.bottom)
        .attr("fill", "transparent")
        .on("mousemove", function(event) {
            const [mx] = d3.pointer(event);
            const date = xScale.invert(mx);
            const cityData = grouped.get("Tokyo");
            const i = bisect(cityData, date);
            const d = cityData[i];
            if (!d) return;
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.city}</strong><br>
                    ${d3.timeFormat("%Y-%m-%d")(d.date)}<br>
                    Temp: ${d.temperature_c}°C<br>
                    Humidity: ${d.humidity_pct}%<br>
                    Wind: ${d.wind_speed_mps} m/s
                `)
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
});

const nWidth = 900;
const nHeight = 600;

Promise.all([
    d3.csv("../data/lab7_assignment_companies.csv"),
    d3.csv("../data/lab7_assignment_transactions_60days.csv", d => ({
        date: d.date,
        day: +d.day,
        source: d.source,
        target: d.target,
        amount_usd: +d.amount_usd,
        transaction_type: d.transaction_type,
        transaction_count: +d.transaction_count
    }))
]).then(([companies, transactions]) => {

    const sectors = Array.from(new Set(companies.map(d => d.sector)));
    const sectorColor = d3.scaleOrdinal().domain(sectors).range(d3.schemeTableau10);

    const svg = d3.select("#network")
        .append("svg")
        .attr("width", nWidth)
        .attr("height", nHeight);

    const linkGroup = svg.append("g").attr("class", "links");
    const nodeGroup = svg.append("g").attr("class", "nodes");
    const labelGroup = svg.append("g").attr("class", "labels");

    const sizeScale = d3.scaleSqrt().domain([0, 50000]).range([8, 25]);

    const simulation = d3.forceSimulation(companies)
        .force("link", d3.forceLink().id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(nWidth / 2, nHeight / 2))
        .force("collision", d3.forceCollide().radius(30));

    const node = nodeGroup.selectAll("circle")
        .data(companies)
        .join("circle")
        .attr("r", 10)
        .attr("fill", d => sectorColor(d.sector))
        .attr("stroke", "#2c3e50")
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", (event, d) => {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x; d.fy = d.y;
            })
            .on("drag", (event, d) => {
                d.fx = event.x; d.fy = event.y;
            })
            .on("end", (event, d) => {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null; d.fy = null;
            })
        )
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1)
                .html(`<strong>${d.company_name}</strong><br>Sector: ${d.sector}<br>Region: ${d.region}`)
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    const label = labelGroup.selectAll("text")
        .data(companies)
        .join("text")
        .text(d => d.company_name)
        .attr("font-size", 10)
        .attr("dx", 14)
        .attr("dy", 4)
        .attr("pointer-events", "none");

    let currentDay = 1;
    let timer = null;

    function showDay(day) {
        currentDay = day;
        const currentLinks = transactions.filter(d => d.day === day);

        const link = linkGroup.selectAll("line")
            .data(currentLinks, d => `${d.source}-${d.target}-${d.day}`)
            .join(
                enter => enter.append("line")
                    .attr("stroke", "#999")
                    .attr("stroke-width", 2)
                    .attr("opacity", 0)
                    .call(e => e.transition().duration(400).attr("opacity", 0.6)),
                update => update,
                exit => exit.transition().duration(400).attr("opacity", 0).remove()
            );

        simulation.force("link").links(currentLinks);

        node.transition().duration(300)
            .attr("r", d => {
                const vol = d3.sum(
                    currentLinks.filter(l => l.source === d.id || l.target === d.id),
                    l => l.amount_usd
                );
                return sizeScale(vol);
            });

        simulation.alpha(0.3).restart();

        d3.select("#time-slider").property("value", day);
        d3.select("#day-label").text(`Day ${day}`);

        const totalValue = d3.sum(currentLinks, d => d.amount_usd);
        const active = new Set(currentLinks.flatMap(d => [d.source, d.target])).size;
        d3.select("#summary").html(
            `<strong>Day ${day}:</strong> ${active} active companies, ${currentLinks.length} links, total $${totalValue.toLocaleString()}`
        );
    }

    simulation.on("tick", () => {
        linkGroup.selectAll("line")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node.attr("cx", d => d.x).attr("cy", d => d.y);
        label.attr("x", d => d.x).attr("y", d => d.y);
    });

    function play() {
        if (timer) return;
        timer = d3.interval(() => {
            if (currentDay >= 60) { pause(); return; }
            showDay(currentDay + 1);
        }, 800);
    }

    function pause() {
        if (timer) { timer.stop(); timer = null; }
    }

    function reset() {
        pause();
        showDay(1);
    }

    d3.select("#play").on("click", play);
    d3.select("#pause").on("click", pause);
    d3.select("#reset").on("click", reset);
    d3.select("#time-slider").on("input", function() {
        pause();
        showDay(+this.value);
    });

    const legendDiv = d3.select("#legend");
    sectors.forEach(s => {
        const row = legendDiv.append("div").style("display", "inline-block").style("margin-right", "20px");
        row.append("span")
            .style("display", "inline-block")
            .style("width", "14px").style("height", "14px")
            .style("background", sectorColor(s))
            .style("border-radius", "50%")
            .style("margin-right", "6px");
        row.append("span").text(s);
    });

    showDay(1);

}).catch(err => {
    console.error("Error loading network data:", err);
});