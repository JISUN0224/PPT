import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GeneratorPage from './pages/GeneratorPage';
import PPTViewer from './pages/PPTViewer';
import StudyDashboard from './components/dashboard/StudyDashboard';
import Header from './components/layout/Header';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<GeneratorPage />} />
          <Route path="/viewer" element={<PPTViewer />} />
          <Route path="/dashboard" element={<StudyDashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
