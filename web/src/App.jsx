import { useState, useEffect, useCallback, useMemo } from 'react'
import './App.css'

const API_BASE = '/api'

// Pricing constants
const PRICES = {
  single_990: 990,
  single_1290: 1290,
  bundle_3: 2690,
  full_year: 4990
}

// Helper to format Thai Baht
const formatBaht = (amount) => `฿${amount?.toLocaleString() || 0}`

// Helper to format date/time
const formatTime = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const formatRelativeTime = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  const now = new Date()
  const diffMs = now - d
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

// API helper
async function api(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }
  return res.json()
}

// Main App Component
function App() {
  const [screen, setScreen] = useState('loading')
  const [staff, setStaff] = useState(null)
  const [session, setSession] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsPeriod, setStatsPeriod] = useState('today') // 'today', 'week', 'all'
  const [sellerStats, setSellerStats] = useState(null)
  const [error, setError] = useState(null)
  const [flowData, setFlowData] = useState({})
  const [confirmation, setConfirmation] = useState(null)

  // Phase 2 state
  const [browseData, setBrowseData] = useState(null)
  const [browseFilters, setBrowseFilters] = useState({})
  const [selectedInteraction, setSelectedInteraction] = useState(null)
  const [trashData, setTrashData] = useState(null)
  const [sankeyData, setSankeyData] = useState(null)
  const [notesModal, setNotesModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [eventModal, setEventModal] = useState(false)

  // Initialize app - go straight to home, seller assigned by device config
  useEffect(() => {
    api('/session')
      .then(data => {
        setSession(data)
        setScreen('home')
        loadStats()
      })
      .catch(err => {
        // Fall back to whoami for backward compatibility
        api('/whoami')
          .then(data => {
            setStaff(data)
            setScreen('home')
            loadStats()
          })
          .catch(err2 => {
            setError(err2.message)
            setScreen('error')
          })
      })
  }, [])

  // Load stats for a specific period
  const loadStats = useCallback(async (period = 'today') => {
    try {
      const data = await api(`/stats?period=${period}`)
      setStats(prev => ({ ...prev, [period]: data }))
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }, [])

  // Cycle through periods for the header toggle
  const cyclePeriod = useCallback(() => {
    const periods = ['today', 'week', 'all']
    const currentIndex = periods.indexOf(statsPeriod)
    const nextPeriod = periods[(currentIndex + 1) % periods.length]
    setStatsPeriod(nextPeriod)
    if (!stats?.[nextPeriod]) {
      loadStats(nextPeriod)
    }
  }, [statsPeriod, stats, loadStats])

  // Load seller stats
  const loadSellerStats = useCallback(async (period = 'today') => {
    try {
      const data = await api(`/analytics/by-seller?period=${period}`)
      setSellerStats(data)
    } catch (err) {
      console.error('Failed to load seller stats:', err)
    }
  }, [])

  // Load Sankey data
  const loadSankeyData = useCallback(async (period = 'all') => {
    try {
      const data = await api(`/analytics/sankey?period=${period}`)
      setSankeyData(data)
    } catch (err) {
      console.error('Failed to load sankey data:', err)
    }
  }, [])

  // Load browse data (with timeline when no filters)
  const loadBrowseData = useCallback(async (filters = {}, offset = 0) => {
    try {
      const hasFilters = Object.keys(filters).some(k => filters[k] !== undefined)

      if (!hasFilters && offset === 0) {
        // Use timeline API to include events when no filters
        const data = await api(`/timeline?limit=50&offset=${offset}`)
        setBrowseData({
          total: data.items.length,
          records: data.items,
          has_more: data.has_more
        })
      } else {
        // Use filtered browse API
        const params = new URLSearchParams()
        if (filters.engaged !== undefined) params.set('engaged', filters.engaged)
        if (filters.sale_types) params.set('sale_types', filters.sale_types)
        if (filters.personas) params.set('personas', filters.personas)
        if (filters.seller_ids) params.set('seller_ids', filters.seller_ids)
        params.set('offset', offset)
        params.set('limit', 50)

        const data = await api(`/interactions/browse?${params.toString()}`)
        setBrowseData(data)
      }
    } catch (err) {
      console.error('Failed to load browse data:', err)
    }
  }, [])

  // Load trash data
  const loadTrashData = useCallback(async () => {
    try {
      const data = await api('/interactions/trash')
      setTrashData(data)
    } catch (err) {
      console.error('Failed to load trash:', err)
    }
  }, [])

  // Select seller
  const selectSeller = async (sellerId) => {
    try {
      await api('/session/select-seller', {
        method: 'POST',
        body: JSON.stringify({ seller_id: sellerId })
      })
      const updatedSession = await api('/session')
      setSession(updatedSession)
      setScreen('home')
      loadStats()
    } catch (err) {
      alert('Failed to select seller: ' + err.message)
    }
  }

  // Start conversation flow
  const startConversation = () => {
    setFlowData({})
    setScreen('flow-persona')
  }

  // Quick walk-by log
  const logWalkBy = async () => {
    try {
      await api('/interactions', {
        method: 'POST',
        body: JSON.stringify({
          interaction_type: 'walk_by'
        })
      })
      setConfirmation({ type: 'walk_by' })
      loadStats()
      setTimeout(() => {
        setConfirmation(null)
      }, 1200)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    }
  }

  // Handle flow navigation
  const handleFlowNext = (key, value) => {
    let newData
    // Spread quantity_price data (quantity, unit_price, total_amount) to top level
    if (key === 'quantity_price') {
      newData = { ...flowData, ...value }
    } else {
      newData = { ...flowData, [key]: value }
    }
    setFlowData(newData)

    if (key === 'persona') {
      setScreen('flow-hook')
    } else if (key === 'hook') {
      setScreen('flow-outcome')
    } else if (key === 'sale_type') {
      if (value === 'none') {
        setScreen('flow-objection')
      } else if (value === 'single') {
        setScreen('flow-quantity')
      } else {
        setScreen('flow-lead')
      }
    } else if (key === 'objection') {
      setScreen('flow-lead')
    } else if (key === 'quantity_price') {
      setScreen('flow-lead')
    } else if (key === 'lead_type') {
      submitConversation(newData)
    }
  }

  // Submit conversation
  const submitConversation = async (data) => {
    try {
      const payload = {
        interaction_type: 'conversation',
        persona: data.persona,
        hook: data.hook,
        sale_type: data.sale_type,
        quantity: data.quantity || 1,
        unit_price: data.unit_price,
        total_amount: data.total_amount,
        lead_type: data.lead_type,
        objection: data.objection
      }

      await api('/interactions', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      showConfirmation(data)
      loadStats()
    } catch (err) {
      alert('Failed to save: ' + err.message)
      setScreen('home')
    }
  }

  // Show confirmation overlay
  const showConfirmation = (data) => {
    setConfirmation(data)
    setTimeout(() => {
      setConfirmation(null)
      setScreen('home')
    }, 1500)
  }

  // Update interaction (notes, delete)
  const updateInteraction = async (id, updates) => {
    try {
      const data = await api(`/interactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      })
      // Refresh browse data
      loadBrowseData(browseFilters)
      return data
    } catch (err) {
      alert('Failed to update: ' + err.message)
    }
  }

  // Restore interaction
  const restoreInteraction = async (id) => {
    try {
      await api(`/interactions/${id}/restore`, { method: 'POST' })
      loadTrashData()
      loadBrowseData(browseFilters)
    } catch (err) {
      alert('Failed to restore: ' + err.message)
    }
  }

  // Log event
  const logEvent = async (description) => {
    try {
      await api('/events', {
        method: 'POST',
        body: JSON.stringify({ description })
      })
      setEventModal(false)
      setConfirmation({ type: 'event', description })
      setTimeout(() => setConfirmation(null), 1200)
    } catch (err) {
      alert('Failed to log event: ' + err.message)
    }
  }

  // Render based on screen
  if (screen === 'loading') {
    return <LoadingScreen />
  }

  if (screen === 'error') {
    return <ErrorScreen message={error} />
  }

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          session={session}
          staff={staff}
          stats={stats}
          statsPeriod={statsPeriod}
          onCyclePeriod={cyclePeriod}
          onConversation={startConversation}
          onWalkBy={logWalkBy}
          onViewStats={() => {
            loadSellerStats(statsPeriod)
            setScreen('stats')
          }}
          onLogEvent={() => setEventModal(true)}
        />
      )}

      {screen === 'stats' && (
        <StatsScreen
          stats={stats}
          statsPeriod={statsPeriod}
          onPeriodChange={(p) => {
            setStatsPeriod(p)
            if (!stats?.[p]) loadStats(p)
          }}
          sellerStats={sellerStats}
          sankeyData={sankeyData}
          onLoadSellerStats={loadSellerStats}
          onLoadSankey={loadSankeyData}
          onBack={() => setScreen('home')}
          onBrowse={() => {
            loadBrowseData({})
            setScreen('browse')
          }}
          onSankey={() => {
            loadSankeyData('all')
            setScreen('sankey')
          }}
          onConfig={() => setScreen('config')}
        />
      )}

      {screen === 'browse' && (
        <BrowseScreen
          data={browseData}
          filters={browseFilters}
          sellers={session?.available_sellers || []}
          onFiltersChange={(f) => {
            setBrowseFilters(f)
            loadBrowseData(f)
          }}
          onLoadMore={() => loadBrowseData(browseFilters, browseData?.records?.length || 0)}
          onSelect={(item) => {
            setSelectedInteraction(item)
            setScreen('detail')
          }}
          onBack={() => setScreen('stats')}
          onTrash={() => {
            loadTrashData()
            setScreen('trash')
          }}
        />
      )}

      {screen === 'detail' && selectedInteraction && (
        <DetailScreen
          interaction={selectedInteraction}
          onBack={() => {
            setSelectedInteraction(null)
            setScreen('browse')
          }}
          onAddNote={() => setNotesModal(selectedInteraction)}
          onDelete={() => setDeleteModal(selectedInteraction)}
        />
      )}

      {screen === 'trash' && (
        <TrashScreen
          data={trashData}
          onRestore={restoreInteraction}
          onBack={() => setScreen('browse')}
        />
      )}

      {screen === 'sankey' && (
        <SankeyScreen
          data={sankeyData}
          onPeriodChange={loadSankeyData}
          onBack={() => setScreen('stats')}
        />
      )}

      {screen === 'config' && (
        <ConfigScreen
          session={session}
          onBack={() => setScreen('stats')}
        />
      )}

      {screen === 'flow-persona' && (
        <FlowPersona
          onSelect={(v) => handleFlowNext('persona', v)}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'flow-hook' && (
        <FlowHook
          onSelect={(v) => handleFlowNext('hook', v)}
          onBack={() => setScreen('flow-persona')}
        />
      )}

      {screen === 'flow-outcome' && (
        <FlowOutcome
          onSelect={(v) => handleFlowNext('sale_type', v)}
          onBack={() => setScreen('flow-hook')}
        />
      )}

      {screen === 'flow-objection' && (
        <FlowObjection
          onSelect={(v) => handleFlowNext('objection', v)}
          onBack={() => setScreen('flow-outcome')}
        />
      )}

      {screen === 'flow-quantity' && (
        <FlowQuantity
          onSubmit={(data) => {
            setFlowData({ ...flowData, ...data })
            handleFlowNext('quantity_price', data)
          }}
          onBack={() => setScreen('flow-outcome')}
        />
      )}

      {screen === 'flow-lead' && (
        <FlowLead
          onSelect={(v) => handleFlowNext('lead_type', v)}
          onBack={() => {
            if (flowData.sale_type === 'none') {
              setScreen('flow-objection')
            } else if (flowData.sale_type === 'single') {
              setScreen('flow-quantity')
            } else {
              setScreen('flow-outcome')
            }
          }}
        />
      )}

      {confirmation && <ConfirmationOverlay data={confirmation} flowData={flowData} />}

      {notesModal && (
        <NotesModal
          interaction={notesModal}
          onSave={async (notes) => {
            await updateInteraction(notesModal.id, { notes })
            setNotesModal(null)
            // Refresh selected interaction
            const updated = await api(`/interactions/${notesModal.id}`)
            setSelectedInteraction(updated)
          }}
          onClose={() => setNotesModal(null)}
        />
      )}

      {deleteModal && (
        <DeleteModal
          interaction={deleteModal}
          onConfirm={async () => {
            await updateInteraction(deleteModal.id, { deleted: true })
            setDeleteModal(null)
            setSelectedInteraction(null)
            setScreen('browse')
          }}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {eventModal && (
        <EventModal
          onSave={logEvent}
          onClose={() => setEventModal(false)}
        />
      )}
    </div>
  )
}

// Loading Screen
function LoadingScreen() {
  return (
    <div className="screen loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <svg viewBox="0 0 100 100" className="bulb-icon">
            <ellipse cx="50" cy="40" rx="28" ry="32" fill="#FFF9E6" stroke="#F5DEB3" strokeWidth="2"/>
            <circle cx="50" cy="35" r="10" fill="#FFD700"/>
            <rect x="40" y="68" width="20" height="4" rx="1" fill="#A0A0A0"/>
            <rect x="42" y="72" width="16" height="3" rx="1" fill="#909090"/>
            <rect x="44" y="75" width="12" height="3" rx="1" fill="#808080"/>
          </svg>
        </div>
        <p>Connecting...</p>
      </div>
    </div>
  )
}

// Error Screen
function ErrorScreen({ message }) {
  return (
    <div className="screen error-screen">
      <div className="error-content">
        <div className="error-icon">!</div>
        <h2>Connection Error</h2>
        <p>{message}</p>
        <p className="error-hint">Make sure you're connected via Tailscale and your device is registered.</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  )
}

// Seller Selection Screen (Phase 3)
function SellerSelectScreen({ session, onSelect }) {
  return (
    <div className="screen seller-select-screen">
      <header className="seller-header">
        <div className="brand-mark">
          <svg viewBox="0 0 40 40" className="brand-icon">
            <ellipse cx="20" cy="16" rx="11" ry="13" fill="#FFF9E6" stroke="#F5DEB3" strokeWidth="1"/>
            <circle cx="20" cy="14" r="4" fill="#FFD700"/>
            <rect x="16" y="27" width="8" height="2" rx="1" fill="#A0A0A0"/>
          </svg>
          <span className="brand-name">Lumicello</span>
        </div>
        <p className="brand-subtitle">K Village 2025</p>
      </header>

      <div className="seller-content">
        <h2>Who's selling now?</h2>

        <div className="seller-list">
          {session?.available_sellers?.map(seller => (
            <button
              key={seller.id}
              className="seller-card"
              onClick={() => onSelect(seller.id)}
            >
              <div className="seller-avatar">{seller.display_name?.charAt(0)}</div>
              <span className="seller-name">{seller.display_name}</span>
            </button>
          ))}
        </div>

        <p className="seller-hint">
          Using device: {session?.device_name}<br/>
          This can be changed anytime
        </p>
      </div>
    </div>
  )
}

// Home Screen
function HomeScreen({ session, staff, stats, statsPeriod, onCyclePeriod, onConversation, onWalkBy, onViewStats, onLogEvent }) {
  const displayName = session?.active_seller?.display_name || staff?.name || 'Staff'
  const periodLabels = { today: 'Today', week: 'Week', all: 'All Time' }
  const currentStats = stats?.[statsPeriod]

  return (
    <div className="screen home-screen">
      <header className="home-header">
        <div className="brand-mark">
          <svg viewBox="0 0 40 40" className="brand-icon">
            <ellipse cx="20" cy="16" rx="11" ry="13" fill="#FFF9E6" stroke="#F5DEB3" strokeWidth="1"/>
            <circle cx="20" cy="14" r="4" fill="#FFD700"/>
            <rect x="16" y="27" width="8" height="2" rx="1" fill="#A0A0A0"/>
            <rect x="17" y="29" width="6" height="1.5" rx="0.5" fill="#808080"/>
          </svg>
          <span className="brand-name">Lumicello</span>
        </div>
        <div className="header-actions">
          <button className="btn-stats-icon" onClick={onViewStats}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6"/>
            </svg>
          </button>
        </div>
      </header>

      <div className="stats-ribbon">
        <button className="period-toggle" onClick={onCyclePeriod}>
          <span className="period-label">{periodLabels[statsPeriod]}</span>
          <svg viewBox="0 0 12 12" className="period-chevron">
            <path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="ribbon-divider" />
        <div className="ribbon-stat">
          <span className="ribbon-value">{currentStats?.visitors || 0}</span>
          <span className="ribbon-label">visitors</span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat">
          <span className="ribbon-value">{currentStats?.conversations || 0}</span>
          <span className="ribbon-label">convos</span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat">
          <span className="ribbon-value">{currentStats?.sales?.count || 0}</span>
          <span className="ribbon-label">sales</span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat highlight">
          <span className="ribbon-value">{formatBaht(currentStats?.sales?.revenue)}</span>
          <span className="ribbon-label">revenue</span>
        </div>
      </div>

      <div className="home-actions">
        <button className="action-card action-conversation" onClick={onConversation}>
          <div className="action-icon-wrap">
            <span className="action-icon">💬</span>
          </div>
          <div className="action-text">
            <h2>Log Conversation</h2>
            <p>Full interaction details</p>
          </div>
          <div className="action-arrow">→</div>
        </button>

        <button className="action-card action-walkby" onClick={onWalkBy}>
          <div className="action-icon-wrap">
            <span className="action-icon">👋</span>
          </div>
          <div className="action-text">
            <h2>Walk-by</h2>
            <p>Paused but didn't engage</p>
          </div>
          <div className="action-counter">
            <span className="counter-value">+1</span>
          </div>
        </button>
      </div>

      <footer className="home-footer">
        <div className="footer-user">
          <div className="user-avatar">{displayName.charAt(0)}</div>
          <span className="user-name">{displayName}</span>
        </div>
        <div className="footer-location">K Village</div>
      </footer>

      {/* Floating Milestone Button */}
      <button className="fab-milestone" onClick={onLogEvent}>
        <svg viewBox="0 0 24 24" fill="none" className="fab-icon">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="fab-label">Mark Milestone</span>
      </button>
    </div>
  )
}

// Stats Screen (Updated with Phase 2 & 3)
function StatsScreen({ stats, statsPeriod, onPeriodChange, sellerStats, sankeyData, onLoadSellerStats, onLoadSankey, onBack, onBrowse, onSankey, onConfig }) {
  const data = stats?.[statsPeriod]

  const handlePeriodChange = (p) => {
    onPeriodChange(p)
    onLoadSellerStats(p)
    onLoadSankey(p)
  }

  // Load sankey data on mount
  useEffect(() => {
    onLoadSankey(statsPeriod)
  }, [])

  const totalPriceSales = (data?.price_validation?.price_990 || 0) + (data?.price_validation?.price_1290 || 0)

  return (
    <div className="screen stats-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>← Home</button>
        <span className="flow-title">Stats</span>
      </header>

      <div className="period-tabs">
        <button className={`tab ${statsPeriod === 'today' ? 'active' : ''}`} onClick={() => handlePeriodChange('today')}>Today</button>
        <button className={`tab ${statsPeriod === 'week' ? 'active' : ''}`} onClick={() => handlePeriodChange('week')}>Week</button>
        <button className={`tab ${statsPeriod === 'all' ? 'active' : ''}`} onClick={() => handlePeriodChange('all')}>All</button>
      </div>

      <div className="stats-content">
        {/* Sankey Diagram at top */}
        {sankeyData && (
          <section className="stats-section sankey-section">
            <h3>CUSTOMER JOURNEY</h3>
            <SankeyDiagram data={sankeyData} />
          </section>
        )}

        <section className="stats-section">
          <h3>REVENUE</h3>
          <div className="stat-row big">
            <span>{formatBaht(data?.sales?.revenue)}</span>
          </div>
          <div className="stat-row">
            <span>📦 {data?.sales?.boxes || 0} boxes</span>
            <span>{formatBaht(data?.sales?.avg_per_sale)} avg</span>
          </div>
        </section>

        {/* Seller Performance (Phase 3) */}
        {sellerStats?.sellers?.length > 0 && (
          <section className="stats-section">
            <h3>SELLER PERFORMANCE</h3>
            {sellerStats.sellers.map(seller => (
              <div key={seller.seller_id} className="seller-stats-card">
                <div className="seller-stats-header">
                  <div className="seller-avatar-small">{seller.display_name?.charAt(0)}</div>
                  <span className="seller-name">{seller.display_name}</span>
                </div>
                <div className="seller-stats-grid">
                  <div className="seller-stat">
                    <span className="stat-value">{seller.metrics.total_engaged}</span>
                    <span className="stat-label">Engaged</span>
                  </div>
                  <div className="seller-stat">
                    <span className="stat-value">{seller.metrics.total_sales}</span>
                    <span className="stat-label">Sales</span>
                  </div>
                  <div className="seller-stat">
                    <span className="stat-value">{formatBaht(seller.metrics.total_revenue)}</span>
                    <span className="stat-label">Revenue</span>
                  </div>
                  <div className="seller-stat">
                    <span className="stat-value">{Math.round(seller.metrics.conversion_rate * 100)}%</span>
                    <span className="stat-label">Conv.</span>
                  </div>
                </div>
                {seller.metrics.top_hook && (
                  <div className="seller-stats-insights">
                    Best hook: {seller.metrics.top_hook.replace('_', ' ')}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <section className="stats-section">
          <h3>PRICE VALIDATION</h3>
          <StatBar label="฿990 sale" value={data?.price_validation?.price_990 || 0} total={totalPriceSales} />
          <StatBar label="฿1,290 sticker" value={data?.price_validation?.price_1290 || 0} total={totalPriceSales} highlight />
        </section>

        <section className="stats-section">
          <h3>PRODUCT MIX</h3>
          <StatBar label="Single" value={data?.product_mix?.single || 0} total={data?.sales?.count || 1} />
          <StatBar label="3-Box Bundle" value={data?.product_mix?.bundle_3 || 0} total={data?.sales?.count || 1} />
          <StatBar label="Full Year" value={data?.product_mix?.full_year || 0} total={data?.sales?.count || 1} highlight />
        </section>

        <section className="stats-section">
          <h3>PERSONAS</h3>
          {['parent', 'gift_buyer', 'expat', 'future_parent'].map(p => (
            <StatBar key={p} label={p.replace('_', ' ')} value={data?.personas?.[p] || 0} total={data?.sales?.count || 1} />
          ))}
        </section>

        <section className="stats-section">
          <h3>HOOKS</h3>
          {['physical_kits', 'big_garden', 'signage'].map(h => (
            <StatBar key={h} label={h.replace('_', ' ')} value={data?.hooks?.[h] || 0} total={data?.conversations || 1} />
          ))}
        </section>

        <section className="stats-section">
          <h3>NO-SALE REASONS</h3>
          {['need_to_think', 'too_expensive', 'has_toys', 'age_mismatch', 'other'].map(o => (
            <StatBar key={o} label={o.replace(/_/g, ' ')} value={data?.objections?.[o] || 0} total={Object.values(data?.objections || {}).reduce((a, b) => a + b, 0) || 1} />
          ))}
        </section>

        <section className="stats-section">
          <h3>LEADS</h3>
          <div className="stat-row">
            <span>💚 LINE</span>
            <span>{data?.leads?.line || 0}</span>
          </div>
          <div className="stat-row">
            <span>📧 Email</span>
            <span>{data?.leads?.email || 0}</span>
          </div>
        </section>

        {/* Phase 2 Navigation Buttons */}
        <div className="stats-actions">
          <button className="btn-secondary" onClick={onBrowse}>📋 Browse Records</button>
          <button className="btn-secondary" onClick={onSankey}>📊 Customer Journey</button>
          <button className="btn-secondary" onClick={onConfig}>⚙️ Config</button>
        </div>
      </div>
    </div>
  )
}

// Transaction Browser Screen (Phase 2)
function BrowseScreen({ data, filters, sellers, onFiltersChange, onLoadMore, onSelect, onBack, onTrash }) {
  const [activeFilters, setActiveFilters] = useState(filters)

  const toggleFilter = (key, value) => {
    const newFilters = { ...activeFilters }
    if (key === 'engaged') {
      newFilters.engaged = newFilters.engaged === value ? undefined : value
    } else {
      const current = newFilters[key]?.split(',').filter(Boolean) || []
      if (current.includes(value)) {
        newFilters[key] = current.filter(v => v !== value).join(',') || undefined
      } else {
        newFilters[key] = [...current, value].join(',')
      }
    }
    setActiveFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    setActiveFilters({})
    onFiltersChange({})
  }

  const isActive = (key, value) => {
    if (key === 'engaged') return activeFilters.engaged === value
    return activeFilters[key]?.split(',').includes(value)
  }

  return (
    <div className="screen browse-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>← Stats</button>
        <span className="flow-title">Browse</span>
        <button className="btn-trash" onClick={onTrash}>🗑️</button>
      </header>

      <div className="filter-section">
        <div className="filter-row">
          <span className="filter-label">TYPE</span>
          <button className={`filter-chip ${isActive('engaged', true) ? 'active' : ''}`} onClick={() => toggleFilter('engaged', true)}>Engaged</button>
          <button className={`filter-chip ${isActive('engaged', false) ? 'active' : ''}`} onClick={() => toggleFilter('engaged', false)}>Walk-by</button>
        </div>

        <div className="filter-row">
          <span className="filter-label">PERSONA</span>
          {['parent', 'gift_buyer', 'expat'].map(p => (
            <button key={p} className={`filter-chip ${isActive('personas', p) ? 'active' : ''}`} onClick={() => toggleFilter('personas', p)}>
              {p.replace('_', ' ')}
            </button>
          ))}
        </div>

        {sellers.length > 0 && (
          <div className="filter-row">
            <span className="filter-label">SELLER</span>
            {sellers.map(s => (
              <button key={s.id} className={`filter-chip ${isActive('seller_ids', s.id) ? 'active' : ''}`} onClick={() => toggleFilter('seller_ids', s.id)}>
                {s.display_name}
              </button>
            ))}
          </div>
        )}

        {Object.keys(activeFilters).some(k => activeFilters[k] !== undefined) && (
          <button className="btn-clear-filters" onClick={clearFilters}>Clear filters</button>
        )}
      </div>

      <div className="browse-results">
        <p className="results-count">Showing {data?.records?.length || 0} of {data?.total || 0} records</p>

        <div className="interaction-list">
          {data?.records?.map(item => (
            <InteractionCard key={item.id} item={item} onClick={() => onSelect(item)} />
          ))}
        </div>

        {data?.has_more && (
          <button className="btn-load-more" onClick={onLoadMore}>Load More ↓</button>
        )}
      </div>
    </div>
  )
}

// Timeline Item Card Component (handles both interactions and events)
function InteractionCard({ item, onClick }) {
  // Handle milestone events
  if (item.type === 'event') {
    return (
      <div className="timeline-card milestone-card">
        <div className="card-time">{formatTime(item.timestamp)}</div>
        <div className="milestone-content">
          <div className="milestone-marker">
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#C75B39" stroke="#8B3A2F" strokeWidth="1"/>
              <line x1="4" y1="22" x2="4" y2="15" stroke="#8B3A2F" strokeWidth="2"/>
            </svg>
          </div>
          <div className="milestone-info">
            <span className="milestone-label">Milestone</span>
            <span className="milestone-text">{item.description}</span>
          </div>
        </div>
        <div className="card-meta">{item.seller_name || item.staff_name}</div>
      </div>
    )
  }

  // Handle interactions
  const getOutcomeLabel = () => {
    if (!item.engaged) return 'Walk-by'
    if (item.sale_type === 'none') return 'No Sale'
    if (item.sale_type === 'single') return `Single ${formatBaht(item.total_amount)}`
    if (item.sale_type === 'bundle_3') return 'Bundle 3'
    if (item.sale_type === 'full_year') return 'Full Year'
    return 'Unknown'
  }

  const personaLabel = item.persona ? item.persona.replace('_', ' ') : ''
  const hookIcon = item.hook === 'physical_kits' ? '📦' : item.hook === 'big_garden' ? '📱' : '🪧'
  const leadIcon = item.lead_type === 'line' ? '💚' : item.lead_type === 'email' ? '📧' : ''

  return (
    <div className="timeline-card interaction-card" onClick={onClick}>
      <div className="card-time">{formatTime(item.timestamp)}</div>
      <div className="card-content">
        <div className="card-main">
          {item.engaged ? (
            <>
              <span className="card-persona">{personaLabel}</span>
              <span className="card-arrow">→</span>
              <span className="card-outcome">{getOutcomeLabel()}</span>
            </>
          ) : (
            <span className="card-walkby">Walk-by (no engagement)</span>
          )}
        </div>
        {item.engaged && (
          <div className="card-details">
            {item.hook && <span>{hookIcon} {item.hook.replace('_', ' ')}</span>}
            {item.lead_type && item.lead_type !== 'none' && <span>{leadIcon}</span>}
            {item.objection && <span className="card-objection">🤔 {item.objection.replace(/_/g, ' ')}</span>}
          </div>
        )}
        <div className="card-meta">
          {item.seller_name || item.staff_name}
          {item.notes && <span className="has-notes">📝</span>}
        </div>
      </div>
      <div className="card-arrow-right">›</div>
    </div>
  )
}

// Detail Screen (Phase 2)
function DetailScreen({ interaction, onBack, onAddNote, onDelete }) {
  const i = interaction

  return (
    <div className="screen detail-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <span className="flow-title">Details</span>
        <button className="btn-delete" onClick={onDelete}>🗑️</button>
      </header>

      <div className="detail-content">
        <div className="detail-time">
          {formatTime(i.timestamp)} - {formatDate(i.timestamp)}
        </div>

        <div className="detail-card">
          {i.engaged ? (
            <>
              <div className="detail-row">
                <span className="detail-label">Persona</span>
                <span className="detail-value">{i.persona?.replace('_', ' ') || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Hook</span>
                <span className="detail-value">{i.hook?.replace('_', ' ') || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Outcome</span>
                <span className="detail-value">
                  {i.sale_type === 'none' ? 'No Sale' :
                   i.sale_type === 'single' ? `${i.quantity}× Single @ ${formatBaht(i.unit_price)}` :
                   i.sale_type === 'bundle_3' ? '3-Box Bundle' : 'Full Year'}
                </span>
              </div>
              {i.total_amount > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Total</span>
                  <span className="detail-value highlight">{formatBaht(i.total_amount)}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Lead</span>
                <span className="detail-value">{i.lead_type === 'line' ? '💚 LINE' : i.lead_type === 'email' ? '📧 Email' : 'None'}</span>
              </div>
              {i.objection && (
                <div className="detail-row">
                  <span className="detail-label">Objection</span>
                  <span className="detail-value">{i.objection.replace(/_/g, ' ')}</span>
                </div>
              )}
            </>
          ) : (
            <div className="detail-walkby">Walk-by (no engagement)</div>
          )}
          <div className="detail-row">
            <span className="detail-label">Staff</span>
            <span className="detail-value">{i.seller_name || i.staff_name} ({i.staff_device})</span>
          </div>
        </div>

        <div className="notes-section">
          <h3>NOTES</h3>
          {i.notes ? (
            <div className="notes-content">
              <p>{i.notes}</p>
              <button className="btn-edit-note" onClick={onAddNote}>Edit Note</button>
            </div>
          ) : (
            <button className="btn-add-note" onClick={onAddNote}>+ Add Note</button>
          )}
        </div>
      </div>
    </div>
  )
}

// Trash Screen (Phase 2)
function TrashScreen({ data, onRestore, onBack }) {
  return (
    <div className="screen trash-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>← Browse</button>
        <span className="flow-title">🗑️ Trash</span>
      </header>

      <div className="trash-content">
        <p className="trash-count">{data?.total || 0} deleted records</p>

        {data?.records?.map(item => (
          <div key={item.id} className="trash-card">
            <div className="trash-info">
              <span className="trash-time">{formatTime(item.timestamp)}</span>
              <span className="trash-type">{item.engaged ? item.persona?.replace('_', ' ') : 'Walk-by'}</span>
              <span className="trash-deleted">Deleted {formatRelativeTime(item.deleted_at)}</span>
            </div>
            <button className="btn-restore" onClick={() => onRestore(item.id)}>Restore</button>
          </div>
        ))}

        {(!data?.records || data.records.length === 0) && (
          <p className="trash-empty">No deleted records</p>
        )}

        <p className="trash-hint">Soft-deleted records are kept for 30 days.</p>
      </div>
    </div>
  )
}

// Sankey Screen (Phase 2) - Real SVG Sankey Diagram
function SankeyScreen({ data, onPeriodChange, onBack }) {
  const [period, setPeriod] = useState('all')

  const handlePeriodChange = (p) => {
    setPeriod(p)
    onPeriodChange(p)
  }

  if (!data) return <LoadingScreen />

  const m = data.metrics

  return (
    <div className="screen sankey-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>← Stats</button>
        <span className="flow-title">Customer Journey</span>
      </header>

      <div className="period-tabs">
        <button className={`tab ${period === 'today' ? 'active' : ''}`} onClick={() => handlePeriodChange('today')}>Today</button>
        <button className={`tab ${period === 'week' ? 'active' : ''}`} onClick={() => handlePeriodChange('week')}>Week</button>
        <button className={`tab ${period === 'all' ? 'active' : ''}`} onClick={() => handlePeriodChange('all')}>All</button>
      </div>

      <div className="sankey-content">
        {/* Real Sankey SVG Diagram */}
        <SankeyDiagram data={data} />

        {/* Conversion metrics */}
        <div className="conversion-metrics">
          <div className="metric-card">
            <span className="metric-label">Pause → Talk</span>
            <span className="metric-value">{Math.round(m.engaged_rate * 100)}%</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Talk → Sale</span>
            <span className="metric-value">{Math.round(m.conversion_rate * 100)}%</span>
          </div>
          <div className="metric-card">
            <span className="metric-label">Total Conv.</span>
            <span className="metric-value">{Math.round(m.overall_conversion * 100)}%</span>
          </div>
        </div>

        {/* Objection breakdown */}
        {Object.keys(data.objection_breakdown || {}).length > 0 && (
          <div className="objection-breakdown">
            <h3>NO-SALE REASONS</h3>
            {Object.entries(data.objection_breakdown).map(([key, value]) => (
              <div key={key} className="objection-row">
                <span>{key.replace(/_/g, ' ')}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="sankey-total">
          <span>Total Revenue</span>
          <span className="total-value">{formatBaht(m.total_revenue)}</span>
        </div>
      </div>
    </div>
  )
}

// SVG Sankey Diagram Component - Vertical Layout for Mobile
function SankeyDiagram({ data }) {
  const m = data.metrics
  const width = 320
  const height = 380
  const nodeHeight = 14
  const rowGap = 90

  // Node colors
  const colors = {
    all_paused: '#D4654A',
    not_engaged: '#8B7E74',
    engaged: '#4A7C59',
    no_sale: '#D4A84B',
    single: '#22c55e',
    bundle_3: '#16a34a',
    full_year: '#15803d'
  }

  const totalPaused = m.total_paused || 1
  const engagedTotal = m.engaged_count || 1
  const maxNodeWidth = width - 80

  // Row 1: All Paused (top)
  const row1Y = 30
  const pausedWidth = maxNodeWidth
  const pausedX = (width - pausedWidth) / 2

  // Row 2: Left + Engaged (middle)
  const row2Y = row1Y + rowGap
  const leftWidth = Math.max(40, (m.not_engaged / totalPaused) * maxNodeWidth)
  const engagedWidth = Math.max(40, (m.engaged_count / totalPaused) * maxNodeWidth)
  const gap2 = 20
  const totalRow2 = leftWidth + gap2 + engagedWidth
  const leftX = (width - totalRow2) / 2
  const engagedX = leftX + leftWidth + gap2

  // Row 3: Outcomes (bottom)
  const row3Y = row2Y + rowGap
  const saleNodes = data.nodes.filter(n => ['single', 'bundle_3', 'full_year'].includes(n.id) && n.value > 0)
  const outcomeNodes = [
    { id: 'no_sale', label: 'No Sale', value: m.no_sale_count, color: colors.no_sale },
    ...saleNodes.map(n => ({ ...n, color: colors[n.id] }))
  ].filter(n => n.value > 0)

  // Calculate outcome widths
  const outcomeWidths = outcomeNodes.map(n => ({
    ...n,
    width: Math.max(35, (n.value / engagedTotal) * engagedWidth)
  }))
  const gap3 = 8
  const totalRow3 = outcomeWidths.reduce((sum, n) => sum + n.width, 0) + (outcomeWidths.length - 1) * gap3
  let outcomeX = (width - totalRow3) / 2

  outcomeWidths.forEach(n => {
    n.x = outcomeX
    outcomeX += n.width + gap3
  })

  // Generate vertical curved paths
  const generateVerticalPath = (x1, w1, y1, x2, w2, y2) => {
    const midY = (y1 + y2) / 2
    return `
      M ${x1} ${y1}
      C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}
      L ${x2 + w2} ${y2}
      C ${x2 + w2} ${midY}, ${x1 + w1} ${midY}, ${x1 + w1} ${y1}
      Z
    `
  }

  // Calculate link positions
  const links = []

  // Paused -> Left
  const leftRatio = m.not_engaged / totalPaused
  links.push({
    path: generateVerticalPath(
      pausedX, pausedWidth * leftRatio, row1Y + nodeHeight,
      leftX, leftWidth, row2Y
    ),
    color: colors.not_engaged,
    opacity: 0.35
  })

  // Paused -> Engaged
  links.push({
    path: generateVerticalPath(
      pausedX + pausedWidth * leftRatio, pausedWidth * (1 - leftRatio), row1Y + nodeHeight,
      engagedX, engagedWidth, row2Y
    ),
    color: colors.engaged,
    opacity: 0.45
  })

  // Engaged -> Outcomes
  let engOffset = 0
  outcomeWidths.forEach(node => {
    const ratio = node.value / engagedTotal
    const sourceWidth = engagedWidth * ratio
    links.push({
      path: generateVerticalPath(
        engagedX + engOffset, sourceWidth, row2Y + nodeHeight,
        node.x, node.width, row3Y
      ),
      color: node.color,
      opacity: 0.45
    })
    engOffset += sourceWidth
  })

  return (
    <div className="sankey-diagram">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad-paused-v" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.all_paused} />
            <stop offset="100%" stopColor="#B84E36" />
          </linearGradient>
          <linearGradient id="grad-engaged-v" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.engaged} />
            <stop offset="100%" stopColor="#2D5A3D" />
          </linearGradient>
        </defs>

        {/* Links */}
        <g className="sankey-links">
          {links.map((link, i) => (
            <path key={i} d={link.path} fill={link.color} opacity={link.opacity} className="sankey-link"/>
          ))}
        </g>

        {/* Nodes */}
        <g className="sankey-nodes">
          {/* Row 1: All Paused */}
          <rect x={pausedX} y={row1Y} width={pausedWidth} height={nodeHeight} fill="url(#grad-paused-v)" rx="4"/>
          <text x={width / 2} y={row1Y - 8} className="node-label-center" textAnchor="middle">
            <tspan className="node-value">{m.total_paused}</tspan>
            <tspan className="node-name-inline" dx="6">walked by</tspan>
          </text>

          {/* Row 2: Left */}
          <rect x={leftX} y={row2Y} width={leftWidth} height={nodeHeight} fill={colors.not_engaged} rx="4"/>
          <text x={leftX + leftWidth / 2} y={row2Y + nodeHeight + 16} className="node-label-center" textAnchor="middle">
            <tspan className="node-value-small">{m.not_engaged}</tspan>
            <tspan className="node-name-inline" dx="4">left</tspan>
          </text>

          {/* Row 2: Engaged */}
          <rect x={engagedX} y={row2Y} width={engagedWidth} height={nodeHeight} fill="url(#grad-engaged-v)" rx="4"/>
          <text x={engagedX + engagedWidth / 2} y={row2Y + nodeHeight + 16} className="node-label-center" textAnchor="middle">
            <tspan className="node-value-small">{m.engaged_count}</tspan>
            <tspan className="node-name-inline" dx="4">engaged</tspan>
          </text>

          {/* Row 3: Outcomes */}
          {outcomeWidths.map(node => (
            <g key={node.id}>
              <rect x={node.x} y={row3Y} width={node.width} height={nodeHeight} fill={node.color} rx="4"/>
              <text x={node.x + node.width / 2} y={row3Y + nodeHeight + 14} className="node-label-center" textAnchor="middle">
                <tspan className="node-value-small">{node.value}</tspan>
              </text>
              <text x={node.x + node.width / 2} y={row3Y + nodeHeight + 28} className="node-name-bottom" textAnchor="middle">
                {node.label}
              </text>
            </g>
          ))}
        </g>

        {/* Conversion rates */}
        <g className="sankey-rates">
          <text x={width / 2} y={row1Y + nodeHeight + rowGap / 2 + 4} className="rate-label" textAnchor="middle">
            {Math.round(m.engaged_rate * 100)}% engaged
          </text>
          <text x={engagedX + engagedWidth / 2} y={row2Y + nodeHeight + rowGap / 2 + 20} className="rate-label" textAnchor="middle">
            {Math.round(m.conversion_rate * 100)}% converted
          </text>
        </g>
      </svg>
    </div>
  )
}

// Config Screen (Phase 3) - Device to Seller Mapping Admin
function ConfigScreen({ session, onBack }) {
  const [sellers, setSellers] = useState([])
  const [devices, setDevices] = useState([])
  const [newName, setNewName] = useState('')

  useEffect(() => {
    Promise.all([
      api('/sellers?active_only=false'),
      api('/devices')
    ]).then(([sellersData, devicesData]) => {
      setSellers(sellersData)
      setDevices(devicesData)
    }).catch(console.error)
  }, [])

  const addSeller = async () => {
    if (!newName.trim()) return
    try {
      await api('/sellers', {
        method: 'POST',
        body: JSON.stringify({ display_name: newName.trim() })
      })
      setNewName('')
      const updated = await api('/sellers?active_only=false')
      setSellers(updated)
    } catch (err) {
      alert('Failed to add seller: ' + err.message)
    }
  }

  const assignSellerToDevice = async (deviceName, sellerId) => {
    try {
      await api(`/devices/${encodeURIComponent(deviceName)}/assign`, {
        method: 'POST',
        body: JSON.stringify({ seller_id: sellerId || null })
      })
      const updated = await api('/devices')
      setDevices(updated)
    } catch (err) {
      alert('Failed to assign seller: ' + err.message)
    }
  }

  return (
    <div className="screen config-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>← Stats</button>
        <span className="flow-title">⚙️ Config</span>
      </header>

      <div className="config-content">
        <section className="config-section">
          <h3>DEVICE → SELLER MAPPING</h3>
          <p className="config-hint">Assign which seller uses each Tailscale device for analytics tracking.</p>

          {devices.map(device => (
            <div key={device.device_name} className="config-card device-card">
              <div className="config-info">
                <div className="device-icon">📱</div>
                <div>
                  <span className="config-name">{device.display_name || device.device_name}</span>
                  <span className="config-device">{device.device_name}</span>
                </div>
              </div>
              <select
                className="seller-select"
                value={device.active_seller || ''}
                onChange={(e) => assignSellerToDevice(device.device_name, e.target.value)}
              >
                <option value="">— Not assigned —</option>
                {sellers.filter(s => s.is_active).map(seller => (
                  <option key={seller.id} value={seller.id}>{seller.display_name}</option>
                ))}
              </select>
            </div>
          ))}

          {devices.length === 0 && (
            <p className="config-empty">No devices registered yet. Connect via Tailscale to register.</p>
          )}
        </section>

        <section className="config-section">
          <h3>SELLERS</h3>
          <p className="config-hint">People who sell at the booth.</p>

          {sellers.map(seller => (
            <div key={seller.id} className="config-card">
              <div className="config-info">
                <div className="seller-avatar-small">{seller.display_name?.charAt(0)}</div>
                <div>
                  <span className="config-name">{seller.display_name}</span>
                  <span className={`seller-status ${seller.is_active ? 'active' : 'inactive'}`}>
                    {seller.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          <div className="add-seller">
            <input
              type="text"
              placeholder="New seller name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSeller()}
            />
            <button onClick={addSeller}>+ Add</button>
          </div>
        </section>

        <section className="config-section">
          <h3>CURRENT DEVICE</h3>
          <p className="config-hint">
            You are on: <strong>{session?.device_name || 'Unknown'}</strong><br/>
            Assigned seller: <strong>{session?.active_seller?.display_name || 'Not assigned'}</strong>
          </p>
        </section>
      </div>
    </div>
  )
}

// Notes Modal (Phase 2)
function NotesModal({ interaction, onSave, onClose }) {
  const [notes, setNotes] = useState(interaction.notes || '')

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>📝 {interaction.notes ? 'Edit Note' : 'Add Note'}</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note about this interaction..."
          rows={5}
        />
        <p className="modal-hint">Notes are optional annotations for your records.</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={() => onSave(notes)}>Save ✓</button>
        </div>
      </div>
    </div>
  )
}

// Delete Confirmation Modal (Phase 2)
function DeleteModal({ interaction, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3>Delete this interaction?</h3>
        <p className="modal-info">
          {formatTime(interaction.timestamp)} - {interaction.engaged ? interaction.persona?.replace('_', ' ') : 'Walk-by'}
          {interaction.total_amount > 0 && ` - ${formatBaht(interaction.total_amount)}`}
        </p>
        <p className="modal-hint">This can be undone from the Trash view.</p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-delete-confirm" onClick={onConfirm}>🗑️ Delete</button>
        </div>
      </div>
    </div>
  )
}

// Event Modal - Milestone Marker
function EventModal({ onSave, onClose }) {
  const [description, setDescription] = useState('')
  const presets = [
    { icon: '🪧', label: 'New signage' },
    { icon: '📦', label: 'Restocked' },
    { icon: '🎄', label: 'Display change' },
    { icon: '☕', label: 'Break' },
  ]

  return (
    <div className="modal-overlay milestone-overlay" onClick={onClose}>
      <div className="modal-content milestone-modal" onClick={e => e.stopPropagation()}>
        <div className="milestone-header">
          <div className="milestone-flag">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#C75B39" stroke="#8B3A2F" strokeWidth="1.5"/>
              <line x1="4" y1="22" x2="4" y2="15" stroke="#8B3A2F" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>Mark a Milestone</h3>
          <p>Record booth changes to track their impact on sales</p>
        </div>

        <div className="milestone-presets">
          {presets.map(p => (
            <button
              key={p.label}
              className={`preset-chip ${description === p.label ? 'selected' : ''}`}
              onClick={() => setDescription(p.label)}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>

        <div className="milestone-custom">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Or type a custom milestone..."
            autoFocus
          />
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button
            className="btn-milestone-save"
            onClick={() => description.trim() && onSave(description.trim())}
            disabled={!description.trim()}
          >
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="currentColor"/>
              <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Plant Flag
          </button>
        </div>
      </div>
    </div>
  )
}

// Stat Bar Component
function StatBar({ label, value, total, highlight }) {
  const percent = total ? Math.round((value / total) * 100) : 0
  return (
    <div className={`stat-bar ${highlight ? 'highlight' : ''}`}>
      <div className="stat-bar-label">
        <span>{label}</span>
        <span>{value} ({percent}%)</span>
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// Progress Steps Component
function ProgressSteps({ current, total, labels }) {
  return (
    <div className="progress-steps">
      {labels.map((label, i) => (
        <div key={i} className={`progress-step ${i + 1 < current ? 'done' : ''} ${i + 1 === current ? 'active' : ''}`}>
          <div className="step-dot">{i + 1 < current ? '✓' : i + 1}</div>
          <span className="step-label">{label}</span>
        </div>
      ))}
    </div>
  )
}

const FLOW_LABELS = ['Who', 'Hook', 'Result', 'Lead']

// Flow: Persona
function FlowPersona({ onSelect, onBack }) {
  return (
    <div className="screen flow-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>✕</button>
        <ProgressSteps current={1} total={4} labels={FLOW_LABELS} />
      </header>
      <div className="flow-content">
        <h2 className="flow-question">Who are they?</h2>
        <div className="flow-grid">
          <button className="flow-option" onClick={() => onSelect('parent')}>
            <span className="option-icon">👶</span>
            <span className="option-label">Parent</span>
          </button>
          <button className="flow-option" onClick={() => onSelect('gift_buyer')}>
            <span className="option-icon">🎁</span>
            <span className="option-label">Gift Buyer</span>
          </button>
          <button className="flow-option" onClick={() => onSelect('expat')}>
            <span className="option-icon">🌏</span>
            <span className="option-label">Expat</span>
          </button>
          <button className="flow-option" onClick={() => onSelect('future_parent')}>
            <span className="option-icon">🤰</span>
            <span className="option-label">Future Parent</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Flow: Hook
function FlowHook({ onSelect, onBack }) {
  return (
    <div className="screen flow-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <ProgressSteps current={2} total={4} labels={FLOW_LABELS} />
      </header>
      <div className="flow-content">
        <h2 className="flow-question">What drew them in?</h2>
        <div className="flow-stack">
          <button className="flow-option-wide" onClick={() => onSelect('physical_kits')}>
            <span className="option-icon">📦</span>
            <span className="option-label">Physical Kits</span>
          </button>
          <button className="flow-option-wide" onClick={() => onSelect('big_garden')}>
            <span className="option-icon">📱</span>
            <span className="option-label">Big Garden Screen</span>
          </button>
          <button className="flow-option-wide" onClick={() => onSelect('signage')}>
            <span className="option-icon">🪧</span>
            <span className="option-label">Signage / Walk-in</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Flow: Outcome
function FlowOutcome({ onSelect, onBack }) {
  return (
    <div className="screen flow-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <ProgressSteps current={3} total={4} labels={FLOW_LABELS} />
      </header>
      <div className="flow-content">
        <h2 className="flow-question">What happened?</h2>
        <div className="flow-stack">
          <button className="flow-option-wide outcome-nosale" onClick={() => onSelect('none')}>
            <span className="option-icon">❌</span>
            <span className="option-label">No Sale</span>
          </button>
          <button className="flow-option-wide outcome-sale" onClick={() => onSelect('single')}>
            <span className="option-icon">1️⃣</span>
            <span className="option-label">Single Box</span>
          </button>
          <button className="flow-option-wide outcome-sale" onClick={() => onSelect('bundle_3')}>
            <span className="option-icon">3️⃣</span>
            <span className="option-label">3-Box Bundle</span>
            <span className="option-price">฿2,690</span>
          </button>
          <button className="flow-option-wide outcome-sale" onClick={() => onSelect('full_year')}>
            <span className="option-icon">📅</span>
            <span className="option-label">Full Year</span>
            <span className="option-price">฿4,990</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Flow: Objection
function FlowObjection({ onSelect, onBack }) {
  return (
    <div className="screen flow-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <ProgressSteps current={3} total={4} labels={FLOW_LABELS} />
      </header>
      <div className="flow-content">
        <h2 className="flow-question">Why no sale?</h2>
        <div className="flow-stack">
          <button className="flow-option-wide" onClick={() => onSelect('too_expensive')}>
            <span className="option-icon">💰</span>
            <span className="option-label">แพงไป (Too expensive)</span>
          </button>
          <button className="flow-option-wide" onClick={() => onSelect('has_toys')}>
            <span className="option-icon">🧸</span>
            <span className="option-label">มีของเล่นแล้ว (Has toys)</span>
          </button>
          <button className="flow-option-wide" onClick={() => onSelect('need_to_think')}>
            <span className="option-icon">🤔</span>
            <span className="option-label">ขอคิดก่อน (Thinking)</span>
          </button>
          <button className="flow-option-wide" onClick={() => onSelect('age_mismatch')}>
            <span className="option-icon">👶</span>
            <span className="option-label">อายุไม่ตรง (Age off)</span>
          </button>
          <button className="flow-option-wide" onClick={() => onSelect('other')}>
            <span className="option-icon">❓</span>
            <span className="option-label">Other</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Flow: Quantity
function FlowQuantity({ onSubmit, onBack }) {
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(null)
  const total = quantity * (price || 0)

  const handleContinue = () => {
    if (!price) return
    onSubmit({ quantity, unit_price: price, total_amount: total })
  }

  return (
    <div className="screen flow-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <ProgressSteps current={3} total={4} labels={FLOW_LABELS} />
      </header>
      <div className="flow-content">
        <h2 className="flow-question">How many boxes?</h2>
        <div className="quantity-picker">
          <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
          <span className="qty-value">{quantity}</span>
          <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
        </div>
        <div className="divider" />
        <h2 className="flow-question">Price paid per box?</h2>
        <div className="flow-grid">
          <button className={`flow-option ${price === 990 ? 'selected' : ''}`} onClick={() => setPrice(990)}>
            <span className="option-label">฿990</span>
            <span className="option-sublabel">Sale</span>
          </button>
          <button className={`flow-option ${price === 1290 ? 'selected' : ''}`} onClick={() => setPrice(1290)}>
            <span className="option-label">฿1,290</span>
            <span className="option-sublabel">Sticker</span>
          </button>
        </div>
        {price && <div className="total-display">Total: {formatBaht(total)}</div>}
        <button className="btn-continue" onClick={handleContinue} disabled={!price}>Continue →</button>
      </div>
    </div>
  )
}

// Flow: Lead
function FlowLead({ onSelect, onBack }) {
  return (
    <div className="screen flow-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>←</button>
        <ProgressSteps current={4} total={4} labels={FLOW_LABELS} />
      </header>
      <div className="flow-content">
        <h2 className="flow-question">Lead captured?</h2>
        <div className="flow-stack">
          <button className="flow-option-wide lead-line" onClick={() => onSelect('line')}>
            <span className="option-icon">💚</span>
            <span className="option-label">LINE</span>
          </button>
          <button className="flow-option-wide" onClick={() => onSelect('email')}>
            <span className="option-icon">📧</span>
            <span className="option-label">Email</span>
          </button>
          <button className="flow-option-wide lead-none" onClick={() => onSelect('none')}>
            <span className="option-icon">➖</span>
            <span className="option-label">None</span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Confirmation Overlay
function ConfirmationOverlay({ data, flowData }) {
  if (data?.type === 'walk_by') {
    return (
      <div className="confirmation-overlay walkby-confirm">
        <div className="confirmation-card scale-in">
          <div className="walkby-icon">👋</div>
          <h3>Walk-by logged</h3>
        </div>
      </div>
    )
  }

  if (data?.type === 'event') {
    return (
      <div className="confirmation-overlay milestone-confirm">
        <div className="confirmation-card scale-in">
          <div className="milestone-flag-confirm">
            <svg viewBox="0 0 24 24" fill="none" width="48" height="48">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#C75B39" stroke="#8B3A2F" strokeWidth="1.5"/>
              <line x1="4" y1="22" x2="4" y2="15" stroke="#8B3A2F" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3>Milestone planted!</h3>
          <p className="event-desc">{data.description}</p>
        </div>
      </div>
    )
  }

  const getLabel = (key, value) => {
    const labels = {
      persona: { parent: 'Parent', gift_buyer: 'Gift Buyer', expat: 'Expat', future_parent: 'Future Parent' },
      hook: { physical_kits: 'Physical Kits', big_garden: 'Big Garden', signage: 'Signage' },
      sale_type: { none: 'No Sale', single: 'Single', bundle_3: '3-Box Bundle', full_year: 'Full Year' },
      lead_type: { line: 'LINE signup', email: 'Email signup', none: 'No lead' }
    }
    return labels[key]?.[value] || value
  }

  const allData = { ...flowData, ...data }

  return (
    <div className="confirmation-overlay">
      <div className="confirmation-card scale-in">
        <div className="confirmation-check">
          <svg viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="25" fill="none" stroke="currentColor" strokeWidth="2" />
            <path fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M14 27l8 8 16-16" style={{ strokeDasharray: 50, animation: 'checkmark 0.5s ease-out forwards' }} />
          </svg>
        </div>
        <h3>Saved!</h3>
        <div className="confirmation-details">
          <p>{getLabel('persona', allData.persona)} → {getLabel('hook', allData.hook)}</p>
          {allData.sale_type === 'single' && <p>{allData.quantity}× Single @ {formatBaht(allData.unit_price)} = {formatBaht(allData.total_amount)}</p>}
          {allData.sale_type === 'bundle_3' && <p>3-Box Bundle {formatBaht(2690)}</p>}
          {allData.sale_type === 'full_year' && <p>Full Year {formatBaht(4990)}</p>}
          {allData.sale_type === 'none' && <p>No sale - {getLabel('objection', allData.objection)?.replace(/_/g, ' ')}</p>}
          <p>{getLabel('lead_type', allData.lead_type)}</p>
        </div>
      </div>
    </div>
  )
}

export default App
