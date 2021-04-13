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
      conn
        .execute(query)
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

module.exports = {
  config,
  intitalizeOracle,
  executeDbQuery,
};
