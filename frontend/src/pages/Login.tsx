export default function Login() {
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

  function handleGoogleLogin() {
    window.location.href = `${API_BASE}/api/auth/google`;
  }

  function handleFormLogin(e: React.FormEvent) {
    e.preventDefault();
    alert("Email login not implemented in this demo. Please use Google Login.");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "#FFFFFF",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "380px",
          boxSizing: "border-box",
          backgroundColor: "#FFFFFF",
          border: "1px solid #F3F4F6",
          borderRadius: "16px",
          padding: "32px",
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: "30px",
            fontWeight: 700,
            textAlign: "center",
            color: "#111827",
            margin: "0 0 24px 0",
          }}
        >
          Login
        </h1>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          style={{
            width: "100%",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            padding: "12px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            backgroundColor: "#E8F5E9",
            color: "#111827",
            border: "none",
            cursor: "pointer",
            marginBottom: "16px",
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Login with Google
        </button>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div style={{ flex: 1, height: "1px", backgroundColor: "#E5E7EB" }} />
          <span style={{ fontSize: "12px", color: "#9CA3AF", whiteSpace: "nowrap" }}>
            or sign up through email
          </span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#E5E7EB" }} />
        </div>

        {/* Email form */}
        <form
          onSubmit={handleFormLogin}
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <input
            type="email"
            placeholder="Email ID"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "#F3F4F6",
              color: "#111827",
              border: "none",
              outline: "none",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "12px 16px",
              borderRadius: "8px",
              fontSize: "14px",
              backgroundColor: "#F3F4F6",
              color: "#111827",
              border: "none",
              outline: "none",
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              boxSizing: "border-box",
              marginTop: "4px",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 600,
              backgroundColor: "#10B981",
              color: "#FFFFFF",
              border: "none",
              cursor: "pointer",
            }}
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}