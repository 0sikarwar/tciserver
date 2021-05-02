require("babel-polyfill");
const express = require("express");
const { intitalizeOracle } = require("./src/dbConnection");
const routes = require("./src/routes");
const { sendJsonResp, handleErr } = require("./src/utils");
const { authRquiredApis, isAuthorizedUser } = require("./src/authentication");
const auth = require("basic-auth");
var cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
app.use((req, res, next) => {
  let user = auth(req);
  if (authRquiredApis.includes(req.url)) {
    if (user === undefined || !isAuthorizedUser(user)) {
      res.statusCode = 401;
      res.setHeader("WWW-Authenticate", 'Basic realm="Node"');
      res.end("Unauthorized");
    } else {
      next();
    }
  } else {
    next();
  }
});
app.use((req, res) => {
  try {
    const route = routes[req.url.split("?")[0]];
    if (route) route(req, res);
    else {
      const data = {
        status: "NOT_FOUND",
        desc: "server can't find the requested url",
      };
      sendJsonResp(res, data, 404);
    }
  } catch (err) {
    handleErr(err, res);
  }
});

app.listen(8080, function (req, res) {
  intitalizeOracle();
  console.log(`App listening to localhost:8080....`);
});
