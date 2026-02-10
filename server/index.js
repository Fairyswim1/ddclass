const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS 설정
// CORS 설정
const corsOptions = {
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  methods: ["GET", "POST"],
  credentials: true
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions
});

// 메모리 데이터 저장소 (DB 대용)
// 모든 문제 유형을 이 객체에 저장하고 'type' 필드로 구분합니다.
// PIN 번호는 문제 ID로 매핑하는 키로도 사용됩니다.
const problems = {};

// API 엔드포인트
app.use(express.json());

// -----------------------------------------------------
// Feature 1: 빈칸 채우기 API
// -----------------------------------------------------
// 1. 빈칸 채우기 문제 생성
app.post('/api/fill-blanks', (req, res) => {
  try {
    const { title, originalText, blanks, allowDuplicates } = req.body;
    const problemId = Math.random().toString(36).substr(2, 9);
    const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const newProblem = {
      id: problemId,
      type: 'fill-blanks', // 문제 유형 추가
      pinNumber,
      title,
      originalText,
      blanks, // [{ index, word, id }]
      allowDuplicates: allowDuplicates || false, // 기본값 false
      createdAt: new Date(),
      sessions: [] // 세션 정보는 소켓 연결 시 관리
    };

    problems[problemId] = newProblem;
    problems[pinNumber] = problemId; // PIN 번호로 문제 ID를 찾을 수 있도록 매핑
    console.log(`빈칸 문제 생성됨: ${title} (PIN: ${pinNumber})`);

    res.json({ success: true, problemId, pinNumber });
  } catch (error) {
    console.error('문제 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. 빈칸 채우기 문제 조회 (ID로)
app.get('/api/fill-blanks/:id', (req, res) => {
  const problem = problems[req.params.id];
  if (!problem || problem.type !== 'fill-blanks') {
    return res.status(404).json({ success: false, message: '빈칸 채우기 문제를 찾을 수 없습니다.' });
  }
  res.json({ success: true, problem });
});

// -----------------------------------------------------
// Feature 2: 순서 맞추기 API [NEW]
// -----------------------------------------------------
app.post('/api/order-matching', (req, res) => {
  try {
    const { title, steps } = req.body; // steps: string[]
    const problemId = Math.random().toString(36).substr(2, 9);
    const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

    // steps를 객체 형태로 변환 (id 부여)
    const formattedSteps = steps.map((text, index) => ({
      id: `step-${index}`,
      text
    }));

    const newProblem = {
      id: problemId,
      type: 'order-matching', // 문제 유형 추가
      pinNumber,
      title,
      steps: formattedSteps,
      createdAt: new Date(),
      sessions: [] // 세션 정보는 소켓 연결 시 관리
    };

    problems[problemId] = newProblem;
    problems[pinNumber] = problemId; // PIN 번호로 문제 ID를 찾을 수 있도록 매핑
    console.log(`순서 맞추기 문제 생성됨: ${title} (PIN: ${pinNumber})`);

    res.json({ success: true, problemId, pinNumber });
  } catch (error) {
    console.error('순서 맞추기 문제 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.get('/api/order-matching/:id', (req, res) => {
  const problem = problems[req.params.id];
  if (!problem || problem.type !== 'order-matching') {
    return res.status(404).json({ success: false, message: '순서 맞추기 문제를 찾을 수 없습니다.' });
  }
  res.json({ success: true, problem });
});

// -----------------------------------------------------
// Feature 3: 자유 드래그앤드롭 API [NEW]
// -----------------------------------------------------
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 업로드 디렉토리 확인 및 생성
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 정적 파일 서빙: 업로드된 이미지 접근
app.use('/uploads', express.static('uploads'));

// 1. 이미지 업로드 (배경 이미지 등)
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '파일이 업로드되지 않았습니다.' });
  }
  // 클라이언트에서 접근 가능한 URL 반환
  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// 2. 자유 드래그앤드롭 문제 생성
app.post('/api/free-drop', (req, res) => {
  try {
    const { title, backgroundUrl, items, baseWidth, aspectRatio } = req.body;
    // items: [{ id, type, content, x, y, width, height }]

    const problemId = Math.random().toString(36).substr(2, 9);
    const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const newProblem = {
      id: problemId,
      type: 'free-drop',
      pinNumber,
      title,
      backgroundUrl,
      items: items || [],
      baseWidth: baseWidth || 1000,
      aspectRatio: aspectRatio || (16 / 9),
      createdAt: new Date(),
    };

    problems[problemId] = newProblem;
    problems[pinNumber] = problemId;
    console.log(`자유 드래그 문제 생성됨: ${title} (PIN: ${pinNumber})`);

    res.json({ success: true, problemId, pinNumber });
  } catch (error) {
    console.error('문제 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 3. 문제 조회
app.get('/api/free-drop/:id', (req, res) => {
  const problem = problems[req.params.id];
  if (!problem || problem.type !== 'free-drop') {
    return res.status(404).json({ success: false, message: '문제를 찾을 수 없습니다.' });
  }
  res.json({ success: true, problem });
});

// -----------------------------------------------------
// 공통: PIN 번호로 문제 찾기
// -----------------------------------------------------
app.get('/api/find-problem/:pin', (req, res) => {
  const pin = req.params.pin;
  const problemId = problems[pin]; // PIN -> ID 매핑 조회

  if (problemId && problems[problemId]) {
    const problem = problems[problemId];
    return res.json({
      success: true,
      id: problem.id,
      type: problem.type
    });
  }

  res.status(404).json({ success: false, message: '해당 PIN의 문제를 찾을 수 없습니다.' });
});

// 소켓 연결 처리
io.on('connection', (socket) => {
  console.log('사용자 연결됨:', socket.id);

  // 방 입장 (학생)
  socket.on('joinProblem', ({ problemId, studentName }) => {
    if (!problemId || !studentName) return; // 유효성 검사

    socket.join(problemId);
    console.log(`${studentName} 학생이 문제 ${problemId}에 입장`);

    // 교사에게 알림
    io.to(problemId).emit('studentJoined', {
      id: socket.id,
      name: studentName,
      joinedAt: new Date()
    });
  });

  // 정답 제출/수정 (실시간)
  socket.on('submitAnswer', ({ problemId, studentName, answer }) => {
    // answer: 
    // Fill Blanks: { blankId: word }
    // Order Matching: [{ id, text }]
    // Free Drop: [{ id, x, y }]

    // console.log(`답변 업데이트: ${studentName}`, answer); // 로그 너무 많으면 주석
    io.to(problemId).emit('answerUpdated', {
      id: socket.id,
      name: studentName,
      answer,
      updatedAt: new Date()
    });
  });

  // 교사 메시지 전송
  socket.on('sendMessage', ({ studentSocketId, message, teacherName }) => {
    console.log(`메시지 전송: ${teacherName} -> ${studentSocketId}: ${message}`);
    io.to(studentSocketId).emit('messageReceived', {
      message,
      from: teacherName,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('사용자 연결 해제:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
