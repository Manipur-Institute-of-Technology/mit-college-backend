const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const FacultyProfile = require("../model/facultyProfile");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

const Paper = require("../model/paper");
const Account = require("../model/account");

const router = express.Router();


// ============================================================
// FACULTY PHOTO UPLOAD
// ============================================================

const facultyUploadDir = path.join(
  process.cwd(),
  "uploads",
  "faculty"
);


// Create uploads/faculty if it doesn't exist
if (!fs.existsSync(facultyUploadDir)) {
  fs.mkdirSync(facultyUploadDir, {
    recursive: true,
  });
}


// ============================================================
// MULTER STORAGE
// ============================================================

const facultyPhotoStorage =
  multer.diskStorage({

    destination: (req, file, cb) => {
      cb(
        null,
        facultyUploadDir
      );
    },

    filename: (req, file, cb) => {

      const extension =
        path.extname(
          file.originalname
        ).toLowerCase();

      const filename =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}${extension}`;

      cb(
        null,
        filename
      );
    },

  });


// ============================================================
// FILE FILTER
// ============================================================

const facultyPhotoFilter =
  (req, file, cb) => {

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      allowedTypes.includes(
        file.mimetype
      )
    ) {

      cb(null, true);

    } else {

      cb(
        new Error(
          "Only JPG, JPEG, and WEBP images are allowed"
        ),
        false
      );

    }

  };


// ============================================================
// MULTER INSTANCE
// ============================================================

const uploadFacultyPhoto =
  multer({

    storage:
      facultyPhotoStorage,

    fileFilter:
      facultyPhotoFilter,

    limits: {
      fileSize:
        5 * 1024 * 1024,
    },

  });


// ============================================================
// FACULTY UPDATE OWN PROFILE
// PUT /mit/faculty-update/me
// ============================================================

router.put(
  "/me",
  JWTAuthentication,
  Authorization(["faculty"]),
  async (req, res) => {
    try {
      // --------------------------------------------------------
      // Find faculty profile using logged-in account
      // --------------------------------------------------------

      const faculty =
        await FacultyProfile.findOne({
          accountId: req.user._id,
        });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found",
        });
      }

      // --------------------------------------------------------
      // Fields faculty can update themselves
      // --------------------------------------------------------

      const allowedFields = [
        "photoId",
        "phoneNumber",
        "contactInfo",

        "namePrefix",
        "firstName",
        "middleName",
        "lastName",

        "sex",

        "dob",

        "departmentId",

        "bios",

        "highestDegree",
        "expertFields",
        "roles",
      ];

      // --------------------------------------------------------
      // Update only allowed fields
      // --------------------------------------------------------

      for (const field of allowedFields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          faculty[field] = req.body[field];
        }
      }

      // --------------------------------------------------------
      // Validate departmentId if supplied
      // --------------------------------------------------------

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "departmentId"
        )
      ) {
        if (
          req.body.departmentId &&
          !mongoose.Types.ObjectId.isValid(
            req.body.departmentId
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid department ID",
          });
        }

        faculty.departmentId =
          req.body.departmentId || null;
      }

      // --------------------------------------------------------
      // Validate DOB if supplied
      // --------------------------------------------------------

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "dob"
        )
      ) {
        if (!req.body.dob) {
          return res.status(400).json({
            success: false,
            message: "Date of birth is required",
          });
        }

        const dob =
          new Date(req.body.dob);

        if (
          Number.isNaN(
            dob.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth",
          });
        }

        faculty.dob = dob;
      }

      // --------------------------------------------------------
      // Save faculty
      // --------------------------------------------------------

      await faculty.save();

      // --------------------------------------------------------
      // Success
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: faculty,
      });

    } catch (error) {

      // --------------------------------------------------------
      // Mongoose Validation Error
      // --------------------------------------------------------

      if (
        error instanceof
        mongoose.Error.ValidationError
      ) {
        const errors =
          Object.values(
            error.errors
          ).map((err) => ({
            field: err.path,
            value: err.value,
            kind: err.kind,
            message: err.message,
          }));

        return res.status(400).json({
          success: false,
          message:
            "Faculty validation failed",
          errors,
        });
      }

      // --------------------------------------------------------
      // Cast Error
      // --------------------------------------------------------

      if (
        error instanceof
        mongoose.Error.CastError
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid value for ${error.path}`,
          field: error.path,
          value: error.value,
          kind: error.kind,
        });
      }

      // --------------------------------------------------------
      // Duplicate Key
      // --------------------------------------------------------

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "Duplicate value already exists",
          fields: error.keyValue,
        });
      }

      // --------------------------------------------------------
      // Other Error
      // --------------------------------------------------------

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to update faculty profile",
      });
    }
  }
);


// ============================================================
// ADMIN UPDATE ANY FACULTY PROFILE
// PUT /mit/faculty-update/:id
// ============================================================

router.put(
  "/me/photo",

  JWTAuthentication,

  Authorization(["faculty"]),

  uploadFacultyPhoto.single("photo"),

  async (req, res) => {

    let newPhotoPath = null;

    try {

      // --------------------------------------------------------
      // Make sure a photo was uploaded
      // --------------------------------------------------------

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message: "Profile photo is required",
        });

      }

      newPhotoPath = req.file.path;


      // --------------------------------------------------------
      // Find logged-in faculty
      // --------------------------------------------------------

      const faculty =
        await FacultyProfile.findOne({
          accountId: req.user._id,
        });


      if (!faculty) {

        // New upload is not needed anymore
        if (
          newPhotoPath &&
          fs.existsSync(newPhotoPath)
        ) {
          fs.unlinkSync(newPhotoPath);
        }

        return res.status(404).json({
          success: false,
          message: "Faculty profile not found",
        });

      }


      // --------------------------------------------------------
      // Remember the previous photo
      // --------------------------------------------------------

      const oldPhotoId =
        faculty.photoId || null;


      // --------------------------------------------------------
      // Set the new photo
      // --------------------------------------------------------

      faculty.photoId =
        req.file.filename;


      // --------------------------------------------------------
      // IMPORTANT:
      // Save the new photo reference FIRST
      // --------------------------------------------------------

      await faculty.save();


      // --------------------------------------------------------
      // Database save succeeded.
      //
      // NOW delete the previous physical image.
      // --------------------------------------------------------

      if (
        oldPhotoId &&
        oldPhotoId !== req.file.filename
      ) {

        const oldPhotoPath =
          path.join(
            facultyUploadDir,
            oldPhotoId
          );


        if (
          fs.existsSync(oldPhotoPath)
        ) {

          try {

            fs.unlinkSync(
              oldPhotoPath
            );

            console.log(
              `Deleted previous faculty photo: ${oldPhotoId}`
            );

          } catch (deleteError) {

            // Do not fail the request because
            // the database already has the new photo.
            console.error(
              "Failed to delete previous faculty photo:",
              deleteError
            );

          }

        } else {

          console.log(
            `Previous faculty photo not found: ${oldPhotoId}`
          );

        }

      }


      // --------------------------------------------------------
      // Return updated faculty
      // --------------------------------------------------------

      return res.status(200).json({

        success: true,

        message:
          "Profile photo updated successfully",

        data: {

          faculty,

          photoId:
            faculty.photoId,

          photoUrl:
            `/uploads/faculty/${faculty.photoId}`,

        },

      });

    } catch (error) {

      // --------------------------------------------------------
      // If database update failed, remove the NEW upload.
      //
      // This prevents an orphan image from remaining on disk.
      // --------------------------------------------------------

      if (
        newPhotoPath &&
        fs.existsSync(newPhotoPath)
      ) {

        try {

          fs.unlinkSync(
            newPhotoPath
          );

        } catch (deleteError) {

          console.error(
            "Failed to clean up new photo:",
            deleteError
          );

        }

      }


      // --------------------------------------------------------
      // Multer errors
      // --------------------------------------------------------

      if (
        error instanceof
        multer.MulterError
      ) {

        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {

          return res.status(400).json({

            success: false,

            message:
              "Profile photo must be smaller than 5 MB",

          });

        }


        return res.status(400).json({

          success: false,

          message:
            error.message,

        });

      }


      // --------------------------------------------------------
      // General error
      // --------------------------------------------------------

      console.error(
        "Faculty photo upload error:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error.message ||
          "Unable to update profile photo",

      });

    }

  }
);


// ============================================================
// ADMIN DELETE FACULTY
// DELETE /mit/faculty-update/:accountId
// ============================================================

router.delete(
  "/:accountId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { accountId } = req.params;

      // --------------------------------------------------------
      // Validate Account ID
      // --------------------------------------------------------

      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      // --------------------------------------------------------
      // Find Account
      // --------------------------------------------------------

      const account = await Account.findById(accountId);

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      // --------------------------------------------------------
      // Check faculty account
      // --------------------------------------------------------

      if (account.accountType !== "faculty") {
        return res.status(400).json({
          success: false,
          message:
            "The specified account is not a faculty account",
        });
      }

      // --------------------------------------------------------
      // Find Faculty Profile
      // --------------------------------------------------------

      const faculty = await FacultyProfile.findOne({
        accountId: new mongoose.Types.ObjectId(accountId),
      });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty profile not found for this account",
        });
      }

      // --------------------------------------------------------
      // Save photo ID before deleting faculty profile
      // --------------------------------------------------------

      const oldPhotoId = faculty.photoId;

      // --------------------------------------------------------
      // Delete Papers
      // --------------------------------------------------------

      const paperResult = await Paper.deleteMany({
        facultyId: faculty._id,
      });

      // --------------------------------------------------------
      // Delete Faculty Profile
      // --------------------------------------------------------

      await FacultyProfile.findByIdAndDelete(
        faculty._id
      );

      // --------------------------------------------------------
      // Delete Profile Photo
      // --------------------------------------------------------

      if (oldPhotoId) {
        try {
          const photoPath = path.join(
            process.cwd(),
            "uploads",
            "faculty",
            oldPhotoId
          );

          if (fs.existsSync(photoPath)) {
            fs.unlinkSync(photoPath);
          }
        } catch (photoError) {
          console.error(
            "Unable to delete faculty photo:",
            photoError
          );
        }
      }

      // --------------------------------------------------------
      // Delete Account
      // --------------------------------------------------------

      await Account.findByIdAndDelete(accountId);

      // --------------------------------------------------------
      // Success
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Faculty account, profile, photo, and associated papers deleted successfully",

        data: {
          accountId: account._id,

          facultyId: faculty._id,

          photoDeleted: !!oldPhotoId,

          papersDeleted:
            paperResult.deletedCount,
        },
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to delete faculty account",
      });
    }
  }
);


module.exports = router;
