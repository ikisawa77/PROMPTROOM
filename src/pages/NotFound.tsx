import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, BookOpen, Layers, Library, Wand2 } from 'lucide-react'
import Artwork from '../components/Artwork'

const LINKS = [
  { to: '/studio', label: 'Prompt Studio', desc: 'สร้างพรอมป์จากบรีฟไทย', icon: Wand2 },
  { to: '/templates', label: 'เทมเพลต', desc: 'เริ่มจากโจทย์งานจริง', icon: Layers },
  { to: '/library', label: 'คลังพรอมป์', desc: 'เปิดพรอมป์ที่บันทึกไว้', icon: Library },
  { to: '/guide', label: 'คู่มือ', desc: 'หลักคิดและ Checklist', icon: BookOpen },
]

export default function NotFound() {
  return (
    <div className="page notfound-page">
      <div className="container notfound">
        <div className="notfound-art" aria-hidden="true">
          <Artwork seed="notfound-404" variant="arc" swatch={['#e5e0d0', '#ff4a1c', '#2b2621']} />
          <span className="notfound-code">404</span>
        </div>
        <div className="notfound-copy">
          <span className="eyebrow">
            <span className="eyebrow-line" />
            SIGNAL LOST / PAGE NOT FOUND
          </span>
          <h1 className="page-title">
            ไม่พบ<span className="accent">หน้านี้</span>
          </h1>
          <p className="page-desc">
            หน้าที่คุณเปิดอาจถูกย้าย หรือลิงก์พิมพ์ผิด — กลับไปเริ่มจากหน้าแรก หรือเลือกเครื่องมือด้านล่างได้เลย
          </p>
          <div className="notfound-actions">
            <Link to="/" className="btn btn-dark">
              <ArrowLeft size={16} /> หน้าแรก
            </Link>
            <Link to="/studio" className="btn btn-line">
              เปิด Studio <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="notfound-links">
            {LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="notfound-link">
                <item.icon size={16} />
                <span>
                  <strong>{item.label}</strong>
                  <em>{item.desc}</em>
                </span>
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
