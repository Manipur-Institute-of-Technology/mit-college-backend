const express = require("express");

const Paper = require("../model/paper");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const mongoose = require("mongoose");
const FacultyProfile = require("../model/facultyProfile");
const router = express.Router();

// =============================================
// GET PAPERS OF FACULTY
// GET /mit/paper/faculty/:facultyId
// =============================================

router.get("/faculty/:facultyId", async (req, res) => {
  try {
    const papers = await Paper.find({
      facultyId: req.params.facultyId,
    }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: papers,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// =============================================
// FACULTY ADD OWN PAPER
// POST /mit/paper/me
// =============================================

router.post(
  "/me",
  JWTAuthentication,
  Authorization(["faculty"]),
  async (req, res) => {
    try {
      // -----------------------------------------
      // Verify authenticated account
      // -----------------------------------------

      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: "Authenticated account not found",
        });
      }

      // -----------------------------------------
      // Only accept fields that this route needs
      // Never accept facultyId from req.body
      // -----------------------------------------

      const {
        title,
        paperUrl,
      } = req.body;

      // -----------------------------------------
      // Validate title
      // -----------------------------------------

      if (
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Paper title is required",
        });
      }

      // -----------------------------------------
      // Validate optional URL
      // -----------------------------------------

      let cleanPaperUrl;

      if (paperUrl !== undefined && paperUrl !== null) {
        if (typeof paperUrl !== "string") {
          return res.status(400).json({
            success: false,
            message: "Paper URL must be a string",
          });
        }

        cleanPaperUrl = paperUrl.trim();

        if (cleanPaperUrl) {
          try {
            const parsedUrl = new URL(cleanPaperUrl);

            if (
              parsedUrl.protocol !== "http:" &&
              parsedUrl.protocol !== "https:"
            ) {
              return res.status(400).json({
                success: false,
                message: "Paper URL must use HTTP or HTTPS",
              });
            }
          } catch {
            return res.status(400).json({
              success: false,
              message: "Invalid paper URL",
            });
          }
        } else {
          cleanPaperUrl = undefined;
        }
      }

      // -----------------------------------------
      // Find faculty profile belonging
      // to the authenticated account
      // -----------------------------------------

      const faculty = await FacultyProfile.findOne({
        accountId: req.user._id,
      }).select("_id");

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found",
        });
      }

      // -----------------------------------------
      // Create paper
      // -----------------------------------------

      const paper = await Paper.create({
        facultyId: faculty._id,
        title: title.trim(),
        paperUrl: cleanPaperUrl,
      });

      // -----------------------------------------
      // Response
      // -----------------------------------------

      return res.status(201).json({
        success: true,
        data: paper,
      });

    } catch (error) {
      console.error("PAPER CREATE ERROR:", error);

      // -----------------------------------------
      // Mongoose validation error
      // -----------------------------------------

      if (error instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({
          success: false,
          message: "Invalid paper data",
          errors: Object.values(error.errors).map(
            (err) => err.message
          ),
        });
      }

      // -----------------------------------------
      // Unexpected server error
      // -----------------------------------------

      return res.status(500).json({
        success: false,
        message: "Unable to create paper",
      });
    }
  }
);

// =============================================
// FACULTY EDIT OWN PAPER
// PUT /mit/paper/me/:paperId
// =============================================

router.put(
  "/me/:paperId",
  JWTAuthentication,
  Authorization(["faculty"]),
  async (req, res) => {
    try {
      // =====================================================
      // AUTHENTICATED ACCOUNT
      // =====================================================

      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: "Authenticated account not found",
        });
      }

      // =====================================================
      // VALIDATE PAPER ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.paperId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid paper ID",
        });
      }

      // =====================================================
      // FIND FACULTY PROFILE
      // =====================================================

      const faculty =
        await FacultyProfile.findOne({
          accountId: req.user._id,
        }).select("_id");

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found",
        });
      }

      // =====================================================
      // VALIDATE TITLE
      // =====================================================

      const {
        title,
        paperUrl,
      } = req.body;

      if (
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Paper title is required",
        });
      }

      // =====================================================
      // VALIDATE URL
      // =====================================================

      let cleanPaperUrl;

      if (
        paperUrl !== undefined &&
        paperUrl !== null
      ) {
        if (
          typeof paperUrl !== "string"
        ) {
          return res.status(400).json({
            success: false,
            message: "Paper URL must be a string",
          });
        }

        cleanPaperUrl =
          paperUrl.trim();

        if (cleanPaperUrl) {
          try {
            const parsedUrl =
              new URL(
                cleanPaperUrl
              );

            if (
              parsedUrl.protocol !==
                "http:" &&
              parsedUrl.protocol !==
                "https:"
            ) {
              return res.status(400).json({
                success: false,
                message:
                  "Paper URL must use HTTP or HTTPS",
              });
            }
          } catch {
            return res.status(400).json({
              success: false,
              message:
                "Invalid paper URL",
            });
          }
        } else {
          cleanPaperUrl =
            undefined;
        }
      }

      // =====================================================
      // UPDATE ONLY OWN PAPER
      // =====================================================

      const paper =
        await Paper.findOne({
          _id: req.params.paperId,
          facultyId: faculty._id,
        });

      if (!paper) {
        return res.status(404).json({
          success: false,
          message:
            "Paper not found or not owned by you",
        });
      }

      paper.title =
        title.trim();

      paper.paperUrl =
        cleanPaperUrl;

      await paper.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,
        data: paper,
      });

    } catch (error) {
      console.error(
        "FACULTY PAPER UPDATE ERROR:",
        error
      );

      if (
        error instanceof
        mongoose.Error.ValidationError
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid paper data",
          errors:
            Object.values(
              error.errors
            ).map(
              (err) =>
                err.message
            ),
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to update paper",
      });
    }
  }
);

// =============================================
// FACULTY DELETE OWN PAPER
// DELETE /mit/paper/me/:paperId
// =============================================

router.delete(
  "/me/:paperId",
  JWTAuthentication,
  Authorization(["faculty"]),
  async (req, res) => {
    try {
      // -----------------------------------------
      // Validate authenticated account
      // -----------------------------------------

      if (!req.user?._id) {
        return res.status(401).json({
          success: false,
          message: "Authenticated account not found",
        });
      }

      // -----------------------------------------
      // Validate paper ID
      // -----------------------------------------

      if (!mongoose.Types.ObjectId.isValid(req.params.paperId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid paper ID",
        });
      }

      // -----------------------------------------
      // Find faculty profile belonging
      // to authenticated account
      // -----------------------------------------

      const faculty = await FacultyProfile.findOne({
        accountId: req.user._id,
      }).select("_id");

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found",
        });
      }

      // -----------------------------------------
      // Delete ONLY if paper belongs
      // to this faculty
      // -----------------------------------------

      const paper = await Paper.findOneAndDelete({
        _id: req.params.paperId,
        facultyId: faculty._id,
      });

      if (!paper) {
        return res.status(404).json({
          success: false,
          message: "Paper not found or not owned by you",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Paper deleted successfully",
      });

    } catch (error) {
      console.error(
        "PAPER DELETE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Unable to delete paper",
      });
    }
  }
);

// =============================================
// ADMIN ADD PAPER TO FACULTY
// POST /mit/paper/:facultyId
// =============================================

router.post(
  "/:facultyId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      // =====================================================
      // VALIDATE FACULTY ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.facultyId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID",
        });
      }

      // =====================================================
      // CHECK FACULTY EXISTS
      // =====================================================

      const faculty =
        await FacultyProfile.findById(
          req.params.facultyId
        ).select("_id");

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty profile not found",
        });
      }

      // =====================================================
      // VALIDATE TITLE
      // =====================================================

      if (
        typeof req.body.title !==
          "string" ||
        !req.body.title.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Paper title is required",
        });
      }

      // =====================================================
      // CREATE PAPER
      // =====================================================

      const paper =
        await Paper.create({
          facultyId:
            faculty._id,

          title:
            req.body.title.trim(),

          paperUrl:
            req.body.paperUrl
              ? req.body.paperUrl.trim()
              : undefined,
        });

      console.log(
        "PAPER CREATED:",
        paper
      );

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(201).json({
        success: true,
        data: paper,
      });

    } catch (error) {
      console.error(
        "ADMIN PAPER CREATE ERROR:",
        error
      );

      if (
        error instanceof
        mongoose.Error.ValidationError
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid paper data",
          errors:
            Object.values(
              error.errors
            ).map(
              (err) =>
                err.message
            ),
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to create paper",
      });
    }
  }
);

// =============================================
// ADMIN EDIT FACULTY PAPER
// PUT /mit/paper/:facultyId/:paperId
// =============================================

router.put(
  "/:facultyId/:paperId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const paper = await Paper.findOne({
        _id: req.params.paperId,
        facultyId: req.params.facultyId,
      });

      if (!paper) {
        return res.status(404).json({
          message: "Paper not found",
        });
      }

      Object.assign(paper, req.body);
      await paper.save();

      res.json({
        success: true,
        data: paper,
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  },
);

// =============================================
// ADMIN DELETE FACULTY PAPER
// DELETE /mit/paper/:facultyId/:paperId
// =============================================

router.delete(
  "/:facultyId/:paperId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const paper = await Paper.findOneAndDelete({
        _id: req.params.paperId,
        facultyId: req.params.facultyId,
      });

      if (!paper) {
        return res.status(404).json({
          message: "Paper not found",
        });
      }

      res.json({
        success: true,
        message: "Deleted",
      });
    } catch (error) {
      res.status(500).json({
        message: error.message,
      });
    }
  },
);

module.exports = router;