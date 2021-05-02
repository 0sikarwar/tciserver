const { destinationGroupList } = require("./data");

function sendJsonResp(res, data = {}, status = 200, header = {}) {
  const responseHeader = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Request-Method": "*",
    "Access-Control-Allow-Methods": "*",
    "Access-Control-Allow-Headers": "*",
    ...header,
  };
  res.writeHead(status, responseHeader);
  res.write(JSON.stringify(data));
  res.end();
}
function handleErr(err, res, status) {
  console.error(err);
  sendJsonResp(
    res,
    { status: err.msg ? "FAILURE" : "SOMETHING_WENT_WRONG", desc: "Something went wrong", err },
    status || 500
  );
}

function convertDbDataToJson(dbData) {
  const { metaData, rows } = dbData;
  const formattedRowsList = rows.map((row) => {
    const obj = {};
    row.forEach((item, i) => {
      if (metaData[i].name.toLowerCase().includes("date"))
        obj[metaData[i].name.toLowerCase()] = new Date(parseInt(item)).toDateString();
      else obj[metaData[i].name.toLowerCase()] = item;
    });
    return obj;
  });
  return formattedRowsList;
}

function getDestinationCategory(destination) {
  const city = destination.split(", ")[0] || "";
  const state = destination.split(", ")[1] || "";
  let category = city.toLowerCase() === "guwahati" ? "Guwahati" : "";
  if (category) return category;
  for (const [key, val] of Object.entries(destinationGroupList)) {
    if (val.includes(state.toLowerCase()) || val.includes(city.toLowerCase())) {
      category = key;
      break;
    }
  }
  return category;
}

function getFormattedDate(str, splitter = "/") {
  const arr = str.split(splitter);
  arr.forEach((item, i) => {
    if (item.length < 2) {
      arr[i] = "0" + item;
    }
  });
  return new Date(`${arr[1]}-${arr[0]}-${arr[2]}`).getTime();
}

module.exports = {
  sendJsonResp,
  convertDbDataToJson,
  handleErr,
  getDestinationCategory,
  getFormattedDate,
};
