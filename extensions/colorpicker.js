/* MONOGRAPH EXTENSION
	{
		"name": "colorpicker",
		"description": "Batch testing multiple color themes",
		"author": "Xiaoji Chen (cxiaoji@gmail.com)",
		"target": [1.4, 1.49],
		"actions": ["textbox"]
	}
*/

(function() {

	/*---- config ----*/

	// The color palette used in file
	var REPLACEABLE = ["#1EBCEF", "#A5DEF1", "#80D3EE", "#4AC7ED", "#049ABE", "#047095", "#045D71"];

	// The colors to replace with.
	// First color in array will be used as the theme's icon.
	var THEMES = {
		"User Color 00":	["#1EBCEF", "#A5DEF1", "#80D3EE", "#4AC7ED", "#049ABE", "#047095", "#045D71"],
		"User Color 01":	["#02B7C1", "#9AD7D6", "#6FCACE", "#41C1C7", "#019DA3", "#038386", "#036667"],
		"User Color 02":	["#45BD9F", "#C6E7E2", "#90D3CB", "#5FC4B3", "#01B294", "#018374", "#025F50"],
		"User Color 03":	["#45B86A", "#ADDABF", "#7FC9A0", "#5ABE82", "#06AD57", "#158A44", "#07743B"],
		"User Color 04":	["#43B649", "#AFD9A9", "#83C774", "#61BB46", "#1FA149", "#197E3F", "#146C37"],
		"User Color 05":	["#84C441", "#D6E5AE", "#BAD875", "#9CCB42", "#6BB845", "#589C43", "#4B843D"],
		"User Color 06":	["#B9D532", "#F5F3B3", "#E0E77C", "#CFDE47", "#A3CD3A", "#8CBE3F", "#73AB42"],
		"User Color 07":	["#FBE000", "#F9F1A5", "#F9EC6D", "#FCEE23", "#DDBF25", "#C09D2E", "#98722B"],
		"User Color 08":	["#FDBA12", "#FFE5B5", "#FFD679", "#FFC83E", "#EAA422", "#D28D29", "#AB6327"],
		"User Color 09":	["#F78C1F", "#FED9BA", "#FEC987", "#FAAA47", "#D37528", "#B06127", "#80441D"],
		"User Color 10":	["#F26422", "#F2D6C9", "#F7B08A", "#F68A4B", "#C95227", "#A64324", "#803019"],
		"User Color 11":	["#EF3E23", "#EDC7C2", "#ED998A", "#EF6A50", "#D94026", "#A62922", "#801E18"],
		"User Color 12":	["#E71E28", "#F5ACBA", "#E5808A", "#E84858", "#C42127", "#A71E22", "#75101E"],
		"User Color 13":	["#EF4748", "#F9BFBF", "#F58C8D", "#F26768", "#D63738", "#A4272C", "#751822"],
		"User Color 14":	["#E2048C", "#DEA5CB", "#D679B1", "#D84799", "#BE1D7A", "#9B1F64", "#78184F"],
		"User Color 15":	["#842990", "#CFA5CC", "#B984BA", "#9C52A0", "#722980", "#5C256A", "#451A54"],
		"User Color 16":	["#7B6BB0", "#C4C1E1", "#AEA0CE", "#9789C1", "#7060AA", "#5E4B9F", "#4B397B"],
		"User Color 17":	["#5559A7", "#BFBEDF", "#908CC4", "#6869B0", "#48499E", "#33338A", "#292865"],
		"User Color 18":	["#3F5CAA", "#ACC8E9", "#84A1D3", "#4F72B7", "#3752A4", "#2C429B", "#2A3282"],
		"User Color 19":	["#EA1460", "#ECBED3", "#F495BE", "#ED4288", "#C21E55", "#961A48", "#6B0D38"],
		"User Color 20":	["#AC2A90", "#CF97C4", "#C079B3", "#B1489B", "#952688", "#7D2572", "#5B1D5C"],
		"User Color 21":	["#734FA0", "#CFC3E0", "#A891C5", "#8A6CB0", "#5E3090", "#502C7F", "#41276B"],
		"User Color 22":	["#6965AD", "#B6B5DB", "#9A94C8", "#7D77B7", "#5B56A5", "#4B4299", "#383479"],
		"User Color 23":	["#445CA9", "#ABBBE0", "#8191C9", "#576AB2", "#394DA1", "#2A3887", "#212B5D"],
		"User Color 24":	["#2F76BC", "#B4DBF1", "#85BEE8", "#4495D1", "#0C64AF", "#02508C", "#173A65"],
		"User Color 25":	["#69797E", "#BAC7CC", "#A1AEB3", "#859499", "#5A6A6C", "#4B555A", "#394146"],
		"User Color 26":	["#7B7674", "#CDC7C4", "#B3AEAC", "#999491", "#6F6C69", "#5D5A5A", "#4E4B48"],
		"User Color 27":	["#597E74", "#C9E0D9", "#A3BFB9", "#7E9E95", "#496962", "#3C554E", "#2F413C"]
	};

	/*---- end config ----*/

	var prototype = proto,
		prototype_data = proto_data,
		styles = proto_data.styles;
	var theme_picker;

	prototype.define("change-theme", function(command, theme_key) {
		setTheme(theme_key);
	});

	prototype.on("ready.user-color", function(evt) {

		if (evt.isMaster) {
			// only add UI in top level window

			// insert CSS rules
			var stylesheet = d3.select(document.head).append("style")
				.text("#theme-picker * { pointer-events: all; }" + "#theme-picker { top: 0; width: 100%; height: 100%; overflow:hidden; }" + "#theme-picker .tab { position: absolute; left: 200px; width:40px; height: 40px; line-height: 40px; text-align: center; background: #888; color: #fff; cursor:pointer; opacity: 0.5; }" + "#theme-picker .container { position: absolute; left: -200px; width: 200px; height: 100%; padding: 10px; background: #fff; font-family:Segoe UI; transition: left 0.5s; }" + "#theme-picker .color { position: relative; width: 40px; height: 40px; display:inline-block; margin: 8px 8px; border:1px solid #ccc; cursor: pointer; }" + "#theme-picker .color.selected { width: 56px; height: 56px; display:inline-block; margin: 0; border-width:8px; }" + "#theme-picker.open .container { left: 0; }");

			// append picker UI
			theme_picker = d3.select(document.body).append("div")
				.attr("id", "theme-picker");
			var theme_picker_container = theme_picker.append("div")
				.classed("container", 1);
			var theme_picker_tab = theme_picker_container.append("div")
				.classed("tab", 1)
				.text(">")
				.on("click", function() {
					is_open = !is_open;
					theme_picker.classed("open", is_open);
					theme_picker_tab.text(is_open ? "<" : ">");
				});

			var is_open = false;

			for (var i in THEMES) {
				theme_picker_container.append("div")
					.classed("color", 1)
					.style("background", THEMES[i][0])
					.attr("title", i)
					.on("click", function() {
						setTheme(this.title);
					});
			}
		}

	});


	function setTheme(key) {

		if (theme_picker) {
			theme_picker.selectAll(".selected").classed("selected", 0);
			theme_picker.select('.color[title="' + key + '"]').classed("selected", 1);
		}

		var colors = THEMES[key];
		if (colors) {

			// from: to
			var mapping = {};
			for (var i = 0; i < REPLACEABLE.length; i++) {
				mapping[REPLACEABLE[i]] = colors[i];
				mapping[hexToRgb(REPLACEABLE[i])] = colors[i];
			}

			var new_styles = {};

			// replace all occurance in css
			for (var i in styles) {
				var style = styles[i];
				var new_style = new_styles[i] = {};

				for (j in style) {
					var value = style[j];
					new_style[j] = mapping[value] ? mapping[value] : value;
				}
			}
			prototype_data.styles = new_styles;
		} else {
			prototype_data.styles = styles;
		}

		// notify embedded prototypes
		var message = 'change-theme "' + key + '"';
		d3.selectAll("iframe[id]")
			.each(function() {
				prototype.tell(this, message);
			})

		prototype.update(true);
	}

	// convert hex values to rgb
	function hexToRgb(hex) {
		var c = parseInt("0x" + hex.substr(1));
		return "rgb(" + Math.floor(c/256/256) + "," + (Math.floor(c/256)%256) + "," + (c%256) + ")";
	}

})();