import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GeneratorPage from './pages/GeneratorPage';
import PPTViewer from './pages/PPTViewer';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<GeneratorPage />} />
          <Route path="/viewer" element={<PPTViewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
