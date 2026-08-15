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

    paperUrl: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Paper", PaperSchema);