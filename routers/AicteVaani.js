const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const AicteVaani = require("../model/aicteVaani");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

// Existing multer middleware
const createUploader = require("../middleware/multer");

const upload = createUploader("aicte-vaani");

// ============================================================
// HELPER
// Convert uploaded Multer file into database object
// ============================================================

const buildFileObject = (file, index, title = "") => {
  if (!file) return null;

  let fileUrl = "";

  /*
   * If Multer provides file.url:
   * use it directly.
   *
   * Otherwise construct URL from file.path/file.filename.
   */

  if (file.url) {
    fileUrl = file.url;
  } else if (file.path) {
    const normalized = file.path.replace(/\\/g, "/");

    const uploadsIndex = normalized.indexOf("/uploads/");

    if (uploadsIndex !== -1) {
      fileUrl = normalized.substring(uploadsIndex);
    } else {
      fileUrl = `/uploads/${file.filename}`;
    }
  } else if (file.filename) {
    fileUrl = `/uploads/${file.filename}`;
  }

  return {
    id: Date.now() + index,

    title:
      String(title || "").trim() ||
      file.originalname ||
      "File",

    url: fileUrl,

    originalName: file.originalname || "",

    mimeType: file.mimetype || "",

    size: Number(file.size) || 0,
  };
};

// ============================================================
// DELETE PHYSICAL FILE
// ============================================================

const deleteUploadedFile = (fileUrl) => {
  if (!fileUrl) return;

  try {
    /*
     * Example:
     *
     * /uploads/aicte-vaani/file.pdf
     *
     * becomes:
     *
     * uploads/aicte-vaani/file.pdf
     */

    const relativePath = fileUrl.replace(/^\/+/, "");

    const filePath = path.join(
      process.cwd(),
      relativePath
    );

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      console.log(
        "AICTE-VAANI file deleted:",
        filePath
      );
    } else {
      console.log(
        "AICTE-VAANI file not found:",
        filePath
      );
    }
  } catch (error) {
    console.error(
      "AICTE-VAANI FILE DELETE ERROR:",
      error.message
    );
  }
};

// ============================================================
// DELETE MULTIPLE FILES
// ============================================================

const deleteFiles = (files = []) => {
  if (!Array.isArray(files)) return;

  files.forEach((file) => {
    if (file && file.url) {
      deleteUploadedFile(file.url);
    }
  });
};

// ============================================================
// CLEAN CONTACT
// ============================================================

const cleanContact = (contact) => ({
  coordinator:
    typeof contact?.coordinator === "string"
      ? contact.coordinator.trim()
      : "",

  coCoordinator:
    typeof contact?.coCoordinator === "string"
      ? contact.coCoordinator.trim()
      : "",

  department:
    typeof contact?.department === "string"
      ? contact.department.trim()
      : "",

  website:
    typeof contact?.website === "string"
      ? contact.website.trim()
      : "",

  email:
    typeof contact?.email === "string"
      ? contact.email.trim()
      : "",

  phone:
    typeof contact?.phone === "string"
      ? contact.phone.trim()
      : "",
});

// ============================================================
// PARSE JSON ARRAY
// ============================================================

const parseArray = (value) => {
  let parsed = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = [];
    }
  }

  return Array.isArray(parsed) ? parsed : [];
};

// ============================================================
// CLEAN EXISTING FILES
// Used during EDIT
//
// Frontend sends the existing files that should remain.
// Any old file not present here will be deleted.
// ============================================================

const cleanExistingFiles = (files) => {
  const parsed = parseArray(files);

  return parsed
    .filter(
      (item) =>
        item &&
        String(item.url || "").trim()
    )
    .map((item, index) => ({
      id:
        Number(item.id) ||
        Date.now() + index,

      title:
        String(item.title || "").trim(),

      url:
        String(item.url || "").trim(),

      originalName:
        String(item.originalName || "").trim(),

      mimeType:
        String(item.mimeType || "").trim(),

      size:
        Number(item.size) || 0,
    }));
};

// ============================================================
// GET ALL AICTE-VAANI
// PUBLIC
//
// GET /mit/aicte-vaani
// ============================================================

router.get("/", async (req, res) => {
  try {
    const items = await AicteVaani.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      total: items.length,
      data: items,
    });
  } catch (error) {
    console.error(
      "AICTE-VAANI GET ALL ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to fetch AICTE-VAANI records",

      details: error.message,
    });
  }
});

// ============================================================
// GET SINGLE AICTE-VAANI
// PUBLIC
//
// GET /mit/aicte-vaani/:id
// ============================================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid AICTE-VAANI ID",
      });
    }

    const item =
      await AicteVaani.findById(id).lean();

    if (!item) {
      return res.status(404).json({
        error:
          "AICTE-VAANI record not found",
      });
    }

    return res.status(200).json({
      data: item,
    });
  } catch (error) {
    console.error(
      "AICTE-VAANI GET SINGLE ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Failed to fetch AICTE-VAANI record",

      details: error.message,
    });
  }
});

// ============================================================
// ADD AICTE-VAANI
// ADMIN ONLY
//
// POST /mit/aicte-vaani/add
//
// multipart/form-data
//
// Files:
// attachments -> uploaded attachment files
// extraLinks  -> uploaded extra-link files
//
// Fields:
// attachmentTitles -> JSON array
// extraLinkTitles -> JSON array
// ============================================================

router.post(
  "/add",

  JWTAuthentication,

  Authorization(["admin"]),

  upload.fields([
    {
      name: "attachments",
      maxCount: 10,
    },
    {
      name: "extraLinks",
      maxCount: 10,
    },
  ]),

  async (req, res) => {
    try {
      const {
        header,
        topic,
        dates,
        time,
        venue,
        information,
        contact,
        status,
        attachmentTitles,
        extraLinkTitles,
      } = req.body;

      // ========================================================
      // REQUIRED
      // ========================================================

      if (
        !topic ||
        !String(topic).trim()
      ) {
        return res.status(400).json({
          error:
            "Workshop topic is required",
        });
      }

      if (
        !dates ||
        !String(dates).trim()
      ) {
        return res.status(400).json({
          error:
            "Event dates are required",
        });
      }

      // ========================================================
      // CONTACT
      // ========================================================

      let parsedContact = contact;

      if (typeof parsedContact === "string") {
        try {
          parsedContact =
            JSON.parse(parsedContact);
        } catch {
          parsedContact = {};
        }
      }

      const finalContact =
        cleanContact(parsedContact);

      // ========================================================
      // ATTACHMENT TITLES
      // ========================================================

      const parsedAttachmentTitles =
        parseArray(attachmentTitles);

      // ========================================================
      // EXTRA LINK TITLES
      // ========================================================

      const parsedExtraLinkTitles =
        parseArray(extraLinkTitles);

      // ========================================================
      // UPLOADED ATTACHMENTS
      // ========================================================

      const uploadedAttachments =
        Array.isArray(req.files?.attachments)
          ? req.files.attachments
              .map((file, index) =>
                buildFileObject(
                  file,
                  index,
                  parsedAttachmentTitles[index]
                )
              )
              .filter(Boolean)
          : [];

      // ========================================================
      // UPLOADED EXTRA LINKS
      //
      // These are FILES ONLY.
      // No URL is accepted here.
      // ========================================================

      const uploadedExtraLinks =
        Array.isArray(req.files?.extraLinks)
          ? req.files.extraLinks
              .map((file, index) =>
                buildFileObject(
                  file,
                  index,
                  parsedExtraLinkTitles[index]
                )
              )
              .filter(Boolean)
          : [];

      // ========================================================
      // CREATE
      // ========================================================

      const newItem =
        new AicteVaani({
          header:
            typeof header === "string" &&
            header.trim()
              ? header.trim()
              : "AICTE-VAANI WORKSHOP (2 Days)",

          topic:
            String(topic).trim(),

          dates:
            String(dates).trim(),

          time:
            typeof time === "string" &&
            time.trim()
              ? time.trim()
              : "9:00 AM – 5:00 PM",

          venue:
            typeof venue === "string" &&
            venue.trim()
              ? venue.trim()
              : "MIT, MU Campus",

          information:
            typeof information === "string"
              ? information.trim()
              : "",

          contact:
            finalContact,

          attachments:
            uploadedAttachments,

          extraLinks:
            uploadedExtraLinks,

          status:
            status === "Inactive"
              ? "Inactive"
              : "Active",
        });

      const savedItem =
        await newItem.save();

      return res.status(201).json({
        message:
          "AICTE-VAANI event created successfully",

        data: savedItem,
      });
    } catch (error) {
      console.error(
        "AICTE-VAANI ADD ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to create AICTE-VAANI event",

        details: error.message,
      });
    }
  }
);

// ============================================================
// UPDATE AICTE-VAANI
// ADMIN ONLY
//
// PUT /mit/aicte-vaani/edit/:id
//
// multipart/form-data
//
// Existing files to KEEP:
//
// existingAttachments
// existingExtraLinks
//
// New files:
//
// attachments
// extraLinks
// ============================================================

router.put(
  "/edit/:id",

  JWTAuthentication,

  Authorization(["admin"]),

  upload.fields([
    {
      name: "attachments",
      maxCount: 10,
    },
    {
      name: "extraLinks",
      maxCount: 10,
    },
  ]),

  async (req, res) => {
    try {
      const { id } = req.params;

      // ========================================================
      // VALIDATE ID
      // ========================================================

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          error:
            "Invalid AICTE-VAANI ID",
        });
      }

      // ========================================================
      // FIND EXISTING RECORD
      // ========================================================

      const existingItem =
        await AicteVaani.findById(id);

      if (!existingItem) {
        return res.status(404).json({
          error:
            "AICTE-VAANI event not found",
        });
      }

      const {
        header,
        topic,
        dates,
        time,
        venue,
        information,
        contact,
        status,

        existingAttachments,
        existingExtraLinks,

        attachmentTitles,
        extraLinkTitles,
      } = req.body;

      // ========================================================
      // REQUIRED
      // ========================================================

      if (
        !topic ||
        !String(topic).trim()
      ) {
        return res.status(400).json({
          error:
            "Workshop topic is required",
        });
      }

      if (
        !dates ||
        !String(dates).trim()
      ) {
        return res.status(400).json({
          error:
            "Event dates are required",
        });
      }

      // ========================================================
      // CONTACT
      // ========================================================

      let parsedContact = contact;

      if (typeof parsedContact === "string") {
        try {
          parsedContact =
            JSON.parse(parsedContact);
        } catch {
          parsedContact = {};
        }
      }

      const finalContact =
        cleanContact(parsedContact);

      // ========================================================
      // EXISTING ATTACHMENTS TO KEEP
      // ========================================================

      const keptAttachments =
        cleanExistingFiles(
          existingAttachments
        );

      // ========================================================
      // EXISTING EXTRA LINKS TO KEEP
      // ========================================================

      const keptExtraLinks =
        cleanExistingFiles(
          existingExtraLinks
        );

      // ========================================================
      // ATTACHMENT TITLES
      // ========================================================

      const parsedAttachmentTitles =
        parseArray(attachmentTitles);

      // ========================================================
      // EXTRA LINK TITLES
      // ========================================================

      const parsedExtraLinkTitles =
        parseArray(extraLinkTitles);

      // ========================================================
      // DETERMINE WHICH OLD ATTACHMENTS WERE REMOVED
      // ========================================================

      const keptAttachmentUrls =
        new Set(
          keptAttachments
            .map((file) => file.url)
            .filter(Boolean)
        );

      const removedAttachments =
        (existingItem.attachments || [])
          .filter(
            (oldFile) =>
              oldFile?.url &&
              !keptAttachmentUrls.has(
                oldFile.url
              )
          );

      // ========================================================
      // DELETE REMOVED ATTACHMENT FILES
      // ========================================================

      deleteFiles(
        removedAttachments
      );

      // ========================================================
      // DETERMINE WHICH OLD EXTRA LINKS WERE REMOVED
      // ========================================================

      const keptExtraLinkUrls =
        new Set(
          keptExtraLinks
            .map((file) => file.url)
            .filter(Boolean)
        );

      const removedExtraLinks =
        (existingItem.extraLinks || [])
          .filter(
            (oldFile) =>
              oldFile?.url &&
              !keptExtraLinkUrls.has(
                oldFile.url
              )
          );

      // ========================================================
      // DELETE REMOVED EXTRA LINK FILES
      // ========================================================

      deleteFiles(
        removedExtraLinks
      );

      // ========================================================
      // NEW ATTACHMENTS
      // ========================================================

      const newAttachments =
        Array.isArray(
          req.files?.attachments
        )
          ? req.files.attachments
              .map((file, index) =>
                buildFileObject(
                  file,
                  index,
                  parsedAttachmentTitles[index]
                )
              )
              .filter(Boolean)
          : [];

      // ========================================================
      // NEW EXTRA LINK FILES
      // ========================================================

      const newExtraLinks =
        Array.isArray(
          req.files?.extraLinks
        )
          ? req.files.extraLinks
              .map((file, index) =>
                buildFileObject(
                  file,
                  index,
                  parsedExtraLinkTitles[index]
                )
              )
              .filter(Boolean)
          : [];

      // ========================================================
      // FINAL ATTACHMENTS
      // ========================================================

      const finalAttachments = [
        ...keptAttachments,
        ...newAttachments,
      ];

      // ========================================================
      // FINAL EXTRA LINKS
      // ========================================================

      const finalExtraLinks = [
        ...keptExtraLinks,
        ...newExtraLinks,
      ];

      // ========================================================
      // UPDATE DATA
      // ========================================================

      const updateData = {
        header:
          typeof header === "string" &&
          header.trim()
            ? header.trim()
            : "AICTE-VAANI WORKSHOP (2 Days)",

        topic:
          String(topic).trim(),

        dates:
          String(dates).trim(),

        time:
          typeof time === "string" &&
          time.trim()
            ? time.trim()
            : "9:00 AM – 5:00 PM",

        venue:
          typeof venue === "string" &&
          venue.trim()
            ? venue.trim()
            : "MIT, MU Campus",

        information:
          typeof information === "string"
            ? information.trim()
            : "",

        contact:
          finalContact,

        attachments:
          finalAttachments,

        extraLinks:
          finalExtraLinks,

        status:
          status === "Inactive"
            ? "Inactive"
            : "Active",
      };

      // ========================================================
      // UPDATE DATABASE
      // ========================================================

      const updatedItem =
        await AicteVaani.findByIdAndUpdate(
          id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      return res.status(200).json({
        message:
          "AICTE-VAANI event updated successfully",

        data: updatedItem,
      });
    } catch (error) {
      console.error(
        "AICTE-VAANI UPDATE ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to update AICTE-VAANI event",

        details: error.message,
      });
    }
  }
);

// ============================================================
// DELETE AICTE-VAANI
// ADMIN ONLY
//
// DELETE /mit/aicte-vaani/delete/:id
//
// Deletes:
//
// 1. MongoDB document
// 2. All attachment files
// 3. All extra-link files
// ============================================================

router.delete(
  "/delete/:id",

  JWTAuthentication,

  Authorization(["admin"]),

  async (req, res) => {
    try {
      const { id } = req.params;

      // ========================================================
      // VALIDATE ID
      // ========================================================

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          error:
            "Invalid AICTE-VAANI ID",
        });
      }

      // ========================================================
      // FIND EVENT
      // ========================================================

      const item =
        await AicteVaani.findById(id);

      if (!item) {
        return res.status(404).json({
          error:
            "AICTE-VAANI event not found",
        });
      }

      // ========================================================
      // DELETE ATTACHMENT FILES
      // ========================================================

      deleteFiles(
        item.attachments
      );

      // ========================================================
      // DELETE EXTRA LINK FILES
      // ========================================================

      deleteFiles(
        item.extraLinks
      );

      // ========================================================
      // DELETE DATABASE RECORD
      // ========================================================

      await item.deleteOne();

      return res.status(200).json({
        message:
          "AICTE-VAANI event and all uploaded files deleted successfully",
      });
    } catch (error) {
      console.error(
        "AICTE-VAANI DELETE ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Failed to delete AICTE-VAANI event",

        details: error.message,
      });
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;