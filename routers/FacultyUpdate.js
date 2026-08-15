const express = require("express");
const mongoose = require("mongoose");

const FacultyProfile = require("../model/facultyProfile");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const Paper = require("../model/paper")
const Account = require("../model/account");
const router = express.Router();



// =============================================
// FACULTY UPDATE OWN PROFILE
// PUT /mit/faculty-update/me
// =============================================

router.put(
  "/me",
  JWTAuthentication,
  Authorization(["faculty"]),
  async(req,res)=>{

    try{

      const faculty =
        await FacultyProfile.findOne({
          accountId:req.user._id
        });


      if(!faculty){
        return res.status(404).json({
          message:"Faculty profile not found"
        });
      }


      const allowedFields=[
        "photoId",
        "phoneNumber",
        "contactInfo",
        "namePrefix",
        "firstName",
        "middleName",
        "lastName",
        "sex",
        "bios",
        "highestDegree",
        "expertFields",
        "roles"
      ];
      allowedFields.forEach(field=>{

        if(req.body[field] !== undefined){

          faculty[field]=req.body[field];

        }

      });
      await faculty.save();
      res.json({
        success:true,
        message:"Profile updated",
        data:faculty

      });
    }catch(error){

      res.status(500).json({
        message:error.message
      });

    }

  }
);




// =============================================
// ADMIN UPDATE ANY FACULTY PROFILE
// PUT /mit/faculty-update/:id
// =============================================

router.put(
  "/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // =====================================================
      // 1. Validate Faculty ID
      // =====================================================

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid faculty ID",
        });
      }

      // =====================================================
      // 2. Allowed fields
      // =====================================================

      const allowedFields = [
        "photoId",
        "phoneNumber",
        "contactInfo",
        "namePrefix",
        "firstName",
        "middleName",
        "lastName",
        "sex",
        "bios",
        "highestDegree",
        "expertFields",
        "roles",
        "hod",
      ];

      // =====================================================
      // 3. Build update object
      // =====================================================

      const updateData = {};

      for (const field of allowedFields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          updateData[field] = req.body[field];
        }
      }

      // =====================================================
      // 4. Check update data
      // =====================================================

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided for update",
          allowedFields,
        });
      }

      // =====================================================
      // 5. Update faculty
      // =====================================================

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

      // =====================================================
      // 6. Faculty not found
      // =====================================================

      if (!updatedFaculty) {
        return res.status(404).json({
          success: false,
          message: "Faculty not found",
        });
      }

      // =====================================================
      // 7. Success
      // =====================================================

      return res.status(200).json({
        success: true,
        message:
          "Faculty profile updated successfully",
        data: updatedFaculty,
      });

    } catch (error) {
      console.error(
        "\n❌ ADMIN FACULTY UPDATE ERROR:"
      );

      console.error(error);

      // =====================================================
      // Mongoose Validation Error
      // =====================================================

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

        console.error(
          "Validation errors:",
          errors
        );

        return res.status(400).json({
          success: false,
          message:
            "Faculty validation failed",
          errors,
        });
      }

      // =====================================================
      // Cast Error
      // =====================================================

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

      // =====================================================
      // Duplicate Key
      // =====================================================

      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          message:
            "Duplicate value already exists",
          fields: error.keyValue,
        });
      }

      // =====================================================
      // Other Error
      // =====================================================

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to update faculty profile",
      });
    }
  }
);


// =============================================
// ADMIN DELETE FACULTY
// DELETE /mit/faculty/:id
// =============================================

// =============================================
// ADMIN DELETE FACULTY
// DELETE /mit/faculty/:facultyId
// =============================================

router.delete(
  "/:accountId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { accountId } = req.params;

      console.log("================================");
      console.log("DELETE FACULTY");
      console.log("Account ID:", accountId);
      console.log("================================");

      // --------------------------------------------------
      // VALIDATE ACCOUNT ID
      // --------------------------------------------------

      if (!mongoose.Types.ObjectId.isValid(accountId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid account ID",
        });
      }

      // --------------------------------------------------
      // FIND FACULTY USING ACCOUNT ID
      // --------------------------------------------------

      const faculty =
        await FacultyProfile.findOne({
          accountId: new mongoose.Types.ObjectId(accountId),
        });

      if (!faculty) {
        return res.status(404).json({
          success: false,
          message:
            "Faculty profile not found for this account",
        });
      }

      // --------------------------------------------------
      // DELETE PAPERS
      // --------------------------------------------------

      const result =
        await Paper.deleteMany({
          facultyId: faculty._id,
        });

      // --------------------------------------------------
      // DELETE FACULTY PROFILE
      // --------------------------------------------------

      await FacultyProfile.findByIdAndDelete(
        faculty._id
      );

      // --------------------------------------------------
      // OPTIONAL:
      // DELETE ACCOUNT
      // --------------------------------------------------

      // If you also want to delete the login account,
      // import your Account model and uncomment:
      //
      // await Account.findByIdAndDelete(accountId);

      // --------------------------------------------------
      // RESPONSE
      // --------------------------------------------------

      return res.status(200).json({
        success: true,
        message:
          "Faculty and associated papers deleted successfully",

        data: {
          facultyId: faculty._id,
          accountId: faculty.accountId,
          papersDeleted: result.deletedCount,
        },
      });

    } catch (error) {
      console.error(
        "❌ DELETE FACULTY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Unable to delete faculty",
      });
    }
  }
);

module.exports=router;