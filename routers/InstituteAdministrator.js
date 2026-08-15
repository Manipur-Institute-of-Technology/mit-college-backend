const express = require("express");
const router = express.Router();

const InstituteAdministration = require("../model/instituteadministrator");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

// =====================================================
// GET INSTITUTE ADMINISTRATION
// PUBLIC
// =====================================================
router.get("/", async (req, res) => {
  try {
    const data = await InstituteAdministration.findOne();

    return res.status(200).json({
      data: data || {
        governingBodyStructure: [],
        governingBodyMembers: [],
      },
    });
  } catch (error) {
    console.error("GET ADMINISTRATION ERROR:", error);

    return res.status(500).json({
      error: error.message,
    });
  }
});

// =====================================================
// CREATE INITIAL ADMINISTRATION DOCUMENT
// ADMIN ONLY
// =====================================================
router.post(
  "/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      let data = await InstituteAdministration.findOne();

      if (data) {
        return res.status(200).json({
          message: "Institute administration already exists",
          data,
        });
      }

      data = new InstituteAdministration({
        governingBodyStructure: [],
        governingBodyMembers: [],
      });

      await data.save();

      return res.status(201).json({
        message: "Institute administration created successfully",
        data,
      });
    } catch (error) {
      console.error("CREATE ADMINISTRATION ERROR:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);

// =====================================================
// STRUCTURE OF THE GOVERNING BODY
// =====================================================


// =====================================================
// ADD STRUCTURE
// POST /administrator/structure/add
// =====================================================
router.post(
  "/structure/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { position, role } = req.body;

      // Validation
      if (!position || !position.trim()) {
        return res.status(400).json({
          error: "Position is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Role is required",
        });
      }

      // Find existing administration
      let data = await InstituteAdministration.findOne();

      // Create if it doesn't exist
      if (!data) {
        data = new InstituteAdministration({
          governingBodyStructure: [],
          governingBodyMembers: [],
        });
      }

      // Add structure
      data.governingBodyStructure.push({
        position: position.trim(),
        role: role.trim(),
      });

      await data.save();

      return res.status(201).json({
        message: "Governing body structure added successfully",
        data,
      });
    } catch (error) {
      console.error("ADD STRUCTURE ERROR:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);


// =====================================================
// EDIT STRUCTURE
// PUT /administrator/structure/edit/:structureId
// =====================================================
router.put(
  "/structure/edit/:structureId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const { position, role } = req.body;

      // Validation
      if (!position || !position.trim()) {
        return res.status(400).json({
          error: "Position is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Role is required",
        });
      }

      const data = await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error: "Institute administration not found",
        });
      }

      // Find structure using sub-document ID
      const structure =
        data.governingBodyStructure.id(
          req.params.structureId
        );

      if (!structure) {
        return res.status(404).json({
          error: "Governing body structure not found",
        });
      }

      // Update
      structure.position = position.trim();
      structure.role = role.trim();

      await data.save();

      return res.status(200).json({
        message: "Governing body structure updated successfully",
        data,
      });
    } catch (error) {
      console.error("EDIT STRUCTURE ERROR:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);


// =====================================================
// DELETE STRUCTURE
// DELETE /administrator/structure/delete/:structureId
// =====================================================
router.delete(
  "/structure/delete/:structureId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const data = await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error: "Institute administration not found",
        });
      }

      // Find structure
      const structure =
        data.governingBodyStructure.id(
          req.params.structureId
        );

      if (!structure) {
        return res.status(404).json({
          error: "Governing body structure not found",
        });
      }

      // Delete sub-document
      structure.deleteOne();

      await data.save();

      return res.status(200).json({
        message: "Governing body structure deleted successfully",
        data,
      });
    } catch (error) {
      console.error("DELETE STRUCTURE ERROR:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);


// =====================================================
// GOVERNING BODY MEMBERS
// =====================================================


// =====================================================
// ADD MEMBER
// POST /administrator/member/add
// =====================================================
router.post(
  "/member/add",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const {
        name,
        background,
        role,
      } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Member name is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Member role is required",
        });
      }

      // Find administration
      let data = await InstituteAdministration.findOne();

      // Create if it doesn't exist
      if (!data) {
        data = new InstituteAdministration({
          governingBodyStructure: [],
          governingBodyMembers: [],
        });
      }

      // Add member
      data.governingBodyMembers.push({
        name: name.trim(),
        background: background
          ? background.trim()
          : "",
        role: role.trim(),
      });

      await data.save();

      return res.status(201).json({
        message: "Governing body member added successfully",
        data,
      });
    } catch (error) {
      console.error("ADD MEMBER ERROR:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);


// =====================================================
// EDIT MEMBER
// PUT /administrator/member/edit/:memberId
// =====================================================
router.put(
  "/member/edit/:memberId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const {
        name,
        background,
        role,
      } = req.body;

      // Validation
      if (!name || !name.trim()) {
        return res.status(400).json({
          error: "Member name is required",
        });
      }

      if (!role || !role.trim()) {
        return res.status(400).json({
          error: "Member role is required",
        });
      }

      const data = await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error: "Institute administration not found",
        });
      }

      // Find member
      const member =
        data.governingBodyMembers.id(
          req.params.memberId
        );

      if (!member) {
        return res.status(404).json({
          error: "Governing body member not found",
        });
      }

      // Update member
      member.name = name.trim();

      member.background = background
        ? background.trim()
        : "";

      member.role = role.trim();

      await data.save();

      return res.status(200).json({
        message: "Governing body member updated successfully",
        data,
      });
    } catch (error) {
      console.error("EDIT MEMBER ERROR:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);


// =====================================================
// DELETE MEMBER
// DELETE /administrator/member/delete/:memberId
// =====================================================
router.delete(
  "/member/delete/:memberId",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const data = await InstituteAdministration.findOne();

      if (!data) {
        return res.status(404).json({
          error: "Institute administration not found",
        });
      }

      // Find member
      const member =
        data.governingBodyMembers.id(
          req.params.memberId
        );

      if (!member) {
        return res.status(404).json({
          error: "Governing body member not found",
        });
      }

      // Delete member
      member.deleteOne();

      await data.save();

      return res.status(200).json({
        message: "Governing body member deleted successfully",
        data,
      });
    } catch (error) {
      console.error("DELETE MEMBER ERROR:", error);

      return res.status(500).json({
        error: error.message,
      });
    }
  }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;