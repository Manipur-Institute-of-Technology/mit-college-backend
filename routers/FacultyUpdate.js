const express = require("express");
const mongoose = require("mongoose");

const FacultyProfile = require("../model/facultyProfile");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

const Paper = require("../model/paper");
const Account = require("../model/account");

const router = express.Router();


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
  "/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // --------------------------------------------------------
      // Validate Faculty ID
      // --------------------------------------------------------

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID",
        });
      }

      // --------------------------------------------------------
      // Allowed fields
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
        "hod",
      ];

      // --------------------------------------------------------
      // Build update object
      // --------------------------------------------------------

      const updateData = {};

      for (const field of allowedFields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          updateData[field] =
            req.body[field];
        }
      }

      // --------------------------------------------------------
      // Check update data
      // --------------------------------------------------------

      if (
        Object.keys(updateData).length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid fields provided for update",
          allowedFields,
        });
      }

      // --------------------------------------------------------
      // Validate departmentId
      // --------------------------------------------------------

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "departmentId"
        )
      ) {
        if (
          updateData.departmentId &&
          !mongoose.Types.ObjectId.isValid(
            updateData.departmentId
          )
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid department ID",
          });
        }
      }

      // --------------------------------------------------------
      // Validate DOB
      // --------------------------------------------------------

      if (
        Object.prototype.hasOwnProperty.call(
          updateData,
          "dob"
        )
      ) {
        if (!updateData.dob) {
          return res.status(400).json({
            success: false,
            message: "Date of birth is required",
          });
        }

        const dob =
          new Date(updateData.dob);

        if (
          Number.isNaN(
            dob.getTime()
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid date of birth",
          });
        }

        updateData.dob = dob;
      }

      // --------------------------------------------------------
      // Update faculty
      // --------------------------------------------------------

      const updatedFaculty =
        await FacultyProfile.findByIdAndUpdate(
          id,
          {
            $set: updateData,
          },
          {
            new: true,
            runValidators: true,
            context: "query",
          }
        );

      // --------------------------------------------------------
      // Faculty not found
      // --------------------------------------------------------

      if (!updatedFaculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found",
        });
      }

      // --------------------------------------------------------
      // Success
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Faculty profile updated successfully",
        data: updatedFaculty,
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
// ADMIN DELETE FACULTY
// DELETE /mit/faculty-update/:accountId
// ============================================================

router.delete(
  "/:accountId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { accountId } =
        req.params;

      // --------------------------------------------------------
      // Validate Account ID
      // --------------------------------------------------------

      if (
        !mongoose.Types.ObjectId.isValid(
          accountId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      // --------------------------------------------------------
      // Find Account
      // --------------------------------------------------------

      const account =
        await Account.findById(
          accountId
        );

      if (!account) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      // --------------------------------------------------------
      // Check faculty account
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // Find Faculty Profile
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // Delete Papers
      // --------------------------------------------------------

      const paperResult =
        await Paper.deleteMany({
          facultyId: faculty._id,
        });

      // --------------------------------------------------------
      // Delete Faculty Profile
      // --------------------------------------------------------

      await FacultyProfile.findByIdAndDelete(
        faculty._id
      );

      // --------------------------------------------------------
      // Delete Account
      // --------------------------------------------------------

      await Account.findByIdAndDelete(
        accountId
      );

      // --------------------------------------------------------
      // Success
      // --------------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Faculty account, profile, and associated papers deleted successfully",

        data: {
          accountId:
            account._id,

          facultyId:
            faculty._id,

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
