import React, { useEffect, useState } from 'react';
import './Hero.css';
import { CiSearch } from "react-icons/ci";
import PieCharts from './PieChart';
import MyLineChart from './LineChart';
import WeeklyOverviewChart from './BarChart';
import SalesDistribution from './SalesDistribution';
import { useNavigate } from 'react-router-dom';
import DineInPage from '../DineInPage';
import axios from 'axios';

function Hero({ selectedPage }) {
    const clientId = localStorage.getItem("clientId");
    const navigate = useNavigate();

    // State to store total orders
    const [totalOrders, setTotalOrders] = useState(0);

    // Fetch total orders count
    useEffect(() => {
        if (!clientId) return;

        axios.get(`http://localhost:8000/api/v1/${clientId}/orders/count`)
            .then(res => setTotalOrders(res.data.total_orders))
            .catch(err => {
                console.error("Error fetching order count", err);
                setTotalOrders(0);
            });

    }, [clientId]);

    return (
        <>
            <div className='heroComp'>

                {selectedPage === "dashboard" && (
                    <>
                        <div className='order'>
                            <div className="orders">
                                <p>Total Orders</p>
                                <p>{totalOrders}</p>
                            </div>
                            <div className="orders">
                                <p>Total Customers</p>
                                <p>220</p>
                            </div>
                            <div className="orders">
                                <p>Total Revenues</p>
                                <p>42000</p>
                            </div>
                        </div>

                        <div className="statistics">
                            <div className='Revenues' >
                                <div className="revenue-map">
                                    <div className='rev-rev'>
                                        <h5 className='total'>Total Revenue</h5>
                                        <p className='total'>Rs.54321</p>
                                        <div className='total'>
                                            Last 6 months
                                        </div>
                                    </div>
                                    <div className='Income'>
                                        <div>Income</div>
                                        <div>Expense</div>
                                    </div>
                                    <div className='Chart'>
                                        <MyLineChart />
                                    </div>
                                </div>

                                <div className="cate">
                                    <div className="category-top">
                                        <div className="Category"><p>Top Categories</p>
                                            <span>This month</span></div>
                                        <div className='PieChart'><PieCharts /></div>
                                    </div>
                                </div>
                            </div>

                            <div className='Revenues Revenues-map' >
                                <div className="revenue-maps">
                                    <div >
                                        <div className='order-rev' >
                                            <div>
                                                <h5>Orders Overview</h5>
                                            </div>
                                            <div>
                                                <span>This week</span>
                                            </div>
                                        </div>
                                        <div className='weekly-overview'>
                                            <WeeklyOverviewChart />
                                        </div>
                                    </div>
                                </div>

                                <div className="cate">
                                    <div className="category-tops">
                                        <div className="">
                                            <div className="Sales"><p >Order Review</p>
                                            </div>
                                        </div>

                                        <SalesDistribution />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {selectedPage === "menu" && <MenuPage clientId={clientId} />}
                {selectedPage === "kitchen" && <KitchenDisplay clientId={clientId} />}
                {selectedPage === "dinein" && <DineInPage />}
            </div >

        </>
    );
}

export default Hero;
