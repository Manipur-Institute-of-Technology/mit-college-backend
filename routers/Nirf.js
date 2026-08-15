const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const Nirf = require("../model/nirf");
const createUploader = require("../middleware/multer");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

// ============================================================
// UPLOAD DIRECTORY
// ============================================================

const nirfUploadDir = path.join(
  __dirname,
  "../uploads/nirf"
);

if (!fs.existsSync(nirfUploadDir)) {
  fs.mkdirSync(nirfUploadDir, {
    recursive: true,
  });
}

// ============================================================
// MULTER
// ============================================================

const upload = createUploader("nirf");

// ============================================================
// DELETE FILE HELPER
// ============================================================

const deleteFileIfExists = (filePath) => {
  if (!filePath) {
    return;
  }

  try {
    let actualPath = filePath;

    // /uploads/nirf/example.pdf
    if (filePath.startsWith("/uploads/")) {
      actualPath = path.join(
        __dirname,
        "..",
        filePath.substring(1)
      );
    }

    // uploads/nirf/example.pdf
    else if (filePath.startsWith("uploads/")) {
      actualPath = path.join(
        __dirname,
        "..",
        filePath
      );
    }

    // Absolute filesystem path
    else if (path.isAbsolute(filePath)) {
      actualPath = filePath;
    }

    if (fs.existsSync(actualPath)) {
      fs.unlinkSync(actualPath);

      console.log(
        "NIRF FILE DELETED:",
        actualPath
      );
    } else {
      console.log(
        "NIRF FILE NOT FOUND:",
        actualPath
      );
    }
  } catch (error) {
    console.error(
      "NIRF FILE DELETE ERROR:",
      error.message
    );
  }
};

// ============================================================
// GET RESOURCE DATA
// ============================================================

const getResourceData = (req) => {
  let resource = {};

  if (
    req.body &&
    req.body.resource &&
    typeof req.body.resource === "object"
  ) {
    resource = req.body.resource;
  }

  return {
    type:
      resource.type ||
      req.body["resource[type]"] ||
      req.body.resourceType ||
      "",

    url:
      resource.url ||
      req.body["resource[url]"] ||
      req.body.resourceUrl ||
      "",
  };
};

// ============================================================
// CLEANUP UPLOADED FILE
// ============================================================

const cleanupUploadedFile = (req) => {
  if (req.file && req.file.path) {
    deleteFileIfExists(req.file.path);
  }
};

// ============================================================
// MULTER ERROR HANDLER
// ============================================================

const handleUpload = upload.single("file");

const handleMulterUpload = (req, res, next) => {
  handleUpload(req, res, (error) => {
    if (error) {
      console.error(
        "NIRF MULTER ERROR:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "NIRF document must be 10 MB or smaller."
            : error.message ||
              "Failed to upload NIRF document.",
      });
    }

    next();
  });
};

// ============================================================
// GET ALL NIRF
// PUBLIC
// ============================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const nirfList = await Nirf.find()
        .sort({
          createdAt: -1,
        })
        .lean();

      return res.status(200).json({
        success: true,
        data: nirfList,
      });
    } catch (error) {
      console.error(
        "GET NIRF ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch NIRF records.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// GET SINGLE NIRF
// PUBLIC
// ============================================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const { id } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid NIRF ID.",
        });
      }

      const nirf =
        await Nirf.findById(id);

      if (!nirf) {
        return res.status(404).json({
          success: false,
          message:
            "NIRF record not found.",
        });
      }

      return res.status(200).json({
        success: true,
        data: nirf,
      });
    } catch (error) {
      console.error(
        "GET SINGLE NIRF ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch NIRF record.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// ADD NIRF
// ADMIN ONLY
// ============================================================

router.post(
  "/add",

  JWTAuthentication,

  handleMulterUpload,

  // IMPORTANT:
  // Only accountType is checked.
  // Account status is NOT checked.
  Authorization(["admin"]),

  async (req, res) => {
    try {
      console.log(
        "================================="
      );

      console.log(
        "NIRF ADD REQUEST"
      );

      console.log(
        "================================="
      );

      console.log(
        "BODY:",
        req.body
      );

      console.log(
        "FILE:",
        req.file
      );

      // ========================================================
      // BASIC DATA
      // ========================================================

      const header =
        typeof req.body.header === "string"
          ? req.body.header.trim()
          : "";

      const description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";

      const year =
        req.body.year !== undefined &&
        req.body.year !== null
          ? req.body.year
              .toString()
              .trim()
          : "";

      // ========================================================
      // RESOURCE
      // ========================================================

      const resource =
        getResourceData(req);

      const resourceType =
        resource.type.trim();

      const resourceUrl =
        resource.url.trim();

      console.log(
        "RESOURCE:",
        resource
      );

      // ========================================================
      // VALIDATION
      // ========================================================

      if (!header) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Header is required.",
        });
      }

      if (!description) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Description is required.",
        });
      }

      if (!year) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Year is required.",
        });
      }

      if (
        !["file", "link"].includes(
          resourceType
        )
      ) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Resource type must be either file or link.",
        });
      }

      // ========================================================
      // FILE RESOURCE
      // ========================================================

      if (
        resourceType === "file"
      ) {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message:
              "Please upload a NIRF document.",
          });
        }

        const filePath =
          `/uploads/nirf/${req.file.filename}`;

        const nirf =
          new Nirf({
            header,
            description,
            year,

            resource: {
              type: "file",
              url: "",
              file: filePath,
            },
          });

        const savedNirf =
          await nirf.save();

        console.log(
          "NIRF CREATED:",
          savedNirf._id
        );

        return res.status(201).json({
          success: true,
          message:
            "NIRF record added successfully.",
          data: savedNirf,
        });
      }

      // ========================================================
      // LINK RESOURCE
      // ========================================================

      if (
        resourceType === "link"
      ) {
        if (!resourceUrl) {
          cleanupUploadedFile(req);

          return res.status(400).json({
            success: false,
            message:
              "Resource URL is required.",
          });
        }

        // Link should not retain uploaded file.
        cleanupUploadedFile(req);

        const nirf =
          new Nirf({
            header,
            description,
            year,

            resource: {
              type: "link",
              url: resourceUrl,
              file: "",
            },
          });

        const savedNirf =
          await nirf.save();

        console.log(
          "NIRF CREATED:",
          savedNirf._id
        );

        return res.status(201).json({
          success: true,
          message:
            "NIRF record added successfully.",
          data: savedNirf,
        });
      }

      cleanupUploadedFile(req);

      return res.status(400).json({
        success: false,
        message:
          "Invalid NIRF resource.",
      });
    } catch (error) {
      console.error(
        "NIRF ADD ERROR:",
        error
      );

      cleanupUploadedFile(req);

      return res.status(500).json({
        success: false,
        message:
          "Failed to add NIRF record.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// EDIT NIRF
// ADMIN ONLY
// ============================================================

router.put(
  "/edit/:id",

  JWTAuthentication,

  handleMulterUpload,

  // IMPORTANT:
  // Only admin is checked.
  Authorization(["admin"]),

  async (req, res) => {
    try {
      const { id } =
        req.params;

      console.log(
        "================================="
      );

      console.log(
        "NIRF EDIT REQUEST"
      );

      console.log(
        "================================="
      );

      console.log(
        "ID:",
        id
      );

      console.log(
        "BODY:",
        req.body
      );

      console.log(
        "FILE:",
        req.file
      );

      // ========================================================
      // VALIDATE ID
      // ========================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Invalid NIRF ID.",
        });
      }

      // ========================================================
      // FIND EXISTING
      // ========================================================

      const existing =
        await Nirf.findById(id);

      if (!existing) {
        cleanupUploadedFile(req);

        return res.status(404).json({
          success: false,
          message:
            "NIRF record not found.",
        });
      }

      // ========================================================
      // DATA
      // ========================================================

      const header =
        typeof req.body.header === "string"
          ? req.body.header.trim()
          : "";

      const description =
        typeof req.body.description === "string"
          ? req.body.description.trim()
          : "";

      const year =
        req.body.year !== undefined &&
        req.body.year !== null
          ? req.body.year
              .toString()
              .trim()
          : "";

      const resource =
        getResourceData(req);

      const resourceType =
        resource.type.trim();

      const resourceUrl =
        resource.url.trim();

      // ========================================================
      // VALIDATION
      // ========================================================

      if (!header) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Header is required.",
        });
      }

      if (!description) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Description is required.",
        });
      }

      if (!year) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Year is required.",
        });
      }

      if (
        !["file", "link"].includes(
          resourceType
        )
      ) {
        cleanupUploadedFile(req);

        return res.status(400).json({
          success: false,
          message:
            "Resource type must be either file or link.",
        });
      }

      // ========================================================
      // EDIT TO LINK
      // ========================================================

      if (
        resourceType === "link"
      ) {
        if (!resourceUrl) {
          cleanupUploadedFile(req);

          return res.status(400).json({
            success: false,
            message:
              "Resource URL is required.",
          });
        }

        // Delete accidentally uploaded new file.
        cleanupUploadedFile(req);

        // Delete old physical file if old
        // resource was a file.
        if (
          existing.resource &&
          existing.resource.type ===
            "file" &&
          existing.resource.file
        ) {
          deleteFileIfExists(
            existing.resource.file
          );
        }

        existing.header =
          header;

        existing.description =
          description;

        existing.year =
          year;

        existing.resource = {
          type: "link",
          url: resourceUrl,
          file: "",
        };

        const updated =
          await existing.save();

        console.log(
          "NIRF UPDATED TO LINK:",
          updated._id
        );

        return res.status(200).json({
          success: true,
          message:
            "NIRF record updated successfully.",
          data: updated,
        });
      }

      // ========================================================
      // EDIT TO FILE
      // ========================================================

      if (
        resourceType === "file"
      ) {
        let newFilePath =
          existing.resource &&
          existing.resource.type ===
            "file"
            ? existing.resource.file ||
              ""
            : "";

        // ======================================================
        // NEW FILE SELECTED
        // ======================================================

        if (req.file) {
          newFilePath =
            `/uploads/nirf/${req.file.filename}`;
        }

        // ======================================================
        // NO FILE AVAILABLE
        // ======================================================

        if (!newFilePath) {
          cleanupUploadedFile(req);

          return res.status(400).json({
            success: false,
            message:
              "Please select a NIRF document.",
          });
        }

        // ======================================================
        // DELETE OLD FILE ONLY IF NEW FILE WAS UPLOADED
        // ======================================================

        if (
          req.file &&
          existing.resource &&
          existing.resource.type ===
            "file" &&
          existing.resource.file
        ) {
          deleteFileIfExists(
            existing.resource.file
          );
        }

        // ======================================================
        // UPDATE DATABASE
        // ======================================================

        existing.header =
          header;

        existing.description =
          description;

        existing.year =
          year;

        existing.resource = {
          type: "file",
          url: "",
          file: newFilePath,
        };

        const updated =
          await existing.save();

        console.log(
          "NIRF UPDATED TO FILE:",
          updated._id
        );

        return res.status(200).json({
          success: true,
          message:
            "NIRF record updated successfully.",
          data: updated,
        });
      }

      cleanupUploadedFile(req);

      return res.status(400).json({
        success: false,
        message:
          "Invalid NIRF resource.",
      });
    } catch (error) {
      console.error(
        "NIRF EDIT ERROR:",
        error
      );

      cleanupUploadedFile(req);

      return res.status(500).json({
        success: false,
        message:
          "Failed to update NIRF record.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// DELETE NIRF
// ADMIN ONLY
// ============================================================

router.delete(
  "/delete/:id",

  JWTAuthentication,

  // IMPORTANT:
  // Only admin is checked.
  Authorization(["admin"]),

  async (req, res) => {
    try {
      const { id } =
        req.params;

      console.log(
        "================================="
      );

      console.log(
        "NIRF DELETE REQUEST"
      );

      console.log(
        "ID:",
        id
      );

      console.log(
        "================================="
      );

      // ========================================================
      // VALIDATE ID
      // ========================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid NIRF ID.",
        });
      }

      // ========================================================
      // FIND RECORD
      // ========================================================

      const nirf =
        await Nirf.findById(id);

      if (!nirf) {
        return res.status(404).json({
          success: false,
          message:
            "NIRF record not found.",
        });
      }

      // ========================================================
      // DELETE PHYSICAL FILE
      // ========================================================

      if (
        nirf.resource &&
        nirf.resource.type ===
          "file" &&
        nirf.resource.file
      ) {
        deleteFileIfExists(
          nirf.resource.file
        );
      }

      // ========================================================
      // DELETE DATABASE RECORD
      // ========================================================

      await Nirf.deleteOne({
        _id: id,
      });

      console.log(
        "NIRF DELETED:",
        id
      );

      return res.status(200).json({
        success: true,
        message:
          "NIRF record deleted successfully.",
      });
    } catch (error) {
      console.error(
        "NIRF DELETE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete NIRF record.",
        error: error.message,
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;