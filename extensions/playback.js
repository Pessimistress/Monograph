/* MONOGRAPH EXTENSION
	{
		"name": "playback",
		"description": "Load and play external media content",
		"author": "Xiaoji Chen (cxiaoji@gmail.com)",
		"target": [1.4, 1.49],
		"actions": ["play", "pause", "mute", "unmute", "volume", "seek", "url"]
	}
*/

(function() {

	document.styleSheets[0].insertRule("video {width: 100%; height: 100%; object-fit: cover; object-position:center;}", 0);

	var prototype = proto;
	var separator = "/";

	function parsePath(path) {
		return path.split(separator).filter(Boolean);
	}

	prototype.define(["play", "pause", "mute", "unmute"], function(evt) {
		var args = evt.args;
		var command = args[0],
			path = args[1];
		var path_tokens = parsePath(path);
		var obj_name = path_tokens.pop();
		path = path_tokens.join(separator);

		if (path) {
			prototype.tell(0, "tell " + path + " " + command + " " + obj_name);
		} else {
			var targets = get(obj_name);
			for (var i = targets.length; i--;) {
				var player = targets[i].querySelector("audio,video");
				if (player) {
					switch (command) {
						case "play":
						case "pause":
							player[command]();
							break;
						case "mute":
							player.muted = true;
							break;
						case "unmute":
							player.muted = false;
							break;

					}
				}
			}
		}
	});

	prototype.define(["volume", "seek"], function(evt) {
		var args = evt.args;
		var command = args[0],
			path = args[1],
			value = args[2];
		var path_tokens = parsePath(path);
		var obj_name = path_tokens.pop();
		path = path_tokens.join(separator);

		if (path) {
			prototype.tell(0, "tell " + path + " " + command + " " + obj_name + " " + value);
		} else {
			var targets = get(obj_name);
			for (var i = targets.length; i--;) {
				var player = targets[i].querySelector("audio,video");
				if (player) {
					switch (command) {
						case "volume":
							if (value == "up") value = player.volume + 5;
							else if (value == "down") value = player.volume - 5;
							player.volume = value;
							break;
						case "seek":
							if (value == "forward") value = player.currentTime + 5;
							else if (value == "rewind") value = player.currentTime - 5;
							player.currentTime = value;
							break;
					}
				}
			}
		}
	});

	prototype.define("url", function(evt) {
		// load external content
		var args = evt.args;
		var url = args[1];
		var file_type = url.match(/\w*$/)[0].toLowerCase();
		var container = this;

		if (file_type.search("mp3|mp4") == 0) {
			var dataset = container.dataset;

			if (dataset.src != url) {
				var is_video = file_type == "mp4",
					tag = is_video ? "video" : "audio",
					type = is_video ? "video/mp4" : "audio/mpeg";
				container.innerHTML = '<' + tag + '><source src="' + url + '" type="' + type + '" /></' + tag + '>';
				dataset.src = url;
			}
			var player = container.firstChild;
			var options = {
				"autoplay": false,
				"loop": false,
				"muted": false
			};

			for (var i = 1; i < args.length; i++) {
				var key = args[i];
				if (options[key] != undefined) options[key] = true;
			}
			for (var i in options) {
				if(options[i]) player.setAttribute(i, options[i]);
				else player.removeAttribute(i);
			}
		}
	});


	function get(name) {
		return document.querySelectorAll('[data-name="' + name + '"]');
	};

})();