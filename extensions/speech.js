/* MONOGRAPH EXTENSION
	{
		"name": "speech",
		"description": "Speech synthesis",
		"author": "Xiaoji Chen (cxiaoji@gmail.com)",
		"target": [1.4, 1.49],
		"actions": ["say"]
	}
*/

(function() {

	if (window.speechSynthesis) {
		// Synthesis support. 
		var voices;

		proto.define("say", function(evt) {
			if (!voices) {
				voices = speechSynthesis.getVoices();
			}

			if (speechSynthesis.speaking) {
				speechSynthesis.cancel();
			}

			var msg = new SpeechSynthesisUtterance(evt.args[1]);
			/* speech synth service is causing lag, just use local */
			// msg.voice = voices[10]; 

			var options = {
				volume: 1, // 0 to 1
				rate: 1, // 0.1 to 10
				pitch: 0, //0 to 2
				voiceURI: 'native',
				lang: 'en-US'
			}

			for (var i = 2; i < arguments.length; i += 2) {
				var key = arguments[i],
					value = arguments[i + 1];

				if (!isNaN(value * 1)) value *= 1; // is number

				if (key in options) {
					options[key] = value;
				}
			}
			for (var i in options) {
				msg[i] = options[i];
			}

			speechSynthesis.speak(msg);
		});

	} else {
		console.log("Speech synthesis is not supported in this browser.")
	}

})();