import React from 'react'
import './Navbar.css'
import { MdOutlineDashboardCustomize } from "react-icons/md";
import { FaBorderStyle } from "react-icons/fa";
// import { VscLayoutMenubar } from "react-icons/vsc";

const Navbar = ({ setSelectedPage }) => {

    return (
        <>
            <div className='navbar'>
                <div className="" style={{ display: 'flex', }}>
                    <h2 className='header'>MY POS</h2>
                </div>

                <div className=''>
                    <div className="sidebar-container">
                        <div onClick={() => setSelectedPage("dashboard")} className="icons" >
                            <button>DashBoard</button>
                        </div>
                        <div className="icons" onClick={() => setSelectedPage("dinein")}>
                            <button>Dine In</button>
                        </div>
                        {/* 
                        <div className="icons" onClick={() => setSelectedPage("menu")}>
                            <VscLayoutMenubar /> <h5>Menu</h5></div>

                        <div className="icons" onClick={() => setSelectedPage("managing")}>
                            <VscLayoutMenubar /> <h5>Management</h5></div>
                        <div className="icons" onClick={() => setSelectedPage("tables-view")}>
                            <VscLayoutMenubar /> <h5>Table-View</h5></div>
                        <div className="icons" onClick={() => setSelectedPage("kitchen")}>
                            <VscLayoutMenubar /> <h5>Kitchen</h5></div>
                        <div className="icons" onClick={() => setSelectedPage("combo-manager")}>
                            <VscLayoutMenubar /> <h5>Combo</h5></div> */}

                    </div>


                </div>
            </div >
        </>
    )
}

export default Navbar