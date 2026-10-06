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

/* ============================================================
   FACULTY PHOTO UPLOAD
============================================================ */

const facultyUploadDir = path.join(
  process.cwd(),
  "uploads",
  "faculty"
);

if (!fs.existsSync(facultyUploadDir)) {
  fs.mkdirSync(facultyUploadDir, {
    recursive: true,
  });
}

/* ============================================================
   MULTER STORAGE
============================================================ */

const facultyPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, facultyUploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const filename = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${extension}`;

    cb(null, filename);
  },
});

/* ============================================================
   FILE FILTER
============================================================ */

const facultyPhotoFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG, and WEBP images are allowed"
      ),
      false
    );
  }
};

/* ============================================================
   MULTER INSTANCE
============================================================ */

const uploadFacultyPhoto = multer({
  storage: facultyPhotoStorage,
  fileFilter: facultyPhotoFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/* ============================================================
   HELPER FUNCTIONS
============================================================ */

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

/*
 * Normalize array fields.
 *
 * Accepts:
 *   ["Professor", "HOD"]
 *
 * Also accepts a JSON string:
 *   '["Professor", "HOD"]'
 *
 * Also accepts a single value:
 *   "Professor"
 *
 * This makes the API easier to use with JSON and FormData.
 */
const normalizeArray = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // Not JSON; treat as a single value.
    }

    return [trimmed];
  }

  return [];
};

/*
 * Normalize contactInfo.
 *
 * Example:
 *
 * [
 *   {
 *     type: "phone",
 *     value: "9876543210"
 *   }
 * ]
 *
 * Can also be supplied as JSON string.
 */
const normalizeContactInfo = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (
        parsed &&
        typeof parsed === "object"
      ) {
        return [parsed];
      }
    } catch (error) {
      return [];
    }
  }

  return [];
};

/* ============================================================
   FACULTY UPDATE OWN PROFILE
   PUT /mit/faculty-update/me
============================================================ */

router.put(
  "/me",
  JWTAuthentication,
  Authorization(["faculty"]),
  async (req, res) => {
    try {
      const faculty = await FacultyProfile.findOne({
        accountId: req.user._id,
      });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty profile not found",
        });
      }

      /*
       * Faculty can update their own editable fields.
       *
       * Protected:
       * - accountId
       * - securityCode
       * - email
       * - hod
       */
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

      /* ---------------------------------------------
         PHONE NUMBER
      --------------------------------------------- */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "phoneNumber"
        )
      ) {
        faculty.phoneNumber =
          req.body.phoneNumber;
      }

      /* ---------------------------------------------
         CONTACT INFO
      --------------------------------------------- */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "contactInfo"
        )
      ) {
        faculty.contactInfo =
          normalizeContactInfo(
            req.body.contactInfo
          );
      }

      /* ---------------------------------------------
         DEPARTMENT
      --------------------------------------------- */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "departmentId"
        )
      ) {
        if (
          req.body.departmentId &&
          !isValidObjectId(
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

      /* ---------------------------------------------
         DOB
      --------------------------------------------- */

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

        const dob = new Date(req.body.dob);

        if (Number.isNaN(dob.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth",
          });
        }

        faculty.dob = dob;
      }

      /* ---------------------------------------------
         EXPERT FIELDS
      --------------------------------------------- */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "expertFields"
        )
      ) {
        if (
          !Array.isArray(
            normalizeArray(
              req.body.expertFields
            )
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "expertFields must be an array",
          });
        }

        faculty.expertFields =
          normalizeArray(
            req.body.expertFields
          );
      }

      /* ---------------------------------------------
         ROLES / POSITION
      --------------------------------------------- */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "roles"
        )
      ) {
        const roles = normalizeArray(
          req.body.roles
        );

        const allowedRoles = [
          "Professor",
          "Associate Professor",
          "Assistant Professor",
          "Guest Faculty",
        ];

        const invalidRoles = roles.filter(
          (role) =>
            !allowedRoles.includes(role)
        );

        if (invalidRoles.length > 0) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid faculty role",
            invalidRoles,
            allowedRoles,
          });
        }

        faculty.roles = roles;
      }

      await faculty.save();

      return res.status(200).json({
        success: true,
        message:
          "Profile updated successfully",
        data: faculty,
      });
    } catch (error) {
      if (
        error instanceof
        mongoose.Error.ValidationError
      ) {
        const errors = Object.values(
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

      if (
        error instanceof
        mongoose.Error.CastError
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for ${error.path}`,
          field: error.path,
          value: error.value,
          kind: error.kind,
        });
      }

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "Duplicate value already exists",
          fields: error.keyValue,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to update faculty profile",
      });
    }
  }
);

/* ============================================================
   ADMIN UPDATE ANY FACULTY PROFILE
   PUT /mit/faculty-update/:id

   ADMIN CAN UPDATE EVERYTHING EXCEPT:

   - accountId
   - securityCode
   - email
============================================================ */

router.put(
  "/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      /* ---------------------------------------------
         VALIDATE FACULTY ID
      --------------------------------------------- */

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID",
        });
      }

      /* ---------------------------------------------
         FIND FACULTY
      --------------------------------------------- */

      const faculty =
        await FacultyProfile.findById(id);

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty profile not found",
        });
      }

      /*
       * =====================================================
       * ALL ADMIN-EDITABLE FACULTY FIELDS
       *
       * NOT INCLUDED:
       *
       * accountId
       * securityCode
       * email
       *
       * Everything else is editable.
       * =====================================================
       */

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

        "hod",

        "bios",

        "highestDegree",
        "expertFields",
        "roles",
      ];

      /* ---------------------------------------------
         BASIC FIELD UPDATE
      --------------------------------------------- */

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

      /* =====================================================
         PHONE NUMBER
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "phoneNumber"
        )
      ) {
        if (
          typeof req.body.phoneNumber !==
          "string"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "phoneNumber must be a string",
          });
        }

        faculty.phoneNumber =
          req.body.phoneNumber.trim();
      }

      /* =====================================================
         CONTACT INFO
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "contactInfo"
        )
      ) {
        const contactInfo =
          normalizeContactInfo(
            req.body.contactInfo
          );

        for (const contact of contactInfo) {
          if (
            !contact ||
            typeof contact !== "object"
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid contactInfo format",
            });
          }

          if (
            typeof contact.type !==
              "string" ||
            typeof contact.value !==
              "string"
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Each contactInfo item must contain type and value",
            });
          }
        }

        faculty.contactInfo =
          contactInfo;
      }

      /* =====================================================
         DEPARTMENT
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "departmentId"
        )
      ) {
        if (
          req.body.departmentId &&
          !isValidObjectId(
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

      /* =====================================================
         DATE OF BIRTH
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "dob"
        )
      ) {
        if (!req.body.dob) {
          return res.status(400).json({
            success: false,
            message:
              "Date of birth is required",
          });
        }

        const dob = new Date(
          req.body.dob
        );

        if (Number.isNaN(dob.getTime())) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid date of birth",
          });
        }

        faculty.dob = dob;
      }

      /* =====================================================
         SEX
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "sex"
        )
      ) {
        const allowedSex = [
          "male",
          "female",
          "other",
          "prefer not to say",
        ];

        if (
          !allowedSex.includes(
            req.body.sex
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid sex value",
            allowedValues: allowedSex,
          });
        }

        faculty.sex = req.body.sex;
      }

      /* =====================================================
        HOD
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "hod"
        )
      ) {
        let hod = req.body.hod;

        /*
        * JSON request:
        *
        * hod: true
        *
        * FormData request:
        *
        * hod: "true"
        */

        if (typeof hod === "string") {
          if (hod === "true") {
            hod = true;
          } else if (hod === "false") {
            hod = false;
          }
        }

        if (typeof hod !== "boolean") {
          return res.status(400).json({
            success: false,
            message: "hod must be a boolean",
          });
        }

        /*
        * =====================================================
        * ONE HOD PER DEPARTMENT
        * =====================================================
        *
        * Only check when this faculty is being made HOD.
        *
        * We exclude the current faculty ID so that an existing
        * HOD can update their own profile without triggering
        * the duplicate-HOD error.
        */

        if (hod === true) {
          const departmentId =
            Object.prototype.hasOwnProperty.call(
              req.body,
              "departmentId"
            )
              ? req.body.departmentId
              : faculty.departmentId;

          /*
          * A faculty cannot be HOD without a department.
          */

          if (!departmentId) {
            return res.status(400).json({
              success: false,
              message:
                "A department is required for a Faculty Head.",
            });
          }

          if (
            !isValidObjectId(departmentId)
          ) {
            return res.status(400).json({
              success: false,
              message: "Invalid department ID",
            });
          }

          /*
          * Check whether another faculty in the SAME
          * department is already the HOD.
          */

          const existingHOD =
            await FacultyProfile.findOne({
              departmentId: departmentId,
              hod: true,
              _id: { $ne: id },
            });

          if (existingHOD) {
            return res.status(400).json({
              success: false,
              message:
                "There cannot be two Faculty Heads in the same department.",
              existingHOD: {
                id: existingHOD._id,
                name: [
                  existingHOD.namePrefix,
                  existingHOD.firstName,
                  existingHOD.middleName,
                  existingHOD.lastName,
                ]
                  .filter(Boolean)
                  .join(" "),
              },
            });
          }
        }

        faculty.hod = hod;
      }

      /* =====================================================
         EXPERT FIELDS
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "expertFields"
        )
      ) {
        const expertFields =
          normalizeArray(
            req.body.expertFields
          );

        if (
          !Array.isArray(expertFields)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "expertFields must be an array",
          });
        }

        faculty.expertFields =
          expertFields.map((field) =>
            String(field).trim()
          );
      }

      /* =====================================================
         ROLES / FACULTY POSITION
      ===================================================== */

      if (
        Object.prototype.hasOwnProperty.call(
          req.body,
          "roles"
        )
      ) {
        const roles = normalizeArray(
          req.body.roles
        );

        const allowedRoles = [
          "Professor",
          "Associate Professor",
          "Assistant Professor",
          "Guest Faculty",
        ];

        const invalidRoles = roles.filter(
          (role) =>
            !allowedRoles.includes(role)
        );

        if (invalidRoles.length > 0) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid faculty role",
            invalidRoles,
            allowedRoles,
          });
        }

        faculty.roles = roles;
      }

      /* =====================================================
         PREVENT PROTECTED FIELD CHANGES
      ===================================================== */

      /*
       * Even if the frontend sends these fields,
       * they are deliberately ignored:
       *
       * accountId
       * securityCode
       * email
       *
       * We never assign them to faculty.
       */

      /* =====================================================
         SAVE
      ===================================================== */

      await faculty.save();

      /* =====================================================
         SUCCESS
      ===================================================== */

      return res.status(200).json({
        success: true,
        message:
          "Faculty profile updated successfully",
        data: faculty,
      });
    } catch (error) {
      /* =====================================================
         MONGOOSE VALIDATION ERROR
      ===================================================== */

      if (
        error instanceof
        mongoose.Error.ValidationError
      ) {
        const errors = Object.values(
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

      /* =====================================================
         MONGOOSE CAST ERROR
      ===================================================== */

      if (
        error instanceof
        mongoose.Error.CastError
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for ${error.path}`,
          field: error.path,
          value: error.value,
          kind: error.kind,
        });
      }

      /* =====================================================
         DUPLICATE KEY
      ===================================================== */

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "Duplicate value already exists",
          fields: error.keyValue,
        });
      }

      /* =====================================================
         GENERAL ERROR
      ===================================================== */

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to update faculty profile",
      });
    }
  }
);

/* ============================================================
   FACULTY UPDATE OWN PROFILE PHOTO
   PUT /mit/faculty-update/me/photo
============================================================ */

router.put(
  "/me/photo",
  JWTAuthentication,
  Authorization(["faculty"]),
  uploadFacultyPhoto.single("photo"),
  async (req, res) => {
    let newPhotoPath = null;

    try {
      /* ---------------------------------------------
         CHECK UPLOAD
      --------------------------------------------- */

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Profile photo is required",
        });
      }

      newPhotoPath = req.file.path;

      /* ---------------------------------------------
         FIND FACULTY
      --------------------------------------------- */

      const faculty =
        await FacultyProfile.findOne({
          accountId: req.user._id,
        });

      if (!faculty) {
        if (
          newPhotoPath &&
          fs.existsSync(newPhotoPath)
        ) {
          fs.unlinkSync(newPhotoPath);
        }

        return res.status(404).json({
          success: false,
          message:
            "Faculty profile not found",
        });
      }

      /* ---------------------------------------------
         OLD PHOTO
      --------------------------------------------- */

      const oldPhotoId =
        faculty.photoId || null;

      /* ---------------------------------------------
         NEW PHOTO
      --------------------------------------------- */

      faculty.photoId =
        req.file.filename;

      /* ---------------------------------------------
         SAVE DATABASE FIRST
      --------------------------------------------- */

      await faculty.save();

      /* ---------------------------------------------
         DELETE OLD PHOTO
      --------------------------------------------- */

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
          } catch (deleteError) {
            console.error(
              "Failed to delete previous faculty photo:",
              deleteError
            );
          }
        }
      }

      /* ---------------------------------------------
         SUCCESS
      --------------------------------------------- */

      return res.status(200).json({
        success: true,
        message:
          "Profile photo updated successfully",
        data: {
          faculty,
          photoId: faculty.photoId,
          photoUrl: `/uploads/faculty/${faculty.photoId}`,
        },
      });
    } catch (error) {
      /* ---------------------------------------------
         REMOVE NEW FILE IF DATABASE FAILED
      --------------------------------------------- */

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

      /* ---------------------------------------------
         MULTER ERROR
      --------------------------------------------- */

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
          message: error.message,
        });
      }

      /* ---------------------------------------------
         GENERAL ERROR
      --------------------------------------------- */

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to update profile photo",
      });
    }
  }
);

/* ============================================================
   ADMIN DELETE FACULTY
   DELETE /mit/faculty-update/:accountId
============================================================ */

router.delete(
  "/:accountId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { accountId } = req.params;

      /* ---------------------------------------------
         VALIDATE ACCOUNT ID
      --------------------------------------------- */

      if (!isValidObjectId(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      /* ---------------------------------------------
         FIND ACCOUNT
      --------------------------------------------- */

      const account =
        await Account.findById(accountId);

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      /* ---------------------------------------------
         CHECK FACULTY ACCOUNT
      --------------------------------------------- */

      if (
        account.accountType !==
        "faculty"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The specified account is not a faculty account",
        });
      }

      /* ---------------------------------------------
         FIND FACULTY PROFILE
      --------------------------------------------- */

      const faculty =
        await FacultyProfile.findOne({
          accountId:
            new mongoose.Types.ObjectId(
              accountId
            ),
        });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty profile not found for this account",
        });
      }

      /* ---------------------------------------------
         SAVE PHOTO ID
      --------------------------------------------- */

      const oldPhotoId =
        faculty.photoId;

      /* ---------------------------------------------
         DELETE PAPERS
      --------------------------------------------- */

      const paperResult =
        await Paper.deleteMany({
          facultyId: faculty._id,
        });

      /* ---------------------------------------------
         DELETE FACULTY PROFILE
      --------------------------------------------- */

      await FacultyProfile.findByIdAndDelete(
        faculty._id
      );

      /* ---------------------------------------------
         DELETE PHOTO
      --------------------------------------------- */

      if (oldPhotoId) {
        try {
          const photoPath =
            path.join(
              process.cwd(),
              "uploads",
              "faculty",
              oldPhotoId
            );

          if (
            fs.existsSync(photoPath)
          ) {
            fs.unlinkSync(
              photoPath
            );
          }
        } catch (photoError) {
          console.error(
            "Unable to delete faculty photo:",
            photoError
          );
        }
      }

      /* ---------------------------------------------
         DELETE ACCOUNT
      --------------------------------------------- */

      await Account.findByIdAndDelete(
        accountId
      );

      /* ---------------------------------------------
         SUCCESS
      --------------------------------------------- */

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