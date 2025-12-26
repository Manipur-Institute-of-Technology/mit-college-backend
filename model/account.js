const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const validator = require("validator");

const permToken = require("./permToken");
const otpToken = require("./otpToken");
const facultyProfile = require("./facultyProfile");

const Schema = mongoose.Schema;

const AccountSchema = new Schema(
	{
		email: {
			type: String,
			trim: true,
			required: true,
			lowercase: true,
			validate: function (val) {
				if (!validator.isEmail(val)) throw new Error("Invalid Email");
			},
		},
		username: {
			type: String,
			trim: true,
			required: true,
			lowercase: true,
			validate: function (val) {
				if (!validator.isAlphanumeric(val))
					throw new Error(
						"Invalid Username, should contain only AlphaNumeric character",
					);
			},
		},
		password: {
			type: String,
			required: true,
			minLength: 7,
			validate: function (val) {
				if (val.toLowerCase().includes("password")) {
					throw new Error("password musn't contain password");
				}

				// password should contain min 1 uppercase, 1 lowercase, 1 special character, 1 num
				const res = validator.isStrongPassword(val, {
					minNumbers: 1,
					minLowercase: 1,
					minUppercase: 1,
					minSymbols: 1,
					minLength: 7,
				});
				if (!res)
					throw new Error(
						"password should contain min 1 uppercase, 1 lowercase, 1 special character, 1 num",
					);
			},
		},
		accountType: {
			type: String,
			required: true,
			enum: ["faculty", "admin"],
			default: "faculty",
		},
		tokens: {
				type: [
					{
					token: {
						type: String
					}
					}
				],
				default: []
				}
	},
	{
		timestamps: true,
	},
);

AccountSchema.pre("save", async function (next) {
	if (this.isModified("password")) {
		const hashPassword = await bcrypt.hash(this.password, +process.env.SALT);
		if (process.env.ENV === "dev")
			console.log(
				"password before and after hash: ",
				this.password,
				hashPassword,
			);
		this.password = hashPassword;
	}
	next();
});

AccountSchema.methods.generateAuthToken = async function () {
  const account = this;

  const token = jwt.sign(
    {
      id: account._id.toString(),
      accountType: account.accountType,
    },
    process.env.JWT_SECRET
  );

  account.tokens = account.tokens || [];
  account.tokens.push({ token });

  await account.save();

  return token;
};

AccountSchema.statics.findAndCheckCredential = async function (
	email,
	password,
	accountType,
) {
	const user = await this.findOne({ email, accountType });
	if (!user) throw new Error("email doesnt exist");
	const match = await bcrypt.compare(password, user.password);
	if (!match) {
		throw new Error("password doesnt match");
	}
	return user;
};

module.exports = mongoose.model("Account", AccountSchema);