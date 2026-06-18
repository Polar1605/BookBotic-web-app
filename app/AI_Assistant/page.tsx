"use client";

import { useEffect, useState } from "react";

type AiAssistantData = {
  business_name: string | null;
  ai_name: string | null;
  agent_prompt: string | null;
  elevenlabs_agent_id: string | null;
};

export default function AIAssistantPage() {
  const [companyName, setCompanyName] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [agentLink, setAgentLink] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/ai-assistant", { cache: "no-store" });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.error ?? "Failed to load AI assistant settings.");
        }

        const data: AiAssistantData = await response.json();
        setCompanyName(data.business_name ?? "");
        setAssistantName(data.ai_name ?? "");
        setPromptText(data.agent_prompt ?? "");
        setAgentLink(data.elevenlabs_agent_id ?? "");
      } catch (error) {
        console.error(error);
        setMessage(typeof error === "string" ? error : (error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!companyName.trim() || !assistantName.trim() || !promptText.trim()) {
      setMessage("Please complete all fields before confirming and saving.");
      return;
    }

    try {
      const response = await fetch("/api/ai-assistant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: companyName,
          ai_name: assistantName,
          agent_prompt: promptText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error ?? "Unable to update AI assistant settings.");
      }

      const updated: AiAssistantData = await response.json();
      setCompanyName(updated.business_name ?? "");
      setAssistantName(updated.ai_name ?? "");
      setPromptText(updated.agent_prompt ?? "");
      setAgentLink(updated.elevenlabs_agent_id ?? "");
      setMessage("AI assistant settings saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage(typeof error === "string" ? error : (error as Error).message);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] p-6 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-700 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40">
        <h1 className="mb-4 text-3xl font-semibold">AI Assistant Setup</h1>
        <p className="mb-8 text-slate-300">Review and update your company AI assistant settings. The agent link is read-only.</p>

        {loading ? (
          <div className="rounded-3xl border border-slate-700 bg-slate-950 px-6 py-8 text-center text-slate-300">
            Loading your AI assistant settings...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Company Name</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">AI Name</span>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(event) => setAssistantName(event.target.value)}
                  placeholder="Booking Bot"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">AI Prompt</span>
              <textarea
                value={promptText}
                onChange={(event) => setPromptText(event.target.value)}
                placeholder="Describe the AI assistant's role and behavior for this company."
                rows={8}
                className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-4 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-200">Agent Link</span>
              <input
                type="text"
                value={agentLink ? `https://elevenlabs.io/app/talk-to?agent_id=${agentLink}` : ''}
                readOnly
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-400 outline-none"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                Confirm and Save
              </button>
            </div>
          </form>
        )}

        {message ? (
          <div className="mt-6 rounded-2xl bg-slate-800 px-5 py-4 text-sm text-slate-200">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
