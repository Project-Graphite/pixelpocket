import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import { AdminRoute, GuestRoute, ProtectedRoute } from './components/RouteGuards'
import Home from './pages/Home'
import Library from './pages/Library'
import Play from './pages/Play'
import UploadGame from './pages/UploadGame'
import EditGame from './pages/EditGame'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Account from './pages/Account'
import Admin from './pages/Admin'
import NotFound from './pages/NotFound'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

function App() {
  return (
    <div className="app">
      <Header />
      <div className="app__content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library scope="library" />} />
          <Route path="/games/:id" element={<Play />} />
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/my-games" element={<Library scope="mine" />} />
            <Route path="/games/new" element={<UploadGame />} />
            <Route path="/games/:id/edit" element={<EditGame />} />
            <Route path="/account" element={<Account />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<Admin />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}

export default App
