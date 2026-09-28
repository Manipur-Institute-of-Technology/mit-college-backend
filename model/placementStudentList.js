const mongoose = require("mongoose");

const PlacementStudentListSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      filename: {
        type: String,
        required: true,
        trim: true,
      },

      filepath: {
        type: String,
        required: true,
        trim: true,
      },

      data: [
        {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
        },
      ],
    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "PlacementStudentList",
    PlacementStudentListSchema
  );