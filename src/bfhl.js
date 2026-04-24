const EDGE_PATTERN = /^([A-Z])->([A-Z])$/;

function normalizeData(input) {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((value) => (typeof value === "string" ? value : String(value ?? "")));
}

function parseAndGroup(entries) {
  const invalidEntries = [];
  const duplicateEdges = [];
  const seenEdges = new Set();
  const parentByChild = new Map();
  const adjacency = new Map();
  const allNodes = new Set();

  for (const rawEntry of entries) {
    const entry = rawEntry.trim();
    const match = EDGE_PATTERN.exec(entry);

    if (!match || match[1] === match[2]) {
      invalidEntries.push(rawEntry);
      continue;
    }

    if (seenEdges.has(entry)) {
      if (!duplicateEdges.includes(entry)) {
        duplicateEdges.push(entry);
      }
      continue;
    }

    seenEdges.add(entry);

    const [, parent, child] = match;
    allNodes.add(parent);
    allNodes.add(child);

    if (parentByChild.has(child)) {
      continue;
    }

    parentByChild.set(child, parent);

    if (!adjacency.has(parent)) {
      adjacency.set(parent, []);
    }
    if (!adjacency.has(child)) {
      adjacency.set(child, []);
    }
    adjacency.get(parent).push(child);
  }

  const undirected = new Map();
  for (const node of allNodes) {
    undirected.set(node, new Set());
  }

  for (const [parent, children] of adjacency.entries()) {
    for (const child of children) {
      undirected.get(parent).add(child);
      undirected.get(child).add(parent);
    }
  }

  const groups = [];
  const visited = new Set();

  for (const node of allNodes) {
    if (visited.has(node)) {
      continue;
    }

    const stack = [node];
    const componentNodes = [];
    visited.add(node);

    while (stack.length > 0) {
      const current = stack.pop();
      componentNodes.push(current);

      for (const neighbor of undirected.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }

    groups.push(componentNodes.sort());
  }

  return {
    invalidEntries,
    duplicateEdges,
    parentByChild,
    adjacency,
    groups
  };
}

function detectCycle(root, adjacency, componentSet) {
  const visiting = new Set();
  const visited = new Set();

  function visit(node) {
    if (visiting.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);
    for (const child of adjacency.get(node) ?? []) {
      if (!componentSet.has(child)) {
        continue;
      }
      if (visit(child)) {
        return true;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return visit(root);
}

function buildTree(node, adjacency, componentSet) {
  const branch = {};

  for (const child of adjacency.get(node) ?? []) {
    if (!componentSet.has(child)) {
      continue;
    }
    branch[child] = buildTree(child, adjacency, componentSet);
  }

  return branch;
}

function computeDepth(node, adjacency, componentSet) {
  const children = (adjacency.get(node) ?? []).filter((child) => componentSet.has(child));
  if (children.length === 0) {
    return 1;
  }

  let maxDepth = 0;
  for (const child of children) {
    maxDepth = Math.max(maxDepth, computeDepth(child, adjacency, componentSet));
  }

  return maxDepth + 1;
}

function chooseRoot(nodes, parentByChild) {
  const roots = nodes.filter((node) => !parentByChild.has(node)).sort();
  if (roots.length > 0) {
    return roots[0];
  }
  return [...nodes].sort()[0];
}

function summarizeHierarchies(hierarchies) {
  const validTrees = hierarchies.filter((item) => !item.has_cycle);
  let largestTreeRoot = "";
  let largestDepth = -1;

  for (const tree of validTrees) {
    if (
      tree.depth > largestDepth ||
      (tree.depth === largestDepth && tree.root < largestTreeRoot)
    ) {
      largestDepth = tree.depth;
      largestTreeRoot = tree.root;
    }
  }

  return {
    total_trees: validTrees.length,
    total_cycles: hierarchies.length - validTrees.length,
    largest_tree_root: largestTreeRoot
  };
}

function buildResponse(data, identity) {
  const entries = normalizeData(data);
  const {
    invalidEntries,
    duplicateEdges,
    parentByChild,
    adjacency,
    groups
  } = parseAndGroup(entries);

  const hierarchies = groups
    .map((nodes) => {
      const componentSet = new Set(nodes);
      const root = chooseRoot(nodes, parentByChild);
      const hasCycle = detectCycle(root, adjacency, componentSet);

      if (hasCycle) {
        return {
          root,
          tree: {},
          has_cycle: true
        };
      }

      const nestedTree = {};
      nestedTree[root] = buildTree(root, adjacency, componentSet);

      return {
        root,
        tree: nestedTree,
        depth: computeDepth(root, adjacency, componentSet)
      };
    })
    .sort((left, right) => left.root.localeCompare(right.root));

  return {
    user_id: identity.userId,
    email_id: identity.emailId,
    college_roll_number: identity.collegeRollNumber,
    hierarchies,
    invalid_entries: invalidEntries,
    duplicate_edges: duplicateEdges,
    summary: summarizeHierarchies(hierarchies)
  };
}

module.exports = {
  buildResponse
};
