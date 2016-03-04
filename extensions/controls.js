/* MONOGRAPH EXTENSION
	{
		"name": "controls",
		"description": "Advanced controls",
		"author": "Xiaoji Chen (cxiaoji@gmail.com)",
		"target": [1.4, 1.49],
		"actions": ["textbox"]
	}
*/

(function() {

	var inputs = {};
	var button_owners = {};
	var active_input;

	function Input(container, type) {
		this.type = type;
		this.container = container;
		this.buttons = [];
		this.isActive = false;
		this.isActiveChanged = null;

		var btns = container.querySelectorAll(".button");

		for(var i = btns.length; i--;) {
			this.buttons[i] = btns[i];
			button_owners[btns[i].id] = this;
		}

		if(container.classList.contains("button")) {
			this.buttons.push(container);
			button_owners[container.id] = this;
		}		

		inputs[container.id] = this;
	}

	Input.prototype.setActive = function(is_active) {
		if(this.isActive != is_active) { 
			this.isActive = is_active;
			this.container.classList[is_active? "add":"remove"]("active");
			if(this.isActiveChanged) this.isActiveChanged.call(this);
		}
	}

	proto.on("focuschange.controls", function(evt) {
		var old_input = active_input;

		if(evt.newFocus) {
			active_input = button_owners[evt.newFocus.id];
		}
		else {
			active_input = null;
		}

		if(old_input != active_input) {
			if(old_input) {
				old_input.setActive(false);
			}
			if(active_input) {
				active_input.setActive(true);
			}
		}
	});

	/* ---- textbox ---- */
	(function TextBox() {

		var style_sources = {};
		var active_textbox;

		proto.define(["text-box", "password-box"], function(evt) {
			var command = evt.args[0];
				text_name = evt.args[1];
			var text = this.querySelector('[data-name="' + text_name + '"]');
			init(this, text, command.replace("-box", ""));
		});

		proto.define("text-box-clear", function() {
			if(active_textbox) {
				active_textbox.control.value = "";
				enable(active_textbox.addonButtons, false);
				proto.focus(active_textbox.mainButton);
			}
		});

		proto.define("text-box-type", function(evt) {
			var type = evt.args[1];
			if(active_textbox) {
				active_textbox.control.type = type;
			}
		});

		proto.on("update.text-box", function(evt) {
			for (var i = 0; i < evt.elements.length; i++) {
				var el = evt.elements[i];
				if (style_sources[el.id]) {
					render(style_sources[el.id]);
				}
			}
		});

		function init(container, text, type) {

			var text_btn = text;
			while (text_btn && !text_btn.classList.contains("button")) {
				text_btn = text_btn.parentElement;
			}

			if (text_btn && !inputs[container.id]) {

				var btns = container.querySelectorAll('.button');
				var buttons = [].filter.call(btns, 
					function(b) { 
						return b != text_btn
					}); 

				// initiate textbox
				text.style.visibility = "hidden";

				var tb = document.createElement("input");
				text.parentElement.insertBefore(tb, text);
				tb.type = type;
				tb.style.position = "absolute";
				tb.style.outline = "none";
				tb.style.background = "none";
				tb.style.border = "none";

				// initiate addon buttons
				enable(buttons, false);

				var input = new Input(container, "TextBox");
				input.src = text;
				input.control = tb;
				input.addonButtons = buttons;
				input.mainButton = text_btn;
				input.isActiveChanged = on_activate;

				tb.onblur = function() {
					if (input.isActive) tb.focus();
				}
				tb.onkeydown = onKeyDown;
				tb.onkeyup = onKeyUp;

				style_sources[text.id] = input;
				update(input);
			}
		}

		function on_activate() {
			if(this.isActive) {
				active_textbox = this;
				this.control.focus();
			}
			else {
				this.control.blur();
			}
		}

		function render(input) {
			if (input.ticket) clearTimeout(input.ticket);
			input.control.placeholder = input.src.children[0].innerHTML;

			(function updateFrame() {
				input.ticket = setTimeout(function() {
					if (update(input)) {
						updateFrame();
					}
				}, 50);
			})();
		}

		var div_style_keys = "opacity left top width".split(" "),
			p_style_keys = "fontSize lineHeight paddingTop paddingBottom letterSpacing color textTransform textAlign fontFamily fontWeight".split(" ");

		function update(input) {

			var tb = input.control,
				div_style = input.src.style,
				p_style = input.src.children[0].style;
			var changed = false;

			for (var i = div_style_keys.length; i--;) {
				var key = div_style_keys[i],
					value = div_style[key];
				if (tb.style[key] != value) {
					tb.style[key] = value;
					changed = true;
				}
			}
			for (var i = p_style_keys.length; i--;) {
				var key = p_style_keys[i],
					value = p_style[key];
				if (tb.style[key] != value) {
					tb.style[key] = value;
					changed = true;
				}
			}
			return changed;
		}

		function onKeyDown(evt) {
			if (evt.keyCode != 9 && evt.keyCode != 13) {
				evt.stopPropagation();
			}
		}

		function onKeyUp(evt) {
			if (evt.keyCode != 9 && evt.keyCode != 13) {
				evt.stopPropagation();
				if (active_textbox) {
					var v = active_textbox.control.value;
					active_textbox.value = v;
					enable(active_textbox.addonButtons, v.length > 0);
				}
			}
		}

		function enable(btns, is_enabled) {
			var need_update = false;

			for (var i = btns.length; i--;) {
				var btn = btns[i];
				var was_enabled = !btn.classList.contains("disabled");
				if (was_enabled != is_enabled) {
					btn.classList[is_enabled ? "remove" : "add"]("disabled");
					need_update = true;
				}
			}

			if (need_update)
				proto.update();
		}

	})();

	/* ---- radio button ---- */
	(function RadioButton() {

		proto.define("radio-btn-group", function(evt) {
			new Input(this, "RadioButtonGroup");
		});

		proto.define("radio-btn-select", function(evt) {
			var name = evt.args[1];
			var target_btn;
			if(name) {
				target_btn = document.querySelector('[data-name="' + text_name + '"]');
			}
			else {
				target_btn = document.querySelector('#' + evt.src);
			}

			if(target_btn && button_owners[target_btn.id]) {
				var group = button_owners[target_btn.id];
				if(group && group.type == "RadioButtonGroup") {
					for(var i = group.buttons.length; i--;) {
						var b = group.buttons[i];
						b.classList[b == target_btn? "add":"remove"]("selected");
					}
					proto.update();
				}
			}
		})

	})();

	/* ---- combo box ---- */
	(function ComboBox() {

		proto.define("combo-box", function() {
			var input = new Input(this, "ComboBox");
			input.isActiveChanged = on_activate;
		});

		proto.define("combo-box-value", function(evt) {

			var name = evt.args[1];
			var combo;

			var container = this;
			while (container && !(container.id in inputs)) {
				container = container.parentElement;
			}
			if(container) {
				var combo = inputs[container.id];
				if(combo.type == "ComboBox" && !combo.contentSelector) {
					combo.output = this;
					combo.contentSelector = '[data-name="' + name + '"]';
				}
			}
			
		});

		proto.define("combo-box-select", function(evt) {
			var name = evt.args[1];
			var target_btn;
			if(name) {
				target_btn = document.querySelector('[data-name="' + text_name + '"]');
			}
			else {
				target_btn = document.querySelector('#' + evt.src);
			}

			if(target_btn && button_owners[target_btn.id]) {
				var combo = button_owners[target_btn.id];
				if(combo && combo.type == "ComboBox") {
					for(var i = combo.buttons.length; i--;) {
						var b = combo.buttons[i];
						b.classList[b == target_btn? "add":"remove"]("selected");
					}
					// close
					combo.container.classList.remove("open");

					// update value
					if(combo.contentSelector) {
						var content = target_btn.querySelector(combo.contentSelector);
						if(content) {
							combo.value = content;
							combo.output.innerHTML = content.innerHTML;
						}
					}
					else {
						combo.value = target_btn;
					}

					// move focus to a visible button
					proto.update(false, function() {
						proto.focus(combo.container.querySelector(".button:not(.hidden)"));
					});
				}
			}

		});

		function on_activate() {
			if(!this.isActive) {
				this.container.classList.remove("open");
			}
		}

	})();


})(); 