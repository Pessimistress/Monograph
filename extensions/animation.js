/* MONOGRAPH EXTENSION
	{
		"name": "animation",
		"description": "Fine grain animation controls",
		"author": "Xiaoji Chen (cxiaoji@gmail.com)",
		"target": [1.4, 1.49],
		"triggers": ["animate"],
		"actions": ["delay", "duration", "easing"]
	}
*/

(function() {

	var settings = {};

	proto.define(["delay", "duration", "easing"], function(evt) {

		var args = evt.args;
		var command = args[0],
			value = args[1],
			value2 = args[2];

		if (update(this)) {
			var elements = this.querySelectorAll("._");
			for (var i = 0; i < elements.length; i++) {
				update(elements[i]);
			}
		}

		function update(element) {
			var d = settings[element.id];
			if (!d) {
				d = settings[element.id] = [];
			}

			switch (command) {
				case "duration":
					if (d[0] != value) {
						d[0] = value;
						return true;
					}
					return false;
				case "delay":
					if (d[1] != value) {
						d[1] = value;
						return true;
					}
					return false;
				case "easing":
					var v = value2 ? value + " " + value2 : value;
					if (d[2] != v) {
						d[2] = v;
						return true;
					}
					return false;
			}
		}

	});

	var default_dur = proto.option("duration")(),
		default_ease = proto.option("easing")(),
		default_delay = proto.option("delay")();

	proto.option("duration", function(element) {
		proto.trigger(element, "animate");
		var d = settings[element.id],
			v = d && d[0];
		return v == undefined ? default_dur : v
	});
	proto.option("easing", function(element) {
		var d = settings[element.id],
			v = d && d[2];
		return v == undefined ? default_ease : v
	});
	proto.option("delay", function(element) {
		var d = settings[element.id],
			v = d && d[1];
		return v == undefined ? default_delay : v
	});

})();