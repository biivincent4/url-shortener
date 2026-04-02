import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import UrlForm from "../components/UrlForm";

const features = [
    { icon: "\u26A1", title: "Instant Shortening", desc: "Paste a URL, get a short link in milliseconds. No account required." },
    { icon: "\uD83D\uDCCA", title: "Click Analytics", desc: "Track clicks, referrers, unique visitors, and daily trends." },
    { icon: "\u2702\uFE0F", title: "Custom Short Codes", desc: "Choose your own memorable codes like urls.trie.africa/my-brand." },
    { icon: "\u23F3", title: "Expiring Links", desc: "Set links to auto-expire in 1 hour, 7 days, or 30 days." },
    { icon: "\uD83D\uDD12", title: "Secure & Private", desc: "HTTPS everywhere, hashed IPs, and your data stays yours." },
    { icon: "\uD83C\uDF0D", title: "Built for Africa", desc: "Fast, free, and proudly hosted on a .africa domain." },
];

export default function Home() {
    const { user } = useAuth();

    return (
        <div>
            {/* Hero */}
            <section style={{ textAlign: "center", padding: "64px 0 48px" }}>
                <p style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                    Free &middot; Fast &middot; African-Built
                </p>
                <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.15, marginBottom: 16 }}>
                    Shorten, Track &amp;<br />Share Your Links
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: "1.15rem", maxWidth: 520, margin: "0 auto 36px" }}>
                    Turn long URLs into short, memorable links with real-time analytics.
                    No credit card. No limits.
                </p>
                <div style={{ maxWidth: 600, margin: "0 auto" }}>
                    <UrlForm />
                </div>
                {!user && (
                    <p style={{ marginTop: 20, color: "var(--text-muted)", fontSize: "0.9rem" }}>
                        Want analytics &amp; saved links?{" "}
                        <Link to="/register" style={{ fontWeight: 600 }}>Create a free account</Link>
                    </p>
                )}
            </section>

            {/* Features */}
            <section style={{ padding: "48px 0" }}>
                <h2 style={{ textAlign: "center", fontSize: "1.6rem", fontWeight: 700, marginBottom: 36 }}>
                    Everything you need in a link shortener
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
                    {features.map((f) => (
                        <div key={f.title} className="card" style={{ textAlign: "center" }}>
                            <div style={{ fontSize: "2rem", marginBottom: 8 }}>{f.icon}</div>
                            <h3 style={{ fontSize: "1.05rem", marginBottom: 6 }}>{f.title}</h3>
                            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ textAlign: "center", padding: "48px 0 64px" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>
                    Ready to shorten your first link?
                </h2>
                <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
                    Join for free and start tracking your links today.
                </p>
                {!user && (
                    <Link to="/register">
                        <button className="btn-primary" style={{ padding: "14px 36px", fontSize: "1.05rem" }}>
                            Get Started &mdash; It&apos;s Free
                        </button>
                    </Link>
                )}
            </section>

            {/* Footer */}
            <footer style={{ textAlign: "center", padding: "24px 0", borderTop: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                &copy; {new Date().getFullYear()} urls.trie.africa &middot; Built in Africa
            </footer>
        </div>
    );
}
