const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Department = require("../model/department");
const FacultyProfile = require("../model/facultyProfile");

const apiResponse = require("../utils/apiResponse");
const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { name } = req.body;

      if (!name) {
        return res.status(400).json(
          apiResponse(null, {
            code: "MISSING_DEPARTMENT_NAME",
            message: "Department name is required",
          })
        );
      }

      const exists = await Department.findOne({
        name: name.toLowerCase(),
      });

      if (exists) {
        return res.status(409).json(
          apiResponse(null, {
            code: "DEPARTMENT_EXISTS",
            message: "Department already exists",
          })
        );
      }

      const department = new Department({ name });
      await department.save();

      res.status(201).json(
        apiResponse({
          message: "Department created successfully",
          department,
        })
      );
    } catch (err) {
      res.status(500).json(
        apiResponse(null, {
          code: "CREATE_DEPARTMENT_ERROR",
          message: err.toString(),
        })
      );
    }
  }
);

router.get("/", async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 });

    res.status(200).json(
      apiResponse({
        total: departments.length,
        departments,
      })
    );
  } catch (err) {
    res.status(500).json(
      apiResponse(null, {
        code: "FETCH_DEPARTMENTS_ERROR",
        message: err.toString(),
      })
    );
  }
});

router.delete(
  "/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(
          apiResponse(null, {
            code: "INVALID_DEPARTMENT_ID",
            message: "Invalid department ID",
          })
        );
      }

      const used = await FacultyProfile.findOne({
        departmentId: id,
      });

      if (used) {
        return res.status(409).json(
          apiResponse(null, {
            code: "DEPARTMENT_IN_USE",
            message:
              "Department is assigned to faculty members and cannot be deleted",
          })
        );
      }

      const deleted = await Department.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json(
          apiResponse(null, {
            code: "DEPARTMENT_NOT_FOUND",
            message: "Department not found",
          })
        );
      }

      res.status(200).json(
        apiResponse({
          message: "Department deleted successfully",
        })
      );
    } catch (err) {
      res.status(500).json(
        apiResponse(null, {
          code: "DELETE_DEPARTMENT_ERROR",
          message: err.toString(),
        })
      );
    }
  }
);

module.exports = router;
