import { Link } from "react-router-dom";
import api from "../api/client";

interface UrlItem {
    id: string;
    short_code: string;
    short_url: string;
    original_url: string;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
    total_clicks: number;
}

export default function UrlList({
    urls,
    onRefresh,
}: {
    urls: UrlItem[];
    onRefresh: () => void;
}) {
    const handleDeactivate = async (shortCode: string) => {
        await api.delete(`/api/urls/${shortCode}`);
        onRefresh();
    };

    if (urls.length === 0) {
        return <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No URLs yet.</p>;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {urls.map((u) => (
                <div
                    key={u.id}
                    className="card"
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        opacity: u.is_active ? 1 : 0.5,
                    }}
                >
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <a
                                href={u.short_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontWeight: 600, fontSize: "1.05rem" }}
                            >
                                {u.short_code}
                            </a>
                            {!u.is_active && (
                                <span style={{ fontSize: "0.75rem", color: "var(--danger)" }}>inactive</span>
                            )}
                        </div>
                        <p
                            style={{
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {u.original_url}
                        </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: 16 }}>
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(u.short_url)}`}
                            alt="QR"
                            width={40}
                            height={40}
                            style={{ borderRadius: 4, background: "#fff", padding: 2 }}
                        />
                        <Link to={`/stats/${u.short_code}`} style={{ fontSize: "0.9rem" }}>
                            {u.total_clicks} clicks
                        </Link>
                        {u.is_active && (
                            <button
                                className="btn-danger"
                                style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                                onClick={() => handleDeactivate(u.short_code)}
                            >
                                Deactivate
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
