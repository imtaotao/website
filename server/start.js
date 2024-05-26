const fs = require("node:fs");
const zlib = require("node:zlib");
const http = require("node:http");
const https = require("node:https");
const Koa = require("koa");
const cors = require("@koa/cors");
const mount = require("koa-mount");
const static = require("koa-static");
const compress = require("koa-compress");
const sslify = require("koa-sslify").default;
const { apiApp } = require("./api");
const { resolve } = require("./utils");

const app = new Koa();

const httpsOptions = {
  key: fs.readFileSync(resolve("./ssl/key.pem")),
  cert: fs.readFileSync(resolve("./ssl/cert.pem")),
};
const compressOptions = {
  threshold: 1,
  br: false,
  gzip: {
    flush: zlib.constants.Z_SYNC_FLUSH,
  },
  deflate: {
    flush: zlib.constants.Z_SYNC_FLUSH,
  },
};

// Start server
app.use(sslify());
app.use(cors());
app.use(mount("/api", apiApp));
app.use(compress(compressOptions));
app.use(static(resolve("../")));
https.createServer(httpsOptions, app.callback()).listen(443);

console.log("https server is running.");
