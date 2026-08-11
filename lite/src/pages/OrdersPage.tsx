import { useEffect, useState, useCallback } from 'react'
import { Plus, Edit3, Trash2, X, Search } from 'lucide-react'
import { orderApi } from '@/lib/api'

const STATUS_OPTIONS = ['待生产', '生产中', '已交付', '已暂停']
const STATUS_COLORS: Record<string, string> = {
  '待生产': 'bg-slate-100 text-slate-600',
  '生产中': 'bg-blue-50 text-blue-600',
  '已交付': 'bg-emerald-50 text-emerald-600',
  '已暂停': 'bg-amber-50 text-amber-600',
}

const emptyForm = {
  productionNo: '', customer: '', productName: '', material: '',
  quantity: 0, unitPrice: 0, totalPrice: 0,
  status: '待生产', plannedDelivery: '', remark: '',
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [editing, setEditing] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await orderApi.list()
      setOrders(normalizeList(res))
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter((o) => {
    const matchSearch = !search ||
      (o.productionNo || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.productName || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === '全部' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const openAdd = () => {
    setForm({ ...emptyForm, productionNo: `ORD-${Date.now().toString().slice(-6)}` })
    setEditing('new')
  }

  const openEdit = (o: any) => {
    setForm({
      productionNo: o.productionNo || '', customer: o.customer || '',
      productName: o.productName || '', material: o.material || '',
      quantity: o.quantity || 0, unitPrice: o.unitPrice || 0,
      totalPrice: o.totalPrice || 0, status: o.status || '待生产',
      plannedDelivery: o.plannedDelivery || '', remark: o.remark || '',
    })
    setEditing(o._id)
  }

  const save = async () => {
    if (!form.productionNo || !form.customer) return
    setSaving(true)
    try {
      // 自动计算总价
      const data = {
        ...form,
        quantity: Number(form.quantity) || 0,
        unitPrice: Number(form.unitPrice) || 0,
        totalPrice: Number(form.totalPrice) || (Number(form.quantity) || 0) * (Number(form.unitPrice) || 0),
      }
      if (editing === 'new') {
        const created = await orderApi.create(data)
        setOrders((prev) => [created, ...prev])
      } else {
        const updated = await orderApi.update(editing, data)
        setOrders((prev) => prev.map((o) => (o._id === editing ? updated : o)))
      }
      setEditing(null)
    } catch (err: any) {
      alert(err.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('确认删除此订单？')) return
    try {
      await orderApi.delete(id)
      setOrders((prev) => prev.filter((o) => o._id !== id))
    } catch (err: any) {
      alert(err.message || '删除失败')
    }
  }

  if (loading) return <div className="text-center text-slate-400 py-20">加载中...</div>

  return (
    <div>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">订单追踪</h1>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> 新增订单
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="搜索订单号 / 客户 / 产品"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[120px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="全部">全部状态</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* 表格 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-xs">
              <th className="text-left font-medium px-4 py-3">订单号</th>
              <th className="text-left font-medium px-4 py-3">客户</th>
              <th className="text-left font-medium px-4 py-3">产品</th>
              <th className="text-right font-medium px-4 py-3">数量</th>
              <th className="text-right font-medium px-4 py-3">总价</th>
              <th className="text-left font-medium px-4 py-3">状态</th>
              <th className="text-left font-medium px-4 py-3">交付日期</th>
              <th className="text-right font-medium px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-slate-400 py-10">暂无订单数据</td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o._id} className="border-t border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-700">{o.productionNo || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.customer || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.productName || '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{o.quantity || 0}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{o.totalPrice ? `¥${o.totalPrice.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[o.status] || 'bg-slate-100 text-slate-600'}`}>
                      {o.status || '待生产'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{o.plannedDelivery || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(o)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => remove(o._id)} className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editing === 'new' ? '新增订单' : '编辑订单'}</h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <Field label="订单号 *">
                <input className="input" value={form.productionNo} onChange={(e) => setForm({ ...form, productionNo: e.target.value })} />
              </Field>
              <Field label="客户名称 *">
                <input className="input" value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} />
              </Field>
              <Field label="产品名称">
                <input className="input" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} />
              </Field>
              <Field label="材料">
                <input className="input" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
              </Field>
              <Field label="数量">
                <input type="number" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
              </Field>
              <Field label="单价">
                <input type="number" className="input" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
              </Field>
              <Field label="总价">
                <input type="number" className="input" value={form.totalPrice} onChange={(e) => setForm({ ...form, totalPrice: Number(e.target.value) })} />
              </Field>
              <Field label="状态">
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="计划交付日期">
                <input type="date" className="input" value={form.plannedDelivery} onChange={(e) => setForm({ ...form, plannedDelivery: e.target.value })} />
              </Field>
              <div className="col-span-2">
                <Field label="备注">
                  <textarea className="input" rows={2} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
                </Field>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

function normalizeList(res: any): any[] {
  if (Array.isArray(res)) return res
  return res?.data || []
}
