const jwt = require("jsonwebtoken");
const Account = require("../model/account");
const apiResponse = require("../utils/apiResponse");

const JWTAuthentication = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json(
        apiResponse(null, {
          code: "TOKEN_MISSING",
          message: "Authorization token is required",
        })
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      throw new Error("Token payload missing id");
    }

    const acc = await Account.findById(decoded.id);

    if (!acc) {
      throw new Error("Account not found for token");
    }

    req.token = token;
    req.user = acc;

    res.locals.decodedToken = decoded;
    res.locals.acc = acc;

    next();
  } catch (err) {
    return res.status(401).json(
      apiResponse(null, {
        code: "TOKEN_VERIFICATION_FAILED",
        message: err.message,
      })
    );
  }
};

module.exports = JWTAuthentication;
