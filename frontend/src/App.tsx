import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Build from './pages/Build'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/build/:champion/:role" element={<Build />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}
