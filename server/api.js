const Koa = require("koa");
const router = require("koa-router")();

router.get("/", (ctx) => {
  ctx.body = "hello world!";
});

const apiApp = new Koa();
apiApp.use(router.routes());
apiApp.use(router.allowedMethods());
exports.apiApp = apiApp;
