import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  BookOpen, 
  Bookmark, 
  BookmarkCheck, 
  Search, 
  Clock, 
  User as UserIcon,
  ArrowLeft,
  BookMarked
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  thumbnail_url?: string;
  read_time_minutes: number;
  author?: string;
  is_published: boolean;
  created_at: string;
}

export const Education: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);

  const categories = [
    { label: 'All Topics', value: '' },
    { label: 'Oral Hygiene', value: 'hygiene' },
    { label: 'Dental Procedures', value: 'procedures' },
    { label: 'Pediatric Care', value: 'children' },
    { label: 'Emergencies', value: 'emergency' },
    { label: 'Diet & Nutrition', value: 'nutrition' }
  ];

  useEffect(() => {
    fetchArticles();
    fetchBookmarks();
  }, [selectedCategory]);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/education/articles', {
        params: selectedCategory ? { category: selectedCategory } : {}
      });
      setArticles(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await api.get('/education/bookmarks');
      setBookmarks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBookmark = async (articleId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening article detail modal
    try {
      await api.post(`/education/bookmarks/${articleId}`);
      fetchBookmarks();
    } catch (err) {
      console.error(err);
    }
  };

  const isBookmarked = (articleId: string) => {
    return bookmarks.some(b => b.id === articleId);
  };

  const filteredArticles = (activeTab === 'all' ? articles : bookmarks).filter(art => 
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    art.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-container">
      {selectedArticle ? (
        /* Article Reading View */
        <div className="animate-fade-in" style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '20px', border: '1px solid var(--bg-light-border)' }}>
          <button 
            className="landing-btn-outline" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '30px' }}
            onClick={() => setSelectedArticle(null)}
          >
            <ArrowLeft size={16} />
            <span>Back to Library</span>
          </button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <span style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
              {selectedArticle.category}
            </span>
            <button onClick={(e) => handleToggleBookmark(selectedArticle.id, e)} style={{ color: 'var(--primary)' }}>
              {isBookmarked(selectedArticle.id) ? <BookmarkCheck size={28} /> : <Bookmark size={28} />}
            </button>
          </div>

          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '16px', lineHeight: 1.25 }}>{selectedArticle.title}</h2>
          
          <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '40px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserIcon size={14} />
              <span>By {selectedArticle.author || 'DentAI Specialists'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} />
              <span>{selectedArticle.read_time_minutes} min read</span>
            </div>
          </div>

          <div 
            style={{ fontSize: '16px', lineHeight: 1.8, color: '#334155', whiteSpace: 'pre-line' }}
          >
            {selectedArticle.content}
          </div>
        </div>
      ) : (
        /* Article Library Listing View */
        <div>
          {/* Top Tabs */}
          <div className="education-tabs">
            <button 
              className={`edu-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Articles
            </button>
            <button 
              className={`edu-tab ${activeTab === 'saved' ? 'active' : ''}`}
              onClick={() => setActiveTab('saved')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <BookMarked size={16} />
              <span>Saved Articles ({bookmarks.length})</span>
            </button>
          </div>

          {/* Filters and Search */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  className={`landing-btn-outline ${selectedCategory === cat.value ? 'landing-btn-primary' : ''}`}
                  style={{ borderRadius: '20px', fontSize: '13px', padding: '8px 16px' }}
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', minWidth: '280px' }}>
              <Search size={18} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '40px', borderRadius: '20px', paddingTop: '10px', paddingBottom: '10px' }}
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Articles Listing Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-secondary)' }}>Loading library articles...</div>
          ) : filteredArticles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', border: '1px dashed var(--bg-light-border)', borderRadius: '20px', background: '#fff' }}>
              <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
              <h4 style={{ marginBottom: '6px' }}>No Articles Found</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Try adjusting your search queries or category filters.</p>
            </div>
          ) : (
            <div className="articles-grid">
              {filteredArticles.map((art) => (
                <div 
                  key={art.id} 
                  className="article-card" 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedArticle(art)}
                >
                  <div className="article-thumbnail">
                    <span className="article-category">{art.category}</span>
                    <BookOpen size={40} />
                  </div>
                  <div className="article-body">
                    <h4 className="article-title">{art.title}</h4>
                    <p className="article-excerpt">
                      {art.content.length > 120 ? art.content.slice(0, 120) + '...' : art.content}
                    </p>
                    <div className="article-meta">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        <span>{art.read_time_minutes} min read</span>
                      </span>
                      <button 
                        onClick={(e) => handleToggleBookmark(art.id, e)}
                        style={{ color: isBookmarked(art.id) ? 'var(--primary)' : 'var(--text-muted)' }}
                      >
                        {isBookmarked(art.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
