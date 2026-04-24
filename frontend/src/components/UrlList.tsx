import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";

interface TagBrief {
    id: string;
    name: string;
    color: string | null;
}

interface UrlItem {
    id: string;
    short_code: string;
    short_url: string;
    original_url: string;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
    total_clicks: number;
    tags: TagBrief[];
}

function EditableUrl({ url, onRefresh }: { url: UrlItem; onRefresh: () => void }) {
    const [editing, setEditing] = useState(false);
    const [newUrl, setNewUrl] = useState(url.original_url);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch(`/api/urls/${url.short_code}`, { url: newUrl });
            setEditing(false);
            onRefresh();
        } catch {
            /* ignore */
        } finally {
            setSaving(false);
        }
    };

    const downloadQr = async () => {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(url.short_url)}`;
        const resp = await fetch(qrUrl);
        const blob = await resp.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `qr-${url.short_code}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const handleDeactivate = async () => {
        await api.delete(`/api/urls/${url.short_code}`);
        onRefresh();
    };

    return (
        <div
            className="card"
            style={{ opacity: url.is_active ? 1 : 0.5 }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <a
                            href={url.short_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontWeight: 600, fontSize: "1.05rem" }}
                        >
                            {url.short_code}
                        </a>
                        {!url.is_active && (
                            <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>inactive</span>
                        )}
                        {url.tags?.map((t) => (
                            <span
                                key={t.id}
                                style={{
                                    fontSize: "0.7rem",
                                    padding: "1px 8px",
                                    borderRadius: 12,
                                    background: t.color || "var(--primary)",
                                    color: "#fff",
                                    fontWeight: 500,
                                }}
                            >
                                {t.name}
                            </span>
                        ))}
                    </div>
                    {editing ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            <input
                                type="url"
                                value={newUrl}
                                onChange={(e) => setNewUrl(e.target.value)}
                                style={{ flex: 1, fontSize: "0.85rem", padding: "4px 8px" }}
                            />
                            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: "4px 12px", fontSize: "0.8rem" }}>
                                {saving ? "..." : "Save"}
                            </button>
                            <button className="btn-outline" onClick={() => { setEditing(false); setNewUrl(url.original_url); }} style={{ padding: "4px 12px", fontSize: "0.8rem" }}>
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <p
                            style={{
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                cursor: url.is_active ? "pointer" : "default",
                            }}
                            onClick={() => url.is_active && setEditing(true)}
                            title={url.is_active ? "Click to edit destination" : undefined}
                        >
                            {url.original_url}
                        </p>
                    )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 16 }}>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(url.short_url)}`}
                        alt="QR"
                        width={40}
                        height={40}
                        style={{ borderRadius: 4, background: "#fff", padding: 2, cursor: "pointer" }}
                        onClick={downloadQr}
                        title="Click to download QR"
                    />
                    <Link to={`/stats/${url.short_code}`} style={{ fontSize: "0.9rem" }}>
                        {url.total_clicks} clicks
                    </Link>
                    {url.is_active && (
                        <button
                            className="btn-danger"
                            style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                            onClick={handleDeactivate}
                        >
                            Deactivate
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function UrlList({
    urls,
    onRefresh,
}: {
    urls: UrlItem[];
    onRefresh: () => void;
}) {
    if (urls.length === 0) {
        return <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No URLs yet.</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {urls.map((u) => (
                <EditableUrl key={u.id} url={u} onRefresh={onRefresh} />
            ))}
        </div>
    );
}
