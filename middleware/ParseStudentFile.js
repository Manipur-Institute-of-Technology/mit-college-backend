const fs = require("fs");
const csv = require("csv-parser");
const xlsx = require("xlsx");
const path = require("path");

const parseStudentFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const rows = [];

      // =========================
      // CSV
      // =========================
      if (ext === ".csv") {
        if (!fs.existsSync(filePath)) {
          return reject(new Error("Uploaded CSV file not found"));
        }

        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (row) => {
            rows.push(row);
          })
          .on("end", () => {
            resolve(rows);
          })
          .on("error", (error) => {
            reject(error);
          });

        return;
      }

      // =========================
      // EXCEL
      // =========================
      if (ext === ".xls" || ext === ".xlsx") {
        if (!fs.existsSync(filePath)) {
          return reject(new Error("Uploaded Excel file not found"));
        }

        const workbook = xlsx.readFile(filePath);

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          return reject(new Error("Excel file contains no worksheets"));
        }

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          return reject(new Error("Unable to read the first worksheet"));
        }

        const json = xlsx.utils.sheet_to_json(sheet, {
          defval: "",
        });

        resolve(json);
        return;
      }

      // =========================
      // UNSUPPORTED FILE
      // =========================
      reject(
        new Error(
          "Unsupported file type. Only CSV, XLS and XLSX files are allowed."
        )
      );
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = parseStudentFile;