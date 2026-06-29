import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Build from './pages/Build'
import Profile from './pages/Profile'
import Summoner from './pages/Summoner'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Profile />} />
        <Route path="/champions" element={<Home />} />
        <Route path="/build/:champion/:role" element={<Build />} />
        <Route path="/profile/:platform/:gameName/:tagLine" element={<Summoner />} />
        <Route path="*" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}
