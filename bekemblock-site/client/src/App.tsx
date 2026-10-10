import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { OrderModal } from './components/OrderModal'
import { Home } from './pages/Home'
import { Catalog } from './pages/Catalog'
import { Product } from './pages/Product'
import { About } from './pages/About'
import { Technology } from './pages/Technology'
import { Contacts } from './pages/Contacts'
import { Vacancies } from './pages/Vacancies'
import { NotFound } from './pages/NotFound'

export default function App() {
  const [order, setOrder] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <Header onOrder={() => setOrder(true)} />
      <main>
        <Routes>
          <Route path="/" element={<Home onOrder={() => setOrder(true)} />} />
          <Route path="/catalog" element={<Catalog onOrder={() => setOrder(true)} />} />
          <Route path="/catalog/:density" element={<Product />} />
          <Route path="/about" element={<About />} />
          <Route path="/technology" element={<Technology />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/vacancies" element={<Vacancies />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <OrderModal open={order} onClose={() => setOrder(false)} />
    </>
  )
}
