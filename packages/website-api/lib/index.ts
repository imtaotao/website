import path from "node:path";
import { lits } from "@website/lits";
import { isDev } from "@website/utils/node";
import { apiApp } from "./apis";

const devPort = 8000;
const staticDir = path.resolve(__dirname, "../../website-web/dist");

lits({
  apiApp,
  devPort,
  staticDir,
  ssl: {
    key: process.env.SSL_KEY as string,
    cert: process.env.SSL_CERT as string,
  },
}).then(() => {
  isDev
    ? console.log(`http2 server is running: https://localhost:${devPort}`)
    : console.log("http2 server is running.");
});
