import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Register() {
    const { login, user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) navigate("/dashboard", { replace: true });
    }, [user, loading, navigate]);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        try {
            const resp = await api.post("/api/auth/register", {
                email,
                password,
                display_name: displayName || undefined,
            });
            login(resp.data.access_token);
            navigate("/dashboard");
        } catch (err: unknown) {
            if (typeof err === "object" && err !== null && "response" in err) {
                const axErr = err as { response?: { data?: { detail?: string } } };
                setError(axErr.response?.data?.detail || "Registration failed");
            } else {
                setError("Registration failed");
            }
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "60px auto" }}>
            <h2 style={{ marginBottom: 24 }}>Create Account</h2>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="text"
                    placeholder="Display name (optional)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Password (min 8 chars)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                />
                {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
                <button className="btn-primary" type="submit">
                    Sign Up
                </button>
            </form>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                <a href={`${API_URL}/api/auth/google/login`}>
                    <button className="btn-outline" style={{ width: "100%" }} type="button">
                        Sign up with Google
                    </button>
                </a>
                <a href={`${API_URL}/api/auth/x/login`}>
                    <button className="btn-outline" style={{ width: "100%" }} type="button">
                        Sign up with X
                    </button>
                </a>
            </div>

            <p style={{ marginTop: 20, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Already have an account? <Link to="/login">Login</Link>
            </p>
        </div>
    );
}
