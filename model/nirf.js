const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const NirfSchema = new Schema(
  {
    header: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    resource: {
      type: {
        type: String,
        enum: ["link", "file"],
        required: true,
      },

      url: {
        type: String,
        default: "",
        trim: true,
      },

      file: {
        type: String,
        default: "",
        trim: true,
      },
    },

    year: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.model(
    "Nirf",
    NirfSchema
  );