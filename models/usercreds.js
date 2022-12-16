const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const uCredsSchema = new Schema({
	username: {
		type: String,
		unique: true,
		required: true
	},
	password: {
		type: String,
		required: true
	}
}, { timestamps: true });

const uCreds = mongoose.model("usercreds", uCredsSchema);

module.exports = uCreds;
