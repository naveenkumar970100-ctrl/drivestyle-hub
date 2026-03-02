import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

class RootErrorBoundary extends HTMLElement {
  connectedCallback() {
    this.style.display = "block";
    this.style.padding = "12px";
    this.style.background = "#fff";
    this.style.color = "#111";
    this.style.fontFamily = "system-ui, sans-serif";
  }
}
customElements.define("root-error", RootErrorBoundary);

function withBoundary(node: HTMLElement, render: () => void) {
  try {
    render();
  } catch (e) {
    const el = document.createElement("root-error");
    const pre = document.createElement("pre");
    pre.textContent = `Render failed: ${e instanceof Error ? e.stack || e.message : String(e)}`;
    el.appendChild(pre);
    node.innerHTML = "";
    node.appendChild(el);
    console.error(e);
  }
}

const rootEl = document.getElementById("root")!;
withBoundary(rootEl, () => {
  createRoot(rootEl).render(<App />);
});
