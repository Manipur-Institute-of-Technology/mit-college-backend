const express = require("express");
const router = express.Router();

const FacilityAdmin = require("../model/sideAdmin");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

router.post(
  "/:facility/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const facility = req.params.facility.toLowerCase();
      const { name, position, info } = req.body;

      if (!name || !info) {
        return res.status(400).json({
          message: "name and info are required",
        });
      }

      const existing = await FacilityAdmin.findOne({ key: facility });
      if (existing) {
        return res.status(409).json({
          message: `Admin already exists for ${facility}`,
        });
      }

      const admin = new FacilityAdmin({
        key: facility,
        name,
        position,
        info,
      });

      await admin.save();

      res.status(201).json({
        message: "Facility admin added successfully",
        data: admin,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get("/", async (req, res) => {
  try {
    const admins = await FacilityAdmin.find({ isActive: true }).sort({
      createdAt: -1,
    });

    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:facility", async (req, res) => {
  try {
    const facility = req.params.facility.toLowerCase();

    // Allow "hostel" as a filter for both boys & girls hostel
    if (facility === "hostel") {
      const admins = await FacilityAdmin.find({
        key: { $in: ["boys_hostel", "girls_hostel"] },
        isActive: true,
      });

      return res.json(admins);
    }

    const admin = await FacilityAdmin.findOne({
      key: facility,
      isActive: true,
    });

    if (!admin) {
      return res.status(404).json({
        message: "Facility admin not found",
      });
    }

    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post(
  "/:facility/edit",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const facility = req.params.facility.toLowerCase();

      const updatedAdmin = await FacilityAdmin.findOneAndUpdate(
        { key: facility },
        req.body,
        { new: true, runValidators: true }
      );

      if (!updatedAdmin) {
        return res.status(404).json({
          message: "Facility admin not found",
        });
      }

      res.json({
        message: "Facility admin updated successfully",
        data: updatedAdmin,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.delete(
  "/:facility/delete",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const facility = req.params.facility.toLowerCase();

      const deletedAdmin = await FacilityAdmin.findOneAndDelete({
        key: facility,
      });

      if (!deletedAdmin) {
        return res.status(404).json({
          message: "Facility admin not found",
        });
      }

      res.json({
        message: "Facility admin deleted successfully",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

module.exports = router;
