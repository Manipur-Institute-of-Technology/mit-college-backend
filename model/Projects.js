const mongoose = require("mongoose");
const validator = require("validator");
const { validate } = require("./department");

const Schema = new mongoose.Schema();

const ProjectSchema = new Schema(
	{
		departmentId: {
			type: Schema.Types.ObjectId,
			ref: "Department",
			required: true,
		},
		facultyIds: [
			{ type: Schema.Types.ObjectId, ref: "FacultyProfile", required: true },
		],
		projectName: {
			type: String,
			required: true,
			minLength: 10,
			maxLength: 100,
		},
		projectPaperLink: {
			type: String,
			required: true,
			validate: (val) => {
				if (!validator.isURL(val)) {
					return false;
				}
				return true;
			},
		},
		projectRepoLink: {
			type: String,
			required: false,
			validate: (val) => {
				if (!validator.isURL(val)) {
					return false;
				}
				return true;
			},
		},
		studentInfo: [
			{
				name: { type: String, required: true, maxLength: 150 },
				email: {
					type: String,
					required: true,
					validate: (val) => {
						if (!validator.isEmail(val)) {
							return false;
						}
						return true;
					},
				},
				degree: {
					type: String,
					enum: [
						"Bachelor of Engineering",
						"Bachelor of Technology",
						"Master of Technology",
						"PhD",
						"JRF",
						"Research Assistant",
					],
					required: true,
				},
				socialLinks: {
					type: String,
					required: true,
					validate: (val) => {
						if (!validator.isURL(val)) {
							return false;
						}
						return true;
					},
				},
			},
		],
		projectBrief: {
			type: String,
			minLength: 50,
			required: true,
		},
		projectType: {
			type: String,
			enum: ["project based", "application based", "both"],
			required: true,
		},
		batch: {
			type: Number,
			required: String,
		},
	},
	{
		timestamps: true,
	},
);

module.exports = mongoose.model("Project", ProjectSchema);
