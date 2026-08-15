const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const fs = require("fs");

const StudentList = require("../model/studentList");

const createUploader = require("../middleware/multer");
const parseStudentFile = require("../middleware/ParseStudentFile");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const COURSES = [
  "M.Tech",
  "B.E./B.Tech",
];

const BRANCHES = [
  "CE",
  "ME",
  "CSE",
  "EE",
  "ECE",
];

const BRANCH_NAMES = {
  CE: "Civil Engineering",
  ME: "Mechanical Engineering",
  CSE: "Computer Science & Engineering",
  EE: "Electrical Engineering",
  ECE: "Electronics & Communication Engineering",
};

// ─────────────────────────────────────────────────────────────────────────────
// MULTER
// ─────────────────────────────────────────────────────────────────────────────

const upload = createUploader("student list");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: DELETE FILE SAFELY
// ─────────────────────────────────────────────────────────────────────────────

const deleteFileSafely = (filePath) => {
  try {
    if (
      filePath &&
      fs.existsSync(filePath)
    ) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error(
      "Failed to delete file:",
      filePath,
      error.message
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: VALIDATE COURSE
// ─────────────────────────────────────────────────────────────────────────────

const isValidCourse = (course) => {
  return COURSES.includes(course);
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: VALIDATE BRANCH
// ─────────────────────────────────────────────────────────────────────────────

const isValidBranch = (branch) => {
  return BRANCHES.includes(branch);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL STUDENT LISTS
// GET /studentlist
//
// PUBLIC
//
// Returns only metadata initially.
// Student data is still included because your current frontend structure
// expects it. We can move to server-side pagination later if needed.
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/",
  async (req, res) => {
    try {
      const lists =
        await StudentList.find()
          .sort({
            course: 1,
            year: -1,
            branch: 1,
          })
          .lean();

      return res.status(200).json({
        count: lists.length,
        data: lists,
        branches: BRANCH_NAMES,
      });

    } catch (error) {
      console.error(
        "GET student lists error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch student lists",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE STUDENT LIST
// GET /studentlist/:id
//
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message:
            "Invalid student list ID",
        });
      }

      const studentList =
        await StudentList.findById(id).lean();

      if (!studentList) {
        return res.status(404).json({
          message:
            "Student list not found",
        });
      }

      return res.status(200).json({
        data: studentList,
      });

    } catch (error) {
      console.error(
        "GET student list error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch student list",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADD STUDENT LIST
// POST /studentlist/add
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    let uploadedFilePath = null;

    try {
      // ───────────────────────────────────────────────────────────────────────
      // FILE VALIDATION
      // ───────────────────────────────────────────────────────────────────────

      if (!req.file) {
        return res.status(400).json({
          message:
            "Student list file is required",
        });
      }

      uploadedFilePath = req.file.path;

      // ───────────────────────────────────────────────────────────────────────
      // COURSE
      // ───────────────────────────────────────────────────────────────────────

      const course = String(
        req.body.course || ""
      ).trim();

      if (!course) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Course is required",
        });
      }

      if (!isValidCourse(course)) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Invalid course. Allowed courses are M.Tech and B.E./B.Tech",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // BRANCH
      // ───────────────────────────────────────────────────────────────────────

      const branch = String(
        req.body.branch || ""
      ).trim();

      if (!branch) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Branch is required",
        });
      }

      if (!isValidBranch(branch)) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Invalid branch",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // YEAR
      // ───────────────────────────────────────────────────────────────────────

      const year = String(
        req.body.year || ""
      ).trim();

      if (!year) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Academic year is required",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // CHECK DUPLICATE
      // ───────────────────────────────────────────────────────────────────────

      const existing =
        await StudentList.findOne({
          course,
          branch,
          year,
        });

      if (existing) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(409).json({
          message:
            `${course} ${year} ${branch} already exists`,
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // PARSE FILE
      // ───────────────────────────────────────────────────────────────────────

      const parsedData =
        await parseStudentFile(
          uploadedFilePath
        );

      if (
        !Array.isArray(parsedData)
      ) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Unable to parse student list",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // CREATE
      // ───────────────────────────────────────────────────────────────────────

      const studentList =
        await StudentList.create({
          course,
          branch,
          year,
          filepath:
            uploadedFilePath,
          data: parsedData,
        });

      return res.status(201).json({
        message:
          "Student list uploaded successfully",

        totalRecords:
          parsedData.length,

        data: studentList,
      });

    } catch (error) {
      console.error(
        "ADD student list error:",
        error
      );

      if (uploadedFilePath) {
        deleteFileSafely(
          uploadedFilePath
        );
      }

      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "A student list with the same course, branch and year already exists",
        });
      }

      return res.status(500).json({
        message:
          "Failed to upload student list",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// REPLACE / EDIT
// PUT /studentlist/edit/:id
// ─────────────────────────────────────────────────────────────────────────────

router.put(
  "/edit/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    let newFilePath = null;

    try {
      const { id } = req.params;

      // ───────────────────────────────────────────────────────────────────────
      // ID
      // ───────────────────────────────────────────────────────────────────────

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message:
            "Invalid student list ID",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // FILE
      // ───────────────────────────────────────────────────────────────────────

      if (!req.file) {
        return res.status(400).json({
          message:
            "Replacement student list file is required",
        });
      }

      newFilePath = req.file.path;

      // ───────────────────────────────────────────────────────────────────────
      // FIND EXISTING
      // ───────────────────────────────────────────────────────────────────────

      const existing =
        await StudentList.findById(id);

      if (!existing) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(404).json({
          message:
            "Student list not found",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // COURSE
      // ───────────────────────────────────────────────────────────────────────

      const course = String(
        req.body.course ||
          existing.course ||
          ""
      ).trim();

      if (!isValidCourse(course)) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(400).json({
          message:
            "Invalid course",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // BRANCH
      // ───────────────────────────────────────────────────────────────────────

      const branch = String(
        req.body.branch ||
          existing.branch ||
          ""
      ).trim();

      if (!isValidBranch(branch)) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(400).json({
          message:
            "Invalid branch",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // YEAR
      // ───────────────────────────────────────────────────────────────────────

      const year = String(
        req.body.year ||
          existing.year ||
          ""
      ).trim();

      if (!year) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(400).json({
          message:
            "Academic year is required",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // DUPLICATE
      // ───────────────────────────────────────────────────────────────────────

      const duplicate =
        await StudentList.findOne({
          course,
          branch,
          year,
          _id: {
            $ne: id,
          },
        });

      if (duplicate) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(409).json({
          message:
            `${course} ${year} ${branch} already exists`,
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // PARSE
      // ───────────────────────────────────────────────────────────────────────

      const parsedData =
        await parseStudentFile(
          newFilePath
        );

      if (
        !Array.isArray(parsedData)
      ) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(400).json({
          message:
            "Unable to parse replacement student list",
        });
      }

      const oldFilePath =
        existing.filepath;

      // ───────────────────────────────────────────────────────────────────────
      // UPDATE
      // ───────────────────────────────────────────────────────────────────────

      existing.course = course;
      existing.branch = branch;
      existing.year = year;
      existing.filepath =
        newFilePath;
      existing.data =
        parsedData;

      await existing.save();

      // ───────────────────────────────────────────────────────────────────────
      // DELETE OLD FILE
      // ───────────────────────────────────────────────────────────────────────

      if (
        oldFilePath &&
        oldFilePath !== newFilePath
      ) {
        deleteFileSafely(
          oldFilePath
        );
      }

      return res.status(200).json({
        message:
          "Student list replaced successfully",

        totalRecords:
          parsedData.length,

        data: existing,
      });

    } catch (error) {
      console.error(
        "EDIT student list error:",
        error
      );

      if (newFilePath) {
        deleteFileSafely(
          newFilePath
        );
      }

      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "Student list with the same course, branch and year already exists",
        });
      }

      return res.status(500).json({
        message:
          "Failed to replace student list",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// DELETE /studentlist/delete/:id
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  "/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message:
            "Invalid student list ID",
        });
      }

      const studentList =
        await StudentList.findById(id);

      if (!studentList) {
        return res.status(404).json({
          message:
            "Student list not found",
        });
      }

      await StudentList.findByIdAndDelete(
        id
      );

      if (studentList.filepath) {
        deleteFileSafely(
          studentList.filepath
        );
      }

      return res.status(200).json({
        message:
          "Student list and uploaded file deleted successfully",
      });

    } catch (error) {
      console.error(
        "DELETE student list error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete student list",
        error: error.message,
      });
    }
  }
);

module.exports = router;