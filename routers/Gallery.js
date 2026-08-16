const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Gallery = require("../model/gallery");
const Image = require("../model/image");

const {
  HeaderFieldValidator,
} = require("../middleware/FieldValidator");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

const router = express.Router();

// =====================================================
// CONSTANT
// =====================================================

const GALLERY_ROOT = path.join(
  process.cwd(),
  "uploads",
  "gallery"
);

// =====================================================
// CREATE PHYSICAL GALLERY FOLDER
// =====================================================

const createGalleryFolder = (galleryName) => {
  const folderPath = path.join(
    GALLERY_ROOT,
    galleryName
  );

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, {
      recursive: true,
    });
  }

  return folderPath;
};

// =====================================================
// GET ALL GALLERIES
// GET /mit/gallery
// =====================================================

router.get("/", async (req, res) => {
  try {
    const galleries = await Gallery.find({})
      .sort({
        createdAt: -1,
      })
      .lean();

    const result = await Promise.all(
      galleries.map(async (gallery) => {
        const images = await Image.find({
          gallery: gallery._id,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

        return {
          ...gallery,
          images,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch galleries",
    });
  }
});

// =====================================================
// CREATE GALLERY
// POST /mit/gallery/add
// =====================================================

router.post(
  "/add",

  HeaderFieldValidator("Authorization"),

  JWTAuthentication,

  Authorization(["admin"]),

  async (req, res) => {
    try {
      // =================================================
      // GET VALUES
      // =================================================

      const galleryName =
        typeof req.body.galleryName ===
        "string"
          ? req.body.galleryName.trim()
          : "";

      // =================================================
      // VALIDATE NAME
      // =================================================

      if (!galleryName) {
        return res.status(400).json({
          success: false,
          message:
            "Gallery name is required",
        });
      }

      // =================================================
      // DO NOT ALLOW CAROUSAL AS NORMAL GALLERY
      // =================================================

      if (
        galleryName.toLowerCase() ===
        "carousal"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Carousal is a reserved gallery",
        });
      }

      // =================================================
      // NORMALIZE BOOLEAN
      // =================================================

      let isNormalGallery = true;

      if (
        req.body.is_normal_gallery !==
        undefined
      ) {
        const value =
          req.body.is_normal_gallery;

        if (
          value === false ||
          value === "false"
        ) {
          isNormalGallery = false;
        } else {
          isNormalGallery = true;
        }
      }

      // =================================================
      // CHECK EXISTING GALLERY
      // =================================================

      const existingGallery =
        await Gallery.findOne({
          galleryName: {
            $regex: `^${galleryName.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            )}$`,
            $options: "i",
          },
        });

      if (existingGallery) {
        return res.status(409).json({
          success: false,
          message:
            `Gallery "${existingGallery.galleryName}" already exists`,
        });
      }

      // =================================================
      // CREATE DATABASE RECORD
      // =================================================

      let gallery;

      try {
        gallery =
          await Gallery.create({
            galleryName,
            is_normal_gallery:
              isNormalGallery,
          });
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({
            success: false,
            message:
              `Gallery "${galleryName}" already exists`,
          });
        }

        throw error;
      }

      // =================================================
      // CREATE PHYSICAL FOLDER
      // =================================================

      try {
        createGalleryFolder(
          galleryName
        );
      } catch (folderError) {

        await Gallery.findByIdAndDelete(
          gallery._id
        );

        return res.status(500).json({
          success: false,
          message:
            "Gallery folder could not be created",
        });
      }

      // =================================================
      // SUCCESS
      // =================================================

      return res.status(201).json({
        success: true,

        message:
          "Gallery created successfully",

        data: {
          _id: gallery._id,

          galleryName:
            gallery.galleryName,

          is_normal_gallery:
            gallery.is_normal_gallery,

          folder:
            `uploads/gallery/${galleryName}`,
        },
      });
    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to create gallery",
      });
    }
  }
);

// =====================================================
// DELETE GALLERY
// DELETE /mit/gallery/delete/:id
// =====================================================

router.delete(
  "/delete/:id",

  HeaderFieldValidator("Authorization"),

  JWTAuthentication,

  Authorization(["admin"]),

  async (req, res) => {
    try {
      const { id } = req.params;

      // =================================================
      // VALIDATE ID
      // =================================================

      if (
        !mongoose.Types.ObjectId.isValid(id)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid gallery ID",
        });
      }

      // =================================================
      // FIND GALLERY
      // =================================================

      const gallery =
        await Gallery.findById(id);

      if (!gallery) {
        return res.status(404).json({
          success: false,
          message:
            "Gallery not found",
        });
      }

      // =================================================
      // PROTECT CAROUSAL
      // =================================================

      if (
        gallery.galleryName.toLowerCase() ===
        "carousal"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "The Carousal gallery cannot be deleted",
        });
      }

      // =================================================
      // FIND IMAGES
      // =================================================

      const images =
        await Image.find({
          gallery: gallery._id,
        });

      // =================================================
      // DELETE FILES
      // =================================================

      for (const image of images) {
        let filePath = null;

        if (image.path) {
          filePath = image.path;
        }

        if (
          !filePath &&
          image.imageUrl
        ) {
          filePath = path.join(
            process.cwd(),
            image.imageUrl.replace(
              /^\//,
              ""
            )
          );
        }

        if (
          filePath &&
          fs.existsSync(filePath)
        ) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileError) {
          }
        }
      }

      // =================================================
      // DELETE IMAGES
      // =================================================

      await Image.deleteMany({
        gallery: gallery._id,
      });

      // =================================================
      // DELETE FOLDER
      // =================================================

      const galleryFolder =
        path.join(
          GALLERY_ROOT,
          gallery.galleryName
        );

      if (
        fs.existsSync(
          galleryFolder
        )
      ) {
        fs.rmSync(
          galleryFolder,
          {
            recursive: true,
            force: true,
          }
        );
      }

      // =================================================
      // DELETE GALLERY
      // =================================================

      await Gallery.findByIdAndDelete(
        gallery._id
      );

      return res.status(200).json({
        success: true,
        message:
          "Gallery deleted successfully",
      });
    } catch (error) {

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to delete gallery",
      });
    }
  }
);

module.exports = router;
