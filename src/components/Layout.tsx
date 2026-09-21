import { NavLink, Outlet } from 'react-router-dom'
import { Activity, BellRing, ChevronRight, CloudRain, History, Menu, Settings2, Wifi } from 'lucide-react'
import { useFloodData } from '../hooks/useFloodData'
import { FLOOD_LEVELS } from '../data/mockFloodData'

const links = [
  { to: '/', label: 'Overview', icon: Activity, end: true },
  { to: '/history', label: 'History', icon: History },
  { to: '/settings', label: 'Settings', icon: Settings2 },
]

export default function Layout() {
  const { data, isDemo } = useFloodData()
  const level = FLOOD_LEVELS[data.currentLevel]

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm"><CloudRain size={19} strokeWidth={2.5} /></div>
            <div><div className="text-sm font-extrabold tracking-[0.18em] text-slate-950">FLOOD_ALERT</div><div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Monitoring console</div></div>
          </div>
          <div className="px-4 pt-7">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Navigation</p>
            <nav className="mt-3 space-y-1">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}>
                  {({ isActive }) => <><link.icon size={18} strokeWidth={isActive ? 2.5 : 2} /><span>{link.label}</span>{isActive && <ChevronRight className="ml-auto text-slate-400" size={16} />}</>}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700"><span className={`h-2 w-2 rounded-full ${data.deviceOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />Device {data.deviceOnline ? 'online' : 'offline'}</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">ESP32 station<br />FLD-042 · Riverside</p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><Wifi size={12} /> {isDemo ? 'Demo feed' : 'Live feed'}</div>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-[#f5f7fa]/95 px-4 backdrop-blur sm:px-6 lg:px-10">
            <div className="flex items-center gap-3 lg:hidden"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600 text-white"><CloudRain size={19} strokeWidth={2.5} /></div><span className="text-sm font-extrabold tracking-[0.16em] text-slate-950">FLOOD_ALERT</span></div>
            <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Barangay Riverside · Manila</p><p className="mt-1 text-sm font-semibold text-slate-700">Flood monitoring dashboard</p></div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200/80 sm:flex"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: level.color }} />Status: <span className="text-slate-950">{level.shortLabel}</span></div>
              <button aria-label="Open menu" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm lg:hidden"><Menu size={18} /></button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">BR</div>
            </div>
          </header>
          <main className="mx-auto max-w-[1500px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-9"><Outlet /></main>
          <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
            {links.map((link) => <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-bold ${isActive ? 'text-slate-950' : 'text-slate-400'}`}><link.icon size={18} />{link.label}</NavLink>)}
            <div className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-bold text-slate-300"><BellRing size={18} />Alerts</div>
          </nav>
        </div>
      </div>
    </div>
  )
}