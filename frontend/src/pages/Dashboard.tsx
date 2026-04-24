import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UrlForm from "../components/UrlForm";
import UrlList from "../components/UrlList";
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

export default function Dashboard() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [urls, setUrls] = useState<UrlItem[]>([]);
    const [tags, setTags] = useState<TagBrief[]>([]);
    const [filterTag, setFilterTag] = useState("");
    const [showBulk, setShowBulk] = useState(false);
    const [bulkText, setBulkText] = useState("");
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkResults, setBulkResults] = useState<{ index: number; result?: { short_url: string }; error?: string }[]>([]);
    const [newTagName, setNewTagName] = useState("");

    const fetchUrls = useCallback(async () => {
        try {
            const params: Record<string, string> = {};
            if (filterTag) params.tag = filterTag;
            const resp = await api.get("/api/urls", { params });
            setUrls(resp.data);
        } catch {
            /* ignore */
        }
    }, [filterTag]);

    const fetchTags = useCallback(async () => {
        try {
            const resp = await api.get("/api/tags");
            setTags(resp.data);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/login");
            return;
        }
        if (user) {
            fetchUrls();
            fetchTags();
        }
    }, [user, loading, navigate, fetchUrls, fetchTags]);

    const handleBulkSubmit = async () => {
        const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) return;
        setBulkLoading(true);
        setBulkResults([]);
        try {
            const resp = await api.post("/api/shorten/bulk", {
                urls: lines.map((u) => ({ url: u })),
            });
            setBulkResults(resp.data.results);
            fetchUrls();
        } catch {
            setBulkResults([{ index: 0, error: "Bulk request failed" }]);
        } finally {
            setBulkLoading(false);
        }
    };

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return;
        try {
            await api.post("/api/tags", { name: newTagName.trim() });
            setNewTagName("");
            fetchTags();
        } catch {
            /* ignore */
        }
    };

    const handleDeleteTag = async (id: string) => {
        await api.delete(`/api/tags/${id}`);
        fetchTags();
        fetchUrls();
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>Dashboard</h2>

            <div className="card" style={{ marginBottom: 32 }}>
                <h3 style={{ marginBottom: 16 }}>Create Short URL</h3>
                <UrlForm onCreated={fetchUrls} />
            </div>

            {/* Bulk URL Creation */}
            <div style={{ marginBottom: 24 }}>
                <button
                    className="btn-outline"
                    onClick={() => setShowBulk(!showBulk)}
                    style={{ fontSize: "0.85rem", marginBottom: 8 }}
                >
                    {showBulk ? "▾ Hide Bulk Create" : "▸ Bulk Create URLs"}
                </button>
                {showBulk && (
                    <div className="card">
                        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: 8 }}>
                            Paste one URL per line (max 100):
                        </p>
                        <textarea
                            value={bulkText}
                            onChange={(e) => setBulkText(e.target.value)}
                            rows={5}
                            placeholder={"https://example.com/page1\nhttps://example.com/page2"}
                            style={{ width: "100%", resize: "vertical", fontFamily: "monospace", fontSize: "0.85rem" }}
                        />
                        <button
                            className="btn-primary"
                            onClick={handleBulkSubmit}
                            disabled={bulkLoading}
                            style={{ marginTop: 8 }}
                        >
                            {bulkLoading ? "Creating..." : "Shorten All"}
                        </button>
                        {bulkResults.length > 0 && (
                            <div style={{ marginTop: 12, fontSize: "0.85rem" }}>
                                {bulkResults.map((r) => (
                                    <div key={r.index} style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                                        {r.result ? (
                                            <span style={{ color: "var(--text)" }}>✓ {r.result.short_url}</span>
                                        ) : (
                                            <span style={{ color: "var(--danger)" }}>✗ Line {r.index + 1}: {r.error}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tags Management */}
            <div className="card" style={{ marginBottom: 24 }}>
                <h3 style={{ marginBottom: 12 }}>Tags</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                    {tags.map((t) => (
                        <span
                            key={t.id}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 10px",
                                borderRadius: 12,
                                background: t.color || "var(--primary)",
                                color: "#fff",
                                fontSize: "0.8rem",
                            }}
                        >
                            {t.name}
                            <button
                                onClick={() => handleDeleteTag(t.id)}
                                style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", padding: 0, fontSize: "0.9rem", lineHeight: 1 }}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <input
                        placeholder="New tag name"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        style={{ flex: 1, fontSize: "0.85rem", padding: "6px 10px" }}
                        onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                    />
                    <button className="btn-outline" onClick={handleCreateTag} style={{ fontSize: "0.85rem" }}>
                        + Add Tag
                    </button>
                </div>
            </div>

            {/* URL List with tag filter */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3>Your URLs</h3>
                <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    style={{ fontSize: "0.85rem", padding: "4px 8px" }}
                >
                    <option value="">All tags</option>
                    {tags.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                </select>
            </div>
            <UrlList urls={urls} onRefresh={fetchUrls} />
        </div>
    );
}
