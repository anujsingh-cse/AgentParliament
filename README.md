# AgentParliament 🏛️

AgentParliament is a framework and application for **debate-based decision making** using multi-agent workflows. It models technical debates, architectural proposals, library choices, or codebase motions by convening a parliament of 5 specialized developer personas, voting on the motion, and producing a synthesized final resolution by the Speaker of the House.

This repository contains:
1. **Next.js Web App**: A visual dashboard running a LangGraph workflow (`@langchain/langgraph` + Google Gemini) to run, visualize, and animate parliament debates.
2. **Agent Skill**: A modular `SKILL.md` instruction file that enables any AI coding assistant (Claude, Copilot, Antigravity, Cursor, etc.) to run the same debate process natively in your editor.

---

## 🚀 Web App Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 3. Execution Modes
- **Demo Mode**: Runs simulated debates for test topics (GraphQL, Microservices, Rust, AI assistants) and heuristic fallbacks for custom inputs. No API key required.
- **Real Mode**: Connects to the Gemini API (using a provided API key) to run the full, live LangGraph flow.

---

## 🧠 Using as a Cross-Editor Agent Skill

You can load AgentParliament directly into your favorite AI code editor to help you think through architectural choices and technical decisions.

### For Claude Code / Gemini Antigravity
The skill is located at `skills/agent-parliament/SKILL.md`. To use it:
1. Copy the `skills/agent-parliament` folder into your global or workspace customizations root:
   - **Global Customizations**: `~/.gemini/config/skills/` (for Antigravity) or `~/.claudecode/config/skills/`
   - **Workspace Customizations**: `.agents/skills/`
2. Once loaded, activate it by typing `/agent-parliament` or asking your agent: *"Use the agent-parliament skill to debate: should we use PostgreSQL or MongoDB for our analytics service?"*

### For Cursor / Windsurf / GitHub Copilot
1. Open Cursor Settings -> Features -> **Rules for AI** (or create a `.cursorrules` / `.github/copilot-instructions.md` file).
2. Copy the contents of [skills/agent-parliament/SKILL.md](skills/agent-parliament/SKILL.md) and paste them as custom instructions.
3. In chat, prompt: *"Convene the Agent Parliament: Should we migrate our state management to Zustand?"*

### For ChatGPT / Claude Web Interface
Simply copy the markdown text from `skills/agent-parliament/SKILL.md` and prepend it to your prompt:
> *"Using the following system instructions, run a debate on: Should we write our new APIs in Go instead of Node?"*
