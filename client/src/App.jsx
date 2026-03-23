import { useEffect } from 'react';
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
import TeacherLogin from './pages/TeacherLogin';
import TeacherDashboard from './pages/TeacherDashboard';
import PublicLibrary from './pages/PublicLibrary';
import MonitorPage from './pages/MonitorPage';
import CreateLesson from './pages/Lesson/CreateLesson';
import LessonMonitor from './pages/Lesson/LessonMonitor';
import LessonStudentMode from './pages/Lesson/LessonStudentMode';
import './App.css';

function App() {
  useEffect(() => {
    console.log("Current API URL:", import.meta.env.VITE_API_URL || "https://ddclass-server.onrender.com (fallback)");
    console.log("Environment:", import.meta.env.MODE);
  }, []);

  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* 수업 생성 */}
          <Route path="/create-lesson" element={<CreateLesson />} />

          {/* 기능 1: 빈칸 채우기 */}
          <Route path="/fill-blanks/:id?" element={<TeacherMode />} />
          <Route path="/student/fill-blanks" element={<StudentMode />} />

          {/* 기능 2: 순서 맞추기 */}
          <Route path="/order-matching/:id?" element={<OrderTeacherMode />} />
          <Route path="/student/order-matching" element={<OrderStudentMode />} />

          {/* 기능 3: 자유 드래그앤드롭 */}
          <Route path="/free-dnd/:id?" element={<FreeTeacherMode />} />
          <Route path="/free-dnd/monitor/:id" element={<FreeMonitor />} />
          <Route path="/student/free-dnd" element={<FreeStudentMode />} />

          {/* 수업(Lesson) 통신용 */}
          <Route path="/student/lesson" element={<LessonStudentMode />} />

          {/* 학생 공통 진입 (Dispatcher) */}
          <Route path="/student/join" element={<StudentLogin />} />
          <Route path="/s" element={<StudentLogin />} />
          <Route path="/join" element={<StudentLogin />} />

          {/* 선생님 전용 공간 */}
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/library" element={<PublicLibrary />} />
          <Route path="/teacher/monitor/:id" element={<MonitorPage />} />
          <Route path="/teacher/lesson-monitor/:id" element={<LessonMonitor />} />
          <Route path="/monitor/:id" element={<MonitorPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
