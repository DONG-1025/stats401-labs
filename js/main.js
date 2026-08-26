console.log("D3 version:", d3.version);

async function loadDataAndDraw() {
    try {
        const data = await d3.csv(
            "data/students.csv",
            d => ({
                name: d.name,
                score: +d.score
            })
        );

        console.log("Loaded data:", data);

        const margin = { top: 60, right: 30, bottom: 80, left: 30 };
        const width = 700;
        const height = 400;
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.name))
            .range([0, innerWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.score) * 1.1])
            .range([innerHeight, 0]);

        svg.append("text")
            .attr("class", "chart-title")
            .attr("x", innerWidth / 2)
            .attr("y", -20)
            .text("Student Scores");

        svg.selectAll("rect")
            .data(data)
            .join("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.name))
            .attr("y", d => yScale(d.score))
            .attr("width", xScale.bandwidth())
            .attr("height", d => innerHeight - yScale(d.score));

        svg.selectAll("text")
            .data(data)
            .join("text")
            .attr("class", "bar-label")
            .attr("x", d => xScale(d.name) + xScale.bandwidth() / 2)
            .attr("y", innerHeight + 20)
            .text(d => `${d.name} (${d.score})`);

    } catch (error) {
        console.error("Error loading data:", error);
    }
}

loadDataAndDraw();