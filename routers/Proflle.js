const express = require("express");

const {
	ReqFieldValidator,
	HeaderFieldValidator,
} = require("../middleware/FieldValidator");
const FacultyProfileFieldVal = require("../utils/FacultyProfileFieldVal");

const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");
const {
	profileDeleteHandler,
	profileDeleteHandlerAdmin,
} = require("../controllers/ProfileControllers/deleteProfileController");
const {
	profileGetHandler,
	profileGetHandlerFaculty,
} = require("../controllers/profileController");

const router = new express.Router();

const profileIDValidator = ReqFieldValidator(
	{
		code: "MISSING_FORM_FIELD",
		message: "req field is not complete",
	},
	[
		{
			location: "params",
			keys: ["profileId"],
			validatorCb: (val) => mongoose.Types.ObjectId.isValid(val.toString()),
		},
	],
);

router.post(
	"/",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["faculty"], ["active"]),
	FacultyProfileFieldVal(),
	async (req, res) => {
		// Profile Create Route
		// TODO: Get  profile image from req
	},
);

router.patch(
	"/",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["faculty"], ["active"]),
	FacultyProfileFieldVal(),
	// Profile Update field controller
);

router.delete(
	"/",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["faculty"], ["active"]),
	profileDeleteHandler,
);

router.get(
	"/",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["faculty"], ["active"]),
	profileGetHandlerFaculty,
);

// Get faculty Profile Detail
router.get("/:profileId", profileIDValidator(), profileGetHandler);

router.patch(
	"/:profileId",
	profileIDValidator(),
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"], ["active"]),
	// TODO: profile patch by admin
);

// Delete Profile  by admins
router.delete(
	"/:profileId",
	profileIDValidator(),
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"], ["active"]),
	profileDeleteHandlerAdmin,
);

module.exports = router;
