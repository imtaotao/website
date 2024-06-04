import type { Next, ParameterizedContext } from "koa";

// TODO: 只允许白名单的 method
export function defense() {
  return async (_ctx: ParameterizedContext, next: Next) => {
    await next();
  };
}
