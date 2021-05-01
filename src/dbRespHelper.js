const { sendJsonResp, convertDbDataToJson } = require("./utils");
const { executeDbQuery } = require("./dbConnection");
const oracledb = require("oracledb");

function handleDbErr(query, err, res) {
  sendJsonResp(res, { status: "DB_ERROR", desc: "Something went wrong", err }, 500);
  console.error("DB_ERROR", err, query);
}

function handleInsertQueryResp(query, result, err, res, ...args) {
  if (err) {
    handleDbErr(query, err, res);
    return;
  }
  const data = {
    status: "SUCCESS",
    desc: "DATA Saved",
    data: args,
  };
  sendJsonResp(res, data, 200);
}

function handleSelectQueryResp(query, result, err, res) {
  if (err) {
    handleDbErr(query, err, res);
    return;
  }
  const data = {
    status: "SUCCESS",
    desc: "",
    list: convertDbDataToJson(result),
  };
  sendJsonResp(res, data, 200);
}

function handleAddCompanyResp(query, result, err, res, formData, rateList) {
  if (err) {
    handleDbErr(query, err, res);
    return;
  }
  const company_id = result.outBinds.new_company_id[0];
  const companyDetail = { company_id, company_name: formData.company_name };
  if (!rateList || !rateList.length) {
    handleInsertQueryResp(query, result, err, res, companyDetail);
  }
  let insertRateListQuery = "INSERT ALL ";
  rateList.forEach((obj) => {
    let valString = `'${company_id}', '${formData.company_name}' `;
    Object.values(obj).forEach((val) => {
      if (valString) valString += ",";
      valString += `'${val}'`;
    });
    const keysString = `company_id, company_name, ${Object.keys(obj).join(", ")}`;
    insertRateListQuery += `INTO ADMIN.RATE_LIST_TABLE (${keysString}) VALUES (${valString}) `;
  });
  insertRateListQuery += "SELECT null FROM dual";
  executeDbQuery(insertRateListQuery, (rateListResult, err) => {
    handleInsertQueryResp(insertRateListQuery, rateListResult, err, res, companyDetail);
  });
}

function handleGetInvoiceDataResp(docketQuery, docketResult, docketErr, res, formData) {
  if (docketErr) {
    handleDbErr(docketQuery, docketErr, res);
    return;
  }
  const rateListQuery = `select * from RATE_LIST_TABLE WHERE COMPANY_ID=${formData.company_id}`;
  executeDbQuery(rateListQuery, (rateListResult, rateListErr) => {
    if (rateListErr) {
      handleDbErr(rateListQuery, rateListErr, res);
      return;
    }
    const docketList = convertDbDataToJson(docketResult);
    const ratesList = convertDbDataToJson(rateListResult);
    const ratesObj = {};
    let totalAmount = 0;

    ratesList.forEach((item) => (ratesObj[item.destination] = item));
    const updatedList = docketList.map((item) => {
      const obj = { ...item };
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
    executeDbQuery(selectInvoiceQuery, function (selectResult, selectErr) {
      if (selectErr) {
        handleDbErr(selectInvoiceQuery, selectErr, res);
        return;
      }
      const selectedInvoice = convertDbDataToJson(selectResult);
      if (selectedInvoice.length) {
        data.invoice_number = selectedInvoice[0].id;
        sendJsonResp(res, data, 200);
      } else {
        const insertInvoiceQuery = `INSERT INTO INVOICE_TABLE (COMPANY_ID, COMPANY_NAME, FOR_MONTH) 
        VALUES (${formData.company_id}, '${formData.company_name}', '${formData.for_month}') returning id INTO :invoice_number`;
        const options = { invoice_number: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT } };
        executeDbQuery({ query: insertInvoiceQuery, options }, function (insertResult, insertErr) {
          if (insertErr) {
            handleDbErr(insertInvoiceQuery, insertErr, res);
            return;
          }
          data.invoice_number = insertResult.outBinds.invoice_number[0];
          sendJsonResp(res, data, 200);
        });
      }
    });
  });
}

module.exports = { handleInsertQueryResp, handleSelectQueryResp, handleAddCompanyResp, handleGetInvoiceDataResp };
