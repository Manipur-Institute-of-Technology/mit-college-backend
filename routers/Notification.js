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

// Upload directory for notification PDFs
const uploadDirectory = path.join(
  __dirname,
  "..",
  "uploads",
  "notifications"
);

// Remove an uploaded file if it is no longer needed
const removeUploadedFile = (filename) => {
  if (!filename) return;

  const filePath = path.join(uploadDirectory, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Validate optional external HTTP/HTTPS links
const isValidLink = (link) => {
  if (!link || !link.trim()) {
    return true;
  }

  try {
    const parsedUrl = new URL(link.trim());

    return ["http:", "https:"].includes(
      parsedUrl.protocol
    );
  } catch {
    return false;
  }
};

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
    console.error("Fetch active notifications error:", error);

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
    console.error("Fetch inactive notifications error:", error);

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
    const notifications = await Notif.find().sort({
      active_date: -1,
      createdAt: -1,
    });

    res.status(200).json({
      total: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Fetch all notifications error:", error);

    res.status(500).json({
      error: "Failed to fetch notifications",
    });
  }
});

/*
|--------------------------------------------------------------------------
| ADD NOTIFICATION
|--------------------------------------------------------------------------
| Required:
| - PDF file
| - title
| - active_date
|
| Optional:
| - type
| - link (advertisement / external information URL)
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
        link,
      } = req.body;

      if (!title || !title.trim()) {
        removeUploadedFile(req.file.filename);

        return res.status(400).json({
          error: "Title is required",
        });
      }

      if (title.trim().length > 100) {
        removeUploadedFile(req.file.filename);

        return res.status(400).json({
          error: "Title cannot exceed 100 characters",
        });
      }

      if (!active_date) {
        removeUploadedFile(req.file.filename);

        return res.status(400).json({
          error: "Active date is required",
        });
      }

      const parsedDate = new Date(active_date);

      if (Number.isNaN(parsedDate.getTime())) {
        removeUploadedFile(req.file.filename);

        return res.status(400).json({
          error: "Invalid active date",
        });
      }

      if (!isValidLink(link)) {
        removeUploadedFile(req.file.filename);

        return res.status(400).json({
          error: "Please provide a valid HTTP or HTTPS link",
        });
      }

      const notification = new Notif({
        fileName: req.file.filename,
        title: title.trim(),
        type: type || "miscellaneous",
        active_date: parsedDate,
        submittedBy: req.account._id,
        link: link ? link.trim() : "",
      });

      await notification.save();

      res.status(201).json({
        message: "Notification created successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Create notification error:", error);

      if (req.file) {
        removeUploadedFile(req.file.filename);
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          error: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to create notification",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPDATE NOTIFICATION
|--------------------------------------------------------------------------
| Can update:
| - title only
| - file only
| - type only
| - active date only
| - link only
| - any combination
|
| Send link: "" to remove an existing link.
| Omit link to keep the existing link unchanged.
|--------------------------------------------------------------------------
*/
router.put(
  "/update/:id",
  jwtAuth,
  Authorization(["admin"]),
  upload.single("file"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        if (req.file) {
          removeUploadedFile(req.file.filename);
        }

        return res.status(400).json({
          error: "Invalid notification ID",
        });
      }

      const notification = await Notif.findById(id);

      if (!notification) {
        if (req.file) {
          removeUploadedFile(req.file.filename);
        }

        return res.status(404).json({
          error: "Notification not found",
        });
      }

      const {
        title,
        type,
        active_date,
        link,
      } = req.body;

      /*
      |--------------------------------------------------------------------------
      | CHECK IF SOMETHING WAS PROVIDED
      |--------------------------------------------------------------------------
      */
      if (
        (!title || !title.trim()) &&
        !type &&
        !active_date &&
        link === undefined &&
        !req.file
      ) {
        return res.status(400).json({
          error: "No changes provided",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE TITLE
      |--------------------------------------------------------------------------
      */
      if (title !== undefined && title.trim()) {
        if (title.trim().length > 100) {
          if (req.file) {
            removeUploadedFile(req.file.filename);
          }

          return res.status(400).json({
            error: "Title cannot exceed 100 characters",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE ACTIVE DATE
      |--------------------------------------------------------------------------
      */
      let parsedDate;

      if (active_date !== undefined && active_date !== "") {
        parsedDate = new Date(active_date);

        if (Number.isNaN(parsedDate.getTime())) {
          if (req.file) {
            removeUploadedFile(req.file.filename);
          }

          return res.status(400).json({
            error: "Invalid active date",
          });
        }
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE EXTERNAL LINK
      |--------------------------------------------------------------------------
      */
      if (link !== undefined && !isValidLink(link)) {
        if (req.file) {
          removeUploadedFile(req.file.filename);
        }

        return res.status(400).json({
          error: "Please provide a valid HTTP or HTTPS link",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE TITLE
      |--------------------------------------------------------------------------
      */
      if (title !== undefined && title.trim()) {
        notification.title = title.trim();
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE TYPE
      |--------------------------------------------------------------------------
      */
      if (type) {
        notification.type = type;
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE ACTIVE DATE
      |--------------------------------------------------------------------------
      */
      if (parsedDate) {
        notification.active_date = parsedDate;
      }

      /*
      |--------------------------------------------------------------------------
      | UPDATE EXTERNAL LINK
      |--------------------------------------------------------------------------
      */
      if (link !== undefined) {
        notification.link = link.trim();
      }

      /*
      |--------------------------------------------------------------------------
      | REPLACE PDF FILE
      |--------------------------------------------------------------------------
      */
      const oldFileName = notification.fileName;

      if (req.file) {
        notification.fileName = req.file.filename;
      }

      /*
      |--------------------------------------------------------------------------
      | SAVE UPDATED NOTIFICATION
      |--------------------------------------------------------------------------
      */
      await notification.save();

      /*
      |--------------------------------------------------------------------------
      | DELETE OLD PDF AFTER SUCCESSFUL SAVE
      |--------------------------------------------------------------------------
      */
      if (req.file && oldFileName !== req.file.filename) {
        removeUploadedFile(oldFileName);
      }

      res.status(200).json({
        message: "Notification updated successfully",
        data: notification,
      });
    } catch (error) {
      console.error("Update notification error:", error);

      /*
      |--------------------------------------------------------------------------
      | REMOVE NEW FILE IF UPDATE FAILS
      |--------------------------------------------------------------------------
      */
      if (req.file) {
        removeUploadedFile(req.file.filename);
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          error: error.message,
        });
      }

      res.status(500).json({
        error: "Failed to update notification",
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

      await notification.deleteOne();

      // Remove the associated PDF after deleting the document.
      removeUploadedFile(notification.fileName);

      res.status(200).json({
        message: "Notification deleted successfully",
      });
    } catch (error) {
      console.error("Delete notification error:", error);

      res.status(500).json({
        error: "Failed to delete notification",
      });
    }
  }
);

module.exports = router;
