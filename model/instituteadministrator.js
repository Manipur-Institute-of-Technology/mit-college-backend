const mongoose = require("mongoose");

const GoverningBodyStructureSchema = new mongoose.Schema(
  {
    position: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: true,
  }
);

const GoverningBodyMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    background: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: true,
  }
);

const AdminDocumentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["file", "link"],
      required: true,
    },

    file: {
      type: String,
      default: "",
    },

    url: {
      type: String,
      default: "",
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const InstituteAdministrationSchema =
  new mongoose.Schema(
    {
      governingBodyStructure: {
        type: [GoverningBodyStructureSchema],
        default: [],
      },

      governingBodyMembers: {
        type: [GoverningBodyMemberSchema],
        default: [],
      },

      documents: {
        type: [AdminDocumentSchema],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  "InstituteAdministration",
  InstituteAdministrationSchema
);