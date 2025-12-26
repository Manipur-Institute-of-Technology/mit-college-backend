const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Information = require("../model/information");
const jwtAuth = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const createUploader = require("../middleware/multer");

const upload = createUploader("informations");

router.get("/", async (req, res) => {
  try {
    const information = await Information.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      total: information.length,
      data: information,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch information" });
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

      const info = new Information({
        title,
        fileName: req.file.filename,
        submittedBy: req.account._id,
      });

      await info.save();

      res.status(201).json({
        message: "Information uploaded successfully",
        data: info,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload information" });
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
        return res.status(400).json({ error: "Invalid information ID" });
      }

      const info = await Information.findById(id);
      if (!info) {
        return res.status(404).json({ error: "Information not found" });
      }

      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        "informations",
        info.fileName
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await info.deleteOne();

      res.status(200).json({ message: "Information deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete information" });
    }
  }
);

module.exports = router;
