import React from "react";
import Navbar from "../navbar/Navbar";
import Hero from "./Hero";
import { useState } from "react";

function Dashboard(){
    const [selectedPage, setSelectedPage] = useState("dashboard");
    return(
        <>
        <div  className={`Components ${selectedPage === "dashboard" ? "dashboard-layout" : ""}`}>
                
                <div className="main-wrapper">

                  <div className="Secondary-components">
                    <Hero selectedPage={selectedPage} />
                    {/* {selectedPage === "dashboard" && (
                      <div className="Footer-component"><Footer /></div>
                    )} */}
                  </div>
                </div>
              </div>

        </>
    )
}

export default Dashboard