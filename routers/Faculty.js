const express = require("express");
const mongoose = require("mongoose");

const FacultyProfile = require("../model/facultyProfile");
const apiResponse = require("../utils/apiResponse");
const Paper = require("../model/paper");

const router = express.Router();


// ======================================================
// GET ALL FACULTY
// GET /mit/faculty
// ======================================================

router.get("/", async (req, res) => {
  try {
    const faculty = await FacultyProfile.aggregate([
      {
        $lookup: {
          from: Paper.collection.name,
          localField: "_id",
          foreignField: "facultyId",
          as: "papers",
        },
      },

      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department",
        },
      },

      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        count: faculty.length,
        faculty,
      },
    });
  } catch (error) {
    console.error("FETCH FACULTY FAILED:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch faculty",
      error: error.message,
    });
  }
});


// ======================================================
// GET FACULTY BY DEPARTMENT
//
// GET /mit/faculty/department/:department
// ======================================================

router.get("/department/:department", async (req, res) => {
  try {
    const departmentParam = req.params.department;

    const departmentNames = departmentParam
      .split(",")
      .map((department) =>
        decodeURIComponent(department.trim())
      )
      .filter(Boolean);

    if (!departmentNames.length) {
      return res.status(400).json(
        apiResponse(null, {
          code: "INVALID_DEPARTMENT",
          message: "Department name is required",
        })
      );
    }

    const faculty = await FacultyProfile.aggregate([
      // --------------------------------------------------
      // DEPARTMENT
      // --------------------------------------------------

      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department",
        },
      },

      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: false,
        },
      },

      // --------------------------------------------------
      // MATCH DEPARTMENT
      // --------------------------------------------------

      {
        $match: {
          "department.name": {
            $in: departmentNames,
          },
        },
      },

      // --------------------------------------------------
      // PAPERS
      // --------------------------------------------------

      {
        $lookup: {
          from: Paper.collection.name,
          localField: "_id",
          foreignField: "facultyId",
          as: "papers",
        },
      },

      // --------------------------------------------------
      // SORT
      // --------------------------------------------------

      {
        $sort: {
          createdAt: -1,
        },
      },
    ]);

    return res.status(200).json(
      apiResponse({
        count: faculty.length,
        faculty,
      })
    );
  } catch (err) {
    console.error(
      "FETCH DEPARTMENT FACULTY FAILED:",
      err
    );

    return res.status(500).json(
      apiResponse(null, {
        code: "FETCH_DEPARTMENT_FACULTY_FAILED",
        message: err.message,
      })
    );
  }
});


// ======================================================
// GET FACULTY BY FACULTY PROFILE ID
//
// GET /mit/faculty/profile/:facultyId
//
// IMPORTANT:
// This uses FacultyProfile._id
// ======================================================

router.get("/:accountId", async (req, res) => {
  try {
    const { accountId } = req.params;

    console.log("================================");
    console.log("FACULTY PROFILE API HIT");
    console.log("Account ID:", accountId);
    console.log("================================");

    // --------------------------------------------------
    // VALIDATE OBJECT ID
    // --------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json(
        apiResponse(null, {
          code: "INVALID_ACCOUNT_ID",
          message: "Invalid account ID",
        })
      );
    }

    // --------------------------------------------------
    // FIND FACULTY USING accountId
    // --------------------------------------------------

    const faculty = await FacultyProfile.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(accountId),
        },
      },

      // ------------------------------------------------
      // PAPERS
      // ------------------------------------------------

      {
        $lookup: {
          from: Paper.collection.name,
          localField: "_id",
          foreignField: "facultyId",
          as: "papers",
        },
      },

      // ------------------------------------------------
      // DEPARTMENT
      // ------------------------------------------------

      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department",
        },
      },

      // ------------------------------------------------
      // UNWIND DEPARTMENT
      // ------------------------------------------------

      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },

      // ------------------------------------------------
      // PROJECT
      // ------------------------------------------------

      {
        $project: {
          _id: 1,

          // Account reference
          accountId: 1,

          // Name
          namePrefix: 1,
          firstName: 1,
          middleName: 1,
          lastName: 1,

          // Contact
          email: 1,
          phoneNumber: 1,
          contactInfo: 1,

          // Personal
          sex: 1,
          startDate: 1,

          // Faculty
          roles: 1,
          hod: 1,
          highestDegree: 1,
          expertFields: 1,
          bios: 1,

          // Photo
          photoId: 1,
          photo: 1,

          // Department
          departmentId: 1,
          department: 1,

          // Papers
          papers: 1,

          // Dates
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    console.log(
      "FACULTY PROFILE RESULT:",
      JSON.stringify(faculty, null, 2)
    );

    // --------------------------------------------------
    // FACULTY NOT FOUND
    // --------------------------------------------------

    if (!faculty.length) {
      return res.status(404).json(
        apiResponse(null, {
          code: "FACULTY_NOT_FOUND",
          message: "Faculty profile not found for this account",
        })
      );
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------

    return res.status(200).json(
      apiResponse({
        faculty: faculty[0],
      })
    );

  } catch (err) {
    console.error(
      "FETCH FACULTY PROFILE FAILED:",
      err
    );

    return res.status(500).json(
      apiResponse(null, {
        code: "FETCH_FACULTY_PROFILE_FAILED",
        message:
          err.message ||
          "Unable to fetch faculty profile",
      })
    );
  }
});


// ======================================================
// GET FACULTY BY ACCOUNT ID
//
// GET /mit/faculty/account/:accountId
//
// This is ONLY when you actually have Account._id
// ======================================================

router.get("/account/:accountId", async (req, res) => {
  try {
    const accountId = req.params.accountId;

    console.log("================================");
    console.log("FACULTY BY ACCOUNT ID API HIT");
    console.log("Account ID:", accountId);
    console.log("================================");

    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return res.status(400).json(
        apiResponse(null, {
          code: "INVALID_ACCOUNT_ID",
          message: "Invalid account ID",
        })
      );
    }

    const faculty = await FacultyProfile.aggregate([
      {
        $match: {
          accountId: new mongoose.Types.ObjectId(accountId),
        },
      },

      {
        $lookup: {
          from: Paper.collection.name,
          localField: "_id",
          foreignField: "facultyId",
          as: "papers",
        },
      },

      {
        $lookup: {
          from: "departments",
          localField: "departmentId",
          foreignField: "_id",
          as: "department",
        },
      },

      {
        $unwind: {
          path: "$department",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,
          accountId: 1,

          firstName: 1,
          lastName: 1,
          namePrefix: 1,

          roles: 1,

          contactInfo: 1,
          phoneNumber: 1,

          highestDegree: 1,
          expertFields: 1,

          photoId: 1,
          photo: 1,

          departmentId: 1,
          department: 1,

          papers: 1,

          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    if (!faculty.length) {
      return res.status(404).json(
        apiResponse(null, {
          code: "FACULTY_NOT_FOUND",
          message:
            "Faculty profile not found for this account",
        })
      );
    }

    return res.status(200).json(
      apiResponse({
        faculty: faculty[0],
      })
    );
  } catch (err) {
    console.error(
      "FETCH FACULTY BY ACCOUNT ID FAILED:",
      err
    );

    return res.status(500).json(
      apiResponse(null, {
        code: "FETCH_FACULTY_FAILED",
        message: err.message,
      })
    );
  }
});


module.exports = router;