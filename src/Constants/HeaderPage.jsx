import React, { useState, useEffect, useRef } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import { HiOutlineSun } from "react-icons/hi";
import { PiMoonThin } from "react-icons/pi";
import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
import { useNavigate } from "react-router-dom";
import ClickSpark from "../Sub_Components/SparkArrow";

const HeaderBar = () => {
    const [notifications, setNotifications] = useState([]);
    const [showPopup, setShowPopup] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [profileImage, setProfileImage] = useState(null);
    const fileInputRef = useRef(null);
    const clickTimeoutRef = useRef(null);
    const navigate = useNavigate();
    const [showBellShaking, setShowBellShaking] = useState(false);

    const { darkMode, toggleTheme } = useTheme();

    const token = localStorage.getItem("access_token");
    const [tokenAvailable, setTokenAvailable] = useState(!!token);
    const addNotification = (message) => {
        setNotifications(prev => [message, ...prev]); // newest on top
        setShowBellShaking(true); // trigger bell shake
    };

    useEffect(() => {
        setNotifications([
            "Order #1001 created",
            "Order #1001 served",
            "User logged in",
            "User logged out",
        ]);
    }, []);

    useEffect(() => {
        const checkToken = () => {
            const newToken = localStorage.getItem("access_token");
            setTokenAvailable(!!newToken);
            if (!newToken) {
                navigate("/login");
            }
        };

        checkToken(); // On load
        window.addEventListener("storage", checkToken);

        return () => window.removeEventListener("storage", checkToken);
    }, [navigate]);

    const handleImageClick = () => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            fileInputRef.current.click(); // Double click
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                setShowDropdown(prev => !prev); // Single click
                clickTimeoutRef.current = null;
            }, 250);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImage(URL.createObjectURL(file));
        }
    };

    const handleSignOut = () => {
        localStorage.removeItem("access_token");
        setTokenAvailable(false);
        setProfileImage(null);
        navigate("/login");
    };

    return (
        <div className="header-bar-container">
            <div className="header-bar">
                <div className="Left-Side-bar">
                    <h5>Saas Application</h5>
                </div>

                <div className="Right-Side-Header">
                    {/* Notifications */}
                    <ClickSpark>
                        <div className="left">

                            <button
                                onClick={() => {
                                    setShowPopup(!showPopup);
                                    setShowBellShaking(false);
                                }}
                                className={`icon-button ${showBellShaking ? "shake" : ""}`}
                            >
                                <FaBell />
                                {showPopup && (
                                    <div className="notification-popup">
                                        {notifications.length ? (
                                            notifications.map((note, idx) => (
                                                <div key={idx} className="notification-item">{note}</div>
                                            ))
                                        ) : (
                                            <div>No notifications</div>
                                        )}
                                    </div>
                                )}
                            </button>



                        </div>
                    </ClickSpark>
                    {/* Theme Toggle */}

                    <ClickSpark>
                        <div className="middle">
                            <span onClick={toggleTheme} style={{ cursor: 'pointer' }} className="theme-toggle-button">
                                {darkMode ? <PiMoonThin /> : <HiOutlineSun />}
                            </span>
                        </div>
                    </ClickSpark>
                    {/* Profile */}
                    <ClickSpark>
                        <div className="right" style={{ cursor: 'pointer' }}>
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
                                            <div onClick={handleSignOut} className="dropdown-item">Sign Out</div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button onClick={handleSignOut}>Sign Out</button>
                            )}
                        </div>
                    </ClickSpark>

                </div>
            </div>
        </div>
    );
};

export default HeaderBar;
