// Last Redeploy Trigger: 2026-04-27 09:31 (PACING LOCK FIX - FORCE REDEPLOY)
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

// [NEW] Root route for deployment verification
app.get('/', (req, res) => {
  res.json({
    message: 'DDClass Server is running',
    version: '1.0.3',
    timestamp: new Date().toISOString()
  });
});

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// -----------------------------------------------------
// [DIAGNOSTIC] 서버 상태 및 실시간 모니터링 상태 조회
// -----------------------------------------------------
app.get('/api/health', (req, res) => res.json({ success: true, version: '1.0.4-PACING', timestamp: new Date() }));

// [DEBUG] 특정 수업의 현재 서버 side maxAllowedStep 조회
app.get('/api/debug/lesson-state/:lessonId', (req, res) => {
  const { lessonId } = req.params;
  const state = roomStates[lessonId];
  if (!state) return res.json({ exists: false, maxAllowedStep: null, studentCount: 0 });
  res.json({
    exists: true,
    maxAllowedStep: state.maxAllowedStep,
    studentCount: Object.keys(state.students).length
  });
});

// POST & GET (for testing) versions of the status endpoint
app.post('/api/problem-status', getStatusHandler);
app.get('/api/problem-status', getStatusHandler);

function getStatusHandler(req, res) {
  try {
    const problemIds = req.method === 'POST' ? req.body.problemIds : req.query.problemIds?.split(',');

    if (!problemIds || !Array.isArray(problemIds)) {
      return res.status(400).json({ success: false, message: 'problemIds (Array) is required' });
    }

    const statuses = {};
    problemIds.forEach(id => {
      if (roomStates[id] && roomStates[id].students) {
        const studentSockets = Object.keys(roomStates[id].students);
        statuses[id] = { count: studentSockets.length };
      } else {
        statuses[id] = { count: 0 };
      }
    });

    res.json({ success: true, statuses, debug_info: { problemIds_received: problemIds } });
  } catch (error) {
    console.error('방 상태 조회 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
}

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
// 공통: PIN 번호로 문제/수업 찾기
// -----------------------------------------------------
app.get('/api/find-problem/:pin', async (req, res) => {
  try {
    const pin = req.params.pin;

    // 1. 단일 문제 검색 (역호환성)
    let snapshot = await db.collection('problems')
      .where('pinNumber', '==', pin)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const problem = snapshot.docs[0].data();
      return res.json({
        success: true,
        id: problem.id,
        type: problem.type
      });
    }

    // 2. 수업(Lesson) 검색
    snapshot = await db.collection('lessons')
      .where('pinNumber', '==', pin)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const lesson = snapshot.docs[0].data();
      return res.json({
        success: true,
        id: lesson.id,
        type: 'lesson',
        problemIds: lesson.problemIds,
        currentProblemIndex: lesson.currentProblemIndex
      });
    }

    return res.status(404).json({ success: false, message: '해당 PIN을 찾을 수 없습니다.' });
  } catch (error) {
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// -----------------------------------------------------
// Feature 5: 수업(Lesson) API [NEW]
// -----------------------------------------------------
// 1. 다중 문제 동시 생성 (PPT 빌더 용)
app.post('/api/lessons/bulk', async (req, res) => {
  try {
    const { title, slides, teacherId } = req.body;
    const lessonId = Math.random().toString(36).substr(2, 9);
    const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

    if (!slides || !Array.isArray(slides)) {
      return res.status(400).json({ success: false, message: '슬라이드 데이터가 없습니다.' });
    }

    const problemIds = [];
    const batch = db.batch();

    slides.forEach((slideData, index) => {
      const problemId = `${lessonId}_slide_${index}`;
      problemIds.push(problemId);

      const newProblem = {
        ...slideData, // contains type, title, question, etc.
        id: problemId,
        pinNumber: null, // Slide belongs to a lesson, no direct PIN access
        teacherId: teacherId || null,
        isPublic: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = db.collection('problems').doc(problemId);
      batch.set(docRef, newProblem);
    });

    const newLesson = {
      id: lessonId,
      type: 'lesson',
      pinNumber,
      title,
      problemIds,
      currentProblemIndex: 0,
      teacherId: teacherId || null,
      status: 'active',
      slideCount: slides.length,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const lessonRef = db.collection('lessons').doc(lessonId);
    batch.set(lessonRef, newLesson);

    await batch.commit();
    console.log(`[SAVED BULK] 수업: ${title} | ID: ${lessonId} | PIN: ${pinNumber} | 슬라이드 수: ${slides.length}`);

    res.json({ success: true, lessonId, pinNumber });
  } catch (error) {
    console.error('수업 대량 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 2. 단일 문제 연결용 (기존)
app.post('/api/lessons', async (req, res) => {
  try {
    const { title, problemIds, teacherId } = req.body;
    const lessonId = Math.random().toString(36).substr(2, 9);
    const pinNumber = Math.floor(100000 + Math.random() * 900000).toString();

    const newLesson = {
      id: lessonId,
      type: 'lesson',
      pinNumber,
      title,
      problemIds,
      currentProblemIndex: 0,
      teacherId: teacherId || null,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('lessons').doc(lessonId).set(newLesson);
    console.log(`[SAVED] 수업: ${title} | ID: ${lessonId} | PIN: ${pinNumber}`);

    res.json({ success: true, lessonId, pinNumber });
  } catch (error) {
    console.error('수업 생성 실패:', error);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

app.get('/api/lessons/:id', async (req, res) => {
  try {
    const doc = await db.collection('lessons').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: '수업을 찾을 수 없습니다.' });
    }
    res.json({ success: true, lesson: doc.data() });
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
// 기존 위치의 코드는 삭제하고 위로 이동됨


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

  // ==========================================
  // Lesson(수업) 전용 소켓 이벤트
  // ==========================================
  socket.on('joinLesson', ({ lessonId, studentName }) => {
    if (!lessonId || !studentName) return;

    socket.join(lessonId);
    console.log(`${studentName} (${socket.id})가 수업 ${lessonId}에 입장`);

    if (!roomStates[lessonId]) {
      roomStates[lessonId] = { students: {}, maxAllowedStep: 0 };
    }
    if (typeof roomStates[lessonId].maxAllowedStep !== 'number') {
      roomStates[lessonId].maxAllowedStep = 0;
    }

    const isTeacher = studentName === 'TEACHER_MONITOR';

    if (!isTeacher) {
      roomStates[lessonId].students[socket.id] = {
        id: socket.id,
        name: studentName,
        answer: [],
        answers: {},
        currentStep: 0,
        joinedAt: new Date()
      };
    }

    // 현재 방의 모든 학생 목록 (교사·학생 모두에게 동기화)
    socket.emit('currentStudents', Object.values(roomStates[lessonId].students));
    // 현재 페이싱(잠금) 상태 동기화 — 새로 들어온 사람도 즉시 정확한 잠금 상태를 받음
    socket.emit('maxAllowedStepUpdated', { maxAllowedStep: roomStates[lessonId].maxAllowedStep });

    if (!isTeacher) {
      socket.to(lessonId).emit('studentJoined', roomStates[lessonId].students[socket.id]);
    }
  });

  // (legacy) 교사가 수업 step을 옮기는 이벤트 — 현재는 교사 자신의 뷰만 바뀌므로 no-op
  socket.on('changeLessonStep', ({ lessonId, stepIndex }) => {
    // 학생 답안을 더이상 초기화하지 않음 (페이싱 도입 후 학생별 진행 상태 보존)
  });

  // 학생이 자신의 step을 이동했을 때 — 교사 페이싱 바의 학생 위치 점을 갱신
  socket.on('changeStudentStep', ({ lessonId, studentName, stepIndex }) => {
    if (!roomStates[lessonId] || !roomStates[lessonId].students[socket.id]) return;
    roomStates[lessonId].students[socket.id].currentStep = stepIndex;

    socket.to(lessonId).emit('studentStepChanged', {
      id: socket.id,
      name: studentName,
      currentStep: stepIndex
    });
  });

  // 교사가 자물쇠를 토글해서 학생 진행 가능 범위를 변경
  socket.on('updateMaxAllowedStep', ({ lessonId, maxAllowedStep }) => {
    if (!roomStates[lessonId]) {
      // 교사가 학생보다 먼저 잠금을 조정한 경우 대비
      roomStates[lessonId] = { students: {}, maxAllowedStep: 0 };
    }
    roomStates[lessonId].maxAllowedStep = maxAllowedStep;
    // 방 안의 모두(자기 자신 포함)에게 즉시 새 페이싱 방송
    io.to(lessonId).emit('maxAllowedStepUpdated', { maxAllowedStep });
  });

  socket.on('submitLessonAnswer', ({ lessonId, studentName, stepIndex, answer }) => {
    if (!roomStates[lessonId] || !roomStates[lessonId].students[socket.id]) return;

    const studentRec = roomStates[lessonId].students[socket.id];
    studentRec.answers = studentRec.answers || {};
    if (typeof stepIndex === 'number') {
      studentRec.answers[stepIndex] = answer;
    }
    // 레거시 호환: 단일 모니터가 .answer를 그대로 읽는 경우 대비
    studentRec.answer = answer;
    studentRec.updatedAt = new Date();

    socket.to(lessonId).emit('answerUpdated', {
      id: socket.id,
      name: studentName,
      stepIndex,
      answer,
      answers: studentRec.answers,
      updatedAt: studentRec.updatedAt
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

// Catch-all for 404s to help debug
app.use((req, res) => {
  console.log(`[DEBUG] 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found on server` });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
