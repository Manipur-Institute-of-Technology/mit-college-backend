const express = require("express");

const {
	HeaderFieldValidator,
	ReqFieldValidator,
} = require("../middleware/FieldValidator");
const JWTAuthentication = require("../middleware/JWTAuthentication");
const Authorization = require("../middleware/Authorization");

const {
	getAccountsGet,
	getAccountFilterGet,
	accountSearchEmailGet,
	accountSearchUsernameGet,
	accountPatch,
	accountDelete,
	accountDetailGet,
} = require("../controllers/adminController");

const mongoose = require("mongoose");

const router = new express.Router();

router.get(
	"/getaccounts",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	getAccountsGet,
);

router.get(
	"/getaccounts/filter",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "MISSING_QUERY_PARAMS",
			message: "accountType and status param should be present in query",
		},
		[
			{
				location: "query",
				keys: ["accountType"],
				values: ["admin", "faculty", ""],
			},
			{
				location: "query",
				keys: ["status"],
				
			},
		],
	),
	getAccountFilterGet,
);

router.get(
	"/account/search/email",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "MISSING_FORM_FIELD",
			message: "req field is not complete",
		},
		[
			{
				location: "query",
				keys: ["q"],
				validatorCb: (val) =>
					typeof val === "string" &&
					val.trim().length !== 0 &&
					validator.isEmail(val),
			},
		],
	),
	accountSearchEmailGet,
);

router.get(
	"/account/search/username",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "MISSING_FORM_FIELD",
			message: "req field is not complete",
		},
		[
			{
				location: "query",
				keys: ["q"],
				validatorCb: (val) =>
					typeof val === "string" && val.trim().length !== 0,
			},
		],
	),
	accountSearchUsernameGet,
);

// TODO: Send mail to user when their account status get updated
// Controller will update account status, for faculty account
//  a new perm token will be generated everytime account sttaus is updated
router.patch(
	"/account/",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "MISSING_FORM_FIELD",
			message: "req field is not complete",
		},
		[
			{
				location: "body",
				keys: ["accountId"],
				validatorCb: (val) => mongoose.Types.ObjectId.isValid(val.toString()),
			},
			{
				location: "body",
				keys: ["status"],
				
			},
		],
	),
	accountPatch,
);

router.delete(
	"/account/",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "MISSING_FORM_FIELD",
			message: "req field is not complete",
		},
		[
			{
				location: "body",
				keys: ["accountId"],
				validatorCb: (val) => mongoose.Types.ObjectId.isValid(val.toString()),
			},
		],
	),
	accountDelete,
);

router.get(
	"/account/detail/:accountId",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	Authorization(["admin"]),
	ReqFieldValidator(
		{
			code: "MISSING_FORM_FIELD",
			message: "req field is not complete",
		},
		[
			{
				location: "params",
				keys: ["accountId"],
				validatorCb: (val) => mongoose.Types.ObjectId.isValid(val.toString()),
			},
		],
	),
	accountDetailGet,
);

// TODO: add route for user to regenerate their perm token
module.exports = router;
