const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const InstituteAdministration = require("../model/instituteadministrator");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

// =====================================================
// MULTER CONFIGURATION
// =====================================================

const uploadDirectory = path.join(
  __dirname,
  "../uploads/administrator"
);

// Create directory if it does not exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

// =====================================================
// GET INSTITUTE ADMINISTRATION
// PUBLIC
// =====================================================

router.get("/", async (req, res) => {
  try {
    const data =
      await InstituteAdministration.findOne();

    return res.status(200).json({
      data: data || {
        governingBodyStructure: [],
        governingBodyMembers: [],
        documents: [],
      },
    });
  } catch (error) {

    return res.status(500).json({
      error: error.message,
    });
  }
});

// =====================================================
// CREATE INITIAL ADMINISTRATION DOCUMENT
// ADMIN ONLY
// =====================================================

router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      let data =
        await InstituteAdministration.findOne();

      if (data) {
        return res.status(200).json({
          message:
            "Institute administration already exists",
          data,
        });
      }

      data = new InstituteAdministration({
        governingBodyStructure: [],
        governingBodyMembers: [],
        documents: [],
      });

      await data.save();

      return res.status(201).json({
        message:
          "Institute administration created successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// STRUCTURE OF THE GOVERNING BODY
// =====================================================

// =====================================================
// ADD STRUCTURE
// POST /administrator/structure/add
// =====================================================

router.post(
  "/structure/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { position, role } = req.body;

      if (!position || !position.trim()) {
        return res.status(400).json({
          error: "Position is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Role is required",
        });
      }

      let data =
        await InstituteAdministration.findOne();

      if (!data) {
        data = new InstituteAdministration({
          governingBodyStructure: [],
          governingBodyMembers: [],
          documents: [],
        });
      }

      data.governingBodyStructure.push({
        position: position.trim(),
        role: role.trim(),
      });

      await data.save();

      return res.status(201).json({
        message:
          "Governing body structure added successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// EDIT STRUCTURE
// PUT /administrator/structure/edit/:structureId
// =====================================================

router.put(
  "/structure/edit/:structureId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { position, role } = req.body;

      if (!position || !position.trim()) {
        return res.status(400).json({
          error: "Position is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Role is required",
        });
      }

      const data =
        await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error:
            "Institute administration not found",
        });
      }

      const structure =
        data.governingBodyStructure.id(
          req.params.structureId
        );

      if (!structure) {
        return res.status(404).json({
          error:
            "Governing body structure not found",
        });
      }

      structure.position = position.trim();
      structure.role = role.trim();

      await data.save();

      return res.status(200).json({
        message:
          "Governing body structure updated successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE STRUCTURE
// DELETE /administrator/structure/delete/:structureId
// =====================================================

router.delete(
  "/structure/delete/:structureId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const data =
        await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error:
            "Institute administration not found",
        });
      }

      const structure =
        data.governingBodyStructure.id(
          req.params.structureId
        );

      if (!structure) {
        return res.status(404).json({
          error:
            "Governing body structure not found",
        });
      }

      structure.deleteOne();

      await data.save();

      return res.status(200).json({
        message:
          "Governing body structure deleted successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// GOVERNING BODY MEMBERS
// =====================================================

// =====================================================
// ADD MEMBER
// POST /administrator/member/add
// =====================================================

router.post(
  "/member/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const {
        name,
        background,
        role,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Member name is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Member role is required",
        });
      }

      let data =
        await InstituteAdministration.findOne();

      if (!data) {
        data = new InstituteAdministration({
          governingBodyStructure: [],
          governingBodyMembers: [],
          documents: [],
        });
      }

      data.governingBodyMembers.push({
        name: name.trim(),

        background: background
          ? background.trim()
          : "",

        role: role.trim(),
      });

      await data.save();

      return res.status(201).json({
        message:
          "Governing body member added successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// EDIT MEMBER
// PUT /administrator/member/edit/:memberId
// =====================================================

router.put(
  "/member/edit/:memberId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const {
        name,
        background,
        role,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Member name is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Member role is required",
        });
      }

      const data =
        await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error:
            "Institute administration not found",
        });
      }

      const member =
        data.governingBodyMembers.id(
          req.params.memberId
        );

      if (!member) {
        return res.status(404).json({
          error:
            "Governing body member not found",
        });
      }

      member.name = name.trim();

      member.background = background
        ? background.trim()
        : "";

      member.role = role.trim();

      await data.save();

      return res.status(200).json({
        message:
          "Governing body member updated successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE MEMBER
// DELETE /administrator/member/delete/:memberId
// =====================================================

router.delete(
  "/member/delete/:memberId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const data =
        await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error:
            "Institute administration not found",
        });
      }

      const member =
        data.governingBodyMembers.id(
          req.params.memberId
        );

      if (!member) {
        return res.status(404).json({
          error:
            "Governing body member not found",
        });
      }

      member.deleteOne();

      await data.save();

      return res.status(200).json({
        message:
          "Governing body member deleted successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// DOCUMENTS
// =====================================================

// =====================================================
// ADD DOCUMENT
// POST /administrator/document/add
//
// FILE:
// multipart/form-data
// title
// type = file
// file = actual file
//
// LINK:
// application/json
// {
//   title: "...",
//   type: "link",
//   url: "..."
// }
// =====================================================

router.post(
  "/document/add",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        title,
        type,
        url,
      } = req.body;

      // -----------------------------------------------
      // VALIDATION
      // -----------------------------------------------

      if (!title || !title.trim()) {
        return res.status(400).json({
          error: "Document title is required",
        });
      }

      if (
        type !== "file" &&
        type !== "link"
      ) {
        return res.status(400).json({
          error:
            "Document type must be either file or link",
        });
      }

      // -----------------------------------------------
      // FILE VALIDATION
      // -----------------------------------------------

      if (type === "file") {
        if (!req.file) {
          return res.status(400).json({
            error: "Document file is required",
          });
        }
      }

      // -----------------------------------------------
      // LINK VALIDATION
      // -----------------------------------------------

      if (type === "link") {
        if (!url || !url.trim()) {
          return res.status(400).json({
            error:
              "Document URL is required",
          });
        }
      }

      // -----------------------------------------------
      // FIND ADMINISTRATION
      // -----------------------------------------------

      let data =
        await InstituteAdministration.findOne();

      if (!data) {
        data = new InstituteAdministration({
          governingBodyStructure: [],
          governingBodyMembers: [],
          documents: [],
        });
      }

      // -----------------------------------------------
      // DOCUMENT DATA
      // -----------------------------------------------

      const documentData = {
        title: title.trim(),
        type,
        file: "",
        url: "",
      };

      // -----------------------------------------------
      // FILE
      // -----------------------------------------------

      if (type === "file") {
        documentData.file =
          `/uploads/administrator/${req.file.filename}`;
      }

      // -----------------------------------------------
      // LINK
      // -----------------------------------------------

      if (type === "link") {
        documentData.url =
          url.trim();
      }

      data.documents.push(
        documentData
      );

      await data.save();

      return res.status(201).json({
        message:
          "Document added successfully",
        data,
      });
    } catch (error) {

      // Delete uploaded file if DB save fails
      if (req.file) {
        try {
          fs.unlinkSync(
            req.file.path
          );
        } catch (deleteError) {
        }
      }

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// EDIT DOCUMENT
// PUT /administrator/document/edit/:documentId
// =====================================================

router.put(
  "/document/edit/:documentId",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        title,
        type,
        url,
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          error:
            "Document title is required",
        });
      }

      if (
        type !== "file" &&
        type !== "link"
      ) {
        return res.status(400).json({
          error:
            "Document type must be either file or link",
        });
      }

      const data =
        await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error:
            "Institute administration not found",
        });
      }

      const document =
        data.documents.id(
          req.params.documentId
        );

      if (!document) {
        return res.status(404).json({
          error:
            "Document not found",
        });
      }

      // -----------------------------------------------
      // UPDATE TITLE
      // -----------------------------------------------

      document.title =
        title.trim();

      document.type =
        type;

      // -----------------------------------------------
      // CHANGE TO FILE
      // -----------------------------------------------

      if (type === "file") {
        if (req.file) {
          // Delete old file
          if (
            document.file
          ) {
            const oldFilePath =
              path.join(
                __dirname,
                "..",
                document.file.replace(
                  /^\/+/,
                  ""
                )
              );

            if (
              fs.existsSync(
                oldFilePath
              )
            ) {
              fs.unlinkSync(
                oldFilePath
              );
            }
          }

          document.file =
            `/uploads/administrator/${req.file.filename}`;
        }

        document.url = "";
      }

      // -----------------------------------------------
      // CHANGE TO LINK
      // -----------------------------------------------

      if (type === "link") {
        if (!url || !url.trim()) {
          return res.status(400).json({
            error:
              "Document URL is required",
          });
        }

        // Delete old file
        if (
          document.file
        ) {
          const oldFilePath =
            path.join(
              __dirname,
              "..",
              document.file.replace(
                /^\/+/,
                ""
              )
            );

          if (
            fs.existsSync(
              oldFilePath
            )
          ) {
            fs.unlinkSync(
              oldFilePath
            );
          }
        }

        document.file = "";
        document.url =
          url.trim();
      }

      await data.save();

      return res.status(200).json({
        message:
          "Document updated successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// DELETE DOCUMENT
// DELETE /administrator/document/delete/:documentId
// =====================================================

router.delete(
  "/document/delete/:documentId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const data =
        await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error:
            "Institute administration not found",
        });
      }

      const document =
        data.documents.id(
          req.params.documentId
        );

      if (!document) {
        return res.status(404).json({
          error:
            "Document not found",
        });
      }

      // -----------------------------------------------
      // DELETE PHYSICAL FILE
      // -----------------------------------------------

      if (document.file) {
        const filePath =
          path.join(
            __dirname,
            "..",
            document.file.replace(
              /^\/+/,
              ""
            )
          );

        if (
          fs.existsSync(filePath)
        ) {
          fs.unlinkSync(
            filePath
          );
        }
      }

      // -----------------------------------------------
      // DELETE DATABASE SUBDOCUMENT
      // -----------------------------------------------

      document.deleteOne();

      await data.save();

      return res.status(200).json({
        message:
          "Document deleted successfully",
        data,
      });
    } catch (error) {

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;
