import zlib from "node:zlib";
import http from "node:http";
import http2 from "node:http2";
import Koa from "koa";
import cors from "@koa/cors";
import mount from "koa-mount";
import sslify from "koa-sslify";
import koaStatic from "koa-static";
import compress from "koa-compress";
import { isDev } from "@/shared";
import { sslCert } from "./certs";
import { defense } from "@/lits/middlewares/defense";
import { redirectHttps } from "@/lits/middlewares/redirectHttps";

let started = false;

export function lits(staticDir: string, apiApp: Koa) {
  if (started) {
    throw new Error("Lits server has been started.");
  }
  started = true;
  const app = new Koa();

  const compressConfig = {
    threshold: 1,
    br: false as false,
    gzip: {
      flush: zlib.constants.Z_SYNC_FLUSH,
    },
    deflate: {
      flush: zlib.constants.Z_SYNC_FLUSH,
    },
  };

  app.use(redirectHttps());
  app.use(defense());
  app.use(sslify());
  app.use(cors());
  app.use(mount("/api", apiApp));
  app.use(compress(compressConfig));
  app.use(koaStatic(staticDir));

  // Start server
  if (isDev) {
    http2.createSecureServer(sslCert(), app.callback()).listen(8000);
    console.log("http2 server is running: https://localhost:8000");
  } else {
    http.createServer(app.callback()).listen(80);
    http2.createSecureServer(sslCert(), app.callback()).listen(443);
    console.log("http2 server is running.");
  }
}
