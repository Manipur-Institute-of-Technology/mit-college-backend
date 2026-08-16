const express = require("express");
const validator = require("validator");
const apiResponse = require("../utils/apiResponse");
const Account = require("../model/account")
const RequestFaculty = require("../model/requestFaculty")
const FacultyProfile = require("../model/facultyProfile")
const Department = require("../model/department");
const createUploader = require("../middleware/multer");

const {
	ReqFieldValidator,
	HeaderFieldValidator,
} = require("../middleware/FieldValidator");
const JWTAuthentication = require("../middleware/JWTAuthentication");
const OTPInterval = require("../middleware/OTPInterval");
const Authorization = require("../middleware/Authorization");

const {
	loginPostHandler,
	signupPostHandler,
	verifyEmailGet,
	verifyEmailPost,
	forgotPasswordGet,
	forgotPasswordPermTokenPost,
	forgotPasswordOTPPost,
	forgotPasswordVerifyOTPPost,
	changePasswordPost,
} = require("../controllers/accountController");

const { passwordValidator } = require("../utils/passwordValidator");

const router = new express.Router();

router.post(
  "/login",
  async (req, res, next) => {
    try {
      const {
        email,
        password,
        securityCode,
        accountType,
      } = req.body;

      // -----------------------------------------
      // Email
      // -----------------------------------------

      if (!email || !validator.isEmail(email)) {
        return res.status(400).json(
          apiResponse(null, {
            code: "INVALID_EMAIL",
            message: "Valid email is required",
          })
        );
      }

      // -----------------------------------------
      // Account type
      // -----------------------------------------

      if (
        !["faculty", "admin"].includes(accountType)
      ) {
        return res.status(400).json(
          apiResponse(null, {
            code: "INVALID_ACCOUNT_TYPE",
            message: "Invalid account type",
          })
        );
      }

      // -----------------------------------------
      // Admin MUST use password
      // -----------------------------------------

      if (accountType === "admin") {
        if (
          !password ||
          !passwordValidator(password)
        ) {
          return res.status(400).json(
            apiResponse(null, {
              code: "INVALID_PASSWORD",
              message: "Valid password is required",
            })
          );
        }
      }

      // -----------------------------------------
      // Faculty
      // -----------------------------------------

      if (accountType === "faculty") {
        const hasPassword =
          typeof password === "string" &&
          password.length > 0;

        const hasSecurityCode =
          typeof securityCode === "string" &&
          /^\d{6}$/.test(securityCode);

        if (!hasPassword && !hasSecurityCode) {
          return res.status(400).json(
            apiResponse(null, {
              code: "MISSING_LOGIN_CREDENTIAL",
              message:
                "Faculty password or 6-digit security code is required",
            })
          );
        }

        // Don't allow both
        if (hasPassword && hasSecurityCode) {
          return res.status(400).json(
            apiResponse(null, {
              code: "INVALID_LOGIN_CREDENTIAL",
              message:
                "Use either password or security code",
            })
          );
        }

        if (
          hasPassword &&
          !passwordValidator(password)
        ) {
          return res.status(400).json(
            apiResponse(null, {
              code: "INVALID_PASSWORD",
              message: "Invalid password",
            })
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  },
  loginPostHandler
);

router.post(
	"/signup",
	ReqFieldValidator(
		{
			code: "MISSING_AUTHENTICATION_INFO",
			message: "credential required",
		},
		[
			{
				location: "body",
				keys: ["email"],
				validatorCb: (val) => validator.isEmail(val),
				error: "Invalid Email",
			},
			{
				location: "body",
				keys: ["username"],
				validatorCb: (val) => validator.isAlphanumeric(val),
				error: "Invalid Username, should contain only AlphaNumeric character",
			},
			{
				location: "body",
				keys: ["password"],
				validatorCb: (val) => passwordValidator(val),
				error:
					"password musn't contain password, password should contain min 1 uppercase, 1 lowercase, 1 special character, 1 num and min length of 7",
			},
			{
				location: "body",
				keys: ["accountType"],
				values: ["admin", "faculty"],
				error: "account type should be faculty and admin only",
			},
		],
	),
	signupPostHandler,
);

router.post("/logout", async (req, res) => {
  try {
    const { email, token } = req.body;

    const user = await Account.findOne({ email });
    if (!user) {
      return res.status(404).send(
        apiResponse(null, {
          code: "USER_NOT_FOUND",
          message: "Account not found",
        })
      );
    }

    user.tokens = user.tokens.filter((t) => t.token !== token);
    await user.save();

    res.status(200).send(
      apiResponse({
        message: "Logged out successfully",
      })
    );
  } catch (err) {
    res.status(500).send(
      apiResponse(null, {
        code: "LOGOUT_ERROR",
        message: err.toString(),
      })
    );
  }
});

router.post("/logoutAll", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await Account.findOne({ email });
    if (!user) {
      return res.status(404).send(
        apiResponse(null, {
          code: "USER_NOT_FOUND",
          message: "Account not found",
        })
      );
    }

    user.tokens = [];
    await user.save();

    res.status(200).send(
      apiResponse({
        message: "Logged out from all devices",
      })
    );
  } catch (err) {
    res.status(500).send(
      apiResponse(null, {
        code: "LOGOUT_ALL_ERROR",
        message: err.toString(),
      })
    );
  }
});

router.delete("/delete", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).send(
        apiResponse(null, {
          code: "MISSING_EMAIL",
          message: "Email is required",
        })
      );
    }

    const account = await Account.findOneAndDelete({ email });

    if (!account) {
      return res.status(404).send(
        apiResponse(null, {
          code: "USER_NOT_FOUND",
          message: "Account not found",
        })
      );
    }

    res.status(200).send(
      apiResponse({
        message: "Account deleted successfully",
      })
    );
  } catch (err) {
    res.status(500).send(
      apiResponse(null, {
        code: "DELETE_ACCOUNT_ERROR",
        message: err.toString(),
      })
    );
  }
});

router.get(
	"/verify/email",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	OTPInterval(1, "mailVerification"),
	verifyEmailGet,
);

router.post(
	"/verify/email",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	ReqFieldValidator(
		{
			code: "MISSING_AUTHENTICATION_INFO",
			message: "OTP code missing",
		},
		[
			{
				location: "body",
				keys: ["mailOTPCode"],
				validatorCb: (val) => val.length === +process.env.OTP_TOKEN_LEN,
			},
		],
	),
	verifyEmailPost,
);

// TODO: Implement controller
router.post(
  "/forgotpassword",
  ReqFieldValidator(
    {
      code: "MISSING_REQ_FIELD",
      message: "invalid req field",
    },
    [
      {
        location: "body",
        keys: ["email"],
        validatorCb: (val) =>
          typeof val === "string" && validator.isEmail(val),
        error: "Valid email is required",
      },
      {
        location: "body",
        keys: ["accountType"],
        values: ["admin", "faculty"],
        error: "Account type must be admin or faculty",
      },
    ],
  ),
  forgotPasswordGet,
);

router.post(
	"/forgotpassword/otp",
	ReqFieldValidator(
		{
			code: "MISSING_REQ_FIELD",
			message: "invalid req field",
		},
		[
			{
				location: "body",
				keys: ["otpToken"],
			},
			{
				location: "body",
				keys: ["password"],
				validatorCb: (val) => passwordValidator(val),
			},
		],
	),
	forgotPasswordOTPPost,
);

router.post(
	"/forgotpassword/permtoken",
	Authorization(["faculty"]),
	ReqFieldValidator(
		{
			code: "MISSING_REQ_FIELD",
			message: "invalid req field",
		},
		[
			{
				location: "body",
				keys: ["permToken"],
				validatorCb: (val) => val.length === +process.env.PERM_TOKEN_LEN,
			},
			{
				location: "body",
				keys: ["password"],
				validatorCb: (val) => passwordValidator(val),
			},
		],
	),
	forgotPasswordPermTokenPost,
);

// TODO: Route to validate OTP sent for forgot password
router.post(
	"/forgotpassword/verify/otp",
	ReqFieldValidator(
		{
			code: "MISSING_REQ_FIELD",
			message: "invalid req field",
		},
		[
			{
				location: "body",
				keys: ["otpToken"],
				validatorCb: (val) => val.length === +process.env.OTP_TOKEN_LEN,
			},
			{
				location: "body",
				keys: ["otpId"],
			},
		],
	),
	forgotPasswordVerifyOTPPost,
);

router.post(
	"/changepassword/",
	HeaderFieldValidator("Authorization"),
	JWTAuthentication,
	ReqFieldValidator(
		{
			code: "MISSING_REQ_FIELD",
			message: "missing req field",
		},
		[
			{
				location: "body",
				keys: ["oldPassword"],
				validatorCb: (val) => passwordValidator(val),
				error:
					"password musn't contain password, password should contain min 1 uppercase, 1 lowercase, 1 special character, 1 num and min length of 7",
			},
			{
				location: "body",
				keys: ["newPassword"],
				validatorCb: (val) => passwordValidator(val),
				error:
					"password musn't contain password, password should contain min 1 uppercase, 1 lowercase, 1 special character, 1 num and min length of 7",
			},
		],
	),
	changePasswordPost,
);

const facultyPhotoUpload = createUploader("faculty");

router.post(
  "/requestfaculty",
  facultyPhotoUpload.single("photo"),
  async (req, res) => {
    try {
      const {
        email,
        departmentName,
        ...facultyData
      } = req.body;

      // -----------------------------------------
      // Check photo
      // -----------------------------------------

      if (!req.file) {
        return res.status(400).json(
          apiResponse(null, {
            code: "PHOTO_REQUIRED",
            message: "Profile photo is required",
          })
        );
      }

      // -----------------------------------------
      // Check email
      // -----------------------------------------

      if (!email) {
        return res.status(400).json(
          apiResponse(null, {
            code: "EMAIL_REQUIRED",
            message: "Email is required",
          })
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      // -----------------------------------------
      // Check existing request
      // -----------------------------------------

      const exists = await RequestFaculty.findOne({
        email: normalizedEmail,
      });

      if (exists) {
        return res.status(400).json(
          apiResponse(null, {
            code: "REQUEST_ALREADY_EXISTS",
            message: "Faculty request already submitted",
          })
        );
      }

      // -----------------------------------------
      // Check department
      // -----------------------------------------

      if (!departmentName) {
        return res.status(400).json(
          apiResponse(null, {
            code: "INVALID_DEPARTMENT",
            message: "Department is required",
          })
        );
      }

      const department = await Department.findOne({
        name: departmentName.trim().toLowerCase(),
      });

      if (!department) {
        return res.status(400).json(
          apiResponse(null, {
            code: "INVALID_DEPARTMENT",
            message: "Selected department does not exist",
          })
        );
      }

      // -----------------------------------------
      // Create request
      // -----------------------------------------

      const request = new RequestFaculty({
        ...facultyData,

        email: normalizedEmail,

        // Backend resolves MongoDB department ID
        departmentId: department._id,

        // Store uploaded filename
        photoId: req.file.filename,
      });

      await request.save();

      // -----------------------------------------
      // Success
      // -----------------------------------------

      return res.status(201).json(
        apiResponse({
          message: "Faculty request submitted successfully",

          requestId: request._id,

          photoId: request.photoId,
        })
      );
    } catch (err) {
      return res.status(500).json(
        apiResponse(null, {
          code: "REQUEST_FACULTY_ERROR",
          message: err.message || err.toString(),
        })
      );
    }
  }
);

router.get(
  "/requestfaculty",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const requests = await RequestFaculty.find()
        .populate("departmentId", "name")
        .sort({ createdAt: -1 });

      res.json(
        apiResponse({
          count: requests.length,
          requests,
        })
      );
    } catch (err) {
      res.status(500).json(
        apiResponse(null, {
          code: "FETCH_REQUESTS_FAILED",
          message: err.toString(),
        })
      );
    }
  }
);

const generateSecurityCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post(
  "/requestfaculty/accept/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const request = await RequestFaculty.findById(req.params.id);

      if (!request) {
        return res.status(404).json({
          error: "Request not found",
        });
      }

      // Generate unique 6-digit security code
      let securityCode;
      let existingCode;

      do {
        securityCode = generateSecurityCode();

        existingCode = await FacultyProfile.findOne({
          securityCode,
        });
      } while (existingCode);

      // Create faculty account
      const account = new Account({
        email: request.email,
        username: request.username,
        password: request.password,
        accountType: "faculty",
      });

      account._passwordAlreadyHashed = true;

      await account.save();

      // Create faculty profile
      await FacultyProfile.create({
        accountId: account._id,
        email: request.email,
        phoneNumber: request.phoneNumber,
        photoId: request.photoId,
        namePrefix: request.namePrefix,
        firstName: request.firstName,
        middleName: request.middleName,
        lastName: request.lastName,
        sex: request.sex,
        dob: request.dob,
        departmentId: request.departmentId,
        hod: request.hod,
        highestDegree: request.highestDegree,
        expertFields: request.expertFields,
        roles: request.roles,
        bios: request.bios,
        contactInfo: [],

        // 6-digit login/security code
        securityCode,
      });

      // Delete pending request
      await request.deleteOne();

      res.json({
        success: true,
        message: "Faculty approved successfully",
        securityCode,
      });

    } catch (err) {
      res.status(500).json({
        error: err.message,
      });
    }
  }
);

router.delete(
  "/requestfaculty/delete/:id",
  JWTAuthentication,
  Authorization(["admin"]),
  async (req, res) => {
    try {
      const request = await RequestFaculty.findById(req.params.id);
      if (!request) {
        return res.status(404).json(
          apiResponse(null, {
            code: "REQUEST_NOT_FOUND",
            message: "Faculty request not found",
          })
        );
      }

      await request.deleteOne();

      res.json(
        apiResponse({
          message: "Faculty request deleted successfully",
        })
      );
    } catch (err) {
      res.status(500).json(
        apiResponse(null, {
          code: "DELETE_REQUEST_FAILED",
          message: err.toString(),
        })
      );
    }
  }
);

module.exports = router;
