import React, { useState, useEffect } from "react";
import "fontsource-roboto";
import { createRoot } from "react-dom/client";
import "./popup.css";

const Popup = () => {
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  // Fetch the list of blocked sites from the background script
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getBlockedSites" }, (response) => {
      if (response && response.blockedSites) {
        setBlockedSites(response.blockedSites); // Update state with blocked sites
      }
    });

    // Fetch timer expiration from local storage
    chrome.storage.local.get(["timerExpiration"], (result) => {
      const currentTime = Date.now();
      const timerExpiration = result.timerExpiration || 0;

      if (timerExpiration > currentTime) {
        const remainingTime = Math.floor(
          (timerExpiration - currentTime) / 1000
        );
        setCountdown(remainingTime);
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
    setCountdown(seconds);
    setTimerRunning(true);
    chrome.runtime.sendMessage({ action: "startTimer", duration: seconds });
  };

  return (
    <div style={{ padding: "10px", fontFamily: "Arial, sans-serif" }}>
      <h1>Birches Health Resources</h1>

      <h2>Unblock Timer</h2>
      {!timerRunning ? (
        <div>
          {[10, 20, 30, 60].map((time) => (
            <button
              key={time}
              style={{
                padding: "10px",
                margin: "5px",
                backgroundColor: "#007BFF",
                color: "#fff",
                border: "none",
                cursor: "pointer",
              }}
              onClick={() => startTimer(time)}
            >
              {time} Minutes
            </button>
          ))}
        </div>
      ) : (
        <div>
          <h3>
            Time Remaining: {Math.floor(countdown! / 60)}:
            {String(countdown! % 60).padStart(2, "0")}
          </h3>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        <button
          style={{
            padding: "10px",
            backgroundColor: "#007BFF",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            marginBottom: "10px",
          }}
          onClick={() => window.open("https://bircheshealth.com/appointments")}
        >
          Book an Appointment
        </button>
        <button
          style={{
            padding: "10px",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            marginBottom: "10px",
          }}
          onClick={() => window.open("https://bircheshealth.com/self-test")}
        >
          Take a Gambling Self-Test
        </button>
        <button
          style={{
            padding: "10px",
            backgroundColor: "#ffc107",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
          onClick={() =>
            window.open("https://bircheshealth.com/family-support")
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
