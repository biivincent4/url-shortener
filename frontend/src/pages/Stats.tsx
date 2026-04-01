import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

interface StatsData {
    short_code: string;
    original_url: string;
    total_clicks: number;
    unique_visitors: number;
    clicks_over_time: { date: string; clicks: number }[];
    top_referrers: { referrer: string; clicks: number }[];
    recent_clicks: { clicked_at: string; referrer: string | null; user_agent: string | null }[];
}

export default function Stats() {
    const { shortCode } = useParams<{ shortCode: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<StatsData | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/login");
            return;
        }
        if (user && shortCode) {
            api
                .get(`/api/urls/${shortCode}/stats`)
                .then((r) => setStats(r.data))
                .catch(() => setError("Could not load stats"));
        }
    }, [user, authLoading, shortCode, navigate]);

    if (authLoading) return <p>Loading...</p>;
    if (error) return <p style={{ color: "var(--danger)" }}>{error}</p>;
    if (!stats) return <p>Loading stats...</p>;

    return (
        <div>
            <h2 style={{ marginBottom: 8 }}>Stats for /{stats.short_code}</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 24, wordBreak: "break-all" }}>
                {stats.original_url}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
                <div className="card" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.total_clicks}</p>
                    <p style={{ color: "var(--text-muted)" }}>Total Clicks</p>
                </div>
                <div className="card" style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "2rem", fontWeight: 700 }}>{stats.unique_visitors}</p>
                    <p style={{ color: "var(--text-muted)" }}>Unique Visitors</p>
                </div>
            </div>

            {stats.clicks_over_time.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 12 }}>Clicks Over Time (Last 30 Days)</h3>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 150 }}>
                        {stats.clicks_over_time.map((d) => {
                            const max = Math.max(...stats.clicks_over_time.map((x) => x.clicks));
                            const height = max > 0 ? (d.clicks / max) * 140 : 0;
                            return (
                                <div
                                    key={d.date}
                                    title={`${d.date}: ${d.clicks}`}
                                    style={{
                                        flex: 1,
                                        background: "var(--primary)",
                                        borderRadius: "4px 4px 0 0",
                                        height: Math.max(height, 2),
                                        minWidth: 4,
                                    }}
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {stats.top_referrers.length > 0 && (
                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ marginBottom: 12 }}>Top Referrers</h3>
                    {stats.top_referrers.map((r) => (
                        <div
                            key={r.referrer}
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "6px 0",
                                borderBottom: "1px solid var(--border)",
                            }}
                        >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {r.referrer}
                            </span>
                            <span style={{ fontWeight: 600, marginLeft: 12 }}>{r.clicks}</span>
                        </div>
                    ))}
                </div>
            )}

            <div className="card">
                <h3 style={{ marginBottom: 12 }}>Recent Clicks</h3>
                {stats.recent_clicks.length === 0 ? (
                    <p style={{ color: "var(--text-muted)" }}>No clicks yet.</p>
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                    <th style={{ textAlign: "left", padding: 8 }}>Time</th>
                                    <th style={{ textAlign: "left", padding: 8 }}>Referrer</th>
                                    <th style={{ textAlign: "left", padding: 8 }}>User Agent</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_clicks.map((c, i) => (
                                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                                        <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                                            {new Date(c.clicked_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: 8, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {c.referrer || "-"}
                                        </td>
                                        <td style={{ padding: 8, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {c.user_agent || "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
