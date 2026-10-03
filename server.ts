import { createServer } from "node:http";
import next from "next";
import { attachSocket } from "./src/server/socket";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const http = createServer((req, res) => handle(req, res));
attachSocket(http);

http.listen(port, () => {
  console.log(`> Wortjagd läuft auf http://localhost:${port} (${dev ? "dev" : "prod"})`);
});
