const sumArrays = (a, b) =>
  a.map(function(num, idx) {
    return num + b[idx];
  });

const divArray = (a, n) => a.map(x => x / n);

const multiplyArray = (a, n) => a.map(x => x * n);

const parseGraph = str => {
  let nodes = [];
  let colors = [[255, 0, 0], [0, 200, 200], [200, 200, 0], [200, 0, 200]];
  let elems = str.split(" ");
  let colorsUsed = 0;
  let createNode = elem => {
    let color;
    if (elem === "X") {
      color = [0, 200, 0];
    } else if (elem === "Y") {
      color = [100, 100, 100];
    } else {
      color = colors[colorsUsed % colors.length];
      colorsUsed++;
    }
    const node = {
      name: elem,
      color: color,
      links: [],
      blocked: false,
      final: elem === "Y"
    };
    nodes.push(node);
    return node;
  };
  let index = 0;
  for (let elem of elems) {
    if (elem === "->") {
      let node = nodes.find(x => x.name === elems[index - 1]);
      node.links.push({ target: elems[index + 1] });
    } else if (elem === "<-") {
      let node = nodes.find(x => x.name === elems[index + 1]);
      if (!node) node = createNode(elems[index + 1]);
      node.links.push({ target: elems[index - 1] });
    } else if (!nodes.find(x => x.name === elem)) {
      createNode(elem);
    }
    index++;
  }
  return nodes;
};

const app = new Vue({
  el: "#app",
  data: {
    // nodes: parseGraph("X -> Y")
    // nodes: parseGraph("X <- Z -> Y <- X")
    // nodes: parseGraph("X -> Z <- Y <- X")
    // nodes: parseGraph("X <- Z -> Y <- X -> D <- Z")
    nodes: parseGraph("X <- A -> C <- B -> Y <- X")
    // nodes: parseGraph("X <- A -> C <- B -> Y <- X <- C")
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
    findNode(name) {
      return this.nodes.find(x => x.name === name);
    },
    findLink(origin, target) {
      const originNode = this.findNode(origin);
      return originNode.links.find(x => x.target === target);
    },
    findLinkedNodes(target) {
      return this.nodes.filter(x => x.links.some(y => y.target === target));
    },
    calculateColors(nodes) {
      for (let node of nodes) {
        let allLinkedNodes = this.findLinkedNodes(node.name);
        this.calculateColors(allLinkedNodes);
        let colors = node.final ? [] : [node.color];
        for (let linkedNode of allLinkedNodes) {
          if (linkedNode.blocked) continue;
          colors.push(linkedNode.calculatedColor);
        }
        console.log(node.name, "colors", colors);

        let total = colors.length;
        if (node.final) {
          const controlledNodesColors = this.nodes
            .filter(x => x.blocked)
            .filter(x => !allLinkedNodes.includes(x))
            .map(x => multiplyArray(x.calculatedColor, -1));
          colors = colors.concat(controlledNodesColors);
          total -= 1;
        }

        // if (colors == []) colors = [node.color];
        const color = divArray(
          colors.reduce(sumArrays, [0, 0, 0]),
          Math.max(total, 1)
        );
        node.calculatedColor = color;
      }
    },
    toRGB(color) {
      return `rgb(${color.join(",")})`;
    },
    draw() {
      const names = this.nodes.map(x => x.name);
      this.calculateColors(this.nodes);

      const links = this.nodes
        .flatMap((node, index) =>
          node.blocked
            ? []
            : node.links.map(link => ({
                source: index,
                target: names.indexOf(link.target),
                calculatedColor: node.calculatedColor
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
        .attr("stroke-width", 5)
        .attr("stroke", d => this.toRGB(d.calculatedColor))
        .attr("marker-end", d => "url(#black-triangle)");

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
      createTriangle("black-triangle", "#000");

      // const scale = d3.scaleOrdinal(d3.schemeCategory10);
      // const color = (d, i) => scale(i);

      const node = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("g")
        .data(nodes)
        .join("g")
        .on("click", d => {
          d.blocked = !d.blocked;
        })
        .call(drag(simulation));

      node
        .append("circle")
        .attr("r", 30)
        .attr("fill", d => this.toRGB(d.calculatedColor));

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
