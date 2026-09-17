const tooltip = d3.select("#tooltip");

const statusColor = d3.scaleOrdinal()
    .domain(["Increase", "Unchanged", "Decrease"])
    .range(["#27ae60", "#f39c12", "#e74c3c"]);

d3.json("../data/lab6_assignment_gdp.json").then(data => {

    const treeWidth = 1100;
    const treeHeight = 700;

    const treeRoot = d3.hierarchy(data);
    treeRoot.x0 = 0;
    treeRoot.y0 = 0;

    const treeLayout = d3.tree().size([treeHeight - 100, treeWidth - 300]);

    const treeSvg = d3.select("#tree")
        .append("svg")
        .attr("width", treeWidth)
        .attr("height", treeHeight);

    const treeGroup = treeSvg.append("g")
        .attr("transform", "translate(80, 50)");

    const linkGroup = treeGroup.append("g").attr("class", "links");
    const nodeGroup = treeGroup.append("g").attr("class", "nodes");

    function updateTree(source) {
        const treeData = treeLayout(treeRoot);
        const nodes = treeData.descendants();
        const links = treeData.links();

        nodes.forEach(d => {
            d.y = d.depth * 200;
        });

        const link = linkGroup.selectAll("path.link")
            .data(links, d => d.target.id);

        link.enter().append("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#ccc")
            .attr("stroke-width", 1.5)
            .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x))
            .merge(link)
            .transition().duration(400)
            .attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));

        link.exit().transition().duration(400).remove();

        const node = nodeGroup.selectAll("g.tree-node")
            .data(nodes, d => d.id || (d.id = Math.random()));

        const nodeEnter = node.enter().append("g")
            .attr("class", "tree-node")
            .attr("transform", d => `translate(${source.y0}, ${source.x0})`)
            .on("click", (event, d) => {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else {
                    d.children = d._children;
                    d._children = null;
                }
                updateTree(d);
            })
            .on("mouseover", function(event, d) {
                const status = d.data.status
                    ? `Status: ${d.data.status}<br>`
                    : "";
                const gdp = d.data.gdp
                    ? `GDP: $${d.data.gdp} billion<br>`
                    : "";
                tooltip.style("opacity", 1)
                    .html(`<strong>${d.data.name}</strong><br>${gdp}${status}`);
            })
            .on("mousemove", function(event) {
                tooltip.style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY + 12) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

        nodeEnter.append("circle")
            .attr("r", 1e-6)
            .attr("fill", d => d.data.status ? statusColor(d.data.status) : (d.children || d._children ? "steelblue" : "#666"))
            .attr("stroke", "#333")
            .attr("stroke-width", 1);

        nodeEnter.append("text")
            .attr("dy", "0.35em")
            .attr("x", d => d.children || d._children ? -10 : 10)
            .attr("text-anchor", d => d.children || d._children ? "end" : "start")
            .style("font-size", "11px")
            .text(d => d.data.name);

        const nodeUpdate = node.merge(nodeEnter);

        nodeUpdate.transition().duration(400)
            .attr("transform", d => `translate(${d.y}, ${d.x})`);

        nodeUpdate.select("circle")
            .attr("r", 6)
            .attr("fill", d => d.data.status ? statusColor(d.data.status) : (d.children || d._children ? "steelblue" : "#666"));

        nodeUpdate.select("text")
            .attr("x", d => d.children || d._children ? -10 : 10)
            .attr("text-anchor", d => d.children || d._children ? "end" : "start");

        node.exit().transition().duration(400)
            .attr("transform", d => `translate(${source.y}, ${source.x})`)
            .remove();

        nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
    }

    treeRoot.children.forEach(collapse);
    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    updateTree(treeRoot);

    const tWidth = 900;
    const tHeight = 550;

    function drawTreemap(containerId, tileMethod) {
        const root = d3.hierarchy(data)
            .sum(d => d.gdp || 0)
            .sort((a, b) => b.value - a.value);

        d3.treemap()
            .tile(tileMethod)
            .size([tWidth, tHeight])
            .paddingInner(2)
            .paddingOuter(3)
            .paddingTop(18)(root);

        const svg = d3.select(containerId)
            .append("svg")
            .attr("width", tWidth)
            .attr("height", tHeight);

        const leaves = root.leaves();

        const cell = svg.selectAll("g.cell")
            .data(leaves)
            .join("g")
            .attr("class", "cell")
            .attr("transform", d => `translate(${d.x0}, ${d.y0})`);

        cell.append("rect")
            .attr("width", d => d.x1 - d.x0)
            .attr("height", d => d.y1 - d.y0)
            .attr("fill", d => statusColor(d.data.status))
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

        cell.append("text")
            .attr("x", 4)
            .attr("y", 14)
            .style("font-size", "10px")
            .style("fill", "white")
            .style("font-weight", "bold")
            .text(d => d.x1 - d.x0 > 50 ? d.data.name : "");

        const parents = root.descendants().filter(d => d.depth === 1 || d.depth === 2);

        svg.selectAll("g.parent")
            .data(parents)
            .join("g")
            .attr("class", "parent")
            .attr("transform", d => `translate(${d.x0}, ${d.y0})`)
            .append("text")
            .attr("x", 4)
            .attr("y", 12)
            .style("font-size", d => d.depth === 1 ? "13px" : "11px")
            .style("font-weight", d => d.depth === 1 ? "bold" : "normal")
            .style("fill", "#2c3e50")
            .text(d => d.data.name);

        cell.on("mouseover", function(event, d) {
            let ancestor = d;
            const chain = [];
            while (ancestor) {
                chain.unshift(ancestor.data.name);
                ancestor = ancestor.parent;
            }
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.data.name}</strong><br>
                    ${chain.slice(1, -1).join(" → ")}<br>
                    GDP: $${d.value} billion<br>
                    Status: ${d.data.status}
                `);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
    }

    drawTreemap("#treemap-squarify", d3.treemapSquarify);
    drawTreemap("#treemap-binary", d3.treemapBinary);

}).catch(err => {
    console.error("Error loading hierarchy:", err);
    d3.select("body").append("p")
        .style("color", "red")
        .text("Failed to load hierarchy JSON. Did you run the Python conversion scripts?");
});