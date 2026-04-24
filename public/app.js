const edgeInput = document.getElementById("edgeInput");
const submitButton = document.getElementById("submitButton");
const sampleButton = document.getElementById("sampleButton");
const statusBox = document.getElementById("status");
const resultsSection = document.getElementById("results");
const summaryGrid = document.querySelector(".summary-grid");
const metaGrid = document.querySelector(".meta-grid");
const hierarchyList = document.querySelector(".hierarchy-list");
const rawResponse = document.querySelector(".raw-response");

const sampleValue = `A->B
A->C
B->D
C->E
E->F
X->Y
Y->Z
Z->X
P->Q
Q->R
G->H
G->H
G->I
hello
1->2
A->`;

function parseInput(value) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function setStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.toggle("error", isError);
}

function renderCards(container, title, items) {
  const card = document.createElement("article");
  card.className = "meta-card";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const content = document.createElement("pre");
  content.textContent = Array.isArray(items)
    ? items.length > 0
      ? items.join("\n")
      : "None"
    : String(items);

  card.append(heading, content);
  container.append(card);
}

function renderResponse(payload) {
  summaryGrid.innerHTML = "";
  metaGrid.innerHTML = "";
  hierarchyList.innerHTML = "";
  rawResponse.innerHTML = "";

  const summaryEntries = [
    ["Valid trees", payload.summary.total_trees],
    ["Cycle groups", payload.summary.total_cycles],
    ["Largest tree root", payload.summary.largest_tree_root || "N/A"]
  ];

  for (const [label, value] of summaryEntries) {
    const card = document.createElement("article");
    card.className = "stat-card";
    card.innerHTML = `<h2>${label}</h2><p>${value}</p>`;
    summaryGrid.append(card);
  }

  renderCards(metaGrid, "User ID", payload.user_id);
  renderCards(metaGrid, "Email ID", payload.email_id);
  renderCards(metaGrid, "College Roll Number", payload.college_roll_number);
  renderCards(metaGrid, "Invalid Entries", payload.invalid_entries);
  renderCards(metaGrid, "Duplicate Edges", payload.duplicate_edges);

  for (const hierarchy of payload.hierarchies) {
    const card = document.createElement("article");
    card.className = "tree-card";

    const badge = document.createElement("div");
    badge.className = `tree-badge${hierarchy.has_cycle ? " cycle" : ""}`;
    badge.textContent = hierarchy.has_cycle ? `Cycle at ${hierarchy.root}` : `Tree rooted at ${hierarchy.root}`;

    const title = document.createElement("h2");
    title.textContent = hierarchy.has_cycle
      ? "Cycle detected"
      : `Depth ${hierarchy.depth}`;

    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(hierarchy, null, 2);

    card.append(badge, title, pre);
    hierarchyList.append(card);
  }

  const rawTitle = document.createElement("h2");
  rawTitle.textContent = "Raw JSON Response";
  const rawPre = document.createElement("pre");
  rawPre.textContent = JSON.stringify(payload, null, 2);
  rawResponse.append(rawTitle, rawPre);

  resultsSection.classList.remove("hidden");
}

async function submitEdges() {
  const data = parseInput(edgeInput.value);

  submitButton.disabled = true;
  setStatus("Submitting request...");

  try {
    const response = await fetch("/bfhl", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Request failed");
    }

    renderResponse(payload);
    setStatus(`Processed ${data.length} entries successfully.`);
  } catch (error) {
    resultsSection.classList.add("hidden");
    setStatus(error.message, true);
  } finally {
    submitButton.disabled = false;
  }
}

submitButton.addEventListener("click", submitEdges);
sampleButton.addEventListener("click", () => {
  edgeInput.value = sampleValue;
  setStatus("Sample data loaded.");
});
