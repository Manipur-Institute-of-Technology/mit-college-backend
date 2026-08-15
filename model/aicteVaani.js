const mongoose = require("mongoose");

const AicteVaaniSchema = new mongoose.Schema(
  {
    header: {
      type: String,
      default: "AICTE-VAANI WORKSHOP (2 Days)",
      trim: true,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    dates: {
      type: String,
      required: true,
      trim: true,
    },

    time: {
      type: String,
      default: "9:00 AM – 5:00 PM",
      trim: true,
    },

    venue: {
      type: String,
      default: "MIT, MU Campus",
      trim: true,
    },

    information: {
      type: String,
      default: "",
      trim: true,
    },

    contact: {
      coordinator: {
        type: String,
        default: "",
        trim: true,
      },

      coCoordinator: {
        type: String,
        default: "",
        trim: true,
      },

      department: {
        type: String,
        default: "",
        trim: true,
      },

      website: {
        type: String,
        default: "",
        trim: true,
      },

      email: {
        type: String,
        default: "",
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },
    },

    attachments: [
      {
        id: {
          type: Number,
        },

        title: {
          type: String,
          default: "",
          trim: true,
        },

        url: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],

    extraLinks: [
      {
        id: {
          type: Number,
        },

        title: {
          type: String,
          default: "",
          trim: true,
        },

        url: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AicteVaani", AicteVaaniSchema);