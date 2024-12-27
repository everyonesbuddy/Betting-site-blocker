import React, { useState, useEffect } from "react";
import "fontsource-roboto";
import { createRoot } from "react-dom/client";
import "./popup.css";

const Popup = () => {
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);

  // Fetch the list of blocked sites from the background script
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getBlockedSites" }, (response) => {
      if (response && response.blockedSites) {
        setBlockedSites(response.blockedSites); // Update state with blocked sites
      }
    });

    // Fetch timer expiration and total duration from local storage
    chrome.storage.local.get(["timerExpiration", "totalTime"], (result) => {
      const currentTime = Date.now();
      const timerExpiration = result.timerExpiration || 0;
      const storedTotalTime = result.totalTime || null;

      if (timerExpiration > currentTime) {
        const remainingTime = Math.floor(
          (timerExpiration - currentTime) / 1000
        );
        setCountdown(remainingTime);
        setTotalTime(storedTotalTime);
        setTimerRunning(true);
      }
    });
  }, []);

  // Handle countdown updates
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(
        () => setCountdown((prev) => (prev ? prev - 1 : 0)),
        1000
      );
    } else if (countdown === 0) {
      chrome.runtime.sendMessage({ action: "timerExpired" });
      setTimerRunning(false);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const startTimer = (minutes: number) => {
    const seconds = minutes * 60;
    const expirationTime = Date.now() + seconds * 1000;

    setCountdown(seconds);
    setTotalTime(seconds);
    setTimerRunning(true);

    chrome.runtime.sendMessage({ action: "startTimer", duration: seconds });
    chrome.storage.local.set({
      timerExpiration: expirationTime,
      totalTime: seconds,
    });
  };

  const calculateStrokeDashoffset = () => {
    if (countdown === null || totalTime === null) return 0;
    const percentage = countdown / totalTime;
    const circumference = 2 * Math.PI * 45; // Radius is 45
    return circumference * (1 - percentage);
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        textAlign: "center",
        backgroundColor: "#f9f9f9",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
        maxWidth: "400px",
        margin: "40px auto",
      }}
    >
      <h2 style={{ fontSize: "24px", marginBottom: "20px", color: "#333" }}>
        Unblock Timer
      </h2>
      {!timerRunning ? (
        <div>
          {[5, 10].map((time) => (
            <button
              key={time}
              style={{
                padding: "12px 20px",
                margin: "5px",
                backgroundColor: "#007AFF",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "16px",
                transition: "background-color 0.3s",
              }}
              onClick={() => startTimer(time)}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#005FCA")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#007AFF")
              }
            >
              {time} Minutes
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <svg
            width="120"
            height="120"
            viewBox="0 0 100 100"
            style={{ marginBottom: "20px" }}
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#E0E0E0"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="#007AFF"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={calculateStrokeDashoffset()}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontSize="18"
              fill="#007AFF"
              fontWeight="bold"
            >
              {Math.floor(countdown! / 60)}:
              {String(countdown! % 60).padStart(2, "0")}
            </text>
          </svg>
        </div>
      )}

      <div style={{ marginTop: "30px", textAlign: "left" }}>
        <p style={{ fontSize: "14px", color: "#555", marginBottom: "15px" }}>
          Struggling with gambling? <strong>Birches Health</strong> provides
          expert, confidential care to help you regain control. Get started
          today:
        </p>
        <button
          style={{
            padding: "12px 20px",
            backgroundColor: "#007AFF",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "10px",
            fontSize: "16px",
            transition: "background-color 0.3s",
          }}
          onClick={() => window.open("https://bircheshealth.com/appointments")}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#005FCA")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#007AFF")
          }
        >
          Book an Appointment
        </button>
        <button
          style={{
            padding: "12px 20px",
            backgroundColor: "#34C759",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            marginBottom: "10px",
            fontSize: "16px",
            transition: "background-color 0.3s",
          }}
          onClick={() => window.open("https://bircheshealth.com/self-test")}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#28A745")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#34C759")
          }
        >
          Take a Gambling Self-Test
        </button>
        <button
          style={{
            padding: "12px 20px",
            backgroundColor: "#FF9500",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "16px",
            transition: "background-color 0.3s",
          }}
          onClick={() =>
            window.open("https://bircheshealth.com/family-support")
          }
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#CC7A00")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#FF9500")
          }
        >
          Support for Partners & Family
        </button>
      </div>
    </div>
  );
};

const root = document.createElement("div");
document.body.appendChild(root);

const rootElement = createRoot(root);
rootElement.render(<Popup />);

export default Popup;
