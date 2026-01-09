const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const StudentListSchema = new Schema(
  {
    year: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    filepath: {
      type: String,
      required: true,
    },

    /**
     * Parsed data from CSV / Excel
     * Each object = one row
     * Key   → column header
     * Value → cell value
     */
    data: [
      {
        type: Map,
        of: Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentList", StudentListSchema);
