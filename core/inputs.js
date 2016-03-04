// Base extension - triggers for controller, keyboard and mouse

proto.on("ready.input", function(load_evt) {
	var isMaster = load_evt.isMaster;

	var prototype = proto,
		settings = proto_data.settings;
	var isADown = false,
		isEnterDown = false,
		isTouchDown = false;
	var listenTo = window.addEventListener,
		selectAll = d3.selectAll;
	var input_src;
	var define = prototype.define,
		tell = prototype.tell,
		trigger = prototype.trigger,
		update = prototype.update;
	var FOCUS = prototype.FOCUS;

	prototype.option("states", [
		"press",
		"focus",
		"hover"
	]);

	prototype.on("fallback", function(evt) {
		var trigger_name = evt.type;
		switch (trigger_name) {
			case "L":
			case "R":
			case "U":
			case "D":
				prototype.move(trigger_name);
				break;
			case "B":
			case "ESC":
				tell(FOCUS, "back");
				break;
		}
	});

	define("_input", function(evt) {
		setInput(evt.args[1]);
	});
	define("_press", setPressState);
	define("_release", unsetPressState);

	function isEnabled(btn) {
		return !btn.classList.contains("disabled");
	}

	function setInput(input) {
		if (input_src != input) {
			var cl = document.body.classList;
			if (input_src) cl.remove(input_src);
			cl.add(input);
			input_src = input;
			update();
		}
	}

	function setPressState() {
		if (isEnabled(this)) {
			var cl = this.classList;
			cl.add("press");
			update();
		}
	}

	function unsetPressState() {
		var btns = selectAll(".button.press").classed("press", false);
		if (btns.size()) update();
	}

	function isSafeValue(obj) {
		var t = typeof obj;
		if (t == "string" || t == "number") return true;
		if (t == "object") {
			for (var i in obj) {
				var t2 = typeof obj[i];
				if (t2 != "string" && t2 != "number") return false;
			}
			return true;
		}
	}

	// clean up event object to safely pass between windows
	function sanitizeEventArgs(evt) {
		var data = {};
		for (var i in evt) {
			var value = evt[i];
			if (isSafeValue(value)) {
				data[i] = value;
			}
		}
		return data;
	}

	/*---- controller ----*/
	if (settings.input_controller && isMaster) {
		// only the top level window listens to controller input

		var controllers = [];
		var then = Date.now();
		var now;
		var interval = 17; // 60fps

		if (navigator.getGamepads) {
			runAnimation();

			var handleButtonEvent = function(mapping) {
				return function(evt) {
					var d = evt.detail;
					if (!d.isHandled) {
						trigger(2, mapping[d.button], d);
					}
				}
			}

			/* Controller event listeners */
			listenTo("buttondown", handleButtonEvent({
				"LStickLeft": "L",
				"DpadLeft": "L",
				"LStickRight": "R",
				"DpadRight": "R",
				"LStickUp": "U",
				"DpadUp": "U",
				"LStickDown": "D",
				"DpadDown": "D",
				"LB": "LB",
				"RB": "RB",
				"LT": "LT",
				"RT": "RT"
			}));
			listenTo("buttonup", handleButtonEvent({
				"A": "A",
				"B": "B",
				"X": "X",
				"Start": "Menu",
				"Back": "View"
			}));
			listenTo("buttontap", handleButtonEvent({
				"Y": "Y"
			}));
			listenTo("buttondbltap", handleButtonEvent({
				"Y": "dblY"
			}));

			listenTo("buttondown", function(evt) {
				tell(FOCUS, "_input controller");
				var d = evt.detail;
				if (d.button == "A" && !isADown) {
					isADown = true;
					tell(FOCUS, "_press");
				}
			})

			listenTo("buttonup", function(evt) {
				var d = evt.detail;
				if (d.button == "A") {
					isADown = false;
					tell(FOCUS, "_release");
				}
			})
		}

		// --------------------------------------
		// Check gamepad updates
		// --------------------------------------
		function runAnimation() {
			now = Date.now();
			if (now - then > interval) {
				then = now - (now - then) % interval;

				var gamepads = navigator.getGamepads();
				for (var i = 0; i < gamepads.length; i++) {
					var gamepad = gamepads[i];
					if (gamepad) {
						if (!controllers[i]) {
							if (/xbox 360|controller/i.test(gamepad.id)) {
								if (gamepad.buttons.length >= 15) {
									//IE or Webkit
									controllers[i] = new Xbox360ControllerOnWebkit(i);
								}
							}
						}
						if (controllers[i]) {
							// Feed controller object with the latest state
							controllers[i]._update_(gamepad);
						}
					}
				}
			}

			// Loop
			window.requestAnimationFrame(runAnimation);
		}

		function Controller(index, mapping) {

			// Create tracker for each button
			var buttonStates = [];
			for (var i = 0; i < mapping.length; i++) {
				buttonStates[i] = new ControllerButtonState(index, mapping[i]);
			}

			// When new states arrive, update each tracker
			this._update_ = function(pad) {
				for (var i = buttonStates.length; i--;) {
					var buttonState = buttonStates[i];
					var button = buttonState._button_;
					if (button._index_ != null) {
						// Button
						var b = pad.buttons[button._index_];
						if (b) {
							buttonState._update_(b.pressed, b.value);
						}
					} else if (button._axis_ != null) {
						// Thumb stick
						var b = pad.axes[button._axis_],
							abs = b * button._dir_;
						buttonState._update_(
							abs > 0.7 ? true : (abs < 0.2 ? false : buttonState._is_down_),
							b
						);
					}
				}
			}
		}

		var Xbox360ControllerOnWebkitMapping = [
	    	{ _index_: 0, _name_: "A" },
	    	{ _index_: 1, _name_: "B" },
			{ _index_: 2, _name_: "X" },
			{ _index_: 3, _name_: "Y" },
			{ _index_: 4, _name_: "LB" },
			{ _index_: 5, _name_: "RB" },
			{ _index_: 6, _name_: "LT" },
			{ _index_: 7, _name_: "RT" },
			{ _index_: 8, _name_: "Back" },
			{ _index_: 9, _name_: "Start" },
			{ _index_: 10, _name_: "LStick" },
			{ _index_: 11, _name_: "RStick" },
			{ _index_: 12, _name_: "DpadUp" },
			{ _index_: 13, _name_: "DpadDown" },
			{ _index_: 14, _name_: "DpadLeft" },
			{ _index_: 15, _name_: "DpadRight" },
			{ _axis_: 0, _dir_: -1, _name_: "LStickLeft" },
			{ _axis_: 0, _dir_: 1, _name_: "LStickRight" },
			{ _axis_: 1, _dir_: -1, _name_: "LStickUp" },
			{ _axis_: 1, _dir_: 1, _name_: "LStickDown" },
			{ _axis_: 2, _dir_: -1, _name_: "RStickLeft" },
			{ _axis_: 2, _dir_: 1, _name_: "RStickRight" },
			{ _axis_: 3, _dir_: -1, _name_: "RStickUp" },
			{ _axis_: 3, _dir_: 1, _name_: "RStickDown" }
		];

		function Xbox360ControllerOnWebkit(index) {
			var controller = new Controller(index, Xbox360ControllerOnWebkitMapping);
			this._update_ = controller._update_;
		}

		/*
		    Raise a button event on window
		*/
		function dispatchControllerButtonEvent(type, state) {
			//console.log(type);
			dispatchEvent(type, {
				controller: state._ctrlIndex_,
				button: state._button_._name_,
				repeated: state._repeat_,
				value: state._value_,
				isHandled: false
			});
		}

		function dispatchEvent(type, detail) {
			var e = document.createEvent("CustomEvent");
			e.initCustomEvent(type, false, false, detail);
			window.dispatchEvent(e);
		}

		/*
		    Tracks the state of one button
		*/
		function ControllerButtonState(controller_index, button) {
			// The interval to invoke ButtonDown event repeatedly when holding
			var MAX_HOLD_TIMEOUT = 18;
			var MIN_HOLD_TIMEOUT = 2;
			// The time between down and up to qualify as tap
			var TAP_TIMEOUT = 12;
			// The time between taps to qualify as double tap
			var DOUBLE_TAP_TIMEOUT = 24;

			this._ctrlIndex_ = controller_index;
			this._button_ = button;
			this._value_ = 0;
			this._is_down_ = false;
			this._repeat_ = 0

			var _hold_timer = 0;
			var _hold_timeout = MAX_HOLD_TIMEOUT;
			var _tap_timer = 0;
			var _double_tap_timer = 0;

			this._update_ = function(isDown, value) {
				this._value_ = value || 0;

				if (isDown) {
					// Repeat firing down event on hold
					if (_hold_timer > 0) {
						_hold_timer--;
					} else {
						dispatchControllerButtonEvent("buttondown", this);
						this._repeat_++;
						_hold_timer = _hold_timeout;
						if (_hold_timeout > MIN_HOLD_TIMEOUT) _hold_timeout = _hold_timeout * 2 / 3;
					}

					if (!this._is_down_) // just down
					{
						_tap_timer = TAP_TIMEOUT;
					}
					if (_tap_timer > 0) {
						_tap_timer--;
					}
				} else if (this._is_down_) // just up
				{
					dispatchControllerButtonEvent("buttonup", this);
					_hold_timer = 0;
					_hold_timeout = MAX_HOLD_TIMEOUT;
					this._repeat_ = 0;

					if (_tap_timer > 0) {
						if (_double_tap_timer > 0) {
							dispatchControllerButtonEvent("buttondbltap", this);
							_double_tap_timer = 0;
						} else {
							_double_tap_timer = DOUBLE_TAP_TIMEOUT;
						}
					}
				}

				if (_double_tap_timer > 0) {
					_double_tap_timer--;
					if (_double_tap_timer == 0) {
						dispatchControllerButtonEvent("buttontap", this);
					}
				}
				this._is_down_ = isDown;
			}
		}

	}

	/*---- keyboard ----*/
	if (settings.input_keyboard) {
		listenTo("keydown", function(evt) {
			var key = evt.keyCode;

			switch (key) {
				case 13: //enter
					if (!isEnterDown) {
						isEnterDown = true;
						tell(FOCUS, "_press");
					}
					break;
				case 37: //left
					return invoke("L");
				case 38: //up
					return invoke("U");
				case 39: //right
					return invoke("R");
				case 40: //down
					return invoke("D");
				case 9: //tab
					tell(FOCUS, "_input keyboard");
					evt.preventDefault();
					prototype.move(evt.shiftKey ? "P" : "N");
					break;
			}

			function invoke(key) {
				tell(FOCUS, "_input keyboard");
				trigger(FOCUS, key, sanitizeEventArgs(evt));
				evt.preventDefault();
			}
		});

		listenTo("keyup", function(evt) {
			var key = evt.keyCode;

			if (key >= 65 && key <= 90) {
				return invoke(String.fromCharCode(key) + "Key");
			}
			if (key >= 48 && key <= 57) {
				return invoke("D" + String.fromCharCode(key));
			}

			switch (key) {
				case 27: //escape
					return invoke("ESC");
				case 32: //space
					return invoke("SPACE");
				case 8: //backspace
					return invoke("BACK");
				case 13: //enter
					isEnterDown = false;
					tell(FOCUS, "_release");
					return invoke("ENTER");
			}

			function invoke(key) {
				trigger(2, key, sanitizeEventArgs(evt));
				evt.preventDefault();
			}
		});
	}

	/*---- mouse ----*/
	if (settings.input_mouse) {
		var onHover = function() {
				// hover
				if (isEnabled(this)) {
					this.classList.add("hover");
					update();
				}
			},
			onLeave = function() {
				// leave
				this.classList.remove("hover");
				update();
			},
			onPress = function() {
				// press
				if (isEnabled(this)) {
					setInput("mouse");
					setPressState.call(this);
					prototype.focus(this);
				}
			},
			onLeftClick = function() {
				// left click
				if (isEnabled(this)) {
					trigger(this, "MLB", sanitizeEventArgs(d3.event));
				}
			},
			onDblClick = function() {
				// double click
				if (isEnabled(this)) {
					trigger(this, "dblMLB", sanitizeEventArgs(d3.event));
				}
			},
			onRightClick = function() {
				// right click
				if (isEnabled(this)) {
					trigger(this, "MRB", sanitizeEventArgs(d3.event));
				}
				d3.event.preventDefault();
			};

		selectAll(".button")
			.on("mouseenter", onHover)
			.on("mouseleave", onLeave)
			.on("mousedown", onPress)
			.on("click", onLeftClick)
			.on("dblclick", onDblClick)
			.on("contextmenu", onRightClick);

		listenTo("mouseup", function() {
			// release
			unsetPressState();
		});
	}

	/*---- touch ----*/
	if (settings.input_touch) {

		// load hammer.js
		selectAll("head").append("script")
			.attr("type", "text/javascript")
			.attr("src", "https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.6/hammer.min.js")
			.on("load", function() {
				// hammer.js is ready
				var getSrcButton = function(evt) {
					var btn = evt.target;
					while (btn && !btn.classList.contains("button")) {
						btn = btn.parentElement;
					}
					return btn;
				};

				var handleTouchEvent = function(trigger_name) {
					return function(evt) {
						var ptr_type = evt.pointerType;
						if (ptr_type == "touch" || ptr_type == "pen") {
							var btn = getSrcButton(evt);
							if (btn) {
								trigger(btn, trigger_name, sanitizeEventArgs(evt));
							}
						}
					}
				};
				var hammer = Hammer;

				var touchManager = new hammer.Manager(document.body, {
					recognizers: [
						// RecognizerClass, [options], [recognizeWith, ...], [requireFailure, ...]
						[hammer.Tap],
						[hammer.Press],
						[hammer.Pan],
						[hammer.Pinch, null, ['pan']],
						[hammer.Swipe, null, ['pan']],
					]
				});
				touchManager
					.on('tap', handleTouchEvent("TAP"))
					.on('press', handleTouchEvent("HOLD"))
					.on('panend panmove', handleTouchEvent("PAN"))
					.on('swipeup', handleTouchEvent("SWIPEU"))
					.on('swipedown', handleTouchEvent("SWIPED"))
					.on('swipeleft', handleTouchEvent("SWIPEL"))
					.on('swiperight', handleTouchEvent("SWIPER"))
					.on('pinchend pinchmove', handleTouchEvent("PINCH"))
					.on('hammer.input', function(evt) {

						var ptr_type = evt.pointerType;
						if (ptr_type == "touch" || ptr_type == "pen") {
							evt.preventDefault();
							var touched = evt.srcEvent.touches.length > 0;

							if (touched && !isTouchDown) {
								var btn = getSrcButton(evt);
								if (btn && isEnabled(btn)) {
									setInput(ptr_type);
									setPressState.call(btn);
									prototype.focus(btn);
								}
							} else if (!touched && isTouchDown) {
								unsetPressState();
							}
							isTouchDown = touched;
						}
					});
			});
	}

}); // end load listener