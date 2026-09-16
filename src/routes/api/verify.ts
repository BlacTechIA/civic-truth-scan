import { createFileRoute } from "@tanstack/react-router";

type Evidence = { title: string; link: string; snippet: string; source: string };

const fallbackEvidence: Evidence[] = [
  {
    title: "Federal Government Policy Statement",
    link: "https://fmf.gov.ng",
    snippet: "Official government statement on the matter under review.",
    source: "fmf.gov.ng",
  },
  {
    title: "NMDPRA Regulatory Notice",
    link: "https://nmdpra.gov.ng",
    snippet: "Regulatory authority guidance on downstream petroleum activities.",
    source: "nmdpra.gov.ng",
  },
  {
    title: "Punch Nigeria News Coverage",
    link: "https://punchng.com",
    snippet: "Nigerian media reporting on the policy development.",
    source: "punchng.com",
  },
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const NORMALIZER_PROMPT =
  "You are a civic claim normalizer for Africa, with deep knowledge of Nigerian and Kenyan civic contexts. Restate the claim as a clear, precise, testable sentence. Remove emotional language. At the end of your response, on a new line, output the likely country context of the claim as a two-letter ISO code only, for example: NG or KE or ZA. If unclear, output NG.";

const ASSESSOR_PROMPT = `You are a civic fact-checking assistant for African citizens, with expertise in Nigerian and Kenyan civic information. Assess the claim using only the evidence provided. Do not use outside knowledge. If evidence is insufficient, return UNVERIFIABLE. Respond with a single valid JSON object only. No markdown. No text outside the JSON.

JSON structure:
{
  "assessment": "TRUE | FALSE | MISLEADING | UNVERIFIABLE",
  "summary": "2 to 3 sentence plain language explanation of what the evidence shows",
  "why": "2 to 3 sentence reasoning behind the assessment",
  "confidence_context": "High | Medium | Low",
  "country_context": "the country this claim relates to, as a full name e.g. Nigeria, Kenya, South Africa. If pan-African or unclear, use Africa.",
  "sources": [
    {
      "title": "string",
      "publisher": "string, use the source domain if no publisher name is clear",
      "source_type": "Primary if the domain ends in .gov.ng or .go.ke or .or.ke, Secondary otherwise",
      "published_at": null,
      "url": "the link from the evidence",
      "relevance": "one sentence on why this source is relevant",
      "evidence_summary": "one sentence paraphrase of what the snippet says"
    }
  ],
  "next_steps": ["2 to 3 plain string sentences advising the user"],
  "limitations": "one sentence on the limits of this assessment"
}`;

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

async function callAnthropic(
  system: string,
  userMessage: string | ContentBlock[],
  maxTokens: number,
) {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) throw new Error("missing_key");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) throw new Error("anthropic_failed");
  const payload = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (payload.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("anthropic_empty");
  return text;
}


const kenyaFallback: Evidence[] = [
  {
    title: "Kenya Government Policy Statement",
    link: "https://www.president.go.ke",
    snippet: "Official government statement on the matter under review.",
    source: "president.go.ke",
  },
  {
    title: "IEBC Official Notice",
    link: "https://www.iebc.or.ke",
    snippet: "Independent Electoral and Boundaries Commission official guidance.",
    source: "iebc.or.ke",
  },
  {
    title: "Daily Nation Kenya Coverage",
    link: "https://nation.africa",
    snippet: "Kenyan media reporting on the policy development.",
    source: "nation.africa",
  },
];

function parseNormalization(raw: string): { claim: string; countryCode: string } {
  const lastNewline = raw.lastIndexOf("\n");
  const lastLine = lastNewline >= 0 ? raw.slice(lastNewline + 1).trim() : "";
  const codeMatch = /^[A-Z]{2}$/.exec(lastLine);
  return {
    claim: (codeMatch && lastNewline >= 0 ? raw.slice(0, lastNewline) : raw).trim(),
    countryCode: codeMatch ? codeMatch[0] : "NG",
  };
}

function searchParams(normalizedClaim: string, countryCode: string) {
  if (countryCode === "KE") {
    return { q: `${normalizedClaim} Kenya`, gl: "ke", hl: "en" };
  }
  if (countryCode === "NG") {
    return { q: `${normalizedClaim} Nigeria`, gl: "ng", hl: "en" };
  }
  return { q: `${normalizedClaim} Africa ${countryCode}`, gl: "za", hl: "en" };
}

async function searchEvidence(normalizedClaim: string, countryCode: string): Promise<Evidence[]> {
  const fallback = countryCode === "KE" ? kenyaFallback : fallbackEvidence;
  try {
    const apiKey = process.env["SERPER_API_KEY"];
    if (!apiKey) return fallback;

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({ ...searchParams(normalizedClaim, countryCode), num: 8 }),
    });
    if (!response.ok) return fallback;

    const data = (await response.json()) as {
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };
    const items = (data.organic ?? [])
      .filter((item) => item.link)
      .map((item) => ({
        title: item.title ?? item.link!,
        link: item.link!,
        snippet: item.snippet ?? "",
        source: (() => {
          try {
            return new URL(item.link!).hostname.replace(/^www\./, "");
          } catch {
            return item.link!;
          }
        })(),
      }));
    return items.length > 0 ? items : fallback;
  } catch {
    return fallback;
  }
}

function formatEvidence(evidence: Evidence[]) {
  return evidence
    .map((item, index) => `SOURCE ${index + 1}\nTitle: ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}`)
    .join("\n\n");
}

function unavailable() {
  return new Response(
    JSON.stringify({ error: "Verification service temporarily unavailable. Please try again." }),
    { status: 503, headers: jsonHeaders },
  );
}

export const Route = createFileRoute("/api/verify")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 200, headers: corsHeaders }),
      POST: async ({ request }) => {
        let claim = "";
        let imageBase64 = "";
        try {
          const body = (await request.json()) as { claim?: string; image_base64?: string };
          claim = (body.claim ?? "").trim();
          imageBase64 = (body.image_base64 ?? "").trim();
        } catch {
          claim = "";
        }

        if (!claim && !imageBase64) {
          return new Response(JSON.stringify({ error: "A claim is required." }), {
            status: 400,
            headers: jsonHeaders,
          });
        }

        let normalizedClaim = "";
        let countryCode = "NG";
        try {
          if (imageBase64) {
            const raw = await callAnthropic(
              NORMALIZER_PROMPT,
              [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
                },
                {
                  type: "text",
                  text: "Extract the main civic claim or news headline from this image. Return only the claim as a single plain sentence.",
                },
              ],
              200,
            );
            const parsed = parseNormalization(raw);
            normalizedClaim = parsed.claim;
            countryCode = parsed.countryCode;
          } else {
            const raw = await callAnthropic(NORMALIZER_PROMPT, claim, 200);
            const parsed = parseNormalization(raw);
            normalizedClaim = parsed.claim;
            countryCode = parsed.countryCode;
          }
        } catch {
          return unavailable();
        }


        const evidence = await searchEvidence(normalizedClaim, countryCode);

        let assessment: Record<string, unknown>;
        try {
          const raw = await callAnthropic(
            ASSESSOR_PROMPT,
            `Claim: ${normalizedClaim}\n\nEvidence:\n${formatEvidence(evidence)}`,
            2000,
          );
          const start = raw.indexOf("{");
          const end = raw.lastIndexOf("}");
          assessment = JSON.parse(start >= 0 ? raw.slice(start, end + 1) : raw) as Record<string, unknown>;
        } catch {
          return unavailable();
        }

        return new Response(
          JSON.stringify({ ...assessment, assessed_at: new Date().toISOString() }),
          { status: 200, headers: jsonHeaders },
        );
      },
    },
  },
});
