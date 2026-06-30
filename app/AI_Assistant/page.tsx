"use client";

import { useEffect, useState } from "react";

type Service = {
  id?: string;
  name: string;
  duration: number | "";
  price: number | "";
};

type AiAssistantData = {
  business_name: string | null;
  ai_name: string | null;
  agent_prompt: string | null;
  elevenlabs_agent_id: string | null;
  services: Service[];
};

export default function AIAssistantPage() {
  const [companyName, setCompanyName] = useState("");
  const [assistantName, setAssistantName] = useState("");
  const [promptText, setPromptText] = useState("");
  const [agentLink, setAgentLink] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setServices(data.services ?? []);
      } catch (error) {
        console.error(error);
        setMessage(typeof error === "string" ? error : (error as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  function addService() {
    setServices((prev) => [...prev, { name: "", duration: "", price: "" }]);
  }

  function removeService(index: number) {
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  function updateService(index: number, field: keyof Omit<Service, "id">, value: string) {
    setServices((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (field === "duration" || field === "price") {
          return { ...s, [field]: value === "" ? "" : Number(value) };
        }
        return { ...s, [field]: value };
      })
    );
  }

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!companyName.trim() || !assistantName.trim() || !promptText.trim()) {
      setMessage("Please complete all fields before confirming and saving.");
      return;
    }

    for (const s of services) {
      if (!s.name.trim() || s.duration === "" || s.price === "") {
        setMessage("Please fill in all service fields (name, duration, and price).");
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch("/api/ai-assistant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: companyName,
          ai_name: assistantName,
          agent_prompt: promptText,
          services: services.map((s) => ({
            name: s.name,
            duration: Number(s.duration),
            price: Number(s.price),
          })),
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
      setServices(updated.services ?? []);
      setMessage("Settings and services saved successfully.");
    } catch (error) {
      console.error(error);
      setMessage(typeof error === "string" ? error : (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#000000] p-6 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl shadow-black/60">
        <h1 className="mb-4 text-3xl font-semibold">AI Assistant Setup</h1>
        <p className="mb-8 text-zinc-400">
          Review and update your company AI assistant settings. The agent link is read-only.
        </p>

        {loading ? (
          <div className="rounded-3xl border border-zinc-700 bg-zinc-800 px-6 py-8 text-center text-zinc-400">
            Loading your AI assistant settings...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={handleSave}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">Company Name</span>
                <input
                  type="text"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Acme Corp"
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-200">AI Name</span>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(event) => setAssistantName(event.target.value)}
                  placeholder="Booking Bot"
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">AI Prompt</span>
              <textarea
                value={promptText}
                onChange={(event) => setPromptText(event.target.value)}
                placeholder="Describe the AI assistant's role and behavior for this company."
                rows={8}
                className="w-full rounded-3xl border border-zinc-700 bg-zinc-800 px-4 py-4 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </label>

            {/* Services */}
            <div className="rounded-3xl border border-zinc-700 bg-zinc-800 p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">Services</span>
                <button
                  type="button"
                  onClick={addService}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-600 bg-zinc-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-600"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  Add Service
                </button>
              </div>

              {services.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">No services added yet.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_90px_90px_36px] gap-3 px-1">
                    <span className="text-xs text-zinc-500">Name</span>
                    <span className="text-xs text-zinc-500">Duration (min)</span>
                    <span className="text-xs text-zinc-500">Price ($)</span>
                    <span />
                  </div>

                  {services.map((service, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_90px_90px_36px] items-center gap-3"
                    >
                      <input
                        type="text"
                        value={service.name}
                        onChange={(e) => updateService(index, "name", e.target.value)}
                        placeholder="e.g. Haircut"
                        className="w-full rounded-xl border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <input
                        type="number"
                        min="1"
                        value={service.duration}
                        onChange={(e) => updateService(index, "duration", e.target.value)}
                        placeholder="60"
                        className="w-full rounded-xl border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={service.price}
                        onChange={(e) => updateService(index, "price", e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-zinc-600 bg-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-600 bg-zinc-700 text-zinc-400 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-200">Agent Link</span>
              <input
                type="text"
                value={agentLink ? `https://elevenlabs.io/app/talk-to?agent_id=${agentLink}` : ""}
                readOnly
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-500 outline-none"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </>
                ) : (
                  "Confirm and Save"
                )}
              </button>
            </div>
          </form>
        )}

        {message ? (
          <div className="mt-6 rounded-2xl border border-zinc-700 bg-zinc-800 px-5 py-4 text-sm text-zinc-200">
            {message}
          </div>
        ) : null}
      </div>
    </main>
  );
}
