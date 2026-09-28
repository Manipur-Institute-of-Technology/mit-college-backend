const express = require("express");
const router = express.Router();

const mongoose = require("mongoose");
const fs = require("fs");

const PlacementStudentList = require("../model/placementStudentList");

const createUploader = require("../middleware/multer");
const parseStudentFile = require("../middleware/ParseStudentFile");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

// ─────────────────────────────────────────────────────────────────────────────
// MULTER
// ─────────────────────────────────────────────────────────────────────────────

const upload =
  createUploader("placement student list");

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
    // Ignore file deletion errors
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL PLACEMENT STUDENT LISTS
//
// GET /placementstudentlist
//
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/",
  async (req, res) => {
    try {
      const lists =
        await PlacementStudentList.find()
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        count: lists.length,
        data: lists,
      });

    } catch (error) {
      return res.status(500).json({
        message:
          "Failed to fetch placement student lists",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE PLACEMENT STUDENT LIST
//
// GET /placementstudentlist/:id
//
// PUBLIC
// ─────────────────────────────────────────────────────────────────────────────

router.get(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      // ───────────────────────────────────────────────────────────────────────
      // VALIDATE ID
      // ───────────────────────────────────────────────────────────────────────

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message:
            "Invalid placement student list ID",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // FIND
      // ───────────────────────────────────────────────────────────────────────

      const studentList =
        await PlacementStudentList.findById(
          id
        ).lean();

      if (!studentList) {
        return res.status(404).json({
          message:
            "Placement student list not found",
        });
      }

      return res.status(200).json({
        data: studentList,
      });

    } catch (error) {
      return res.status(500).json({
        message:
          "Failed to fetch placement student list",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// ADD PLACEMENT STUDENT LIST
//
// POST /placementstudentlist/add
//
// ADMIN ONLY
//
// FormData:
// name = Display name
// file = CSV/XLS/XLSX
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
            "Placement student list file is required",
        });
      }

      uploadedFilePath =
        req.file.path;

      // ───────────────────────────────────────────────────────────────────────
      // DISPLAY NAME
      // ───────────────────────────────────────────────────────────────────────

      const name =
        req.body?.name?.trim();

      if (!name) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Placement student list name is required",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // ORIGINAL FILE NAME
      // ───────────────────────────────────────────────────────────────────────

      const filename =
        req.file.originalname;

      if (!filename) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "File name is required",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // PARSE FILE
      // ───────────────────────────────────────────────────────────────────────

      const parsedData =
        await parseStudentFile(
          uploadedFilePath
        );

      if (!Array.isArray(parsedData)) {
        deleteFileSafely(
          uploadedFilePath
        );

        return res.status(400).json({
          message:
            "Unable to parse placement student list",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // CREATE DATABASE RECORD
      // ───────────────────────────────────────────────────────────────────────

      const studentList =
        await PlacementStudentList.create({
          name,
          filename,
          filepath:
            uploadedFilePath,
          data: parsedData,
        });

      // ───────────────────────────────────────────────────────────────────────
      // RESPONSE
      // ───────────────────────────────────────────────────────────────────────

      return res.status(201).json({
        message:
          "Placement student list uploaded successfully",

        name,

        filename,

        totalRecords:
          parsedData.length,

        data: studentList,
      });

    } catch (error) {

      // ───────────────────────────────────────────────────────────────────────
      // DELETE UPLOADED FILE IF DATABASE/PARSING FAILS
      // ───────────────────────────────────────────────────────────────────────

      if (uploadedFilePath) {
        deleteFileSafely(
          uploadedFilePath
        );
      }

      return res.status(500).json({
        message:
          "Failed to upload placement student list",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// REPLACE / EDIT
//
// PUT /placementstudentlist/edit/:id
//
// ADMIN ONLY
//
// FormData:
// name = Display name
// file = New CSV/XLS/XLSX
// ─────────────────────────────────────────────────────────────────────────────

router.put(
  "/edit/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("file"),

  async (req, res) => {
    let newFilePath = null;

    try {
      const { id } =
        req.params;

      // ───────────────────────────────────────────────────────────────────────
      // VALIDATE ID
      // ───────────────────────────────────────────────────────────────────────

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message:
            "Invalid placement student list ID",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // FILE VALIDATION
      // ───────────────────────────────────────────────────────────────────────

      if (!req.file) {
        return res.status(400).json({
          message:
            "Replacement placement student list file is required",
        });
      }

      newFilePath =
        req.file.path;

      // ───────────────────────────────────────────────────────────────────────
      // DISPLAY NAME
      // ───────────────────────────────────────────────────────────────────────

      const name =
        req.body?.name?.trim();

      if (!name) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(400).json({
          message:
            "Placement student list name is required",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // FIND EXISTING RECORD
      // ───────────────────────────────────────────────────────────────────────

      const existing =
        await PlacementStudentList.findById(
          id
        );

      if (!existing) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(404).json({
          message:
            "Placement student list not found",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // ORIGINAL FILE NAME
      // ───────────────────────────────────────────────────────────────────────

      const filename =
        req.file.originalname;

      if (!filename) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(400).json({
          message:
            "File name is required",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // PARSE NEW FILE
      // ───────────────────────────────────────────────────────────────────────

      const parsedData =
        await parseStudentFile(
          newFilePath
        );

      if (!Array.isArray(parsedData)) {
        deleteFileSafely(
          newFilePath
        );

        return res.status(400).json({
          message:
            "Unable to parse replacement placement student list",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // STORE OLD FILE PATH
      // ───────────────────────────────────────────────────────────────────────

      const oldFilePath =
        existing.filepath;

      // ───────────────────────────────────────────────────────────────────────
      // UPDATE
      // ───────────────────────────────────────────────────────────────────────

      existing.name =
        name;

      existing.filename =
        filename;

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

      // ───────────────────────────────────────────────────────────────────────
      // RESPONSE
      // ───────────────────────────────────────────────────────────────────────

      return res.status(200).json({
        message:
          "Placement student list replaced successfully",

        name,

        filename,

        totalRecords:
          parsedData.length,

        data: existing,
      });

    } catch (error) {

      // ───────────────────────────────────────────────────────────────────────
      // DELETE NEW FILE IF UPDATE FAILS
      // ───────────────────────────────────────────────────────────────────────

      if (newFilePath) {
        deleteFileSafely(
          newFilePath
        );
      }

      return res.status(500).json({
        message:
          "Failed to replace placement student list",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
//
// DELETE /placementstudentlist/delete/:id
//
// ADMIN ONLY
// ─────────────────────────────────────────────────────────────────────────────

router.delete(
  "/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),

  async (req, res) => {
    try {
      const { id } =
        req.params;

      // ───────────────────────────────────────────────────────────────────────
      // VALIDATE ID
      // ───────────────────────────────────────────────────────────────────────

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          message:
            "Invalid placement student list ID",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // FIND RECORD
      // ───────────────────────────────────────────────────────────────────────

      const studentList =
        await PlacementStudentList.findById(
          id
        );

      if (!studentList) {
        return res.status(404).json({
          message:
            "Placement student list not found",
        });
      }

      // ───────────────────────────────────────────────────────────────────────
      // DELETE DATABASE RECORD
      // ───────────────────────────────────────────────────────────────────────

      await PlacementStudentList.findByIdAndDelete(
        id
      );

      // ───────────────────────────────────────────────────────────────────────
      // DELETE UPLOADED FILE
      // ───────────────────────────────────────────────────────────────────────

      if (studentList.filepath) {
        deleteFileSafely(
          studentList.filepath
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // RESPONSE
      // ───────────────────────────────────────────────────────────────────────

      return res.status(200).json({
        message:
          "Placement student list and uploaded file deleted successfully",
      });

    } catch (error) {
      return res.status(500).json({
        message:
          "Failed to delete placement student list",
        error: error.message,
      });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

module.exports = router;