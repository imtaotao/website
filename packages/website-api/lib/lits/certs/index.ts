import fs from "node:fs";
import { isDev, resolve } from "@/shared";

export function sslCert() {
  const keyDir = resolve(`./lits/certs/${isDev ? "" : "prod/"}key.pem`);
  const certDir = resolve(`./lits/certs/${isDev ? "" : "prod/"}cert.pem`);
  return {
    key: fs.readFileSync(keyDir),
    cert: fs.readFileSync(certDir),
  };
}
