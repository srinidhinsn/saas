// Backend base URL with plural /reports prefix
const baseURL = "http://localhost:8002/saas";

async function generateReport() {
  const clientId = document.getElementById("clientId").value;
  const token = document.getElementById("accessToken").value;
  const range = document.getElementById("dateRange").value;

  if (!clientId || !token) {
    alert("Please enter both Client ID and Access Token");
    return;
  }

  const url = `${baseURL}/${clientId}/reports/orders${range ? `?date_range=${range}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to generate report: ${err}`);
    }

    const blob = await res.blob();
    const link = document.createElement("a");
    const downloadURL = window.URL.createObjectURL(blob);
    link.href = downloadURL;
    link.download = `order_report_${clientId}_${range || 'all'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    alert("✅ Report downloaded!");
  } catch (err) {
    alert(err.message);
  }
}

async function loadDashboard() {
  const clientId = document.getElementById("clientId").value;
  const token = document.getElementById("accessToken").value;

  if (!clientId || !token) return;

  try {
    const res = await fetch(`${baseURL}/${clientId}/reports/dashboard`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!res.ok) throw new Error("Dashboard fetch failed");

    const data = await res.json();

    document.getElementById("totalOrders").textContent = data.data.total_orders ?? "-";
    document.getElementById("todayOrders").textContent = data.data.today_orders ?? "-";
    document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();
  } catch (err) {
    console.error("Dashboard error:", err.message);
  }
}

// Auto-refresh every 60 seconds
setInterval(loadDashboard, 60000);
setTimeout(loadDashboard, 1000);
