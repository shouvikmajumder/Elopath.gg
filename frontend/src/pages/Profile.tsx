import { Link } from 'react-router-dom'
import SummonerSearchBar from '../components/SummonerSearchBar'

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2A3147]/80 bg-surface/90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link to="/" className="font-playfair text-xl font-bold">
          <span className="text-ink">ELOPATH</span>
          <span className="text-gold">.GG</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/champions" className="font-rajdhani text-sm font-semibold tracking-wider text-ink-2 hover:text-gold transition-colors uppercase">
            Champions
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default function Profile() {
  return (
    <div className="min-h-screen bg-surface bg-hex">
      <Nav />

      <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-14">
        <div className="w-full max-w-2xl">

          {/* Badge */}
          <div
            className="flex items-center gap-2 mx-auto w-fit mb-8 animate-fade-in"
            style={{ animationDelay: '0ms' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            <span className="font-rajdhani text-xs tracking-[0.25em] text-gold/80 uppercase">
              Summoner lookup
            </span>
          </div>

          {/* Headline */}
          <div
            className="text-center mb-4 animate-fade-up"
            style={{ animationDelay: '80ms' }}
          >
            <h1 className="font-playfair font-black text-5xl md:text-7xl text-ink leading-[0.9] tracking-tight">
              FIND YOUR
              <br />
              <span className="text-shadow-gold" style={{
                background: 'linear-gradient(135deg, #C89B3C, #F0D590, #C89B3C)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                PROFILE
              </span>
            </h1>
          </div>

          <p
            className="text-center font-rajdhani text-ink-2 text-lg mb-12 animate-fade-up"
            style={{ animationDelay: '160ms' }}
          >
            Search any Riot ID to view ranked stats, recent matches,
            and <em className="text-gold not-italic font-semibold">champion performance</em>.
          </p>

          {/* Search box */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: '240ms' }}
          >
            <SummonerSearchBar />
          </div>

          <p
            className="text-center font-rajdhani text-xs text-ink-3 mt-4 animate-fade-up"
            style={{ animationDelay: '320ms' }}
          >
            Format: GameName#TagLine — e.g. "Hide on bush#KR1"
          </p>
        </div>
      </div>

      {/* Bottom label */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-[#2A3147]/40 py-3 text-center">
        <p className="font-rajdhani text-xs text-ink-3">
          Elopath.gg is not affiliated with Riot Games. League of Legends is a trademark of Riot Games.
        </p>
      </div>
    </div>
  )
}
