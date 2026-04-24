const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildResponse } = require("./src/bfhl");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");

const identity = {
  userId: process.env.BFHL_USER_ID || "yourname_ddmmyyyy",
  emailId: process.env.BFHL_EMAIL_ID || "your.college.email@example.com",
  collegeRollNumber: process.env.BFHL_COLLEGE_ROLL_NUMBER || "YOUR_ROLL_NUMBER"
};

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function serveStatic(requestPath, response) {
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": MIME_TYPES[extension] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*"
    });
    response.end(content);
  });
}

function collectRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 1_000_000) {
        reject(new Error("Payload too large"));
        request.destroy();
      }
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    response.end();
    return;
  }

  if (request.method === "POST" && url.pathname === "/bfhl") {
    try {
      const contentType = request.headers["content-type"] || "";
      if (!contentType.includes("application/json")) {
        sendJson(response, 415, {
          error: "Content-Type must be application/json"
        });
        return;
      }

      const rawBody = await collectRequestBody(request);
      const payload = rawBody ? JSON.parse(rawBody) : {};

      if (!Array.isArray(payload.data)) {
        sendJson(response, 400, {
          error: "Request body must be a JSON object with a data array"
        });
        return;
      }

      const result = buildResponse(payload.data, identity);
      sendJson(response, 200, result);
    } catch (error) {
      sendJson(response, 400, {
        error: error.message === "Payload too large" ? error.message : "Invalid JSON payload"
      });
    }
    return;
  }

  if (request.method === "GET") {
    serveStatic(url.pathname, response);
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
