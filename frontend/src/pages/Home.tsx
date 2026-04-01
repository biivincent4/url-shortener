import UrlForm from "../components/UrlForm";

export default function Home() {
    return (
        <div style={{ maxWidth: 600, margin: "0 auto", paddingTop: 60, textAlign: "center" }}>
            <h1 style={{ fontSize: "2.4rem", marginBottom: 8 }}>Shorten Your URLs</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 32 }}>
                Paste a long URL and get a short, trackable link instantly.
            </p>
            <UrlForm />
        </div>
    );
}
