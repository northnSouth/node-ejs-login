const http = require("http"),
	fs = require("fs"),
	qs = require('querystring'),
	ejs = require("ejs");

const server = http.createServer((req, res) => {
(async function Main() {
	var path;
	var loginData;
	let returnFile = true;
	let isAssets = /^\/assets\//.test(req.url);

	if (!isAssets && req.url.indexOf(".") <= -1 ) {
		path = "view/"
		switch (req.url) {
			case "/sendlogin": {
				returnFile = false;
				loginData = await new Promise ( (resolve) => {
					req.on("data", (data) => {
						resolve(qs.parse(data.toString()))
					});
				});
				console.log("User: " + loginData.username + " Password: " + loginData.password);
				res.statusCode = 301;
				res.setHeader("Location", "/login");
				res.end();
				break;
			} case "/login": {
				path += "login.ejs";
				break;
			} case "/" : {
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
			console.log("[REJECTED] " + req.method + " " + req.url);
			returnFile = false;
			res.statusCode = 404;
			res.write("Asset or file does not exist")
			res.end();
		}
		path += filename;
	}
	
	if (returnFile) {
		fs.readFile(path, (err, data) => {
			if (err) {
				console.log(req.url + " " + path);
				console.log(err);
				res.write("We are having some troubles...");
				res.statusCode = 500;
				res.end();
			} else {
				if (!isAssets && req.url.indexOf(".") <= -1 ) {
					console.log(req.method + " " + req.url);
					res.end(ejs.render(data.toString()))
				} else {
					console.log(req.method + " " + req.url);
					res.end(data)
				}
			}
		});
	}
})()}).listen(3000, () => {
	console.log("Listening on 3000");
});
