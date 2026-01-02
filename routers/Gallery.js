const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Gallery = require("../model/gallery");
const Image = require("../model/image");

const {
	ReqFieldValidator,
	HeaderFieldValidator,
} = require("../middleware/FieldValidator");
const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

const router = express.Router();

router.post(
	"/add",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "MISSING_FORM_FIELD",
			message: "Required fields missing",
		},
		[
			{ location: "body", keys: ["galleryName"] },
		],
	),
	async (req, res) => {
		try {
			const { galleryName, is_normal_gallery = true } = req.body;

			if (galleryName.includes("..") || galleryName.includes("/")) {
				return res.status(400).json({
					message: "Invalid gallery name",
				});
			}

			const folderPath = path.join(
				process.cwd(),
				"uploads",
				"gallery",
				galleryName
			);

			if (!fs.existsSync(folderPath)) {
				fs.mkdirSync(folderPath, { recursive: true });
			}

			const gallery = await Gallery.create({
				galleryName,
				is_normal_gallery,
			});

			res.status(201).json({
				success: true,
				data: gallery,
			});
		} catch (err) {
			if (err.code === 11000) {
				return res.status(400).json({
					message: "Gallery already exists",
				});
			}
			res.status(500).json({ message: err.message });
		}
	}
);

router.get(
	"/",
	async (req, res) => {
		try {
			const galleries = await Gallery.find().lean();
			const galleryIds = galleries.map((g) => g._id);

			const images = await Image.find({
				gallery: { $in: galleryIds },
			}).lean();

			const imageMap = {};
			galleries.forEach((g) => (imageMap[g._id] = []));

			images.forEach((img) => {
				imageMap[img.gallery].push(img);
			});

			const result = galleries.map((g) => ({
				...g,
				images: imageMap[g._id],
			}));

			res.json({
				success: true,
				data: result,
			});
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	}
);

router.get(
	"/:name",
	async (req, res) => {
		try {
			const gallery = await Gallery.findOne({
				galleryName: req.params.name,
			});

			if (!gallery) {
				return res.status(404).json({
					message: "Gallery not found",
				});
			}

			const images = await Image.find({
				gallery: gallery._id,
			});

			res.json({
				success: true,
				data: images,
			});
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	}
);

router.post(
	"/edit/:id",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "INVALID_OBJECT_ID",
			message: "Invalid gallery id",
		},
		[
			{
				location: "params",
				keys: ["id"],
				validatorCb: (val) =>
					mongoose.Types.ObjectId.isValid(val),
			},
		],
	),
	async (req, res) => {
		try {
			const { galleryName, is_normal_gallery } = req.body;

			if (galleryName && (galleryName.includes("..") || galleryName.includes("/"))) {
				return res.status(400).json({
					message: "Invalid gallery name",
				});
			}

			const gallery = await Gallery.findById(req.params.id);
			if (!gallery) {
				return res.status(404).json({
					message: "Gallery not found",
				});
			}

			/* ---------- Rename folder if galleryName changed ---------- */
			if (galleryName && galleryName !== gallery.galleryName) {
				const oldPath = path.join(
					process.cwd(),
					"uploads",
					"gallery",
					gallery.galleryName
				);

				const newPath = path.join(
					process.cwd(),
					"uploads",
					"gallery",
					galleryName
				);

				if (fs.existsSync(newPath)) {
					return res.status(400).json({
						message: "Gallery folder already exists",
					});
				}

				if (fs.existsSync(oldPath)) {
					fs.renameSync(oldPath, newPath);
				}

				gallery.galleryName = galleryName;
			}

			/* ---------- Update is_normal_gallery ---------- */
			if (typeof is_normal_gallery === "boolean") {
				gallery.is_normal_gallery = is_normal_gallery;
			}

			await gallery.save();

			res.json({
				success: true,
				message: "Gallery updated successfully",
				data: gallery,
			});
		} catch (err) {
			if (err.code === 11000) {
				return res.status(400).json({
					message: "Gallery name already exists",
				});
			}
			res.status(500).json({ message: err.message });
		}
	}
);

router.delete(
	"/delete/:id",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "INVALID_OBJECT_ID",
			message: "Invalid gallery id",
		},
		[
			{
				location: "params",
				keys: ["id"],
				validatorCb: (val) =>
					mongoose.Types.ObjectId.isValid(val),
			},
		],
	),
	async (req, res) => {
		try {
			const gallery = await Gallery.findById(req.params.id);
			if (!gallery) {
				return res.status(404).json({
					message: "Gallery not found",
				});
			}

			await Image.deleteMany({ gallery: gallery._id });

			const folderPath = path.join(
				process.cwd(),
				"uploads",
				"gallery",
				gallery.galleryName
			);

			if (fs.existsSync(folderPath)) {
				fs.rmSync(folderPath, { recursive: true, force: true });
			}

			await gallery.deleteOne();

			res.json({
				success: true,
				message: "Gallery deleted successfully",
			});
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	}
);

module.exports = router;
