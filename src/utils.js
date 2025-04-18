const { destinationGroupList } = require("./data");

function sendJsonResp(res, data = {}, status = 200, header = {}) {
  const responseHeader = {
    "Content-Type": "application/json",
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
      if (metaData[i].name.toLowerCase().includes("date") && !metaData[i].name.toLowerCase().includes("update"))
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

function getAmountBasedOnCategory(ratesObj, cat, weight, mode, discount) {
  let amount = null;
  if (!ratesObj[cat]) {
    amount = "NA";
  } else {
    if (weight <= 0.25) {
      amount = ratesObj[cat].upto250gms || ratesObj[cat].upto250Gms;
    } else if (weight <= 0.5) {
      amount = ratesObj[cat].upto500gms || ratesObj[cat].upto500Gms;
    } else if (weight <= 1) {
      amount = ratesObj[cat].upto1kg || ratesObj[cat].upto1Kg;
    } else {
      const mutilplier = cat === "HR, PB and HP" || mode === "Air" ? 3 : 5;
      let tempRate = ratesObj[cat].above1kgsur || ratesObj[cat].above1kgSur;
      if (mode === "Air" && Number(ratesObj[cat].above1kgair || ratesObj[cat].above1KgAir)) {
        tempRate = ratesObj[cat].above1kgair || ratesObj[cat].above1KgAir;
      }
      tempRate -= discount || 0;
      if (weight <= mutilplier) {
        amount = Number(tempRate) * mutilplier;
      } else {
        amount = Number(tempRate) * Math.ceil(weight);
      }
    }
  }
  return amount;
}

function getTimestamp(str, splitter = "/") {
  const arr = str.split(splitter);
  if (arr.length <= 1) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) return date.getTime();
  }
  arr.forEach((item, i) => {
    if (item.length < 2) {
      arr[i] = "0" + item;
    }
  });
  return new Date(`${arr[1]}-${arr[0]}-${arr[2]}`).getTime();
}

function cipher(salt) {
  const textToChars = (text) => text.split("").map((c) => c.charCodeAt(0));
  const byteHex = (n) => ("0" + Number(n).toString(16)).substr(-2);
  const applySaltToChar = (code) => textToChars(salt).reduce((a, b) => a ^ b, code);

  return (text) => text.split("").map(textToChars).map(applySaltToChar).map(byteHex).join("");
}

function decipher(salt) {
  const textToChars = (text) => text.split("").map((c) => c.charCodeAt(0));
  const applySaltToChar = (code) => textToChars(salt).reduce((a, b) => a ^ b, code);
  return (encoded) =>
    encoded
      .match(/.{1,2}/g)
      .map((hex) => parseInt(hex, 16))
      .map(applySaltToChar)
      .map((charCode) => String.fromCharCode(charCode))
      .join("");
}
module.exports = {
  sendJsonResp,
  convertDbDataToJson,
  handleErr,
  getDestinationCategory,
  getTimestamp,
  getAmountBasedOnCategory,
  cipher,
  decipher,
};
