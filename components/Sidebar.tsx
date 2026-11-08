'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { NAV_ITEMS } from '@/lib/constants'

function NavIcon({ name }: { name: (typeof NAV_ITEMS)[number]['icon'] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'overview':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'stages':
      return (
        <svg {...common}>
          <path d="M4 19h16" />
          <path d="M7 16V9" />
          <path d="M12 16V5" />
          <path d="M17 16v-3" />
        </svg>
      )
    case 'messages':
      return (
        <svg {...common}>
          <path d="M4 6h16v12H4z" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      )
    case 'subscribers':
      return (
        <svg {...common}>
          <path d="M4 6h16v12H4z" />
          <path d="M9 12h6M12 9v6" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      )
  }
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>

      {open ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Image src="/lotus-icon-logo.png" alt="Stavarkling" width={36} height={36} className="sidebar-logo" />
          <div>
            <p className="sidebar-brand-name font-display">Stavarkling</p>
            <p className="sidebar-brand-sub">Admin</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-foot">
          <p className="sidebar-foot-label">Operations</p>
          <p className="sidebar-foot-text">
            Review applicants, advance access stages, and keep the private journey selective.
          </p>
          <button type="button" className="logout-btn" onClick={logout} disabled={loggingOut}>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>
    </>
  )
}
