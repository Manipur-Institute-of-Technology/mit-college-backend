const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const Notif = require("../model/Notif");
const jwtAuth = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const createUploader = require("../middleware/multer");

const upload = createUploader("notifications");

/*
|--------------------------------------------------------------------------
| GET ACTIVE NOTIFICATIONS
|--------------------------------------------------------------------------
| Only notifications whose active_date is in the future.
*/
router.get("/", async (req, res) => {
  try {
    const now = new Date();

    const notifications = await Notif.find({
      active_date: {
        $gte: now,
      },
    }).sort({
      active_date: 1,
      createdAt: -1,
    });

    res.status(200).json({
      total: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch active notifications:", error);

    res.status(500).json({
      error: "Failed to fetch active notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET INACTIVE / EXPIRED NOTIFICATIONS
|--------------------------------------------------------------------------
| Notifications whose active_date has already passed.
*/
router.get("/inactive", async (req, res) => {
  try {
    const now = new Date();

    const notifications = await Notif.find({
      active_date: {
        $lt: now,
      },
    }).sort({
      active_date: -1,
      createdAt: -1,
    });

    res.status(200).json({
      total: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch inactive notifications:", error);

    res.status(500).json({
      error: "Failed to fetch inactive notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET ALL NOTIFICATIONS
|--------------------------------------------------------------------------
*/
router.get("/all", async (req, res) => {
  try {
    const notifications = await Notif.find()
      .sort({
        active_date: -1,
        createdAt: -1,
      });

    res.status(200).json({
      total: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch all notifications:", error);

    res.status(500).json({
      error: "Failed to fetch notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| ADD NOTIFICATION
|--------------------------------------------------------------------------
*/
router.post(
  "/add",
  jwtAuth,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          error: "File is required",
        });
      }

      const {
        title,
        type,
        active_date,
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          error: "Title is required",
        });
      }

      if (!active_date) {
        return res.status(400).json({
          error: "Active date is required",
        });
      }

      const parsedDate = new Date(active_date);

      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          error: "Invalid active date",
        });
      }

      const notification = new Notif({
        fileName: req.file.filename,
        title: title.trim(),
        type: type || "miscellaneous",
        active_date: parsedDate,
        submittedBy: req.account._id,
      });

      await notification.save();

      res.status(201).json({
        message: "Notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Create notification:", error);

      res.status(500).json({
        error: "Failed to create notification",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE NOTIFICATION
|--------------------------------------------------------------------------
*/
router.delete(
  "/delete/:id",
  jwtAuth,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: "Invalid notification ID",
        });
      }

      const notification = await Notif.findById(id);

      if (!notification) {
        return res.status(404).json({
          error: "Notification not found",
        });
      }

      const filePath = path.join(
        __dirname,
        "..",
        "uploads",
        "notifications",
        notification.fileName
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      await notification.deleteOne();

      res.status(200).json({
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Delete notification:", error);

      res.status(500).json({
        error: "Failed to delete notification",
      });
    }
  }
);

module.exports = router;