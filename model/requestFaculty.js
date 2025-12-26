const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Schema = mongoose.Schema;

const RequestFacultySchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true, // hashed here
    },

    photoId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    namePrefix: { type: String },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

    sex: {
      type: String,
      enum: ["male", "female", "other", "prefer not to say"],
      default: "prefer not to say",
    },

    startDate: { type: Date, required: true },

    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    highestDegree: { type: String, required: true },
    expertFields: [{ type: String, required: true }],
    bios: { type: String },

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
      required: true,
    },
  },
  { timestamps: true }
);

RequestFacultySchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, +process.env.SALT);
  }
  next();
});

module.exports = mongoose.model("RequestFaculty", RequestFacultySchema);
