const { saveContactData, getContactQueries } = require("./urlMapping");
module.exports = {
  "/savecontact": saveContactData,
  "/getcontactqueries": getContactQueries,
};
