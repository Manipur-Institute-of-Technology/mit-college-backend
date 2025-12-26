const mongoose = require("mongoose");

const Account = require("../../model/account");

const apiResponse = require("../../utils/apiResponse");

const signupPostHandler = async (req, res) => {
  try {
    let account = await Account.findOne({
      username: req.body.username,
      accountType: req.body.accountType,
    });
    if (account) {
      return res.status(400).send(
        apiResponse(null, {
          code: "INVALID_ACCOUNT_INFO",
          message: "username already exist",
        })
      );
    }

    account = await Account.findOne({
      email: req.body.email,
      accountType: req.body.accountType,
    });
    if (account) {
      return res.status(400).send(
        apiResponse(null, {
          code: "INVALID_ACCOUNT_INFO",
          message: "email already exist",
        })
      );
    }

    const nAccount = new Account({ ...req.body, status: "inactive" });
    await nAccount.save();

    const token = await nAccount.generateAuthToken();

    res.status(201).send(
      apiResponse({
        message: "account successfully created",
        account: {
          _id: nAccount._id,
          accountType: nAccount.accountType,
          email: nAccount.email,
          username: nAccount.username,
          status: nAccount.status,
        },
        token,
      })
    );
  } catch (err) {
    res.status(500).json(
      apiResponse(null, {
        code: "SIGNUP_ERROR",
        message: err.toString(),
      })
    );
  }
};


module.exports = { signupPostHandler };
