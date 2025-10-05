const router = require("./core/router.js");
const loger = require("../scripts/loger.js");

module.exports = (req, res) => {
    loger(req, res, () => {
    router(req, res);
  });
};