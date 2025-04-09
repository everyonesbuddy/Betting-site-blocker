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
  const maxUnblocks = 3;
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
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "14px",
        }}
      >
        <a
          href="https://ko-fi.com/sureodds"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#007AFF", textDecoration: "none" }}
        >
          Donate
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
