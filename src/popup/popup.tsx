import React, { useState, useEffect } from "react";
import "fontsource-roboto";
import { createRoot } from "react-dom/client";
import "./popup.css";

const Popup = () => {
  const [blockedSites, setBlockedSites] = useState<string[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [unblockCount, setUnblockCount] = useState<number>(0);
  const [unblockCode, setUnblockCode] = useState<string>("");
  const maxUnblocks = 3;
  const [notificationMessage, setNotificationMessage] = useState<string | null>(
    null
  );
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | null
  >(null);
  const [cooldownExpiration, setCooldownExpiration] = useState<number | null>(
    null
  );
  const [cooldownCountdown, setCooldownCountdown] = useState<number | null>(
    null
  );

  // Fetch the list of blocked sites and other data from local storage
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getBlockedSites" }, (response) => {
      if (response && response.blockedSites) {
        setBlockedSites(response.blockedSites); // Update state with blocked sites
      }
    });

    // Fetch timer expiration, total duration, unblock count, and cooldown expiration from local storage
    chrome.storage.local.get(
      [
        "timerExpiration",
        "totalTime",
        "unblockCount",
        "unblockResetTime",
        "cooldownExpiration",
      ],
      (result) => {
        const currentTime = Date.now();
        const timerExpiration = result.timerExpiration || 0;
        const storedTotalTime = result.totalTime || null;
        const storedUnblockCount = result.unblockCount || 0;
        const unblockResetTime = result.unblockResetTime || 0;
        const storedCooldownExpiration = result.cooldownExpiration || 0;

        // Reset unblock count if 24 hours have passed
        if (currentTime > unblockResetTime) {
          chrome.storage.local.set({
            unblockCount: 0,
            unblockResetTime: currentTime + 24 * 60 * 60 * 1000,
          });
          setUnblockCount(0);
        } else {
          setUnblockCount(storedUnblockCount);
        }

        if (timerExpiration > currentTime) {
          const remainingTime = Math.floor(
            (timerExpiration - currentTime) / 1000
          );
          setCountdown(remainingTime);
          setTotalTime(storedTotalTime);
          setTimerRunning(true);
        }

        if (storedCooldownExpiration > currentTime) {
          setCooldownExpiration(storedCooldownExpiration);
          setCooldownCountdown(
            Math.floor((storedCooldownExpiration - currentTime) / 1000)
          );
        }
      }
    );
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

  // Handle cooldown countdown updates
  useEffect(() => {
    let cooldownTimer: NodeJS.Timeout;
    if (cooldownCountdown !== null && cooldownCountdown > 0) {
      cooldownTimer = setTimeout(
        () => setCooldownCountdown((prev) => (prev ? prev - 1 : 0)),
        1000
      );
    } else if (cooldownCountdown === 0) {
      setCooldownExpiration(null);
      chrome.storage.local.remove("cooldownExpiration");
    }
    return () => clearTimeout(cooldownTimer);
  }, [cooldownCountdown]);

  const showNotification = (
    message: string,
    type: "success" | "error",
    timeout: number = 3000
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setTimeout(() => {
      setNotificationMessage(null);
      setNotificationType(null);
    }, timeout);
  };

  const startTimer = (minutes: number, isPaid: boolean = false) => {
    if (!isPaid && unblockCount >= maxUnblocks) return; // Prevent free unblock if max is reached

    const seconds = minutes * 60;
    const expirationTime = Date.now() + seconds * 1000;

    setCountdown(seconds);
    setTotalTime(seconds);
    setTimerRunning(true);

    if (!isPaid) {
      // Only increment the unblock count for free unblocks
      const newUnblockCount = unblockCount + 1;
      setUnblockCount(newUnblockCount);

      chrome.storage.local.set({
        unblockCount: newUnblockCount,
      });
    }

    chrome.runtime.sendMessage({ action: "startTimer", duration: seconds });
    chrome.storage.local.set({
      timerExpiration: expirationTime,
      totalTime: seconds,
    });

    // Set/reset unblock reset time if it’s the first unblock of the day
    chrome.storage.local.get(["unblockResetTime"], (result) => {
      if (!result.unblockResetTime) {
        chrome.storage.local.set({
          unblockResetTime: Date.now() + 24 * 60 * 60 * 1000,
        });
      }
    });
  };

  const validatePaidUnblockCode = async () => {
    const currentTime = Date.now();
    if (cooldownExpiration && currentTime < cooldownExpiration) {
      showNotification(
        "Please wait until the cooldown period is over.",
        "error",
        5000
      );
      return;
    }

    try {
      // Fetch the current list of codes
      const response = await fetch(
        "https://api.sheetbest.com/sheets/ef14d1b6-72df-47a9-8be8-9046b19cfa87"
      );
      const data = await response.json();

      // Check if the entered code is valid and not already used
      const codeEntry = data.find(
        (entry: { Code: string; isUsed: string }) =>
          entry.Code === unblockCode && entry.isUsed === "FALSE"
      );

      if (codeEntry) {
        // Start the unblock timer for 30 minutes (paid unblock)
        startTimer(30, true);

        // Set cooldown expiration time to 5 hours from now
        const newCooldownExpiration = currentTime + 5 * 60 * 60 * 1000;
        setCooldownExpiration(newCooldownExpiration);
        setCooldownCountdown(5 * 60 * 60); // Set cooldown countdown to 5 hours
        chrome.storage.local.set({ cooldownExpiration: newCooldownExpiration });

        // Update the code's status to "used"
        await fetch(
          `https://api.sheetbest.com/sheets/ef14d1b6-72df-47a9-8be8-9046b19cfa87/Code/${unblockCode}`,
          {
            method: "PATCH",
            mode: "cors",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Code: unblockCode,
              isUsed: "TRUE",
            }),
          }
        );

        setUnblockCode(""); // Clear the input field
        showNotification(
          "Paid unblock code applied successfully!",
          "success",
          5000
        );
      } else {
        showNotification("Invalid or already used code.", "error", 5000);
      }
    } catch (error) {
      console.error("Error validating paid unblock code:", error);
      showNotification(
        "Failed to validate code. Please try again.",
        "error",
        5000
      );
    }
  };

  const calculateStrokeDashoffset = () => {
    if (countdown === null || totalTime === null) return 0;
    const percentage = countdown / totalTime;
    const circumference = 2 * Math.PI * 45; // Radius is 45
    return circumference * (1 - percentage);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
  };

  return (
    <div
      style={{
        padding: "20px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        textAlign: "center",
        backgroundColor: "#f5eded",
        borderRadius: "12px",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.1)",
        maxWidth: "400px",
        margin: "20px auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          position: "absolute",
          top: "20px",
          left: "10px",
        }}
      >
        <img
          src="https://i.ibb.co/ZWHMsct/hand.png"
          alt="logo"
          style={{ width: "24px", height: "24px", marginRight: "8px" }}
        />
        <span style={{ fontSize: "10px", color: "#333", fontWeight: "bold" }}>
          The Bet Blocker
        </span>
      </div>

      <h2 style={{ fontSize: "12px", marginBottom: "20px", color: "#333" }}>
        Stay in control by limiting access to gambling sites.{" "}
        <a
          href="https://docs.google.com/document/d/1OPNpl-iGCarB77_h4sUenV_4Pyf_Yvn3_R_xmqnGRuc/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#d72323", textDecoration: "none" }}
        >
          View Blocked Gambling Sites
        </a>
      </h2>

      <p style={{ fontSize: "14px", color: "#555", marginBottom: "10px" }}>
        Free unblocks remaining today:{" "}
        <strong>{maxUnblocks - unblockCount}</strong>/{maxUnblocks}
      </p>

      {!timerRunning ? (
        <div>
          <button
            style={{
              padding: "12px 20px",
              margin: "5px",
              backgroundColor: unblockCount >= maxUnblocks ? "#ccc" : "#d72323",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: unblockCount >= maxUnblocks ? "not-allowed" : "pointer",
              fontSize: "16px",
              transition: "background-color 0.3s",
            }}
            onClick={() => startTimer(5)}
            disabled={unblockCount >= maxUnblocks}
          >
            Free 5 Minutes Unblock
          </button>

          {/* Paid Unblock UI */}
          <div style={{ marginTop: "20px" }}>
            <h3 style={{ fontSize: "14px", marginBottom: "10px" }}>
              Paid Unblock (30 Minutes)
            </h3>
            <input
              type="text"
              value={unblockCode}
              onChange={(e) => setUnblockCode(e.target.value)}
              placeholder="Enter paid code"
              style={{
                padding: "10px",
                width: "80%",
                border: "1px solid #ccc",
                borderRadius: "8px",
                marginBottom: "10px",
              }}
              disabled={cooldownCountdown !== null && cooldownCountdown > 0}
            />
            <button
              style={{
                padding: "12px 20px",
                backgroundColor: "#d72323",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onClick={validatePaidUnblockCode}
              disabled={cooldownCountdown !== null && cooldownCountdown > 0}
            >
              Apply Code
            </button>
            {cooldownCountdown !== null && cooldownCountdown > 0 && (
              <p style={{ color: "#d72323", marginTop: "10px" }}>
                You are currently in a cooldown period. You can apply for a paid
                unblock after: {formatTime(cooldownCountdown)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <svg width="120" height="120" viewBox="0 0 100 100">
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
              stroke="#d72323"
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
              fill="#d72323"
              fontWeight="bold"
            >
              {Math.floor(countdown! / 60)}:
              {String(countdown! % 60).padStart(2, "0")}
            </text>
          </svg>
        </div>
      )}

      <div
        id="notification"
        style={{
          marginBottom: "10px",
          padding: "10px",
          color: notificationType === "success" ? "#004400" : "#ff0000",
          backgroundColor:
            notificationType === "success" ? "#ccffcc" : "#ffe5e5",
          border: `1px solid ${
            notificationType === "success" ? "#004400" : "#a00"
          }`,
          borderRadius: "5px",
          fontSize: "14px",
          display: notificationMessage ? "block" : "none",
        }}
      >
        {notificationMessage}
      </div>

      <div
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "14px",
        }}
      >
        {/* <a
          href="https://ko-fi.com/sureodds"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#007AFF", textDecoration: "none" }}
        >
          Donate
        </a> */}
        <a
          href="https://buy.stripe.com/fZeeYn4zyc9E5jy8ww"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#d72323", textDecoration: "none" }}
        >
          Purchase 30 Min Unblock ($5)
        </a>
      </div>
    </div>
  );
};

const root = document.createElement("div");
document.body.appendChild(root);

const rootElement = createRoot(root);
rootElement.render(<Popup />);

export default Popup;
