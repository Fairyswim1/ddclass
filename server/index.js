// Last Redeploy Trigger: 2026-03-18 09:35 (Fixing Status Endpoint)
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Firebase Admin SDK 설정
const admin = require('firebase-admin');

// 서비스 계정 키 (환경 변수 사용 권장)
const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.FIREBASE_PROJECT_ID || "ddclass-c4dff",
  "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
  "private_key": process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  "client_email": process.env.FIREBASE_CLIENT_EMAIL,
  "client_id": process.env.FIREBASE_CLIENT_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL,
  "universe_domain": "googleapis.com"
};

if (!admin.apps.length) {
  // 환경 변수가 모두 설정되어 있을 때만 cert 인증 사용, 아니면 프로젝트 ID만 사용
  const config = (serviceAccount.private_key && serviceAccount.client_email)
    ? { credential: admin.credential.cert(serviceAccount) }
    : { projectId: 'ddclass-c4dff' };

  admin.initializeApp({
    ...config,
    storageBucket: 'ddclass-c4dff.firebasestorage.app'
  });
}
const db = admin.firestore();
const storage = admin.storage();
const bucket = storage.bucket();

// Multer 설정 (메모리 저장소 사용)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
});

// CORS 설정
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "https://ddclass.vercel.app",
      process.env.CLIENT_URL
    ].filter(Boolean);

    // Vercel Preview URLs와 Localhost, 정규 허용된 origin 체크
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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

// 1. 자유 드래그앤드롭 문제 생성
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
// Feature 4: 이미지 업로드 API (Firebase Storage Proxy)
// -----------------------------------------------------
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    console.log('[UPLOAD] Request received');
    if (!req.file) {
      console.error('[UPLOAD] No file provided');
      return res.status(400).json({ success: false, message: '파일이 없습니다.' });
    }

    const folder = req.body.folder || 'misc';
    const fileName = `${folder}/${Date.now()}_${req.file.originalname}`;
    console.log(`[UPLOAD] Destination: ${fileName}, MIME: ${req.file.mimetype}`);

    const file = bucket.file(fileName);

    // Firebase Storage에 업로드
    console.log('[UPLOAD] Uploading to Firebase Storage...');
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
      public: true,
    });

    // 공개 URL 생성
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`[UPLOAD] Success: ${publicUrl}`);
    res.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('[UPLOAD] Fatal error during upload:', error);
    res.status(500).json({
      success: false,
      message: '업로드 중 서버 오류 발생',
      debug: error.message
    });
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

// -----------------------------------------------------
// 실시간 상태 관리를 위한 메모리 저장소
// -----------------------------------------------------
const roomStates = {}; // { roomID: { students: { socketId: { name, answer } } } }

// -----------------------------------------------------
// 공통: 여러 방의 실시간 상태 (접속자 수) 조회
// -----------------------------------------------------
app.post('/api/rooms/status', (req, res) => {
  try {
    const { problemIds } = req.body;
    if (!Array.isArray(problemIds)) {
      return res.status(400).json({ success: false, message: 'problemIds must be an array' });
    }

    const statuses = {};
    problemIds.forEach(id => {
      if (roomStates[id] && roomStates[id].students) {
        // Teacher는 접속자 수에서 제외됨
        const studentSockets = Object.keys(roomStates[id].students);
        statuses[id] = {
          count: studentSockets.length
        };
      } else {
        statuses[id] = { count: 0 };
      }
    });

    res.json({ success: true, statuses });
  } catch (error) {
    console.error('방 상태 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});


// 소켓 연결 처리
io.on('connection', (socket) => {
  console.log('사용자 연결됨:', socket.id);

  // 방 입장 (학생/교사)
  socket.on('joinProblem', ({ problemId, studentName }) => {
    if (!problemId || !studentName) return;

    socket.join(problemId);
    console.log(`${studentName} (${socket.id})가 문제 ${problemId}에 입장`);

    // 방 상태 초기화
    if (!roomStates[problemId]) {
      roomStates[problemId] = { students: {} };
    }

    const isTeacher = studentName === 'TEACHER_MONITOR';

    if (!isTeacher) {
      // 학생 정보를 메모리에 저장
      roomStates[problemId].students[socket.id] = {
        id: socket.id,
        name: studentName,
        answer: [],
        joinedAt: new Date()
      };
    }

    // 현재 방의 모든 학생 목록을 새로 들어온 사용자에게 전송 (교사 모니터링 동기화용)
    const currentStudents = Object.values(roomStates[problemId].students);
    socket.emit('currentStudents', currentStudents);

    // 다른 사람들에게 새로운 학생 입장 알림
    if (!isTeacher) {
      socket.to(problemId).emit('studentJoined', roomStates[problemId].students[socket.id]);
    }
  });

  // 정답 제출/수정 (실시간)
  socket.on('submitAnswer', ({ problemId, studentName, answer }) => {
    if (!roomStates[problemId] || !roomStates[problemId].students[socket.id]) return;

    // 메모리 상태 업데이트
    roomStates[problemId].students[socket.id].answer = answer;
    roomStates[problemId].students[socket.id].updatedAt = new Date();

    // 다른 사람들에게(주로 교사) 답변 업데이트 브로드캐스트
    socket.to(problemId).emit('answerUpdated', {
      id: socket.id,
      name: studentName,
      answer,
      updatedAt: roomStates[problemId].students[socket.id].updatedAt
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

    // 모든 방 순회하며 해당 소켓 ID 제거
    Object.keys(roomStates).forEach(problemId => {
      if (roomStates[problemId].students[socket.id]) {
        const studentName = roomStates[problemId].students[socket.id].name;
        delete roomStates[problemId].students[socket.id];

        // 교사에게 학생 퇴장 알림 (필요 시)
        io.to(problemId).emit('studentLeft', { id: socket.id, name: studentName });

        // 방에 아무도 없으면 방 상태 삭제
        if (Object.keys(roomStates[problemId].students).length === 0) {
          // 일정 시간 후 삭제하거나 즉시 삭제 (여기서는 즉시)
          // delete roomStates[problemId]; 
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
