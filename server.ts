import { createServer } from "node:http";
import nextEnv from "@next/env";

const dev = process.env.NODE_ENV !== "production";
// .env laden, bevor DB/Socket-Module importiert werden
nextEnv.loadEnvConfig(process.cwd(), dev);

const { default: next } = await import("next");
const { attachSocket } = await import("./src/server/socket");

const port = Number(process.env.PORT ?? 3000);
const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const http = createServer((req, res) => handle(req, res));
attachSocket(http);

http.listen(port, () => {
  console.log(`> Wortjagd läuft auf http://localhost:${port} (${dev ? "dev" : "prod"})`);
});
