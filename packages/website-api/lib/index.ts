import { lits } from "@/lits";
import { apiApp } from "@/apis";
import { resolve } from "@/shared";

lits({
  apiApp,
  staticDir: resolve("../../website-web/dist"),
});
