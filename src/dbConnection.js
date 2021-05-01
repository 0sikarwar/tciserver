const oracledb = require("oracledb");
const config = {
  user: "ADMIN",
  password: "!@#$1234Cyber",
  connectString: "userdb_high",
  poolMax: 44,
  poolMin: 2,
  poolIncrement: 0,
};

async function intitalizeOracle(cb) {
  try {
    oracledb.initOracleClient({
      libDir:
        process.env.NODE_ENV === "production"
          ? "/opt/oracle/instantclient_21_1"
          : process.env["HOME"] + "/instantclient",
    });
    oracledb.autoCommit = true;
    await oracledb.createPool(config, function (err, pool) {
      if (err) {
        console.error("createPool() callback: " + err.message);
      }
      return;
    });
  } catch (err) {
    console.error("Whoops!");
    console.error(err);
    process.exit(1);
  }
}

function executeDbQuery(query, cb) {
  oracledb.getConnection(function (err, conn) {
    if (err) {
      cb(null, err);
      return;
    } else {
      let options = {};
      let sqlQuery = "";
      if (typeof query === "string") {
        sqlQuery = query;
      } else {
        sqlQuery = query.query;
        options = query.options;
      }
      conn
        .execute(sqlQuery, options)
        .then((result) => cb(result))
        .catch((err) => cb(null, err))
        .finally(() => {
          conn.release(function (err) {
            if (err) {
              cb(null, err);
              return;
            }
          });
        });
    }
  });
}

function getQueryValueString(body) {
  let values = "";
  Object.values(body).forEach((val) => {
    if (values) values += ",";
    values += `'${val}'`;
  });
  return values;
}

module.exports = {
  config,
  intitalizeOracle,
  executeDbQuery,
  getQueryValueString,
};
