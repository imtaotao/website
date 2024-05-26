const path = require("node:path");

exports.resolve = function resolve(dir) {
  return path.resolve(process.cwd(), "./server", dir);
};
