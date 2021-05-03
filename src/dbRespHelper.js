const { sendJsonResp, convertDbDataToJson } = require("./utils");
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

function handleSelectQueryResp(query, result, res) {
  const data = {
    status: "SUCCESS",
    desc: "",
    list: convertDbDataToJson(result),
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
      if (!ratesObj[item.destination_category]) {
        obj.amount = "NA";
      } else {
        if (item.weight <= 0.25) {
          obj.amount = ratesObj[item.destination_category].upto250gms;
        } else if (item.weight <= 0.5) {
          obj.amount = ratesObj[item.destination_category].upto500gms;
        } else if (item.weight <= 1) {
          obj.amount = ratesObj[item.destination_category].upto1kg;
        } else {
          const mutilplier = item.destination_category === "HR, PB and HP" || item.docket_mode === "Air" ? 3 : 5;
          const tempRate =
            ratesObj[item.destination_category][item.docket_mode === "Air" ? "above1kgair" : "above1kgsur"];
          if (item.weight <= mutilplier) {
            obj.amount = Number(tempRate) * mutilplier;
          } else {
            obj.amount = Number(tempRate) * Math.ceil(item.weight);
          }
        }

        totalAmount += Number(obj.amount);
      }
      obj.weight = (obj.weight[0] === "." ? "0" : "") + obj.weight + " Kg";
      return obj;
    });
    const data = {
      status: "SUCCESS",
      desc: "",
      docketList: updatedList,
      totalAmount,
      ...formData,
      invoice_date: new Date().toDateString(),
      invoice_number: "",
    };
    const selectInvoiceQuery = `Select id from INVOICE_TABLE where COMPANY_ID=${formData.company_id} AND  FOR_MONTH='${formData.for_month}'`;
    const selectResult = await executeDbQuery(selectInvoiceQuery, res);
    if (selectResult) {
      const selectedInvoice = convertDbDataToJson(selectResult);
      if (selectedInvoice.length) {
        data.invoice_number = selectedInvoice[0].id;
        sendJsonResp(res, data, 200);
      } else {
        const insertInvoiceQuery = `INSERT INTO INVOICE_TABLE (COMPANY_ID, FOR_MONTH) 
        VALUES (${formData.company_id}, '${formData.for_month}') returning id INTO :invoice_number`;
        const options = { invoice_number: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } };
        const insertResult = await executeDbQuery({ query: insertInvoiceQuery, options }, res);
        if (insertResult) {
          data.invoice_number = insertResult.outBinds.invoice_number[0];
          sendJsonResp(res, data, 200);
        }
      }
    }
  }
}

module.exports = {
  handleInsertQueryResp,
  handleSelectQueryResp,
  handleAddCompanyResp,
  handleGetInvoiceDataResp,
  insertInRateList,
};
