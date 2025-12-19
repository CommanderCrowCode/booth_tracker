import { useState, useEffect, useCallback } from 'react'
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
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [flowData, setFlowData] = useState({})
  const [confirmation, setConfirmation] = useState(null)

  // Initialize app - identify staff
  useEffect(() => {
    api('/whoami')
      .then(data => {
        setStaff(data)
        setScreen('home')
        loadStats()
      })
      .catch(err => {
        setError(err.message)
        setScreen('error')
      })
  }, [])

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const [today, week] = await Promise.all([
        api('/stats?period=today'),
        api('/stats?period=week')
      ])
      setStats({ today, week })
    } catch (err) {
      console.error('Failed to load stats:', err)
    }
  }, [])

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
    const newData = { ...flowData, [key]: value }
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
        // bundle_3 or full_year - skip to lead
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
          staff={staff}
          stats={stats}
          onConversation={startConversation}
          onWalkBy={logWalkBy}
          onViewStats={() => setScreen('stats')}
        />
      )}

      {screen === 'stats' && (
        <StatsScreen
          stats={stats}
          onBack={() => setScreen('home')}
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

// Home Screen - Dual action with walk-by
function HomeScreen({ staff, stats, onConversation, onWalkBy, onViewStats }) {
  return (
    <div className="screen home-screen">
      {/* Header with brand */}
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
        <button className="btn-stats-icon" onClick={onViewStats}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
        </button>
      </header>

      {/* Stats ribbon */}
      <div className="stats-ribbon">
        <div className="ribbon-stat">
          <span className="ribbon-value">{stats?.today?.visitors || 0}</span>
          <span className="ribbon-label">visitors</span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat">
          <span className="ribbon-value">{stats?.today?.conversations || 0}</span>
          <span className="ribbon-label">convos</span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat">
          <span className="ribbon-value">{stats?.today?.sales?.count || 0}</span>
          <span className="ribbon-label">sales</span>
        </div>
        <div className="ribbon-divider" />
        <div className="ribbon-stat highlight">
          <span className="ribbon-value">{formatBaht(stats?.today?.sales?.revenue)}</span>
          <span className="ribbon-label">revenue</span>
        </div>
      </div>

      {/* Main action buttons */}
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

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-user">
          <div className="user-avatar">{staff?.name?.charAt(0) || '?'}</div>
          <span className="user-name">{staff?.name}</span>
        </div>
        <div className="footer-location">K Village</div>
      </footer>
    </div>
  )
}

// Stats Screen
function StatsScreen({ stats, onBack }) {
  const [period, setPeriod] = useState('today')
  const data = period === 'today' ? stats?.today : stats?.week

  const calcPercent = (val, total) => total ? Math.round((val / total) * 100) : 0
  const totalVisitors = data?.visitors || 0
  const totalConvos = data?.conversations || 0
  const walkBys = data?.walk_bys || 0
  const totalPriceSales = (data?.price_validation?.price_990 || 0) + (data?.price_validation?.price_1290 || 0)

  return (
    <div className="screen stats-screen">
      <header className="flow-header">
        <button className="btn-back" onClick={onBack}>← Home</button>
        <span className="flow-title">Stats</span>
      </header>

      <div className="period-tabs">
        <button
          className={`tab ${period === 'today' ? 'active' : ''}`}
          onClick={() => setPeriod('today')}
        >Today</button>
        <button
          className={`tab ${period === 'week' ? 'active' : ''}`}
          onClick={() => setPeriod('week')}
        >Week</button>
      </div>

      <div className="stats-content">
        <section className="stats-section">
          <h3>TRAFFIC FUNNEL</h3>
          <div className="funnel">
            <div className="funnel-row">
              <span className="funnel-icon">👀</span>
              <span className="funnel-label">Walk-bys</span>
              <span className="funnel-value">{walkBys}</span>
            </div>
            <div className="funnel-arrow">↓</div>
            <div className="funnel-row">
              <span className="funnel-icon">💬</span>
              <span className="funnel-label">Conversations</span>
              <span className="funnel-value">{totalConvos}</span>
              <span className="funnel-pct">{walkBys ? `${calcPercent(totalConvos, walkBys + totalConvos)}%` : '-'}</span>
            </div>
            <div className="funnel-arrow">↓</div>
            <div className="funnel-row highlight">
              <span className="funnel-icon">🛒</span>
              <span className="funnel-label">Sales</span>
              <span className="funnel-value">{data?.sales?.count || 0}</span>
              <span className="funnel-pct">{totalConvos ? `${calcPercent(data?.sales?.count, totalConvos)}%` : '-'}</span>
            </div>
          </div>
        </section>

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

        <section className="stats-section">
          <h3>PRICE VALIDATION</h3>
          <StatBar
            label="฿990 sale"
            value={data?.price_validation?.price_990 || 0}
            total={totalPriceSales}
          />
          <StatBar
            label="฿1,290 sticker"
            value={data?.price_validation?.price_1290 || 0}
            total={totalPriceSales}
            highlight
          />
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
            <StatBar
              key={p}
              label={p.replace('_', ' ')}
              value={data?.personas?.[p] || 0}
              total={data?.sales?.count || 1}
            />
          ))}
        </section>

        <section className="stats-section">
          <h3>HOOKS</h3>
          {['physical_kits', 'big_garden', 'signage'].map(h => (
            <StatBar
              key={h}
              label={h.replace('_', ' ')}
              value={data?.hooks?.[h] || 0}
              total={totalConvos || 1}
            />
          ))}
        </section>

        <section className="stats-section">
          <h3>NO-SALE REASONS</h3>
          {['need_to_think', 'too_expensive', 'has_toys', 'age_mismatch', 'other'].map(o => (
            <StatBar
              key={o}
              label={o.replace(/_/g, ' ')}
              value={data?.objections?.[o] || 0}
              total={Object.values(data?.objections || {}).reduce((a, b) => a + b, 0) || 1}
            />
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
          <div className="step-dot">
            {i + 1 < current ? '✓' : i + 1}
          </div>
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

// Flow: Objection (if no sale)
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

// Flow: Quantity & Price (if single)
function FlowQuantity({ onSubmit, onBack }) {
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState(null)

  const total = quantity * (price || 0)

  const handleContinue = () => {
    if (!price) return
    onSubmit({
      quantity,
      unit_price: price,
      total_amount: total
    })
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
          <button
            className="qty-btn"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
          >−</button>
          <span className="qty-value">{quantity}</span>
          <button
            className="qty-btn"
            onClick={() => setQuantity(quantity + 1)}
          >+</button>
        </div>

        <div className="divider" />

        <h2 className="flow-question">Price paid per box?</h2>

        <div className="flow-grid">
          <button
            className={`flow-option ${price === 990 ? 'selected' : ''}`}
            onClick={() => setPrice(990)}
          >
            <span className="option-label">฿990</span>
            <span className="option-sublabel">Sale</span>
          </button>
          <button
            className={`flow-option ${price === 1290 ? 'selected' : ''}`}
            onClick={() => setPrice(1290)}
          >
            <span className="option-label">฿1,290</span>
            <span className="option-sublabel">Sticker</span>
          </button>
        </div>

        {price && (
          <div className="total-display">
            Total: {formatBaht(total)}
          </div>
        )}

        <button
          className="btn-continue"
          onClick={handleContinue}
          disabled={!price}
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

// Flow: Lead Capture
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
  // Walk-by confirmation
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
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 27l8 8 16-16"
              style={{
                strokeDasharray: 50,
                animation: 'checkmark 0.5s ease-out forwards'
              }}
            />
          </svg>
        </div>
        <h3>Saved!</h3>

        <div className="confirmation-details">
          <p>{getLabel('persona', allData.persona)} → {getLabel('hook', allData.hook)}</p>
          {allData.sale_type === 'single' && (
            <p>{allData.quantity}× Single @ {formatBaht(allData.unit_price)} = {formatBaht(allData.total_amount)}</p>
          )}
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
