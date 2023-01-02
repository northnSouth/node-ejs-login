const http = require("http"),
	fs = require("fs"),
	qs = require("querystring"),
	ejs = require("ejs"),
	mongoose = require("mongoose"),
	uCreds = require("./models/usercreds"),
	sesCookie = require("./models/session-cookie"),
	uaParser = require("ua-parser-js");

require("dotenv").config();
const mdbPass = process.env.MDB_PASS;

process.stdout.write("Connecting to Atlas... ");
const dbURI = `mongodb+srv://devuser:${mdbPass}@node-ejs-login.zynhrb9.mongodb.net/node-ejs-login?retryWrites=true&w=majority`;
mongoose.set("strictQuery", true);
mongoose
	.connect(dbURI)
	.then(() => {
		process.stdout.write("Connected!");
		server.listen(3000, () => {
			console.log("\nListening on port 3000");
		});
	})
	.catch((err) => {
		console.log(err);
	});

async function uCredsRulesCheck(unm, pwd, email, reqtype) {
	let unmvalid = true,
		pwdvalid = true,
		emailvalid = true,
		unmreason = [],
		pwdreason = [],
		emailreason = [],
		pwdminlen = 8;

	const unmbad = "\"#%&'()*+,-./:;<=>?@[\\]^`{|}~",
		pwdbad = " \"'()+*,-./:;<=>[\\]^`{|}~",
		pwdgood = "!#$%&?@_";

	// Username block
	if ( unm.length === 0 ) {
		unmvalid = false;
		unmreason.push("Please enter your username");
	} else {
		for ( let x of unmbad ) {
			if ( unm.includes(x) ) {
				unmvalid = false;
				unmreason.push(
					`Username cannot include these characters ${unmbad}`
				);
				break;
			}
		}

		if ( reqtype === "signin" ) {
			await new Promise((resolve) => {
				uCreds.findOne({ username: unm }, (err, obj) => {
					if ( err ) {
						console.log(err);
					} else if ( obj !== null ) {
						unmvalid = false;
						unmreason.push(`Username '${unm}' already exists`);
					}
					resolve();
				});
			});
		}
	}

	// Password block
	if ( pwd.length === 0 ) {
		pwdvalid = false;
		pwdreason.push("Please enter your password");
	} else {
		if ( pwd.length < pwdminlen ) {
			pwdvalid = false;
			pwdreason.push("Password must be at least 8 characters long");
		}

		if ( !/[0-9]/.test(pwd) ) {
			pwdvalid = false;
			pwdreason.push("Password must have at least one number");
		}

		for ( let x of pwdbad ) {
			if ( pwd.includes(x) ) {
				pwdvalid = false;
				pwdreason.push(
					`Password cannot include these characters ${pwdbad}`
				);
				break;
			}

			if ( x === pwdbad.slice(-1) ) {
				for ( let x of pwdgood ) {
					if ( pwd.includes(x) ) { break; }
					else if ( x === pwdgood.slice(-1) ) {
						pwdvalid = false;
						pwdreason.push(
							`Password should have at least one valid special character (${pwdgood})`
						);
					}
				}
			}
		}
	}

	// Email block
	if ( reqtype === "signin" ) {
		const emailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; //eslint-disable-line
		if ( email.length === 0 ) {
			emailvalid = false;
			emailreason.push("Please enter your email");
		} else {
			if ( !emailformat.test(email) ) {
				emailvalid = false;
				emailreason.push("Email is not valid");
			}
		}
	}

	return {
		unmvalid,
		pwdvalid,
		emailvalid,
		unmreason,
		pwdreason,
		emailreason,
	};
}

const server = http.createServer((req, res) => {

	function logger() {
		console.log(`${req.socket.remoteAddress} \x1b[34;1m${req.method}\x1b[0m ${res.statusCode} \x1b[34m${req.url}\x1b[0m`)
	}

	function bakeCookie(uCredsInput, resolve, obj, performance) {
		// generate cookie
		const randNum = BigInt(
			Math.random() * 10 ** 76
		);
		let numstr = randNum.toString(),
			cookie = "";

		for ( var i = numstr.length;i > 0; ) {
			let dish = numstr.slice(0, 15);
			cookie +=
				parseInt(dish).toString(16);
			numstr = numstr.slice(15);
			i = numstr.length;
		}

		// associate cookie
		const user = uCredsInput.username.toLowerCase();
		new sesCookie({
			cookie,
			user,
		})
		.save()
		.then(() => {
			console.log(
				`${req.socket.remoteAddress} Session Cookie for '${user}' uploaded`
			);

			res.setHeader(
				"Set-Cookie",
				`sessionID=${cookie}`
			);
			res.statusCode = 302;
			res.setHeader(
				"Location",
				"/dashboard"
			);
			logger();
			console.log(
				`${req.socket.remoteAddress} User '${obj.username}' has logged in!`
			);
			console.timeEnd(performance);
			resolve();
		})
		.catch((err) => {
			console.log(err);
			resolve();
		});
	}
	
	function loginAuth(uCredsInput, resolve, performance) {
		uCreds.findOne({ username:uCredsInput.username.toLowerCase() },
			(err, obj) => {
				if (err) {
					console.log(err);
					resolve();
				} else if (obj === null) {
					logger();
					console.log(
						`${req.socket.remoteAddress} Login failed: User not found`
					);
					console.timeEnd(performance);
					resolve();
				} else {
					if ( uCredsInput.password === obj.password ) { bakeCookie(uCredsInput, resolve, obj, performance)} 
					else {
						logger();
						console.log(
							`${req.socket.remoteAddress} Login failed: User '${obj.username}' wrong password`
						);
						console.timeEnd(performance);
						resolve();
					}
				}
			}
		);
	}

	(async function Main() {
		let performance = `${req.socket.remoteAddress} executed in`;
		console.time(performance);
		var path, uCredsInput, ejsValues;
		let simpleGET = true,
			isAssets = /^\/assets\//.test(req.url);

		if ( !isAssets && req.url.indexOf(".") <= -1 ) {
			path = "view/";
			switch (req.url) {
				case "/sendsignin": {
					simpleGET = false;
					uCredsInput = await new Promise((resolve) => {
						req.on("data", (data) => {
							resolve(qs.parse(data.toString()));
						});
					});
					const validator = await uCredsRulesCheck(
						uCredsInput.username,
						uCredsInput.password,
						uCredsInput.email,
						"signin"
					);

					// I did this so it will not stop when one if statement is true
					// So it will check for all errors on the input
					if ( !validator.unmvalid ) {
						logger();
						console.log(
							`${req.socket.remoteAddress} Sign In failed: ${validator.unmreason}`
						);
						console.timeEnd(performance);
					}
					if ( !validator.pwdvalid ) {
						logger();
						console.log(
							`${req.socket.remoteAddress} Sign In failed: ${validator.pwdreason}`
						);
						console.timeEnd(performance);
					}
					if ( !validator.emailvalid ) {
						logger();
						console.log(
							`${req.socket.remoteAddress} Sign In failed: ${validator.emailreason}`
						);
						console.timeEnd(performance);
					}
					if (
						validator.unmvalid &&
						validator.pwdvalid &&
						validator.emailvalid
					) {
						Object.assign(uCredsInput, {
							username: uCredsInput.username.toLowerCase(),
						});
						const user = new uCreds(uCredsInput);
						user.save()
							.then(() => {
								logger();
								console.log(
									`${req.socket.remoteAddress} Username '${uCredsInput.username}' signed in!`
								);
								console.timeEnd(performance);
							})
							.catch((err) => {
								if (err.message.includes("E11000")) {
									logger()
									console.log(
										`${req.socket.remoteAddress} Sign In failed: Username '${uCredsInput.username}' already exists.`
									);
									console.timeEnd(performance);
								}
							});
					}
					break;
				}
				case "/sendlogin": {
					simpleGET = false;
					uCredsInput = await new Promise((resolve) => {
						req.on("data", (data) => {
							resolve(qs.parse(data.toString()));
						});
					});

					const validator = await uCredsRulesCheck(
						uCredsInput.username,
						uCredsInput.password,
						"valid@email.net", // placeholder
						"login"
					);

					if ( !validator.unmvalid ) {
						logger();
						console.log(
							`${req.socket.remoteAddress} Login failed: ${validator.unmreason}`
						);
						console.timeEnd(performance);
					}
					if ( uCredsInput.password.length === 0 ) {
						logger();
						console.log(
							`${req.socket.remoteAddress} Login failed: Password is empty`
						);
						console.timeEnd(performance);
					}
					if ( validator.unmvalid && uCredsInput.password.length > 0 ) {
						await new Promise((resolve) => { loginAuth(uCredsInput, resolve, performance) });
					}

					break;
				}
				case "/login": {
					path += "login.ejs";
					ejsValues = { css: "/assets/login.css", title: "Login" };
					break;
				}
				case "/": {
					simpleGET = false;
					res.statusCode = 301;
					res.setHeader("Location", "/login");
					break;
				}
				case "/dashboard": {
					path += "dashboard.ejs";
					ejsValues = {
						css: "/assets/dashboard.css",
						title: "Dashboard",
					};
					break;
				}
				default: {
					res.statusCode = 404;
					path += "404.ejs";
					ejsValues = {
						css: "/assets/404.css",
						title: "Page Not Found",
					};
					break;
				}
			}
		} else {
			let ext = req.url.split(".").pop();
			let filename = req.url.split("/").pop();

			if ( (ext === "css") | (ext === "map") ) {
				path = "./css/";
			} else if (ext === "jpg") {
				path = "./images/";
			} else {
				simpleGET = false;
				res.statusCode = 404;
				res.write("Asset or file does not exist");
				res.end();
			}
			path += filename;
		}

		if ( simpleGET ) {
			fs.readFile(path, (err, data) => {
				if ( err ) {
					console.log(req.url + " " + path);
					console.log(err);
					res.statusCode = 500;
					res.write("We are having some troubles...");
					res.end();
				} else {
					if ( !isAssets && req.url.indexOf(".") <= -1 ) {
						Object.assign(ejsValues, { filename: path });
						res.end(ejs.render(data.toString(), ejsValues));
						logger();
						console.timeEnd(performance);
					} else {
						res.end(data);
						logger();
						console.timeEnd(performance);
					}
				}
			});
		} else { res.end() }
	})();
});
