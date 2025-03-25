document.addEventListener("DOMContentLoaded", () => {
  // Create reactor glow if it doesn't exist
  createReactorGlow();

  // Create circuit pattern
  createCircuitPattern();

  // Create circuit elements
  createCircuitElements();

  // Recreate elements when window is resized
  window.addEventListener("resize", () => {
    const existingElements = document.querySelectorAll(
      ".circuit-line, .circuit-dot"
    );
    existingElements.forEach((el) => el.remove());
    createCircuitElements();
    createReactorGlow();
  });

  function createReactorGlow() {
    // Find or create reactor glow element
    let reactorGlow = document.querySelector(".reactor-glow");
    if (!reactorGlow) {
      reactorGlow = document.createElement("div");
      reactorGlow.className = "reactor-glow";
      document.body.appendChild(reactorGlow);
    }

    // Position it in the bottom right corner
    reactorGlow.style.bottom = "-100px";
    reactorGlow.style.right = "-100px";

    // Create additional smaller glows
    createSecondaryGlows();
  }

  function createSecondaryGlows() {
    // Remove existing secondary glows
    document.querySelectorAll(".secondary-glow").forEach((el) => el.remove());

    // Create 3 smaller glows
    for (let i = 0; i < 3; i++) {
      const glow = document.createElement("div");
      glow.className = "secondary-glow";

      // Random positions
      const top = Math.random() * 70 + 10; // 10-80% vertically
      const left = Math.random() * 70 + 10; // 10-80% horizontally

      glow.style.top = `${top}%`;
      glow.style.left = `${left}%`;
      glow.style.width = `${Math.random() * 150 + 50}px`; // 50-200px size
      glow.style.height = glow.style.width;
      glow.style.animationDelay = `${Math.random() * 5}s`; // Random delay

      document.body.appendChild(glow);
    }
  }

  function createCircuitPattern() {
    // Find or create circuit background element
    let circuitBg = document.querySelector(".circuit-background");
    if (!circuitBg) {
      circuitBg = document.createElement("div");
      circuitBg.className = "circuit-background";
      document.body.appendChild(circuitBg);
    }

    // Make sure it's properly styled (in case CSS wasn't loaded correctly)
    circuitBg.style.position = "fixed";
    circuitBg.style.top = "0";
    circuitBg.style.left = "0";
    circuitBg.style.width = "100%";
    circuitBg.style.height = "100%";
    circuitBg.style.zIndex = "-1";
    circuitBg.style.pointerEvents = "none";
    circuitBg.style.opacity = "0.15";

    // Add subtle animation to the background itself
    circuitBg.style.animation = "patternShift 120s linear infinite";
  }

  function createCircuitElements() {
    const circuitBg = document.querySelector(".circuit-background");
    if (!circuitBg) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create horizontal and vertical lines
    for (let i = 0; i < 15; i++) {
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

    // Create energy path animation
    createEnergyPath(circuitBg, width, height);
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

  function createEnergyPath(parent, width, height) {
    // Create 3 energy paths
    for (let i = 0; i < 3; i++) {
      const path = document.createElement("div");
      path.className = "energy-path";

      // Random position and length
      path.style.top = `${Math.random() * (height - 100)}px`;
      path.style.left = `${Math.random() * (width - 300)}px`;
      path.style.width = `${Math.random() * 300 + 200}px`;
      path.style.height = "2px";
      path.style.animationDelay = `${i * 3}s`;

      parent.appendChild(path);
    }
  }
});
