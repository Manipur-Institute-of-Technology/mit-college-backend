const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const Authority = require("../model/authority");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const createUploader = require("../middleware/multer");

const upload = createUploader("authority");

router.get("/", async (req, res) => {
  try {
    const authorities = await Authority.find().sort({ createdAt: -1 });

    res.status(200).json({
      total: authorities.length,
      data: authorities,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch authority data" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({ error: "Authority not found" });
    }

    res.status(200).json({ data: authority });
  } catch (error) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

router.get("/role/:key", async (req, res) => {
  try {
    const key = req.params.key;

    // Build regex based on requested role
    let regex;

    if (/^vc$/i.test(key)) {
      regex = /vice[-\s]?chancellor|vc/i;
    } else if (/principal/i.test(key)) {
      regex = /principal/i;
    } else {
      return res.status(400).json({
        error: "Invalid role. Use VC or Principal",
      });
    }

    const authority = await Authority.findOne({ position: regex });

    if (!authority) {
      return res.status(404).json({
        error: "Authority not found",
      });
    }

    res.status(200).json({
      data: authority,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch authority by role",
    });
  }
});

router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Photo is required" });
      }

      const { position, name, info, bios } = req.body;

      if (!position || !name || !info || !bios) {
        return res.status(400).json({ error: "All fields are required" });
      }

      const authority = new Authority({
        position,
        name,
        info,
        bios,
        photo: req.file.filename,
      });

      await authority.save();

      res.status(201).json({
        message: "Authority added successfully",
        data: authority,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  "/edit/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("photo"),
  async (req, res) => {
    try {
      const authority = await Authority.findById(req.params.id);
      if (!authority) {
        return res.status(404).json({ error: "Authority not found" });
      }

      if (req.file && authority.photo) {
        const oldPhotoPath = path.join(
          __dirname,
          "../uploads/authority",
          authority.photo
        );

        if (fs.existsSync(oldPhotoPath)) {
          fs.unlinkSync(oldPhotoPath);
        }

        authority.photo = req.file.filename;
      }

      authority.position = req.body.position || authority.position;
      authority.name = req.body.name || authority.name;
      authority.info = req.body.info || authority.info;
      authority.bios = req.body.bios || authority.bios;

      await authority.save();

      res.status(200).json({
        message: "Authority updated successfully",
        data: authority,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  "/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const authority = await Authority.findById(req.params.id);

      if (!authority) {
        return res.status(404).json({ error: "Authority not found" });
      }

      if (authority.photo) {
        const photoPath = path.join(
          __dirname,
          "../uploads/authority",
          authority.photo
        );

        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      }

      await authority.deleteOne();

      res.status(200).json({
        message: "Authority deleted successfully",
      });
    } catch (error) {
      res.status(400).json({ error: "Invalid ID" });
    }
  }
);

module.exports = router;
