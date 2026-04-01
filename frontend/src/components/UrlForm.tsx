import { useState } from "react";
import api from "../api/client";

interface ShortenResult {
    short_code: string;
    short_url: string;
    original_url: string;
}

export default function UrlForm({ onCreated }: { onCreated?: () => void }) {
    const [url, setUrl] = useState("");
    const [customCode, setCustomCode] = useState("");
    const [expiresHours, setExpiresHours] = useState("");
    const [result, setResult] = useState<ShortenResult | null>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setLoading(true);
        try {
            const body: Record<string, unknown> = { url };
            if (customCode.trim()) body.custom_code = customCode.trim();
            if (expiresHours) body.expires_in_hours = Number(expiresHours);
            const resp = await api.post("/api/shorten", body);
            setResult(resp.data);
            setUrl("");
            setCustomCode("");
            setExpiresHours("");
            onCreated?.();
        } catch (err: unknown) {
            if (typeof err === "object" && err !== null && "response" in err) {
                const axErr = err as { response?: { data?: { detail?: string } } };
                setError(axErr.response?.data?.detail || "Failed to shorten URL");
            } else {
                setError("Failed to shorten URL");
            }
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (result) {
            navigator.clipboard.writeText(result.short_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                    type="url"
                    placeholder="Paste your long URL here..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    style={{ fontSize: "1.1rem", padding: "14px 16px" }}
                />
                <div style={{ display: "flex", gap: 12 }}>
                    <input
                        type="text"
                        placeholder="Custom code (optional)"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value)}
                    />
                    <select
                        value={expiresHours}
                        onChange={(e) => setExpiresHours(e.target.value)}
                        style={{ maxWidth: 200 }}
                    >
                        <option value="">Never expires</option>
                        <option value="1">1 hour</option>
                        <option value="24">24 hours</option>
                        <option value="168">7 days</option>
                        <option value="720">30 days</option>
                    </select>
                </div>
                <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? "Shortening..." : "Shorten URL"}
                </button>
            </form>

            {error && (
                <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>
            )}

            {result && (
                <div className="card" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12 }}>
                    <a href={result.short_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: "1.1rem" }}>
                        {result.short_url}
                    </a>
                    <button className="btn-outline" onClick={copyToClipboard}>
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
            )}
        </div>
    );
}
