const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const field = {
	gender: ["male", "female", "other", "prefer not to say"],
	facultyRoles: [
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
};

const FacultyProfileSchema = new Schema(
	{
		accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
		photoId: { type: String, required: true },
		email: { type: String, required: true },
		phoneNumber: { type: String, required: true },
		namePrefix: { type: String },
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		sex: {
			type: String,
			required: true,
			enum: field.gender,
			default: "prefer not to say",
		},
		startDate: { type: Date, required: true },
		departmentId: {
			type: Schema.Types.ObjectId,
			ref: "Department",
			required: true,
		},
		highestDegree: {
			type: {
				degreeName: { type: String, required: true },
				instituteName: { type: String, required: true },
			},
			required: true,
		},
		expertFields: { type: [{ type: String }], required: true },
		bios: { type: String, required: false },
		published: {
			type: [
				{
					title: { type: String, required: true },
					type: { type: String, required: true },
					year: { type: Number, required: true },
					paperLink: { type: String, required: true },
				},
			],
			required: false,
		},
		roles: {
			type: [
				{
					type: String,
					enum: field.facultyRoles,
				},
			],
			required: true,
		},
	},
	{ timestamps: true },
);

// TODO: only one chairman, one principal implement in the business logic
module.exports = {
	FacultyProfile: mongoose.model("FacultyProfile", FacultyProfileSchema),
	field,
};
