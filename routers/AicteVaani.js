const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const AicteVaani = require("../model/aicteVaani");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

// ============================================================
// GET ALL AICTE-VAANI
// PUBLIC
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
    console.error("GET AICTE-VAANI ERROR:", error);

    return res.status(500).json({
      error: "Failed to fetch AICTE-VAANI records",
      details: error.message,
    });
  }
});

// ============================================================
// GET SINGLE AICTE-VAANI
// PUBLIC
// ============================================================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: "Invalid AICTE-VAANI ID",
      });
    }

    const item = await AicteVaani.findById(id).lean();

    if (!item) {
      return res.status(404).json({
        error: "AICTE-VAANI record not found",
      });
    }

    return res.status(200).json({
      data: item,
    });
  } catch (error) {
    console.error("GET SINGLE AICTE-VAANI ERROR:", error);

    return res.status(500).json({
      error: "Failed to fetch AICTE-VAANI record",
      details: error.message,
    });
  }
});

// ============================================================
// ADD AICTE-VAANI
// ADMIN ONLY
// POST /mit/aicte-vaani/add
// ============================================================
router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
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
        attachments,
        extraLinks,
        status,
      } = req.body;

      // Required fields
      if (!topic || !topic.trim()) {
        return res.status(400).json({
          error: "Workshop topic is required",
        });
      }

      if (!dates || !dates.trim()) {
        return res.status(400).json({
          error: "Event dates are required",
        });
      }

      // Clean contact object
      const cleanContact = {
        coordinator: contact?.coordinator?.trim() || "",
        coCoordinator: contact?.coCoordinator?.trim() || "",
        department: contact?.department?.trim() || "",
        website: contact?.website?.trim() || "",
        email: contact?.email?.trim() || "",
        phone: contact?.phone?.trim() || "",
      };

      // Clean attachments
      const cleanAttachments = Array.isArray(attachments)
        ? attachments
            .filter(
              (item) =>
                item &&
                (String(item.title || "").trim() ||
                  String(item.url || "").trim())
            )
            .map((item, index) => ({
              id: Number(item.id) || Date.now() + index,
              title: String(item.title || "").trim(),
              url: String(item.url || "").trim(),
            }))
        : [];

      // Clean extra links
      const cleanExtraLinks = Array.isArray(extraLinks)
        ? extraLinks
            .filter(
              (item) =>
                item &&
                (String(item.title || "").trim() ||
                  String(item.url || "").trim())
            )
            .map((item, index) => ({
              id: Number(item.id) || Date.now() + index,
              title: String(item.title || "").trim(),
              url: String(item.url || "").trim(),
            }))
        : [];

      const newItem = new AicteVaani({
        header:
          typeof header === "string" && header.trim()
            ? header.trim()
            : "AICTE-VAANI WORKSHOP (2 Days)",

        topic: topic.trim(),

        dates: dates.trim(),

        time:
          typeof time === "string" && time.trim()
            ? time.trim()
            : "9:00 AM – 5:00 PM",

        venue:
          typeof venue === "string" && venue.trim()
            ? venue.trim()
            : "MIT, MU Campus",

        information:
          typeof information === "string" ? information.trim() : "",

        contact: cleanContact,

        attachments: cleanAttachments,

        extraLinks: cleanExtraLinks,

        status: status === "Inactive" ? "Inactive" : "Active",
      });

      const savedItem = await newItem.save();

      return res.status(201).json({
        message: "AICTE-VAANI event created successfully",
        data: savedItem,
      });
    } catch (error) {
      console.error("ADD AICTE-VAANI ERROR:", error);

      return res.status(500).json({
        error: "Failed to create AICTE-VAANI event",
        details: error.message,
      });
    }
  }
);

// ============================================================
// UPDATE AICTE-VAANI
// ADMIN ONLY
// PUT /mit/aicte-vaani/edit/:id
// ============================================================
router.put(
  "/edit/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: "Invalid AICTE-VAANI ID",
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
        attachments,
        extraLinks,
        status,
      } = req.body;

      if (!topic || !topic.trim()) {
        return res.status(400).json({
          error: "Workshop topic is required",
        });
      }

      if (!dates || !dates.trim()) {
        return res.status(400).json({
          error: "Event dates are required",
        });
      }

      const cleanContact = {
        coordinator: contact?.coordinator?.trim() || "",
        coCoordinator: contact?.coCoordinator?.trim() || "",
        department: contact?.department?.trim() || "",
        website: contact?.website?.trim() || "",
        email: contact?.email?.trim() || "",
        phone: contact?.phone?.trim() || "",
      };

      const cleanAttachments = Array.isArray(attachments)
        ? attachments
            .filter(
              (item) =>
                item &&
                (String(item.title || "").trim() ||
                  String(item.url || "").trim())
            )
            .map((item, index) => ({
              id: Number(item.id) || Date.now() + index,
              title: String(item.title || "").trim(),
              url: String(item.url || "").trim(),
            }))
        : [];

      const cleanExtraLinks = Array.isArray(extraLinks)
        ? extraLinks
            .filter(
              (item) =>
                item &&
                (String(item.title || "").trim() ||
                  String(item.url || "").trim())
            )
            .map((item, index) => ({
              id: Number(item.id) || Date.now() + index,
              title: String(item.title || "").trim(),
              url: String(item.url || "").trim(),
            }))
        : [];

      const updateData = {
        header:
          typeof header === "string" && header.trim()
            ? header.trim()
            : "AICTE-VAANI WORKSHOP (2 Days)",

        topic: topic.trim(),

        dates: dates.trim(),

        time:
          typeof time === "string" && time.trim()
            ? time.trim()
            : "9:00 AM – 5:00 PM",

        venue:
          typeof venue === "string" && venue.trim()
            ? venue.trim()
            : "MIT, MU Campus",

        information:
          typeof information === "string" ? information.trim() : "",

        contact: cleanContact,

        attachments: cleanAttachments,

        extraLinks: cleanExtraLinks,

        status: status === "Inactive" ? "Inactive" : "Active",
      };

      const updatedItem = await AicteVaani.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updatedItem) {
        return res.status(404).json({
          error: "AICTE-VAANI event not found",
        });
      }

      return res.status(200).json({
        message: "AICTE-VAANI event updated successfully",
        data: updatedItem,
      });
    } catch (error) {
      console.error("UPDATE AICTE-VAANI ERROR:", error);

      return res.status(500).json({
        error: "Failed to update AICTE-VAANI event",
        details: error.message,
      });
    }
  }
);

// ============================================================
// DELETE AICTE-VAANI
// ADMIN ONLY
// DELETE /mit/aicte-vaani/delete/:id
// ============================================================
router.delete(
  "/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: "Invalid AICTE-VAANI ID",
        });
      }

      const item = await AicteVaani.findById(id);

      if (!item) {
        return res.status(404).json({
          error: "AICTE-VAANI event not found",
        });
      }

      await item.deleteOne();

      return res.status(200).json({
        message: "AICTE-VAANI event deleted successfully",
      });
    } catch (error) {
      console.error("DELETE AICTE-VAANI ERROR:", error);

      return res.status(500).json({
        error: "Failed to delete AICTE-VAANI event",
        details: error.message,
      });
    }
  }
);

module.exports = router;