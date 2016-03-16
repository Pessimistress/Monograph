var proto = (function() {

	/* variables */
	var data = proto_data,
		allArtboards = data.artboards,
		settings = data.settings,
		states = data.states;
	var thisWindow = window;

	// action definitions
	var actions = [];
	// artboard
	var sceneName, artboard, artboardName;
	// valid artboards in the current scene
	var artboards;
	// size and scaling
	var abW,
		abH,
		abScale;

	var select = d3.select,
		selectAll = d3.selectAll,
		toFunction = d3.functor,
		listenTo = thisWindow.addEventListener;

	// all objects with keyframes
	var allNodes = [];
	// embedded nodes (iframe)
	var iframeNodes = [];

	// embedding window
	var parentWindow;
	var windowPath = "";
	var pending_load_callback;

	// navigation back stack
	var backstack = [];

	// if focus is within this scope or its embedded iframes
	var has_focus = false;
	// node on focus
	var focus,
		focus_button;

	// render settings
	var anim_dur = toFunction(settings.transition_duration),
		anim_ease = toFunction(settings.easing_func + "-" + settings.easing_mode),
		anim_delay = toFunction(0);
	var auto_scale = settings.auto_scale;
	var state_ranks = ["press", "focus", "hover"];

	// events
	var events = d3.dispatch("fallback", "ready", "focuschange", "navigate", "update");

	// classes
	var objClass = "_",
		focusClass = "focus",
		hiddenClass = "hidden",
		disableClass = "disabled",
		focusWithinClass = "has-focus",
		btnClass = "button";
	var btnSelector = ":not(." + hiddenClass + "):not(." + disableClass + ")";

	// if the current window is embedded in another prototype
	var is_embedded = (thisWindow.location.search.match(/\bembedded\b/) != null);
	// if update() is being called
	var is_updating = false,
		pending_updates = [];

	/* constants */
	var SELF = 0,
		PARENT = 1,
		FOCUS = 2;
	var DIR = {
		U: 0,
		R: 1,
		D: 2,
		L: 3,
		N: 4,
		P: 5
	};
	var stateNamePattern = /[^:]+/g;
	var pivotPattern = [
		/u|y|a/i,
		/r|x|a/i,
		/d|y|a/i,
		/l|x|a/i
	];
	var nav_order = ["20310", "31022", "20132", "31200"];


	/* utilities */
	function first(arr, filter) {
		for (var i = 0, n = arr.length; i < n; i++) {
			var a = arr[i];
			if (filter(a)) return a;
		}
		return null;
	}

	function isFunction(object) {
		return typeof object == "function";
	}

	function transformRect(r, dx, dy, sx, sy) {
		return [
			r[0] * sx + dx,
			r[1] * sy + dy,
			r[2] * sx + dx,
			r[3] * sy + dy
		];
	}

	function unionRect(r1, r2) {
		return r1 && r2 ? [
			r1[0] < r2[0] ? r1[0] : r2[0],
			r1[1] < r2[1] ? r1[1] : r2[1],
			r1[2] > r2[2] ? r1[2] : r2[2],
			r1[3] > r2[3] ? r1[3] : r2[3]
		] : r1 || r2;
	}

	function getData(selector) {
		return select(selector).datum();
	}

	function combineStyles(d1, d2) {
		var result = {};
		for (var k in d1) {
			result[k] = d1[k];
		}
		for (var k in d2) {
			result[k] = d2[k];
		}
		return result;
	}

	function equalStyles(d1, d2) {
		if (d1 == d2) return true;
		if (d1 && d2) {
			for (var k in d2) {
				if ((k[0] != "_" || k == "_base") && d1[k] != d2[k]) return false;
			}
			return true;
		}
		return false;
	}

	function isNodeEnabled(n) {
		return n._is_visible_ && !n._instance_.classed(disableClass);
	}

	function isNodeLoaded(n) {
		return n._loaded_;
	}

	function isButtonFocus(n) {
		return n._is_focus_;
	}

	function isButtonDefault(n) {
		return n._is_default_;
	}

	function hasNodeFocus(n) {
		return n._instance_.classed(focusWithinClass);
	}

	function getNodeRect(n) {
		return n._rect_;
	}

	/* end of utilities */

	/* classes */

	function Node(key, keyframes) {
		var me = this;

		var paths = key.split(" "),
			id = paths[1];
		var obj = select("#" + id),
			domObj = obj.node();

		var keyframe_arr = [];
		for (var k in keyframes) {
			var kf = keyframes[k];
			if (typeof(kf) == "string") kf = keyframes[kf];
			keyframe_arr.push(new Keyframe(k, kf));
		}

		me._keyframes_ = keyframe_arr;
		me._style_ = -1;
		me._states_ = new Array(states.length);
		me._instance_ = obj;
		me._is_svg_ = domObj.namespaceURI.search("svg") > 0;
		me._is_clip_ = !!obj.attr("data-clip-path");
		me._is_visible_ = true;
		me._children_ = [];
		me._getRect_ = getRect;

		var parent = getData("#" + paths[0]);
		if (parent) {
			// has parent
			me._parent_ = parent;
			parent._children_.push(me);
		}

		if (domObj.tagName == "IFRAME") {
			// is embedded node

			obj.on("load", function() {
				me._loaded_ = true;
				onLoad();
			}).attr("src", obj.attr("data-src") + "?embedded");

			me._loaded_ = false;
			me._id_ = id;
			me._window_ = domObj.contentWindow;
			me._path_ = "";

			iframeNodes.push(me);
		}

		if (me._is_clip_) {
			me._id_ = "url(#" + id + "_cp)";
			parent._clip_ = me;
			while(parent) {
				parent._instance_.style("pointer-events", "none");
				parent = parent._parent_;
			}
		}

		me._button_ = obj.classed(btnClass) ? (new ButtonInfo(me, id)) : null;

		obj.classed(objClass, 1).datum(me);
		allNodes.push(me);
	}

	function getRect() {
		// Calculate bounds by adding bounding boxes of children objects
		var me = this;
		if (me._clip_) {
			return me._clip_._rect_;
		}

		var r = me._rect_;
		if (!r) {
			var children = me._children_;
			for (var i = children.length; i--;) {
				r = unionRect(r, children[i]._getRect_());
			}
		}
		return r;
	}

	function ButtonInfo(node, id) {
		var me = this;
		me._id_ = id;
		me._is_focus_ = false;
		me._is_default_ = false;
		me._pivot_ = "";
		me._path_ = "";
	}

	function Keyframe(key, styles) {
		var me = this;
		var tokens = key.match(stateNamePattern);
		me._artboard_ = tokens.splice(0, 1);
		me._states_ = states.map(function(s) {
			return tokens.indexOf(s) >= 0
		});
		me._styles_ = styles;
	}

	/* end of classes */

	// Resize canvas to fit in the browser window
	function resize() {
		var w = thisWindow.innerWidth,
			h = thisWindow.innerHeight,
			l, t;
		var body = document.body;

		body.parentNode.style.overflow = auto_scale? "hidden":"auto";

		if (auto_scale) {
			abScale = Math.min(h / abH, w / abW);
			l = (w - abScale * abW) / 2;
			t = (h - abScale * abH) / 2;
		} else {
			abScale = 1;
			l = w < abW ? 0 : (w - abW) / 2;
			t = h < abH ? 0 : (h - abH) / 2;
		}
		select(body).style({
			background: is_embedded? "none" : settings.background,
			width: abW + "px",
			height: abH + "px",
			transform: "translate(" + l + "px," + t + "px)" + " scale(" + abScale + ")"
		})
	}

	/* rendering */
	function update(forced, callback) {
		if(is_updating) {
			pending_updates.push(callback);
		}
		else {
			is_updating = true;
			var state_length = states.length;
			var all_styles = data.styles;
			var ranks = [],
				r;
			var updated_nodes = [];
			var ni;

			for (var i = state_length; i--;) {
				r = state_ranks.indexOf(states[i]);
				if (r < 0) r = 1;
				else r = state_ranks.length - r;
				ranks[i] = r;
			}

			for (ni = allNodes.length; ni--;) {
				allNodes[ni]._states_.fill(false);
			}

			for (var i = state_length; i--;) {
				var name = states[i];
				selectAll("." + name + "." + objClass + ", ." + name + " ." + objClass)
					.each(function(node) {
						node._states_[i] = true;
					});
			}

			if (focus || !artboard) {

				// find the artboard where the current state is located
				for (var i in artboards) {
					artboards[i]._score_ = 0;
				}

				for(var i = state_ranks.length; i--; ) {

					var s = state_ranks[i];
					var state_index = states.indexOf(s);

					// check for artboard preference
					selectAll("." + s + " ." + objClass  + ",." + s + "." + objClass).each(function(node) {
						for (var k = 0; k < node._keyframes_.length; k++) {
							var kf = node._keyframes_[k];
							var ab = artboards[kf._artboard_],
								ns = node._states_,
								fs = kf._states_;
							if (ab && fs[state_index]) ab._score_ += i;
						}
					});
				}

				var abName, abMax = -1;

				for (var i in artboards) {
					var n = artboards[i]._score_;
					if (n > abMax) {
						abMax = n;
						abName = i;
					}
				}

				artboardName = abName;
				artboard = artboards[abName];
			}

			var w = artboard.width,
				h = artboard.height;

			if(abW != w || abH != h) {
				abW = w;
				abH = h;
				resize();
			}

			for (ni = 0; ni < allNodes.length; ni++) {
				var node = allNodes[ni];

				var obj = node._instance_;
				var is_visible = !node._parent_ || node._parent_._is_visible_;
				var keyframe = null,
					keyname = -1,
					max = -1;
				var old_style = node._styles_;

				if (is_visible) {
					// find the best matching state
					for (var k = 0; k < node._keyframes_.length; k++) {
						var kf = node._keyframes_[k];
						if (kf._artboard_ == artboardName) {
							var n = 0,
								ph = false,
								ns = node._states_,
								fs = kf._states_;
							for (var i = state_length; i--;) {
								if (ns[i] == !!fs[i]) n += ranks[i];
								else if (fs[i]) n = -Infinity;
							}
							if (n > max) {
								max = n;
								keyname = k;
								keyframe = kf._styles_;
							}
						}
					}
					is_visible = !!keyframe;
				}

				obj.classed(hiddenClass, !is_visible);
				node._is_visible_ = is_visible;

				if (old_style == keyname && !forced) continue;

				if (node._is_clip_) {
					if (node._is_svg_) {
						var path = keyframe ? node._id_ : "none";
						node._parent_._instance_.attr({
							"clip-path": path
						}).style({
							"-webkit-clip-path": path,
							"clip-path": path
						});
					} else {
						if (keyframe) {
							applyStyle(node._instance_.select("div"), {
								left: ("-" + keyframe.left).replace("--", ""),
								top: ("-" + keyframe.top).replace("--", "")
							}, old_style != null);
						}
					}
				}

				if (keyframe) {
					// switch to new state

					// button options
					var btn = node._button_;
					if (btn) {
						var options = keyframe._opt;
						btn._pivot_ = (options && options.pivot) || "";
						btn._is_default_ = (options && options.default);
					}

					node._styles_ = keyname;
					node._rect_ = keyframe._rect;
					node._actions_ = keyframe._act;

					// text frame
					var paragraphs = keyframe._content;
					if (paragraphs) {
						var pars = obj.selectAll("p").data(paragraphs);
						var old_length = pars.size();
						pars.exit().remove();
						pars.enter().append("p");
						pars.html(function(d, i) {
							applyStyle(select(this), all_styles[d._base], i < old_length);
							return d.text;
						});
					}

					if (old_style == null || forced || !equalStyles(node._keyframes_[old_style]._styles_, keyframe)) {
						if (keyframe._base) {
							keyframe = combineStyles(all_styles[keyframe._base], keyframe);
						}
						applyStyle(obj, keyframe, old_style != null);
					}

					updated_nodes.push(node);
				} else {
					// no valid state found
					node._rect_ = null;
					node._styles_ = null;
				}
			}

			for(ni = 0; ni < updated_nodes.length; ni++) {
				var node = updated_nodes[ni];
				var act = node._actions_,
					cmd = act && act.load;
				var element = updated_nodes[ni] = node._instance_.node();

				if (cmd) {
					// invoke load trigger					
					executeAction.call(element, {
						_command_: cmd,
						_event_: new TriggerEvent(element, "load")
					});
				}
			}
			if (ni) events.update.call(this, {
				elements: updated_nodes
			});

			is_updating = false;

			// callbacks
			if (pending_updates.length) {
				var queue = pending_updates, cb;
				pending_updates = [];
				update();
				while(queue.length) {
					if(cb = queue.shift()) cb();
				}
			}
			if(callback) callback();
		}
	}

	// animate to new state
	function applyStyle(obj, properties, use_transition) {
		var attributes = {},
			styles = {};

		for (var i in properties) {
			if (i[0] == "_") continue;

			if (i.search("svg-") == 0) {
				attributes[i.slice(4)] = properties[i];
			} else {
				styles[i] = properties[i];
			}
		}

		if (use_transition) {
			var dom = obj.node();
			var dur = anim_dur(dom),
				delay = anim_delay(dom),
				ease = anim_ease(dom).split(" ");

			obj.transition()
				.ease(ease[0], ease[1])
				.duration(dur)
				.delay(delay)
				.style(styles).attr(attributes);
		} else {
			obj.style(styles).attr(attributes);
		}
	}

	function gotoScene(name, target_focus, override_default_focus) {
		if (name && name != sceneName) {

			var abs = {};
			var ab;

			for (var i in allArtboards) {
				if (name == allArtboards[i].scene) {
					abs[i] = allArtboards[i];
				}
			}

			if (Object.keys(abs).length) {
				// scene exists

				events.navigate.call(this, {
					oldScene: sceneName,
					newScene: name
				});

				sceneName = name;
				artboards = abs;
				artboardName = Object.keys(abs)[0];
				artboard = abs[artboardName];

				update(false, function() {
					if (target_focus) {
						proposeFocus(target_focus);
					} else if (has_focus && !override_default_focus) {
						proposeFocus();
					}						
				});
			}
		}
	}

	var message_handlers = [
		null, // 0 (reserved)
		onLoad, // 1
		getNavTargets, //2
		setFocus, // 3
		invoke, // 4
		goBack, // 5
		proposeFocus, // 6
		notify, // 7
		executeAction // 8
	];
	var crosstalk = CrossTalk(message_handlers);

	// communication between the current window and iframes
	function CrossTalk(handlers) {
		var pending_requests = {};
		var request_count = 0;

		function sendMessage(win, request_type, passdata, callback) {
			if (win) {
				var request_id = "r" + (request_count++);
				if (callback) pending_requests[request_id] = callback;

				win.postMessage({
					_id_: request_id,
					_waiting_: !!callback,
					_type_: request_type,
					_data_: passdata
				}, "*");
			}
		}

		function sendMessages(nodes, request_type, passdata, callback) {
			var n = nodes.length;
			var results = [];

			if (!n && callback) callback(results);

			nodes.map(function(node, i) {
				var data = isFunction(passdata) ? passdata(node, i) : passdata;
				sendMessage(node._window_, request_type, data, function(d) {
					results[i] = d;
					if (!(--n) && callback) {
						callback(results);
					}
				});
			});
		}

		function receiveMessage(evt) {
			var d = evt.data,
				data = d._data_,
				type = d._type_;
			if (type == 0) {
				var respond_id = data._id_;
				if (pending_requests[respond_id]) {
					pending_requests[respond_id](data._data_);
					pending_requests[respond_id] = null;
				}
				return;
			} else {
				var callback = d._waiting_ ? function(result) {
					crosstalk._reply_(evt, result);
				} : null;
				var handler = handlers[type];
				if (handler) handler.call(evt, data, callback);
			}
		}

		function respond(evt, content) {
			sendMessage(evt.source, 0, {
				_id_: evt.data._id_,
				_data_: content
			});
		}

		listenTo("message", receiveMessage);

		return {
			_send_: sendMessage,
			_sendAll_: sendMessages,
			_reply_: respond
		}
	}

	// pass message to the specified window
	function notify(selector, type, passdata) {
		if (!type) {
			passdata = selector._data_;
			type = selector._type_;
			selector = selector._selector_;
		}

		if (selector == FOCUS) {
			if (focus && focus._button_) {
				found(select("." + btnClass + "." + focusClass).node());
			} else {
				var win = focus ? focus._window_ : parentWindow;
				crosstalk._send_(win, 7, {
					_selector_: selector,
					_type_: type,
					_data_: passdata
				});
			}
		} else if (selector == SELF) {
			found(thisWindow);
		} else if (selector == PARENT) {
			crosstalk._send_(parentWindow, type, passdata);
		} else {
			var win = getData(selector)._window_;
			if (win) {
				crosstalk._send_(win, type, passdata);
			} else {
				found(selector);
			}
		}

		function found(obj) {
			message_handlers[type].call(obj, passdata);
		}
	}

	// collect all visible buttons
	function getNavTargets(dim, callback) {
		var iframes = iframeNodes.filter(isNodeEnabled);

		crosstalk._sendAll_(
			iframes,
			2,
			getNodeRect,
			function(data) {
				var result = [],
					j = 0;

				selectAll("." + btnClass + btnSelector + ",iframe" + btnSelector).each(function(node) {
					var btn = node._button_;

					if (btn) {
						var bounds = node._getRect_();
						if (bounds) {
							btn._rect_ = bounds;
							result[j++] = btn;
						}
					} else {
						var i = iframes.indexOf(node);
						if (i >= 0) {
							var sub_btns = data[i];
							for (var k = sub_btns.length; k--;) {
								result[j++] = sub_btns[k];
							}
						}
					}
				})

				if (dim) {
					for (var i = result.length; i--;) {
						var r = result[i];
						r._rect_ = transformRect(r._rect_, dim[0], dim[1], abScale, abScale);
					}
				}
				if (callback) callback(result);
			}
		);

	}

	// move focus
	function moveFocus(dir, candidates) {
		if (candidates) {
			var candidate_count = candidates.length;

			dir = DIR[dir];

			var current_focus = first(candidates, isButtonFocus);
			if (!current_focus) return null;

			var next_focus = null;
			var best_heuristic;

			if (dir < 4) {
				// 0:left, 1:top, 2:right, 3:bottom
				var rect = current_focus._rect_;
				var tolerence = 8;
				var tolerence_bit = 3;

				var p = nav_order[dir];
				var reverse = p[4] - 1;
				var p0 = p[0],
					p1 = p[1],
					p2 = p[2],
					p3 = p[3];

				for (var j = candidate_count; j--;) {
					var t = candidates[j];

					var tester = pivotPattern[dir];
					var pivot_str = t._pivot_;

					var heuristic = [
						// distance from  current focus
						(t._rect_[p2] - rect[p3]) * reverse,
						// is pivot?
						pivot_str.length && tester && tester.test(pivot_str) ? -1 : 0
					];

					var overlap = Math.min(t._rect_[p0], rect[p0]) - Math.max(t._rect_[p1], rect[p1]);

					if (heuristic[0] + tolerence >= 0 && (heuristic[1] || overlap > tolerence)) {

						heuristic[0] = heuristic[0] >> tolerence_bit;
						// order by top|left
						heuristic[2] = t._rect_[p1] >> tolerence_bit

						for (var i = 0; i < 3; i++) {
							if (!best_heuristic || heuristic[i] < best_heuristic[i]) {
								next_focus = t;
								best_heuristic = heuristic;
								break;
							} else if (heuristic[i] > best_heuristic[i]) {
								break;
							}
						}
					}
				}
			} else {
				var focus_index = candidates.indexOf(current_focus);
				var next_index = ((dir == 4 ? focus_index + 1 : focus_index - 1) + candidate_count) % candidate_count;
				next_focus = candidates[next_index];
			}

			if (next_focus) setFocus(next_focus);
		} else {
			getNavTargets(0, function(result) {
				moveFocus(dir, result)
			});
		}
	}

	// set new focus
	function setFocus(target, callback) {
		var needs_update;

		has_focus = false;
		selectAll("." + focusWithinClass).classed(focusWithinClass, 0);
		focus_button = target;

		if (target && windowPath === target._path_) {
			// this window owns the target button
			has_focus = true;
			needs_update = updateFocus(getData("#" + target._id_));
		}

		// update all child iframes
		crosstalk._sendAll_(iframeNodes, 3, target,
			function(results) {
				for (var i = results.length; i--;) {
					if (results[i]) {
						has_focus = true;
						needs_update = updateFocus(iframeNodes[i]);
					}
				}
				if (!has_focus) needs_update = updateFocus();
				if (needs_update) update();
				if (callback) callback(has_focus);
			}
		);
	}

	function updateFocus(node) {
		if (focus != node) {
			if (focus) {
				if (focus._button_) focus._button_._is_focus_ = false;
				selectAll("." + focusClass).classed(focusClass, 0);
			}
			if (node) {
				if (node._button_) node._button_._is_focus_ = true;
				node._instance_.classed(focusClass, 1);
				var n = node;
				while (n) {
					n._instance_.classed(focusWithinClass, 1);
					n = n._parent_;
				}
			}
			events.focuschange.call(this, {
				oldFocus: focus && focus._instance_.node(),
				newFocus: node && node._instance_.node()
			});
			focus = node;
			return 1;
		}
	}

	// attempt to change focus
	function proposeFocus(target) {

		if (target) {
			if (target instanceof Array) {
				target = first(target, isButtonDefault) || target[0]
			}

			// pass the suggestion to top-level window
			if (parentWindow) {
				crosstalk._send_(parentWindow, 6, target);
			} else if (target) {
				setFocus(target);
			}
		} else {
			// suggest a default focus from current scope
			getNavTargets(0, proposeFocus);
		}
	}

	// add state to backstack
	function pushToBackstack() {
		var state = backstack.pop();
		if (state && state[0] != sceneName) {
			backstack.push(state);
		}
		backstack.push([sceneName, focus_button]);
		if (backstack.length > 99) backstack.shift();
	}

	// go back on the navigation stack
	function goBack() {
		var state;
		while (state = backstack.pop()) {
			if (state[0] != sceneName) {
				return gotoScene(state[0], state[1]);
			}
		}
		if (parentWindow) {
			crosstalk._send_(parentWindow, 5);
		}
	}

	function TriggerEvent(source, type, detail) {
		return {
			src: windowPath + (windowPath ? "/" : "") + (source.id || ""),
			type: type,
			data: detail
		}
	}

	// respond to trigger events
	// trigger event bubbles up the dom chain
	function invoke(event) {
		var node;

		if ("src" in event) {
			node = first(iframeNodes, function(n) {
				// source window?
				return !event.src.search(n._path_ + "/");
			});
		} else {
			node = getData(this);
			event = new TriggerEvent(this, event._trigger_, event._data_);
		}

		var trigger = event.type,
			passdata = event.data,
			result = false;

		var n = node;
		while (n) {
			var act = n._actions_;
			if (act && act[trigger]) {
				executeAction.call(n._instance_.node(), {
					_command_: act[trigger],
					_event_: event
				});
				result = true;
				break;
			}
			n = n._parent_;
		}

		if (!result) {
			if (parentWindow) {
				// bubble up
				crosstalk._send_(parentWindow, 4, event);
			} else {
				// this is top level, use fallbacks
				events.fallback.call(this, event);
			}
		}
	}

	// wait for all child iframes to load before setting default focus
	function onLoad(path, callback) {
		if (path) {
			windowPath = path;
			selectAll("." + btnClass).each(function(n) {
				n._button_._path_ = path;
			})
			pending_load_callback = callback;
			parentWindow = this.source;
		}

		if (iframeNodes.every(isNodeLoaded)) {
			if (!is_embedded || pending_load_callback) {

				crosstalk._sendAll_(
					iframeNodes,
					1,
					function(n) {
						// make sub path
						return n._path_ = (windowPath ? windowPath + "/" : "") + n._id_;
					},
					function() {
						// heard back from all
						if (pending_load_callback) {
							pending_load_callback();
						} else {
							// set default focus
							proposeFocus();
						}
						events.ready.call(this, {
							isMaster: !is_embedded
						});
					}
				);
			}
		}
	}

	// parse and execute action expression
	function executeAction(action) {
		var expression = action._command_,
			event = action._event_ || new TriggerEvent(this, "", action._data_);
		if (!expression) return;
		expression += ",";

		var in_par = false,
			n = expression.length;
		var token = "",
			tokens = [],
			commands = [];

		for (var i = 0; i < n; i++) {
			var c = expression[i];

			if (c == '"') {
				in_par = !in_par;
			} else if (in_par) {
				token += c;
			} else if (c == ' ' || c == ',') {
				if (token.length) {
					tokens.push(token);
					token = "";
				}
				if (c == ',' && tokens.length) {
					commands.push(tokens);
					tokens = [];
				}
			} else {
				token += c;
			}
		}

		for (var i = 0; i < commands.length; i++) {
			var command = commands[i];
			var callback = actions[command[0]];
			if (callback) {
				event.args = command;
				callback.call(this, event);
			}
		}

	}

	/* extensible API */
	var api = {
		SELF: SELF,
		PARENT: PARENT,
		FOCUS: FOCUS,
		init: function() {
			// Load objects and properties
			var keyframes = data.keyframes;
			for (var i in keyframes) {
				new Node(i, keyframes[i]);
			}

			listenTo("resize", resize);

			// Go to default scene
			gotoScene(allArtboards[0].scene);
			onLoad();
		},
		tell: function(target, command, passdata) {
			notify(target, 8, {
				_command_: command,
				_data_: passdata
			});
		},
		move: moveFocus,
		trigger: function(source, trigger_name, passdata) {
			if (trigger_name) {
				notify(source, 4, {
					_trigger_: trigger_name,
					_data_: passdata
				});
			}
		},
		on: function(type, listener) {
			return events.on(type, listener);
		},
		back: goBack,
		update: update,
		focus: function(obj) {
			if (obj) {
				var d = getData(obj),
					btn = d._button_;
				if (btn) {
					proposeFocus(btn);
				} else if (d._window_) {
					notify(obj, 6);
				}
			}
		},
		goto: function(artboard_name, override_focus) {
			pushToBackstack();
			gotoScene(artboard_name, null, override_focus);
		},
		define: function(action_arr, callback) {
			if (!action_arr.pop) {
				action_arr = [action_arr];
			}
			for (var i = action_arr.length; i--;) {
				actions[action_arr[i]] = callback;
			}
		},
		option: function(key, value) {
			var no_value = value === undefined;

			switch (key) {
				case "duration":
					return no_value ? anim_dur : (anim_dur = toFunction(value));
				case "delay":
					return no_value ? anim_delay : (anim_delay = toFunction(value));
				case "easing":
					return no_value ? anim_ease : (anim_ease = toFunction(value));
				case "autoscale":
					return no_value ? auto_scale : resize(auto_scale = value);
				case "states":
					return no_value ? state_ranks : (state_ranks = value);
			}
		}
	}

	return api;
})();