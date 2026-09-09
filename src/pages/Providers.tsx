import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { providersApi } from '../api';
import type { ProviderConfig } from '../types';

type ProviderType = 'openai' | 'anthropic' | 'ollama';

interface ProviderForm {
  provider: ProviderType;
  name: string;
  apiKey: string;
  baseUrl: string;
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<ProviderForm>({
    defaultValues: { provider: 'openai', name: '', apiKey: '', baseUrl: '' },
  });

  const watchProvider = watch('provider');

  const loadProviders = async () => {
    try {
      setLoading(true);
      const data = await providersApi.list();
      setProviders(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleOpenDialog = () => {
    reset({ provider: 'openai', name: '', apiKey: '', baseUrl: '' });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const onSubmit = async (data: ProviderForm) => {
    setSaving(true);
    try {
      await providersApi.create({
        provider: data.provider,
        name: data.name,
        config: {
          apiKey: data.apiKey || undefined,
          baseUrl: data.baseUrl || undefined,
        },
      });
      handleCloseDialog();
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save provider');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;
    try {
      await providersApi.delete(id);
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await providersApi.setDefault(id);
      loadProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default');
    }
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Provider Settings</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Add Provider
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
                  <TableCell>Provider</TableCell>
                  <TableCell>API Key</TableCell>
                  <TableCell>Base URL</TableCell>
                  <TableCell>Default</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>
                      <Chip label={provider.provider} size="small" />
                    </TableCell>
                    <TableCell>{provider.config.apiKey || '-'}</TableCell>
                    <TableCell>{provider.config.baseUrl || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleSetDefault(provider.id)}
                        color={provider.isDefault ? 'warning' : 'default'}
                      >
                        {provider.isDefault ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(provider.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {providers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No providers configured
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
          <DialogTitle>Add Provider</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Provider</InputLabel>
              <Controller
                name="provider"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Provider">
                    <MenuItem value="openai">OpenAI</MenuItem>
                    <MenuItem value="anthropic">Anthropic</MenuItem>
                    <MenuItem value="ollama">Ollama</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
            <TextField
              fullWidth
              label="Name"
              margin="normal"
              placeholder="e.g., Production OpenAI"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            {watchProvider !== 'ollama' && (
              <TextField
                fullWidth
                label="API Key"
                margin="normal"
                type="password"
                {...register('apiKey')}
              />
            )}
            {watchProvider === 'ollama' && (
              <TextField
                fullWidth
                label="Base URL"
                margin="normal"
                placeholder="http://localhost:11434"
                {...register('baseUrl')}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? <CircularProgress size={24} /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
