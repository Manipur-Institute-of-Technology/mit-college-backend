const Account = require("../model/account");
const apiResponse = require("../utils/apiResponse");

/**
 * Authorization middleware
 * MUST be used after JWT auth middleware
 *
 * @param {Array<string>} accountTypes - ["admin", "faculty"]
 * @param {Array<string>} accountStatuses - ["active", "pending", "inactive"]
 */
const Authorization =
	(accountTypes = [], accountStatuses = []) =>
	async (req, res, next) => {
		try {
			const accountID = res.locals.decodedToken?.id;

			if (!accountID) {
				return res.status(401).json(
					apiResponse(null, {
						code: "TOKEN_MISSING",
						message: "Token payload missing",
					})
				);
			}

			const account = await Account.findById(accountID);

			if (!account) {
				return res.status(401).json(
					apiResponse(null, {
						code: "TOKEN_VERIFICATION_FAILED",
						message: "Invalid token account",
					})
				);
			}

			if (
				accountTypes.length &&
				!accountTypes.includes(account.accountType)
			) {
				return res.status(403).json(
					apiResponse(null, {
						code: "ACCESS_DENIED",
						message: `Only ${accountTypes.join(", ")} can access this API`,
					})
				);
			}

			if (
				accountStatuses.length &&
				!accountStatuses.includes(account.status)
			) {
				return res.status(403).json(
					apiResponse(null, {
						code: "ACCOUNT_NOT_ALLOWED",
						message: `Account must be ${accountStatuses.join(", ")}`,
					})
				);
			}

			req.account = account;
			next();
		} catch (err) {
			return res.status(500).json(
				apiResponse(null, {
					code: "AUTH_ERROR",
					message: "Authorization failed",
				})
			);
		}
	};

module.exports = Authorization;
