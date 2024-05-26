const fs = require("node:fs");
const zlib = require("node:zlib");
const http2 = require("node:http2");
const Koa = require("koa");
const cors = require("@koa/cors");
const mount = require("koa-mount");
const static = require("koa-static");
const compress = require("koa-compress");
const sslify = require("koa-sslify").default;
const { apiApp } = require("./api");
const { resolve } = require("./utils");

const app = new Koa();

const compressConfig = {
  threshold: 1,
  br: false,
  gzip: {
    flush: zlib.constants.Z_SYNC_FLUSH,
  },
  deflate: {
    flush: zlib.constants.Z_SYNC_FLUSH,
  },
};

const sslConfig = {
  key: fs.readFileSync(resolve("./ssl/key.pem")),
  cert: fs.readFileSync(resolve("./ssl/cert.pem")),
};

app.use(sslify());
app.use(cors());
app.use(mount("/api", apiApp));
app.use(compress(compressConfig));
app.use(static(resolve("../")));

// Start server
http2.createServer(app.callback()).listen(80);
http2.createSecureServer(sslConfig, app.callback()).listen(443);

console.log("http2 server is running.");
