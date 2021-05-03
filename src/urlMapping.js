const oracledb = require("oracledb");
const { sendJsonResp, handleErr, getDestinationCategory, getFormattedDate } = require("./utils");
const { executeDbQuery, getQueryValueString } = require("./dbConnection");
const {
  handleInsertQueryResp,
  handleSelectQueryResp,
  handleAddCompanyResp,
  handleGetInvoiceDataResp,
  insertInRateList,
} = require("./dbRespHelper");
const { getKeysString, tableColumns } = require("./tableStructures");

async function saveContactData(req, res) {
  const body = req.body;
  const values = getQueryValueString(body);
  const query = `INSERT INTO ADMIN.CONTACT_US_TABLE (${Object.keys(body).join(", ")}) VALUES (${values})`;
  const result = await executeDbQuery(query, res);
  result && handleInsertQueryResp(query, result, res);
}

async function getContactQueries(req, res) {
  const query = `select * from contact_us_table ORDER BY query_date desc`;
  const result = await executeDbQuery(query, res);
  result && handleSelectQueryResp(query, result, res);
}

function getTestData(req, res) {
  try {
    sendJsonResp(res, { status: "SUCCESS", desc: "You are authorized now" }, 200);
    return;
  } catch (err) {
    handleErr(err, res);
  }
}

async function saveNewPartyData(req, res) {
  const { formData, rateList } = req.body;
  const values = getQueryValueString(formData);
  const insertCompanyQuery = `INSERT INTO ADMIN.COMPANY_DATA_TABLE (${getKeysString("company", formData)}) 
  VALUES (${values}) returning id INTO :new_company_id`;
  const options = { new_company_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } };
  const result = await executeDbQuery({ query: insertCompanyQuery, options }, res);
  result && handleAddCompanyResp(insertCompanyQuery, result, res, formData, rateList);
}

async function saveDocketData(req, res) {
  const { formData } = req.body;
  let isError = false;
  let query = "INSERT ALL ";
  formData.forEach((obj) => {
    let valString = "";
    let dest_cat = "";
    if (["docket_num", "destination"].includes(obj.key) && !obj.val) {
      handleErr({ msg: obj.key + "field is Required" }, res);
    }
    const keysString = `${getKeysString("docket", obj)}, DESTINATION_CATEGORY`;
    Object.entries(obj).forEach(([key, val]) => {
      if (["docket_num", "destination"].includes(key) && !val) {
        handleErr({ msg: key + " field is Required" }, res, 206);
        isError = true;
      }
      if (key === "destination") dest_cat = getDestinationCategory(val);
      if (valString) valString += ",";
      valString += key === "docket_date" ? `'${getFormattedDate(val)}'` : `'${val}'`;
    });
    valString += `,'${dest_cat}'`;
    query += `INTO ADMIN.DOCKET_DETAIL_TABLE (${keysString}) VALUES (${valString}) `;
  });
  if (isError) return;
  query += "SELECT null FROM dual";
  const result = await executeDbQuery(query, res);
  result && handleInsertQueryResp(query, result, res);
}

async function getCompanyNames(req, res) {
  const query = `select * from COMPANY_DATA_TABLE ORDER BY COMPANY_NAME desc`;
  const result = await executeDbQuery(query, res);
  result && handleSelectQueryResp(query, result, res);
}

async function getDockets(req, res) {
  const query = `select * from DOCKET_DETAIL_TABLE ORDER BY id desc`;
  const result = await executeDbQuery(query, res);
  result && handleSelectQueryResp(query, result, res);
}

async function getDataForInvoice(req, res) {
  const queryParam = req.query;
  const formData = JSON.parse(queryParam.formData);
  const startDate = new Date(formData.for_month);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  const query = `select * from DOCKET_DETAIL_TABLE WHERE
    (docket_date BETWEEN
      '${startDate.getTime()}' AND '${endDate.getTime()}' )
      AND (COMPANY_ID=${formData.company_id}) ORDER BY docket_date desc`;
  const result = await executeDbQuery(query, res);
  result &&
    handleGetInvoiceDataResp(query, result, res, {
      ...formData,
      from: startDate.toDateString(),
      to: endDate.toDateString(),
    });
}

async function getDataToUpadate(req, res) {
  const queryParam = req.query;
  const tableName = queryParam.type === "getdocket" ? "DOCKET_DETAIL_TABLE" : "RATE_LIST_TABLE";
  const key = Object.keys(queryParam)[1];
  const query = `select * from ${tableName} where ${key} = '${queryParam[key]}'`;
  const result = await executeDbQuery(query, res);
  result && handleSelectQueryResp(query, result, res);
}

async function updateDocketData(req, res) {
  const { formData, listToUpdate } = req.body;
  let isError = false;
  let query = "UPDATE DOCKET_DETAIL_TABLE SET ";
  let updateString = "",
    dest_cat = "";
  Object.entries(listToUpdate[0]).forEach(([key, val]) => {
    if (!tableColumns.docket.includes(key.toLowerCase())) return;
    if (["docket_num", "destination"].includes(key) && !val) {
      handleErr({ msg: key + " field is Required" }, res, 206);
      isError = true;
    }
    if (key === "destination") dest_cat = getDestinationCategory(val);
    if (updateString) updateString += ",";
    updateString += `${key} = '${key === "docket_date" ? getFormattedDate(val) : val}'`;
  });
  if (isError) return;
  query += `${updateString}, DESTINATION_CATEGORY = '${dest_cat}' WHERE docket_num = '${formData.docket_num}'`;
  const result = await executeDbQuery(query, res);
  result && handleInsertQueryResp(query, result, res);
}

async function updateRateList(req, res) {
  const { formData, listToUpdate, fetchedListLen } = req.body;
  let result = [];
  let isError = false;
  for (let obj of listToUpdate.slice(0, fetchedListLen)) {
    let query = "UPDATE RATE_LIST_TABLE SET ";
    let updateString = "";
    Object.entries(obj).forEach(([key, val]) => {
      if (key === "destination") dest_cat = getDestinationCategory(val);
      if (updateString) updateString += ",";
      updateString += `${key} = '${key === "docket_date" ? getFormattedDate(val) : val}'`;
    });
    query += `${updateString} WHERE company_id = '${formData.company_id}' and destination = '${obj.destination}'`;
    const queryResult = await executeDbQuery(query, res);
    result.push(queryResult);
  }
  if (result.length === fetchedListLen && listToUpdate.length > fetchedListLen) {
    const rateListResult = await insertInRateList(
      listToUpdate.slice(fetchedListLen),
      formData.company_id,
      formData.company_name,
      res
    );
    if (!rateListResult) isError = true;
  }
  !isError && handleInsertQueryResp("MULTIPLE INSERT IN RATE TABEL", {}, res);
}

module.exports = {
  saveContactData,
  getContactQueries,
  getTestData,
  saveNewPartyData,
  saveDocketData,
  getCompanyNames,
  getDockets,
  getDataForInvoice,
  getDataToUpadate,
  updateDocketData,
  updateRateList,
};
