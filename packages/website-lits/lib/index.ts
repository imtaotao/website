import zlib from "node:zlib";
import http from "node:http";
import http2 from "node:http2";
import Koa from "koa";
import cors from "@koa/cors";
import mount from "koa-mount";
import sslify from "koa-sslify";
import koaStatic from "koa-static";
import compress from "koa-compress";
import { isDev, SSL } from "@website/utils/node";
import { createDeployApp } from "./deploy";
import { defense } from "./middlewares/defense";
import { redirectHttps } from "./middlewares/redirectHttps";

let started = false;

export interface Options {
  apiApp: Koa;
  staticDir: string;
  ssl: {
    key: string;
    cert: string;
  };
}

// 静态资源应该放到 CDN 上
export function lits({ ssl, apiApp, staticDir }: Options) {
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
  app.use(mount("/deploy", createDeployApp(staticDir)));
  app.use(compress(compressConfig));
  app.use(koaStatic(staticDir));

  // Start server
  if (isDev) {
    http2.createSecureServer(ssl, app.callback()).listen(8000);
    console.log("http2 server is running: https://localhost:8000");
  } else {
    http.createServer(app.callback()).listen(80);
    http2.createSecureServer(ssl, app.callback()).listen(443);
    console.log("http2 server is running.");
  }
}