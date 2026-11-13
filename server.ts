import express, { type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Real-time In-memory Store for CBT Live Sessions
export interface StudentParticipant {
  id: string;
  name: string;
  nisn: string;
  kelas: string;
  token: string;
  status: 'mengerjakan' | 'terputus' | 'diblokir' | 'selesai' | 'ruang_tunggu';
  startedAt: number;
  lastPing: number;
  violationsCount: number;
  violationsLog: Array<{
    id: string;
    timestamp: number;
    type: 'Pindah Tab' | 'Keluar Fullscreen' | 'Split Screen / Resize' | 'Aplikasi Mengambang' | 'Kombinasi Tombol Dilarang';
    penaltySeconds: number;
  }>;
  score?: number;
  totalScore?: number;
  warningMessage?: string | null;
  currentQuestionIndex?: number;
  deviceId?: string;
  deviceType?: string;
}

export interface ExamDeviceLockRecord {
  token: string;
  googleFormUrl?: string;
  deviceId: string;
  nisn: string;
  studentName: string;
  completedAt: number;
}

export interface LiveExamRoom {
  token: string;
  quizId: string;
  title: string;
  subject: string;
  grade: string;
  totalQuestions: number;
  durationMinutes: number;
  remainingSeconds: number;
  maxViolations: number;
  waitingRoomEnabled: boolean;
  isExamStarted: boolean;
  googleFormUrl: string;
  googleFormEditUrl?: string;
  driveFolderUrl?: string;
  createdAt: number;
  participants: Record<string, StudentParticipant>;
  completedLocks?: ExamDeviceLockRecord[];
  unlockedLocks?: Array<{ deviceId?: string; nisn?: string; unlockedAt: number }>;
  lastBroadcastAlert?: string | null;
}

const completedFormLocks: ExamDeviceLockRecord[] = [];

function normalizeFormLinkKey(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const u = new URL(rawUrl.trim());
    return `${u.hostname}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

function findMatchingDeviceLock(
  token: string,
  room: LiveExamRoom | undefined,
  deviceId?: string,
  nisn?: string,
  googleFormUrl?: string
): ExamDeviceLockRecord | null {
  const cleanDevice = String(deviceId || '').trim().toLowerCase();
  const cleanNisn = String(nisn || '').trim().toLowerCase();
  const cleanForm = normalizeFormLinkKey(googleFormUrl || room?.googleFormUrl);

  if (!cleanDevice && !cleanNisn) return null;

  // 1. Check room completedLocks
  if (room?.completedLocks) {
    for (const lock of room.completedLocks) {
      const sameDevice = Boolean(cleanDevice && lock.deviceId.toLowerCase() === cleanDevice);
      const sameNisn = Boolean(cleanNisn && cleanNisn !== '-' && lock.nisn.trim().toLowerCase() === cleanNisn);
      if (sameDevice || sameNisn) return lock;
    }
  }

  // 2. Check participants marked selesai in the room
  if (room?.participants) {
    for (const p of Object.values(room.participants)) {
      if (p.status !== 'selesai') continue;
      const sameDevice = Boolean(cleanDevice && p.deviceId && p.deviceId.toLowerCase() === cleanDevice);
      const sameNisn = Boolean(cleanNisn && cleanNisn !== '-' && p.nisn.trim().toLowerCase() === cleanNisn);
      if (sameDevice || sameNisn) {
        return {
          token,
          googleFormUrl: room.googleFormUrl,
          deviceId: p.deviceId || cleanDevice,
          nisn: p.nisn,
          studentName: p.name,
          completedAt: p.lastPing,
        };
      }
    }
  }

  // 3. Check global Google Form link locks (same link repeated even with another token)
  if (cleanForm) {
    for (const lock of completedFormLocks) {
      const lockForm = normalizeFormLinkKey(lock.googleFormUrl);
      if (!lockForm || lockForm !== cleanForm) continue;
      const sameDevice = Boolean(cleanDevice && lock.deviceId.toLowerCase() === cleanDevice);
      const sameNisn = Boolean(cleanNisn && cleanNisn !== '-' && lock.nisn.trim().toLowerCase() === cleanNisn);
      if (sameDevice || sameNisn) return lock;
    }
  }

  return null;
}

function createInitialSeededRooms(): Record<string, LiveExamRoom> {
  const now = Date.now();
  return {
    'LCXEIYU': {
      token: 'LCXEIYU',
      quizId: 'quiz-segitiga-smp',
      title: 'Segitiga',
      subject: 'Segitiga',
      grade: 'SMP',
      totalQuestions: 10,
      durationMinutes: 0,
      remainingSeconds: 0,
      maxViolations: 3,
      waitingRoomEnabled: false,
      isExamStarted: true,
      googleFormUrl: '',
      googleFormEditUrl: '',
      driveFolderUrl: 'https://drive.google.com/drive/my-drive',
      createdAt: now - 1000 * 60 * 30,
      participants: {},
    },
    'ZJT0P4M': {
      token: 'ZJT0P4M',
      quizId: 'quiz-ipa-ulangan',
      title: 'Ulangan',
      subject: 'IPA',
      grade: 'SMP',
      totalQuestions: 10,
      durationMinutes: 0,
      remainingSeconds: 0,
      maxViolations: 3,
      waitingRoomEnabled: false,
      isExamStarted: true,
      googleFormUrl: '',
      googleFormEditUrl: '',
      driveFolderUrl: 'https://drive.google.com/drive/my-drive',
      createdAt: now - 1000 * 60 * 15,
      participants: {
        'std-1': {
          id: 'std-1',
          name: 'Ahmad Raihan Pratama',
          nisn: '0089283741',
          kelas: 'VII-A',
          token: 'ZJT0P4M',
          status: 'mengerjakan',
          startedAt: now - 1000 * 60 * 12,
          lastPing: now,
          violationsCount: 0,
          violationsLog: [],
          currentQuestionIndex: 9,
        },
        'std-2': {
          id: 'std-2',
          name: 'Siti Nur Aisyah',
          nisn: '0089283742',
          kelas: 'VII-A',
          token: 'ZJT0P4M',
          status: 'mengerjakan',
          startedAt: now - 1000 * 60 * 12,
          lastPing: now,
          violationsCount: 1,
          violationsLog: [
            {
              id: 'v-1',
              timestamp: now - 1000 * 60 * 5,
              type: 'Pindah Tab',
              penaltySeconds: 10,
            },
          ],
          currentQuestionIndex: 11,
        },
        'std-3': {
          id: 'std-3',
          name: 'Bima Satria Wijaya',
          nisn: '0089283743',
          kelas: 'VII-A',
          token: 'ZJT0P4M',
          status: 'diblokir',
          startedAt: now - 1000 * 60 * 14,
          lastPing: now - 1000 * 60 * 2,
          violationsCount: 3,
          violationsLog: [
            { id: 'v-2', timestamp: now - 1000 * 60 * 10, type: 'Keluar Fullscreen', penaltySeconds: 10 },
            { id: 'v-3', timestamp: now - 1000 * 60 * 6, type: 'Pindah Tab', penaltySeconds: 10 },
            { id: 'v-4', timestamp: now - 1000 * 60 * 2, type: 'Split Screen / Resize', penaltySeconds: 10 },
          ],
          currentQuestionIndex: 6,
        },
        'std-4': {
          id: 'std-4',
          name: 'Dewi Lestari',
          nisn: '0089283744',
          kelas: 'VII-A',
          token: 'ZJT0P4M',
          status: 'selesai',
          startedAt: now - 1000 * 60 * 14,
          lastPing: now - 1000 * 60 * 1,
          violationsCount: 0,
          violationsLog: [],
          score: 93,
          totalScore: 100,
          currentQuestionIndex: 15,
        },
        'std-5': {
          id: 'std-5',
          name: 'Dimas Anggara',
          nisn: '0089283745',
          kelas: 'VII-A',
          token: 'ZJT0P4M',
          status: 'terputus',
          startedAt: now - 1000 * 60 * 13,
          lastPing: now - 1000 * 180,
          violationsCount: 1,
          violationsLog: [
            { id: 'v-5', timestamp: now - 1000 * 60 * 8, type: 'Pindah Tab', penaltySeconds: 10 },
          ],
          currentQuestionIndex: 5,
        },
      },
    },
  };
}

// Seed initial rooms for instant testing
const rooms: Record<string, LiveExamRoom> = createInitialSeededRooms();

// Background timer tick down
setInterval(() => {
  for (const token in rooms) {
    const room = rooms[token];
    if (room.isExamStarted && room.remainingSeconds > 0) {
      room.remainingSeconds -= 1;
    }
    // Check disconnects if lastPing > 35 seconds
    const now = Date.now();
    for (const sid in room.participants) {
      const p = room.participants[sid];
      if (p.status === 'mengerjakan' && now - p.lastPing > 35000) {
        p.status = 'terputus';
      }
    }
  }
}, 1000);

// Helper: Delay utility for retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Curriculum-aligned intelligent fallback question generator
function generateCurriculumFallback(
  subject: string,
  grade: string,
  topic: string,
  questionType: string,
  totalQuestions: number,
  difficulty: string
) {
  const isMath = subject.toLowerCase().includes('matematika') || subject.toLowerCase().includes('fisika');
  const isBahasa = subject.toLowerCase().includes('indonesia') || subject.toLowerCase().includes('inggris');

  const questions = [];

  for (let i = 1; i <= totalQuestions; i++) {
    let qType = questionType;
    if (questionType === 'campuran') {
      qType = i % 3 === 1 ? 'pilihan_ganda' : i % 3 === 2 ? 'isian' : 'uraian';
    }

    if (qType === 'pilihan_ganda' || qType === 'campuran') {
      let qText = '';
      let stimulus = '';
      let options = [];
      let correctAnswer = 'A';
      let explanation = '';

      if (isMath) {
        stimulus = `Diketahui sebuah permasalahan kontekstual matematika/fisika tentang ${topic}.`;
        qText = `Pada butir soal no. ${i}, manakah persamaan atau penyelesaian yang paling tepat untuk masalah ${topic}?`;
        options = [
          { key: 'A', text: `Hasil kalkulasi bernilai ${i * 5 + 10} unit sesuai formula baku` },
          { key: 'B', text: `Hasil kalkulasi bernilai ${i * 3 + 5} unit` },
          { key: 'C', text: `Hasil kalkulasi bernilai ${i * 4 + 2} unit` },
          { key: 'D', text: `Hasil kalkulasi bernilai ${i * 2 + 8} unit` },
        ];
        explanation = `Langkah penyelesaian: Substitusi variabel ke dalam rumus standar ${topic}. Diperoleh hasil akhir ${i * 5 + 10} unit.`;
      } else if (isBahasa) {
        stimulus = `Bacalah kutipan teks berikut secara cermat:\n"Implementasi pembelajaran berbasis masalah pada materi ${topic} terbukti meningkatkan ketrampilan berpikir kritis peserta didik."`;
        qText = `Gagasan utama atau simpulan yang paling tepat berdasarkan teks stimulus di atas adalah...`;
        options = [
          { key: 'A', text: `Pembelajaran ${topic} dapat meningkatkan pemahaman konsep dan berpikir kritis.` },
          { key: 'B', text: `Materi ${topic} hanya dapat dipelajari secara mandiri tanpa bimbingan.` },
          { key: 'C', text: `Peserta didik tidak membutuhkan stimulus bacaan dalam memahami teks.` },
          { key: 'D', text: `Evaluasi asesmen hanya berfokus pada hafalan teori semata.` },
        ];
        explanation = `Gagasan utama tersurat pada kalimat utama paragraf yang menegaskan pentingnya berpikir kritis pada materi ${topic}.`;
      } else {
        stimulus = `Perhatikan narasi kontekstual asesmen Kurikulum Merdeka berikut ini mengenai bab ${topic} (${grade}).`;
        qText = `Berdasarkan analisis konsep materi ${topic}, pernyataan manakah yang bernilai benar?`;
        options = [
          { key: 'A', text: `Prinsip utama materi ${topic} berfokus pada pemahaman struktur dan aplikasi dalam kehidupan nyata.` },
          { key: 'B', text: `Materi ${topic} tidak memiliki keterkaitan dengan fenomena di lingkungan sekitar.` },
          { key: 'C', text: `Hanya aspek teori yang diuji tanpa memerlukan analisis kognitif.` },
          { key: 'D', text: `Semua opsi di atas bernilai salah.` },
        ];
        explanation = `Pembahasan: Konsep dasar ${topic} pada jenjang ${grade} menekankan pada aplikasi praktis dan pemahaman konseptual yang mendalam.`;
      }

      questions.push({
        number: i,
        type: 'pilihan_ganda',
        stimulus,
        question: qText,
        options,
        correctAnswer,
        explanation,
        cognitiveLevel: i % 2 === 0 ? 'C4 - Analisis (HOTS)' : 'C3 - Aplikasi',
        points: 10,
      });
    } else if (qType === 'isian') {
      questions.push({
        number: i,
        type: 'isian',
        stimulus: `Lengkapi istilah kunci mengenai ${topic}.`,
        question: `Sebutkan istilah utama yang menjadi dasar dalam kajian ${topic}!`,
        correctAnswer: `Prinsip Utama ${topic}`,
        explanation: `Istilah dasar yang wajib dipahami siswa dalam materi ${topic} adalah prinsip utama dan komponen kuncinya.`,
        cognitiveLevel: 'C2 - Pemahaman',
        points: 15,
      });
    } else {
      questions.push({
        number: i,
        type: 'uraian',
        stimulus: `Studi Kasus Asesmen Kurikulum Merdeka (${grade}).`,
        question: `Jelaskan secara sistematis analisis Anda mengenai dampak dan penerapan materi ${topic} dalam kehidupan sehari-hari!`,
        correctAnswer: `Penjelasan komprehensif mencakup 3 aspek utama: definisi, penerapan nyata, serta analisis manfaat.`,
        explanation: `Pedoman Penskoran: Nilai maksimal diberikan jika siswa menyajikan 3 argumen logis dan terstruktur mengenai ${topic}.`,
        cognitiveLevel: 'C5 - Evaluasi (HOTS)',
        points: 20,
      });
    }
  }

  return {
    title: `Asesmen ${subject} - ${topic}`,
    subject,
    grade,
    topic,
    isFallback: true,
    notice: 'Model AI Gemini sedang padat trafik (503 High Demand). Soal berhasil disusun menggunakan Bank Generator Cadangan Cerdas Soalpintar.ai!',
    questions,
  };
}

// API 1: Generate Soal Cerdas via Gemini API with Multi-Model Fallback & Retry
app.post('/api/generate-questions', async (req: Request, res: Response) => {
  const {
    topic = 'Sistem Tata Surya & Gerak Bumi',
    subject = 'Ilmu Pengetahuan Alam (IPA)',
    grade = 'SMP Kelas 7',
    questionType = 'pilihan_ganda',
    totalQuestions = 5,
    difficulty = 'Sedang & HOTS (Analisis)',
    notes = 'Sesuai Capaian Pembelajaran Kurikulum Merdeka',
    referenceMaterial = '',
  } = req.body;

  const prompt = `Anda adalah pakar penyusun soal evaluasi pendidikan Indonesia (asesmen kurikulum nasional / Kurikulum Merdeka & K-13).
Tugas Anda: Buatlah ${totalQuestions} butir soal ${questionType} untuk:
- Mata Pelajaran: ${subject}
- Tingkat / Kelas: ${grade}
- Topik / Materi: ${topic}
- Tingkat Kesulitan: ${difficulty}
- Catatan Tambahan: ${notes}
${referenceMaterial ? `- Materi Referensi Bahan Ajar Guru:\n"""\n${referenceMaterial}\n"""\n(WAJIB mengacu dan menyesuaikan soal dengan materi referensi bahan ajar di atas)` : ''}

Ketentuan Khusus:
1. Pilihan Ganda (jika ada): 4 atau 5 opsi (A, B, C, D atau E) dengan 1 kunci jawaban yang benar dan pengecoh (distractor) yang berkualitas dan masuk akal.
2. Setiap butir soal WAJIB memiliki:
   - Pertanyaan (stimulus yang jelas dan kontekstual)
   - Opsi jawaban (untuk pilihan ganda)
   - Kunci Jawaban
   - Pembahasan mendalam (konseptual, sistematis, dan mudah dipahami siswa)
   - Indikator Kompetensi / Level Kognitif (misal: C2 Pemahaman, C3 Aplikasi, C4 Analisis / HOTS)
   - Bobot Poin nilai (misal: 10 atau 20)

Berikan format JSON terstruktur.`;

  const schemaConfig = {
    systemInstruction:
      'Anda adalah asisten AI resmi Soalpintar.ai yang ahli dalam kurikulum pendidikan Indonesia. Hasilkan output murni JSON tanpa markdown tambahan.',
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Judul Paket Soal Ujian' },
        subject: { type: Type.STRING },
        grade: { type: Type.STRING },
        topic: { type: Type.STRING },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.INTEGER },
              type: { type: Type.STRING, description: 'pilihan_ganda | isian | uraian' },
              stimulus: { type: Type.STRING, description: 'Teks stimulus, bacaan, atau pengantar soal' },
              question: { type: Type.STRING, description: 'Pertanyaan utama' },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    key: { type: Type.STRING, description: 'A, B, C, D, atau E' },
                    text: { type: Type.STRING },
                  },
                  required: ['key', 'text'],
                },
              },
              correctAnswer: { type: Type.STRING, description: 'Kunci jawaban yang benar' },
              explanation: { type: Type.STRING, description: 'Penjelasan dan pembahasan mendalam' },
              cognitiveLevel: { type: Type.STRING, description: 'C1/C2/C3/C4/C5/C6 atau HOTS' },
              points: { type: Type.INTEGER },
            },
            required: ['number', 'type', 'question', 'correctAnswer', 'explanation', 'cognitiveLevel', 'points'],
          },
        },
      },
      required: ['title', 'subject', 'grade', 'topic', 'questions'],
    },
  };

  // List of fallback models to try when primary model returns 503/429
  const candidateModels = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
  let lastError: any = null;

  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini API Request] Attempt ${attempt} on model '${modelName}'...`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: schemaConfig,
        });

        const text = response.text || '{}';
        const parsed = JSON.parse(text);
        console.log(`[Gemini API Success] Successfully generated via model '${modelName}'!`);
        return res.json({ success: true, data: parsed, usedModel: modelName });
      } catch (err: any) {
        lastError = err;
        const errCode = err?.status || err?.code || '';
        const errMsg = err?.message || String(err);
        console.warn(
          `[Gemini API Warning] Model '${modelName}' (attempt ${attempt}) returned error [${errCode}]: ${errMsg}`
        );

        // If 503 / 429 / High Demand, pause briefly before retrying or switching model
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errCode === 503 || errCode === 429) {
          await sleep(700 * attempt);
        } else {
          // Non-503 error, switch model immediately
          break;
        }
      }
    }
  }

  // If all live API attempts fail (e.g., persistent 503 High Demand), use the smart offline fallback generator
  console.warn('[Gemini API Fallback] All model attempts returned 503/errors. Serving offline curriculum backup package...');
  const fallbackData = generateCurriculumFallback(
    subject,
    grade,
    topic,
    questionType,
    Number(totalQuestions) || 5,
    difficulty
  );

  return res.json({
    success: true,
    data: fallbackData,
    notice: 'Model AI Gemini sedang mengalami beban trafik tinggi (503 High Demand). Soal berhasil dibuat menggunakan Bank Generator Cadangan Soalpintar.ai!',
    isFallback: true,
    rawError: lastError?.message,
  });
});

// API 2: Export Google Apps Script (GAS) Generator
app.post('/api/generate-gas-script', (req: Request, res: Response) => {
  try {
    const { title, questions } = req.body;
    const formTitle = title || 'Kuis Soalpintar.ai';

    const gasCode = `/**
 * Google Apps Script - Otomatisasi Pembuatan Google Form Kuis
 * Dihasilkan oleh Soalpintar.ai (v2-soalpintar.ai)
 *
 * CARA MENGGUNAKAN:
 * 1. Buka script.google.com di browser Anda.
 * 2. Buat "Project Baru" (New Project).
 * 3. Hapus kode bawaan, lalu Tempel (Paste) seluruh kode di bawah ini.
 * 4. Klik tombol "Simpan" (Ctrl+S) lalu klik tombol "Jalankan" (Run).
 * 5. Berikan izin otorisasi Google Drive / Forms saat diminta pertama kali.
 * 6. Formulir kuis otomatis tersimpan di Google Drive Anda beserta kunci jawabannya!
 */

function buatKuisOtomatisSoalpintar() {
  // 1. Buat Google Form baru
  var form = FormApp.create(${JSON.stringify(formTitle + ' [Soalpintar.ai]')});
  form.setDescription("Asesmen ini disinkronkan dengan Portal Ujian Aman Anti-Curang Soalpintar.ai.\\nHarap kerjakan dengan teliti dan jujur.");
  form.setIsQuiz(true);
  form.setCollectEmail(true);
  form.setRequireLogin(false); // Bisa diubah true jika wajib akun belajar.id

  // 2. Tambahkan Data Identitas Siswa
  form.addTextItem().setTitle("Nama Lengkap Siswa").setRequired(true);
  form.addTextItem().setTitle("Nomor Induk Siswa / NISN").setRequired(true);
  form.addTextItem().setTitle("Kelas / Rombel").setRequired(true);
  form.addTextItem().setTitle("Token Akses Ujian (Misal: ZJT0P4M)").setRequired(true);

  // 3. Tambahkan Section Lembar Soal
  form.addPageBreakItem().setTitle("Lembar Pengerjaan Soal Asesmen");

  var qList = ${JSON.stringify(questions || [])};

  for (var i = 0; i < qList.length; i++) {
    var q = qList[i];
    var fullPrompt = "";
    if (q.stimulus && q.stimulus.trim() !== "") {
      fullPrompt += q.stimulus + "\\n\\n";
    }
    fullPrompt += q.question;

    if (q.type === 'pilihan_ganda' && q.options && q.options.length > 0) {
      var mcItem = form.addMultipleChoiceItem();
      mcItem.setTitle(fullPrompt).setPoints(q.points || 10).setRequired(true);

      var choices = [];
      var feedback = FormApp.createFeedback()
        .setText("Pembahasan: " + (q.explanation || "Kunci jawaban: " + q.correctAnswer))
        .build();

      for (var j = 0; j < q.options.length; j++) {
        var opt = q.options[j];
        var isCorrect = (opt.key === q.correctAnswer || opt.text === q.correctAnswer);
        choices.push(mcItem.createChoice(opt.key + ". " + opt.text, isCorrect));
      }
      mcItem.setChoices(choices);
      mcItem.setFeedbackForCorrect(feedback);
      mcItem.setFeedbackForIncorrect(feedback);
    } else {
      // Isian Singkat atau Uraian
      var textItem = form.addParagraphTextItem();
      textItem.setTitle(fullPrompt).setPoints(q.points || 20).setRequired(true);
      var textFeedback = FormApp.createFeedback()
        .setText("Pedoman Jawaban & Pembahasan: " + (q.explanation || q.correctAnswer))
        .build();
      textItem.setGeneralFeedback(textFeedback);
    }
  }

  Logger.log("✅ Berhasil membuat Google Form Kuis!");
  Logger.log("🔗 Tautan Pengerjaan Siswa: " + form.getPublishedUrl());
  Logger.log("✏️ Tautan Editor Guru: " + form.getEditUrl());
}
`;

    return res.json({ success: true, script: gasCode, formTitle });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API 2b: Test Connection to Google Apps Script Web App (Code.gs v3.2)
app.post('/api/gas/test-connection', async (req: Request, res: Response) => {
  try {
    const { webAppUrl } = req.body;
    if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com/macros/s/')) {
      return res.status(400).json({
        success: false,
        message: 'URL Web App tidak valid. Format harus: https://script.google.com/macros/s/.../exec',
      });
    }

    const testUrl = webAppUrl.includes('?') ? `${webAppUrl}&action=version` : `${webAppUrl}?action=version`;
    const response = await fetch(testUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.json({
      success: true,
      message: 'Koneksi ke Web App Google Apps Script berhasil terhubung!',
      data,
      version: data.version || '3.2',
    });
  } catch (err: any) {
    console.error('GAS connection test error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghubungi Web App Google Apps Script: ' + (err.message || 'Network error'),
    });
  }
});

// API 2c: Create Google Form directly via Google Apps Script Web App
app.post('/api/gas/create-form', async (req: Request, res: Response) => {
  try {
    const {
      webAppUrl,
      title,
      quiz_id,
      guru_name = 'Guru',
      folder_name,
      questions = [],
      shuffle_questions = false,
      shuffle_options = false,
    } = req.body;

    if (!webAppUrl || !webAppUrl.startsWith('https://script.google.com/macros/s/')) {
      return res.status(400).json({
        success: false,
        message: 'URL Web App belum dikonfigurasi. Silakan atur di menu Pengaturan Web App.',
      });
    }

    const sanitizedQuestions = (Array.isArray(questions) ? questions : []).map((q: any) => ({
      ...q,
      number: q?.number !== undefined && q?.number !== null ? q.number : '',
      question: String(q?.question || '').replace(/^\s*(?:undefined\.?\s*|\.\s+|(?:No\.?\s*)?\d+\s*[.)]\s*)+/i, '').trim(),
    }));

    const payload = {
      title,
      quiz_id,
      guru_name,
      folder_name: folder_name || guru_name,
      questions: sanitizedQuestions,
      shuffle_questions: Boolean(shuffle_questions),
      shuffle_options: Boolean(shuffle_options),
    };

    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (data.status === 'error') {
      return res.status(400).json({ success: false, message: data.message });
    }

    return res.json({
      success: true,
      data,
      form_url: data.form_url,
      edit_url: data.edit_url,
      form_id: data.form_id,
      folder: data.folder,
      needsScriptUpdate: data.script_version !== '3.3',
    });
  } catch (err: any) {
    console.error('GAS create form error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat Google Form via Web App: ' + (err.message || 'Error'),
    });
  }
});

// API 2d: Get Google Form responses & live student scores via Web App
app.post('/api/gas/get-responses', async (req: Request, res: Response) => {
  try {
    const { webAppUrl, form_id, offset = 0, limit = 500 } = req.body;
    if (!webAppUrl || !form_id) {
      return res.status(400).json({ success: false, message: 'webAppUrl dan form_id wajib diisi' });
    }

    const fetchUrl = `${webAppUrl}?action=responses&form_id=${encodeURIComponent(form_id)}&offset=${offset}&limit=${limit}`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      redirect: 'follow',
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return res.json({ success: true, data });
  } catch (err: any) {
    console.error('GAS get responses error:', err);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil respons dari Google Form: ' + (err.message || 'Error'),
    });
  }
});

// API 3: Get Room / Token Info
app.get('/api/rooms/:token', (req: Request, res: Response) => {
  const token = req.params.token.toUpperCase();
  const room = rooms[token];
  if (!room) {
    return res.status(404).json({ success: false, message: 'Token ujian tidak ditemukan atau telah kedaluwarsa.' });
  }
  return res.json({ success: true, room });
});

// API 3b: Check if Device ID / Identity is already locked for this exam token or Google Form link
app.get('/api/rooms/:token/check-device', (req: Request, res: Response) => {
  const token = req.params.token.toUpperCase();
  const room = rooms[token];
  const deviceId = String(req.query.deviceId || '').trim().toLowerCase();
  const nisn = String(req.query.nisn || '').trim().toLowerCase();
  const googleFormUrl = String(req.query.googleFormUrl || '').trim();
  const localCompletedAt = Number(req.query.localCompletedAt || 0);

  const lock = findMatchingDeviceLock(token, room, deviceId, nisn, googleFormUrl);

  let unlockedByTeacher = false;
  if (!lock && room?.unlockedLocks && localCompletedAt > 0) {
    unlockedByTeacher = room.unlockedLocks.some((u) => {
      const matchDev = Boolean(deviceId && u.deviceId && u.deviceId.toLowerCase() === deviceId);
      const matchNisn = Boolean(nisn && nisn !== '-' && u.nisn && u.nisn.toLowerCase() === nisn);
      return (matchDev || matchNisn) && u.unlockedAt > localCompletedAt;
    });
  }

  return res.json({
    success: true,
    locked: Boolean(lock),
    unlockedByTeacher,
    lockInfo: lock,
  });
});

// API 4: Create or Update Exam Room
app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const {
      token,
      title,
      subject,
      grade,
      totalQuestions = 15,
      durationMinutes = 90,
      maxViolations = 3,
      waitingRoomEnabled = false,
      isExamStarted,
      googleFormUrl,
      googleFormEditUrl,
      driveFolderUrl,
    } = req.body;

    const normalizedToken = (token || Math.random().toString(36).substring(2, 9).toUpperCase()).toUpperCase();

    rooms[normalizedToken] = {
      token: normalizedToken,
      quizId: rooms[normalizedToken]?.quizId || 'quiz-' + Date.now(),
      title: title || 'Asesmen Ujian Berbasis Komputer',
      subject: subject || 'Umum',
      grade: grade || 'Kelas VII',
      totalQuestions: Number(totalQuestions) || 15,
      durationMinutes: Number(durationMinutes),
      remainingSeconds: Number(durationMinutes) * 60,
      maxViolations: Number(maxViolations),
      waitingRoomEnabled: Boolean(waitingRoomEnabled),
      isExamStarted:
        isExamStarted !== undefined ? Boolean(isExamStarted) : !Boolean(waitingRoomEnabled),
      googleFormUrl: googleFormUrl || '',
      googleFormEditUrl: googleFormEditUrl || '',
      driveFolderUrl: driveFolderUrl || 'https://drive.google.com/drive/folders/v2-soalpintar-ai',
      createdAt: rooms[normalizedToken]?.createdAt || Date.now(),
      participants: rooms[normalizedToken]?.participants || {},
    };

    return res.json({ success: true, room: rooms[normalizedToken] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// API 5: Student Join / Ping / Violation Sync
app.post('/api/rooms/:token/student-sync', (req: Request, res: Response) => {
  const token = req.params.token.toUpperCase();
  const room = rooms[token];
  if (!room) {
    return res.status(404).json({ success: false, message: 'Token tidak valid' });
  }

  const {
    studentId,
    name,
    nisn,
    kelas,
    status,
    newViolation,
    score,
    totalScore,
    currentQuestionIndex,
    deviceId,
    deviceType,
    googleFormUrl,
    bypassDeviceLock,
  } = req.body;

  if (!bypassDeviceLock && status !== 'selesai') {
    const existingLock = findMatchingDeviceLock(token, room, deviceId, nisn, googleFormUrl);
    if (existingLock) {
      return res.json({
        success: true,
        alreadyCompleted: true,
        lockInfo: existingLock,
        roomRemainingSeconds: room.remainingSeconds,
        isExamStarted: room.isExamStarted,
      });
    }
  }

  let participant = room.participants[studentId];

  if (!participant) {
    participant = {
      id: studentId,
      name: name || 'Siswa CBT',
      nisn: nisn || '-',
      kelas: kelas || '-',
      token: token,
      status: room.waitingRoomEnabled && !room.isExamStarted ? 'ruang_tunggu' : 'mengerjakan',
      startedAt: Date.now(),
      lastPing: Date.now(),
      violationsCount: 0,
      violationsLog: [],
      currentQuestionIndex: 1,
      deviceId: deviceId ? String(deviceId) : undefined,
      deviceType: deviceType ? String(deviceType) : undefined,
    };
    room.participants[studentId] = participant;
  }

  // Update ping and data
  participant.lastPing = Date.now();
  if (deviceId) participant.deviceId = String(deviceId);
  if (deviceType) participant.deviceType = String(deviceType);
  if (currentQuestionIndex !== undefined) participant.currentQuestionIndex = currentQuestionIndex;
  if (score !== undefined) participant.score = score;
  if (totalScore !== undefined) participant.totalScore = totalScore;

  if (newViolation) {
    participant.violationsCount += 1;
    participant.violationsLog.push({
      id: 'v-' + Date.now(),
      timestamp: Date.now(),
      type: newViolation.type,
      penaltySeconds: newViolation.penaltySeconds || 10,
    });

    if (participant.violationsCount >= room.maxViolations) {
      participant.status = 'diblokir';
    }
  }

  if (status && participant.status !== 'diblokir') {
    participant.status = status;
  }

  // Lock device + identity when exam is submitted
  if (status === 'selesai' && !bypassDeviceLock) {
    const cleanDevice = String(deviceId || participant.deviceId || '').trim().toLowerCase();
    const lockRecord: ExamDeviceLockRecord = {
      token,
      googleFormUrl: googleFormUrl || room.googleFormUrl || '',
      deviceId: cleanDevice,
      nisn: String(nisn || participant.nisn || '-').trim(),
      studentName: String(name || participant.name || 'Siswa CBT').trim(),
      completedAt: Date.now(),
    };
    if (!room.completedLocks) room.completedLocks = [];
    const alreadyInRoom = room.completedLocks.some(
      (l) =>
        (cleanDevice && l.deviceId.toLowerCase() === cleanDevice) ||
        (lockRecord.nisn !== '-' && l.nisn.toLowerCase() === lockRecord.nisn.toLowerCase())
    );
    if (!alreadyInRoom && cleanDevice) {
      room.completedLocks.push(lockRecord);
    }
    const formKey = normalizeFormLinkKey(lockRecord.googleFormUrl);
    if (formKey && cleanDevice) {
      const alreadyInForm = completedFormLocks.some(
        (l) =>
          normalizeFormLinkKey(l.googleFormUrl) === formKey &&
          l.deviceId.toLowerCase() === cleanDevice
      );
      if (!alreadyInForm) {
        completedFormLocks.push(lockRecord);
      }
    }
  }

  const responseWarning = participant.warningMessage || room.lastBroadcastAlert || null;
  // Clear warning after delivered
  if (participant.warningMessage) participant.warningMessage = null;

  return res.json({
    success: true,
    participant,
    roomRemainingSeconds: room.remainingSeconds,
    isExamStarted: room.isExamStarted,
    warningMessage: responseWarning,
    isBlocked: participant.status === 'diblokir',
  });
});

// API 6: Teacher Actions (Peringatan, Izinkan Ulang, Perpanjang Waktu)
app.post('/api/rooms/:token/actions', (req: Request, res: Response) => {
  const token = req.params.token.toUpperCase();
  const room = rooms[token];
  if (!room) {
    return res.status(404).json({ success: false, message: 'Room tidak ditemukan' });
  }

  const { action, studentId, message, addMinutes } = req.body;

  if (action === 'send_warning') {
    if (studentId && room.participants[studentId]) {
      room.participants[studentId].warningMessage = message || 'Peringatan Pengawas: Fokus pada lembar ujian Anda!';
    } else {
      room.lastBroadcastAlert = message || 'Peringatan Umum Pengawas: Tetap tertib dalam mengerjakan ujian!';
    }
    return res.json({ success: true, message: 'Peringatan berhasil dikirim.' });
  }

  if (action === 'reset_unblock' || action === 'reset_device_lock') {
    const targetDeviceId = String(req.body.deviceId || '').trim().toLowerCase();
    const targetNisn = String(req.body.nisn || '').trim().toLowerCase();

    if (studentId && room.participants[studentId]) {
      const p = room.participants[studentId];
      const pDevice = (p.deviceId || targetDeviceId || '').toLowerCase();
      const pNisn = (p.nisn || targetNisn || '').toLowerCase();

      if (room.completedLocks) {
        room.completedLocks = room.completedLocks.filter(
          (l) =>
            !(
              (pDevice && l.deviceId.toLowerCase() === pDevice) ||
              (pNisn && pNisn !== '-' && l.nisn.toLowerCase() === pNisn)
            )
        );
      }

      for (let i = completedFormLocks.length - 1; i >= 0; i--) {
        const l = completedFormLocks[i];
        if (
          (pDevice && l.deviceId.toLowerCase() === pDevice) ||
          (pNisn && pNisn !== '-' && l.nisn.toLowerCase() === pNisn)
        ) {
          completedFormLocks.splice(i, 1);
        }
      }

      p.status = 'mengerjakan';
      p.violationsCount = 0;
      p.lastPing = Date.now();
      if (!room.unlockedLocks) room.unlockedLocks = [];
      room.unlockedLocks.push({ deviceId: pDevice, nisn: pNisn, unlockedAt: Date.now() });
      return res.json({
        success: true,
        message: `Akses & kunci perangkat untuk ${p.name} berhasil dibuka ulang.`,
      });
    }

    if (targetDeviceId || targetNisn) {
      if (room.completedLocks) {
        room.completedLocks = room.completedLocks.filter(
          (l) =>
            !(
              (targetDeviceId && l.deviceId.toLowerCase() === targetDeviceId) ||
              (targetNisn && l.nisn.toLowerCase() === targetNisn)
            )
        );
      }
      if (!room.unlockedLocks) room.unlockedLocks = [];
      room.unlockedLocks.push({
        deviceId: targetDeviceId,
        nisn: targetNisn,
        unlockedAt: Date.now(),
      });
      return res.json({ success: true, message: 'Kunci perangkat berhasil di-reset.' });
    }

    return res.status(400).json({ success: false, message: 'Siswa atau perangkat tidak ditemukan' });
  }

  if (action === 'extend_time') {
    const mins = Number(addMinutes) || 15;
    room.durationMinutes += mins;
    room.remainingSeconds += mins * 60;
    return res.json({ success: true, remainingSeconds: room.remainingSeconds, durationMinutes: room.durationMinutes });
  }

  if (action === 'start_exam') {
    room.isExamStarted = true;
    for (const sid in room.participants) {
      if (room.participants[sid].status === 'ruang_tunggu') {
        room.participants[sid].status = 'mengerjakan';
      }
    }
    return res.json({ success: true, isExamStarted: true });
  }

  return res.status(400).json({ success: false, message: 'Aksi tidak dikenal' });
});

// API 7: Get All Rooms for Teacher Dashboard
app.get('/api/rooms', (_req: Request, res: Response) => {
  return res.json({ success: true, rooms: Object.values(rooms) });
});

// API 7b: Delete a single Live Exam Room / Token
app.delete('/api/rooms/:token', (req: Request, res: Response) => {
  const token = req.params.token.toUpperCase();
  if (rooms[token]) {
    delete rooms[token];
  }
  for (let i = completedFormLocks.length - 1; i >= 0; i--) {
    if (completedFormLocks[i].token.toUpperCase() === token) {
      completedFormLocks.splice(i, 1);
    }
  }
  return res.json({ success: true, deletedToken: token });
});

// API 8: Clear Data & Reset Logs / Live Sessions / Rooms
app.post('/api/admin/clear-data', (req: Request, res: Response) => {
  const scope = String(req.body?.scope || 'live_sessions');
  const clearRooms = Boolean(req.body?.clearRooms);
  const activeTokens = Array.isArray(req.body?.activeTokens)
    ? new Set(req.body.activeTokens.map((t: unknown) => String(t).toUpperCase()))
    : null;

  if (scope === 'live_sessions') {
    for (const tokenKey of Object.keys(rooms)) {
      if (clearRooms || (activeTokens && !activeTokens.has(tokenKey))) {
        delete rooms[tokenKey];
      } else {
        rooms[tokenKey].participants = {};
        rooms[tokenKey].completedLocks = [];
        rooms[tokenKey].unlockedLocks = [];
        rooms[tokenKey].lastBroadcastAlert = null;
      }
    }
    completedFormLocks.splice(0, completedFormLocks.length);
  }

  if (scope === 'tokens' || scope === 'all') {
    for (const tokenKey of Object.keys(rooms)) {
      delete rooms[tokenKey];
    }
    completedFormLocks.splice(0, completedFormLocks.length);
  }

  if (scope === 'restore') {
    for (const tokenKey of Object.keys(rooms)) {
      delete rooms[tokenKey];
    }
    completedFormLocks.splice(0, completedFormLocks.length);
    const seeded = createInitialSeededRooms();
    for (const [k, v] of Object.entries(seeded)) {
      rooms[k] = v;
    }
  }

  return res.json({ success: true, scope, roomsCount: Object.keys(rooms).length });
});

// ==========================================================
// Teacher Accounts Store & API (/api/teachers)
// ==========================================================
export interface TeacherAccountRecord {
  id: string;
  name: string;
  email: string;
  password: string;
  subject?: string;
  school?: string;
  role: 'Guru Mapel' | 'Admin Sekolah' | 'Pengawas';
  status: 'Aktif' | 'Nonaktif';
  createdAt: string;
  source?: 'portal_daftar' | 'pengaturan';
}

const registeredTeachers: TeacherAccountRecord[] = [
  {
    id: 'teacher-default-1',
    name: 'Apendi Mukdor, S.Pd.',
    email: 'apendimukdor86@guru.smp.belajar.id',
    password: 'guru123',
    subject: 'Matematika & IPA',
    school: 'SMP Negeri Penggerak',
    role: 'Admin Sekolah',
    status: 'Aktif',
    createdAt: '2026-11-01T08:00:00.000Z',
    source: 'pengaturan',
  },
];

app.get('/api/teachers', (_req: Request, res: Response) => {
  return res.json({ success: true, teachers: registeredTeachers });
});

app.post('/api/teachers', (req: Request, res: Response) => {
  const { name, email, password, subject, school, role, status, source } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!cleanName || !cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Nama dan email guru yang valid wajib diisi.' });
  }
  if (!cleanPassword || cleanPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'Kata sandi minimal 4 karakter.' });
  }

  const duplicate = registeredTeachers.find((t) => t.email.toLowerCase() === cleanEmail);
  if (duplicate) {
    return res.status(409).json({
      success: false,
      message: `Email "${cleanEmail}" sudah terdaftar di sistem.`,
    });
  }

  const newTeacher: TeacherAccountRecord = {
    id: 'teacher-' + Date.now(),
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    subject: String(subject || '').trim(),
    school: String(school || '').trim(),
    role: role === 'Admin Sekolah' || role === 'Pengawas' ? role : 'Guru Mapel',
    status: status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
    createdAt: new Date().toISOString(),
    source: source === 'portal_daftar' ? 'portal_daftar' : 'pengaturan',
  };

  registeredTeachers.unshift(newTeacher);
  return res.json({ success: true, teacher: newTeacher, teachers: registeredTeachers });
});

app.post('/api/teachers/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  const found = registeredTeachers.find((t) => t.email.toLowerCase() === cleanEmail);
  if (!found) {
    return res.status(404).json({
      success: false,
      message: 'Email guru belum terdaftar. Silakan daftar akun baru terlebih dahulu.',
    });
  }
  if (found.status === 'Nonaktif') {
    return res.status(403).json({
      success: false,
      message: 'Akun guru ini sedang dinonaktifkan di Pengaturan & Aplikasi.',
    });
  }
  if (found.password !== cleanPassword) {
    return res.status(401).json({
      success: false,
      message: 'Kata sandi tidak sesuai.',
    });
  }

  return res.json({ success: true, teacher: found });
});

app.post('/api/teachers/sync', (req: Request, res: Response) => {
  const list = Array.isArray(req.body?.teachers) ? req.body.teachers : [];
  for (const item of list) {
    if (!item || !item.email || !item.name) continue;
    const emailLower = String(item.email).trim().toLowerCase();
    const exists = registeredTeachers.some((t) => t.email.toLowerCase() === emailLower);
    if (!exists) {
      registeredTeachers.push({
        id: String(item.id || 'teacher-' + Math.random().toString(36).slice(2, 8)),
        name: String(item.name).trim(),
        email: emailLower,
        password: String(item.password || 'guru123'),
        subject: item.subject ? String(item.subject) : '',
        school: item.school ? String(item.school) : '',
        role: item.role === 'Admin Sekolah' || item.role === 'Pengawas' ? item.role : 'Guru Mapel',
        status: item.status === 'Nonaktif' ? 'Nonaktif' : 'Aktif',
        createdAt: item.createdAt || new Date().toISOString(),
        source: item.source === 'portal_daftar' ? 'portal_daftar' : 'pengaturan',
      });
    }
  }
  return res.json({ success: true, teachers: registeredTeachers });
});

app.patch('/api/teachers/:id', (req: Request, res: Response) => {
  const target = registeredTeachers.find((t) => t.id === req.params.id);
  if (!target) {
    return res.status(404).json({ success: false, message: 'Pengguna guru tidak ditemukan.' });
  }

  const { name, email, password, subject, school, role, status } = req.body || {};
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    const duplicate = registeredTeachers.find((t) => t.id !== target.id && t.email.toLowerCase() === cleanEmail);
    if (duplicate) {
      return res.status(409).json({ success: false, message: `Email "${cleanEmail}" sudah dipakai akun lain.` });
    }
    if (cleanEmail) target.email = cleanEmail;
  }
  if (name !== undefined && String(name).trim()) target.name = String(name).trim();
  if (password !== undefined && String(password).length >= 4) target.password = String(password);
  if (subject !== undefined) target.subject = String(subject).trim();
  if (school !== undefined) target.school = String(school).trim();
  if (role === 'Guru Mapel' || role === 'Admin Sekolah' || role === 'Pengawas') target.role = role;
  if (status === 'Aktif' || status === 'Nonaktif') target.status = status;

  return res.json({ success: true, teacher: target, teachers: registeredTeachers });
});

app.delete('/api/teachers/:id', (req: Request, res: Response) => {
  const idx = registeredTeachers.findIndex((t) => t.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Pengguna guru tidak ditemukan.' });
  }
  if (registeredTeachers[idx].id === 'teacher-default-1') {
    return res.status(400).json({ success: false, message: 'Akun utama default tidak dapat dihapus.' });
  }
  registeredTeachers.splice(idx, 1);
  return res.json({ success: true, teachers: registeredTeachers });
});

// Setup Vite dev server or static serve
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Soalpintar.ai Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
