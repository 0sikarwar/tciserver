const oracledb = require("oracledb");
const { sendJsonResp } = require("./utils");

const config = {
  user: "ADMIN",
  password: "!@#$1234Cyber",
  connectString: "userdb_high",
  poolMax: 44,
  poolMin: 2,
  poolIncrement: 0,
};

function handleDbErr(query, err, res) {
  sendJsonResp(res, { status: "DB_ERROR", desc: "Something went wrong", err }, 500);
  console.error("DB_ERROR", err, query);
}

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

function executeDbQuery(query, res) {
  return new Promise(async function (resolve, reject) {
    let connection;
    let sqlQuery = "";
    try {
      connection = await oracledb.getConnection();
      let options = {};
      if (typeof query === "string") {
        sqlQuery = query;
      } else {
        sqlQuery = query.query;
        options = query.options;
      }
      const result = await connection.execute(sqlQuery, options);
      resolve(result);
    } catch (err) {
      handleDbErr(sqlQuery, err, res);
      reject();
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (e) {
          console.error(e);
        }
      }
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
