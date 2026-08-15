const mongoose = require("mongoose");

const ConferenceSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["National", "International"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    link: {
      type: String,
      required: true,
      trim: true,
    },

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

module.exports = mongoose.model("Conference", ConferenceSchema);