const path = require("path");
const fs = require("fs");

const express = require("express");
const mongoose = require("mongoose");

const createUploader = require("../middleware/multer");
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
	"/add/:galleryName",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	async (req, res) => {
		try {
			const { galleryName } = req.params;

			const gallery = await Gallery.findOne({ galleryName });
			if (!gallery) {
				return res.status(404).json({
					message: "Gallery not found",
				});
			}

			const upload = createUploader(`gallery/${galleryName}`);

			upload.single("image")(req, res, async (err) => {
				if (err) {
					return res.status(400).json({ message: err.message });
				}

				const imageUrl = `/uploads/gallery/${galleryName}/${req.file.filename}`;

				const image = await Image.create({
					gallery: gallery._id,
					filename: req.file.filename,
					path: req.file.path,
					imageUrl,
					size: req.file.size,
					mimetype: req.file.mimetype,
					caption: req.body.caption || "",
				});

				res.status(201).json({
					success: true,
					data: image,
				});
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
      message: "Invalid image id",
    },
    [
      {
        location: "params",
        keys: ["id"],
        validatorCb: (val) => mongoose.Types.ObjectId.isValid(val),
      },
    ]
  ),
  async (req, res) => {
    try {
      const imageDoc = await Image.findById(req.params.id).populate("gallery");
      if (!imageDoc) {
        return res.status(404).json({ message: "Image not found" });
      }

      const { caption, galleryName } = req.body;

      if (caption === undefined && galleryName === undefined) {
        return res.status(400).json({
          message: "At least one field (caption or galleryName) is required",
        });
      }

      if (caption !== undefined) {
        imageDoc.caption = caption;
      }

	  if (
	  galleryName &&
	  imageDoc.gallery &&
	  galleryName !== imageDoc.gallery.galleryName
	  ) {
	  const newGallery = await Gallery.findOne({ galleryName });
	  if (!newGallery) {
	  	return res.status(404).json({
	  	message: "Target gallery not found",
	  	});
	  }

	  if (!imageDoc.imageUrl) {
	  	return res.status(400).json({
	  	message: "imageUrl missing; cannot move file",
	  	});
	  }

	  const oldAbsolutePath = path.join(
	  	process.cwd(),
	  	imageDoc.imageUrl.replace(/^\//, "")
	  );

	  const filename = path.basename(imageDoc.imageUrl);

	  const relativeNewPath = path.join(
	  	"uploads",
	  	"gallery",
	  	newGallery.galleryName,
	  	filename
	  );
  
	  const newAbsolutePath = path.join(process.cwd(), relativeNewPath);

	  fs.mkdirSync(path.dirname(newAbsolutePath), { recursive: true });

	  if (fs.existsSync(oldAbsolutePath)) {
	  	fs.renameSync(oldAbsolutePath, newAbsolutePath);
	  } else {
	  	console.warn("Old file not found:", oldAbsolutePath);
	  }

	  imageDoc.gallery = newGallery._id;
	  imageDoc.imageUrl = `/${relativeNewPath.replace(/\\/g, "/")}`;
	  }

      await imageDoc.save();

      res.json({
        success: true,
        message: "Image updated successfully",
        data: imageDoc,
      });
    } catch (err) {
      console.error("EDIT IMAGE ERROR:", err);
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
      message: "Invalid image id",
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
      const image = await Image.findById(req.params.id);
      if (!image) {
        return res.status(404).json({
          message: "Image not found",
        });
      }

      if (image.imageUrl) {
        const absolutePath = path.join(
          process.cwd(),
          image.imageUrl.replace(/^\//, "")
        );

        if (fs.existsSync(absolutePath)) {
          fs.unlinkSync(absolutePath);
        }
      }

      await image.deleteOne();

      res.json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (err) {
      console.error("DELETE IMAGE ERROR:", err);
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
