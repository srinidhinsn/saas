import React, { useState, useEffect, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import {
    Avatar,
    Link,
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";

const UsersList = ({ onAddNew }) => {
    const [users, setUsers] = useState([]);
    const [filterRole, setFilterRole] = useState("all");
    const [selectionModel, setSelectionModel] = useState([]);

    // Bulk action states
    const [bulkAction, setBulkAction] = useState("");
    const [changeRoleValue, setChangeRoleValue] = useState("");
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isChangeRoleConfirmOpen, setIsChangeRoleConfirmOpen] = useState(false);

    // Load users on mount - assign each user a unique id if missing
    useEffect(() => {
        const savedUsers = JSON.parse(localStorage.getItem("users")) || [];
        // To ensure unique IDs, add an `id` property if missing, using UUID or index here:
        const usersWithIds = savedUsers.map((u, index) => ({ id: index, ...u }));
        setUsers(usersWithIds);
    }, []);

    // Filter and keep ids intact
    const filteredUsers = useMemo(() => {
        let filtered =
            filterRole === "all"
                ? users
                : filterRole === "admin"
                    ? users.filter((u) => u.role === "Administrator")
                    : users;
        return filtered;
    }, [users, filterRole]);

    // Columns definition same as before
    const columns = [
        {
            field: "username",
            headerName: "Username",
            flex: 1,
            sortable: true,
            renderCell: (params) => (
                <Box className="cell-user" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Avatar alt={params.value || ""} src={params.row.avatar || ""} sx={{ width: 32, height: 32 }}>
                        {params.value?.[0]?.toUpperCase() || ""}
                    </Avatar>
                    <Link
                        href="#"
                        underline="hover"
                        sx={{ fontWeight: 600, fontSize: 14, color: "var(--bg-text-color)" }}
                        onClick={(e) => e.preventDefault()}
                    >
                        {params.value || "(no username)"}
                    </Link>
                </Box>
            ),
        },
        {
            field: "name", headerName: "Name", flex: 1, sortable: true, renderCell: (params) => (
                <Link
                    href={`mailto:${params.value}`}
                    underline="hover"
                    sx={{ fontSize: 14, color: "var(--bg-text-color)" }}
                    onClick={(e) => e.preventDefault()}
                >
                    {params.value}
                </Link>
            ),
        },
        {
            field: "email",
            headerName: "Email",
            flex: 1.2,
            sortable: true,
            renderCell: (params) => (
                <Link
                    href={`mailto:${params.value}`}
                    underline="hover"
                    sx={{ fontSize: 14, color: "var(--bg-text-color)" }}
                    onClick={(e) => e.preventDefault()}
                >
                    {params.value}
                </Link>
            ),
        },
        {
            field: "role", headerName: "Role", flex: 0.5, sortable: true, renderCell: (params) => (
                <Link
                    href={`mailto:${params.value}`}
                    underline="hover"
                    sx={{ fontSize: 14, color: "var(--bg-text-color)" }}
                    onClick={(e) => e.preventDefault()}
                >
                    {params.value}
                </Link>
            ),
        },
        {
            field: "posts",
            headerName: "Posts",
            type: "number",
            width: 80,
            flex: 0.5,
            sortable: true,
            valueGetter: (params) => params?.row?.posts ?? 0,
            headerAlign: "center",
            align: "center", renderCell: (params) => (
                <Link
                    href={`mailto:${params.value}`}
                    underline="hover"
                    sx={{ fontSize: 14, color: "var(--bg-text-color)" }}
                    onClick={(e) => e.preventDefault()}
                >
                    {params.value}
                </Link>
            ),
        },
    ];

    // Apply bulk actions handlers:

    const handleApplyBulkAction = () => {
        if (bulkAction === "Delete") {
            if (selectionModel.length === 0) {
                alert("Please select user(s) to delete.");
                return;
            }
            setIsDeleteConfirmOpen(true);
        } else if (bulkAction === "ChangeRole") {
            if (selectionModel.length === 0) {
                alert("Please select user(s) to change role.");
                return;
            }
            if (!changeRoleValue) {
                alert("Please select a role to change to.");
                return;
            }
            setIsChangeRoleConfirmOpen(true);
        }
    };

    // Confirm Delete
    const confirmDelete = () => {
        // Filter users where user.id is NOT in selectionModel
        const remainingUsers = users.filter((user) => !selectionModel.includes(user.id));
        // Reset the IDs to maintain consistency (optional but recommended)
        const reindexedUsers = remainingUsers.map((u, idx) => ({ ...u, id: idx }));

        localStorage.setItem("users", JSON.stringify(reindexedUsers));
        setUsers(reindexedUsers);
        setSelectionModel([]);
        setIsDeleteConfirmOpen(false);
        setBulkAction("");
    };

    // Confirm Change Role
    const confirmChangeRole = () => {
        const updatedUsers = users.map((user) =>
            selectionModel.includes(user.id) ? { ...user, role: changeRoleValue } : user
        );

        // IDs remain same, no need to reindex here
        localStorage.setItem("users", JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
        setSelectionModel([]);
        setChangeRoleValue("");
        setIsChangeRoleConfirmOpen(false);
        setBulkAction("");
    };

    return (
        <div className="Userlist-container">
            <Box className="users-wrapper" sx={{ padding: 2 }}>
                {/* Header with Add New */}
                <Box
                    className="users-header"
                    sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}
                >
                    <Typography className="users-title" variant="h5" fontWeight={400} sx={{ userSelect: "none", color: "var(--bg-text-color)" }}>
                        Users
                    </Typography>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={onAddNew}
                        className="btn-add-new"
                        sx={{
                            textTransform: "none",
                            fontWeight: "bold",
                            fontSize: 13,
                            borderColor: "#0073aa",
                            color: "#0073aa",
                            "&:hover": {
                                backgroundColor: "#0073aa",
                                color: "#fff",
                            },
                        }}
                    >
                        Add New
                    </Button>
                </Box>

                {/* Role filter */}
                <Box
                    className="role-filter"
                    sx={{
                        mb: 1,
                        fontSize: 14,
                        userSelect: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 1,
                        color: "red",
                    }}
                >
                    <Link
                        href="#all"
                        underline="none"
                        sx={{
                            cursor: "pointer",
                            color: filterRole === "all" ? "var(--bg-text-color)" : "#555",
                            fontWeight: filterRole === "all" ? "700" : "600",
                            "&:hover": { color: "#0073aa" },
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            setFilterRole("all");
                            setSelectionModel([]);
                        }}
                    >
                        All <span>({users.length})</span>
                    </Link>
                    <span>|</span>
                    <Link
                        href="#Admin"
                        underline="none"
                        sx={{
                            cursor: "pointer",
                            color: filterRole === "Admin" ? "var(--bg-text-color)" : "var(--bg-text-color)",
                            fontWeight: filterRole === "Admin" ? "700" : "600",
                            "&:hover": { color: "darkblue" },
                        }}
                        onClick={(e) => {
                            e.preventDefault();
                            setFilterRole("Admin");
                            setSelectionModel([]);
                        }}
                    >
                        Admin<span>({users.filter((u) => u.role === "Admin").length})</span>
                    </Link>
                </Box>

                {/* DataGrid */}
                <Box className="data-grid-wrapper" sx={{ border: "1px solid #ddd", bgcolor: "var(--bg-chart-container)", mb: 1 }}>
                    <DataGrid
                        rows={filteredUsers}
                        columns={columns}
                        getRowId={(row) => row.id} // IMPORTANT: identify row by 'id'
                        pageSizeOptions={[5, 6, 7, 8, 10]}
                        initialState={{ pagination: { paginationModel: { pageSize: 7 } } }}
                        checkboxSelection
                        disableRowSelectionOnClick
                        selectionModel={selectionModel}
                        onSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
                        autoHeight
                        localeText={{ noRowsLabel: "No users found" }}
                        hideFooterSelectedRowCount
                        sx={{
                            border: "none",
                            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            backgroundColor: 'var(--bg-container)',
                            "& .MuiDataGrid-columnHeaders": {
                                backgroundColor: 'var(--bg-container)',
                                borderBottom: "1px solid green",
                                fontWeight: 600,
                                fontSize: 14,
                                color: "var(--bg-text-color)",
                            },
                            "& .MuiDataGrid-columnHeaderTitle": {
                                fontWeight: "600",

                            },
                            "& .MuiDataGrid-iconSeparator": {
                                display: "none",
                            },
                            "& .MuiDataGrid-row": {
                                fontSize: 13,
                                background: 'var(--bg-container)'
                            },
                            "& .MuiDataGrid-row:hover": {
                                backgroundColor: "#ededed",
                                cursor: "pointer",
                            },
                            "& .MuiCheckbox-root, & .MuiCheckbox-root.Mui-checked": {
                                padding: "0 9px 0 11px",
                            },
                        }}
                    />
                </Box>

                {/* Bulk actions */}
                <Box
                    className="bulk-actions-wrapper"
                    sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 14, userSelect: "none", color: "var(--bg-text-color)", bgcolor: 'var(--bg-container)' }}
                >
                    {/* Bulk Action selector */}
                    <FormControl size="small" sx={{ minWidth: 140, color: "var(--bg-text-color)", bgcolor: "var(--bg-container)" }}>
                        <InputLabel sx={{ color: "var(--bg-text-color)", bgcolor: "var(--bg-container)", borderColor: "var(--bg-text-color)" }} id="bulk-action-label">Bulk Actions</InputLabel>
                        <Select
                            labelId="bulk-action-label"
                            id="bulk-action-select"
                            value={bulkAction} sx={{ color: "var(--bg-text-color)", bgcolor: "var(--bg-container)" }}
                            label="Bulk Actions"
                            onChange={(e) => setBulkAction(e.target.value)}
                        >
                            <MenuItem sx={{ color: "var(--bg-text-color)", bgcolor: "var(--bg-container)" }} value="">Bulk Actions</MenuItem>
                            <MenuItem sx={{ color: "var(--bg-text-color)", bgcolor: "var(--bg-container)" }} value="Delete">Delete</MenuItem>
                            <MenuItem sx={{ color: "var(--bg-text-color)", bgcolor: "var(--bg-container)" }} value="ChangeRole">Change Role</MenuItem> {/* Added for clarity; needed to handle ChangeRole in handler */}
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined"
                        size="small"
                        onClick={handleApplyBulkAction}
                        // disabled={!bulkAction}
                        sx={{ textTransform: "none", color: "var(--bg-text-color)", bgcolor: "var(--bg-container)", borderColor: "var(--bg-text-color)" }}
                    >
                        Apply
                    </Button>

                    {/* Change Role selector */}
                    <FormControl size="small" sx={{ minWidth: 160, color: "var(--bg-text-color)", bgcolor: "var(--bg-container)" }}>
                        <InputLabel sx={{ color: "var(--bg-text-color)", bgcolor: "var(--bg-container)", borderColor: "var(--bg-text-color)" }} id="change-role-label">Change role to…</InputLabel>
                        <Select
                            labelId="change-role-label"
                            id="change-role-select" sx={{ color: "var(--bg-text-color)", bgcolor: "var(--bg-container)" }}
                            value={changeRoleValue}
                            label="Change role to…"
                            onChange={(e) => setChangeRoleValue(e.target.value)}
                        >
                            <MenuItem value="">Change role to…</MenuItem>
                            <MenuItem value="Waiter">Waiter</MenuItem>
                            <MenuItem value="Administrator">Administrator</MenuItem>
                            <MenuItem value="Receptionist">Receptionist</MenuItem>
                            <MenuItem value="Manager">Manager</MenuItem>
                            <MenuItem value="Chef">Chef</MenuItem>
                            <MenuItem value="Subscriber">Subscriber</MenuItem>
                        </Select>
                    </FormControl>
                    <Button
                        variant="outlined" sx={{ textTransform: "none", color: "var(--bg-text-color)", bgcolor: "var(--bg-container)", borderColor: "var(--bg-text-color)" }}
                        size="small"
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
                            setBulkAction(""); // Reset bulk action
                        }}
                    // disabled={!changeRoleValue}
                    // sx={{ textTransform: "none" }}
                    >
                        Change
                    </Button>
                </Box>

                {/* Delete Confirmation Modal */}
                <Dialog open={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)}>
                    <DialogTitle>Confirm Delete</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to delete {selectionModel.length} user{selectionModel.length > 1 ? "s" : ""}?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsDeleteConfirmOpen(false)}>No</Button>
                        <Button onClick={confirmDelete} variant="contained" color="error">
                            Yes
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Change Role Confirmation Modal */}
                <Dialog open={isChangeRoleConfirmOpen} onClose={() => setIsChangeRoleConfirmOpen(false)}>
                    <DialogTitle>Confirm Role Change</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to change role of {selectionModel.length} user{selectionModel.length > 1 ? "s" : ""} to{" "}
                            <strong>{changeRoleValue}</strong>?
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsChangeRoleConfirmOpen(false)}>No</Button>
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
