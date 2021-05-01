const {
  saveContactData,
  getContactQueries,
  getTestData,
  saveNewPartyData,
  saveDocketData,
  getCompanyNames,
  getDockets,
  getDataForInvoice,
} = require("./urlMapping");
module.exports = {
  "/savecontact": saveContactData,
  "/getcontactqueries": getContactQueries,
  "/testdata": getTestData,
  "/savenewpartydata": saveNewPartyData,
  "/savedocketdata": saveDocketData,
  "/getcompanynames": getCompanyNames,
  "/getdockets": getDockets,
  "/getdataforinvoice": getDataForInvoice,
};
