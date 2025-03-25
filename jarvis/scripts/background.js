document.addEventListener("DOMContentLoaded", () => {
  // Make sure the circuit background element exists
  const circuitBg = document.querySelector(".circuit-background");
  if (!circuitBg) {
    console.error("Circuit background element not found");
    return;
  }

  createCircuitElements();

  // Recreate elements when window is resized
  window.addEventListener("resize", () => {
    const existingElements = document.querySelectorAll(
      ".circuit-line, .circuit-dot"
    );
    existingElements.forEach((el) => el.remove());
    createCircuitElements();
  });

  function createCircuitElements() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Clear any existing lines first
    circuitBg
      .querySelectorAll(".circuit-line, .circuit-dot")
      .forEach((el) => el.remove());

    // Create horizontal and vertical lines
    for (let i = 0; i < 12; i++) {
      // Horizontal line
      const hLine = document.createElement("div");
      hLine.className = "circuit-line";
      hLine.style.width = `${Math.random() * 200 + 100}px`;
      hLine.style.height = "1px";
      hLine.style.top = `${Math.random() * height}px`;
      hLine.style.left = `${Math.random() * (width - 300)}px`;
      circuitBg.appendChild(hLine);

      // Vertical line
      const vLine = document.createElement("div");
      vLine.className = "circuit-line";
      vLine.style.width = "1px";
      vLine.style.height = `${Math.random() * 200 + 100}px`;
      vLine.style.top = `${Math.random() * (height - 300)}px`;
      vLine.style.left = `${Math.random() * width}px`;
      circuitBg.appendChild(vLine);

      // Add dots at the ends of lines
      addCircuitDot(hLine, 0, 0);
      addCircuitDot(hLine, parseInt(hLine.style.width), 0);
      addCircuitDot(vLine, 0, 0);
      addCircuitDot(vLine, 0, parseInt(vLine.style.height));
    }
  }

  function addCircuitDot(line, xOffset, yOffset) {
    const dot = document.createElement("div");
    dot.className = "circuit-dot";
    dot.style.width = "4px";
    dot.style.height = "4px";
    dot.style.left = `${xOffset - 2}px`;
    dot.style.top = `${yOffset - 2}px`;
    line.appendChild(dot);

    // Random pulse delay
    dot.style.animationDelay = `${Math.random() * 3}s`;
  }

  function positionReactorGlow() {
    const reactorGlow = document.querySelector(".reactor-glow");
    if (!reactorGlow) {
      const glow = document.createElement("div");
      glow.className = "reactor-glow";
      document.body.appendChild(glow);
    }

    // Position it in the bottom right corner
    const glow = document.querySelector(".reactor-glow");
    glow.style.bottom = "-100px";
    glow.style.right = "-100px";
  }

  // Call this function after creating circuit elements
  positionReactorGlow();
});
