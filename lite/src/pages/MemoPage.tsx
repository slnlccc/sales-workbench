import { useEffect, useState, useCallback, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Edit3, Trash2, X, CheckCircle, Circle } from 'lucide-react'
import { memoApi } from '@/lib/api'

const TYPE_OPTIONS = ['待办', '会议', '拜访', '电话', '其他']
const TYPE_COLORS: Record<string, string> = {
  '待办': 'bg-brand-50 text-brand-700 border-brand-200',
  '会议': 'bg-violet-50 text-violet-700 border-violet-200',
  '拜访': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '电话': 'bg-amber-50 text-amber-700 border-amber-200',
  '其他': 'bg-slate-100 text-slate-600 border-slate-200',
}
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const emptyForm = {
  title: '', date: '', startTime: '09:00', endTime: '',
  category: '工作', type: '待办', description: '',
}

type DayCells = { date: string; day: number; inMonth: boolean; isToday: boolean }[]

export default function MemoPage() {
  const [memos, setMemos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(() => new Date())
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await memoApi.list()
      setMemos(normalizeList(res))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // 按日期分组
  const memosByDate = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const m of memos) {
      const d = m.date
      if (!d) continue
      if (!map[d]) map[d] = []
      map[d].push(m)
    }
    // 同一天内按时间排序
    Object.values(map).forEach(list => {
      list.sort((a, b) => (a.startTime || a.time || '').localeCompare(b.startTime || b.time || ''))
    })
    return map
  }, [memos])

  // 生成月视图 cells
  const cells: DayCells = useMemo(() => {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDay = new Date(year, month, 1)
    // 周一为一周的第一天（0=周日 → 移到最后）
    const offset = (firstDay.getDay() + 6) % 7
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const list: DayCells[number][] = []
    const todayStr = new Date().toISOString().slice(0, 10)

    for (let i = 0; i < offset; i++) {
      const day = prevMonthDays - offset + 1 + i
      const d = new Date(year, month - 1, day)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      list.push({ date: dateStr, day, inMonth: false, isToday: dateStr === todayStr })
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      list.push({ date: dateStr, day, inMonth: true, isToday: dateStr === todayStr })
    }
    while (list.length % 7 !== 0 || list.length < 42) {
      const idx = list.length - (offset + daysInMonth) + 1
      const d = new Date(year, month + 1, idx)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      list.push({ date: dateStr, day: idx, inMonth: false, isToday: dateStr === todayStr })
      if (list.length >= 42) break
    }
    return list
  }, [cursor])

  const monthTitle = `${cursor.getFullYear()} 年 ${cursor.getMonth() + 1} 月`
  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
  const goToday = () => {
    const t = new Date()
    setCursor(t)
    setSelectedDate(t.toISOString().slice(0, 10))
  }

  const openAdd = (dateStr?: string) => {
    setForm({ ...emptyForm, date: dateStr || selectedDate })
    setEditing('new')
  }

  const openEdit = (m: any) => {
    setForm({
      title: m.title || '',
      date: m.date || '',
      startTime: m.startTime || m.time || '09:00',
      endTime: m.endTime || '',
      category: m.category || '工作',
      type: m.type || '待办',
      description: m.description || '',
    })
    setEditing(m._id)
  }

  const save = async () => {
    if (!form.title || !form.date || !form.startTime) {
      alert('标题、日期、开始时间为必填')
      return
    }
    setSaving(true)
    try {
      if (editing === 'new') {
        const created = await memoApi.create(form)
        setMemos((prev) => [normalizeItem(created), ...prev])
      } else {
        const updated = await memoApi.update(editing, form)
        setMemos((prev) => prev.map((m) => (m._id === editing ? normalizeItem(updated) : m)))
      }
      setEditing(null)
    } catch (err: any) {
      alert(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('确认删除此备忘？')) return
    try {
      await memoApi.delete(id)
      setMemos((prev) => prev.filter((m) => m._id !== id))
    } catch (err: any) {
      alert(err.message || '删除失败')
    }
  }

  const toggle = async (id: string) => {
    try {
      const updated = await memoApi.toggle(id)
      setMemos((prev) => prev.map((m) => (m._id === id ? normalizeItem(updated) : m)))
    } catch (err: any) {
      alert(err.message || '操作失败')
    }
  }

  const selectedList = (memosByDate[selectedDate] || []).sort((a, b) =>
    (a.startTime || a.time || '').localeCompare(b.startTime || b.time || '')
  )
  const monthCount = Object.keys(memosByDate).length

  if (loading) return <div className="text-center text-slate-400 py-20">加载中...</div>

  return (
    <div>
      {/* 顶部栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">工作备忘</h1>
          <p className="text-sm text-slate-400 mt-0.5">本月有 {monthCount} 天安排了事项</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="btn-secondary">今天</button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> 新增备忘
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* ====== 日历主体 ====== */}
        <div className="card p-4 lg:col-span-2">
          {/* 月份切换 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-base font-semibold text-slate-700 w-36 text-center">{monthTitle}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="text-xs text-slate-400">点击日期格子 → 右侧查看当天事项</div>
          </div>

          {/* 星期头 */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className={`text-center py-1.5 text-xs font-medium ${i >= 5 ? 'text-red-400' : 'text-slate-400'}`}>
                {w}
              </div>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => {
              const list = memosByDate[cell.date] || []
              const isSelected = cell.date === selectedDate
              const weekdayIdx = (new Date(cell.date).getDay() + 6) % 7
              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDate(cell.date)}
                  className={`
                    min-h-[92px] p-1.5 rounded-lg border text-left transition-colors
                    ${isSelected ? 'border-brand-400 ring-2 ring-brand-100 bg-brand-50/50' : 'border-slate-100 hover:border-slate-200 bg-white'}
                    ${!cell.inMonth ? 'bg-slate-50/50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`
                      inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium
                      ${cell.isToday ? 'bg-brand-600 text-white' : (cell.inMonth ? 'text-slate-600' : 'text-slate-300')}
                      ${weekdayIdx >= 5 && !cell.isToday ? 'text-red-400' : ''}
                    `}>
                      {cell.day}
                    </span>
                    {list.length > 0 && (
                      <span className="text-[10px] text-slate-400">{list.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {list.slice(0, 2).map((m) => (
                      <div
                        key={m._id}
                        onClick={(e) => { e.stopPropagation(); openEdit(m) }}
                        className={`
                          text-[11px] leading-snug px-1 py-0.5 rounded border truncate
                          ${TYPE_COLORS[m.type || '待办'] || TYPE_COLORS['待办']}
                          ${m.closed ? 'line-through opacity-60' : ''}
                        `}
                        title={`${m.startTime || ''} ${m.title}`}
                      >
                        {m.startTime && <span className="opacity-70 mr-0.5">{m.startTime.slice(0, 5)}</span>}
                        {m.title}
                      </div>
                    ))}
                    {list.length > 2 && (
                      <div className="text-[10px] text-slate-400 pl-1">+{list.length - 2} 更多</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ====== 右侧：当日事项 ====== */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-700">{formatPretty(selectedDate)}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedList.length} 项</p>
            </div>
            <button onClick={() => openAdd(selectedDate)} className="btn-ghost px-2 py-1">
              <Plus size={14} />
            </button>
          </div>

          {selectedList.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              <p>这天还没有安排</p>
              <button onClick={() => openAdd(selectedDate)} className="text-brand-600 hover:underline mt-2 text-xs">
                + 添加一件事
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedList.map((m) => (
                <div key={m._id} className={`border rounded-lg p-3 ${TYPE_COLORS[m.type || '待办'] || TYPE_COLORS['待办']} ${m.closed ? 'opacity-60' : ''}`}>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => toggle(m._id)}
                      className="mt-0.5 shrink-0 text-white/70 hover:text-white transition-colors"
                    >
                      {m.closed ? <CheckCircle size={16} /> : <Circle size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-medium ${m.closed ? 'line-through' : ''}`}>
                          {m.title}
                        </span>
                        <span className="text-[10px] opacity-70 px-1 rounded bg-white/50">
                          {m.type || '待办'}
                        </span>
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">
                        {m.startTime && <span>{m.startTime}</span>}
                        {m.endTime && <span> – {m.endTime}</span>}
                        {m.category && <span className="ml-2">· {m.category}</span>}
                      </div>
                      {m.description && (
                        <p className="text-xs mt-1 opacity-80 line-clamp-2">{m.description}</p>
                      )}
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <button onClick={() => openEdit(m)} className="p-1 rounded hover:bg-white/40">
                        <Edit3 size={13} />
                      </button>
                      <button onClick={() => remove(m._id)} className="p-1 rounded hover:bg-red-500/20 hover:text-red-700">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ====== 编辑弹窗 ====== */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editing === 'new' ? '新增备忘' : '编辑备忘'}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">标题 *</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="要做什么？" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">日期 *</label>
                  <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="label">开始时间 *</label>
                  <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="label">结束时间</label>
                  <input type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">类型</label>
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">分类</label>
                  <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="如: 工作 / 个人" />
                </div>
              </div>
              <div>
                <label className="label">描述</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
              <button onClick={() => setEditing(null)} className="btn-secondary">取消</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? '保存中...' : '保存'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatPretty(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const tomorrow = new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
  const yesterday = new Date(today.getTime() - 86400000).toISOString().slice(0, 10)
  if (dateStr === todayStr) return '今天'
  if (dateStr === tomorrow) return '明天'
  if (dateStr === yesterday) return '昨天'
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${d.getMonth() + 1}月${d.getDate()}日 ${names[d.getDay()]}`
}

function normalizeList(res: any): any[] {
  if (Array.isArray(res)) return res
  return (res?.data || [])
}

function normalizeItem(item: any): any {
  return item?.data || item
}
