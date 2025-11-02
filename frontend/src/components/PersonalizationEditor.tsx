import React, { useEffect, useState } from "react";
import Popup from "./Popup";
import { Api } from "../api";
import { Button } from "./ui/button";
import { InfoIcon } from "lucide-react";
import { Input } from "./ui/input";

interface Preferences {
  city?: string;
  campus?: string;
  include_tools?: string[];
  interests?: string[];
  tone?: string;
}

interface TempInputs {
  include_tools: string;
  interests: string;
}

const PersonalizationEditor: React.FC = () => {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [tempInputs, setTempInputs] = useState<TempInputs>({
    include_tools: "",
    interests: "",
  });
  

  // Close info popup on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowInfo(false);
    };
    if (showInfo) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showInfo]);

  const fetchPrefs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Api.get("/personalization");
      setPrefs(data);
      setTempInputs({
        include_tools: (data.include_tools || []).join(", "),
        interests: (data.interests || []).join(", ")
      });
    } catch (e: any) {
      setError(e.message || "Failed to load personalization");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrefs();
  }, []);

  useEffect(() => {
    // Fetch available tools for info panel
    let cancelled = false;
    Api.get("/tools").then((data) => {
      if (cancelled) return;
      const toolNames = (data?.tools || []).map((t: any) => t.function?.name || t.name).filter(Boolean);
      // Map internal tool names to friendly labels
      const mapping: Record<string, string> = {
        get_weather: "weather",
        get_unicafe_menu: "unicafe",
        get_electricity_prices: "electricity",
        yle_news: "news",
        get_dad_joke: "dad joke",
        stadissa_tool: "events",
      };
      const friendly = Array.from(new Set(toolNames.map((n: string) => mapping[n] || null).filter(Boolean)));
      setAvailableTools(friendly as string[]);
    }).catch(() => {
      setAvailableTools([]);
    });
    return () => { cancelled = true };
  }, []);

  

  const mergeListField = (key: string, value: string) => {
    setPrefs((p: any) => {
      const existing = Array.isArray(p[key]) ? p[key] : [];
      const arr = Array.from(new Set([...existing, value]));
      return { ...p, [key]: arr };
    });
  };

  if (loading) return <div>Loading preferences...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;

  const onChange = (key: keyof Preferences, value: string) => {
    setPrefs((p) => p ? { ...p, [key]: value } : { [key]: value });
  };

  const onListChange = (key: keyof Preferences, value: string) => {
    const arr = value.split(",").map((s) => s.trim()).filter(Boolean);
    setPrefs((p) => p ? { ...p, [key]: arr } : { [key]: arr });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await Api.post("/personalization", prefs);
      // re-fetch to get normalized values
      await fetchPrefs();
    } catch (e: any) {
      setError(e.message || "Failed to save personalization");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) return <div>No preferences found.</div>;

  return (
    <div className="mt-4 p-4 border rounded backdrop-blur-lg">
      <div className="flex items-center justify-start gap-2 mb-2">
        <h3 className="font-semibold">Report Personalization</h3>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setShowInfo((s) => !s)}
          title="Show available personalization options"
          className="ml-2 rounded-full bg-white text-black w-6 h-6 p-0 flex items-center justify-center"
        >
          <InfoIcon className="w-3 h-3" />
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-sm">City</label>
          <Input value={prefs.city || ""} onChange={(e) => onChange("city", e.target.value)} />
        </div>

        <div>
          <label className="block text-sm">Campus</label>
          <Input value={prefs.campus || ""} onChange={(e) => onChange("campus", e.target.value)} />
        </div>

        <div>
          <label className="block text-sm">Include Tools (comma separated)</label>
          <Input 
            value={tempInputs.include_tools}
            onChange={(e) => setTempInputs(prev => ({ ...prev, include_tools: e.target.value }))}
            onBlur={(e) => onListChange("include_tools", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm">Interests (comma separated)</label>
          <Input 
            value={tempInputs.interests}
            onChange={(e) => setTempInputs(prev => ({ ...prev, interests: e.target.value }))}
            onBlur={(e) => onListChange("interests", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm">Tone</label>
          <Input value={prefs.tone || ""} onChange={(e) => onChange("tone", e.target.value)} />
        </div>

        <div className="flex gap-2 mt-3">
          <Button variant="outline" onClick={fetchPrefs}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="backdrop-blur-md">{saving ? "Saving..." : "Save Preferences"}</Button>
        </div>

        <Popup display="center" isOpen={showInfo} onClose={() => setShowInfo(false)}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold">What you can include</h4>
              <p className="text-sm">Choose what kinds of content you want in your report. Click an item to add it to your preferences.</p>
            </div>
            <button onClick={() => setShowInfo(false)} className="ml-4 text-sm px-2 py-1 rounded bg-background/80">Close</button>
          </div>

          <ul className="list-disc ml-5 mb-3">
            {availableTools.includes("weather") && <li className="mb-1"><button className="text-primary underline" onClick={() => { mergeListField("include_tools", "weather"); setShowInfo(false); }}>Weather</button> — Current conditions and temperatures for your city.</li>}
            {availableTools.includes("unicafe") && <li className="mb-1"><button className="text-primary underline" onClick={() => { mergeListField("include_tools", "unicafe"); setShowInfo(false); }}>Unicafe</button> — Today's lunch menu at the selected campus.</li>}
            {availableTools.includes("electricity") && <li className="mb-1"><button className="text-primary underline" onClick={() => { mergeListField("include_tools", "electricity"); setShowInfo(false); }}>Electricity</button> — Important upcoming electricity spot prices (summary).</li>}
            {availableTools.includes("news") && <li className="mb-1"><button className="text-primary underline" onClick={() => { mergeListField("include_tools", "news"); setShowInfo(false); }}>News</button> — Headlines as short markdown links.</li>}
            {availableTools.includes("events") && <li className="mb-1"><button className="text-primary underline" onClick={() => { mergeListField("include_tools", "events"); setShowInfo(false); }}>Events</button> — Local events and a short summary.</li>}
            {availableTools.includes("dad joke") && <li className="mb-1"><button className="text-primary underline" onClick={() => { mergeListField("include_tools", "dad joke"); setShowInfo(false); }}>Dad joke</button> — A light humorous one-liner to include.</li>}
          </ul>

          <h4 className="font-semibold">Tone examples</h4>
          <p className="text-sm mb-2">Click a tone to apply it to the report preview.</p>
          <div className="space-y-2">
            <div>
              <button
                className="text-sm font-medium underline"
                onClick={() => { setPrefs((p: any) => ({ ...p, tone: "formal" })); setShowInfo(false); }}
              >
                Formal
              </button>
              {' '}— "Good morning. Here is today's concise report covering weather, news and important updates."
            </div>

            <div>
              <button
                className="text-sm font-medium underline"
                onClick={() => { setPrefs((p: any) => ({ ...p, tone: "enthusiastic" })); setShowInfo(false); }}
              >
                Enthusiastic
              </button>
              {' '}— "Great news today! Here's a cheerful summary of what's going on."
            </div>

            <div>
              <button
                className="text-sm font-medium underline"
                onClick={() => { setPrefs((p: any) => ({ ...p, tone: "humorous" })); setShowInfo(false); }}
              >
                Humorous
              </button>
              {' '}— "A light, witty take on today's headlines to make you smile." 
            </div>
          </div>
        </Popup>
        {error && <div style={{ color: "red" }}>{error}</div>}
      </div>
    </div>
  );
};

export default PersonalizationEditor;
