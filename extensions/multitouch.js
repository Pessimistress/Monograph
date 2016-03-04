/* MONOGRAPH EXTENSION
	{
		"name": "multitouch",
		"description": "Touch manipulation actions",
		"author": "Xiaoji Chen (cxiaoji@gmail.com)",
		"target": [1.4, 1.49],
		"actions": ["zoom", "pan"]
	}
*/

(function() {
	var define = proto.define;

	// touch zoom
	define("zoom", function(evt) {
		var event_data = evt.data;
		var element = this;
		var scale = element._scale || 1,
			angle = element._angle || 0,
			dx = element._dx || 0,
			dy = element._dy || 0;

		scale *= event_data.scale;
		//angle += event_data.rotation;
		dx += event_data.deltaX;
		dy += event_data.deltaY;

		updateTransform(element, scale, angle, dx, dy);

		if (event_data.type == "pinchend") {
			element._scale = scale;
			element._angle = angle;
			element._dx = dx;
			element._dy = dy;
		}
	});

	// touch pan
	define("pan", function(evt) {
		var event_data = evt.data;
		var element = this;
		var scale = element._scale || 1,
			angle = element._angle || 0,
			dx = element._dx || 0,
			dy = element._dy || 0;

		dx += event_data.deltaX;
		dy += event_data.deltaY;

		updateTransform(element, scale, angle, dx, dy);

		if (event_data.type == "panend") {
			element._dx = dx;
			element._dy = dy;
		}
	});

	function updateTransform(element, scale, angle, dx, dy) {
		element.style.transform = 'translate(' + dx + 'px,' + dy + 'px)' + ' scale(' + scale + ')' + ' rotate(' + angle + 'deg)';
	}

})();