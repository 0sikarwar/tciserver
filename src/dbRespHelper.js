const { sendJsonResp, convertDbDataToJson, getAmountBasedOnCategory } = require("./utils");
const { executeDbQuery } = require("./dbConnection");
const oracledb = require("oracledb");
const { getKeysString } = require("./tableStructures");

function handleInsertQueryResp(query, result, res, ...args) {
  const data = {
    status: "SUCCESS",
    desc: "DATA Saved",
    data: args,
  };
  sendJsonResp(res, data, 200);
}

function handleSelectQueryResp(query, result, res, obj) {
  const data = {
    status: "SUCCESS",
    desc: "",
    list: convertDbDataToJson(result),
    ...obj,
  };
  sendJsonResp(res, data, 200);
}

async function handleAddCompanyResp(query, result, res, formData, rateList) {
  const company_id = result.outBinds.new_company_id[0];
  const companyDetail = { company_id, company_name: formData.company_name };
  if (!rateList || !rateList.length) {
    handleInsertQueryResp(query, result, res, companyDetail);
  }
  const rateListResult = await insertInRateList(rateList, company_id, formData.company_name, res);
  rateListResult && handleInsertQueryResp("MULTIPLE INSERT IN RATE TABEL", rateListResult, res, companyDetail);
}

async function insertInRateList(rateList, company_id, company_name, res) {
  let insertRateListQuery = "INSERT ALL ";
  rateList.forEach((obj) => {
    const keysString = `company_id, ${getKeysString("rateList", obj)}`;
    let valString = `'${company_id}' `;
    Object.values(obj).forEach((val) => {
      if (valString) valString += ",";
      valString += `'${val}'`;
    });
    insertRateListQuery += `INTO ADMIN.RATE_LIST_TABLE (${keysString}) VALUES (${valString}) `;
  });
  insertRateListQuery += "SELECT null FROM dual";
  const rateListResult = await executeDbQuery(insertRateListQuery, res);
  return rateListResult;
}

async function handleGetInvoiceDataResp(docketQuery, docketResult, res, formData) {
  const rateListQuery = `select * from RATE_LIST_TABLE WHERE COMPANY_ID=${formData.company_id}`;
  const rateListResult = await executeDbQuery(rateListQuery, res);
  if (rateListResult) {
    const docketList = convertDbDataToJson(docketResult);
    const ratesList = convertDbDataToJson(rateListResult);
    const ratesObj = {};
    let totalAmount = 0;

    ratesList.forEach((item) => (ratesObj[item.destination] = item));
    const updatedList = docketList.map((item) => {
      const obj = { ...item };
      if (!ratesObj[item.destination_category] && (!obj.amount || obj.amount === "NA")) {
        obj.amount = "NA";
      } else {
        totalAmount += Number(obj.amount);
        obj.amount = `₹ ${obj.amount}`;
      }
      obj.weight = Number(obj.weight).toFixed(3) + " Kg";
      return obj;
    });
    const data = {
      status: "SUCCESS",
      desc: "",
      docketList: updatedList,
      totalAmount: `₹ ${totalAmount}`,
      ...formData,
      invoice_number: "",
    };
    const selectInvoiceQuery = `Select id, created_on from INVOICE_TABLE where COMPANY_ID=${formData.company_id} AND  FOR_MONTH='${formData.from_month} - ${formData.to_month}'`;
    const selectResult = await executeDbQuery(selectInvoiceQuery, res);
    if (selectResult) {
      const selectedInvoice = convertDbDataToJson(selectResult);
      if (selectedInvoice.length) {
        const invoiceDate = new Date(selectedInvoice[0].created_on.split(", ").splice(0, 3).join(", "));
        data.invoice_number = selectedInvoice[0].id;
        data.invoice_date = invoiceDate.toDateString();
        data.due_date = new Date(invoiceDate.getTime() + 10 * 24 * 60 * 60 * 1000).toDateString();
      }
      sendJsonResp(res, data, 200);
    }
  }
}
async function updateAmountInDocket(companyDetails, extraFormFields, ratesList, res) {
  const startDate = new Date(new Date(extraFormFields.dockets_from_month).setHours(0, 0, 0, 0));
  const temp = new Date(extraFormFields.dockets_to_month);
  const endDate = new Date(temp.getFullYear(), temp.getMonth() + 1, 0);
  const selectQuery = `select * from DOCKET_DETAIL_TABLE WHERE(
    docket_date BETWEEN'${startDate.getTime()}' AND '${endDate.getTime()}' 
    ) AND (COMPANY_ID=${companyDetails.id})`;
  let docketList = await executeDbQuery(selectQuery, res);
  if (docketList) docketList = convertDbDataToJson(docketList);
  else return;
  const ratesObj = {};
  ratesList.forEach((item) => (ratesObj[item.destination] = item));
  if (Object.keys(ratesObj).length)
    for (let obj of docketList) {
      amount = getAmountBasedOnCategory(
        ratesObj,
        obj.destination_category,
        obj.weight,
        obj.docket_mode,
        obj.docket_discount
      );
      const updateQuery = `UPDATE DOCKET_DETAIL_TABLE SET AMOUNT = '${amount}' WHERE docket_num = '${obj.docket_num}'`;
      const updateResult = await executeDbQuery(updateQuery, res);
      if (!updateResult) return;
    }
  else return;

  return true;
}
module.exports = {
  handleInsertQueryResp,
  handleSelectQueryResp,
  handleAddCompanyResp,
  handleGetInvoiceDataResp,
  insertInRateList,
  updateAmountInDocket,
};
