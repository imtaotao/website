import zlib from "node:zlib";
import http from "node:http";
import http2 from "node:http2";
import Koa from "koa";
import cors from "@koa/cors";
import mount from "koa-mount";
import sslify from "koa-sslify";
import koaStatic from "koa-static";
import compress from "koa-compress";
import { isDev } from "@website/utils/node";
import { createDeployApp } from "./deploy";
import { defense } from "@/middlewares/defense";
import { redirectHttps } from "./middlewares/redirectHttps";

let started = false;

export interface Options {
  apiApp: Koa;
  devPort: number;
  staticDir: string;
  ssl: {
    key?: string | null;
    cert?: string | null;
  };
}

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

export function lits({ ssl, apiApp, devPort, staticDir }: Options) {
  return new Promise<void>((resolve) => {
    if (started) {
      console.warn("Lits server has been started.");
      return;
    }
    started = true;
    const app = new Koa();
    if (!isDev) {
      app.use(redirectHttps());
      app.use(sslify());
    }
    app.use(defense());
    app.use(cors());
    app.use(mount("/api", apiApp));
    app.use(mount("/deploy", createDeployApp(staticDir)));
    app.use(compress(compressConfig));
    app.use(koaStatic(staticDir));

    if (isDev) {
      http.createServer(app.callback()).listen(devPort, resolve);
    } else {
      let i = 0;
      const meter = () => ++i === 2 && resolve();
      http.createServer(app.callback()).listen(80, meter);
      http2
        .createSecureServer(ssl as NonNullable<{}>, app.callback())
        .listen(443, meter);
    }
  });
}
