const Account = require("../../model/account");
const FacultyProfile = require("../../model/facultyProfile");

const apiResponse = require("../../utils/apiResponse");

const loginPostHandler = async (req, res) => {
	try {
		const {
			email,
			password,
			accountType,
			securityCode,
		} = req.body;

		let account;

		// =====================================================
		// ADMIN LOGIN
		// =====================================================

		if (accountType === "admin") {
			// Admin can ONLY use email + password
			if (!email || !password) {
				throw new Error("Admin email and password required");
			}

			account = await Account.findAndCheckCredential(
				email,
				password,
				"admin",
			);
		}

		// =====================================================
		// FACULTY LOGIN USING SECURITY CODE
		// =====================================================

		else if (
			accountType === "faculty" &&
			securityCode
		) {
			const cleanSecurityCode =
				String(securityCode).trim();

			// Must be exactly 6 digits
			if (!/^\d{6}$/.test(cleanSecurityCode)) {
				throw new Error("Invalid security code");
			}

			// Find faculty profile
			const facultyProfile =
				await FacultyProfile.findOne({
					securityCode: cleanSecurityCode,
				});

			if (!facultyProfile) {
				throw new Error("Invalid security code");
			}

			// Find associated faculty account
			account = await Account.findOne({
				_id: facultyProfile.accountId,
				accountType: "faculty",
			});

			if (!account) {
				throw new Error("Faculty account not found");
			}
		}

		// =====================================================
		// FACULTY LOGIN USING EMAIL + PASSWORD
		// =====================================================

		else if (
			accountType === "faculty" &&
			email &&
			password
		) {
			account = await Account.findAndCheckCredential(
				email,
				password,
				"faculty",
			);
		}

		// =====================================================
		// INVALID REQUEST
		// =====================================================

		else {
			throw new Error("Invalid login credentials");
		}

		console.log(account);

		// =====================================================
		// GENERATE JWT
		// =====================================================

		const token =
			await account.generateAuthToken();

		// =====================================================
		// RESPONSE
		// =====================================================

		res.status(202).send(
			apiResponse({
				message: "account login successful",
				account: {
					_id: account._id,
					accountType: account.accountType,
					email: account.email,
					username: account.username,
					status: account.status,
				},
				token,
			}),
		);

	} catch (err) {
		console.error("LOGIN ERROR:", err);

		res.status(400).send(
			apiResponse(null, {
				code: "AUTHETICATION_FAILURE",
				message: "invalid credential",
			}),
		);
	}
};

module.exports = {
	loginPostHandler,
};