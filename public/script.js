document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("typing");
  const sendBtn = document.getElementById("send-btn");
  const chatBox = document.getElementById("userchat");

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
    requestAnimationFrame(() => {
      chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth",
      });
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

      const tempDiv = document.createElement('div');
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
});
