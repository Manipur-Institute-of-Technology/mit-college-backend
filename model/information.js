const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const InformationSchema = new Schema(
	{
		fileName: { type: String, required: true },
		title: { type: String, required: true, maxLength: 100 },
		type: {
			type: String,
			enum: ["exam", "admission", "form fillup", "miscellaneous"],
			default: "miscellaneous",
		},
		submittedBy: {
			// account ID
			type: Schema.Types.ObjectId,
			ref: "Account",
			required: true,
		},
	},
	{ timestamps: true },
);

module.exports = mongoose.model("Information", InformationSchema);
