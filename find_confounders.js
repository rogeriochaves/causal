const sumArrays = (a, b) =>
  a.map(function(num, idx) {
    return num + b[idx];
  });

const divArray = (a, n) => a.map(x => x / n);

const multiplyArray = (a, n) => a.map(x => x * n);

const removeFromArray = (a, b) => {
  let result = [...a];
  for (let elem of b) {
    let index = result.indexOf(elem);
    if (index >= 0) {
      result.splice(index, 1);
    }
  }
  return result;
};

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
      controlled: false,
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

const findNode = (nodes, name) => nodes.find(x => x.name === name);

const findParentNodes = (nodes, target) =>
  nodes.filter(x => x.links.some(y => y.target === target));

const calculateEffects = nodes => {
  for (let node of nodes) {
    let allParentNodes = findParentNodes(nodes, node.name);
    calculateEffects(allParentNodes);

    let effects = [];
    for (let parent of allParentNodes) {
      if (parent.controlled) continue;
      effects.push(parent.name);
      effects = effects.concat(parent.effects);
    }
    node.effects = effects;

    if (node.final) {
      const controlledEffects = nodes
        .filter(x => x.controlled)
        .flatMap(x => [x.name].concat(x.effects));

      const xEffects = ["X"].concat(findNode(nodes, "X").effects);
      const yEffects = removeFromArray(
        node.effects.filter(x => xEffects.includes(x)),
        controlledEffects
      );
      const additionalEffects = removeFromArray(yEffects, xEffects);
      const missingEffects = removeFromArray(xEffects, yEffects);

      const finalColors = [findNode(nodes, "X").color]
        .concat(additionalEffects.map(x => findNode(nodes, x).color))
        .concat(
          multiplyArray(missingEffects.map(x => findNode(nodes, x).color), -1)
        );
      const color = divArray(
        finalColors.reduce(sumArrays, [0, 0, 0]),
        finalColors.length
      );
      node.calculatedColor = color;
      nodes.confounders = additionalEffects.concat(missingEffects);
    }
  }
};

const findCounfounders = nodes => {
  let pathsFromX = findPathsFromXtoY(nodes)();
  let confounders = pathsFromX.flatMap(x =>
    x.filter(y => y !== "X" && y !== "Y")
  );
  return confounders;
};

const findPathsFromXtoY = (nodes, previous = []) => node => {
  if (!node) node = findNode(nodes, "X");
  // console.log("node.name", node.name);
  if (node.name === "Y") return [[...previous, "Y"]];

  let parents = findParentNodes(nodes, node.name);
  // console.log("parentsControlled", parentsControlled);
  let children = node.links.map(x => findNode(nodes, x.target));
  let nextSteps = parents
    .concat(children)
    .filter(x => !previous.includes(x.name));
  // console.log("nextSteps", nextSteps.map(x => x.name));

  return nextSteps.flatMap(findPathsFromXtoY(nodes, [...previous, node.name]));
};

let eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let assertConfounders = (dag, expected) => {
  let sample = parseGraph(dag);
  let confounders = findCounfounders(sample);
  // calculateEffects(sample);

  console.assert(
    eq(confounders, expected),
    `cofounders expected ${JSON.stringify(
      expected
    )} for ${dag}, actual: ${JSON.stringify(confounders)}`
  );
};
let assertPaths = (dag, expected) => {
  let sample = parseGraph(dag);
  let paths = findPathsFromXtoY(sample)();

  console.assert(
    eq(paths, expected),
    `paths expected ${JSON.stringify(
      expected
    )} for ${dag}, actual: ${JSON.stringify(paths)}`
  );
};

assertPaths("X -> Y", [["X", "Y"]]);
assertPaths("X <- Z -> Y <- X", [["X", "Z", "Y"], ["X", "Y"]]);
assertPaths("X <- Z <- A -> B -> Y <- X", [
  ["X", "Z", "A", "B", "Y"],
  ["X", "Y"]
]);
assertPaths("X <- A -> C <- B -> Y <- X <- C", [
  ["X", "A", "C", "B", "Y"],
  ["X", "C", "B", "Y"],
  ["X", "Y"]
]);
assertPaths("E <- X <- A <- B -> C <- B <- D -> E -> Y", [
  ["X", "A", "B", "D", "E", "Y"],
  ["X", "E", "Y"]
]);

// assertConfounders("X -> Y", []);
// assertConfounders("X <- Z -> Y <- X", ["Z"]);
// assertConfounders("X <- Z <- A -> B -> Y <- X", ["Z", "D"]);
// assertConfounders("X -> Z <- Y <- X", []);
// assertConfounders("X <- Z -> Y <- X -> D <- Z", ["Z"]);
// assertConfounders("X <- A -> C <- B -> Y <- X", []);
// assertConfounders("X <- A -> C <- B -> Y <- X <- C", ["C"]);
