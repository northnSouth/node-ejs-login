const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cookieSchema = new Schema({
	cookie: {
		type: String,
		unique: true,
		required: true
	},
	user: {
		type: String,
		required: true
	},
	expiresFrom: {
		type: Date,
		required: true,
		default: Date.now
	}
});

const sessionCookie = mongoose.model("sessionCookies", cookieSchema);

module.exports = sessionCookie;
