import { lits } from "@/lits";
import { apiApp } from "@/apis";
import { resolve } from "@/shared";

const staticDir = resolve("../../website-web/dist");

lits(staticDir, apiApp);
