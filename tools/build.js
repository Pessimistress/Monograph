/* 
	Node.js for stitch and minify core runtime files 
	Usage: node build.js [version]
*/

var fs = require('fs'),
	path = require('path'),
	ClosureCompiler = require("closurecompiler"),
	CleanCSS = require('clean-css');

/*---- build version ----*/
var VERSION = process.argv.length > 2 ? "-" + process.argv[2] : "";

/*---- paths ----*/
var JS_SOURCE = ['../core/main.js', '../core/actions.js', '../core/inputs.js'];
var CSS_SOURCE = ['../core/style.css'];
var TARGET_PATH = "../dist",
	JS_TARGET = 'monograph' + VERSION + '.min.js',
	CSS_TARGET = 'monograph' + VERSION + '.css';

var folderPath = path.resolve(__dirname, TARGET_PATH);
jsPath = path.resolve(folderPath, JS_TARGET),
	cssPath = path.resolve(folderPath, CSS_TARGET);
var jsText = '';
var cssText = '';

var id_index = 0,
	id_length = 1,
	ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// check output folder
if (!fs.existsSync(folderPath)) {
	fs.mkdirSync(folderPath);
}

// minify css
for (var i = 0; i < CSS_SOURCE.length; i++) {
	var fPath = path.resolve(__dirname, CSS_SOURCE[i]);
	var fContent = fs.readFileSync(fPath);
	cssText += compressKeys(fContent.toString()) + '\n';
}
cssText = new CleanCSS().minify(cssText).styles;
fs.writeFileSync(cssPath, cssText);

// minify js
for (var i = 0; i < JS_SOURCE.length; i++) {
	var fPath = path.resolve(__dirname, JS_SOURCE[i]);
	var fContent = fs.readFileSync(fPath);
	jsText += compressKeys(fContent.toString()) + '\n';
}

fs.writeFileSync(jsPath, jsText);
ClosureCompiler.compile(
	jsPath, {
		compilation_level: "SIMPLE_OPTIMIZATIONS"
	},
	function(err, result) {
		if (result) {
			fs.writeFileSync(jsPath, result);
		} else {
			console.log(err);
		}
	}
);

// dictionary keys in the form of _*_ are scoped and can be minified
function compressKeys(text) {
	var dict = {};

	var keys = text.match(/\b_\w*_\b/g);
	if (keys) {
		keys.forEach(function(k) {
			if (!dict[k]) dict[k] = makeUniqueId();
		});

		for (var i in dict) {
			var regex = new RegExp('\\b' + i + '\\b', 'g');
			text = text.replace(regex, dict[i]);
		}
	}

	return text;
}

function makeUniqueId() {
	var n = ALPHABET.length;
	var result = '';
	for (var i = id_length, j = id_index; i--;) {
		var p = Math.floor(j / n),
			q = j - p * n;
		result = ALPHABET[q] + result;
		j = p;
	}

	id_index++;
	if (id_index >= Math.pow(n, id_length)) {
		id_length++;
		id_index = 0;
	}

	return result;
}