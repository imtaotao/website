import fs from "node:fs";
import path from "node:path";

export const ENV = process.env.NODE_ENV as "development" | "producetion";
export const isDev = ENV === "development";

export function resolve(dir: string) {
  return path.resolve(process.cwd(), "./lib", dir);
}

export function sslCert() {
  const keyDir = resolve(`./certs/${isDev ? "" : "prod/"}key.pem`);
  const certDir = resolve(`./certs/${isDev ? "" : "prod/"}cert.pem`);
  return {
    key: fs.readFileSync(keyDir),
    cert: fs.readFileSync(certDir),
  };
}
