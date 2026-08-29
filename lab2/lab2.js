const width = 800;
const height = 500;
const margin = { top: 40, right: 170, bottom: 70, left: 70 };

const tooltip = d3.select("#tooltip");

d3.csv("../data/cities_multivariate.csv", d => ({
    city: d.city,
    population: +d.population,
    temp_c: +d.temp_c,
    development_level: d.development_level,
    region: d.region
}))
.then(data => {
    console.log("Loaded cities data:", data);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const xScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.population))
        .nice()
        .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.temp_c))
        .nice()
        .range([innerHeight, 0]);

    const regions = Array.from(new Set(data.map(d => d.region)));
    const colorScale = d3.scaleOrdinal()
        .domain(regions)
        .range(d3.schemeTableau10);

    const sizeScale = d3.scaleOrdinal()
        .domain(["Low", "Medium", "High"])
        .range([6, 10, 16]);

    svg.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .style("font-size", "12px");

    svg.append("g")
        .call(d3.axisLeft(yScale))
        .style("font-size", "12px");

    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Population (millions)");

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -45)
        .style("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Temperature (°C)");

    svg.selectAll(".city-point")
        .data(data)
        .join("circle")
        .attr("class", "city-point")
        .attr("cx", d => xScale(d.population))
        .attr("cy", d => yScale(d.temp_c))
        .attr("r", d => sizeScale(d.development_level))
        .attr("fill", d => colorScale(d.region))
        .attr("opacity", 0.8)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.city}</strong><br>
                    Population: ${d.population} million<br>
                    Temperature: ${d.temp_c}°C<br>
                    Development: ${d.development_level}<br>
                    Region: ${d.region}
                `);
        })
        .on("mousemove", function(event) {
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
        });

    const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth + 30}, 0)`);

    legend.append("text")
        .attr("y", -10)
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .text("Region");

    const legendItems = legend
        .selectAll(".legend-item")
        .data(regions)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25 + 5})`);

    legendItems.append("circle")
        .attr("r", 6)
        .attr("fill", d => colorScale(d));

    legendItems.append("text")
        .attr("x", 14)
        .attr("y", 5)
        .style("font-size", "12px")
        .text(d => d);

    const sizeLegend = svg.append("g")
        .attr("transform", `translate(${innerWidth + 30}, ${regions.length * 25 + 35})`);

    sizeLegend.append("text")
        .attr("y", -10)
        .style("font-size", "13px")
        .style("font-weight", "bold")
        .text("Development");

    const levels = ["Low", "Medium", "High"];
    const sizeLegendItems = sizeLegend
        .selectAll(".size-legend-item")
        .data(levels)
        .join("g")
        .attr("class", "size-legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25 + 5})`);

    sizeLegendItems.append("circle")
        .attr("r", d => sizeScale(d) / 2)
        .attr("fill", "#888")
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);

    sizeLegendItems.append("text")
        .attr("x", 16)
        .attr("y", 4)
        .style("font-size", "12px")
        .text(d => d);

})
.catch(error => {
    console.error("Error loading data:", error);
    d3.select("#chart")
        .append("p")
        .style("color", "red")
        .text("⚠️ Failed to load data. Please check the console.");
});