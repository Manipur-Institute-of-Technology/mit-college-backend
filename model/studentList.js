const mongoose = require("mongoose");

const Schema = mongoose.Schema;

// ─────────────────────────────────────────────────────────────────────────────
// BRANCHES
// ─────────────────────────────────────────────────────────────────────────────

const BRANCHES = [
  "CE",
  "ME",
  "CSE",
  "EE",
  "ECE",
];

// ─────────────────────────────────────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────────────────────────────────────

const COURSES = [
  "M.Tech",
  "B.E./B.Tech",
];

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT LIST SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const StudentListSchema = new Schema(
  {
    course: {
      type: String,
      required: true,
      enum: COURSES,
      trim: true,
    },

    branch: {
      type: String,
      required: true,
      enum: BRANCHES,
      trim: true,
    },

    year: {
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
        of: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// UNIQUE COURSE + BRANCH + YEAR
// ─────────────────────────────────────────────────────────────────────────────

StudentListSchema.index(
  {
    course: 1,
    branch: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "StudentList",
  StudentListSchema
);