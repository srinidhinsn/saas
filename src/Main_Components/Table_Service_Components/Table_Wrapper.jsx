import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from 'axios';
import TableManagement from "./TableManagement";
import TableManagementWaiter from "./Waiter_table";

const TableManagementWrapper = () => {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");
  const [screenId, setScreenId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScreen = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_TABLE_SERVICE_URL}/${clientId}/tables/read`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = res.data;
        setScreenId(result.screen_id); // fetching the screenid here
      } catch (error) {
        console.error("❌ Error fetching screen:", error);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) fetchScreen();
  }, [clientId, token]);

  if (loading) return <div>Loading...</div>;

  switch (screenId) {
    case "default_tables":
      return <TableManagement />;
    case "waiter_table":
      return <TableManagementWaiter />;
    default:
      return <TableManagement />;
  }
};

export default TableManagementWrapper;
