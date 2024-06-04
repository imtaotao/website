import path from "node:path";
import { lits } from "@website/lits";
import { isDev } from "@website/utils/node";
import { apiApp } from "./apis";

const devPort = 8000;
const staticDir = path.resolve(__dirname, "../../web/dist");
const ssl = {
  key: isDev ? null : process.env.SSL_KEY,
  cert: isDev ? null : process.env.SSL_CERT,
};

lits({
  ssl,
  apiApp,
  devPort,
  staticDir,
}).then(() =>
  console.log(
    `http server is running${isDev ? `: http://localhost:${devPort}` : "."}`
  )
);
