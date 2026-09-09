import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { authApi } from '../api';
import type { ApiKey } from '../types';

const PERMISSIONS = [
  { value: 'agents:read', label: 'Read Agents' },
  { value: 'agents:write', label: 'Write Agents' },
  { value: 'agents:run', label: 'Run Agents' },
  { value: 'runs:read', label: 'Read Runs' },
];

interface ApiKeyForm {
  name: string;
}

export function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyDialog, setNewKeyDialog] = useState(false);
  const [newPlainKey, setNewPlainKey] = useState('');
  const [permissions, setPermissions] = useState<string[]>(['agents:read', 'agents:run']);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ApiKeyForm>();

  const filteredApiKeys = useMemo(() => {
    if (!search.trim()) return apiKeys;
    const query = search.toLowerCase();
    return apiKeys.filter(
      (key) =>
        key.name.toLowerCase().includes(query) ||
        key.permissions.some((p) => p.toLowerCase().includes(query))
    );
  }, [apiKeys, search]);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const data = await authApi.listApiKeys();
      setApiKeys(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const handleOpenDialog = () => {
    reset({ name: '' });
    setPermissions(['agents:read', 'agents:run']);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const onSubmit = async (data: ApiKeyForm) => {
    setSaving(true);
    try {
      const result = await authApi.createApiKey(data.name, permissions);
      setNewPlainKey(result.plainKey);
      handleCloseDialog();
      setNewKeyDialog(true);
      loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) return;
    try {
      await authApi.revokeApiKey(id);
      loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke API key');
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(newPlainKey);
  };

  const togglePermission = (permission: string) => {
    setPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, sm: 3 }, gap: 2 }}>
        <TextField
          placeholder="Search API keys..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: 400 }}
        />
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog} sx={{ whiteSpace: 'nowrap' }}>
          Create API Key
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Key</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredApiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell>{apiKey.name}</TableCell>
                    <TableCell>
                      <code>{apiKey.keyPrefix}...</code>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {apiKey.permissions.map((p) => (
                          <Chip key={p} label={p} size="small" />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {apiKey.lastUsedAt
                        ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {new Date(apiKey.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(apiKey.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredApiKeys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {apiKeys.length === 0
                        ? 'No API keys created'
                        : 'No API keys match your search'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              margin="normal"
              placeholder="e.g., Production API"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Permissions
            </Typography>
            <FormGroup>
              {PERMISSIONS.map((perm) => (
                <FormControlLabel
                  key={perm.value}
                  control={
                    <Checkbox
                      checked={permissions.includes(perm.value)}
                      onChange={() => togglePermission(perm.value)}
                    />
                  }
                  label={perm.label}
                />
              ))}
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={newKeyDialog} onClose={() => setNewKeyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>API Key Created</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Copy this key now. You won't be able to see it again!
          </Alert>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1,
            }}
          >
            <code style={{ flex: 1, wordBreak: 'break-all' }}>{newPlainKey}</code>
            <IconButton onClick={handleCopyKey}>
              <CopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewKeyDialog(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
