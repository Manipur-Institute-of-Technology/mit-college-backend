const express = require("express");
const router = express.Router();
const fs = require("fs");

const StudentList = require("../model/studentList");
const createUploader = require("../middleware/multer");

const jwtAuth = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const parseStudentFile = require("../middleware/ParseStudentFile");

const upload = createUploader("student list");

router.post(
  "/add",
  jwtAuth,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }

      const year = req.body.year;
      const filePath = req.file.path;

      const parsedData = await parseStudentFile(filePath);

      const studentList = await StudentList.create({
        year,
        filepath: filePath,
        data: parsedData,
      });

      res.status(201).json({
        message: "Student list uploaded & data saved successfully",
        year,
        totalRecords: parsedData.length,
        data: studentList,
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: "Year already exists" });
      }

      res.status(500).json({
        message: "Server error",
        error: error.message,
      });
    }
  }
);


router.get(
  "/",
  jwtAuth,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const lists = await StudentList.find().sort({ year: 1 });

      res.status(200).json({
        count: lists.length,
        data: lists,
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }
);

router.delete(
  "/delete/:id",
  jwtAuth,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const studentList = await StudentList.findById(id);

      if (!studentList) {
        return res.status(404).json({ message: "Record not found" });
      }

      if (studentList.filepath && fs.existsSync(studentList.filepath)) {
        fs.unlinkSync(studentList.filepath);
      }

      await StudentList.findByIdAndDelete(id);

      res.status(200).json({
        message: "Student list and file deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }
);

module.exports = router;
