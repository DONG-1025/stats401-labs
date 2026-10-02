const tooltip = d3.select("#tooltip");

const width = 800;
const height = 500;

let choroplethSelection = null;
let cartogramSelection = null;
let cartogramPaths = null;
let gdpMap = null;

Promise.all([
    d3.json("../data/world.geojson"),
    d3.csv("../data/lab9_gdp_2025_top50.csv", d => ({
        iso3: d.iso3,
        country: d.country,
        gdp: +d.gdp_2025_billion_usd,
        rank: +d.rank
    }))
]).then(([geoData, stats]) => {

    gdpMap = new Map(stats.map(d => [d.iso3, d.gdp]));
    const countryNameMap = new Map(stats.map(d => [d.iso3, d.country]));

    const projection = d3.geoNaturalEarth1()
        .fitSize([width, height], geoData);

    const path = d3.geoPath().projection(projection);

    const values = stats.map(d => d.gdp);
    const colorScale = d3.scaleSequentialLog(d3.interpolateBlues)
        .domain([d3.min(values), d3.max(values)]);

    function getISO(feature) {
        return feature.properties["ISO3166-1-Alpha-3"]
            || feature.properties.ISO3166_1_Alpha_3
            || feature.properties.iso_a3
            || feature.properties.ISO_A3
            || feature.properties.id;
    }

    function getCountryName(feature) {
        const iso = getISO(feature);
        if (countryNameMap.has(iso)) return countryNameMap.get(iso);
        return feature.properties.name
            || feature.properties.ADMIN
            || feature.properties.admin
            || "Unknown";
    }

    const svgChoropleth = d3.select("#choropleth")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const mapGroup = svgChoropleth.append("g");

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            mapGroup.attr("transform", event.transform);
        });

    svgChoropleth.call(zoom);

    choroplethSelection = mapGroup.selectAll("path")
        .data(geoData.features)
        .join("path")
        .attr("d", path)
        .attr("fill", d => {
            const iso = getISO(d);
            const gdp = gdpMap.get(iso);
            return gdp ? colorScale(gdp) : "#eeeeee";
        })
        .attr("stroke", "white")
        .attr("stroke-width", 0.5)
        .attr("data-iso", d => getISO(d))
        .style("cursor", "pointer");

    choroplethSelection
        .on("mouseover", function(event, d) {
            const iso = getISO(d);
            const gdp = gdpMap.get(iso);
            const name = getCountryName(d);

            tooltip.style("opacity", 1)
                .html(`
                    <strong>${name}</strong><br>
                    GDP 2025: ${gdp ? gdp.toLocaleString() + " billion USD" : "No data"}
                `)
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");

            highlightCountry(iso);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            unhighlightAll();
        });

    const legendWidth = 260;
    const legendHeight = 12;

    const legendSvg = d3.select("#choropleth")
        .append("svg")
        .attr("width", width)
        .attr("height", 60);

    const legendGroup = legendSvg.append("g")
        .attr("transform", `translate(20, 30)`);

    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "choropleth-gradient");

    const numStops = 10;
    for (let i = 0; i <= numStops; i++) {
        const t = i / numStops;
        const logMin = Math.log(d3.min(values));
        const logMax = Math.log(d3.max(values));
        const value = Math.exp(logMin + t * (logMax - logMin));
        linearGradient.append("stop")
            .attr("offset", `${t * 100}%`)
            .attr("stop-color", colorScale(value));
    }

    legendGroup.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#choropleth-gradient)");

    legendGroup.append("text")
        .attr("x", 0)
        .attr("y", legendHeight + 15)
        .style("font-size", "11px")
        .text(d3.min(values).toLocaleString());

    legendGroup.append("text")
        .attr("x", legendWidth)
        .attr("y", legendHeight + 15)
        .attr("text-anchor", "end")
        .style("font-size", "11px")
        .text(d3.max(values).toLocaleString() + " billion USD");

    legendGroup.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -8)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("2025 Nominal GDP (log scale)");

    const svgCartogram = d3.select("#cartogram")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const cartoGroup = svgCartogram.append("g");

    const cartoZoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            cartoGroup.attr("transform", event.transform);
        });

    svgCartogram.call(cartoZoom);

    cartogramPaths = cartoGroup.selectAll("path.carto-base")
        .data(geoData.features)
        .join("path")
        .attr("class", "carto-base")
        .attr("d", path)
        .attr("fill", "#f0f0f0")
        .attr("stroke", "#cccccc")
        .attr("stroke-width", 0.3)
        .attr("data-iso", d => getISO(d));

    const countryPoints = geoData.features
        .map(feature => {
            const iso = getISO(feature);
            const gdp = gdpMap.get(iso);
            if (!gdp) return null;
            const centroid = path.centroid(feature);
            if (isNaN(centroid[0]) || isNaN(centroid[1])) return null;
            return {
                feature: feature,
                iso: iso,
                name: getCountryName(feature),
                gdp: gdp,
                x: centroid[0],
                y: centroid[1]
            };
        })
        .filter(d => d !== null);

    const areaScale = d3.scaleSqrt()
        .domain([0, d3.max(countryPoints, d => d.gdp)])
        .range([0, 40]);

    cartogramSelection = cartoGroup.selectAll("circle.carto-circle")
        .data(countryPoints)
        .join("circle")
        .attr("class", "carto-circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", d => areaScale(d.gdp))
        .attr("fill", d => colorScale(d.gdp))
        .attr("fill-opacity", 0.7)
        .attr("stroke", "#2c3e50")
        .attr("stroke-width", 1)
        .attr("data-iso", d => d.iso)
        .style("cursor", "pointer");

    cartogramSelection
        .on("mouseover", function(event, d) {
            tooltip.style("opacity", 1)
                .html(`
                    <strong>${d.name}</strong><br>
                    GDP 2025: ${d.gdp.toLocaleString()} billion USD
                `)
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");

            highlightCountry(d.iso);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            unhighlightAll();
        });

    svgCartogram.append("text")
        .attr("x", width / 2)
        .attr("y", height - 10)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#666")
        .text("Circle area represents GDP. Base map shown for geographic reference.");

    function highlightCountry(iso) {
        if (!iso) return;

        choroplethSelection
            .attr("stroke", d => getISO(d) === iso ? "#e74c3c" : "white")
            .attr("stroke-width", d => getISO(d) === iso ? 2.5 : 0.5)
            .attr("opacity", d => {
                if (!iso) return 1;
                return getISO(d) === iso ? 1 : 0.6;
            });

        if (cartogramPaths) {
            cartogramPaths
                .attr("stroke", d => getISO(d) === iso ? "#e74c3c" : "#cccccc")
                .attr("stroke-width", d => getISO(d) === iso ? 1.5 : 0.3)
                .attr("fill", d => getISO(d) === iso ? "#ffe5e5" : "#f0f0f0");
        }

        if (cartogramSelection) {
            cartogramSelection
                .attr("stroke", d => d.iso === iso ? "#e74c3c" : "#2c3e50")
                .attr("stroke-width", d => d.iso === iso ? 3 : 1)
                .attr("opacity", d => {
                    if (!iso) return 1;
                    return d.iso === iso ? 1 : 0.3;
                });
        }
    }

    function unhighlightAll() {
        choroplethSelection
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("opacity", 1);

        if (cartogramPaths) {
            cartogramPaths
                .attr("stroke", "#cccccc")
                .attr("stroke-width", 0.3)
                .attr("fill", "#f0f0f0");
        }

        if (cartogramSelection) {
            cartogramSelection
                .attr("stroke", "#2c3e50")
                .attr("stroke-width", 1)
                .attr("opacity", 1);
        }
    }

}).catch(err => {
    console.error("Data loading error:", err);
    d3.select("body")
        .append("p")
        .style("color", "red")
        .text("Failed to load GeoJSON or GDP data.");
});