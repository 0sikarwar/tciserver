const oracledb = require("oracledb");
const { sendJsonResp } = require("./utils");
const config = require("./dbconfig.json");

function handleDbErr(query, err, res) {
  const desc = "Something went wrong";
  let status = 500;
  if (err.errorNum === 1) {
    err.msg = "Cannot insert Duplicate Entry";
    status = 200;
  }
  sendJsonResp(res, { status: "DB_ERROR", desc, err }, status);
  console.error("DB_ERROR", err, query);
}

async function intitalizeOracle(cb) {
  const libDir =
    process.env.NODE_ENV === "production" ? "/opt/oracle/instantclient_21_9" : process.env["HOME"] + "/instantclient";
  console.log("ORACLE_DIR", libDir);
  try {
    oracledb.initOracleClient({
      libDir,
    });
    oracledb.autoCommit = true;
    await oracledb.createPool(config, function (err, pool) {
      if (err) {
        console.error("createPool() callback: " + err.message);
      } else cb();
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
      connection = await oracledb.getConnection("adminPool");
      let options = {};
      if (typeof query === "string") {
        sqlQuery = query;
      } else {
        sqlQuery = query.query;
        options = query.options;
      }
      const result = await connection.execute(sqlQuery, options);
      await connection.release();
      resolve(result);
    } catch (err) {
      if (err.errorNum === 1) {
        resolve("DUPLICATE_ENTRY");
      } else {
        res && handleDbErr(sqlQuery, err, res);
        resolve(null);
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

function testQuery() {
  const query = `select * from USER_TABLE WHERE id = 1`;
  executeDbQuery(query)
    .then((result) => console.log(`testQuery ${new Date().toLocaleString("en-IN")} `, result && result.rows.length))
    .catch((err) => console.log(err));
}

module.exports = {
  config,
  intitalizeOracle,
  executeDbQuery,
  getQueryValueString,
  testQuery,
};
