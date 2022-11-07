const http = require("http"),
	fs = require("fs"),
	qs = require('querystring'),
	ejs = require("ejs");

const server = http.createServer((req, res) => {
(async function Main() {
	var path;
	var loginData;
	let returnFile = true;
	let isMedia = /^\/files\//.test(req.url);

	if (!isMedia) {
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
			} default: {
				res.statusCode = 404;
				res.end("404");
				break;
			}
		}
	} else {
		let ext = req.url.split(".").pop();
		let filename = req.url.split("/").pop();
	
		if ( ext === "css" | ext === "map" ) { path = "./css/" }
		else if ( ext === "jpg" ) { path = "./images/" }
		path += filename;
	}
	
	if (returnFile) {
		fs.readFile(path, (err, data) => {
			if (!isMedia) {
				console.log(req.method + " " + req.url);
				res.end(ejs.render(data.toString()))
			} else {
				console.log(req.method + " " + req.url);
				res.end(data)
			}
		});
	}
})()}).listen(3000, () => {
	console.log("Listening on 3000");
});
