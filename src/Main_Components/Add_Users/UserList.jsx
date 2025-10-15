import React, { useState, useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Avatar,Box, Link, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import axios from 'axios';
import { useParams } from "react-router-dom";

const UsersList = ({ onAddNew }) => {
  const { clientId } = useParams();
  const token = localStorage.getItem("access_token");

  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState("all");
  const [selectionModel, setSelectionModel] = useState([]);
  const [roles, setRoles] = useState([]);
  const [changeRoleValue, setChangeRoleValue] = useState("");
  const [isChangeRoleConfirmOpen, setIsChangeRoleConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_INVENTORY_SERVICE_URL}/${clientId}/inventory/read_category?category_id=roles`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.data?.length) {
          const rolesCategory = res.data.data[0];
          setRoles(rolesCategory.subCategories || []);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    };
    if (clientId && token) fetchRoles();
  }, [clientId, token]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/persons`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.data?.persons) {
          const persons = res.data.data.persons.map((person) => ({
            id: person.id,
            username: person.username,
            name: `${person.first_name || ""} ${person.last_name || ""}`.trim(),
            email: person.email,
            phone: person.phone || "",
            role: person.role || "Subscriber",
            avatar: person.avatar || "",
          }));
          setUsers(persons);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    if (clientId && token) fetchUsers();
  }, [clientId, token]);

  const filteredUsers = useMemo(() => {
    if (filterRole === "all") return users;
    if (filterRole === "admin") return users.filter((u) => u.role === "Administrator");
    return users;
  }, [users, filterRole]);

  const confirmChangeRole = async () => {
    try {
      await Promise.all(
        selectionModel.map(async (userId) => {
          const user = users.find((u) => u.id === userId);
          if (user) {
            await axios.post(
              `${import.meta.env.VITE_API_USER_SERVICE_URL}/${clientId}/users/update-role`,
              null,
              {
                params: { username: user.username, new_role: changeRoleValue },
                headers: { Authorization: `Bearer ${token}` },
              }
            );
          }
        })
      );
      const updatedUsers = users.map((user) =>
        selectionModel.includes(user.id) ? { ...user, role: changeRoleValue } : user
      );
      setUsers(updatedUsers);
      setSelectionModel([]);
      setChangeRoleValue("");
      setIsChangeRoleConfirmOpen(false);
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Error updating role");
    }
  };

  const columns = [
    {
      field: "username",
      headerName: "Username",
      flex: 1,
      sortable: true,
      headerClassName: "ul-column-header",
      cellClassName: "ul-cell username-cell",
      renderCell: (params) => (
        <div className="ul-cell-user">
          <Avatar alt={params.value} src={params.row.avatar} className="ul-avatar">
            {params.value?.[0]?.toUpperCase() || ""}
          </Avatar>
          <Link href="#" underline="hover" className="ul-link" onClick={(e) => e.preventDefault()}>
            {params.value || "(no username)"}
          </Link>
        </div>
      ),
    },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      sortable: true,
      headerClassName: "ul-column-header",
      cellClassName: "ul-cell",
      renderCell: (params) => (
        <Link href={`mailto:${params.row.email}`} underline="hover" className="ul-link" onClick={(e) => e.preventDefault()}>
          {params.value}
        </Link>
      ),
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.2,
      sortable: true,
      headerClassName: "ul-column-header",
      cellClassName: "ul-cell",
      renderCell: (params) => (
        <Link href={`mailto:${params.value}`} underline="hover" className="ul-link" onClick={(e) => e.preventDefault()}>
          {params.value}
        </Link>
      ),
    },
    {
      field: "phone",
      headerName: "Phone",
      flex: 0.8,
      sortable: false,
      headerClassName: "ul-column-header ul-align-center",
      cellClassName: "ul-cell ul-align-center",
      renderCell: (params) => <Typography className="ul-typography">{params.value || "-"}</Typography>,
    },
    {
      field: "role",
      headerName: "Role",
      flex: 0.5,
      sortable: true,
      headerClassName: "ul-column-header ul-align-center",
      cellClassName: "ul-cell ul-align-center",
      renderCell: (params) => <Typography className="ul-typography">{params.value}</Typography>,
    },
  ];

  return (
    <div className="ul-container">
      <Box className="ul-wrapper">
        <Box className="ul-header">
          <Typography variant="h5" className="ul-title">
            Users
          </Typography>
          <Button variant="outlined" size="small" onClick={onAddNew} className="ul-btn-add-new">
            Add New
          </Button>
        </Box>

        <Box className="ul-role-filter">
          <Link
            href="#all"
            underline="none"
            className={`ul-role-link ${filterRole === "all" ? "ul-selected" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setFilterRole("all");
              setSelectionModel([]);
            }}
          >
            All <span>({users.length})</span>
          </Link>
          <span className="ul-filter-separator">|</span>
          <Link
            href="#Admin"
            underline="none"
            className={`ul-role-link ${filterRole === "admin" ? "ul-selected" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setFilterRole("admin");
              setSelectionModel([]);
            }}
          >
            Admin <span>({users.filter((u) => u.role === "Administrator").length})</span>
          </Link>
        </Box>

        <div className="ul-data-grid-wrapper">
          <DataGrid
            rows={filteredUsers}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 6, 7]}
            initialState={{ pagination: { paginationModel: { pageSize: 7 } } }}
            checkboxSelection
            disableRowSelectionOnClick
            selectionModel={selectionModel}
            onSelectionModelChange={setSelectionModel}
            autoHeight
            localeText={{ noRowsLabel: "No users found" }}
            hideFooterSelectedRowCount
            className="ul-data-grid"
          />
        </div>

        <Box className="ul-role-change-section">
          <FormControl size="small" className="ul-role-select-control">
            <InputLabel className="ul-input-label">Change role to…</InputLabel>
            <Select
              value={changeRoleValue}
              onChange={(e) => setChangeRoleValue(e.target.value)}
              className="ul-select"
              label="Change role to…"
            >
              <MenuItem value="">Select Role</MenuItem>
              {roles.map((r) => (
                <MenuItem key={r.id} value={r.name}>
                  {r.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            className="ul-change-role-btn"
            onClick={() => {
              if (!changeRoleValue) {
                alert("Please select a role before clicking Change.");
                return;
              }
              if (selectionModel.length === 0) {
                alert("Please select user(s) to change role.");
                return;
              }
              setIsChangeRoleConfirmOpen(true);
            }}
          >
            Change Role
          </Button>
        </Box>

        <Dialog open={isChangeRoleConfirmOpen} onClose={() => setIsChangeRoleConfirmOpen(false)} className="ul-dialog">
          <DialogTitle>Confirm Role Change</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to change role of {selectionModel.length} user
              {selectionModel.length > 1 ? "s" : ""} to <strong>{changeRoleValue}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsChangeRoleConfirmOpen(false)} color="inherit">
              No
            </Button>
            <Button onClick={confirmChangeRole} variant="contained" color="primary">
              Yes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </div>
  );
};

export default UsersList;
