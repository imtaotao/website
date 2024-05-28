import path from "node:path";

export const ENV = process.env.NODE_ENV as "development" | "producetion";
export const isDev = ENV === "development";

export function resolve(dir: string) {
  return path.resolve(process.cwd(), "./lib", dir);
}
