import Koa from "koa";
import Router from "koa-router";

const router = new Router();

router.get("/", (ctx) => {
  ctx.body = "hello world!";
});

export const apiApp = new Koa();
apiApp.use(router.routes());
apiApp.use(router.allowedMethods());
