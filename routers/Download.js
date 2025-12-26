const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Download = require("../model/download");
const jwtAuth = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const createUploader = require("../middleware/multer");

const upload = createUploader("downloads");

router.get("/", async (req, res) => {
  try {
    const downloads = await Download.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      total: downloads.length,
      data: downloads,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch downloads",
    });
  }
});

router.post(
  "/add",
  jwtAuth,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "File is required" });
      }

      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const download = new Download({
        title,
        fileName: req.file.filename,
        submittedBy: req.account._id,
      });

      await download.save();

      res.status(201).json({
        message: "Download uploaded successfully",
        data: download,
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to upload download",
      });
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

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid download ID" });
      }

      const download = await Download.findById(id);
      if (!download) {
        return res.status(404).json({ error: "Download not found" });
      }

      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        "downloads",
        download.fileName
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await download.deleteOne();

      res.status(200).json({
        message: "Download deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        error: "Failed to delete download",
      });
    }
  }
);

module.exports = router;
