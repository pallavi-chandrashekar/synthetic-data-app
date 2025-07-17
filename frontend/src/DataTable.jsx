import * as React from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

export default function DataTable({ data }) {
  const [columnFilters, setColumnFilters] = React.useState({});
  const [filterModes, setFilterModes] = React.useState({});
  const [pageSize, setPageSize] = React.useState(10);

  if (!Array.isArray(data) || data.length === 0) return null;

  const allColumns = Object.keys(data[0]);

  const columns = allColumns.map((key) => ({
    field: key,
    headerName: key,
    flex: 1,
    sortable: true,
    renderHeader: () => (
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 160 }}>
        <TextField
          size="small"
          variant="outlined"
          placeholder={`Search ${key}`}
          value={columnFilters[key] || ""}
          onChange={(e) =>
            setColumnFilters((prev) => ({ ...prev, [key]: e.target.value }))
          }
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: columnFilters[key] ? (
              <IconButton
                size="small"
                onClick={() =>
                  setColumnFilters((prev) => {
                    const updated = { ...prev };
                    delete updated[key];
                    return updated;
                  })
                }
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            ) : null,
          }}
        />
      </Box>
    ),
  }));

  const rows = data.map((row, index) => ({
    id: index,
    ...row,
  }));

  const applyFilter = (value, input, mode) => {
    const val = String(value ?? "");
    const inputVal = input.toLowerCase();

    if (!input) return true;

    switch (mode) {
      case "startsWith":
        return val.toLowerCase().startsWith(inputVal);
      case "regex":
        try {
          return new RegExp(input).test(val);
        } catch {
          return false;
        }
      case "contains":
      default:
        return val.toLowerCase().includes(inputVal);
    }
  };

  const filteredRows = rows.filter((row) =>
    Object.entries(columnFilters).every(([field, filterValue]) =>
      applyFilter(row[field], filterValue, filterModes[field])
    )
  );

  return (
    <Box sx={{ width: "100%", mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Preview
      </Typography>

      <div style={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          pageSize={pageSize}
          onPageSizeChange={(newPageSize) => setPageSize(newPageSize)}
          rowsPerPageOptions={[5, 10, 25]}
          pagination
          disableRowSelectionOnClick
        />
      </div>
    </Box>
  );
}
