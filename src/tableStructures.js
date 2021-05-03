const columns = {
  docket: [
    "docket_num",
    "company_id",
    "destination",
    "docket_date",
    "amount",
    "weight",
    "docket_mode",
    "destination_category",
  ],
  rateList: ["company_id", "destination", "upto250gms", "upto500gms", "upto1kg", "above1kgsur", "above1kgair"],
};

const getKeysString = (type, obj) => {
  if (columns[type]) {
    Object.keys(obj).forEach((key) => {
      if (!columns[type].includes(key.toLowerCase())) {
        delete obj[key];
      }
    });
  }
  return Object.keys(obj).join(", ");
};

module.exports = {
  getKeysString,
  tableColumns: columns,
};
