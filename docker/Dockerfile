# syntax=docker/dockerfile:1
FROM node:lts-alpine

RUN apk add curl

COPY <<-"EOF" /app/server.js
const http = require("node:http");

function main() {
  const port = 3000;

  const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        message: "ok",
      }) + "\n"
    );
  });

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });
}

CMD ["node", "/app/server.js"]