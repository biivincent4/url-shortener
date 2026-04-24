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
    const [showUtm, setShowUtm] = useState(false);
    const [utmSource, setUtmSource] = useState("");
    const [utmMedium, setUtmMedium] = useState("");
    const [utmCampaign, setUtmCampaign] = useState("");
    const [utmTerm, setUtmTerm] = useState("");
    const [utmContent, setUtmContent] = useState("");

    const buildFinalUrl = (): string => {
        let finalUrl = url;
        const params = new URLSearchParams();
        if (utmSource.trim()) params.set("utm_source", utmSource.trim());
        if (utmMedium.trim()) params.set("utm_medium", utmMedium.trim());
        if (utmCampaign.trim()) params.set("utm_campaign", utmCampaign.trim());
        if (utmTerm.trim()) params.set("utm_term", utmTerm.trim());
        if (utmContent.trim()) params.set("utm_content", utmContent.trim());
        const utmString = params.toString();
        if (utmString) {
            finalUrl += (finalUrl.includes("?") ? "&" : "?") + utmString;
        }
        return finalUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setResult(null);
        setLoading(true);
        try {
            const body: Record<string, unknown> = { url: buildFinalUrl() };
            if (customCode.trim()) body.custom_code = customCode.trim();
            if (expiresHours) body.expires_in_hours = Number(expiresHours);
            const resp = await api.post("/api/shorten", body);
            setResult(resp.data);
            setUrl("");
            setCustomCode("");
            setExpiresHours("");
            setUtmSource("");
            setUtmMedium("");
            setUtmCampaign("");
            setUtmTerm("");
            setUtmContent("");
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

    const downloadQr = async () => {
        if (!result) return;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(result.short_url)}`;
        const resp = await fetch(qrUrl);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `qr-${result.short_code}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
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

                {/* UTM Builder */}
                <button
                    type="button"
                    onClick={() => setShowUtm(!showUtm)}
                    style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.85rem", textAlign: "left", padding: 0 }}
                >
                    {showUtm ? "▾ Hide UTM parameters" : "▸ Add UTM parameters"}
                </button>
                {showUtm && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <input placeholder="utm_source (e.g. twitter)" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
                        <input placeholder="utm_medium (e.g. social)" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
                        <input placeholder="utm_campaign (e.g. summer-sale)" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
                        <input placeholder="utm_term (optional)" value={utmTerm} onChange={(e) => setUtmTerm(e.target.value)} />
                        <input placeholder="utm_content (optional)" value={utmContent} onChange={(e) => setUtmContent(e.target.value)} style={{ gridColumn: "1 / -1" }} />
                    </div>
                )}

                <button className="btn-primary" type="submit" disabled={loading}>
                    {loading ? "Shortening..." : "Shorten URL"}
                </button>
            </form>

            {error && (
                <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>
            )}

            {result && (
                <div className="card" style={{ marginTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <a href={result.short_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontSize: "1.1rem" }}>
                            {result.short_url}
                        </a>
                        <button className="btn-outline" onClick={copyToClipboard}>
                            {copied ? "Copied!" : "Copy"}
                        </button>
                    </div>
                    <div style={{ marginTop: 12, textAlign: "center" }}>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(result.short_url)}`}
                            alt="QR Code"
                            width={120}
                            height={120}
                            style={{ borderRadius: 8, background: "#fff", padding: 6 }}
                        />
                        <div style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}>
                            <button className="btn-outline" onClick={downloadQr} style={{ fontSize: "0.8rem", padding: "4px 12px" }}>
                                ⬇ Download QR
                            </button>
                        </div>
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 4 }}>Scan to open link</p>
                    </div>
                </div>
            )}
        </div>
    );
}
