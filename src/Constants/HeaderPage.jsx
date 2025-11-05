import React, { useState, useEffect, useRef } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import { HiOutlineSun } from "react-icons/hi";
import { PiMoonThin } from "react-icons/pi";
import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
import { useNavigate, useParams } from "react-router-dom";
import ClickSpark from "../Sub_Components/SparkArrow";
import { MdKeyboardDoubleArrowRight } from "react-icons/md";

const HeaderBar = ({ screenId,selectedRealm,setSelectedRealm }) => {
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const clickTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");
  const [tokenAvailable, setTokenAvailable] = useState(!!token);

  const [realms, setRealms] = useState([]);

  useEffect(() => {
    if (!token || !clientId || screenId !== "user_v3") return;

    const realmId = "realm";

    fetch(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/realms?realm=${realmId}&client_id=${clientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        // Updated to handle ResponseModel structure
        const realmsData = data?.data?.realms || [];
        setRealms(realmsData);
        if (realmsData.length > 0) {
          setSelectedRealm(realmsData[0]);
        }
      })
      .catch((err) => {
        console.error("Failed to load realms:", err);
      });
  }, [clientId, token, screenId, setSelectedRealm]);

  // ✅ Token monitoring
  useEffect(() => {
    const checkToken = () => {
      const newToken = localStorage.getItem("access_token");
      setTokenAvailable(!!newToken);
      if (!newToken) navigate("/login");
    };

    checkToken();
    window.addEventListener("storage", checkToken);
    return () => window.removeEventListener("storage", checkToken);
  }, [navigate]);

  // ✅ Order notifications
  useEffect(() => {
    const onOrderCollect = (e) => {
      const { tableName } = e.detail;
      const notification = `Order for ${tableName} is ready!!!`;
      setNotifications((prev) => [notification, ...prev]);
      setShowPopup(true);
    };
    window.addEventListener("orderCollect", onOrderCollect);
    return () => window.removeEventListener("orderCollect", onOrderCollect);
  }, []);

  // ✅ Close popup when clicking outside
  const wrapperRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowPopup(false);
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Handle profile
  const handleImageClick = () => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      fileInputRef.current.click(); // double click → upload
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setShowDropdown((prev) => !prev);
        clickTimeoutRef.current = null;
      }, 250);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) setProfileImage(URL.createObjectURL(file));
  };

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    setTokenAvailable(false);
    setProfileImage(null);
    navigate(`/saas/${clientId}/login`);
  };

  const notificationsPage = () => navigate(`/saas/${clientId}/main/all-notifications`);
  const addUserDetails = () => navigate(`/saas/${clientId}/main/user-details`);

  return (
    <div className="header-bar-container" ref={wrapperRef}>
      <div className="header-bar">
        <div className="Left-Side-bar">
          <h5>{clientId}</h5>

          {/* ✅ Realm section only visible for NavbarC (user_v3) */}
          {screenId === "user_v3" && (
            <div className="realm-list">
              {/* Desktop buttons */}
              <div className="realm-buttons">
                <button
                  className={`realm-button ${selectedRealm === "" ? "active" : ""}`}
                  onClick={() => {
                    setSelectedRealm(""); // React state update
                    localStorage.setItem("selected_realm", "");
                  }}
                >
                  All
                </button>
                {realms.map((r) => (
                  <button
                    key={r}
                    className={`realm-button ${selectedRealm === r ? "active" : ""}`}
                    onClick={() => {
                      setSelectedRealm(r); // React state update
                      localStorage.setItem("selected_realm", r);
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Mobile dropdown */}
              <div className="realm-dropdown-wrapper">
                <select
                  className="realm-dropdown"
                  value={selectedRealm}
                  onChange={(e) => {
                    setSelectedRealm(e.target.value); // React state update
                    localStorage.setItem("selected_realm", e.target.value);
                  }}
                >
                  <option value="">All</option>
                  {realms.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ✅ Right Side Header */}
        <div className="Right-Side-Header">
          <ClickSpark>
            <div className="left">
              <button
                onClick={() => setShowPopup((p) => !p)}
                className={`icon-button ${showPopup ? "shake" : ""}`}
              >
                <FaBell />
                {showPopup && (
                  <div className="notification-popup">
                    {notifications.length ? (
                      notifications.map((note, idx) => (
                        <div key={idx} className="notification-item">
                          {note}
                        </div>
                      ))
                    ) : (
                      <div className="no-notification">No notifications</div>
                    )}
                    <hr />
                    <a href="#" onClick={notificationsPage}>
                      show all notifications{" "}
                      <MdKeyboardDoubleArrowRight className="Right-Arrow-Icon" />
                    </a>
                  </div>
                )}
              </button>
            </div>
          </ClickSpark>

          <ClickSpark>
            <div className="middle">
              <span
                onClick={toggleTheme}
                style={{ cursor: "pointer" }}
                className="theme-toggle-button"
              >
                {darkMode ? <PiMoonThin /> : <HiOutlineSun />}
              </span>
            </div>
          </ClickSpark>

          <ClickSpark>
            <div className="right" style={{ cursor: "pointer" }}>
              {tokenAvailable ? (
                <div className="profile-container">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    style={{ display: "none" }}
                  />
                  <div onClick={handleImageClick} className="profile-image-wrapper">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="profile-image" />
                    ) : (
                      <FaUserCircle className="profile-placeholder-icon" />
                    )}
                  </div>
                  {showDropdown && (
                    <div className="dropdown-menu">
                      <div className="dropdown-item" onClick={addUserDetails}>
                        Add Details
                      </div>
                      <div className="dropdown-item" onClick={handleSignOut}>
                        Sign Out
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button onClick={addUserDetails}>Add Details</button>
                  <button onClick={handleSignOut}>Sign Out</button>
                </>
              )}
            </div>
          </ClickSpark>
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;
