const apiResponse = require("../utils/apiResponse");

// Check Req contain the given key
const ReqFieldValidator = (err, fields) => {
	return (req, res, next) => {
		for (let { location, keys, values, validatorCb, setter, error } of fields) {
			if (!location || !keys)
				throw new Error("location and keys should be present");
			// Check fields present
			let field = req[location];
			for (let key of keys) {
				if (!(key in field)) {
					return res.status(400).json(
						apiResponse(null, {
							code: "REQ_FIELD_VALIDATION_ERROR",
							message: error === undefined ? err : error,
						}),
					);
				}
				field = field[key];
			}
			// Check allow values
			if (values && values.filter((d) => d === field).length === 0) {
				return res.status(400).json(
					apiResponse(null, {
						code: "REQ_FIELD_VALIDATION_ERROR",
						message: `invalid value for location: ${location.toString()} and key: ${keys.join(
							".",
						)}. Result: ${error}`,
					}),
				);
			}
			// Check Validator callback
			if (validatorCb && !validatorCb(field)) {
				return res.status(400).json(
					apiResponse(null, {
						code: "REQ_FIELD_VALIDATION_ERROR",
						message: `validation failed for location: ${location.toString()} and key: ${keys.join(
							".",
						)}. Result: ${error}`,
					}),
				);
			}

			// Set value to req
			if (setter) {
				for (const { fieldName, value } of setter(field)) {
					res.locals[fieldName] = value;
				}
			}
		}
		next();
	};
};

/**
 *  Middleware to check header contain the given key
 * @param  {...string} headerKeys
 */
const HeaderFieldValidator =
	(...headerKeys) =>
	(req, res, next) => {
		for (let headerKey of headerKeys) {
			if (!req.header(headerKey)) {
				return res.status(400).send(
					apiResponse(null, {
						code: "MISSING HEADER FIELD",
						message: `${headerKey} header key required`,
					}),
				);
			}
		}
		next();
	};

module.exports = {
	ReqFieldValidator,
	HeaderFieldValidator,
};
