const oracledb = require("oracledb");
const { sendJsonResp, handleErr, getDestinationCategory } = require("./utils");
const { executeDbQuery, getQueryValueString } = require("./dbConnection");
const {
  handleInsertQueryResp,
  handleSelectQueryResp,
  handleAddCompanyResp,
  handleGetInvoiceDataResp,
} = require("./dbRespHelper");

function saveContactData(req, res) {
  const body = req.body;
  const values = getQueryValueString(body);
  const query = `INSERT INTO ADMIN.CONTACT_US_TABLE (${Object.keys(body).join(", ")}) VALUES (${values})`;
  try {
    executeDbQuery(query, (result, err) => {
      handleInsertQueryResp(query, result, err, res);
    });
  } catch (err) {
    handleErr(err, res);
  }
}

function getContactQueries(req, res) {
  const query = `select * from contact_us_table ORDER BY query_date desc`;
  try {
    executeDbQuery(query, (result, err) => {
      handleSelectQueryResp(query, result, err, res);
    });
  } catch (err) {
    handleErr(err, res);
  }
}

function getTestData(req, res) {
  try {
    sendJsonResp(res, { status: "SUCCESS", desc: "You are authorized now" }, 200);
    return;
  } catch (err) {
    handleErr(err, res);
  }
}

function saveNewPartyData(req, res) {
  const { formData, rateList } = req.body;
  const values = getQueryValueString(formData);
  const insertCompanyQuery = `INSERT INTO ADMIN.COMPANY_DATA_TABLE (${Object.keys(formData).join(",")}) 
  VALUES (${values}) returning id INTO :new_company_id`;
  try {
    const options = { new_company_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } };
    executeDbQuery({ query: insertCompanyQuery, options }, (result, err) => {
      handleAddCompanyResp(insertCompanyQuery, result, err, res, formData, rateList);
    });
  } catch (err) {
    handleErr(err, res);
  }
}
function getDate(str) {
  const arr = str.split("/");
  arr.forEach((item, i) => {
    if (item.length < 2) {
      arr[i] = "0" + item;
    }
  });
  return new Date(`${arr[1]}-${arr[0]}-${arr[2]}`).getTime();
}

function saveDocketData(req, res) {
  const { formData } = req.body;
  let isError = false;
  let query = "INSERT ALL ";
  formData.forEach((obj) => {
    let valString = "";
    let dest_cat = "";
    if (["docket_num", "destination"].includes(obj.key) && !obj.val) {
      handleErr({ msg: obj.key + "field is Required" }, res);
    }
    Object.entries(obj).forEach(([key, val]) => {
      if (["docket_num", "destination"].includes(key) && !val) {
        handleErr({ msg: key + " field is Required" }, res, 206);
        isError = true;
      }
      if (key === "destination") dest_cat = getDestinationCategory(val);
      if (valString) valString += ",";
      valString += key === "docket_date" ? `'${getDate(val)}'` : `'${val}'`;
    });
    valString += `,'${dest_cat}'`;
    const keysString = `${Object.keys(obj).join(", ")}, DESTINATION_CATEGORY`;
    query += `INTO ADMIN.DOCKET_DETAIL_TABLE (${keysString}) VALUES (${valString}) `;
  });
  if (isError) return;
  query += "SELECT null FROM dual";
  executeDbQuery(query, (result, err) => {
    handleInsertQueryResp(query, result, err, res);
  });
}

function getCompanyNames(req, res) {
  const query = `select * from COMPANY_DATA_TABLE ORDER BY COMPANY_NAME desc`;
  try {
    executeDbQuery(query, (result, err) => {
      handleSelectQueryResp(query, result, err, res);
    });
  } catch (err) {
    handleErr(err, res);
  }
}

function getDockets(req, res) {
  const query = `select * from DOCKET_DETAIL_TABLE ORDER BY docket_date desc`;
  try {
    executeDbQuery(query, (result, err) => {
      handleSelectQueryResp(query, result, err, res);
    });
  } catch (err) {
    handleErr(err, res);
  }
}

function getDataForInvoice(req, res) {
  const queryParam = req.query;
  const formData = JSON.parse(queryParam.formData);
  const startDate = new Date(formData.for_month);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
  const query = `select * from DOCKET_DETAIL_TABLE WHERE
    (docket_date BETWEEN
      '${startDate.getTime()}' AND '${endDate.getTime()}' )
      AND (COMPANY_ID=${formData.company_id}) ORDER BY docket_date desc`;
  try {
    executeDbQuery(query, (result, err) => {
      handleGetInvoiceDataResp(query, result, err, res, {
        ...formData,
        from: startDate.toDateString(),
        to: endDate.toDateString(),
      });
    });
  } catch (err) {
    handleErr(err, res);
  }
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
};
