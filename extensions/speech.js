/* MONOGRAPH EXTENSION
	{
		"name": "speech",
		"description": "Speech synthesis",
		"author": "Xiaoji Chen (cxiaoji@gmail.com)",
		"target": [1.4, 1.49],
		"triggers": ["Speaking", "Spoken"],
		"actions": ["say", "listen", "said"]
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

	if (window.webkitSpeechRecognition) {

		var final_transcript;

		var recognizing = false;
		var error = false;
		var start_time;

		proto.define("listen", function() {
			if (!recognizing) {
				recognition.start();
			}
		});

		proto.define("said", function(evt) {
			if(evt.args[1].toLowerCase() == evt.data.text.toLowerCase()) {
				var action = '"' + evt.args.slice(2).join('" "') + '"';
				proto.tell(proto.SELF, action);
			}
		})

		var recognition = new webkitSpeechRecognition();
		recognition.continuous = false;
		recognition.interimResults = true;
		recognition.lang = "en-US";

		recognition.onstart = function(event) {
			recognizing = true;
			final_transcript = '';
			start_time = event.timeStamp;
		};

		recognition.onerror = function(event) {
			console.log(event.error);
			error = true;
		};

		recognition.onend = function() {
			recognizing = false;
			if (error) {
				error = false;
			}
			else {
				proto.trigger(proto.FOCUS, "Spoken", {
					text: final_transcript,
					start: start_time,
					timeStamp: event.timeStamp
				});
			}
		};

		recognition.onresult = function(event) {
			var interim_transcript = '';
			if (typeof(event.results) == 'undefined') {
				error = true;
				recognition.stop();
				return;
			}
			for (var i = event.resultIndex; i < event.results.length; ++i) {
				if (event.results[i].isFinal) {
					final_transcript += event.results[i][0].transcript;
				} else {
					interim_transcript += event.results[i][0].transcript;
				}
			}
			proto.trigger(proto.FOCUS, "Speaking", {
				text: final_transcript,
				interim: interim_transcript,
				start: start_time,
				timeStamp: event.timeStamp
			});
		};
	}


})();