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
  let colors = [
    [255, 0, 0],
    [255, 130, 0],
    [255, 190, 0],
    [0, 153, 255],
    [100, 100, 255],
    [0, 0, 0]
  ];
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
  if (nodes.length === 0) return [];
  nodes = [...nodes];
  nodes.forEach(n => {
    n.effects = [];
    n.checked = false;
  });
  nodes = calculateOriginalEffects(nodes, nodes);

  const controlled = findControlled(nodes);
  nodes = calculateControlledEffects(controlled, nodes, [findNode(nodes, "Y")]);
  nodes = calculateControlledEffects(controlled, nodes, [findNode(nodes, "X")]);

  const confounders = findCounfounders(nodes);
  addYColor(nodes, confounders);

  return nodes;
};

const findControlled = nodes =>
  nodes.filter(x => x.controlled).flatMap(x => [x.name, ...x.effects]);

const calculateOriginalEffects = (nodes, nextNodes) => {
  for (let node of nextNodes) {
    let parents = findParentNodes(nodes, node.name);
    calculateOriginalEffects(nodes, parents);
    let effects = [];
    for (let parent of parents) {
      effects.push(parent.name);
      effects = effects.concat(parent.effects);
    }
    node.effects = effects;
  }
  return nodes;
};

const calculateControlledEffects = (controlled, nodes, nextNodes) => {
  for (let node of nextNodes) {
    if (node.checked) return nodes;
    node.checked = true;
    let parents = nodes.filter(
      x => x.links.some(y => y.target === node.name) && !x.controlled
    );
    let children = node.links.map(x => x.target);
    let controlledChildren = nodes.filter(
      x => children.includes(x.name) && controlled.includes(x.name)
    );
    let affectingNodes = parents.concat(controlledChildren);
    calculateControlledEffects(controlled, nodes, affectingNodes);

    let effects = [];
    for (let n of affectingNodes) {
      effects.push(n.name);
      effects = effects.concat(n.effects);
      effects = effects.filter(x => x !== node.name);
    }
    node.effects = effects;
  }
  return nodes;
};

const findCounfounders = nodes => {
  const x = findNode(nodes, "X");
  const y = findNode(nodes, "Y");
  const additionalEffects = removeFromArray(y.effects, x.effects);
  const confounders = additionalEffects.filter(c => x.effects.includes(c));
  const jointBiases = removeFromArray(x.effects, y.effects);

  return confounders.concat(jointBiases);
};

const addYColor = (nodes, confounders) => {
  const finalColors = [findNode(nodes, "X").color].concat(
    confounders.map(x => findNode(nodes, x).color)
  );
  const color = divArray(
    finalColors.reduce(sumArrays, [0, 0, 0]),
    finalColors.length
  );
  const y = findNode(nodes, "Y");
  y.calculatedColor = color;
};

// Tests

let eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
let assertConfounders = (dag, controlled, expected) => {
  let sample = parseGraph(dag);
  controlled.forEach(elem => {
    findNode(sample, elem).controlled = true;
  });
  sample = calculateEffects(sample);
  let confounders = findCounfounders(sample);

  console.assert(
    eq(confounders, expected),
    `cofounders expected ${JSON.stringify(
      expected
    )} for ${dag}, actual: ${JSON.stringify(confounders)}`
  );
};
let assertEffects = (dag, opts) => {
  let sample = parseGraph(dag);
  if (opts.control) {
    for (let controlledNode of opts.control) {
      findNode(sample, controlledNode).controlled = true;
    }
  }
  sample = calculateEffects(sample);
  let node = findNode(sample, opts.effectsFor);

  console.assert(
    eq(node.effects, opts.expect),
    `effects expected ${JSON.stringify(opts.expect)} for ${
      opts.effectsFor
    } in ${dag} controlling for ${JSON.stringify(
      opts.control
    )}, actual: ${JSON.stringify(node.effects)}`
  );
};

assertEffects("X <- Z -> Y <- X", { effectsFor: "X", expect: ["Z"] });
assertEffects("X <- Z -> Y <- X", { effectsFor: "Y", expect: ["X", "Z", "Z"] });
assertEffects("X <- Z -> Y <- X", { effectsFor: "Z", expect: [] });
assertEffects("X -> Z <- Y <- X", { effectsFor: "Y", expect: ["X"] });
assertEffects("X <- A <- Z -> B -> Y <- X", {
  effectsFor: "X",
  expect: ["A", "Z"]
});
assertEffects("X <- A <- Z -> B -> Y <- X", {
  effectsFor: "Y",
  expect: ["X", "A", "Z", "B", "Z"]
});
assertEffects("X <- Z -> Y <- X", {
  control: ["Z"],
  effectsFor: "X",
  expect: []
});
assertEffects("X <- Z -> Y <- X", {
  control: ["Z"],
  effectsFor: "Y",
  expect: ["X"]
});
assertEffects("X -> Z <- Y <- X", {
  control: ["Z"],
  effectsFor: "Y",
  expect: ["X", "Z", "Z", "X", "X"]
});
assertEffects("X <- A <- Z -> B -> Y <- X", {
  control: ["Z"],
  effectsFor: "X",
  expect: ["A"]
});
assertEffects("X <- A <- Z -> B -> Y <- X", {
  control: ["Z"],
  effectsFor: "Y",
  expect: ["X", "A", "B"]
});
assertEffects("X <- Z -> Y <- X -> D <- Z", {
  effectsFor: "Y",
  expect: ["X", "Z", "Z"]
});
assertEffects("X <- Z -> Y <- X -> D <- Z", {
  control: ["Z"],
  effectsFor: "Y",
  expect: ["X"]
});
assertEffects("X <- Z -> Y <- X -> D <- Z", {
  control: ["D"],
  effectsFor: "Y",
  expect: ["X", "Z", "D", "D", "Z", "Z", "Z", "X", "D", "X"]
});
// // M bias
assertEffects("X <- A -> C <- B -> Y <- X", {
  effectsFor: "Y",
  expect: ["X", "A", "B"]
});
assertEffects("X <- A -> C <- B -> Y <- X", {
  control: ["A", "C"],
  effectsFor: "Y",
  expect: ["X", "B", "C"]
});
assertEffects("X <- A -> C <- B -> Y <- X", {
  control: ["A", "C"],
  effectsFor: "X",
  expect: []
});
assertEffects("X <- A -> C <- B -> Y <- X", {
  control: ["B", "C"],
  effectsFor: "Y",
  expect: ["X", "A", "C"]
});
assertEffects("X <- A -> C <- B -> Y <- X", {
  control: ["A", "B"],
  effectsFor: "Y",
  expect: ["X"]
});
assertEffects("X <- A -> C <- B -> Y <- X", {
  control: ["C"],
  effectsFor: "Y",
  expect: ["X", "A", "C", "B", "B", "C", "A"]
});
assertEffects("E <- X <- A -> B -> C <- B <- D -> E -> Y", {
  effectsFor: "Y",
  expect: ["E", "X", "A", "D"]
});
assertEffects("E <- X <- A -> B -> C <- B <- D -> E -> Y", {
  control: ["C", "A"],
  effectsFor: "Y",
  expect: ["E", "X", "D", "B", "C", "A"]
});

assertConfounders("X -> Y", [], []);
assertConfounders("X <- Z -> Y <- X", [], ["Z"]);
assertConfounders("X <- Z -> Y <- X", ["Z"], []);
assertConfounders("X -> Z <- Y <- X", [], []);
assertConfounders("X <- A <- Z -> B -> Y <- X", ["Z"], []);
assertConfounders("X <- Z -> Y <- X -> D <- Z", ["Z"], []);
assertConfounders("X <- A -> C <- B -> Y <- X", [], []);
assertConfounders("X <- A -> C <- B -> Y <- X", ["C", "A"], []);
assertConfounders("X <- A -> C <- B -> Y <- X", ["C", "B"], []);
assertConfounders("X <- A -> C <- B -> Y <- X <- C", ["B"], []);
assertConfounders("X <- A -> C <- B -> Y <- X <- C", ["C", "A"], []);
assertConfounders("X <- A -> C <- B -> Y <- X <- C", ["C", "B"], []);
assertConfounders("E <- X <- A -> B -> C <- B <- D -> E -> Y", [], []);
assertConfounders("E <- X <- A -> B -> C <- B <- D -> E -> Y", ["C", "A"], []);
assertConfounders("E <- X <- A -> B -> C <- B <- D -> E -> Y", ["C", "D"], []);
assertConfounders("E <- X <- A -> B -> C <- B <- D -> E -> Y", ["B", "A"], []);
assertConfounders("E <- X <- A -> B -> C <- B <- D -> E -> Y", ["B", "D"], []);
