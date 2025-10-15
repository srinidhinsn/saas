import React, { useState, useEffect, useRef } from "react";
import { FaBell, FaUserCircle } from "react-icons/fa";
import { HiOutlineSun } from "react-icons/hi";
import { PiMoonThin } from "react-icons/pi";
import { useTheme } from "../ThemeChangerComponent/ThemeProvider";
import { useNavigate } from "react-router-dom";
import ClickSpark from "../Sub_Components/SparkArrow";
import { MdKeyboardDoubleArrowRight } from "react-icons/md";
import { useLocation } from "react-router-dom";
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
    const location = useLocation();
const clientId = location.pathname.split("/")[2]; 
    const token = localStorage.getItem("access_token");
    const [tokenAvailable, setTokenAvailable] = useState(!!token);

    const addNotification = (message) => {
        setNotifications((prev) => [message, ...prev]); 
        setShowBellShaking(true); 
        setShowPopup(true); 
    };
 useEffect(() => {
        const checkToken = () => {
            const newToken = localStorage.getItem("access_token");
            setTokenAvailable(!!newToken);
            if (!newToken) {
                navigate("/login");
            }
        };

        checkToken();
        window.addEventListener("storage", checkToken);

        return () => window.removeEventListener("storage", checkToken);
    }, [navigate]);

    // Add event listener for custom 'orderCollect' events for real-time notification
    useEffect(() => {
        const onOrderCollect = (e) => {
            const { tableName, orderId } = e.detail;
            const message = `Order ${orderId} is ready for collection at ${tableName}`;
            const notification = `Order for ${tableName} is ready!!!`
            addNotification(notification);
        };

        window.addEventListener("orderCollect", onOrderCollect);

        return () => {
            window.removeEventListener("orderCollect", onOrderCollect);
        };
    }, []);

    const handleImageClick = () => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            fileInputRef.current.click(); // Double click
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                setShowDropdown((prev) => !prev); // Single click toggle
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
    
        // clientId dynamically fetched from URL
        const dynamicClientId = location.pathname.split("/")[2];
        navigate(`/saas/${dynamicClientId}/login`);
    };
    

    function notificationsPage() {
        navigate(`/saas/${clientId}/main/all-notifications`);
    }
    function addUserDetails() {
        navigate(`/saas/${clientId}/main/user-details`)
    }
    return (
        <div className="header-bar-container">
            <div className="header-bar">
                <div className="Left-Side-bar">
                    <h5>Saas Application</h5>
                </div>

                <div className="Right-Side-Header">
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
                                                <div key={idx} className="notification-item">
                                                    {note}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-notification">No notifications</div>
                                        )}
                                        <hr />
                                        <a href="#" onClick={notificationsPage}>show all notifications <MdKeyboardDoubleArrowRight className="Right-Arrow-Icon" /> </a>
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
                                            <div className="dropdown-item" onClick={addUserDetails}>Add Details</div>
                                            <div onClick={handleSignOut} className="dropdown-item">
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
