import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  { value: 'text', color: '#3B82F6' },
  { value: 'color', color: '#EC4899' },
  { value: 'effect', color: '#8B5CF6' },
  { value: 'quality', color: '#F59E0B' },
  { value: 'rush', color: '#EF4444' },
  { value: 'support', color: '#10B981' },
];

const EMOJI_OPTIONS = [
  '✏️', '🎨', '⚡', '✨', '🌈', '💎', '🚀', '👑',
  '🎭', '🎪', '🎯', '🔥', '💫', '🌟', '⭐', '🎁'
];

export default function FeatureManagementContent() {
  const { t } = useTranslation();
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
        setError(t('featureMgmt.failedLoad'));
      }
    } catch (err) {
      setError(err.response?.data?.error || t('featureMgmt.errorLoading'));
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
        setSuccess(
          modalMode === 'create' ? t('featureMgmt.createdSuccess') : t('featureMgmt.updatedSuccess')
        );
        setShowModal(false);
        fetchFeatures();
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          (modalMode === 'create' ? t('featureMgmt.failedCreate') : t('featureMgmt.failedUpdate'))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFeature = async (featureId) => {
    setLoading(true);
    try {
      const response = await api.delete(`/features/${featureId}/`);
      if (response.data.success) {
        setSuccess(t('featureMgmt.deletedSuccess'));
        setDeleteConfirm(null);
        fetchFeatures();
      }
    } catch (err) {
      setError(err.response?.data?.error || t('featureMgmt.failedDelete'));
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
        setSuccess(
          !feature.is_popular
            ? t('featureMgmt.markedPopular')
            : t('featureMgmt.unmarkedPopular')
        );
        fetchFeatures();
      }
    } catch (err) {
      setError(t('featureMgmt.failedPopularUpdate'));
    }
  };

  const filteredFeatures = filterCategory === 'all'
    ? features
    : features.filter(f => f.category === filterCategory);

  const getCategoryColor = (category) => {
    return FEATURE_CATEGORIES.find(c => c.value === category)?.color || '#6B7280';
  };

  const getCategoryLabel = (category) => {
    return t(`featureMgmt.categories.${category}`);
  };

  return (
    <div className="feature-management-container">
      {/* Header Section */}
      <div className="feature-header">
        <div className="feature-header-content">
          <h2>{t('featureMgmt.title')}</h2>
          <p>{t('featureMgmt.subtitle')}</p>
        </div>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleOpenCreateModal}
          disabled={loading}
        >
          <Plus size={20} />
          {t('featureMgmt.createFeature')}
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
          {t('featureMgmt.allFeatures', { count: features.length })}
        </button>
        {FEATURE_CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`filter-btn ${filterCategory === cat.value ? 'active' : ''}`}
            style={filterCategory === cat.value ? { backgroundColor: cat.color, color: 'white' } : {}}
            onClick={() => setFilterCategory(cat.value)}
          >
            {getCategoryLabel(cat.value)} ({features.filter(f => f.category === cat.value).length})
          </button>
        ))}
      </div>

      {/* Features List */}
      <div className="features-list">
        {loading && features.length === 0 ? (
          <div className="loading-state">
            <Loader className="spinner" size={40} />
            <p>{t('featureMgmt.loading')}</p>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={40} />
            <h3>{t('featureMgmt.noneFound')}</h3>
            <p>{t('featureMgmt.createFirst')}</p>
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
                      <span className="status-badge active">{t('featureMgmt.active')}</span>
                    ) : (
                      <span className="status-badge inactive">{t('featureMgmt.inactive')}</span>
                    )}
                  </div>
                </div>

                <p className="feature-description">{feature.description}</p>

                <div className="feature-stats">
                  <div className="stat-item">
                    <span className="stat-label">{t('featureMgmt.tokenCost')}</span>
                    <span className="stat-value">{feature.tokens_required} 🪙</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">{t('featureMgmt.sortOrder')}</span>
                    <span className="stat-value">{feature.sort_order}</span>
                  </div>
                </div>

                <div className="feature-card-footer">
                  <button
                    className={`icon-btn ${feature.is_popular ? 'popular' : ''}`}
                    onClick={() => handleTogglePopular(feature)}
                    title={feature.is_popular ? t('featureMgmt.removePopular') : t('featureMgmt.markPopular')}
                  >
                    <Star size={18} fill={feature.is_popular ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    className="icon-btn edit"
                    onClick={() => handleOpenEditModal(feature)}
                    title={t('featureMgmt.editFeature')}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="icon-btn delete"
                    onClick={() => setDeleteConfirm(feature.id)}
                    title={t('featureMgmt.deleteFeature')}
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
              <h2>{modalMode === 'create' ? t('featureMgmt.createNewFeature') : t('featureMgmt.editFeature')}</h2>
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
                  <label>{t('featureMgmt.featureName')} *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('featureMgmt.featureNamePlaceholder')}
                    required
                    maxLength={255}
                  />
                </div>

                <div className="form-group">
                  <label>{t('featureMgmt.category')} *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    {FEATURE_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {getCategoryLabel(cat.value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('featureMgmt.description')} *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder={t('featureMgmt.descriptionPlaceholder')}
                  required
                  rows={3}
                  maxLength={500}
                />
                <span className="char-count">{formData.description.length}/500</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>{t('featureMgmt.tokenCost')} *</label>
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
                  <label>{t('featureMgmt.sortOrder')}</label>
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
                <label>{t('featureMgmt.iconEmoji')}</label>
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
                  <label htmlFor="is_active">{t('featureMgmt.activeHint')}</label>
                </div>

                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    name="is_popular"
                    id="is_popular"
                    checked={formData.is_popular}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="is_popular">{t('featureMgmt.popularHint')}</label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  {t('myDesigns.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="spinner-small" />
                      {t('settings.saving')}
                    </>
                  ) : (
                    `${modalMode === 'create' ? t('featureMgmt.create') : t('featureMgmt.update')} ${t('featureMgmt.feature')}`
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
              <h2>{t('featureMgmt.deleteFeatureQuestion')}</h2>
            </div>
            <div className="modal-body">
              <p>
                {t('featureMgmt.deleteConfirm')}
              </p>
              <p className="warning-text">
                {t('featureMgmt.deleteNote')}
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={loading}
              >
                {t('myDesigns.cancel')}
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteFeature(deleteConfirm)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader size={18} className="spinner-small" />
                    {t('myDesigns.deleting')}
                  </>
                ) : (
                  t('featureMgmt.deleteFeature')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
