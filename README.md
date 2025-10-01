This project is built with:

               > Vite + React

               > Material UI (@mui/material, @mui/icons-material, @mui/x-data-grid)

               > React Router (react-router-dom)

               > Axios (API calls)

               > JWT Decode (authentication)

               > React Toastify (notifications)

               > React Icons (icons)

               > Recharts / React Charts / React Minimal Pie Chart (charts & graphs)

               > XLSX + File Saver + Export-to-CSV (Excel/CSV import-export)

               > Material React Table / TanStack React Table (data tables)

               > Emotion (@emotion/react, @emotion/styled) (styling)



Installation : git clone <https://github.com/srinidhinsn/saas.git>
               cd <Project Name>
               npm install                             (Inbuilt and npm dependencies will be installed)
               npm run dev ==> localhost//5173         (Before this install dependencies)

               
Dependencies installation : npm install react-router-dom
                            npm install react-charts
                            npm install react-icons
                            npm install axios
                            npm install jwt-decode
                            npm install xlsx file-saver
                            npm install react-toastify
                            npm install jspdf jspdf-autotable



File-Structure  :  


├── node_modules/
├── public/
├── src/
│   ├── Backend_Port_Files/  =====>  our Standard url ports 

│   ├── Constants/          
│   │   ├── DashBoardPage.jsx   =====> Dashbord
│   │   ├── HeaderPage.jsx      =====> Header
│   │   ├── Navbar.jsx          =====> Navbar
│   │   ├── Notifications.jsx   =====> Notifications
│   │   ├── ProtectedRoute.jsx  =====> Out Navigation routes
│   │   └── SaasClientRoutes.jsx

│   ├── Main_Components/
│   │   ├── Add_Users/
│   │   │   ├── Add_user.jsx
│   │   │   ├── AddUserForm.jsx
│   │   │   └── UserList.jsx

│   │   ├── Document_Service_Components/     =====> COmponents Related to the Document Service
│   │   │   └── Document.jsx

│   │   ├── Inventory_Services_Components/   =====> Components Related to the Menu Service
│   │   │   ├── AddInventoryItemForm.jsx
│   │   │   ├── CategoryList.jsx
│   │   │   ├── MenuList.jsx
│   │   │   └── MenuManager.jsx

│   │   ├── Invoice_Services_Components/     =====> Components related to our Billing services
│   │   │   └── Invoice_Page.jsx

│   │   ├── Order_Service_Components/        =====> Components related Payment Page
│   │   │   ├── KDS_Component/
│   │   │   ├── OrderForm.jsx
│   │   │   ├── OrderManager.jsx
│   │   │   ├── OrderSummary.jsx
│   │   │   └── OrdersVisiblePage.jsx

│   │   ├── Report_Service_Components/        =====> Components related reports
│   │   │   └── ReportService.jsx

│   │   ├── Table_Service_Components/         =====> Components related to the Table Management
│   │   │   ├── Table_Inventory_Order.jsx
│   │   │   ├── Table_Wrapper.jsx
│   │   │   ├── TableManagement.jsx
│   │   │   └── Waiter_table.jsx

│   │   └── User_Services_Components/         =====> Components related to the User login,register,forget password, reset password
│   │       ├── ForgotPasswordPage.jsx
│   │       ├── LoginPage.jsx
│   │       ├── RegisterPage.jsx
│   │       └── ResetPassword.jsx

│   ├── Styles/                                =====> Css Stylings
│   │   ├── Constant-ColorCodes.css            
│   │   ├── Constant-Structures.css
│   │   └── StyleSheet1.css

│   ├── Sub_Components/
│   ├── ThemeChangerComponent/
│   ├── Util_Components/
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .gitignore
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json



Features  :

          > Authentication & Authorization (JWT-based)

          

          > Category & Menu Management with nested structure

          > Order Management (create, view, KDS, Order summary)

          > Table Management (AC & Non-AC differentiation)

          > Invoice Generation

          > Excel Import & Export

          > Notifications System

          > Theme Changer