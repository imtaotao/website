import path from "node:path";
import { apiApp } from "./apis";
import { lits } from "@website/lits";

lits({
  apiApp,
  staticDir: path.resolve(__dirname, "../../website-web/dist"),
  ssl: {
    key: process.env.SSL_KEY as string,
    cert: process.env.SSL_CERT as string,
  },
});
