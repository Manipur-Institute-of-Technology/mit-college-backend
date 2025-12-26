const mongoose = require("mongoose");
const department = require("./department");

const Schema = new mongoose.Schema();

const PhotoSchema = new Schema(
	{
		fileName: { type: String, required: true },
		caption: { type: String, required: true, maxLength: 100 },
		galleryId: { type: Schema.Types.ObjectId, ref: "Gallery", required: false },
		carousal : {type: Boolean, required: true},
		department: {type: Schema.Types.ObjectId, ref: "department", required: false }
	},
	{ timestamps: true },
);

module.exports = mongoose.model("Photo", PhotoSchema);
