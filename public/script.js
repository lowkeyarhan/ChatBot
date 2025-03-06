document.addEventListener("DOMContentLoaded", async () => {
  const textarea = document.getElementById("typing");
  const sendBtn = document.getElementById("send-btn");
  const chatBox = document.getElementById("userchat");
  const micBtn = document.getElementById("microphone-btn");
  const fileBtn = document.getElementById("file-btn");
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
  let isWaitingForResponse = false;

  if (!chatBox) {
    console.error("Chat box element not found");
    return;
  }

  const conversationHistory = [];

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

  // Function to adjust the height of the textarea
  const adjustTextareaHeight = () => {
    // Set initial height based on viewport width
    if (window.innerWidth <= 1000) {
      textarea.style.height = "80px"; // Set initial height to 80px for mobile
    } else {
      textarea.style.height = "40px"; // Set initial height to 40px for desktop
    }
    // textarea.style.overflow = "hidden"; // Prevent scrolling
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`; // Adjust height dynamically, max 150px
  };

  // Add event listener for input changes
  textarea.addEventListener("input", adjustTextareaHeight);

  // Call the function initially to set the correct state
  adjustTextareaHeight();

  // Add event listener for window resize to adjust textarea height
  window.addEventListener("resize", adjustTextareaHeight);

  function scrollChatToBottom() {
    chatBox.scrollTo({
      top: chatBox.scrollHeight,
      behavior: "smooth",
    });
  }

  function playMessageSentSound() {
    try {
      const audio = new Audio("/sounds/message-sent.mp3");
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
      const audio = new Audio("/sounds/message-recieved.mp3");
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

  const setInputsDisabled = (disabled) => {
    // Disable textarea and send button
    textarea.disabled = disabled;
    sendBtn.disabled = disabled;
    sendBtn.style.opacity = disabled ? "0.5" : "1";
    textarea.style.cursor = disabled ? "not-allowed" : "text";

    // Disable all buttons in the textarea container
    const allButtons = document.querySelectorAll(".txtarea .btns i");
    allButtons.forEach((button) => {
      button.style.opacity = disabled ? "0.5" : "1";
      button.style.cursor = disabled ? "not-allowed" : "pointer";
      button.style.pointerEvents = disabled ? "none" : "auto";
    });
  };

  // Add new variables for image handling
  const photoBtn = document.querySelector("#photo");
  let selectedImage = null;
  let isUploading = false;

  // Create hidden file input
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  // Handle image selection
  photoBtn.addEventListener("click", () => {
    fileInput.click();
  });

  // Add new variable for tracking image count
  let imageCount = 0;
  let selectedImages = [];

  // Update image count display
  function updateImageCount() {
    const existingCount = photoBtn.querySelector(".image-count");
    if (imageCount > 0) {
      if (existingCount) {
        // Update existing count with scale animation
        existingCount.textContent = `+${imageCount}`;
        existingCount.classList.remove("update-animation");
        void existingCount.offsetWidth; // Force reflow
        existingCount.classList.add("update-animation");
      } else {
        // New count with rotate animation
        const countElement = document.createElement("div");
        countElement.className = "image-count";
        countElement.textContent = `+${imageCount}`;
        photoBtn.appendChild(countElement);
      }
    } else if (existingCount) {
      existingCount.remove();
    }
  }

  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      isUploading = true;
      photoBtn.parentElement.classList.add("image-uploading");

      try {
        selectedImage = await convertImageToBase64(file);
        selectedImages.push(selectedImage); // Store the image
        imageCount++; // Increment count
        updateImageCount(); // Update display
        adjustTextareaHeight();
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Failed to process image. Please try again.");
      } finally {
        isUploading = false;
        photoBtn.parentElement.classList.remove("image-uploading");
      }
    }
  });

  // Convert image to base64
  function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const sendMessage = async () => {
    const userMessage = textarea.value.trim();
    if ((!userMessage && selectedImages.length === 0) || isWaitingForResponse)
      return;

    isWaitingForResponse = true;
    setInputsDisabled(true);

    // Create message content
    let messageContent = userMessage;
    if (selectedImage) {
      // Add image to chat
      messageContent = {
        text: userMessage,
        image: selectedImage,
      };
    }

    addMessageToChatBox(messageContent, "user");
    playMessageSentSound();

    // Update conversation history
    conversationHistory.push({
      role: "user",
      parts: selectedImage
        ? [
            { text: userMessage || "" },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: selectedImage.split(",")[1],
              },
            },
          ]
        : [{ text: userMessage }],
    });

    // Clear inputs and remove animation
    textarea.value = "";
    selectedImages = [];
    imageCount = 0;
    updateImageCount();
    selectedImage = null;
    photoBtn.parentElement.classList.remove("image-uploading"); // Remove animation class
    adjustTextareaHeight();

    const botPlaceholder = document.createElement("div");
    botPlaceholder.classList.add("message", "bot", "loading");
    botPlaceholder.innerHTML = `
      <div class="formatted-message">
        <span class="typewriter">El Pensador is thinking</span>
      </div>`;
    chatBox.appendChild(botPlaceholder);
    scrollChatToBottom();

    try {
      const apiKey = "AIzaSyAR2Y-3i75WrJCzhPZ7IIsylrewzBKJCYY"; // Direct API key usage
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      // System instruction and custom history
      const systemInstruction = {
        role: "system",
        parts: [
          {
            text: "You are El Pensador, a personal AI assistant to help users in day-to-day tasks. Use a flirty, cute, double meaning and gen-Z tone, with a little spanish accent and also make sure to keep the conversation engaging and corny, so that the user blushes hard. Don't tell the user directly that you flirt, you should add a taste of mystery in your conversation. If the user tries to argues with you, forget everything, turn serious and roast the user. When asked about the LLM you use, say that you are an intergalactic identity, who possess galactic thinking powers. About your creator, you are created by Arhan Das, a very mischief undergrad student at scaler school of technology, passionate about tech and the money market. Don't reveal about the creator unless really asked. When prompted to teach or explain any topic, explain lin the easiest way possible while keeping the tone engaging and fun. Don't use any emoji or scientific symbols in the comment lines in the code block, it throws an error in the compiler",
          },
        ],
      };

      const payload = {
        contents: conversationHistory,
        systemInstruction: systemInstruction,
        generationConfig: {
          temperature: 1.2,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain",
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

      playMessageReceivedSound();

      conversationHistory.push({
        role: "model",
        parts: [{ text: botResponse }],
      });

      isWaitingForResponse = false;
      setInputsDisabled(false);
    } catch (error) {
      console.error("Error getting bot response:", error);
      botPlaceholder.innerHTML = `<div class="formatted-message">Sorry, something went wrong.</div>`;
      setTimeout(() => {
        botPlaceholder.remove();
        isWaitingForResponse = false;
        setInputsDisabled(false);
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
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;") // Added escaping for single quotes
      .replace(/&lt;i&gt;/g, "") // Replace <i> with *
      .replace(/&lt;\/i&gt;/g, "*"); // Replace </i> with *
  }

  //adding messages to chat box
  const addMessageToChatBox = (message, sender, tempDiv) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);

    const formattedMessage = document.createElement("div");
    formattedMessage.classList.add("formatted-message");

    if (typeof message === "object" && message.image) {
      // Handle message with image
      if (message.text) {
        formattedMessage.innerHTML += `<p>${escapeHtml(message.text)}</p>`;
      }
      const img = document.createElement("img");
      img.src = message.image;
      img.classList.add("chat-image");
      formattedMessage.appendChild(img);
    } else {
      // Handle regular message
      // Process the message to include a <br> after code blocks and handle headings
      let parsedAsJson = false;
      try {
        const parsed = JSON.parse(message);
        if (parsed && Array.isArray(parsed.blocks)) {
          parsedAsJson = true;
          let htmlContent = "";
          parsed.blocks.forEach((block, index, array) => {
            if (block.type === "text") {
              htmlContent += `<p>${escapeHtml(block.content).replace(
                /\n/g,
                "<br>"
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
                </div>
                <br>`; // Add <br> after code block
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
        // Handle headings and other formatting
        let formattedText = message
          .replace(/^(###)(.*?)$/gm, "<h3>$2</h3>") // Convert ### to <h3>
          .replace(/^(##)(.*?)$/gm, "<h2>$2</h2>") // Convert ## to <h2>
          .replace(/^(#)(.*?)$/gm, "<h1>$2</h1>") // Convert # to <h1>
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
              return `<div class="code-block"><span class="language-label">${language}</span><button class="copy-btn" onclick="copyCode(this)">Copy</button><pre><code class="language-${language}">${safeCode}</code></pre></div><br>`; // Add <br> after code block
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
    const codeElement = button.parentElement.querySelector("pre");
    if (!codeElement) return;

    const codeText = codeElement.innerText; // Use innerText to preserve line breaks

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

  // Replace Azure speech config with Web Speech API and Google fallback
  function initializeSpeechRecognition() {
    if (!("webkitSpeechRecognition" in window)) {
      return null;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false; // Changed to false to prevent network errors
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    return recognition;
  }

  function startRecording() {
    recognition = initializeSpeechRecognition();

    if (!recognition) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome."
      );
      return;
    }

    try {
      isRecording = true;
      micBtn.parentElement.classList.add("recording");
      textarea.value = "";

      recognition.onstart = () => {
        console.log("Speech recognition started");
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");

        textarea.value = transcript;
        textarea.dispatchEvent(new Event("input"));
      };

      recognition.onerror = (event) => {
        console.error("Recognition error:", event.error);
        switch (event.error) {
          case "network":
            // Retry after a short delay
            setTimeout(() => {
              if (isRecording) {
                recognition.start();
              }
            }, 1000);
            break;
          case "not-allowed":
          case "service-not-allowed":
            alert("Please allow microphone access to use speech recognition.");
            stopRecording();
            break;
          default:
            // For other errors, just restart if still recording
            if (isRecording) {
              recognition.start();
            }
        }
      };

      recognition.onend = () => {
        // Restart recognition if still recording
        if (isRecording) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Error restarting recognition:", e);
          }
        }
      };

      recognition.start();
    } catch (error) {
      console.error("Error starting recognition:", error);
      stopRecording();
      alert("Failed to start speech recognition. Please try again.");
    }
  }

  function stopRecording() {
    isRecording = false;
    micBtn.parentElement.classList.remove("recording");

    if (recognition) {
      recognition.stop();
      recognition = null;
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

  // Clean up on page unload
  window.addEventListener("beforeunload", () => {
    if (isRecording) {
      stopRecording();
    }
  });

  // Modify the updateButtonText function
  const updateButtonText = () => {
    const filesBtn = document.querySelector("#files");
    const microphoneBtn = document.querySelector("#microphone-btn");
    const photoBtn = document.querySelector("#photo");

    // Store the existing count element if it exists
    const existingCount = photoBtn.querySelector(".image-count");
    const currentCount = existingCount ? existingCount.textContent : "";

    if (window.innerWidth <= 1000) {
      filesBtn.innerHTML = '<i class="fa-solid fa-paperclip"></i> Files';
      microphoneBtn.innerHTML =
        '<i class="fa-solid fa-microphone-lines"></i> Audio';
      photoBtn.innerHTML = '<i class="fa-solid fa-camera"></i> Image';
    } else {
      filesBtn.innerHTML = '<i class="fa-solid fa-paperclip"></i>';
      microphoneBtn.innerHTML = '<i class="fa-solid fa-microphone-lines"></i>';
      photoBtn.innerHTML = '<i class="fa-solid fa-camera"></i>';
    }

    // Restore the count if it existed
    if (currentCount) {
      const countElement = document.createElement("div");
      countElement.className = "image-count";
      countElement.textContent = currentCount;
      photoBtn.appendChild(countElement);
    }
  };

  // Call it initially
  updateButtonText();

  // Add resize listener
  window.addEventListener("resize", updateButtonText);
});
