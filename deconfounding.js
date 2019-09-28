const app = new Vue({
  el: "#app",
  data: {
    game: 0,
    games: [
      "X <- Z -> Y <- X",
      "X -> Z <- Y <- X",
      "X -> A -> B <- A -> Y",
      "E <- X <- A -> B -> C <- B <- D -> E -> Y",
      "X <- Z -> Y <- X -> D <- Z",
      "X <- A -> C <- B -> Y <- X",
      "X <- A -> C <- B -> Y <- X <- C",
      "D -> A -> X -> Y <- E <- C -> B -> X <- E -> X <- B <- A <- D -> C -> Y <- F -> X <- B <- C <- F -> Y <- G -> X"
    ],
    state: "none", // none | tried | done
    nodes: [],
    customGame: "X <- Z -> Y <- X",
    showColors: true
  },
  mounted() {
    this.nodes = parseGraph(this.games[0]);
    this.draw();
  },
  watch: {
    nodes: {
      handler() {
        this.draw();
      },
      deep: true
    },
    showColors: {
      handler() {
        this.draw();
      }
    }
  },
  computed: {
    gameOver() {
      return this.game >= this.games.length;
    }
  },
  methods: {
    check() {
      if (findCounfounders(this.nodes).length === 0) {
        this.state = "done";
      } else {
        this.state = "tried";
      }
    },
    next() {
      this.game += 1;
      if (this.gameOver) {
        this.nodes = [];
      } else {
        this.nodes = parseGraph(this.games[this.game]);
      }
      this.state = "none";
    },
    create() {
      this.nodes = parseGraph(this.customGame);
      this.state = "none";
    },
    random() {
      const amountNodes = Math.round(Math.random() * 6);
      let nodes = ["A", "B", "C", "D", "E", "F"];
      nodes.splice(0, amountNodes);
      let game = "X";
      for (let n of nodes) {
        let direction = Math.random() > 0.5 ? "<-" : "->";
        game += ` ${direction} ${n}`;
      }
      let direction = Math.random() > 0.5 ? "<-" : "->";
      game += ` ${direction} Y <- X`;
      this.customGame = game;
    },
    findNode(name) {
      return this.nodes.find(x => x.name === name);
    },
    findLink(origin, target) {
      const originNode = this.findNode(origin);
      return originNode.links.find(x => x.target === target);
    },
    findParentNodes(target) {
      return this.nodes.filter(x => x.links.some(y => y.target === target));
    },
    calculateEffects(nodes) {
      calculateEffects(nodes);
    },
    toRGB(color) {
      if (this.showColors) {
        return `rgb(${color.join(",")})`;
      }
      return `rgb(150, 150, 150)`;
    },
    draw() {
      const names = this.nodes.map(x => x.name);
      this.calculateEffects(this.nodes);

      const nodes = this.nodes;
      const controlled = findControlled(nodes);
      const links = nodes
        .flatMap((node, index) => {
          if (node.controlled) {
            return [];
          } else {
            return node.links.map(link =>
              controlled.includes(link.target)
                ? {
                    source: names.indexOf(link.target),
                    target: index,
                    color: findNode(nodes, link.target).color
                  }
                : {
                    source: index,
                    target: names.indexOf(link.target),
                    color: node.color
                  }
            );
          }
        })
        .filter(l => l.target >= 0);

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
        .attr("stroke", d => this.toRGB(d.color))
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
          d.controlled = !d.controlled;
        })
        .call(drag(simulation));

      node
        .append("circle")
        .attr("r", 30)
        .attr("fill", d => this.toRGB(d.calculatedColor || d.color));

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
