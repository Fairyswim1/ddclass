import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import TeacherMode from './pages/FillBlanks/TeacherMode';
import StudentMode from './pages/FillBlanks/StudentMode';
import OrderTeacherMode from './pages/OrderMatching/OrderTeacherMode';
import OrderStudentMode from './pages/OrderMatching/OrderStudentMode';
import StudentLogin from './pages/StudentLogin';
import FreeTeacherMode from './pages/Free/FreeTeacherMode';
import FreeStudentMode from './pages/Free/FreeStudentMode';
import FreeMonitor from './pages/Free/FreeMonitor';
import './App.css';

function App() {
  useEffect(() => {
    console.log("Current API URL:", import.meta.env.VITE_API_URL);
    console.log("Environment:", import.meta.env.MODE);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* 기능 1: 빈칸 채우기 */}
          <Route path="/fill-blanks" element={<TeacherMode />} />
          <Route path="/student/fill-blanks" element={<StudentMode />} />

          {/* 기능 2: 순서 맞추기 */}
          <Route path="/order-matching" element={<OrderTeacherMode />} />
          <Route path="/student/order-matching" element={<OrderStudentMode />} />

          {/* 기능 3: 자유 드래그앤드롭 */}
          <Route path="/free-dnd" element={<FreeTeacherMode />} />
          <Route path="/free-dnd/monitor/:id" element={<FreeMonitor />} />
          <Route path="/student/free-dnd" element={<FreeStudentMode />} />

          {/* 학생 공통 진입 (Dispatcher) */}
          <Route path="/student/join" element={<StudentLogin />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
