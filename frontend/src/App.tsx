import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Stats from "./pages/Stats";
import AuthCallback from "./pages/AuthCallback";

export default function App() {
    return (
        <AuthProvider>
            <Navbar />
            <main className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/stats/:shortCode" element={<Stats />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                </Routes>
            </main>
        </AuthProvider>
    );
}
