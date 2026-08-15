const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const createUploader = require("../middleware/multer");

const Gallery = require("../model/gallery");
const Image = require("../model/image");

const {
  HeaderFieldValidator,
} = require("../middleware/FieldValidator");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

const router = express.Router();

// =====================================================
// CONFIG
// =====================================================

const CAROUSEL_NAME = "Carousal";

// =====================================================
// CAROUSEL DIRECTORY
// =====================================================

const getCarouselDirectory = () => {
  return path.join(
    process.cwd(),
    "uploads",
    "gallery",
    CAROUSEL_NAME
  );
};

// =====================================================
// ENSURE CAROUSEL GALLERY
// =====================================================

const ensureCarouselGallery = async () => {
  const directory =
    getCarouselDirectory();

  // Create physical folder
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true,
    });

    console.log(
      "Created carousel folder:",
      directory
    );
  }

  // Find gallery
  let gallery =
    await Gallery.findOne({
      galleryName: CAROUSEL_NAME,
    });

  // Create gallery if missing
  if (!gallery) {
    gallery = await Gallery.create({
      galleryName: CAROUSEL_NAME,
      is_normal_gallery: false,
    });

    console.log(
      "Created carousel gallery:",
      gallery._id
    );
  }

  return gallery;
};

// =====================================================
// GET CAROUSEL
// GET /mit/carousel
// =====================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const gallery =
        await ensureCarouselGallery();

      const images =
        await Image.find({
          gallery: gallery._id,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.status(200).json({
        success: true,
        message:
          "Carousel images loaded successfully",

        gallery: {
          _id: gallery._id,
          galleryName:
            gallery.galleryName,
          is_normal_gallery:
            gallery.is_normal_gallery,
        },

        data: images,
      });
    } catch (error) {
      console.error(
        "GET CAROUSEL ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load carousel images",
        error: error.message,
      });
    }
  }
);

// =====================================================
// UPLOAD CAROUSEL IMAGE
//
// POST /mit/carousel/upload
//
// FormData:
// image
// caption
// =====================================================

router.post(
  "/upload",

  HeaderFieldValidator(
    "Authorization"
  ),

  JWTAuthentication,

  Authorization(["admin"]),

  async (req, res) => {
    console.log(
      "\n===================================="
    );

    console.log(
      "CAROUSEL UPLOAD REQUEST"
    );

    console.log(
      "Authorization:",
      req.headers.authorization
        ? "PRESENT"
        : "MISSING"
    );

    console.log(
      "Content-Type:",
      req.headers["content-type"]
    );

    console.log(
      "====================================\n"
    );

    try {
      // =================================================
      // ENSURE GALLERY
      // =================================================

      const gallery =
        await ensureCarouselGallery();

      // =================================================
      // MULTER
      // =================================================

      const upload =
        createUploader(
          `gallery/${CAROUSEL_NAME}`
        );

      upload.single("image")(
        req,
        res,
        async (err) => {
          // =============================================
          // MULTER ERROR
          // =============================================

          if (err) {
            console.error(
              "===================================="
            );

            console.error(
              "MULTER ERROR:",
              err
            );

            console.error(
              "===================================="
            );

            return res.status(400).json({
              success: false,
              code: "MULTER_ERROR",
              message:
                err.message ||
                "Image upload failed",
            });
          }

          // =============================================
          // FILE MISSING
          // =============================================

          if (!req.file) {
            console.error(
              "CAROUSEL FILE MISSING"
            );

            console.log(
              "BODY:",
              req.body
            );

            return res.status(400).json({
              success: false,
              code: "IMAGE_REQUIRED",
              message:
                "Image file is required. Make sure FormData field name is 'image'.",
            });
          }

          console.log(
            "Uploaded file:",
            {
              fieldname:
                req.file.fieldname,

              originalname:
                req.file.originalname,

              filename:
                req.file.filename,

              path:
                req.file.path,

              mimetype:
                req.file.mimetype,

              size:
                req.file.size,
            }
          );

          try {
            // =========================================
            // CAPTION
            // =========================================

            const caption =
              typeof req.body.caption ===
              "string"
                ? req.body.caption.trim()
                : "";

            // =========================================
            // IMAGE URL
            // =========================================

            const imageUrl =
              `/uploads/gallery/${CAROUSEL_NAME}/${encodeURIComponent(
                req.file.filename
              )}`;

            // =========================================
            // SAVE IMAGE
            // =========================================

            const image =
              await Image.create({
                filename:
                  req.file.filename,

                path:
                  req.file.path,

                imageUrl,

                caption,

                size:
                  req.file.size,

                mimetype:
                  req.file.mimetype,

                gallery:
                  gallery._id,
              });

            console.log(
              "CAROUSEL IMAGE SAVED:",
              image._id
            );

            return res.status(201).json({
              success: true,

              message:
                "Carousel image uploaded successfully",

              data: image,
            });
          } catch (error) {
            console.error(
              "SAVE CAROUSEL IMAGE ERROR:",
              error
            );

            // Delete uploaded file
            if (
              req.file?.path &&
              fs.existsSync(
                req.file.path
              )
            ) {
              fs.unlinkSync(
                req.file.path
              );
            }

            return res.status(500).json({
              success: false,

              code: "DATABASE_ERROR",

              message:
                "Failed to save carousel image",

              error:
                error.message,
            });
          }
        }
      );
    } catch (error) {
      console.error(
        "CAROUSEL UPLOAD ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to upload carousel image",

        error:
          error.message,
      });
    }
  }
);

// =====================================================
// EDIT CAROUSEL
//
// PUT /mit/carousel/edit/:id
// =====================================================

router.put(
  "/edit/:id",

  HeaderFieldValidator(
    "Authorization"
  ),

  JWTAuthentication,

  Authorization(["admin"]),

  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid image ID",
        });
      }

      const gallery =
        await ensureCarouselGallery();

      const image =
        await Image.findById(id);

      if (!image) {
        return res.status(404).json({
          success: false,
          message:
            "Carousel image not found",
        });
      }

      if (
        !image.gallery ||
        image.gallery.toString() !==
          gallery._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This image does not belong to Carousel",
        });
      }

      if (
        req.body.caption !==
        undefined
      ) {
        image.caption =
          String(
            req.body.caption
          ).trim();
      }

      await image.save();

      return res.status(200).json({
        success: true,
        message:
          "Carousel image updated successfully",
        data: image,
      });
    } catch (error) {
      console.error(
        "EDIT CAROUSEL ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update carousel image",
        error:
          error.message,
      });
    }
  }
);

// =====================================================
// DELETE CAROUSEL
//
// DELETE /mit/carousel/delete/:id
// =====================================================

router.delete(
  "/delete/:id",

  HeaderFieldValidator(
    "Authorization"
  ),

  JWTAuthentication,

  Authorization(["admin"]),

  async (req, res) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid image ID",
        });
      }

      const gallery =
        await ensureCarouselGallery();

      const image =
        await Image.findById(id);

      if (!image) {
        return res.status(404).json({
          success: false,
          message:
            "Carousel image not found",
        });
      }

      if (
        !image.gallery ||
        image.gallery.toString() !==
          gallery._id.toString()
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This image does not belong to Carousel",
        });
      }

      let deleted = false;

      if (
        image.path &&
        fs.existsSync(
          image.path
        )
      ) {
        fs.unlinkSync(
          image.path
        );

        deleted = true;
      }

      if (
        !deleted &&
        image.imageUrl
      ) {
        const absolutePath =
          path.join(
            process.cwd(),
            image.imageUrl.replace(
              /^\//,
              ""
            )
          );

        if (
          fs.existsSync(
            absolutePath
          )
        ) {
          fs.unlinkSync(
            absolutePath
          );
        }
      }

      await image.deleteOne();

      return res.status(200).json({
        success: true,
        message:
          "Carousel image deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE CAROUSEL ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete carousel image",
        error:
          error.message,
      });
    }
  }
);

module.exports =
  router;