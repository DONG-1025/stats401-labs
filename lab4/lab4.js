const margin = { top: 30, right: 30, bottom: 60, left: 60 };
const width = 500;
const height = 350;
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

d3.csv("../data/sentiment_counts.csv")
    .then(data => {
        data.forEach(d => d.count = +d.count);

        const svg = d3.select("#sentiment-chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const xScale = d3.scaleBand()
            .domain(data.map(d => d.sentiment))
            .range([0, innerWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) * 1.2])
            .nice()
            .range([innerHeight, 0]);

        svg.selectAll(".bar")
            .data(data)
            .join("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.sentiment))
            .attr("y", d => yScale(d.count))
            .attr("width", xScale.bandwidth())
            .attr("height", d => innerHeight - yScale(d.count))
            .attr("fill", d => {
                if (d.sentiment === "Positive") return "#27ae60";
                if (d.sentiment === "Negative") return "#e74c3c";
                return "#f39c12";
            })
            .attr("rx", 4);

        svg.selectAll(".bar-label")
            .data(data)
            .join("text")
            .attr("x", d => xScale(d.sentiment) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.count) - 8)
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text(d => d.count);

        svg.append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .style("font-size", "12px");

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .style("font-size", "12px");

    })
    .catch(error => {
        console.error("Failed to load sentiment data:", error);
        d3.select("#sentiment-chart")
            .append("p")
            .style("color", "red")
            .text("Unable to load sentiment data");
    });

d3.csv("../data/sentiment_by_platform.csv")
    .then(data => {
        data.forEach(d => d.count = +d.count);

        const platforms = [...new Set(data.map(d => d.platform))];
        const sentiments = [...new Set(data.map(d => d.sentiment))];

        const svg = d3.select("#platform-chart")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const xScale = d3.scaleBand()
            .domain(platforms)
            .range([0, innerWidth])
            .padding(0.2);

        const xSubScale = d3.scaleBand()
            .domain(sentiments)
            .range([0, xScale.bandwidth()])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.count) * 1.3])
            .nice()
            .range([innerHeight, 0]);

        const colorScale = d3.scaleOrdinal()
            .domain(sentiments)
            .range(["#27ae60", "#f39c12", "#e74c3c"]);

        svg.selectAll(".group-bar")
            .data(data)
            .join("rect")
            .attr("x", d => xScale(d.platform) + xSubScale(d.sentiment))
            .attr("y", d => yScale(d.count))
            .attr("width", xSubScale.bandwidth())
            .attr("height", d => innerHeight - yScale(d.count))
            .attr("fill", d => colorScale(d.sentiment))
            .attr("rx", 3);

        svg.append("g")
            .attr("transform", `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .style("font-size", "11px");

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .style("font-size", "11px");

        const legend = svg.append("g")
            .attr("transform", `translate(${innerWidth - 120}, -10)`);

        sentiments.forEach((s, i) => {
            const row = legend.append("g")
                .attr("transform", `translate(0, ${i * 22})`);

            row.append("rect")
                .attr("width", 14)
                .attr("height", 14)
                .attr("fill", colorScale(s))
                .attr("rx", 2);

            row.append("text")
                .attr("x", 20)
                .attr("y", 12)
                .style("font-size", "11px")
                .text(s);
        });

    })
    .catch(error => {
        console.error("Failed to load platform data:", error);
        d3.select("#platform-chart")
            .append("p")
            .style("color", "red")
            .text("Unable to load platform data");
    });

d3.csv("../data/sentiment_by_weekday.csv")
    .then(data => {
        data.forEach(d => d.sentiment_score = +d.sentiment_score);

        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        data.sort((a, b) => dayOrder.indexOf(a.weekday) - dayOrder.indexOf(b.weekday));

        const svg = d3.select("#time-chart")
            .append("svg")
            .attr("width", 700)
            .attr("height", 400)
            .append("g")
            .attr("transform", `translate(${margin.left}, ${margin.top})`);

        const innerWidth2 = 700 - margin.left - margin.right;
        const innerHeight2 = 400 - margin.top - margin.bottom;

        const xScale = d3.scalePoint()
            .domain(data.map(d => d.weekday))
            .range([0, innerWidth2]);

        const yScale = d3.scaleLinear()
            .domain([-1, 1])
            .nice()
            .range([innerHeight2, 0]);

        svg.append("line")
            .attr("x1", 0)
            .attr("x2", innerWidth2)
            .attr("y1", yScale(0))
            .attr("y2", yScale(0))
            .attr("stroke", "#ccc")
            .attr("stroke-dasharray", "5,5");

        const line = d3.line()
            .x(d => xScale(d.weekday))
            .y(d => yScale(d.sentiment_score));

        svg.append("path")
            .datum(data)
            .attr("d", line)
            .attr("fill", "none")
            .attr("stroke", "#3498db")
            .attr("stroke-width", 3);

        svg.selectAll(".dot")
            .data(data)
            .join("circle")
            .attr("cx", d => xScale(d.weekday))
            .attr("cy", d => yScale(d.sentiment_score))
            .attr("r", 6)
            .attr("fill", "#3498db")
            .attr("stroke", "white")
            .attr("stroke-width", 2);

        svg.selectAll(".dot-label")
            .data(data)
            .join("text")
            .attr("x", d => xScale(d.weekday))
            .attr("y", d => yScale(d.sentiment_score) - 12)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "bold")
            .text(d => d.sentiment_score.toFixed(2));

        svg.append("g")
            .attr("transform", `translate(0, ${innerHeight2})`)
            .call(d3.axisBottom(xScale))
            .style("font-size", "11px");

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .style("font-size", "11px");

        d3.select("#record-count").text("Loading...");

        d3.csv("../data/lab4_clean_tweets.csv")
            .then(fullData => {
                d3.select("#record-count").text(fullData.length);
            });

    })
    .catch(error => {
        console.error("Failed to load time data:", error);
        d3.select("#time-chart")
            .append("p")
            .style("color", "red")
            .text("Unable to load time data");
    });