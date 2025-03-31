const OracleDB = require("oracledb");
const { executeDbQuery } = require("./dbConnection");
const { sendJsonResp } = require("./utils");

// Function to read data from Oracle DB with pagination
async function readDataWithPagination(res, params = {}, tableObj, page, pageSize) {
  const { name: tableName, id, hiddenCols, freezedCols } = tableObj;
  try {
    const whereClauses = [];
    const options = {};
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        whereClauses.push(`${key} = :${key}`);
        options[key] = params[key];
      }
    });
    const whereClause = whereClauses.length ? "WHERE " + whereClauses.join(" AND ") : "";

    let query = `
    SELECT *
    FROM ${tableName}
    ${whereClause}`;

    if (pageSize) {
      query += " OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY";
      const offset = (page - 1) * pageSize;
      options.offset = offset;
      options.pageSize = pageSize;
    }

    const result = await executeDbQuery({ query, options, format: { outFormat: OracleDB.OUT_FORMAT_OBJECT } }, res);
    const totalCountQuery = `SELECT COUNT(*) AS total_count FROM ${tableName}`;
    const totalCountRes = await executeDbQuery(totalCountQuery, res);
    if (result) {
      return { rows: result.rows, totalCount: totalCountRes?.rows?.[0]?.[0], id, hiddenCols, freezedCols };
    }
  } catch (err) {
    sendJsonResp(res, { status: "DB_ERROR", err }, 400);
    console.error("Error reading data:", err);
  }
}

// Function to update Oracle DB based on dynamic params
async function updateData(res, body, tableObj) {
  const { name: tableName, id: idColName, numFields } = tableObj;
  try {
    const updateClauses = [];
    const options = {};
    const params = body.updateData;
    Object.keys(params).forEach((key) => {
      if (params[key]) {
        updateClauses.push(`${key} = :${key}`);
        options[key] = numFields.includes(key.toUpperCase()) ? parseInt(params[key]) : params[key];
      }
    });
    if (!updateClauses.length) {
      console.error("No parameters provided to update");
      sendJsonResp(res, { status: "DB_ERROR", err }, 400);
      return;
    }

    const query = `
      UPDATE ${tableName}
      SET ${updateClauses.join(", ")}
      WHERE ${idColName} = :id
    `;
    options.id = body.id;

    const result = await executeDbQuery({ query, options }, res);
    return result?.rowsAffected;
  } catch (err) {
    sendJsonResp(res, { status: "DB_ERROR", err }, 400);
    console.error("Error updating data:", err);
  }
}

async function deleteData(res, body, tableObj) {
  const { name: tableName, id: idColName } = tableObj;
  const options = { id: body.id };
  try {
    const query = `
      DELETE FROM ${tableName}
      WHERE ${idColName} = :id
    `;
    const result = await executeDbQuery({ query, options }, res);
    return result?.rowsAffected;
  } catch (err) {
    sendJsonResp(res, { status: "DB_ERROR", err }, 400);
    console.error("Error updating data:", err);
  }
}
const commonFreezedCol = ["UPDATED_ON", "ADDED_ON"];
const tableNameMap = {
  docketDetails: {
    name: "DOCKET_DETAIL_TABLE",
    id: "DOCKET_NUM",
    hiddenCols: [],
    freezedCols: [...commonFreezedCol, "DOCKET_DATE"],
    numFields: ["DOCKET_DISCOUNT", "COMPANY_ID"],
  },
  companyData: {
    name: "COMPANY_DATA_TABLE",
    id: "ID",
    hiddenCols: [],
    freezedCols: [...commonFreezedCol],
    numFields: ["ID"],
  },
  invoice: {
    name: "INVOICE_TABLE",
    id: "ID",
    hiddenCols: [],
    freezedCols: [...commonFreezedCol],
    numFields: ["ID", "COMPANY_ID"],
  },
  rateList: {
    name: "RATE_LIST_TABLE",
    id: "ID",
    hiddenCols: [],
    freezedCols: [...commonFreezedCol],
    numFields: ["ID", "COMPANY_ID"],
  },
  userTable: {
    name: "USER_TABLE",
    id: "ID",
    hiddenCols: [],
    freezedCols: [...commonFreezedCol],
    numFields: ["ID", "PIN"],
  },
};

async function handleTableData(req, res) {
  const { method, query, body } = req;
  if (method === "GET") {
    const tableObj = tableNameMap[query.type];
    const result = await readDataWithPagination(res, {}, tableObj, query.page, query.pageSize);
    sendJsonResp(res, result, 200);
  } else if (method === "PUT") {
    const tableObj = tableNameMap[body.type];
    const result = await updateData(res, body, tableObj);
    if (result) {
      sendJsonResp(res, result, 200);
    }
  } else if (method === "DELETE") {
    const tableObj = tableNameMap[body.type];
    const result = await deleteData(res, body, tableObj);
    if (result) {
      sendJsonResp(res, result, 200);
    }
  }
}

async function handleExecuteDbQuery(req, res) {
  const { body } = req;
  try {
    const result = await executeDbQuery(
      { query: body.queryText.trim(), options: {}, format: { outFormat: OracleDB.OUT_FORMAT_OBJECT } },
      res
    );
    if (result) {
      sendJsonResp(res, result, 200);
    } else {
      sendJsonResp(res, { status: "DB_ERROR", err }, 400);
    }
  } catch (err) {
    sendJsonResp(res, { status: "DB_ERROR", err }, 400);
    console.error("Error executing query:", err);
  }
}

module.exports = {
  handleTableData,
  handleExecuteDbQuery,
};
