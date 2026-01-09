const fs = require("fs");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const path = require("path");

const parseStudentFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const ext = path.extname(filePath).toLowerCase();
    const rows = [];

    if (ext === ".csv") {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows))
        .on("error", reject);
    }

    else if (ext === ".xls" || ext === ".xlsx") {
      const workbook = xlsx.readFile(filePath);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = xlsx.utils.sheet_to_json(sheet);
      resolve(json);
    }

    else {
      reject(new Error("Unsupported file type"));
    }
  });
};

module.exports = parseStudentFile;
