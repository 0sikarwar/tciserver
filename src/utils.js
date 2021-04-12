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

function getRequestObject(req) {
  const { headers, method, url } = req;
  let chunks = [];
  return new Promise((resolve, reject) => {
    req
      .on("error", (err) => {
        console.error(err);
        reject(err);
      })
      .on("data", (chunk) => {
        chunks.push(chunk);
      })
      .on("end", () => {
        try {
          let values = Buffer.concat(chunks).toString();
          resolve({ headers, method, url, body: JSON.parse(values) });
        } catch (err) {
          resolve({ headers, method, url, body: "" });
        }
      });
  });
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
  getRequestObject,
  convertDbDataToJson,
};
