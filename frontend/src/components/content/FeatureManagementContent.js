import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Star,
  Loader
} from 'lucide-react';
import api from '../../services/api';
import '../styles/FeatureManagement.css';

const FEATURE_CATEGORIES = [
  { value: 'text', label: 'Text Customization', color: '#3B82F6' },
  { value: 'color', label: 'Color Options', color: '#EC4899' },
  { value: 'effect', label: 'Special Effects', color: '#8B5CF6' },
  { value: 'quality', label: 'Quality Enhancement', color: '#F59E0B' },
  { value: 'rush', label: 'Rush Processing', color: '#EF4444' },
  { value: 'support', label: 'Premium Support', color: '#10B981' },
];

const EMOJI_OPTIONS = [
  '✏️', '🎨', '⚡', '✨', '🌈', '💎', '🚀', '👑',
  '🎭', '🎪', '🎯', '🔥', '💫', '🌟', '⭐', '🎁'
];

export default function FeatureManagementContent() {
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [editingFeature, setEditingFeature] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tokens_required: 10,
    category: 'text',
    is_active: true,
    is_popular: false,
    sort_order: 0,
    icon_emoji: '✨'
  });

  // Fetch features on mount
  useEffect(() => {
    fetchFeatures();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      const response = await api.get('/features/');
      if (response.data.success) {
        setFeatures(response.data.features);
      } else {
        setError('Failed to load features');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error loading features');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingFeature(null);
    setFormData({
      name: '',
      description: '',
      tokens_required: 10,
      category: 'text',
      is_active: true,
      is_popular: false,
      sort_order: 0,
      icon_emoji: '✨'
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (feature) => {
    setModalMode('edit');
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      description: feature.description,
      tokens_required: feature.tokens_required,
      category: feature.category,
      is_active: feature.is_active,
      is_popular: feature.is_popular,
      sort_order: feature.sort_order,
      icon_emoji: feature.icon_emoji
    });
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (modalMode === 'create') {
        response = await api.post('/features/', formData);
      } else {
        response = await api.put(`/features/${editingFeature.id}/`, formData);
      }

      if (response.data.success || response.status === 201) {
        setSuccess(`Feature ${modalMode === 'create' ? 'created' : 'updated'} successfully!`);
        setShowModal(false);
        fetchFeatures();
      }
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${modalMode} feature`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeature = async (featureId) => {
    setLoading(true);
    try {
      const response = await api.delete(`/features/${featureId}/`);
      if (response.data.success) {
        setSuccess('Feature deleted successfully!');
        setDeleteConfirm(null);
        fetchFeatures();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete feature');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePopular = async (feature) => {
    try {
      const response = await api.put(`/features/${feature.id}/`, {
        ...feature,
        is_popular: !feature.is_popular
      });
      if (response.data.success) {
        setSuccess(`Feature ${!feature.is_popular ? 'marked as' : 'unmarked as'} popular!`);
        fetchFeatures();
      }
    } catch (err) {
      setError('Failed to update popular status');
    }
  };

  const filteredFeatures = filterCategory === 'all'
    ? features
    : features.filter(f => f.category === filterCategory);

  const getCategoryColor = (category) => {
    return FEATURE_CATEGORIES.find(c => c.value === category)?.color || '#6B7280';
  };

  const getCategoryLabel = (category) => {
    return FEATURE_CATEGORIES.find(c => c.value === category)?.label || category;
  };

  return (
    <div className="feature-management-container">
      {/* Header Section */}
      <div className="feature-header">
        <div className="feature-header-content">
          <h2>Design Features Management</h2>
          <p>Create and manage premium features with token pricing</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleOpenCreateModal}
          disabled={loading}
        >
          <Plus size={20} />
          Create Feature
        </button>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={20} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filter Section */}
      <div className="feature-filters">
        <button
          className={`filter-btn ${filterCategory === 'all' ? 'active' : ''}`}
          onClick={() => setFilterCategory('all')}
        >
          All Features ({features.length})
        </button>
        {FEATURE_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`filter-btn ${filterCategory === cat.value ? 'active' : ''}`}
            style={filterCategory === cat.value ? { backgroundColor: cat.color, color: 'white' } : {}}
            onClick={() => setFilterCategory(cat.value)}
          >
            {cat.label} ({features.filter(f => f.category === cat.value).length})
          </button>
        ))}
      </div>

      {/* Features List */}
      <div className="features-list">
        {loading && features.length === 0 ? (
          <div className="loading-state">
            <Loader className="spinner" size={40} />
            <p>Loading features...</p>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={40} />
            <h3>No features found</h3>
            <p>Create your first feature to get started</p>
          </div>
        ) : (
          <div className="features-grid">
            {filteredFeatures.map(feature => (
              <div key={feature.id} className="feature-card">
                <div className="feature-card-header">
                  <div className="feature-icon-section">
                    <span className="feature-emoji">{feature.icon_emoji}</span>
                    <div>
                      <h3>{feature.name}</h3>
                      <span
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(feature.category) }}
                      >
                        {getCategoryLabel(feature.category)}
                      </span>
                    </div>
                  </div>
                  <div className="feature-status">
                    {feature.is_active ? (
                      <span className="status-badge active">Active</span>
                    ) : (
                      <span className="status-badge inactive">Inactive</span>
                    )}
                  </div>
                </div>

                <p className="feature-description">{feature.description}</p>

                <div className="feature-stats">
                  <div className="stat-item">
                    <span className="stat-label">Token Cost:</span>
                    <span className="stat-value">{feature.tokens_required} 🪙</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Sort Order:</span>
                    <span className="stat-value">{feature.sort_order}</span>
                  </div>
                </div>

                <div className="feature-card-footer">
                  <button
                    className={`icon-btn ${feature.is_popular ? 'popular' : ''}`}
                    onClick={() => handleTogglePopular(feature)}
                    title={feature.is_popular ? 'Remove from popular' : 'Mark as popular'}
                  >
                    <Star size={18} fill={feature.is_popular ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="icon-btn edit"
                    onClick={() => handleOpenEditModal(feature)}
                    title="Edit feature"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => setDeleteConfirm(feature.id)}
                    title="Delete feature"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Create New Feature' : 'Edit Feature'}</h2>
              <button
                className="close-btn"
                onClick={() => setShowModal(false)}
                disabled={loading}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="feature-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Feature Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Text Customization"
                    required
                    maxLength={255}
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {FEATURE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what this feature does..."
                  required
                  rows={3}
                  maxLength={500}
                />
                <span className="char-count">{formData.description.length}/500</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Token Cost *</label>
                  <input
                    type="number"
                    name="tokens_required"
                    value={formData.tokens_required}
                    onChange={handleInputChange}
                    min={1}
                    max={1000}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Sort Order</label>
                  <input
                    type="number"
                    name="sort_order"
                    value={formData.sort_order}
                    onChange={handleInputChange}
                    min={0}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Icon Emoji</label>
                <div className="emoji-picker">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className={`emoji-btn ${formData.icon_emoji === emoji ? 'selected' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, icon_emoji: emoji }))}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    name="is_active"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="is_active">Active (Customers can see and use)</label>
                </div>

                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    name="is_popular"
                    id="is_popular"
                    checked={formData.is_popular}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="is_popular">Popular (Show in featured list)</label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="spinner-small" />
                      Saving...
                    </>
                  ) : (
                    `${modalMode === 'create' ? 'Create' : 'Update'} Feature`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay">
          <div className="modal modal-small">
            <div className="modal-header">
              <h2>Delete Feature?</h2>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete this feature? This action cannot be undone.
              </p>
              <p className="warning-text">
                Existing designs using this feature will be unaffected.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteFeature(deleteConfirm)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader size={18} className="spinner-small" />
                    Deleting...
                  </>
                ) : (
                  'Delete Feature'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
