import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.slice(1));
        const token = params.get("token");
        if (token) {
            login(token);
            navigate("/dashboard");
        } else {
            navigate("/login");
        }
    }, [login, navigate]);

    return <p style={{ textAlign: "center", paddingTop: 60 }}>Authenticating...</p>;
}
