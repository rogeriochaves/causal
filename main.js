const app = new Vue({
  el: "#app",
  data: {
    nodes: [
      {
        name: "Genes",
        prior: 0.01,
        links: [{ target: "Disease", effect: 0.05 }]
      },
      {
        name: "Disease",
        prior: 0.0014,
        links: [{ target: "Test", effect: 0.73 }]
      },
      { name: "Test", prior: 0.121, links: [] }
    ]
  },
  mounted() {
    this.draw();
  },
  watch: {
    nodes: {
      handler() {
        this.draw();
      },
      deep: true
    }
  },
  methods: {
    addNode() {
      this.nodes = [...this.nodes, { name: "", links: [] }];
      this.newNodeName = "";
    },
    addLink(origin) {
      const node = this.findNode(origin);
      node.links = [...node.links, { target: "", effect: 1 }];
    },
    findNode(name) {
      return this.nodes.find(x => x.name === name);
    },
    findLink(origin, target) {
      const originNode = this.findNode(origin);
      return originNode.links.find(x => x.target === target);
    },
    bayes(A, B) {
      const nodeA = this.findNode(A);
      const nodeB = this.findNode(B);
      if (!nodeA || !nodeB) return;

      P_A = nodeA.prior;
      P_B = nodeB.prior;
      P_B_given_A = this.findLink(A, B).effect;

      return ((P_B_given_A * P_A) / P_B).toFixed(4);
    },
    draw() {
      const names = this.nodes.map(x => x.name);
      const links = this.nodes
        .flatMap((node, index) =>
          node.links.map(link => ({
            source: index,
            target: names.indexOf(link.target),
            effect: link.effect
          }))
        )
        .filter(l => l.target >= 0);
      const nodes = this.nodes;

      d3.select("#graph")
        .selectAll("*")
        .remove();

      const width = document.querySelector("#graph").clientWidth - 15;
      const height = Math.max(
        document.querySelector("#graph").clientHeight - 10,
        300
      );

      const svg = d3
        .select("#graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");

      const simulation = d3
        .forceSimulation(nodes)
        .force("link", d3.forceLink(links).id((d, i) => i))
        .force("charge", d3.forceManyBody()) //.strength(-3000))
        .force("collision", d3.forceCollide().radius(d => 60))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg
        .append("g")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", d => Math.abs(d.effect) * 5)
        .attr("stroke", d => (d.effect > 0 ? "#6C6" : "#F99"))
        .attr("marker-end", d =>
          d.effect > 0 ? "url(#green-triangle)" : "url(#red-triangle)"
        );

      const createTriangle = (id, color) =>
        svg
          .append("svg:defs")
          .append("svg:marker")
          .attr("id", id)
          .attr("refX", 46)
          .attr("refY", 9)
          .attr("markerWidth", 19.5)
          .attr("markerHeight", 19.5)
          .attr("orient", "auto")
          .attr("markerUnits", "userSpaceOnUse")
          .append("path")
          .attr("d", "M3,3 L3,16.5 L15,9 L3,3")
          .style("fill", color);
      createTriangle("green-triangle", "#6C6");
      createTriangle("red-triangle", "#F99");

      const scale = d3.scaleOrdinal(d3.schemeCategory10);
      const color = (d, i) => scale(i);

      const node = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(drag(simulation));

      node
        .append("circle")
        .attr("r", 30)
        .attr("fill", color);

      node
        .append("text")
        .attr("fill", "#000")
        .attr("text-anchor", "middle")
        .attr("dy", 4)
        .text(d => d.name);

      simulation.on("tick", () => {
        const limitX = x => (x > width ? width : x < 0 ? 0 : x);
        const limitY = y => (y > height ? height : y < 0 ? 0 : y);
        link
          .attr("x1", d => limitX(d.source.x))
          .attr("y1", d => limitY(d.source.y))
          .attr("x2", d => limitX(d.target.x))
          .attr("y2", d => limitY(d.target.y));

        node.attr(
          "transform",
          d => "translate(" + limitX(d.x) + ", " + limitY(d.y) + ")"
        );
      });
    }
  }
});

function drag(simulation) {
  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}
