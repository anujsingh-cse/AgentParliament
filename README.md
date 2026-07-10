# AgentParliament 🏛️

AgentParliament is a specialized **AI agent skill** that transforms generic AI coding assistants into a structured, debate-based decision making engine. 

It models technical debates, architectural proposals, library choices, or codebase motions by simulating a parliament of 5 developer personas, voting on the motion, and producing a synthesized final resolution by the Speaker of the House.

This repository is designed as a **pure prompt skill** (similar to the catalog in `msitarzewski/agency-agents`). It requires **no local servers, compilation, or external API keys** to run. The AI assistant uses its native LLM context to execute the skill directly within your editor.

---

## 👥 The Parliament Personas

1. **Optimist (🚀 The Visionary)**: Advocates for adoption, development velocity, developer happiness, and competitive advantage.
2. **Pessimist (🛡️ The Risk Manager)**: Focuses on maintenance debt, hidden costs, complexity, security holes, and failure modes.
3. **Engineer (⚙️ The Builder)**: Analyzes implementation overhead, tooling, local setup, debugging, and CI/CD.
4. **Lawyer (⚖️ The Compliance Officer)**: Evaluates licenses, vendor lock-in, data privacy, and intellectual property risks.
5. **User Advocate (👥 The Customer Voice)**: Reviews latency, UX simplicity, performance, stability, and customer friction.
6. **Speaker of the House (🗣️ The Synthesizer)**: Consolidates arguments, tallies the votes, and drafts the final resolution and binding mitigations.

---

## 🧠 Installation and Usage

### 1. For Claude Code / Gemini Antigravity
The custom skill is defined in `skills/agent-parliament/`.
- **Global Customizations**: Copy the `skills/agent-parliament` folder into your global config directory:
  - `~/.gemini/config/skills/` (for Antigravity)
  - `~/.claudecode/config/skills/`
- **Workspace Customizations**: Put it in `.agents/skills/agent-parliament/` in your project workspace.
- **Activation**: Type `/agent-parliament` in the chat or ask the agent: *"Use the agent-parliament skill to debate: Should we migrate our auth system to Auth0?"*

### 2. For Cursor / Windsurf / VS Code Copilot
You can use it as a custom instruction or context rule:
- Create a `.cursorrules` or `.github/copilot-instructions.md` file in the root of your project.
- Copy the system prompt instructions from [skills/agent-parliament/SKILL.md](skills/agent-parliament/SKILL.md) and paste it into the file.
- **Activation**: Prompt the assistant in the chat: *"Convene the Agent Parliament on: Should we use Docker for local development?"*

### 3. For ChatGPT / Claude Web Interface
- Copy the contents of `skills/agent-parliament/SKILL.md` and paste it as the system context or pre-prompt, then ask: *"Convene the debate on: Should we rewrite our data layer in Rust?"*
