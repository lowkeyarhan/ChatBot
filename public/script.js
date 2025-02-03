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

  const addMessageToChatBox = (message, sender) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", sender);

    // Create formatted message elements manually
    const formattedMessage = document.createElement("div");
    const lines = message.split("\n");

    lines.forEach((line) => {
      const span = document.createElement("span");
      // Replace bold, italics, and inline code formatting manually
      span.innerHTML = line
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold
        .replace(/\*(.*?)\*/g, "<i>$1</i>") // Italics
        .replace(/`(.*?)`/g, "<code>$1</code>"); // Inline code
      formattedMessage.appendChild(span);
      formattedMessage.appendChild(document.createElement("br")); // Add line break for each new line
    });

    messageElement.appendChild(formattedMessage);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Ensure MathJax renders any equations
    MathJax.typesetPromise([messageElement]);
  };
});
