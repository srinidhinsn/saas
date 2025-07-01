import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Profile from './Profile';
import Services from './Services';
import Database from './Database';
import Clients from './Clients';
import Manage from './Manage';
import ClientsTable from './components/ClientsTable';
import RegisterClient from './RegisterClient';
import Login from './Login&RegisterPages/Login';
import ProtectedRoute from './ProtectedRoute/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />


        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="profile" element={<Profile />} />
          <Route path="services" element={<Services />} />
          <Route path="database" element={<Database />} />
          <Route path="clients" element={<Clients />} />
          <Route path="manage" element={<Manage />} />
          <Route path="clientsUser" element={<ClientsTable />} />
          <Route path="register" element={<RegisterClient />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
