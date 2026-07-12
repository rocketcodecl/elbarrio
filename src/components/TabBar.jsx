const Icon = {
  Home: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#16a34a' : '#9ca3af'} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Building: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#16a34a' : '#9ca3af'} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <path d="M10 22v-4h4v4"/>
    </svg>
  ),
  Bag: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#16a34a' : '#9ca3af'} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  ),
  Plus: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Chat: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#16a34a' : '#9ca3af'} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  User: ({ active }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#16a34a' : '#9ca3af'} strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

function TabBar({ activeTab, onChangeTab, onPublish, chatCount = 0 }) {
  const showPlus = activeTab === 'marketplace'
  const isActive = (tab) => activeTab === tab

  const renderTab = (id, label, IconCmp, badge = 0) => (
    <button key={id} onClick={() => onChangeTab(id)} style={s.tabBtn}>
      <div style={s.iconWrap}>
        <IconCmp active={isActive(id)} />
        {badge > 0 && <span style={s.badge}>{badge}</span>}
      </div>
      <span style={{ ...s.label, color: isActive(id) ? '#16a34a' : '#9ca3af' }}>
        {label}
      </span>
    </button>
  )

  return (
    <div style={s.wrap}>
      {renderTab('feed', 'Inicio', Icon.Home)}
      {renderTab('barrio', 'Barrio', Icon.Building)}

      <div style={s.marketWrap}>
        {renderTab('marketplace', 'Mercado', Icon.Bag)}
        {showPlus && (
          <button style={s.plusBtn} onClick={onPublish}>
            <Icon.Plus />
          </button>
        )}
      </div>

      {renderTab('chat', 'Chat', Icon.Chat, chatCount)}
      {renderTab('profile', 'Perfil', Icon.User)}
    </div>
  )
}

const s = {
  wrap: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    height: 66,
    backgroundColor: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.6)',
    borderRadius: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '8px 4px',
    zIndex: 50,
    boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    flex: 1,
    padding: 0
  },
  label: {
    fontSize: 10.5,
    fontWeight: 600
  },
  iconWrap: {
    position: 'relative',
    display: 'flex'
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: 9,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fff',
    padding: '0 3px',
    boxSizing: 'border-box'
  },
  marketWrap: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    justifyContent: 'center'
  },
  plusBtn: {
    position: 'absolute',
    top: -34,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 0 6px rgba(22,163,74,0.12), 0 0 20px rgba(22,163,74,0.35), 0 6px 16px rgba(22,163,74,0.45)',
    padding: 0,
    zIndex: 60
  }
}

export default TabBar