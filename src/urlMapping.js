const { sendJsonResp, convertDbDataToJson } = require("./utils");
const { executeDbQuery } = require("./dbConnection");
function saveContactData(req, res) {
  const body = req.body;
  let values = "";
  Object.values(body).forEach((val) => {
    if (values) values += ",";
    values += `'${val}'`;
  });
  console.log(req);
  const query = `INSERT INTO ADMIN.CONTACT_US_TABLE (${Object.keys(body).join(",")}
        ) VALUES (
            ${values}
        )`;
  try {
    executeDbQuery(query, (result, err) => {
      if (err) {
        sendJsonResp(res, { status: "DB_ERROR", desc: "Something went wrong", err }, 500);
        console.error("DB_ERROR", err, query);
        return;
      }
      const data = {
        status: "SUCCESS",
        desc: "Query noted",
      };
      sendJsonResp(res, data, 200);
    });
  } catch (err) {
    console.error(err);
    handleError(res, { status: "SOMETHING_WENT_WRONG", desc: "Something went wrong", err }, 500);
  }
}
function getContactQueries(req, res) {
  console.log(req);
  const query = `select * from contact_us_table ORDER BY query_date desc`;
  try {
    executeDbQuery(query, (result, err) => {
      if (err) {
        sendJsonResp(res, { status: "DB_ERROR", desc: "Something went wrong", err }, 500);
        console.error("DB_ERROR", err, query);
        return;
      }
      const data = {
        status: "SUCCESS",
        desc: "",
        list: convertDbDataToJson(result),
      };
      sendJsonResp(res, data, 200);
    });
  } catch (err) {
    console.error(err);
    handleError(res, { status: "SOMETHING_WENT_WRONG", desc: "Something went wrong", err }, 500);
  }
}
module.exports = { saveContactData, getContactQueries };
