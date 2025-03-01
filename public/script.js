document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("typing");
  const sendBtn = document.getElementById("send-btn");
  const chatBox = document.getElementById("userchat");
  const micBtn = document.getElementById("microphone-btn");
  const visualizerContainer = document.getElementById(
    "audio-visualizer-container"
  );
  const canvas = document.getElementById("audio-visualizer");
  const ctx = canvas.getContext("2d");
  let isRecording = false;
  let recognition = null;
  let analyser = null;
  let dataArray = null;
  let animationId = null;

  if (!chatBox) {
    console.error("Chat box element not found");
    return;
  }

  const conversationHistory = [];

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  });

  const greeting = document.querySelector(".greeting h1");
  const date = new Date();
  const hours = date.getHours();
  let greetingMessage = "Good Evening, Señor!";

  if (hours >= 5 && hours < 12) {
    greetingMessage = "Good Morning, Señor!";
  } else if (hours >= 12 && hours < 17) {
    greetingMessage = "Good Afternoon, Señor!";
  } else if (hours >= 17 && hours < 21) {
    greetingMessage = "Buenas tardes, Señor!";
  } else {
    greetingMessage = "Buenas noches, Maestro!";
  }
  greeting.textContent = greetingMessage;

  function scrollChatToBottom() {
    chatBox.scrollTo({
      top: chatBox.scrollHeight,
      behavior: "smooth",
    });
  }

  function playMessageSentSound() {
    try {
      const audio = new Audio("./sounds/message-sent.mp3");
      audio.volume = 0.5;
      audio.play().catch((error) => {
        console.log("Error playing sent sound:", error);
      });
    } catch (error) {
      console.log("Error creating audio:", error);
    }
  }

  function playMessageReceivedSound() {
    try {
      const audio = new Audio("./sounds/message-recieved.mp3");
      audio.volume = 1;
      audio.play().catch((error) => {
        console.log("Error playing received sound:", error);
      });
    } catch (error) {
      console.log("Error creating audio:", error);
    }
  }

  function typeMessage(element, text, index = 0) {
    if (index < text.length) {
      element.innerHTML += text.charAt(index);
      setTimeout(() => typeMessage(element, text, index + 1), 20);
    }
  }

  const sendMessage = async () => {
    const userMessage = textarea.value.trim();
    if (!userMessage) return textarea.focus();

    addMessageToChatBox(userMessage, "user");
    playMessageSentSound();
    conversationHistory.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    textarea.value = "";
    textarea.style.height = "30px";

    const botPlaceholder = document.createElement("div");
    botPlaceholder.classList.add("message", "bot", "loading");
    botPlaceholder.innerHTML = `
      <div class="formatted-message">
        <span class="typewriter">El Pensador is thinking</span>
      </div>`;
    chatBox.appendChild(botPlaceholder);
    scrollChatToBottom();

    try {
      const apiKey = "AIzaSyD53qitgGA8RNRV3yD5qGt3ZIGu8_DKvoM";
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`;

      const payload = {
        contents: conversationHistory,
        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        },
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const botResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't process your request.";

      botPlaceholder.remove();

      const tempDiv = document.createElement("div");
      addMessageToChatBox(botResponse, "bot", tempDiv);

      const messageElement = document.createElement("div");
      messageElement.classList.add("message", "bot");
      const formattedMessage = document.createElement("div");
      formattedMessage.classList.add("formatted-message");
      messageElement.appendChild(formattedMessage);
      chatBox.appendChild(messageElement);

      typeMessage(formattedMessage, tempDiv.innerHTML);
      playMessageReceivedSound();

      conversationHistory.push({
        role: "model",
        parts: [{ text: botResponse }],
      });
    } catch (error) {
      console.error("Error getting bot response:", error);
      botPlaceholder.innerHTML = `<div class="formatted-message">Sorry, something went wrong.</div>`;
      setTimeout(() => {
        botPlaceholder.remove();
      }, 3000);
    } finally {
      scrollChatToBottom();
    }
  };

  sendBtn.addEventListener("click", () => {
    sendMessage();
  });

  textarea.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    // Remove the line that escapes apostrophes
  }

  //adding messages to chat box
  const addMessageToChatBox = (message, sender, tempDiv) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);

    const formattedMessage = document.createElement("div");
    formattedMessage.classList.add("formatted-message");

    let parsedAsJson = false;
    try {
      const parsed = JSON.parse(message);
      if (parsed && Array.isArray(parsed.blocks)) {
        parsedAsJson = true;
        let htmlContent = "";
        parsed.blocks.forEach((block, index, array) => {
          if (block.type === "text") {
            htmlContent += `<p>${escapeHtml(block.content)
              .replace(/\n/g, "<br>")
              .replace(
                /^\* /gm,
                sender === "bot" ? "&#9679; " : "&#8226; "
              )}</p>`;
            if (sender === "bot" && index !== array.length - 1) {
              htmlContent += "<br>";
            }
          } else if (block.type === "code") {
            const safeCode = escapeHtml(block.content);
            const language = block.language || "plaintext";
            htmlContent += `
              <div class="code-block">
                <button class="copy-btn" onclick="copyCode(this)">Copy</button>
                <span class="language-label">${language}</span>
                <pre><code class="language-${language}">${safeCode}</code></pre>
              </div>`;
          } else if (block.type === "image") {
            htmlContent += `<img src="${block.url}" alt="${escapeHtml(
              block.alt || ""
            )}" />`;
          } else {
            htmlContent += `<p>${escapeHtml(block.content)}</p>`;
          }
        });
        formattedMessage.innerHTML = htmlContent;
      }
    } catch (e) {
      parsedAsJson = false;
    }

    if (!parsedAsJson) {
      let formattedText = message
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>")
        .replace(/(?<!`)`([^`\n]+)`(?!`)/g, "<code>$1</code>")
        .replace(
          /\$\\boxed\{(.*?)\}\$/g,
          '<span class="math">\\boxed{$1}</span>'
        )
        .replace(
          /```(\w+)?\n?([\s\S]*?)```/g,
          (match, language = "plaintext", code) => {
            const safeCode = sender === "user" ? code : escapeHtml(code);
            return `<div class="code-block"><span class="language-label">${language}</span><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-${language}">${safeCode}</code></pre></div>`;
          }
        );

      const paragraphs = formattedText
        .split(/\n{2,}/)
        .map((para, index, array) => {
          // Remove extra line breaks after <pre> blocks
          if (para.includes("<pre>")) {
            return `<p>${para
              .replace(/\n/g, "<br>")
              .replace(
                /^\* /gm,
                sender === "bot" ? "&#9679; " : "&#8226; "
              )}</p>`;
          } else {
            return `<p>${para
              .replace(/\n/g, "<br>")
              .replace(
                /^\* /gm,
                sender === "bot" ? "&#9679; " : "&#8226; "
              )}</p>${
              sender === "bot" && index !== array.length - 1 ? "<br>" : ""
            }`;
          }
        });
      formattedText = paragraphs.join("");
      formattedMessage.innerHTML = formattedText;
    }

    messageElement.appendChild(formattedMessage);
    chatBox.appendChild(messageElement);

    // Add this block to render math expressions
    document.querySelectorAll(".math").forEach((element) => {
      katex.render(element.textContent, element, {
        throwOnError: false,
        displayMode: false,
      });
    });

    scrollChatToBottom();
  };

  window.copyCode = function (button) {
    const codeElement = button.parentElement.querySelector("pre code");
    if (!codeElement) return;

    const codeText = codeElement.textContent;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard
        .writeText(codeText)
        .then(() => {
          button.textContent = "Copied!";
          setTimeout(() => (button.textContent = "Copy"), 2000);
        })
        .catch((err) => {
          console.error("Clipboard API error:", err);
          fallbackCopyText(codeText, button);
        });
    } else {
      fallbackCopyText(codeText, button);
    }
  };

  function fallbackCopyText(text, button) {
    const tempTextarea = document.createElement("textarea");
    tempTextarea.value = text;
    tempTextarea.style.position = "fixed";
    tempTextarea.style.top = "-9999px";
    document.body.appendChild(tempTextarea);
    tempTextarea.focus();
    tempTextarea.select();

    try {
      const successful = document.execCommand("copy");
      if (successful) {
        button.textContent = "Copied!";
        setTimeout(() => (button.textContent = "Copy"), 2000);
      } else {
        console.error("Fallback: Copy command unsuccessful");
      }
    } catch (err) {
      console.error("Fallback: Unable to copy", err);
    }

    document.body.removeChild(tempTextarea);
  }

  // Initialize Web Speech API
  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
  }

  // Audio visualization setup
  function setupAudioVisualization() {
    canvas.width = 150;
    canvas.height = 150;

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);

        window.audioStream = stream;
        animationId = requestAnimationFrame(drawVisualizer);
      })
      .catch((err) => {
        console.error("Error accessing microphone:", err);
        stopRecording();
      });
  }

  // Draw the audio visualizer
  function drawVisualizer() {
    if (!analyser || !isRecording) return;

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;

    // Clear canvas
    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Get audio data
    analyser.getByteFrequencyData(dataArray);

    // Calculate average amplitude
    const averageAmplitude =
      Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length / 255;

    // Draw background
    ctx.fillStyle = "rgba(0, 0, 20, 0.8)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw vertical bars
    const barCount = 32; // Number of bars
    const barWidth = WIDTH / barCount - 2; // Width of each bar
    const maxBarHeight = HEIGHT * 0.8; // Maximum height of bars

    for (let i = 0; i < barCount; i++) {
      const amplitude = dataArray[i] / 255.0; // Normalize amplitude
      const barHeight = amplitude * maxBarHeight; // Calculate height based on amplitude

      const x = i * (barWidth + 2); // X position of the bar
      const y = centerY - barHeight / 2; // Center the bar vertically

      // Create gradient for each bar
      const gradient = ctx.createLinearGradient(x, 0, x, HEIGHT);
      gradient.addColorStop(0, `rgba(0, 255, 255, ${amplitude})`);
      gradient.addColorStop(1, `rgba(0, 150, 255, ${amplitude * 0.5})`);

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight); // Draw the bar
    }

    // Continue animation
    if (isRecording) {
      requestAnimationFrame(drawVisualizer);
    }
  }

  // Handle microphone button click
  micBtn.addEventListener("click", () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  function startRecording() {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser");
      return;
    }

    isRecording = true;
    micBtn.parentElement.classList.add("recording");
    visualizerContainer.style.display = "block";

    // Clear previous text
    textarea.value = "";

    // Setup speech recognition first
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      textarea.value = finalTranscript + interimTranscript;
      textarea.dispatchEvent(new Event("input"));
    };

    recognition.onend = () => {
      if (isRecording) {
        recognition.start();
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        stopRecording();
      }
    };

    // Start both speech recognition and audio visualization
    recognition.start();
    setupAudioVisualization();
  }

  function stopRecording() {
    isRecording = false;
    micBtn.parentElement.classList.remove("recording");
    visualizerContainer.style.display = "none";

    // Stop speech recognition
    if (recognition) {
      recognition.stop();
    }

    // Stop animation
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Cleanup audio context
    if (analyser) {
      analyser.disconnect();
      analyser = null;
    }

    // Stop all audio tracks
    if (window.audioStream) {
      window.audioStream.getTracks().forEach((track) => track.stop());
      window.audioStream = null;
    }
  }

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (isRecording) {
      stopRecording();
    }
  });
});
