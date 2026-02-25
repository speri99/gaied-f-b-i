
"use client";
import { useSearchParams } from 'next/navigation';
const StatusPage = () => {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  let message = "";
  let title = "Status Update";

  switch (type) {
    case "user-not-active":
      title = "Account Inactive";
      message =
        "Your account is inactive. This usually means that your account has been created but has not been activated yet. Please contact your administrator to enable your access to this system.";
      break;
    case "tenant-created":
      title = "Tenant Created";
      message =
        "Your tenant account has been successfully created! Our system is now setting up your environment. You’ll be notified once everything is ready.";
      break;
    case "user-not-exist":
      title = "Account Not Found";
      message =
        "We couldn’t find your account in our system. This might mean you don’t have access yet. Please contact your administrator or support to request an invitation.";
      break;
    case "tenant-not-active":
      title = "Setup in Progress";
      message =
        "Your account setup is still in progress. Our team is finalizing your tenant environment.";
      break;
    default:
      title = "Unknown Status";
      message = "Please check back later or contact support for help.";
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#0a0a23",
        color: "white",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      }}
    >
      <main
        style={{
          textAlign: "center",
          background: "#1a1a2e",
          padding: "2.5rem 3rem",
          borderRadius: "16px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
          maxWidth: "480px",
          width: "90%",
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{title}</div>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.6,
            color: "#d1d5db",
            marginBottom: "1rem",
          }}
        >
          {message}
        </p>

        <p style={{ fontSize: "0.95rem", color: "#a5a5a5" }}>
          If you need help, feel free to reach out to{" "}
          <strong style={{ color: "white" }}>Guided Safety Support</strong>.
        </p>
      </main>
    </div>
  );
};

export default StatusPage;