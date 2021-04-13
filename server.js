require("babel-polyfill");
const express = require("express");
const { intitalizeOracle } = require("./src/dbConnection");
const routes = require("./src/routes");
const { sendJsonResp, getRequestObject } = require("./src/utils");
var cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
app.use((req, res) => {
  const route = routes[req.url];
  if (route) route(req, res);
  else {
    const data = {
      status: "NOT_FOUND",
      desc: "server can't find the requested url",
    };
    sendJsonResp(res, data, 404);
  }
});

app.listen(8080, function (req, res) {
  intitalizeOracle();
  console.log(`App listening to localhost:8080....`);
});
