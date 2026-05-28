import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.action_chains import ActionChains
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from util import setup_driver;

def test_foodys_cafe_workflow():
    login_url = "http://saas.networkspecialist.in:8017/saas/foodyscafe/login"
    
    driver = setup_driver()
    # Explicit wait configuration (up to 10 seconds)
    wait = WebDriverWait(driver, 10)
    
    print(f"🚀 Navigating to login page: {login_url}")
    
    try:
        # 1. Load the Login Page
        driver.get(login_url)
        
        # 2. Wait for and find the Username input field
        # Robust XPath looking for common attributes (name, id, type, or placeholder)
        username_field = wait.until(EC.presence_of_element_located((
            By.XPATH, "//input[@name='username' or @id='username' or @type='text' or contains(@placeholder, 'User')]"
        )))
        username_field.clear()
        username_field.send_keys('foodyscafe')
        print("👤 Username entered.")
        
        # 3. Wait for and find the Password input field
        password_field = wait.until(EC.presence_of_element_located((
            By.XPATH, "//input[@name='password' or @id='password' or @type='password' or contains(@placeholder, 'Pass')]"
        )))
        password_field.clear()
        password_field.send_keys('admin')
        print("🔒 Password entered.")
        
        # 4. Find and click the Login button
        login_button = wait.until(EC.element_to_be_clickable((
            By.XPATH, "//button[@type='submit' or contains(text(), 'LOGIN') or contains(text(), 'LOGIN') or @id='login-btn']"
        )))
        login_button.click()
        print("🔑 Login button clicked. Waiting for redirection...")
        wait = WebDriverWait(driver, 20)

        
        # 5. Wait for the URL to change and contain '/home'
        wait.until(EC.url_contains("/home"))
        print(f"🎉 Redirection successful! Current URL: {driver.current_url}")
        # 6. Verify the Home Page body loaded fully
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        
        # 7. Check for gateway errors on the home page title
        current_title = driver.title
        assert "Gateway" not in current_title, "❌ Test Failed: Landed on a Bad Gateway (502) error page!"
        assert "Not Found" not in current_title, "❌ Test Failed: Landed on a 404 Not Found page!"
        screenshot_path = "foodyscafe_home_screen.png"
        driver.save_screenshot(screenshot_path)
        
        # 4. HOVER OVER PROFILE (Top Right)
        # We look for 'Profile', 'User', an avatar class, or common top-right menu text
        profile_element = wait.until(EC.presence_of_element_located((By.XPATH, 
            "//*[contains(text(), 'Profile') or contains(@class, 'profile') or contains(@class, 'avatar') or contains(@id, 'profile')]"
        )))
        
        # Initialize ActionChains and perform the hover move
        actions = ActionChains(driver)
        actions.move_to_element(profile_element).perform()
        print("🖱️ Hovered over the Profile menu.")
        
        screenshot_path = "logout.png"
        driver.save_screenshot(screenshot_path)
        # 5. CLICK LOGOUT BUTTON
        # The dropdown menu takes a split second to animate open, so wait for clickability
        logout_button = wait.until(EC.element_to_be_clickable((By.XPATH, 
            "//*[contains(text(), 'Logout') or contains(text(), 'Log Out') or contains(text(), 'Sign Out')]"
        )))
        logout_button.click()
        print("🔑 Logout button clicked.")
        
        # 6. VERIFY SUCCESSFUL LOGOUT
        # The URL should change back to the login page path
        wait.until(EC.url_contains("/login"))
        assert ("/login", driver.current_url, "User was not redirected back to the login page after logging out!")
        print("🔒 Successfully logged out and returned to the Login Page safely.")


        
        print(f"✅ Success: Home page loaded. Title: '{current_title}'")
        
        # 8. Capture a screenshot of the dashboard/home page
        screenshot_path = "foodyscafe_after_logout.png"
        driver.save_screenshot(screenshot_path)
        
        print(f"📸 Screenshot captured: {os.path.abspath(screenshot_path)}")
        
    except Exception as e:
        print(f"💥 Test Failed! Error encountered: {e}")
        driver.save_screenshot("login_failure_dump.png")
        print("📸 Failure screenshot saved as 'login_failure_dump.png'")
        raise e
        
    finally:
        print("🔒 Closing browser session.")
        driver.quit()

if __name__ == "__main__":
    test_foodys_cafe_workflow()