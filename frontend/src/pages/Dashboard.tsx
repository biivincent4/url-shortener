import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UrlForm from "../components/UrlForm";
import UrlList from "../components/UrlList";
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

export default function Dashboard() {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [urls, setUrls] = useState<UrlItem[]>([]);

    const fetchUrls = useCallback(async () => {
        try {
            const resp = await api.get("/api/urls");
            setUrls(resp.data);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        if (!loading && !user) {
            navigate("/login");
            return;
        }
        if (user) fetchUrls();
    }, [user, loading, navigate, fetchUrls]);

    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h2 style={{ marginBottom: 24 }}>Dashboard</h2>
            <div className="card" style={{ marginBottom: 32 }}>
                <h3 style={{ marginBottom: 16 }}>Create Short URL</h3>
                <UrlForm onCreated={fetchUrls} />
            </div>
            <h3 style={{ marginBottom: 16 }}>Your URLs</h3>
            <UrlList urls={urls} onRefresh={fetchUrls} />
        </div>
    );
}
