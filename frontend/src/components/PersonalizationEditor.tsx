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

interface PersonalizationEditorProps {
  onClose?: () => void;
}

const PersonalizationEditor: React.FC<PersonalizationEditorProps> = ({ onClose }) => {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [availableTools, setAvailableTools] = useState<string[]>([]);
  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsDropdownRef = React.useRef<HTMLDivElement | null>(null);
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
  Api.get("/tools")
    .then((data) => {
      if (cancelled) return;
      const tools = data?.tools || [];
      const toolNames = tools
        .map((t: any) => t?.function?.name || t?.name)
        .filter(Boolean);
      const unique = Array.from(new Set(toolNames));
      setAvailableTools(unique);
    })
    .catch(() => {
      setAvailableTools([]);
    });
  return () => {
    cancelled = true;
  };
}, []);

  // Close tools dropdown on outside click
  useEffect(() => {
    if (!toolsOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!toolsDropdownRef.current) return;
      if (!toolsDropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [toolsOpen]);

  

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
      setShowInfo(false);
      onClose?.();
    } catch (e: any) {
      setError(e.message || "Failed to save personalization");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) return <div>No preferences found.</div>;

  return (
  <div className="mt-4 p-4 border rounded backdrop-blur-lg w-[640px] mx-auto overflow-x-hidden break-words">
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
          <label className="block text-sm mb-1">Include Tools</label>
          <div className="relative" ref={toolsDropdownRef}>
            <button
              type="button"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs text-left focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              onClick={() => setToolsOpen((o) => !o)}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="whitespace-normal break-words">
                  {Array.isArray(prefs.include_tools) && prefs.include_tools.length > 0
                    ? prefs.include_tools.join(", ")
                    : "Select tools"}
                </span>
                <span className="text-muted-foreground flex-shrink-0 mt-0.5">▾</span>
              </div>
            </button>

            {toolsOpen && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-background p-2 shadow-lg">
                {availableTools.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2 py-1">No tools available</div>
                )}
                {availableTools.map((toolName) => {
                  const selected = (prefs.include_tools || []).includes(toolName);
                  return (
                    <label
                      key={toolName}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selected}
                        onChange={(e) => {
                          const current = new Set(prefs.include_tools || []);
                          if (e.target.checked) current.add(toolName);
                          else current.delete(toolName);
                          const next = Array.from(current);
                          setPrefs((p) => (p ? { ...p, include_tools: next } : { include_tools: next }));
                          setTempInputs((prev) => ({ ...prev, include_tools: next.join(", ") }));
                        }}
                      />
                      <span>{toolName}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
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
              <p className="text-sm">Choose what kinds of content you want in your report.</p>
            </div>
            <button onClick={() => setShowInfo(false)} className="ml-4 text-sm px-2 py-1 rounded bg-background/80">Close</button>
          </div>

          <ul className="list-disc ml-5 mb-3">
            <li className="mb-1"><span className="font-medium">Weather</span> — Current conditions and temperatures for your city.</li>
            <li className="mb-1"><span className="font-medium">Unicafe</span> — Today's lunch menu at the selected campus.</li>
            <li className="mb-1"><span className="font-medium">Electricity</span> — Important upcoming electricity spot prices (summary).</li>
            <li className="mb-1"><span className="font-medium">News</span> — Headlines as short markdown links.</li>
            <li className="mb-1"><span className="font-medium">Events</span> — Local events and a short summary.</li>
            <li className="mb-1"><span className="font-medium">Dad joke</span> — A light humorous one-liner to include.</li>
          </ul>

          <h4 className="font-semibold">Tone examples</h4>
          <p className="text-sm mb-2">Click a tone to apply it to the report.</p>
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
