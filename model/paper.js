const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaperSchema = new Schema(
  {
    facultyId: {
      type: Schema.Types.ObjectId,
      ref: "FacultyProfile",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    paperType: {
      type: String,
      enum: ["pdf", "link"],
      required: true,
    },

    paperUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Paper", PaperSchema);
