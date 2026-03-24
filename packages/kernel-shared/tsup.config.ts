import { baseOptions } from "../../tsup.config";

export const tsup = baseOptions(import.meta.url, ["cjs", "esm", "iife"]);
