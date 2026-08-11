import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit3, Trash2, X, Phone, Mail, Tag } from 'lucide-react'
import { customerApi } from '@/lib/api'

const LEVEL_COLORS: Record<string, string> = {
  A: 'bg-emerald-50 text-emerald-600',
  B: 'bg-blue-50 text-blue-600',
  C: 'bg-slate-100 text-slate-500',
}

const emptyForm = {
  name: '', contactPerson: '', phone: '', email: '',
  industry: '', level: 'B', tags: '', remark: '',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await customerApi.list()
      setCustomers(normalizeList(res))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = customers.filter((c) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (c.name || '').toLowerCase().includes(s) ||
      (c.contactPerson || c.contact || '').toLowerCase().includes(s) ||
      (c.phone || '').includes(s)
  })

  const openAdd = () => {
    setForm({ ...emptyForm })
    setEditing('new')
  }

  const openEdit = (c: any) => {
    setForm({
      name: c.name || '',
      contactPerson: c.contactPerson || c.contact || '',
      phone: c.phone || '',
      email: c.email || '',
      industry: c.industry || '',
      level: c.level || c.creditLevel || 'B',
      tags: (c.tags || []).join(', '),
      remark: c.remark || c.notes || '',
    })
    setEditing(c._id)
  }

  const save = async () => {
    if (!form.name || !form.contactPerson || !form.phone) {
      alert('客户名称、联系人、电话为必填')
      return
    }
    setSaving(true)
    try {
      const data = {
        ...form,
        tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      }
      if (editing === 'new') {
        const created = await customerApi.create(data)
        setCustomers((prev) => [normalizeItem(created), ...prev])
      } else {
        const updated = await customerApi.update(editing, data)
        setCustomers((prev) => prev.map((c) => (c._id === editing ? normalizeItem(updated) : c)))
      }
      setEditing(null)
    } catch (err: any) {
      alert(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('确认删除此客户？')) return
    try {
      await customerApi.delete(id)
      setCustomers((prev) => prev.filter((c) => c._id !== id))
    } catch (err: any) {
      alert(err.message || '删除失败')
    }
  }

  if (loading) return <div className="text-center text-slate-400 py-20">加载中...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">客户画像</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> 新增客户
        </button>
      </div>

      <input
        className="input max-w-xs mb-4"
        placeholder="搜索客户名称 / 联系人 / 电话"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* 卡片网格 */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">暂无客户数据</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const contact = c.contactPerson || c.contact || '—'
            const level = c.level || c.creditLevel || 'B'
            return (
              <div key={c._id} className="card p-5 hover:shadow-soft transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 truncate">{c.name}</h3>
                    <p className="text-xs text-slate-400">{c.industry || '—'}</p>
                  </div>
                  <span className={`badge ${LEVEL_COLORS[level] || LEVEL_COLORS.B} shrink-0 ml-2`}>
                    {level}级
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-slate-400 w-12">联系人</span>
                    <span>{contact}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone size={14} className="text-slate-400" />
                    <span>{c.phone || '—'}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={14} className="text-slate-400" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  )}
                </div>

                {c.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {c.tags.map((t: string, i: number) => (
                      <span key={i} className="badge bg-slate-100 text-slate-500">
                        <Tag size={10} className="mr-0.5" />{t}
                      </span>
                    ))}
                  </div>
                )}

                {c.remark && (
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{c.remark}</p>
                )}

                <div className="flex justify-end gap-1 pt-2 border-t border-slate-50">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <Edit3 size={15} />
                  </button>
                  <button onClick={() => remove(c._id)} className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editing === 'new' ? '新增客户' : '编辑客户'}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">客户名称 *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">联系人 *</label>
                <input className="input" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
              </div>
              <div>
                <label className="label">电话 *</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">邮箱</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">行业</label>
                <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
              </div>
              <div>
                <label className="label">等级</label>
                <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label className="label">标签（逗号分隔）</label>
                <input className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="如: 重点客户, 航空" />
              </div>
              <div className="col-span-2">
                <label className="label">备注</label>
                <textarea className="input" rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
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

function normalizeList(res: any): any[] {
  // api.request 已剥掉外层 { success, data }，这里只接收数组本身
  if (Array.isArray(res)) return res
  return (res?.data || [])
}

function normalizeItem(item: any): any {
  // api.request 已剥掉外层包装，直接返回 item（兜底支持旧结构）
  const base = item?.data || item
  // tags 兜底：如果不是数组，转成空数组（防止 .map 崩溃）
  if (base && base.tags != null && !Array.isArray(base.tags)) {
    base.tags = typeof base.tags === 'string'
      ? base.tags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean)
      : []
  }
  return base
}
