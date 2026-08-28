import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Profile from './pages/Profile'
import Summoner from './pages/Summoner'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Profile />} />
        <Route path="/profile/:platform/:gameName/:tagLine" element={<Summoner />} />
        <Route path="*" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}
