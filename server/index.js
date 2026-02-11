const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Firebase Admin SDK 설정
const admin = require('firebase-admin');
// 로컬 환경 또는 특정 배포 환경에 따라 서비스 계정 키 설정이 필요할 수 있습니다.
// 일단 프로젝트 ID만으로 초기화를 시도합니다 (환경 변수 권장).
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'ddclass-c4dff'
  });
}
const db = admin.firestore();

// CORS 설정
// CORS 설정
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://ddclass.vercel.app",
    process.env.CLIENT_URL
  ].filter(Boolean),
  methods: ["GET", "POST"],
  credentials: true
};

app.use(cors(corsOptions));

const io = new Server(server, {
  cors: corsOptions
});

// API 엔드포인트
app.use(express.json());

// -----------------------------------------------------
// Feature 1: 빈칸 채우기 API
// -----------------------------------------------------
// 1. 빈칸 채우기 문제 생성
app.post('/api/fill-blanks', async (req, res) => {
  try {
    const { title, originalText, blanks, allowDuplicates, teacherId, isPublic } = req.body;
    const problemId = Math.random().toString(36).substr(2, 9);
    const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const newProblem = {
      id: problemId,
      type: 'fill-blanks',
      pinNumber,
      title,
      originalText,
      blanks,
      allowDuplicates: allowDuplicates || false,
      teacherId: teacherId || null,
      isPublic: isPublic || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('problems').doc(problemId).set(newProblem);
    console.log(`[SAVED] 빈칸 문제: ${title} | ID: ${problemId} | PIN: ${pinNumber} | Teacher: ${teacherId}`);

    res.json({ success: true, problemId, pinNumber });
  } catch (error) {
    console.error('문제 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. 빈칸 채우기 문제 조회 (ID로)
app.get('/api/fill-blanks/:id', async (req, res) => {
  try {
    const doc = await db.collection('problems').doc(req.params.id).get();
    if (!doc.exists || doc.data().type !== 'fill-blanks') {
      return res.status(404).json({ success: false, message: '빈칸 채우기 문제를 찾을 수 없습니다.' });
    }
    res.json({ success: true, problem: doc.data() });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// -----------------------------------------------------
// Feature 2: 순서 맞추기 API [NEW]
// -----------------------------------------------------
app.post('/api/order-matching', async (req, res) => {
  try {
    const { title, steps, teacherId, isPublic } = req.body;
    const problemId = Math.random().toString(36).substr(2, 9);
    const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const formattedSteps = steps.map((text, index) => ({
      id: `step-${index}`,
      text
    }));

    const newProblem = {
      id: problemId,
      type: 'order-matching',
      pinNumber,
      title,
      steps: formattedSteps,
      teacherId: teacherId || null,
      isPublic: isPublic || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('problems').doc(problemId).set(newProblem);
    console.log(`[SAVED] 순서 맞추기: ${title} | ID: ${problemId} | PIN: ${pinNumber} | Teacher: ${teacherId}`);

    res.json({ success: true, problemId, pinNumber });
  } catch (error) {
    console.error('순서 맞추기 문제 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.get('/api/order-matching/:id', async (req, res) => {
  try {
    const doc = await db.collection('problems').doc(req.params.id).get();
    if (!doc.exists || doc.data().type !== 'order-matching') {
      return res.status(404).json({ success: false, message: '순서 맞추기 문제를 찾을 수 없습니다.' });
    }
    res.json({ success: true, problem: doc.data() });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
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
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  res.json({ success: true, url: fileUrl });
});

// 2. 자유 드래그앤드롭 문제 생성
app.post('/api/free-drop', async (req, res) => {
  try {
    const { title, backgroundUrl, items, baseWidth, aspectRatio, teacherId, isPublic } = req.body;
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
      teacherId: teacherId || null,
      isPublic: isPublic || false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('problems').doc(problemId).set(newProblem);
    console.log(`[SAVED] 자유 보드: ${title} | ID: ${problemId} | PIN: ${pinNumber} | Teacher: ${teacherId}`);

    res.json({ success: true, problemId, pinNumber });
  } catch (error) {
    console.error('문제 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 3. 문제 조회
app.get('/api/free-drop/:id', async (req, res) => {
  try {
    const doc = await db.collection('problems').doc(req.params.id).get();
    if (!doc.exists || doc.data().type !== 'free-drop') {
      return res.status(404).json({ success: false, message: '문제를 찾을 수 없습니다.' });
    }
    res.json({ success: true, problem: doc.data() });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// -----------------------------------------------------
// 공통: PIN 번호로 문제 찾기
// -----------------------------------------------------
app.get('/api/find-problem/:pin', async (req, res) => {
  try {
    const pin = req.params.pin;
    const snapshot = await db.collection('problems')
      .where('pinNumber', '==', pin)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: '해당 PIN의 문제를 찾을 수 없습니다.' });
    }

    const problem = snapshot.docs[0].data();
    res.json({
      success: true,
      id: problem.id,
      type: problem.type
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
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
