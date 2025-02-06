document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("typing");
  const sendBtn = document.getElementById("send-btn");
  const chatBox = document.getElementById("userchat");

  if (!chatBox) {
    console.error("Chat box element not found");
    return;
  }

  // Global conversation history array.
  const conversationHistory = [];

  // Auto-resize textarea.
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  });

  // Dynamic greeting message.
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

  // Helper function to escape HTML characters.
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper function to scroll chat to the bottom.
  function scrollChatToBottom() {
    requestAnimationFrame(() => {
      chatBox.scrollTo({
        top: chatBox.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  // Send message on button click or Enter key press.
  const sendMessage = async () => {
    const userMessage = textarea.value.trim();
    if (!userMessage) return textarea.focus();

    // Add the user's message to the UI and conversation history.
    addMessageToChatBox(userMessage, "user");
    conversationHistory.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    // Clear the textarea and reset its height.
    textarea.value = "";
    textarea.style.height = "30px";

    // Add a placeholder "Bot is typing..." message with animation.
    const botPlaceholder = document.createElement("div");
    botPlaceholder.classList.add("message", "bot", "loading");
    botPlaceholder.innerHTML = `
  <div class="formatted-message">
    <div class="typing-animation">
      <span class="dot"></span>
      <span class="dot"></span>
      <span class="dot"></span>
    </div>
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

      // Remove the placeholder.
      botPlaceholder.remove();

      // Add the bot's response to the UI and conversation history.
      addMessageToChatBox(botResponse, "bot");
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

  // Ensure sendMessage is correctly bound to the send button and Enter key press events.
  sendBtn.addEventListener("click", () => {
    sendMessage();
  });

  textarea.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Add message to chat box with improved formatting.
  const addMessageToChatBox = (message, sender) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);

    const formattedMessage = document.createElement("div");
    formattedMessage.classList.add("formatted-message");

    // Attempt to parse the message as JSON.
    // If the response is structured JSON, use it.
    let parsedAsJson = false;
    try {
      const parsed = JSON.parse(message);
      if (parsed && Array.isArray(parsed.blocks)) {
        parsedAsJson = true;
        let htmlContent = "";
        parsed.blocks.forEach((block) => {
          if (block.type === "text") {
            // Wrap text blocks in paragraphs.
            htmlContent += `<p>${escapeHtml(block.content).replace(
              /\n/g,
              "<br>"
            )}</p>${sender === "bot" ? "<br>" : ""}`;
          } else if (block.type === "code") {
            // Render code blocks.
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
            // Fallback for unknown types.
            htmlContent += `<p>${escapeHtml(block.content)}</p>`;
          }
        });
        formattedMessage.innerHTML = htmlContent;
      }
    } catch (e) {
      // Not valid JSON—proceed with Markdown formatting.
      parsedAsJson = false;
    }

    if (!parsedAsJson) {
      // For user messages, escape HTML to prevent unwanted rendering.
      // First, process inline markdown for bold, italics, and code blocks.
      let formattedText = message
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold
        .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italics
        .replace(/```([\s\S]*?)```/g, (match, code) => {
          const safeCode = sender === "user" ? code : escapeHtml(code);
          return `
          <div class="code-block">
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            <pre><code>${safeCode}</code></pre>
          </div>`;
        });

      // Instead of a simple newline-to-<br> replacement,
      // split text by two (or more) newlines to form paragraphs.
      const paragraphs = formattedText.split(/\n{2,}/).map((para) => {
        // Replace single newlines with <br> only within a paragraph.
        return `<p>${para.replace(/\n/g, "<br>")}</p>${
          sender === "bot" ? "<br>" : ""
        }`;
      });
      formattedText = paragraphs.join("");
      formattedMessage.innerHTML = formattedText;
    }

    messageElement.appendChild(formattedMessage);
    chatBox.appendChild(messageElement);
    scrollChatToBottom();
  };

  // Copy code functionality with fallback support.
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
