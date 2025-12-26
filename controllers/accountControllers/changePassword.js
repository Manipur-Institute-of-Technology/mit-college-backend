const bcrypt = require("bcryptjs");
const apiResponse = require("../../utils/apiResponse");

const changePasswordPost = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = res.locals.acc;

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json(
        apiResponse(null, {
          code: "INVALID_OLD_PASSWORD",
          message: "Old password is incorrect",
        })
      );
    }

    // Update password (pre-save hook will hash)
    user.password = newPassword;
    await user.save();

    res.status(200).json(
      apiResponse({
        message: "Password changed successfully",
      })
    );
  } catch (err) {
    res.status(500).json(
      apiResponse(null, {
        code: "CHANGE_PASSWORD_ERROR",
        message: err.toString(),
      })
    );
  }
};

module.exports = { changePasswordPost };
