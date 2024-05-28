import Koa from "koa";
import Router from "koa-router";

export function createDeployApp(staticDir: string) {
  const router = new Router();

  router.get("/web", (ctx) => {
    ctx.body = "web ok!";
  });

  router.get("/api", (ctx) => {
    ctx.body = "api ok!";
  });

  router.get("/all", (ctx) => {
    ctx.body = "all ok!";
  });

  const deployApp = new Koa();
  deployApp.use(router.routes());
  deployApp.use(router.allowedMethods());

  return deployApp;
}
