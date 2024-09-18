const jwt = require("jsonwebtoken");
const Account = require("../model/account");
const apiResponse = require("../utils/apiResponse");

/**
 * Middleware to authenticate JWT token attached to authroization header.
 * Authentication involve verifying JWT token and rferencing with the accountId in DB.
 * If successful, attach {acc, rawToken, decodedToken} to `res.locals` field for successive middleware to access
 * @param {*} req Request Object
 * @param {*} res Response Object
 * @param {*} next Next middleware in chain
 *
 * - Notes: `acc`: account model field
 */
const JWTAuthentication = async (req, res, next) => {
	try {
		const token = req.header("Authorization").slice("Bearer ".length);
		// console.log(token);
		const decoded = jwt.verify(token, process.env.JWT_SECRET, {
			algorithms: "HS256",
		});
		// Check account id present in DB
		const acc = await Account.findOne({ _id: decoded.id });
		if (!acc) throw new Error("id in token is not valid");

		res.locals.acc = acc;
		res.locals.token = token;
		res.locals.decodedToken = decoded;

		next();
	} catch (err) {
		// console.log(err);
		res.status(401).send(
			apiResponse(null, {
				code: "TOKEN VERICATION FAILED",
				message: err.toString(),
			}),
		);
	}
};

module.exports = JWTAuthentication;
