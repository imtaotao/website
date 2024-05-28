import zlib from "node:zlib";
import http from "node:http";
import http2 from "node:http2";
import Koa from "koa";
import cors from "@koa/cors";
import mount from "koa-mount";
import sslify from "koa-sslify";
import koaStatic from "koa-static";
import compress from "koa-compress";
import { apiApp } from "./apis";
import { isDev, sslCert, resolve } from "./shared";

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

app.use(sslify());
app.use(cors());
app.use(mount("/api", apiApp));
app.use(compress(compressConfig));
app.use(koaStatic(resolve("../../website-web/dist")));

// Start server
http.createServer(app.callback()).listen(80);
http2.createSecureServer(sslCert(), app.callback()).listen(isDev ? 8000 : 443);
console.log(
  `http2 server is running${isDev ? ": https://localhost:8000" : "."}`
);
