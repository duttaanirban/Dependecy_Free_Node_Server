const test = require("node:test");
const assert = require("node:assert/strict");
const { buildResponse } = require("../src/bfhl");

const identity = {
  userId: "johndoe_17091999",
  emailId: "john.doe@college.edu",
  collegeRollNumber: "21CS1001"
};

test("buildResponse matches the core sample behavior", () => {
  const response = buildResponse(
    [
      "A->B", "A->C", "B->D", "C->E", "E->F",
      "X->Y", "Y->Z", "Z->X",
      "P->Q", "Q->R",
      "G->H", "G->H", "G->I",
      "hello", "1->2", "A->"
    ],
    identity
  );

  assert.equal(response.user_id, identity.userId);
  assert.deepEqual(response.invalid_entries, ["hello", "1->2", "A->"]);
  assert.deepEqual(response.duplicate_edges, ["G->H"]);
  assert.equal(response.summary.total_trees, 3);
  assert.equal(response.summary.total_cycles, 1);
  assert.equal(response.summary.largest_tree_root, "A");

  const cycleGroup = response.hierarchies.find((item) => item.root === "X");
  assert.deepEqual(cycleGroup, {
    root: "X",
    tree: {},
    has_cycle: true
  });

  const treeGroup = response.hierarchies.find((item) => item.root === "A");
  assert.equal(treeGroup.depth, 4);
});

test("first parent wins for a multi-parent child", () => {
  const response = buildResponse(["A->D", "B->D", "D->E"], identity);

  assert.equal(response.summary.total_trees, 2);
  assert.deepEqual(
    response.hierarchies,
    [
      {
        root: "A",
        tree: {
          A: {
            D: {
              E: {}
            }
          }
        },
        depth: 3
      },
      {
        root: "B",
        tree: {
          B: {}
        },
        depth: 1
      }
    ]
  );
});

test("self-loops are invalid after trimming whitespace", () => {
  const response = buildResponse([" A->A ", " A->B "], identity);

  assert.deepEqual(response.invalid_entries, [" A->A "]);
  assert.equal(response.summary.total_trees, 1);
  assert.equal(response.hierarchies[0].root, "A");
});
