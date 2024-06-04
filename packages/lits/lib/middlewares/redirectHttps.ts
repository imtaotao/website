import type { Next, ParameterizedContext } from "koa";

export function redirectHttps() {
  return async (ctx: ParameterizedContext, next: Next) => {
    console.log(ctx);
    if (!ctx.secure) {
      const { host, pathname, search } = ctx.URL;
      ctx.redirect(`https://${host}${pathname}${search}`);
    } else {
      await next();
    }
  };
}
