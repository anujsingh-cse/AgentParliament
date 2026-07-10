import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { NextRequest, NextResponse } from "next/server";

// Define the state schema using Annotation
const DebateStateAnnotation = Annotation.Root({
  topic: Annotation<string>(),
  messages: Annotation<Array<{ agent: string; role: string; content: string }>>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  votes: Annotation<Record<string, { vote: "yes" | "no"; reason: string }>>({
    reducer: (x, y) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  decision: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  dissent: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});

// System prompts for each persona
const PERSONAS: Record<string, { name: string; role: string; prompt: string }> = {
  optimist: {
    name: "Optimist",
    role: "The Visionary",
    prompt: "You are the Optimist, a forward-thinking tech leader. You always see massive potential in new tools and technologies. You advocate for innovation, long-term velocity, developer happiness, and strategic competitive advantage. Keep your response to 2-3 sentences, sharp and inspiring.",
  },
  pessimist: {
    name: "Pessimist",
    role: "The Risk Manager",
    prompt: "You are the Pessimist, a battle-scarred systems engineer. You focus on risk, hidden costs, maintenance debt, operational complexity, security vulnerabilities, and potential failure modes. Keep your response to 2-3 sentences, highly critical and realistic.",
  },
  engineer: {
    name: "Engineer",
    role: "The Builder",
    prompt: "You are the Engineer, a pragmatic developer focused on execution and codebase health. You ask: how long will it take to build? What about tooling, debugging, CI/CD, and tech debt? Keep your response to 2-3 sentences, concrete and grounded in implementation realities.",
  },
  lawyer: {
    name: "Lawyer",
    role: "The Compliance Officer",
    prompt: "You are the Lawyer, a legal and compliance expert. You analyze licensing (e.g., AGPL issues), vendor lock-in, data privacy (GDPR/HIPAA), SLA commitments, and intellectual property risks. Keep your response to 2-3 sentences, precise, cautious, and authoritative.",
  },
  userAdvocate: {
    name: "User Advocate",
    role: "The Customer Voice",
    prompt: "You are the User Advocate, representing the customer experience. You care about product performance, latency, accessibility, UI simplicity, churn, and keeping user flows stable. Keep your response to 2-3 sentences, user-centric and performance-focused.",
  },
};

// Canned debates for when API key is missing
const CANNED_DEBATES: Record<string, {
  messages: Array<{ agent: string; role: string; content: string }>;
  votes: Record<string, { vote: "yes" | "no"; reason: string }>;
  decision: string;
  dissent: string;
}> = {
  graphql: {
    messages: [
      { agent: "optimist", role: "The Visionary", content: "Migrating to GraphQL is a massive win for frontend speed and flexibility. Clients fetch exactly what they need in a single round-trip, decoupling frontend and backend teams entirely and boosting developer velocity." },
      { agent: "pessimist", role: "The Risk Manager", content: "GraphQL introduces massive security risks like query complexity attacks and makes caching incredibly hard. N+1 database query issues will sneak in, and we'll end up with a single bottleneck gateway that's hard to scale." },
      { agent: "engineer", role: "The Builder", content: "Schema maintenance is non-trivial, and we'll need to rewrite our entire API client stack. However, typed schema definitions will eliminate a lot of runtime integration bugs. We need robust linting and resolver tracing to keep N+1 in check." },
      { agent: "lawyer", role: "The Compliance Officer", content: "We must ensure our schema fields don't accidentally leak PII (Personally Identifiable Information). Fine-grained field-level authorization is complex and increases the audit scope for compliance under GDPR." },
      { agent: "userAdvocate", role: "The Customer Voice", content: "If clients request less data, mobile app latency will drop, which is great. But a single malformed payload crashing the entire query resolver will hurt user reliability. We need clear error boundary fallback UI." }
    ],
    votes: {
      optimist: { vote: "yes", reason: "Unlocks frontend velocity and optimizes data fetching payloads." },
      pessimist: { vote: "no", reason: "Query complexity vulnerabilities and extreme caching difficulties." },
      engineer: { vote: "yes", reason: "Typed schema benefits outweigh implementation overhead if N+1 is guarded." },
      lawyer: { vote: "no", reason: "Field-level authorization is a compliance nightmare waiting to leak PII." },
      userAdvocate: { vote: "yes", reason: "Reduces mobile network payloads and improves user latency." }
    },
    decision: "The Parliament resolves to adopt GraphQL for our API layer by a 3-2 majority vote. The decision is driven by the clear benefits of frontend payload optimization and decoupling team dependency workflows. We will establish a federated schema design but enforce strict resolver guidelines to prevent performance degradation.",
    dissent: "The minority (Pessimist & Lawyer) strongly dissents, citing significant security vulnerabilities in public GraphQL endpoints and the complexity of auditing field-level authorization for data compliance. Mitigations: We must implement mandatory query depth limiting, cost-analysis middleware, and a dedicated compliance review of exposed schema types before release."
  },
  microservices: {
    messages: [
      { agent: "optimist", role: "The Visionary", content: "Splitting the monolith allows teams to deploy independently and scale specific services under load. We'll escape dependency hell and accelerate our release cycle." },
      { agent: "pessimist", role: "The Risk Manager", content: "You are trading simple code compilation for distributed systems complexity. Network latency will spike, debugging across services will be a nightmare, and data consistency will require complex sagas." },
      { agent: "engineer", role: "The Builder", content: "Our local development setup will become much heavier. However, separating domains at the database level prevents bad queries from locking the entire database. We'll need solid OpenTelemetry tracing from day one." },
      { agent: "lawyer", role: "The Compliance Officer", content: "Moving data across network boundaries increases our threat surface. GDPR data deletion requests (right to be forgotten) will now require complex cross-service deletions, increasing compliance risk." },
      { agent: "userAdvocate", role: "The Customer Voice", content: "Users don't care about our architecture; they care about speed and reliability. If a checkout service is down but search is up, the user is still frustrated. We must design robust offline fallbacks." }
    ],
    votes: {
      optimist: { vote: "yes", reason: "Enables independent scaling and removes release cycle bottlenecks." },
      pessimist: { vote: "no", reason: "Distributed system failure rates and tracing complexity are too high." },
      engineer: { vote: "no", reason: "Our current CI/CD and telemetry stack is not ready for distributed trace management." },
      lawyer: { vote: "no", reason: "Cross-service compliance audits and data segregation increase regulatory risk." },
      userAdvocate: { vote: "no", reason: "Risk of partial outages and network latency spikes degrades end-user UX." }
    },
    decision: "The Parliament resolves to REJECT the split into microservices by a 4-1 majority. While scaling benefits are clear, the current system is not equipped to handle distributed data compliance, complex cross-service tracing, or the localized network latencies that would impact users. We will keep the monolith but refactor it into clean modular domains.",
    dissent: "The Optimist dissents, warning that the current monolithic architecture will lead to team lock-in and a complete halt in deployment velocity as the team grows. Mitigation: We will implement strict module boundaries in the monolith and revisit microservices when our container orchestration is mature."
  },
  rust: {
    messages: [
      { agent: "optimist", role: "The Visionary", content: "Rewriting in Rust will slash our server costs by 70%, eliminate memory safety bugs, and provide blazing fast performance. It positions us as an elite engineering team." },
      { agent: "pessimist", role: "The Risk Manager", content: "The borrow checker will grind developer velocity to a halt. Recruiting Rust developers is incredibly difficult and expensive. We'll spend 6 months rewriting code without shipping a single customer feature." },
      { agent: "engineer", role: "The Builder", content: "Rust tooling (cargo) is top-tier, and compile-time safety is incredible. But the learning curve is steep, and our existing JS library integrations won't be easy to port. We should write only performance-critical bottlenecks in Rust." },
      { agent: "lawyer", role: "The Compliance Officer", content: "Rust has a solid ecosystem, but crate dependency auditing is critical. A supply-chain attack via obscure cargo dependencies presents legal liabilities if we don't lock down lockfiles." },
      { agent: "userAdvocate", role: "The Customer Voice", content: "Blazing fast speeds and zero memory leaks mean a much smoother, faster experience for our users. Lower latency is directly correlated with higher customer conversion rates." }
    ],
    votes: {
      optimist: { vote: "yes", reason: "Unmatched performance, memory safety, and infrastructure cost savings." },
      pessimist: { vote: "no", reason: "Developer velocity slowdown and high hiring costs." },
      engineer: { vote: "no", reason: "A full rewrite is too risky; partial porting of heavy tasks is preferred." },
      lawyer: { vote: "yes", reason: "Compile-time guarantees and memory safety reduce overall system risk." },
      userAdvocate: { vote: "yes", reason: "Extreme speed improvements and reliability benefits for end-users." }
    },
    decision: "The Parliament resolves to approve the Rust transition by a 3-2 majority. The core drivers are infrastructure cost reduction, compile-time memory safety, and significant user-side latency gains. However, we will NOT do a full rewrite; we will port performance-critical microservices first.",
    dissent: "The Pessimist and Engineer dissent due to the developer velocity penalty and the risk of a blocked feature roadmap. Mitigations: We will establish a pairing system with experienced Rust developers and define strict boundaries on what parts of the codebase are allowed to be in Rust."
  },
  ai: {
    messages: [
      { agent: "optimist", role: "The Visionary", content: "Adopting AI coding assistants will boost developer productivity by 50%, automate boring boilerplate, and help junior engineers learn the codebase twice as fast." },
      { agent: "pessimist", role: "The Risk Manager", content: "AI tools hallucinate bugs, output insecure code, and will lead to lazy engineering practices where developers approve code they don't fully understand. Code quality will slowly degrade." },
      { agent: "engineer", role: "The Builder", content: "AI is great for generating repetitive unit tests and regexes, but useless for complex system architecture. If we use it, we must enforce rigorous code review protocols and automated security linting." },
      { agent: "lawyer", role: "The Compliance Officer", content: "We face massive IP copyright infringement risks if the AI generates code trained on GPL licenses. Additionally, sending proprietary source code to external servers might violate vendor NDAs." },
      { agent: "userAdvocate", role: "The Customer Voice", content: "Faster developer velocity means user bugs get fixed quicker and features ship sooner. But if AI-generated bugs leak into production, the user experience will crash. Quality assurance must scale up." }
    ],
    votes: {
      optimist: { vote: "yes", reason: "Drastic developer velocity improvement and faster learning curves." },
      pessimist: { vote: "no", reason: "Hallucinated security bugs and risk of lazy code reviews." },
      engineer: { vote: "yes", reason: "Extremely helpful for boilerplate and tests, provided human review is strict." },
      lawyer: { vote: "no", reason: "Intellectual property infringement risk and potential customer data exposure." },
      userAdvocate: { vote: "yes", reason: "Faster feature shipping and quicker bug resolutions for customers." }
    },
    decision: "The Parliament resolves to adopt AI coding assistants by a 3-2 majority. The gains in developer velocity, boilerplate automation, and onboarding speed are critical for our team. We will roll it out gradually.",
    dissent: "The Pessimist and Lawyer strongly dissent, highlighting proprietary code leakage, potential copyright claims, and hallucinated security flaws. Mitigations: We will only use enterprise-tier AI assistants with IP indemnity clauses, run them in a private cloud environment, and mandate that all AI-generated code must have double human sign-off."
  }
};

// Fallback logic to generate realistic arguments for any custom topic in simulation mode
function generateSimulatedDebate(topic: string) {
  const containsDb = /db|database|sql|nosql|postgres|mongo/i.test(topic);
  const containsUI = /ui|frontend|css|react|vue|design|button|theme/i.test(topic);
  const containsCloud = /cloud|aws|docker|kubernetes|infra|server/i.test(topic);

  let optimistArg = `Adopting "${topic}" is a forward-looking move. It solves our primary scaling bottlenecks, modernizes our workflow, and will keep our engineering team motivated.`;
  let pessimistArg = `Implementing "${topic}" introduces massive complexity. The migration path is highly risky, and we lack internal expertise. The return on investment is highly speculative.`;
  let engineerArg = `Technically, "${topic}" has solid ecosystem support. However, we'll need to update our CI/CD pipelines and train the team on new debugging workflows. We need a clear POC first.`;
  let lawyerArg = `We must verify if "${topic}" complies with our client SLAs. Any third-party dependencies or licenses must be audited to prevent intellectual property liabilities.`;
  let userAdvocateArg = `From a user perspective, "${topic}" will likely improve responsiveness if configured correctly. But we must ensure it doesn't degrade performance for low-bandwidth clients.`;

  let optVote: "yes" | "no" = "yes";
  let pesVote: "yes" | "no" = "no";
  let engVote: "yes" | "no" = "yes";
  let lawVote: "yes" | "no" = "no";
  let usrVote: "yes" | "no" = "yes";

  if (containsDb) {
    optimistArg = `Migrating database technology to "${topic}" will unlock faster query times and let us scale write operations horizontally. This prepares us for next year's traffic.`;
    pessimistArg = `Changing database engines carries extreme risk of data loss, connection pooling issues, and complex transaction failures. We'll spend months debugging locking issues.`;
    engineerArg = `We'll need to rewrite all our ORM schemas and migration scripts. Also, local container setups will need updating. We should start with a small, non-critical database table.`;
    lawyerArg = `Database migrations involve processing user data. We must ensure data encryption at rest remains compliant with SOC2 and GDPR. Any cloud vendor hosting this must sign a BAA/DPA.`;
    userAdvocateArg = `A faster database means faster page loads for our dashboard, which users will love. But any database downtime during migration will cause user frustration.`;
    engVote = "no"; // Database migrations are hard, engineer votes no
  } else if (containsUI) {
    optimistArg = `Refactoring our UI using "${topic}" creates a highly unified design language. Component reuse will double our frontend delivery speed and give us a polished look.`;
    pessimistArg = `A major UI change risks breaking accessibility features and creating visual bugs across mobile browsers. It's a huge effort for purely aesthetic gains.`;
    engineerArg = `We'll need to clean up legacy styles and set up a component library. Tooling is straightforward, but CSS regression testing will be needed to catch styling bugs.`;
    lawyerArg = `We must check if the UI libraries or icons in "${topic}" have open-source licenses that require attribution, and ensure accessibility conforms to WCAG 2.1 AA standards.`;
    userAdvocateArg = `A cleaner UI makes the product much more intuitive, lowering bounce rates. However, layout shifts during the transition could confuse our active power users.`;
    lawVote = "yes"; // Lawyer is happy if license is simple
  } else if (containsCloud) {
    optimistArg = `Moving to "${topic}" gives us auto-scaling capabilities and removes manual server provisioning. We will only pay for what we use, cutting idle infrastructure costs.`;
    pessimistArg = `Cloud lock-in will make it very hard to leave this provider. Also, egress costs can explode unpredictably, and security group misconfigurations are a major risk.`;
    engineerArg = `We need to write Terraform modules and set up Kubernetes/IAM roles. It's a steep learning curve but standardizes our deployment process across staging and production.`;
    lawyerArg = `Hosting infrastructure on "${topic}" requires a strict review of where user data resides geographically to comply with local data sovereignty laws (like EU GDPR).`;
    userAdvocateArg = `Auto-scaling prevents site crashes during traffic spikes, ensuring 100% uptime for customers. But server spin-up latency must be managed carefully.`;
  }

  const votes = {
    optimist: { vote: optVote, reason: `Unlocks future scalability and speed.` },
    pessimist: { vote: pesVote, reason: `Too many operational risks and high setup complexity.` },
    engineer: { vote: engVote, reason: engVote === "yes" ? "Makes code more structured and maintainable long-term." : "Implementation effort is too high relative to current priorities." },
    lawyer: { vote: lawVote, reason: lawVote === "yes" ? "Minimal compliance concerns if licensing is clear." : "Presents significant compliance and data security risks." },
    userAdvocate: { vote: usrVote, reason: usrVote === "yes" ? "Directly benefits client-side speeds and page reliability." : "Risks introducing user friction or performance regressions." }
  };

  const yesCount = Object.values(votes).filter(v => v.vote === "yes").length;
  const passed = yesCount >= 3;

  const decision = passed
    ? `The Parliament resolves to ADOPT "${topic}" by a ${yesCount}-${5 - yesCount} majority. The long-term velocity and performance gains are deemed critical for our product roadmap. We will begin implementation immediately, starting with a scoped prototype.`
    : `The Parliament resolves to REJECT "${topic}" by a ${5 - yesCount}-${yesCount} majority. The operational complexities, regulatory compliance challenges, and immediate migration costs outweigh the projected benefits at this stage.`;

  const dissentNames = Object.entries(votes)
    .filter(([_, v]) => v.vote !== (passed ? "yes" : "no"))
    .map(([k, _]) => PERSONAS[k].name)
    .join(" and ");

  const dissent = `The minority (${dissentNames || "none"}) dissents. They caution that the decided route does not sufficiently address concerns around ${passed ? "hidden operational costs, security threat surfaces, and team re-training delays" : "falling behind modern tech standards and missing out on significant infrastructure cost savings"}.`;

  return {
    messages: [
      { agent: "optimist", role: "The Visionary", content: optimistArg },
      { agent: "pessimist", role: "The Risk Manager", content: pessimistArg },
      { agent: "engineer", role: "The Builder", content: engineerArg },
      { agent: "lawyer", role: "The Compliance Officer", content: lawyerArg },
      { agent: "userAdvocate", role: "The Customer Voice", content: userAdvocateArg }
    ],
    votes,
    decision,
    dissent
  };
}

export async function POST(req: NextRequest) {
  try {
    const { topic, apiKey, mode } = await req.json();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    // Check if we should run in simulation mode
    const runSimulation = mode === "demo" || !apiKey;

    if (runSimulation) {
      // Return simulated results for faster loading and no-API-key support
      const normalizedTopic = topic.toLowerCase();
      let result;

      if (normalizedTopic.includes("graphql") || normalizedTopic.includes("rest")) {
        result = CANNED_DEBATES.graphql;
      } else if (normalizedTopic.includes("microservice") || normalizedTopic.includes("monolith")) {
        result = CANNED_DEBATES.microservices;
      } else if (normalizedTopic.includes("rust") || normalizedTopic.includes("c++") || normalizedTopic.includes("rewrite")) {
        result = CANNED_DEBATES.rust;
      } else if (normalizedTopic.includes("ai") || normalizedTopic.includes("assistant") || normalizedTopic.includes("copilot")) {
        result = CANNED_DEBATES.ai;
      } else {
        result = generateSimulatedDebate(topic);
      }

      // Add a small artificial delay to make it feel active
      await new Promise((resolve) => setTimeout(resolve, 1500));

      return NextResponse.json({
        topic,
        simulation: true,
        ...result
      });
    }

    // REAL LLM DEBATE USING LANGGRAPH & GEMINI
    const model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: "gemini-1.5-flash",
      temperature: 0.7,
    });

    // Node helper function to generate response for a persona
    const makeAgentNode = (agentKey: string) => {
      const persona = PERSONAS[agentKey];
      return async (state: typeof DebateStateAnnotation.State) => {
        const history = state.messages
          .map((m) => `[${m.agent} - ${m.role}]: ${m.content}`)
          .join("\n\n");

        const prompt = `Topic: "${state.topic}"
        
You are ${persona.name}, role: ${persona.role}.
Instructions: ${persona.prompt}

Debate history so far:
${history || "No arguments yet. You are speaking first."}

Write your response now. Keep it brief (2-3 sentences max). Respond to other speakers if relevant.`;

        const response = await model.invoke(prompt);
        const content = response.content.toString().trim();

        return {
          messages: [{ agent: agentKey, role: persona.role, content }]
        };
      };
    };

    // Voting node logic
    const makeVoteNode = (agentKey: string) => {
      const persona = PERSONAS[agentKey];
      return async (state: typeof DebateStateAnnotation.State) => {
        const history = state.messages
          .map((m) => `[${m.agent} - ${m.role}]: ${m.content}`)
          .join("\n\n");

        const prompt = `Topic: "${state.topic}"
        
You are ${persona.name}, role: ${persona.role}.
Review the complete debate history below:
${history}

Based on your persona and the debate, you must vote YES or NO on the topic.
Provide a 1-sentence reason for your vote.
Respond ONLY with a JSON object in this format:
{
  "vote": "yes" | "no",
  "reason": "your brief reason here"
}
Do not wrap in markdown or backticks. Respond only with the raw JSON string.`;

        const response = await model.invoke(prompt);
        let parsed = { vote: "yes" as "yes" | "no", reason: "Preferred this path." };
        try {
          const rawText = response.content.toString().trim().replace(/```json|```/g, "");
          parsed = JSON.parse(rawText);
        } catch (e) {
          console.error("Failed to parse vote JSON for", agentKey, e);
          // Fallback based on typical persona alignment
          const fallbackYes = ["optimist", "userAdvocate"].includes(agentKey);
          parsed = {
            vote: fallbackYes ? "yes" : "no",
            reason: fallbackYes ? "I believe the benefits outweigh the risks." : "The risks and costs are currently too high."
          };
        }

        return {
          votes: {
            [agentKey]: parsed
          }
        };
      };
    };

    // Build the LangGraph
    const builder = new StateGraph(DebateStateAnnotation) as any;

    // Add debate nodes
    builder.addNode("optimist", makeAgentNode("optimist"));
    builder.addNode("pessimist", makeAgentNode("pessimist"));
    builder.addNode("engineer", makeAgentNode("engineer"));
    builder.addNode("lawyer", makeAgentNode("lawyer"));
    builder.addNode("userAdvocate", makeAgentNode("userAdvocate"));

    // Add voting nodes
    builder.addNode("optimistVote", makeVoteNode("optimist"));
    builder.addNode("pessimistVote", makeVoteNode("pessimist"));
    builder.addNode("engineerVote", makeVoteNode("engineer"));
    builder.addNode("lawyerVote", makeVoteNode("lawyer"));
    builder.addNode("userAdvocateVote", makeVoteNode("userAdvocate"));

    // Add speaker node for synthesis
    builder.addNode("speaker", async (state: typeof DebateStateAnnotation.State) => {
      const debateHistory = state.messages
        .map((m) => `[${m.agent} - ${m.role}]: ${m.content}`)
        .join("\n\n");

      const voteSummary = Object.entries(state.votes)
        .map(([agent, data]) => `${PERSONAS[agent].name} (${PERSONAS[agent].role}): Voted ${data.vote.toUpperCase()} because: ${data.reason}`)
        .join("\n");

      const prompt = `You are the Speaker of the House. Your role is to synthesize the final decision of the Agent Parliament.
Topic: "${state.topic}"

Debate Logs:
${debateHistory}

Votes Cast:
${voteSummary}

Provide:
1. A final synthesized decision (resolution statement) explaining why the majority won, the recommended path forward, and general next steps (1-2 paragraphs).
2. A formal dissent statement capturing the core arguments of the minority, and specific conditions/mitigations that must be met to address their concerns.

Respond ONLY with a JSON object in this format:
{
  "decision": "your synthesized decision paragraph(s) here",
  "dissent": "your formal dissent paragraph here"
}
Do not wrap in markdown or backticks. Respond only with raw JSON.`;

      const response = await model.invoke(prompt);
      let parsed = { decision: "Resolution completed.", dissent: "Dissent noted." };
      try {
        const rawText = response.content.toString().trim().replace(/```json|```/g, "");
        parsed = JSON.parse(rawText);
      } catch (e) {
        console.error("Failed to parse speaker output", e);
        // Fallback calculations
        const yesCount = Object.values(state.votes).filter(v => v.vote === "yes").length;
        parsed = {
          decision: `The parliament voted ${yesCount}-${5 - yesCount} on "${state.topic}".`,
          dissent: "Dissent notes are logged in individual votes."
        };
      }

      return {
        decision: parsed.decision,
        dissent: parsed.dissent
      };
    });

    // Define sequential debate flow
    builder.addEdge("__start__", "optimist");
    builder.addEdge("optimist", "pessimist");
    builder.addEdge("pessimist", "engineer");
    builder.addEdge("engineer", "lawyer");
    builder.addEdge("lawyer", "userAdvocate");

    // Route from debate to parallel voting
    builder.addEdge("userAdvocate", "optimistVote");
    builder.addEdge("userAdvocate", "pessimistVote");
    builder.addEdge("userAdvocate", "engineerVote");
    builder.addEdge("userAdvocate", "lawyerVote");
    builder.addEdge("userAdvocate", "userAdvocateVote");

    // Route all parallel votes to speaker node
    builder.addEdge("optimistVote", "speaker");
    builder.addEdge("pessimistVote", "speaker");
    builder.addEdge("engineerVote", "speaker");
    builder.addEdge("lawyerVote", "speaker");
    builder.addEdge("userAdvocateVote", "speaker");

    builder.addEdge("speaker", "__end__");

    // Compile graph
    const graph = builder.compile();

    // Run graph
    const finalState = await graph.invoke({
      topic: topic,
      messages: [],
      votes: {},
      decision: "",
      dissent: ""
    });

    return NextResponse.json({
      topic: finalState.topic,
      simulation: false,
      messages: finalState.messages,
      votes: finalState.votes,
      decision: finalState.decision,
      dissent: finalState.dissent
    });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
