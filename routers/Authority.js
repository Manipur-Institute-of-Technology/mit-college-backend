const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const Authority = require("../model/authority");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const createUploader = require("../middleware/multer");

const upload = createUploader("authority");

/**
 * =========================================================
 * GET ALL AUTHORITIES
 * Public
 * =========================================================
 */
router.get("/", async (req, res) => {
  try {
    const authorities = await Authority.find().sort({ createdAt: -1 });

    res.status(200).json({
      total: authorities.length,
      data: authorities,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch authority data",
    });
  }
});

/**
 * =========================================================
 * GET AUTHORITY BY ROLE
 *
 * /authority/role/vc
 * /authority/role/principal
 *
 * Public
 * =========================================================
 */
router.get("/role/:key", async (req, res) => {
  try {
    const key = req.params.key.toLowerCase();

    let positionRegex;

    if (key === "vc" || key === "vice-chancellor" || key === "vice chancellor") {
      positionRegex = /^vice[-\s]?chancellor$/i;
    } else if (key === "principal") {
      positionRegex = /^principal$/i;
    } else {
      return res.status(400).json({
        error: "Invalid role. Use vc or principal",
      });
    }

    const authority = await Authority.findOne({
      position: positionRegex,
    });

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

/**
 * =========================================================
 * GET AUTHORITY BY ID
 * Public
 * =========================================================
 */
router.get("/:id", async (req, res) => {
  try {
    const authority = await Authority.findById(req.params.id);

    if (!authority) {
      return res.status(404).json({
        error: "Authority not found",
      });
    }

    res.status(200).json({
      data: authority,
    });
  } catch (error) {
    res.status(400).json({
      error: "Invalid ID",
    });
  }
});

/**
 * =========================================================
 * ADD AUTHORITY
 *
 * Only admin
 *
 * Maximum:
 * 1 Vice-Chancellor
 * 1 Principal
 * =========================================================
 */
router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("photo"),
  async (req, res) => {
    try {
      const { position, name, info, bios } = req.body;

      if (!position || !name || !info || !bios) {
        if (req.file) {
          const filePath = path.join(
            __dirname,
            "../uploads/authority",
            req.file.filename
          );

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        return res.status(400).json({
          error: "All fields are required",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "Photo is required",
        });
      }

      /**
       * Normalize position
       */
      let normalizedPosition;

      if (
        /^vice[-\s]?chancellor$/i.test(position) ||
        /^vc$/i.test(position)
      ) {
        normalizedPosition = "Vice-Chancellor";
      } else if (/^principal$/i.test(position)) {
        normalizedPosition = "Principal";
      } else {
        return res.status(400).json({
          error: "Position must be Vice-Chancellor or Principal",
        });
      }

      /**
       * Check if this role already exists
       */
      const existingAuthority = await Authority.findOne({
        position: normalizedPosition,
      });

      if (existingAuthority) {
        // Delete uploaded image because record will not be created
        const filePath = path.join(
          __dirname,
          "../uploads/authority",
          req.file.filename
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        return res.status(409).json({
          error: `${normalizedPosition} already exists. Please edit the existing record instead.`,
        });
      }

      /**
       * Create authority
       */
      const authority = new Authority({
        position: normalizedPosition,
        name: name.trim(),
        info: info.trim(),
        bios: bios.trim(),
        photo: req.file.filename,
      });

      await authority.save();

      res.status(201).json({
        success: true,
        message: "Authority added successfully",
        data: authority,
      });
    } catch (error) {
      /**
       * If something fails after upload,
       * remove uploaded file
       */
      if (req.file) {
        const filePath = path.join(
          __dirname,
          "../uploads/authority",
          req.file.filename
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(400).json({
        error: error.message,
      });
    }
  }
);

/**
 * =========================================================
 * EDIT AUTHORITY
 *
 * Only admin
 *
 * PUT /authority/edit/:id
 * =========================================================
 */
router.put(
  "/edit/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  upload.single("photo"),
  async (req, res) => {
    try {
      const authority = await Authority.findById(req.params.id);

      if (!authority) {
        if (req.file) {
          const filePath = path.join(
            __dirname,
            "../uploads/authority",
            req.file.filename
          );

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        return res.status(404).json({
          error: "Authority not found",
        });
      }

      /**
       * Validate position if it is being changed
       */
      let newPosition = authority.position;

      if (req.body.position) {
        if (
          /^vice[-\s]?chancellor$/i.test(req.body.position) ||
          /^vc$/i.test(req.body.position)
        ) {
          newPosition = "Vice-Chancellor";
        } else if (/^principal$/i.test(req.body.position)) {
          newPosition = "Principal";
        } else {
          if (req.file) {
            const filePath = path.join(
              __dirname,
              "../uploads/authority",
              req.file.filename
            );

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }

          return res.status(400).json({
            error: "Position must be Vice-Chancellor or Principal",
          });
        }
      }

      /**
       * If changing role, make sure another record
       * with that role does not already exist.
       */
      if (newPosition !== authority.position) {
        const existingAuthority = await Authority.findOne({
          position: newPosition,
          _id: { $ne: authority._id },
        });

        if (existingAuthority) {
          if (req.file) {
            const filePath = path.join(
              __dirname,
              "../uploads/authority",
              req.file.filename
            );

            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }

          return res.status(409).json({
            error: `${newPosition} already exists. You cannot have more than one.`,
          });
        }
      }

      /**
       * Replace old photo if new photo uploaded
       */
      if (req.file) {
        if (authority.photo) {
          const oldPhotoPath = path.join(
            __dirname,
            "../uploads/authority",
            authority.photo
          );

          if (fs.existsSync(oldPhotoPath)) {
            fs.unlinkSync(oldPhotoPath);
          }
        }

        authority.photo = req.file.filename;
      }

      /**
       * Update fields
       */
      authority.position = newPosition;

      if (req.body.name) {
        authority.name = req.body.name.trim();
      }

      if (req.body.info) {
        authority.info = req.body.info.trim();
      }

      if (req.body.bios) {
        authority.bios = req.body.bios.trim();
      }

      await authority.save();

      res.status(200).json({
        success: true,
        message: "Authority updated successfully",
        data: authority,
      });
    } catch (error) {
      /**
       * Remove newly uploaded file if update failed
       */
      if (req.file) {
        const filePath = path.join(
          __dirname,
          "../uploads/authority",
          req.file.filename
        );

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      res.status(400).json({
        error: error.message,
      });
    }
  }
);

/**
 * =========================================================
 * DELETE AUTHORITY
 *
 * Only admin
 *
 * DELETE /authority/delete/:id
 * =========================================================
 */
router.delete(
  "/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const authority = await Authority.findById(req.params.id);

      if (!authority) {
        return res.status(404).json({
          error: "Authority not found",
        });
      }

      /**
       * Delete photo
       */
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

      /**
       * Delete database record
       */
      await authority.deleteOne();

      res.status(200).json({
        success: true,
        message: "Authority deleted successfully",
      });
    } catch (error) {
      res.status(400).json({
        error: "Invalid ID",
      });
    }
  }
);

module.exports = router;