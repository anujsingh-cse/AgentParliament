"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  agent: string;
  role: string;
  content: string;
}

interface Vote {
  vote: "yes" | "no";
  reason: string;
}

interface DebateResult {
  topic: string;
  simulation: boolean;
  messages: Message[];
  votes: Record<string, Vote>;
  decision: string;
  dissent: string;
}

const PERSONA_DETAILS: Record<string, { name: string; role: string; emoji: string; class: string }> = {
  optimist: { name: "Optimist", role: "The Visionary", emoji: "🚀", class: "avatar-optimist" },
  pessimist: { name: "Pessimist", role: "The Risk Manager", emoji: "🛡️", class: "avatar-pessimist" },
  engineer: { name: "Engineer", role: "The Builder", emoji: "⚙️", class: "avatar-engineer" },
  lawyer: { name: "Lawyer", role: "The Compliance Officer", emoji: "⚖️", class: "avatar-lawyer" },
  userAdvocate: { name: "User Advocate", role: "The Customer Voice", emoji: "👥", class: "avatar-userAdvocate" },
};

const DEFAULT_TOPICS = [
  { id: "graphql", label: "Migrate REST to GraphQL", query: "Should we migrate from REST APIs to GraphQL?" },
  { id: "microservices", label: "Monolith to Microservices", query: "Should we split our monolith database into microservice databases?" },
  { id: "rust", label: "Rewrite in Rust", query: "Should we rewrite our backend services in Rust?" },
  { id: "ai", label: "Adopt AI coding assistants", query: "Should we adopt AI coding assistants in our development workflow?" }
];

export default function Home() {
  const [topic, setTopic] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [mode, setMode] = useState<"demo" | "real">("demo");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<DebateResult | null>(null);

  // Visualization animation states
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [showVotes, setShowVotes] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const debateEndRef = useRef<HTMLDivElement | null>(null);

  // Handle auto-scroll as debate unfolds
  useEffect(() => {
    if (visibleMessages.length > 0 || showVotes || showVerdict) {
      debateEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleMessages, showVotes, showVerdict]);

  // Loading animation simulation steps
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < 5 ? prev + 1 : prev));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getLoadingStepText = () => {
    switch (loadingStep) {
      case 0: return "Assembling Parliament agents...";
      case 1: return "Optimist is drafting core arguments...";
      case 2: return "Pessimist is compiling architectural and security risks...";
      case 3: return "Engineer, Lawyer, and User Advocate are debating integration and compliance...";
      case 4: return "Tallying the votes...";
      case 5: return "Speaker is drafting final synthesized resolution...";
      default: return "Synthesizing consensus...";
    }
  };

  const handleConvene = async (selectedTopic?: string) => {
    const activeTopic = selectedTopic || topic;
    if (!activeTopic.trim()) return;

    // Clear active timers
    if (timerRef.current) clearTimeout(timerRef.current);

    // Reset visualizer states
    setResult(null);
    setVisibleMessages([]);
    setShowVotes(false);
    setShowVerdict(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: activeTopic,
          apiKey: mode === "real" ? apiKey : undefined,
          mode
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to run debate");
      }

      const data: DebateResult = await response.json();
      setResult(data);
      setIsLoading(false);

      // Trigger stepped visualizer reveal animation
      animateDebate(data);
    } catch (e) {
      console.error(e);
      alert("Error: Debate could not complete. Check server logs.");
      setIsLoading(false);
    }
  };

  const animateDebate = (data: DebateResult) => {
    let messageIndex = 0;
    
    const showNextMessage = () => {
      if (messageIndex < data.messages.length) {
        const nextMessage = data.messages[messageIndex];
        setVisibleMessages((prev) => [...prev, nextMessage]);
        messageIndex++;
        timerRef.current = setTimeout(showNextMessage, 2000);
      } else {
        // All messages shown, trigger votes reveal
        timerRef.current = setTimeout(() => {
          setShowVotes(true);
          // Trigger verdict reveal
          timerRef.current = setTimeout(() => {
            setShowVerdict(true);
          }, 2000);
        }, 1500);
      }
    };

    showNextMessage();
  };

  const handleDemoClick = (query: string) => {
    setTopic(query);
    handleConvene(query);
  };

  const yesVotesCount = result ? Object.values(result.votes).filter(v => v.vote === "yes").length : 0;
  const noVotesCount = result ? 5 - yesVotesCount : 0;

  return (
    <div className="container">
      <div className="bg-ambient"></div>
      <div className="bg-grid"></div>

      <header style={{ marginBottom: "30px" }}>
        <h1>AgentParliament</h1>
        <p className="subtitle">Debate-Based Decision Making Engine with LangGraph</p>
      </header>

      {/* Control Panel */}
      <section className="panel">
        <div className="form-row">
          <div className="form-group" style={{ flex: 2 }}>
            <label htmlFor="topic-input">Technical Decision / Proposal</label>
            <input
              id="topic-input"
              type="text"
              placeholder="e.g. Should we rewrite our data pipeline in Rust?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="mode-select">Execution Mode</label>
            <select
              id="mode-select"
              value={mode}
              onChange={(e) => setMode(e.target.value as "demo" | "real")}
              disabled={isLoading}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                padding: "14px 18px",
                borderRadius: "var(--radius-md)",
                fontSize: "1rem",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="demo">Demo (Simulation Mode)</option>
              <option value="real">Real LLM (Gemini API)</option>
            </select>
          </div>
        </div>

        {mode === "real" && (
          <div className="form-row" style={{ animation: "fadeIn 0.3s ease-out" }}>
            <div className="form-group">
              <label htmlFor="apikey-input">Gemini API Key</label>
              <input
                id="apikey-input"
                type="password"
                placeholder="Enter AI_KEY to convene real LLM parliament"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div className="demo-topics">
            <span className="demo-title">Try Demo Topics:</span>
            {DEFAULT_TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                className="demo-btn"
                onClick={() => handleDemoClick(t.query)}
                disabled={isLoading}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="main-btn"
            onClick={() => handleConvene()}
            disabled={isLoading || !topic.trim()}
          >
            {isLoading ? (
              <>
                <div className="pulse-dot" style={{ width: "12px", height: "12px" }}></div>
                Convening...
              </>
            ) : (
              "Convene Parliament"
            )}
          </button>
        </div>
      </section>

      {/* Loading Block */}
      {isLoading && (
        <div className="panel loading-box">
          <div className="spinner"></div>
          <div className="progress-text">{getLoadingStepText()}</div>
        </div>
      )}

      {/* Main Debate Panel */}
      {result && (
        <section className="debate-container">
          <div style={{ display: "flex", flexDirection: "row" }} className={result.simulation ? "mode-indicator" : "mode-indicator real"}>
            <div className="pulse-dot"></div>
            <span>{result.simulation ? "Demo Simulation Mode (Pre-cached / Heuristic generated)" : "Active LLM Parliament Run"}</span>
          </div>

          <div style={{ padding: "0 10px", borderBottom: "1px solid var(--border-color)", paddingBottom: "15px" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "600" }}>Motion on the Floor</span>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "700", marginTop: "4px" }}>&ldquo;{result.topic}&rdquo;</h2>
          </div>

          {/* Interactive Chat logs */}
          <div className="chat-thread">
            {visibleMessages.map((msg, index) => {
              const details = PERSONA_DETAILS[msg.agent];
              return (
                <div key={index} className="message-card">
                  <div className="agent-avatar-col">
                    <div className={`avatar-circle ${details?.class || "avatar-speaker"}`}>
                      {details?.emoji || "🗣️"}
                    </div>
                    <div className="agent-name">{details?.name || msg.agent}</div>
                    <div className="agent-role">{details?.role || msg.role}</div>
                  </div>
                  <div className="message-content-col">
                    <div className="message-bubble">{msg.content}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Voting Grid Section */}
          {showVotes && (
            <div className="voting-section">
              <div className="voting-title">
                <span>🗳️ Roll Call Vote Result ({yesVotesCount} YES &mdash; {noVotesCount} NO)</span>
              </div>
              <div className="voting-grid">
                {Object.entries(result.votes).map(([agentKey, voteInfo]) => {
                  const details = PERSONA_DETAILS[agentKey];
                  return (
                    <div key={agentKey} className={`vote-card ${voteInfo.vote}`}>
                      <div className={`avatar-circle ${details?.class}`} style={{ width: "40px", height: "40px", fontSize: "1.2rem" }}>
                        {details?.emoji}
                      </div>
                      <div className="agent-name" style={{ fontSize: "0.85rem", marginTop: "6px" }}>{details?.name}</div>
                      <div className={`vote-badge ${voteInfo.vote}`}>{voteInfo.vote}</div>
                      <p className="vote-reason">{voteInfo.reason}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Synthesized verdict by Speaker */}
          {showVerdict && (
            <div className="verdict-section">
              <div className="verdict-header">
                <div className="avatar-circle avatar-speaker" style={{ width: "50px", height: "50px", fontSize: "1.5rem" }}>
                  🗣️
                </div>
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--color-primary)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>Synthesized Verdict</span>
                  <h2>Speaker of the House Resolution</h2>
                </div>
              </div>
              <div className="verdict-content">
                <p>{result.decision}</p>
              </div>

              {result.dissent && (
                <div className="dissent-box">
                  <div className="dissent-title">Dissenting Opinions &amp; Mitigations</div>
                  <p className="dissent-content">{result.dissent}</p>
                </div>
              )}
            </div>
          )}

          <div ref={debateEndRef} style={{ height: "40px" }} />
        </section>
      )}
    </div>
  );
}
