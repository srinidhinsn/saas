from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def setup_driver():
    options = webdriver.ChromeOptions()
    
    # --- THE CONFIG CHANGES TO FIX LATEST CONTROL LOSS ---
    
    # 1. Remove the "Chrome is being controlled by automated..." banner
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    
    # 2. Tell Chrome to stay open after the script ends (Prevents immediate closing)
    options.add_experimental_option("detach", True)
    
    # 3. Stealth Mode: Hide the fact that this is a Selenium driver from the website
    options.add_argument("--disable-blink-features=AutomationControlled")
    
    # Standard stability flags
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--start-maximized")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    return driver