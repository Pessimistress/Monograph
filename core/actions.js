// Base extension - actions

(function() {

	var separator = "/";
	var parent_token = ".";
	var prototype = proto,
		define = prototype.define,
		tell = prototype.tell;

	// turn states on and off
	define(["set", "unset", "toggle"], function(evt) {
		var objects;
		var args = evt.args;
		var command = args[0],
			path = args[1],
			classname = args[2];

		if (!classname) {
			classname = path;
			objects = [this];
		} else {
			var path_tokens = parsePath(path, 1);
			var obj_name = path_tokens[0];
			path = path_tokens[1];

			if (path) {
				tellCallback(path, command, obj_name, classname);
				return;
			} else {
				objects = get(obj_name);
			}
		}

		setClass(objects,
			command == "set" ? "add" : (command == "unset" ? "remove" : "toggle"),
			classname);
	});

	// send command to another prototype
	define("tell", function(evt) {
		tellCallback.apply(this, evt.args.slice(1));
	});

	define("do", function(evt) {
		prototype.trigger(2, evt.args[1]);
	});

	define("move", function(evt) {
		prototype.move(evt.args[1]);
	});

	define("wait", function(evt) {
		var args = evt.args;
		var message = assemble(args, 2);
		var self = this;
		setTimeout(function() {
			tell(self, message);
		}, args[1] * 1);
	});

	// navigate to a new storyboard
	define("goto", function(evt) {
		var args = evt.args;
		var name = args[1];
		if (args[2] == "focus") {
			prototype.goto(name, true);
			setFocus(args[3]);
		} else {
			prototype.goto(name);
		}
	});

	// enable and disable a group of buttons
	define(["enable", "disable", "toggle-enable"], function(evt) {
		var args = evt.args;
		var command = args[0],
			path = args[1];
		var objects = [];

		if (!path) {
			add_obj(this);
		} else {
			var path_tokens = parsePath(path, 1);
			var obj_name = path_tokens[0];
			path = path_tokens[1];

			if (path) {
				tellCallback(path, command, obj_name);
			} else {
				get(obj_name).map(add_obj);
			}
		}

		setClass(objects,
			command == "disable" ? "add" : (command == "enable" ? "remove" : "toggle"),
			"disabled");

		function add_obj(obj) {
			if (obj.classList.contains("button") || obj.tagName == "IFRAME") {
				objects.push(obj);
			} else {
				var buttons = obj.querySelectorAll(".button,iframe");
				for (var i = buttons.length; i--;) {
					objects.push(buttons[i]);
				}
			}
		}
	});

	// set focus
	define("focus", function(evt) {
		setFocus(evt.args[1]);
	});

	// go back
	define("back", function() {
		prototype.back();
	});

	function parsePath(path, type) {
		var tokens = path.split(separator).filter(Boolean);
		var name = tokens[type ? "pop" : "shift"]();
		return [name, tokens.join(separator)];
	}

	function get(name) {
		return d3.selectAll('[data-name="' + name + '"]')[0];
	};

	function setClass(arr, type, classname) {
		var need_update = false;

		for (var i = arr.length; i--;) {
			var obj = arr[i];
			var classlist = obj.classList;
			var has_class = classlist.contains(classname);
			if (type == "add" ? !has_class :
				(type == "remove" ? has_class : true)) {
				need_update = true;
			}
			classlist[type](classname);
		}

		if (need_update) {
			prototype.update();
		}
	}

	function tellCallback(path) {
		var path_tokens = parsePath(path, 0);
		var obj_name = path_tokens[0];
		path = path_tokens[1];

		var message = assemble(arguments, 1);
		if (path) {
			message = "tell " + path + " " + message;
		}

		if (obj_name == parent_token) {
			tell(proto.PARENT, message);
		} else {
			get(obj_name).map(function(obj) {
				tell(obj, message);
			});
		}
	}

	function assemble(tokens, from_index) {
		return '"' + [].slice.call(tokens, from_index).join('" "') + '"';
	}

	function setFocus(path) {
		var path_tokens = parsePath(path, 1);
		var obj_name = path_tokens[0];
		path = path_tokens[1];

		if (path) {
			tellCallback(path, "focus", obj_name);
		} else {
			var target = get(obj_name)[0];
			if (target) prototype.focus(target);
		}
	}

})();