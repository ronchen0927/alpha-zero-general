import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { GamePage } from './pages/GamePage'
import { DashboardPage } from './pages/DashboardPage'
import { ReplayPage } from './pages/ReplayPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1 className="logo">♟ MiniShogi</h1>
          <nav className="nav">
            <NavLink to="/" className="nav-link">
              對弈
            </NavLink>
            <NavLink to="/dashboard" className="nav-link">
              訓練監控
            </NavLink>
            <NavLink to="/replay" className="nav-link">
              棋譜
            </NavLink>
          </nav>
        </header>
        <main className="main">
          <Routes>
            <Route path="/" element={<GamePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/replay" element={<ReplayPage />} />
            <Route path="/replay/:id" element={<ReplayPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
