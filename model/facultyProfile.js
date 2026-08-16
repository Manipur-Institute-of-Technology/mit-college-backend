const mongoose = require("mongoose");

const { Schema } = mongoose;

const FacultyProfileSchema = new Schema(
  {
    accountId: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      unique: true,
      index: true,
    },

    // ==========================================
    // 6-DIGIT FACULTY SECURITY CODE
    // ==========================================
    securityCode: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{6}$/,
    },

    photoId: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    contactInfo: {
      type: [
        {
          type: {
            type: String,
            required: true,
          },
          value: {
            type: String,
            required: true,
          },
        },
      ],
      default: [],
    },

    namePrefix: {
      type: String,
      trim: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    middleName: {
      type: String,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    sex: {
      type: String,
      enum: [
        "male",
        "female",
        "other",
        "prefer not to say",
      ],
      default: "prefer not to say",
    },

    dob: {
      type: Date,
      required: true,
    },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },

    hod: {
      type: Boolean,
      required: true,
      default: false,
    },

    bios: {
      type: String,
      trim: true,
    },

    highestDegree: {
      type: String,
      required: true,
      trim: true,
    },

    expertFields: {
      type: [String],
      default: [],
    },

    roles: {
      type: [
        {
          type: String,
          enum: [
            "principal",
            "chairman",
            "professor",
            "guest professor",
            "associate professor",
            "guest lecturer",
            "teaching assistant",
            "male warden",
            "female warden",
            "dean",
            "lab technician",
            "administrative assistant",
            "registrar",
            "librarian",
            "vice chancellor",
          ],
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "FacultyProfile",
  FacultyProfileSchema
);