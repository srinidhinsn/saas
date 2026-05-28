import os
import time
import base64
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

from util import setup_driver


class OrderFlowAutomation:

    def __init__(self):

        self.driver = setup_driver()
        self.wait = WebDriverWait(self.driver, 20)
        self.base_url = "http://saas.networkspecialist.in:8007/saas/foodyscafe/login"

        # REPORT TRACKING
        self.report_steps = []
        self.test_start_time = datetime.now()


    # ---------------------------------------
    # REPORT HELPER
    # ---------------------------------------

    def _record_step(self, step_name, status, screenshot_path=None, error=None, duration=None):
        self.report_steps.append({
            "step": step_name,
            "status": status,           # "PASS" | "FAIL"
            "screenshot": screenshot_path,
            "error": error or "",
            "duration": f"{duration:.2f}s" if duration is not None else "—",
            "time": datetime.now().strftime("%H:%M:%S"),
        })


    # ---------------------------------------
    # SCREENSHOT HELPER
    # ---------------------------------------

    def take_screenshot(self, name):
        folder = "screenshots"
        if not os.path.exists(folder):
            os.makedirs(folder)
        filename = f"{folder}/{name}.png"
        self.driver.save_screenshot(filename)
        print(f"📸 Screenshot Saved: {filename}")
        return filename


    # ---------------------------------------
    # LOGIN
    # ---------------------------------------

    def login(self):
        print("🚀 Opening Login Page")
        t0 = time.time()
        try:
            self.driver.get(self.base_url)
            username = self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='text']")))
            username.clear()
            username.send_keys("foodyscafe")
            password = self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='password']")))
            password.clear()
            password.send_keys("admin")
            self.take_screenshot("1 login_password_entered")
            login_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'LOGIN') or contains(text(),'Login')]")))
            login_btn.click()
            self.wait.until(EC.url_contains("/home"))
            ss = self.take_screenshot("2 login_success_home")
            print("✅ Login Successful")
            self._record_step("Login", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("login_failure")
            self._record_step("Login", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # NAVIGATE TO ORDER PAGE
    # ---------------------------------------

    def navigate_to_order_page(self):
        print("🧾 Navigating To Order Page")
        t0 = time.time()
        try:
            order_page_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'Order') or contains(text(),'Dine In')]")))
            order_page_btn.click()
            ss = self.take_screenshot("3 order_page_opened")
            print("✅ Order Page Opened")
            self._record_step("Navigate to Order Page", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("order_page_failure")
            self._record_step("Navigate to Order Page", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # SELECT TABLE
    # ---------------------------------------

    def select_table(self):
        print("🪑 Selecting Table")
        t0 = time.time()
        try:
            table = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//span[contains(text(),'A01')]")))
            table.click()
            ss = self.take_screenshot("4 table_selected")
            print("✅ Table Selected")
            self._record_step("Select Table (A01)", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("table_failure")
            self._record_step("Select Table (A01)", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # SELECT MENU ITEMS
    # ---------------------------------------

    def select_menu_items(self):
        print("🍽️ Selecting Menu Items")
        t0 = time.time()
        try:
            dosa_item = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'Dosa')]")))
            dosa_item.click()
            idly_item = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'Idly')]")))
            idly_item.click()
            ss = self.take_screenshot("5 items_added_to_cart")
            print("✅ Items Added To Cart")
            self._record_step("Select Menu Items (Dosa + Idly)", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("menu_failure")
            self._record_step("Select Menu Items (Dosa + Idly)", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # PLACE ORDER
    # ---------------------------------------

    def place_order(self):
        print("📤 Placing Order")
        t0 = time.time()
        try:
            place_order_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'Place Order')]")))
            self.take_screenshot("6 before_place_order")
            place_order_btn.click()
            ss = self.take_screenshot("7 after_place_order")
            print("✅ Order Submitted")
            self._record_step("Place Order", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("place_order_failure")
            self._record_step("Place Order", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # NAVIGATE TO KDS
    # ---------------------------------------

    def navigate_to_kds(self):
        print("🖥️ Navigating To KDS")
        t0 = time.time()
        try:
            kds_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'KDS')]")))
            kds_btn.click()
            ss = self.take_screenshot("8 kds_page_opened")
            print("✅ KDS Page Opened")
            self._record_step("Navigate to KDS", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("kds_nav_failure")
            self._record_step("Navigate to KDS", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # VERIFY ORDER IN KDS
    # ---------------------------------------

    def verify_order_in_kds(self):
        print("🔍 Verifying Order In KDS")
        t0 = time.time()
        try:
            order_card = self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Dosa')]")))
            assert order_card is not None
            ss = self.take_screenshot("9 kds_order_verified")
            print("🎉 Order Successfully Appeared In KDS")
            self._record_step("Verify Order in KDS", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("kds_verify_failure")
            self._record_step("Verify Order in KDS", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # VERIFY INITIAL STATUS = PENDING
    # ---------------------------------------

    def verify_pending_status(self):
        print("🟡 Verifying Pending Status")
        t0 = time.time()
        try:
            self.wait.until(EC.presence_of_element_located((
                By.XPATH,
                "//span[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'pending')]"
            )))
            ss = self.take_screenshot("10 kds_status_pending")
            print("✅ Pending Status Verified")
            self._record_step("Verify Pending Status", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("pending_status_failure")
            self._record_step("Verify Pending Status", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # MARK ITEMS AS READY
    # ---------------------------------------

    def mark_items_ready(self):
        print("🍳 Marking Items As Ready")
        t0 = time.time()
        try:
            ready_buttons = self.wait.until(EC.presence_of_all_elements_located((By.XPATH, "//button[@title='Mark as Ready']")))
            self.take_screenshot("11 before_mark_ready")
            for button in ready_buttons:
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
                self.driver.execute_script("arguments[0].click();", button)
            ss = self.take_screenshot("12 after_mark_ready")
            print("✅ Items Marked As Ready")
            self._record_step("Mark Items as Ready", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("mark_ready_failure")
            self._record_step("Mark Items as Ready", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # VERIFY ORDER STATUS = READY
    # ---------------------------------------

    def verify_order_ready_status(self):
        print("🟢 Verifying Order Ready Status")
        t0 = time.time()
        try:
            self.wait.until(EC.presence_of_element_located((
                By.XPATH,
                "//*[contains(translate(text(),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'ready')]"
            )))
            ss = self.take_screenshot("13 kds_status_ready")
            print("✅ Order Ready Status Verified")
            self._record_step("Verify Ready Status", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("ready_status_failure")
            self._record_step("Verify Ready Status", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # NAVIGATE BACK TO ORDER PAGE
    # ---------------------------------------

    def navigate_back_to_orders(self):
        print("🔙 Navigating Back To Order Page")
        t0 = time.time()
        try:
            order_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'Order') or contains(text(),'Dine In')]")))
            self.take_screenshot("14 before_navigate_back")
            order_btn.click()
            ss = self.take_screenshot("15 returned_to_order_page")
            print("✅ Returned To Order Page")
            self._record_step("Navigate Back to Orders", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("navigate_back_failure")
            self._record_step("Navigate Back to Orders", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # CLICK SERVED BUTTON
    # ---------------------------------------

    def mark_order_served(self):
        print("🍽️ Marking Order As Served")
        t0 = time.time()
        try:
            served_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(),'Served') or contains(text(),'Mark As Served')]")))
            self.take_screenshot("16 before_mark_served")
            served_btn.click()
            ss = self.take_screenshot("17 after_mark_served")
            print("✅ Order Marked As Served")
            self._record_step("Mark Order as Served", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("served_failure")
            self._record_step("Mark Order as Served", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # OPEN BILL MODAL
    # ---------------------------------------

    def open_bill_modal(self):
        print("🧾 Opening Invoice Modal")
        t0 = time.time()
        try:
            self.wait.until(EC.invisibility_of_element_located((By.XPATH, "//*[contains(text(),'Mark as Served')]")))
            self.wait.until(EC.presence_of_element_located((By.XPATH, "//button[@title='Print Bill']")))
            time.sleep(2)
            print_buttons = self.driver.find_elements(By.XPATH, "//button[@title='Print Bill']")
            visible_buttons = [btn for btn in print_buttons if btn.is_displayed() and btn.is_enabled()]
            print(f"🖨️ Visible Print Buttons: {len(visible_buttons)}")
            if len(visible_buttons) == 0:
                raise Exception("No Visible Print Bill Button Found")
            target_btn = visible_buttons[-1]
            self.driver.execute_script("arguments[0].scrollIntoView({block:'center'});", target_btn)
            time.sleep(1)
            self.take_screenshot("18 before_print_bill_click")
            ActionChains(self.driver).move_to_element(target_btn).pause(1).click(target_btn).perform()
            print("🖱️ Print Bill Button Clicked")
            time.sleep(3)
            self.wait.until(EC.visibility_of_element_located((By.XPATH, "//*[contains(text(),'Invoice') or contains(text(),'Payment') or contains(text(),'Bill')]")))
            ss = self.take_screenshot("19 invoice_modal_opened")
            print("✅ Invoice Modal Opened")
            self._record_step("Open Bill Modal", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("bill_modal_failure")
            self._record_step("Open Bill Modal", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # VERIFY BILL ITEMS
    # ---------------------------------------

    def verify_bill_items(self):
        print("🧾 Verifying Invoice Items")
        t0 = time.time()
        try:
            dosa_item = self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Dosa')]")))
            idly_item = self.wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(),'Idly')]")))
            assert dosa_item is not None
            assert idly_item is not None
            ss = self.take_screenshot("20 invoice_items_verified")
            print("✅ Invoice Items Verified")
            self._record_step("Verify Bill Items", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("verify_items_failure")
            self._record_step("Verify Bill Items", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # FILL CUSTOMER DETAILS IN INVOICE MODAL
    # ---------------------------------------

    def fill_invoice_details(self):
        print("👤 Filling Customer Details")
        t0 = time.time()
        try:
            customer_id = self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[contains(@placeholder,'Customer') or contains(@name,'customer')]")))
            customer_id.clear()
            customer_id.send_keys("CUST1001")
            phone_input = self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[contains(@placeholder,'Phone') or contains(@placeholder,'Mobile') or contains(@name,'phone')]")))
            phone_input.clear()
            phone_input.send_keys("9876543210")
            email_input = self.wait.until(EC.presence_of_element_located((By.XPATH, "//input[contains(@placeholder,'Email') or contains(@name,'email')]")))
            email_input.clear()
            email_input.send_keys("testcustomer@gmail.com")
            ss = self.take_screenshot("21 invoice_customer_details_filled")
            print("✅ Customer Details Filled")
            self._record_step("Fill Invoice Details", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("fill_invoice_failure")
            self._record_step("Fill Invoice Details", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # CLICK PRINT BUTTON
    # ---------------------------------------

    def print_bill(self):
        print("🖨️ Printing Bill")
        t0 = time.time()
        try:
            print_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'Print') or contains(text(),'Save Bill')]")))
            self.take_screenshot("22 before_bill_print")
            ActionChains(self.driver).move_to_element(print_btn).pause(1).click(print_btn).perform()
            time.sleep(3)
            ss = self.take_screenshot("23 after_bill_print")
            print("✅ Bill Printed Successfully")
            self._record_step("Print Bill", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("print_bill_failure")
            self._record_step("Print Bill", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # CLOSE INVOICE MODAL
    # ---------------------------------------

    def close_invoice_modal(self):
        print("❌ Closing Invoice Modal")
        t0 = time.time()
        try:
            self.take_screenshot("24 before_close_modal")
            modals = self.driver.find_elements(By.XPATH, "//*[contains(@class,'modal') or contains(@class,'dialog') or contains(@class,'overlay')]")
            visible_modals = [m for m in modals if m.is_displayed()]
            if not visible_modals:
                print("ℹ️ Modal already closed automatically")
                ss = self.take_screenshot("25 invoice_modal_already_closed")
                self._record_step("Close Invoice Modal", "PASS", ss, duration=time.time() - t0)
                return
            close_xpaths = [
                "//button[contains(text(),'Close')]",
                "//button[contains(text(),'close')]",
                "//button[contains(@class,'close')]",
                "//button[contains(@class,'btn-close')]",
                "//*[@data-dismiss='modal']",
                "//*[@aria-label='Close']",
                "//button[contains(text(),'Cancel')]",
            ]
            for xpath in close_xpaths:
                try:
                    btn = self.driver.find_element(By.XPATH, xpath)
                    if btn.is_displayed() and btn.is_enabled():
                        btn.click()
                        time.sleep(2)
                        ss = self.take_screenshot("25 invoice_modal_closed")
                        print("✅ Invoice Modal Closed")
                        self._record_step("Close Invoice Modal", "PASS", ss, duration=time.time() - t0)
                        return
                except Exception:
                    continue
            from selenium.webdriver.common.keys import Keys
            self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
            time.sleep(2)
            ss = self.take_screenshot("25 invoice_modal_closed_esc")
            print("✅ Invoice Modal Closed via ESC")
            self._record_step("Close Invoice Modal", "PASS", ss, duration=time.time() - t0)
        except Exception as e:
            ss = self.take_screenshot("close_modal_failure")
            self._record_step("Close Invoice Modal", "FAIL", ss, error=str(e), duration=time.time() - t0)
            raise


    # ---------------------------------------
    # GENERATE HTML REPORT
    # ---------------------------------------

    def generate_report(self, overall_status):

        folder = "reports"
        if not os.path.exists(folder):
            os.makedirs(folder)

        timestamp = self.test_start_time.strftime("%Y-%m-%d_%H-%M-%S")
        report_path = f"{folder}/report_{timestamp}.html"

        total    = len(self.report_steps)
        passed   = sum(1 for s in self.report_steps if s["status"] == "PASS")
        failed   = sum(1 for s in self.report_steps if s["status"] == "FAIL")
        duration = (datetime.now() - self.test_start_time).seconds

        status_color = "#16a34a" if overall_status == "PASS" else "#dc2626"
        status_bg    = "#f0fdf4" if overall_status == "PASS" else "#fef2f2"

        rows_html = ""
        for i, step in enumerate(self.report_steps, 1):

            # Embed screenshot as base64 → fully self-contained report file
            img_tag = ""
            if step["screenshot"] and os.path.exists(step["screenshot"]):
                with open(step["screenshot"], "rb") as f:
                    b64 = base64.b64encode(f.read()).decode("utf-8")
                img_id = f"img_{i}"
                img_tag = f"""
                    <div style="margin-top:8px;">
                        <button onclick="toggleImg('{img_id}')"
                            style="font-size:12px;padding:4px 10px;border:1px solid #cbd5e1;
                                   border-radius:6px;cursor:pointer;background:#f8fafc;color:#475569;">
                            📷 View Screenshot
                        </button>
                        <div id="{img_id}" style="display:none;margin-top:8px;">
                            <img src="data:image/png;base64,{b64}"
                                 style="max-width:100%;border:1px solid #e2e8f0;
                                        border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);" />
                        </div>
                    </div>"""

            badge_color = "#16a34a" if step["status"] == "PASS" else "#dc2626"
            badge_bg    = "#dcfce7" if step["status"] == "PASS" else "#fee2e2"
            badge_icon  = "✅" if step["status"] == "PASS" else "❌"

            error_html = ""
            if step["error"]:
                short_err = step["error"][:400] + ("..." if len(step["error"]) > 400 else "")
                error_html = f"""
                    <div style="margin-top:6px;padding:8px 12px;background:#fef2f2;
                                border-left:3px solid #dc2626;border-radius:4px;
                                font-size:12px;color:#991b1b;word-break:break-all;">
                        <strong>Error:</strong> {short_err}
                    </div>"""

            rows_html += f"""
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:14px 16px;color:#64748b;font-size:14px;font-weight:600;">{i}</td>
                <td style="padding:14px 16px;">
                    <div style="font-size:14px;font-weight:600;color:#1e293b;">{step["step"]}</div>
                    {error_html}
                    {img_tag}
                </td>
                <td style="padding:14px 16px;">
                    <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;
                                 border-radius:9999px;font-size:12px;font-weight:700;
                                 background:{badge_bg};color:{badge_color};">
                        {badge_icon} {step["status"]}
                    </span>
                </td>
                <td style="padding:14px 16px;color:#64748b;font-size:13px;">{step["duration"]}</td>
                <td style="padding:14px 16px;color:#64748b;font-size:13px;">{step["time"]}</td>
            </tr>"""

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
    <title>Test Report — {timestamp}</title>
    <style>
        *{{box-sizing:border-box;margin:0;padding:0;}}
        body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
              background:#f8fafc;color:#1e293b;padding:32px;}}
        table{{width:100%;border-collapse:collapse;}}
        th{{background:#f1f5f9;padding:12px 16px;text-align:left;
            font-size:12px;text-transform:uppercase;letter-spacing:.05em;
            color:#64748b;font-weight:700;}}
        tr:hover{{background:#f8fafc;}}
    </style>
    <script>
        function toggleImg(id){{
            var el=document.getElementById(id);
            el.style.display=el.style.display==='none'?'block':'none';
        }}
    </script>
</head>
<body>

    <!-- Header -->
    <div style="background:white;border-radius:16px;padding:28px 32px;
                box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:24px;
                border-left:6px solid {status_color};">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
            <div>
                <h1 style="font-size:24px;font-weight:800;color:#0f172a;">
                    🍽️ Restaurant Order Flow — Test Report
                </h1>
                <p style="color:#64748b;margin-top:4px;font-size:14px;">
                    Run on {self.test_start_time.strftime("%B %d, %Y at %H:%M:%S")}
                    &nbsp;·&nbsp; Total duration: {duration}s
                </p>
            </div>
            <div style="padding:10px 24px;border-radius:12px;font-size:18px;font-weight:800;
                        background:{status_bg};color:{status_color};border:2px solid {status_color};">
                {"✅ ALL PASSED" if overall_status == "PASS" else "❌ TEST FAILED"}
            </div>
        </div>
    </div>

    <!-- Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;">
        <div style="background:white;border-radius:12px;padding:20px 24px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.08);border-top:4px solid #6366f1;">
            <div style="font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Total Steps</div>
            <div style="font-size:36px;font-weight:800;color:#1e293b;margin-top:4px;">{total}</div>
        </div>
        <div style="background:white;border-radius:12px;padding:20px 24px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.08);border-top:4px solid #16a34a;">
            <div style="font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Passed</div>
            <div style="font-size:36px;font-weight:800;color:#16a34a;margin-top:4px;">{passed}</div>
        </div>
        <div style="background:white;border-radius:12px;padding:20px 24px;
                    box-shadow:0 1px 4px rgba(0,0,0,0.08);border-top:4px solid #dc2626;">
            <div style="font-size:13px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Failed</div>
            <div style="font-size:36px;font-weight:800;color:#dc2626;margin-top:4px;">{failed}</div>
        </div>
    </div>

    <!-- Steps Table -->
    <div style="background:white;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #f1f5f9;">
            <h2 style="font-size:16px;font-weight:700;color:#0f172a;">Step-by-Step Results</h2>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width:48px;">#</th>
                    <th>Step</th>
                    <th style="width:120px;">Status</th>
                    <th style="width:100px;">Duration</th>
                    <th style="width:100px;">Time</th>
                </tr>
            </thead>
            <tbody>{rows_html}</tbody>
        </table>
    </div>

    <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:24px;">
        Generated by OrderFlowAutomation · {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
    </p>

</body>
</html>"""

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(html)

        print(f"\n📊 Report Generated: {os.path.abspath(report_path)}")
        return report_path


    # ---------------------------------------
    # COMPLETE FLOW
    # ---------------------------------------

    def run_complete_flow(self):

        overall_status = "PASS"

        try:
            self.login()
            self.navigate_to_order_page()
            self.select_table()
            self.select_menu_items()
            self.place_order()
            self.navigate_to_kds()
            self.verify_order_in_kds()
            self.verify_pending_status()
            self.mark_items_ready()
            self.verify_order_ready_status()
            self.navigate_back_to_orders()
            self.mark_order_served()
            self.open_bill_modal()
            self.verify_bill_items()
            self.fill_invoice_details()
            self.print_bill()
            self.close_invoice_modal()
            print("\n🎉 COMPLETE RESTAURANT FLOW TEST PASSED")

        except Exception as e:
            overall_status = "FAIL"
            print(f"\n💥 TEST FAILED: {e}")
            self.driver.save_screenshot("screenshots/restaurant_flow_failure.png")
            raise e

        finally:
            self.generate_report(overall_status)
            print("🔒 Closing Browser")
            self.driver.quit()


if __name__ == "__main__":
    test = OrderFlowAutomation()
    test.run_complete_flow()