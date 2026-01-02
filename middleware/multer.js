const multer = require("multer");
const path = require("path");
const fs = require("fs");

function createUploader(folderName) {
	const uploadDir = path.join(
		process.cwd(),
		"uploads",
		folderName
	);

	if (!fs.existsSync(uploadDir)) {
		fs.mkdirSync(uploadDir, { recursive: true });
	}

	const storage = multer.diskStorage({
		destination: function (req, file, cb) {
			cb(null, uploadDir);
		},
		filename: function (req, file, cb) {
			const uniqueName =
				Date.now() + "-" + Math.round(Math.random() * 1e9);
			cb(null, uniqueName + path.extname(file.originalname));
		},
	});

	return multer({
		storage: storage,
		limits: { fileSize: 10 * 1024 * 1024 },
	});
}

module.exports = createUploader;
