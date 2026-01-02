const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GallerySchema = new Schema(
	{
		galleryName: {
			type: String,
			required: true,
			unique: true,          // IMPORTANT
			maxLength: 100,
			trim: true,
		},

		// true  → show in gallery page
		// false → carousel / department / system folders
		is_normal_gallery: {
			type: Boolean,
			default: true,
		},
	},
	{ timestamps: true },
);

/**
 * Auto delete images when gallery is deleted
 */
GallerySchema.pre("findOneAndDelete", async function (next) {
	const galleryId = this.getQuery()._id;
	await mongoose.model("Image").deleteMany({ gallery: galleryId });
	next();
});

module.exports = mongoose.model("Gallery", GallerySchema);
