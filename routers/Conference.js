const express = require("express");
const router = express.Router();

const Conference = require("../model/conference");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");


// ===============================
// GET ALL CONFERENCES (PUBLIC)
// ===============================
router.get("/", async (req, res) => {
  try {
    const conferences = await Conference.find()
      .sort({ startDate: -1 });

    res.status(200).json({
      success: true,
      data: conferences,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch conferences",
    });
  }
});


// ===============================
// GET SINGLE CONFERENCE (PUBLIC)
// ===============================
router.get("/:id", async (req, res) => {
  try {
    const conference = await Conference.findById(req.params.id);

    if (!conference) {
      return res.status(404).json({
        success: false,
        message: "Conference not found",
      });
    }

    res.status(200).json({
      success: true,
      data: conference,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch conference",
    });
  }
});


// ===============================
// ADD CONFERENCE (ADMIN ONLY)
// ===============================
router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {

      const conference = await Conference.create(req.body);

      res.status(201).json({
        success: true,
        message: "Conference added successfully",
        data: conference,
      });

    } catch (error) {

      res.status(400).json({
        success: false,
        message: "Failed to add conference",
        error: error.message,
      });

    }
  }
);


// ===============================
// EDIT CONFERENCE (ADMIN ONLY)
// ===============================
router.put(
  "/edit/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {

    try {

      const conference = await Conference.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true,
        }
      );


      if (!conference) {
        return res.status(404).json({
          success: false,
          message: "Conference not found",
        });
      }


      res.status(200).json({
        success: true,
        message: "Conference updated successfully",
        data: conference,
      });


    } catch (error) {

      res.status(400).json({
        success: false,
        message: "Failed to update conference",
        error: error.message,
      });

    }

  }
);


// ===============================
// DELETE CONFERENCE (ADMIN ONLY)
// ===============================
router.delete(
  "/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {

    try {

      const conference = await Conference.findByIdAndDelete(
        req.params.id
      );


      if (!conference) {
        return res.status(404).json({
          success: false,
          message: "Conference not found",
        });
      }


      res.status(200).json({
        success: true,
        message: "Conference deleted successfully",
      });


    } catch (error) {

      res.status(500).json({
        success: false,
        message: "Failed to delete conference",
      });

    }

  }
);


module.exports = router;