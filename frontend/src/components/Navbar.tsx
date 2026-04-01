import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
    const { user, logout } = useAuth();

    return (
        <nav
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 24px",
                background: "var(--surface)",
                borderBottom: "1px solid var(--border)",
            }}
        >
            <Link to="/" style={{ fontWeight: 700, fontSize: "1.2rem", color: "var(--text)" }}>
                URL Shortener
            </Link>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {user ? (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                            {user.display_name || user.email}
                        </span>
                        <button className="btn-outline" onClick={logout} style={{ padding: "6px 14px" }}>
                            Logout
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/login">Login</Link>
                        <Link to="/register">
                            <button className="btn-primary" style={{ padding: "6px 14px" }}>
                                Sign Up
                            </button>
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
