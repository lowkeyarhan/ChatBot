document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("typing");
  const sendBtn = document.getElementById("send-btn");
  const chatBox = document.getElementById("userchat");

  if (!chatBox) {
    console.error("Chat box element not found");
    return;
  }

  // Auto-resize textarea
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  });

  // Dynamic greeting message
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

  // Send message on button click or Enter key press
  const sendMessage = async () => {
    const userMessage = textarea.value.trim();
    if (!userMessage) return textarea.focus();

    addMessageToChatBox(userMessage, "user");
    textarea.value = "";
    textarea.style.height = "30px";

    try {
      const apiKey = "AIzaSyD53qitgGA8RNRV3yD5qGt3ZIGu8_DKvoM";
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-8b:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userMessage }] }],
          generationConfig: {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
          },
        }),
      });

      const data = await response.json();
      const botResponse =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't process your request.";
      addMessageToChatBox(botResponse, "bot");
    } catch (error) {
      console.error("Error getting bot response:", error);
      addMessageToChatBox("Sorry, something went wrong.", "bot");
    }
  };

  sendBtn.addEventListener("click", sendMessage);
  textarea.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Add message to chat box with Markdown formatting conversion
  const addMessageToChatBox = (message, sender) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);

    // Create a container for the formatted message
    const formattedMessage = document.createElement("div");

    // Convert Markdown-style formatting to HTML
    let formattedText = message
      .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold (**bold**)
      .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italics (*italic*)
      .replace(/```([\s\S]*?)```/g, (match, code) => {
        return `
          <div class="code-block">
            <button class="copy-btn" onclick="copyCode(this)">Copy</button>
            <pre><code>${code}</code></pre>
          </div>
        `;
      })
      .replace(/^- (.*)$/gm, "<li>$1</li>") // Unordered list (- item)
      .replace(/^\d+\. (.*)$/gm, "<li>$1</li>") // Ordered list (1. item)
      .replace(/---/g, "<hr>") // Horizontal rule (---)
      .replace(/\n/g, "<br>") // Line breaks
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">') // Image ![alt](url)
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>'); // Links [text](url)

    // Wrap list items in <ul> or <ol> if needed
    formattedText = formattedText.replace(
      /((<li>.*?<\/li>\s?)+)/gs,
      "<ul>$1</ul>"
    );

    formattedMessage.innerHTML = formattedText;
    messageElement.appendChild(formattedMessage);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Ensure MathJax renders any equations in the bot's response
    if (sender === "bot" && window.MathJax) {
      MathJax.typesetPromise([messageElement]).catch((err) =>
        console.error(err)
      );
    }
  };

  // Copy code functionality with fallback support
  window.copyCode = function (button) {
    const codeElement = button.parentElement.querySelector("pre code");
    if (!codeElement) return;

    const codeText = codeElement.innerText;

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

  // Fallback copy function using a temporary textarea
  function fallbackCopyText(text, button) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    // Position off-screen
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

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

    document.body.removeChild(textarea);
  }
});
