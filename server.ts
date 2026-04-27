import http from "node:http";
import { parse } from "node:url";

import next from "next";
import { WebSocketServer } from "ws";

import { subscribe } from "./lib/workquiz/realtime";

const port = Number(process.env.PORT ?? 3000);
const dev = process.env.NODE_ENV !== "production";

async function main() {
  const server = http.createServer();
  const app = next({ dev, hostname: "0.0.0.0", port });
  const handle = app.getRequestHandler();

  await app.prepare();
  const handleUpgrade = app.getUpgradeHandler();

  server.on("request", (request, response) => {
    const parsed = parse(request.url ?? "", true);
    handle(request, response, parsed).catch((error) => {
      response.statusCode = 500;
      response.end("Internal server error");
      console.error(error);
    });
  });

  const websocketServer = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const { pathname, query } = parse(request.url ?? "", true);
    const token = typeof query.token === "string" ? query.token : null;

    if (pathname !== "/ws") {
      void handleUpgrade(request, socket, head).catch((error) => {
        console.error(error);
        socket.destroy();
      });
      return;
    }

    if (!token) {
      socket.destroy();
      return;
    }

    websocketServer.handleUpgrade(request, socket, head, (websocket) => {
      const unsubscribe = subscribe(token, (payload) => {
        if (websocket.readyState === websocket.OPEN) {
          websocket.send(JSON.stringify(payload));
        }
      });

      websocket.on("close", unsubscribe);
      websocket.send(JSON.stringify({ type: "connected" }));
    });
  });

  server.listen(port, "0.0.0.0", () => {
    console.log(`WorkQuiz ready on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
