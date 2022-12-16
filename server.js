const http = require("http"),
	fs = require("fs"),
	qs = require('querystring'),
	ejs = require("ejs"),
	mongoose = require("mongoose"),
	uCreds = require("./models/usercreds");

require("dotenv").config();
const mdbPass = process.env.MDB_PASS;

const dbURI = `mongodb+srv://devuser:${mdbPass}@node-ejs-login.zynhrb9.mongodb.net/node-ejs-login?retryWrites=true&w=majority`
mongoose.set('strictQuery', true);
mongoose.connect(dbURI)
	.then(() => {
		server.listen(3000, () => {console.log("Listening on port 3000")})})
	.catch((err) => {console.log(err)});

const server = http.createServer((req, res) => {
(async function Main() {
	var path;
	var uCredsInput;
	let simpleGET = true;
	let isAssets = /^\/assets\//.test(req.url);

	if (!isAssets && req.url.indexOf(".") <= -1 ) {
		path = "view/"
		switch (req.url) {
			case "/sendsignin": // Temporary
			case "/sendlogin": {
				simpleGET = false;
				uCredsInput = await new Promise ( (resolve) => {
					req.on("data", (data) => {
						resolve(qs.parse(data.toString()))
					});
				});	
				res.statusCode = 301;
				res.setHeader("Location", "/login");
				res.end();
				break;
			} case "/login": {
				path += "login.ejs";
				break;
			} case "/" : {
				simpleGET = false;
				res.statusCode = 301;
				res.setHeader("Location", "/login");
				break;
			} default: {
				res.statusCode = 404;
				path += "404.ejs";
				break;
			}
		}
	} else {
		let ext = req.url.split(".").pop();
		let filename = req.url.split("/").pop();
	
		if ( ext === "css" | ext === "map" ) { path = "./css/" }
		else if ( ext === "jpg" ) { path = "./images/" }
		else {
			simpleGET = false;
			res.statusCode = 404;
			res.write("Asset or file does not exist")
			res.end();
		}
		path += filename;
	}
	
	if (simpleGET) {
		fs.readFile(path, (err, data) => {
			if (err) {
				console.log(req.url + " " + path);
				console.log(err);
				res.write("We are having some troubles...");
				res.statusCode = 500;
				res.end();
			} else {
				if (!isAssets && req.url.indexOf(".") <= -1 ) {
					console.log(`${req.socket.remoteAddress} ${req.method} ${res.statusCode} ${req.url}`);
					res.end(ejs.render(data.toString()))
				} else {
					console.log(`${req.socket.remoteAddress} ${req.method} ${res.statusCode} ${req.url}`);
					res.end(data)
				}
			}
		});
	} else {
		console.log(`${req.socket.remoteAddress} ${req.method} ${res.statusCode} ${req.url}`);
		if (req.url === "/sendlogin") {
			uCreds.findOne({username: uCredsInput.username}, (err, obj) => {
				if (err) {
					console.log(err)
				} else if (obj === null) {
					console.log("User not found")
				} else {
					if (uCredsInput.password === obj.password) { console.log(`User '${obj.username}' has logged in!`) }
					else { console.log(`User '${obj.username}' wrong password`) }
				}
			})
		} else if (req.url === "/sendsignin") {
			const user = new uCreds(uCredsInput);
			user.save()
				.then(() => {
					console.log(`Username '${uCredsInput.username}' signed in!`)
				})
				.catch((err) => {
					if (err.message.includes("E11000")) {
						console.log(`Sign-In failed: username '${uCredsInput.username}' already exists.`)
					}
				})
		}	
		res.end()
	}
})()});
