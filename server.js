require("babel-polyfill");
var routes = require("./src/routes");
var http = require("http");
const { intitalizeOracle } = require("./src/dbConnection");
const { sendJsonResp, getRequestObject } = require("./src/utils");
const baseName = "/tciserver";
const PORT = process.env.PORT || 8080;
intitalizeOracle(function () {
  http
    .createServer(async function (req, res) {
      try {
        if (req.method === "OPTIONS") {
          const data = {
            status: "SUCCESS",
            desc: "done",
          };
          sendJsonResp(res, data, 200);
          return;
        }
        const requestObj = await getRequestObject(req);
        var route = routes[requestObj.url.replace(baseName, "")];
        if (route) route(requestObj, res);
        else {
          const data = {
            status: "NOT_FOUND",
            desc: "server can't find the requested url",
          };
          sendJsonResp(res, data, 404);
        }
      } catch (err) {
        const data = {
          status: "SERVER_FAILURE",
          desc: "something went wrong",
          err,
        };
        console.error("SERVER_FAILURE", err);
        sendJsonResp(res, data, 500);
      }
    })
    .listen(PORT, process.env.IP || "");
  console.log(`App listening to ${process.env.IP || "localhost"}:${PORT}....`);
});
