import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
  InputAdornment,
  Chip,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Collapse,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { agentsApi } from '../api';
import type { Agent, AgentQueryParams } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface AgentForm {
  name: string;
  description: string;
}

const ITEMS_PER_PAGE = 12;

export function AgentsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter panel
  const [showFilters, setShowFilters] = useState(false);

  // Query params
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [descriptionFilter, setDescriptionFilter] = useState('');
  const [descriptionDebounced, setDescriptionDebounced] = useState('');
  const [isSystemFilter, setIsSystemFilter] = useState<boolean | undefined>(undefined);
  const [createdAfter, setCreatedAfter] = useState('');
  const [createdBefore, setCreatedBefore] = useState('');
  const [sortBy, setSortBy] = useState<AgentQueryParams['sortBy']>('name');
  const [sortOrder, setSortOrder] = useState<AgentQueryParams['sortOrder']>('asc');
  const [page, setPage] = useState(1);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AgentForm>();

  // Check if any filters are active
  const hasActiveFilters = searchDebounced || descriptionDebounced || isSystemFilter !== undefined || createdAfter || createdBefore;

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDescriptionDebounced(descriptionFilter);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [descriptionFilter]);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const params: AgentQueryParams = {
        sortBy,
        sortOrder,
        skip: (page - 1) * ITEMS_PER_PAGE,
        limit: ITEMS_PER_PAGE,
      };
      if (searchDebounced.trim()) {
        params.name = searchDebounced;
      }
      if (descriptionDebounced.trim()) {
        params.description = descriptionDebounced;
      }
      if (isAdmin && isSystemFilter !== undefined) {
        params.isSystem = isSystemFilter;
      }
      if (createdAfter) {
        params.createdAfter = new Date(createdAfter).toISOString();
      }
      if (createdBefore) {
        params.createdBefore = new Date(createdBefore).toISOString();
      }
      const data = await agentsApi.list(params);
      setAgents(data.agents);
      setTotal(data.total);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [searchDebounced, descriptionDebounced, isSystemFilter, createdAfter, createdBefore, sortBy, sortOrder, page, isAdmin]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const handleOpenDialog = (agent?: Agent) => {
    if (agent) {
      setEditingAgent(agent);
      reset({ name: agent.name, description: agent.description || '' });
    } else {
      setEditingAgent(null);
      reset({ name: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAgent(null);
    reset({ name: '', description: '' });
  };

  const onSubmit = async (data: AgentForm) => {
    setSaving(true);
    try {
      if (editingAgent) {
        await agentsApi.update(editingAgent.id, data);
      } else {
        await agentsApi.create(data);
      }
      handleCloseDialog();
      loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;
    try {
      await agentsApi.delete(id);
      loadAgents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSearchDebounced('');
    setDescriptionFilter('');
    setDescriptionDebounced('');
    setIsSystemFilter(undefined);
    setCreatedAfter('');
    setCreatedBefore('');
    setPage(1);
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <Box>
      {/* Main toolbar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by name..."
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
          sx={{ flex: 1, minWidth: 200, maxWidth: 300 }}
        />
        <Button
          variant={showFilters ? 'contained' : 'outlined'}
          size="small"
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
          color={hasActiveFilters ? 'primary' : 'inherit'}
        >
          Filters
          {hasActiveFilters && (
            <Chip
              label={[searchDebounced, descriptionDebounced, isSystemFilter !== undefined, createdAfter, createdBefore].filter(Boolean).length}
              size="small"
              sx={{ ml: 1, height: 20, minWidth: 20 }}
            />
          )}
        </Button>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={`${sortBy}-${sortOrder}`}
            size='small'
            onChange={(e) => {
              const [newSortBy, newSortOrder] = e.target.value.split('-') as [AgentQueryParams['sortBy'], AgentQueryParams['sortOrder']];
              setSortBy(newSortBy);
              setSortOrder(newSortOrder);
              setPage(1);
            }}
          >
            <MenuItem value="name-asc">Name A-Z</MenuItem>
            <MenuItem value="name-desc">Name Z-A</MenuItem>
            <MenuItem value="updatedAt-desc">Recently updated</MenuItem>
            <MenuItem value="updatedAt-asc">Oldest updated</MenuItem>
            <MenuItem value="createdAt-desc">Newest first</MenuItem>
            <MenuItem value="createdAt-asc">Oldest first</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          size='small'
          disabled={true}
          title='Soon'
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{ whiteSpace: 'nowrap' }}
        >
          New Agent
        </Button>
      </Box>

      {/* Expandable filters */}
      <Collapse in={showFilters}>
        <Card sx={{ mb: 2, p: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="Description"
              placeholder="Filter by description..."
              size="small"
              value={descriptionFilter}
              onChange={(e) => setDescriptionFilter(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              label="Created after"
              type="date"
              size="small"
              value={createdAfter}
              onChange={(e) => {
                setCreatedAfter(e.target.value);
                setPage(1);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Created before"
              type="date"
              size="small"
              value={createdBefore}
              onChange={(e) => {
                setCreatedBefore(e.target.value);
                setPage(1);
              }}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ minWidth: 150 }}
            />
            {isAdmin && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={isSystemFilter === undefined ? 'all' : isSystemFilter ? 'system' : 'user'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setIsSystemFilter(val === 'all' ? undefined : val === 'system');
                    setPage(1);
                  }}
                  displayEmpty
                >
                  <MenuItem value="all">All agents</MenuItem>
                  <MenuItem value="system">System only</MenuItem>
                  <MenuItem value="user">User only</MenuItem>
                </Select>
              </FormControl>
            )}
            <Box sx={{ flex: 1 }} />
            {hasActiveFilters && (
              <Button
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}
          </Box>
        </Card>
      </Collapse>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Results info */}
      {!loading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {total} agent{total !== 1 ? 's' : ''} found
        </Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            {agents.map((agent) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={agent.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Typography
                        variant="h6"
                        sx={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {agent.name}
                      </Typography>
                      {isAdmin && agent.isSystem && (
                        <Chip label="System" size="small" color="info" />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: '2.5em',
                      }}
                    >
                      {agent.description || 'No description'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {agent.nodes.length} nodes
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <IconButton size="small" onClick={() => handleOpenDialog(agent)}>
                      <EditIcon />
                    </IconButton>
                    {!agent.isSystem && (
                      <IconButton size="small" color="error" onClick={() => handleDelete(agent.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
            {agents.length === 0 && (
              <Grid size={12}>
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  {total === 0 && !hasActiveFilters
                    ? 'No agents yet. Create your first agent to get started.'
                    : 'No agents match your filters.'}
                </Typography>
              </Grid>
            )}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                size={isMobile ? 'small' : 'medium'}
              />
            </Box>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingAgent ? 'Edit Agent' : 'New Agent'}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Name"
              margin="normal"
              error={!!errors.name}
              helperText={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              multiline
              rows={3}
              {...register('description')}
            />
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
