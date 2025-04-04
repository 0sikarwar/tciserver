require("babel-polyfill");
const express = require("express");
const { intitalizeOracle, testQuery } = require("./src/dbConnection");
const routes = require("./src/routes");
const { sendJsonResp, handleErr } = require("./src/utils");
const { authRquiredApis, isAuthorizedUser } = require("./src/authentication");
const auth = require("basic-auth");
var cors = require("cors");
const { cronForDb, startDb } = require("./src/startDB");
const app = express();
app.use(express.json());
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:9000",
    "http://127.0.0.1",
    "https://www.thecyberintel.com",
    "https://admin.thecyberintel.com",
  ],
  credentials: true,
  exposedHeaders: ["set-cookie"],
};
app.use(cors(corsOptions));
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
        url: req.url,
      };
      sendJsonResp(res, data, 404);
    }
  } catch (err) {
    handleErr(err, res);
  }
});

app.listen(8080, function (req, res) {
  intitalizeOracle(testQuery);
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const millisecondsUntilMidnight = midnight - now;
  if (process.env.NODE_ENV !== "development") {
    setTimeout(() => {
      startDb();
      cronForDb();
    }, millisecondsUntilMidnight);
  }
  console.log(`App listening to localhost:8080....`);
  console.log(`App started at ${new Date().toLocaleString("en-IN")}`);
});
