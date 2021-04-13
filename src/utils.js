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

function convertDbDataToJson(dbData) {
  const { metaData, rows } = dbData;
  const formattedRowsList = rows.map((row) => {
    const obj = {};
    row.forEach((item, i) => {
      if (metaData[i].name === "QUERY_DATE")
        obj[metaData[i].name.toLowerCase()] = new Date(parseInt(item)).toLocaleString("en-In");
      else obj[metaData[i].name.toLowerCase()] = item;
    });
    return obj;
  });
  return formattedRowsList;
}

module.exports = {
  sendJsonResp,
  convertDbDataToJson,
};
