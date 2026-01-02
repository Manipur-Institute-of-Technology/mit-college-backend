const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ImageSchema = new Schema(
	{
		imageUrl: {
			type: String,
			required: true,
		},
		caption: {
			type: String,
			maxLength: 200,
		},

		gallery: {
			type: Schema.Types.ObjectId,
			ref: "Gallery",
			required: true,
		},
	},
	{ timestamps: true },
);

module.exports = mongoose.model("Image", ImageSchema);
