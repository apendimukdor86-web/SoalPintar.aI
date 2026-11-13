import React, { useState, useEffect } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Shuffle,
  Folder,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';

export const EXACT_CODE_GS = `/**
 * soalpintar.ai — Google Form Creator Bridge
 * 
 * CARA SETUP (1x saja):
 * 1. Buka https://script.google.com
 * 2. Klik "New Project"
 * 3. Hapus isi default, paste seluruh kode ini
 * 4. Klik Deploy > New deployment
 * 5. Pilih type: Web app
 * 6. Execute as: Me (akun Anda)
 * 7. Who has access: Anyone
 * 8. Klik Deploy
 * 9. Copy URL yang muncul
 * 10. Paste URL ke Settings di dashboard guru
 *
 * SELESAI! Form akan dibuat di Google Drive Anda.
 *
 * VERSI 3.3: 
 * - Pembersihan otomatis awalan "undefined.", tanda titik berlebih, & nomor soal (cleanQuestionTitle & cleanExistingFormTitles).
 * - Fitur "Nilai Siswa" (respons, skor, jawaban per soal) & acak soal.
 * - Respons diambil per halaman (maks. 500) & bisa hanya yang baru, aman untuk ribuan respons.
 * OPSIONAL - acak urutan PILIHAN JAWABAN: di editor Apps Script klik "Services" (+)
 *   > pilih "Google Forms API" > Add. Tanpa ini, yang diacak hanya urutan soal.
 * Jika memperbarui dari versi lama: paste ulang kode ini, lalu
 * Deploy > Manage deployments > Edit (ikon pensil) > Version: New version > Deploy.
 * URL Web App tetap sama, jadi tidak perlu mengubah Settings di dashboard.
 * Saat diminta izin, izinkan akses Google Forms & Drive.
 */

var SCRIPT_VERSION = '3.3';

/**
 * Membersihkan awalan "undefined.", tanda titik/simbol berlebih,
 * serta nomor urut soal (misal: "1. ", "1) ", "No. 1: ").
 */
function cleanQuestionTitle(str) {
  return String(str || '')
    .replace(/^[\\s\\u00A0]*(?:undefined\\s*\\.?\\s*|\\.+\\s+|(?:no\\.?\\s*)?\\d+\\s*[\\.\\)\\-:]\\s*)+/i, '')
    .trim();
}

/**
 * Membersihkan judul pertanyaan pada Google Form yang sudah ada di Google Drive.
 */
function cleanExistingFormTitles(form) {
  var items = form.getItems();
  var T = FormApp.ItemType;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var tp = it.getType();
    if (tp === T.MULTIPLE_CHOICE || tp === T.PARAGRAPH_TEXT || tp === T.CHECKBOX || tp === T.LIST) {
      var curTitle = it.getTitle() || '';
      var cleaned = cleanQuestionTitle(curTitle);
      if (cleaned && cleaned !== curTitle) {
        it.setTitle(cleaned);
      }
    }
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    
    var quizId = data.quiz_id || '';
    var title = data.title || 'Quiz soalpintar.ai';
    var guruName = data.guru_name || 'Guru';
    var questions = data.questions || [];
    var folderName = data.folder_name || guruName;
    var totalQuestions = questions.length;
    
    // 0. Cek apakah folder dan form untuk Quiz ID ini sudah pernah dibuat sebelumnya
    var parentFolderName = 'v2-soalpintar.ai';
    var folders = DriveApp.getFoldersByName(parentFolderName);
    var parentFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(parentFolderName);
    
    var guruFolders = parentFolder.getFoldersByName(folderName);
    var guruFolder = guruFolders.hasNext() ? guruFolders.next() : parentFolder.createFolder(folderName);
    
    if (quizId) {
      var searchName = "Quiz: " + title + " [ID-" + quizId + "]";
      var files = guruFolder.getFilesByName(searchName);
      if (files.hasNext()) {
        var file = files.next();
        try {
          var existingForm = FormApp.openById(file.getId());
          cleanExistingFormTitles(existingForm);
          return jsonOut({
            status: 'success',
            version: SCRIPT_VERSION,
            script_version: SCRIPT_VERSION,
            form_url: existingForm.getPublishedUrl(),
            edit_url: existingForm.getEditUrl(),
            form_id: existingForm.getId(),
            folder: folderName,
            is_existing: true
          });
        } catch (err) {
          // Abaikan jika error saat membuka
        }
      }
    }

    // Calculate points per question so total = 100%
    var pointsPerQuestion = totalQuestions > 0 ? Math.floor(100 / totalQuestions) : 1;
    var remainder = totalQuestions > 0 ? 100 - (pointsPerQuestion * totalQuestions) : 0;
    
    // Create Google Form
    var form = FormApp.create(title);
    form.setIsQuiz(true);
    
    var description = 'Quiz dibuat oleh ' + guruName + ' \\n\\nIsi data diri Anda di bagian pertama, lalu kerjakan soal di bagian berikutnya.';
    if (quizId) {
      description += '\\n\\n[Quiz ID: ' + quizId + ']';
    }
    form.setDescription(description);
    
    // ========================================
    // SECTION 1: Data Siswa
    // ========================================
    
    // Nama Lengkap
    var namaItem = form.addTextItem();
    namaItem.setTitle('Nama Lengkap');
    namaItem.setRequired(true);
    namaItem.setHelpText('Masukkan nama lengkap Anda');
    
    // Nomor Absen
    var absenItem = form.addTextItem();
    absenItem.setTitle('Nomor Absen');
    absenItem.setRequired(true);
    absenItem.setHelpText('Masukkan nomor absen Anda');
    
    // Kelas
    var kelasItem = form.addTextItem();
    kelasItem.setTitle('Kelas');
    kelasItem.setRequired(true);
    kelasItem.setHelpText('Contoh: 9A, 10 IPA 2, 7B');
    
    // ========================================
    // SECTION 2: Soal-Soal
    // ========================================
    
    var pageBreak = form.addPageBreakItem();
    pageBreak.setTitle('Soal Ujian');
    pageBreak.setHelpText('Kerjakan soal berikut dengan teliti. Pilih satu jawaban yang paling tepat.\\nTotal nilai: 100');
    
    // Add questions with answer key and points
    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      
      // Distribute points: spread remainder across first few questions
      var pts = pointsPerQuestion;
      if (i < remainder) {
        pts = pointsPerQuestion + 1;
      }

      // Normalisasi payload: pastikan q.number tidak pernah menghasilkan "undefined."
      var cleanTitle = cleanQuestionTitle(q.question);

      if (q.type === 'essay') {
        var item = form.addParagraphTextItem();
        item.setTitle(cleanTitle);
        item.setRequired(true);
        item.setPoints(pts);
      } else {
        var item = form.addMultipleChoiceItem();
        item.setTitle(cleanTitle);
        item.setRequired(true);
        item.setPoints(pts);
        
        // Build choices with correct answer marked
        var choices = [];
        for (var j = 0; j < q.options.length; j++) {
          var isCorrect = (j === q.answer);
          choices.push(item.createChoice(q.options[j], isCorrect));
        }
        item.setChoices(choices);
      }
    }
    
    // Acak urutan soal / pilihan jawaban (opsional, dari dashboard)
    var shuffleInfo = applyShuffle(form, !!data.shuffle_questions, !!data.shuffle_options);

    // Move form to folder (create if not exists)
    var formFile = DriveApp.getFileById(form.getId());
    if (quizId) {
      formFile.setName("Quiz: " + title + " [ID-" + quizId + "]");
    }
    guruFolder.addFile(formFile);
    DriveApp.getRootFolder().removeFile(formFile);
    
    return jsonOut({
      status: 'success',
      version: SCRIPT_VERSION,
      script_version: SCRIPT_VERSION,
      form_url: form.getPublishedUrl(),
      edit_url: form.getEditUrl(),
      form_id: form.getId(),
      folder: folderName,
      total_points: 100,
      points_per_question: pointsPerQuestion,
      shuffle_questions: shuffleInfo.questions,
      shuffle_options: shuffleInfo.options
    });
    
  } catch (error) {
    return jsonOut({
      status: 'error',
      version: SCRIPT_VERSION,
      message: error.toString()
    });
  }
}

/**
 * doGet: aksi BACA & PEMELIHARAAN.
 *   ?action=version                                       -> versi script
 *   ?action=responses&form_id=ID[&since=ms][&offset=0&limit=500] -> respons + nilai (per halaman)
 *   ?action=find_form&published_id=PID                    -> cari ID form (edit) dari ID link publik
 *   ?action=set_shuffle&form_id=ID&questions=1&options=1  -> atur acak soal / pilihan
 *   ?action=clean_titles&form_id=ID                       -> bersihkan judul soal pada form lama
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'version') return jsonOut({ status: 'ok', version: SCRIPT_VERSION, script_version: SCRIPT_VERSION });
    if (p.action === 'responses') return jsonOut(getFormResponses(p.form_id, p.since, p.offset, p.limit));
    if (p.action === 'find_form') return jsonOut(findFormByPublishedId(p.published_id));
    if (p.action === 'set_shuffle') {
      var target = FormApp.openById(p.form_id);
      var info = applyShuffle(target, p.questions === '1', p.options === '1');
      return jsonOut({ status: 'success', version: SCRIPT_VERSION, shuffle_questions: info.questions, shuffle_options: info.options, options_message: info.message });
    }
    if (p.action === 'clean_titles' && p.form_id) {
      var formToClean = FormApp.openById(p.form_id);
      cleanExistingFormTitles(formToClean);
      return jsonOut({ status: 'success', version: SCRIPT_VERSION, form_id: p.form_id, message: 'Judul soal berhasil dibersihkan.' });
    }

    return jsonOut({ status: 'ok', message: 'soalpintar.ai Form Creator is running!', version: SCRIPT_VERSION, script_version: SCRIPT_VERSION });
  } catch (error) {
    return jsonOut({ status: 'error', message: error.toString(), version: SCRIPT_VERSION });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ambil semua respons form beserta skor kuis.
 * Kolom identitas dicari dari judul pertanyaan yang mengandung "nama", "absen", "kelas".
 */
function getFormResponses(formId, sinceMs, offsetParam, limitParam) {
  if (!formId) return { status: 'error', message: 'form_id wajib diisi', version: SCRIPT_VERSION };

  var form;
  try {
    form = FormApp.openById(formId);
  } catch (err) {
    return { status: 'error', code: 'no_access', message: 'Form tidak bisa dibuka oleh akun Google ini. Pastikan form ada di akun yang sama dengan Apps Script.', version: SCRIPT_VERSION };
  }

  var isQuiz = form.isQuiz();
  var items = form.getItems();
  var maxScore = 0;
  var itemMeta = [];
  var idItems = { name: null, absen: null, kelas: null };

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var title = (it.getTitle() || '').toLowerCase();
    var type = it.getType();

    if (type === FormApp.ItemType.TEXT) {
      if (!idItems.name && title.indexOf('nama') !== -1) idItems.name = it.getId();
      else if (!idItems.absen && title.indexOf('absen') !== -1) idItems.absen = it.getId();
      else if (!idItems.kelas && title.indexOf('kelas') !== -1) idItems.kelas = it.getId();
    }
    if (isQuiz) {
      var pts = itemPoints(it);
      maxScore += pts;
      if (pts > 0) itemMeta.push(describeItem(it, pts));
    }
  }

  var responses = sinceMs ? form.getResponses(new Date(Number(sinceMs))) : form.getResponses();
  var total = responses.length;
  var offset = Math.max(0, parseInt(offsetParam, 10) || 0);
  var limit = Math.min(1000, Math.max(1, parseInt(limitParam, 10) || 500));
  var end = Math.min(total, offset + limit);
  var rows = [];
  for (var r = offset; r < end; r++) {
    var resp = responses[r];
    var row = {
      id: resp.getId(),
      submitted_at: resp.getTimestamp().toISOString(),
      email: resp.getRespondentEmail() || null,
      name: null, absen: null, kelas: null,
      score: null
    };

    var answers = resp.getItemResponses();
    for (var a = 0; a < answers.length; a++) {
      var itemId = answers[a].getItem().getId();
      var val = String(answers[a].getResponse() || '');
      if (itemId === idItems.name) row.name = val;
      else if (itemId === idItems.absen) row.absen = val;
      else if (itemId === idItems.kelas) row.kelas = val;
    }

    if (isQuiz) {
      var score = 0;
      var graded = resp.getGradableItemResponses();
      row.answers = {};
      for (var g = 0; g < graded.length; g++) {
        var gScore = Number(graded[g].getScore() || 0);
        score += gScore;
        var raw = graded[g].getResponse();
        row.answers[String(graded[g].getItem().getId())] = {
          r: Array.isArray(raw) ? raw.join(' | ') : (raw === null || raw === undefined ? '' : String(raw)),
          s: gScore
        };
      }
      row.score = score;
    }
    rows.push(row);
  }

  return {
    status: 'success',
    version: SCRIPT_VERSION,
    form_id: form.getId(),
    title: form.getTitle(),
    is_quiz: isQuiz,
    max_score: isQuiz ? maxScore : null,
    items: offset === 0 ? itemMeta : [],
    total: total,
    offset: offset,
    has_more: end < total,
    next_offset: end < total ? end : null,
    accepting_responses: form.isAcceptingResponses(),
    responses: rows
  };
}

function itemPoints(it) {
  var T = FormApp.ItemType;
  switch (it.getType()) {
    case T.MULTIPLE_CHOICE: return it.asMultipleChoiceItem().getPoints();
    case T.CHECKBOX: return it.asCheckboxItem().getPoints();
    case T.LIST: return it.asListItem().getPoints();
    case T.TEXT: return it.asTextItem().getPoints();
    case T.PARAGRAPH_TEXT: return it.asParagraphTextItem().getPoints();
    case T.SCALE: return it.asScaleItem().getPoints();
    case T.DATE: return it.asDateItem().getPoints();
    case T.TIME: return it.asTimeItem().getPoints();
    case T.DATETIME: return it.asDateTimeItem().getPoints();
    case T.DURATION: return it.asDurationItem().getPoints();
    case T.GRID: return it.asGridItem().getPoints();
    case T.CHECKBOX_GRID: return it.asCheckboxGridItem().getPoints();
    default: return 0;
  }
}

/** Metadata soal untuk analisis butir: judul, poin, pilihan & kunci jawaban. */
function describeItem(it, points) {
  var T = FormApp.ItemType;
  var meta = { id: String(it.getId()), title: it.getTitle(), type: String(it.getType()), points: points, choices: [] };
  var choices = null;
  if (it.getType() === T.MULTIPLE_CHOICE) choices = it.asMultipleChoiceItem().getChoices();
  else if (it.getType() === T.CHECKBOX) choices = it.asCheckboxItem().getChoices();
  else if (it.getType() === T.LIST) choices = it.asListItem().getChoices();
  if (choices) {
    for (var c = 0; c < choices.length; c++) {
      meta.choices.push({ value: choices[c].getValue(), correct: choices[c].isCorrectAnswer() });
    }
  }
  return meta;
}

/**
 * Acak urutan soal (FormApp) dan, jika layanan "Google Forms API" diaktifkan,
 * acak urutan pilihan jawaban setiap soal pilihan ganda.
 */
function applyShuffle(form, shuffleQuestions, shuffleOptions) {
  var result = { questions: shuffleQuestions, options: false, message: '' };
  form.setShuffleQuestions(shuffleQuestions);

  if (typeof Forms === 'undefined') {
    result.message = shuffleOptions ? 'Layanan "Google Forms API" belum diaktifkan di Apps Script, pilihan jawaban tidak diacak.' : '';
    return result;
  }

  try {
    var full = Forms.Form.get(form.getId());
    var requests = [];
    (full.items || []).forEach(function (item, index) {
      var q = item.questionItem && item.questionItem.question;
      if (q && q.choiceQuestion) {
        requests.push({ updateItem: {
          item: { questionItem: { question: { choiceQuestion: { shuffle: shuffleOptions } } } },
          location: { index: index },
          updateMask: 'questionItem.question.choiceQuestion.shuffle'
        } });
      }
    });
    if (requests.length) Forms.Form.batchUpdate({ requests: requests }, form.getId());
    result.options = shuffleOptions;
  } catch (err) {
    result.message = 'Gagal mengatur acak pilihan: ' + err;
  }
  return result;
}

/**
 * Untuk form yang di-import manual (hanya punya link publik /forms/d/e/PID/viewform):
 * cari form di Google Drive akun ini yang link publiknya cocok.
 */
function findFormByPublishedId(publishedId) {
  if (!publishedId) return { status: 'error', message: 'published_id wajib diisi', version: SCRIPT_VERSION };

  var files = DriveApp.getFilesByType(MimeType.GOOGLE_FORMS);
  var checked = 0;
  while (files.hasNext() && checked < 500) {
    var file = files.next();
    checked++;
    try {
      var f = FormApp.openById(file.getId());
      if ((f.getPublishedUrl() || '').indexOf(publishedId) !== -1) {
        return { status: 'success', version: SCRIPT_VERSION, form_id: f.getId(), title: f.getTitle(), is_quiz: f.isQuiz() };
      }
    } catch (err) {
      // Lewati form yang tidak bisa dibuka
    }
  }
  return { status: 'error', code: 'not_found', message: 'Form tidak ditemukan di Google Drive akun ini (dicek ' + checked + ' form).', version: SCRIPT_VERSION };
}
`;

interface GasSettingsViewProps {
  webAppUrl: string;
  onSaveWebAppUrl: (url: string) => void;
  guruName: string;
  onSaveGuruName: (name: string) => void;
  shuffleQuestions: boolean;
  onSaveShuffleQuestions: (val: boolean) => void;
  shuffleOptions: boolean;
  onSaveShuffleOptions: (val: boolean) => void;
}

export const GasSettingsView: React.FC<GasSettingsViewProps> = ({
  webAppUrl,
  onSaveWebAppUrl,
  guruName,
  onSaveGuruName,
  shuffleQuestions,
  onSaveShuffleQuestions,
  shuffleOptions,
  onSaveShuffleOptions,
}) => {
  const [urlInput, setUrlInput] = useState(webAppUrl);
  const [nameInput, setNameInput] = useState(guruName || 'Apendi Mukdor, S.Pd.');
  const [shuffleQ, setShuffleQ] = useState(shuffleQuestions);
  const [shuffleO, setShuffleO] = useState(shuffleOptions);

  const [isCopied, setIsCopied] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  const [isCreatingDemo, setIsCreatingDemo] = useState(false);
  const [demoCreatedResult, setDemoCreatedResult] = useState<{
    form_url: string;
    edit_url: string;
    form_id: string;
  } | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    setUrlInput(webAppUrl);
  }, [webAppUrl]);

  const handleSaveSettings = () => {
    onSaveWebAppUrl(urlInput.trim());
    onSaveGuruName(nameInput.trim());
    onSaveShuffleQuestions(shuffleQ);
    onSaveShuffleOptions(shuffleO);
    showToast('Pengaturan URL Web App & Preferensi Google Forms berhasil disimpan!');
  };

  const handleTestConnection = async () => {
    if (!urlInput.trim()) {
      showToast('Harap masukkan URL Web App terlebih dahulu.');
      return;
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/gas/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webAppUrl: urlInput.trim() }),
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || 'Respons diterima dari Web App.',
        version: data.version || '3.2',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Gagal terhubung ke Web App: ' + (err.message || 'Network error'),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCreateDemoQuiz = async () => {
    if (!urlInput.trim()) {
      showToast('Harap simpan dan masukkan URL Web App terlebih dahulu.');
      return;
    }
    setIsCreatingDemo(true);
    setDemoCreatedResult(null);

    try {
      const res = await fetch('/api/gas/create-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: urlInput.trim(),
          title: 'Tes Kuis Soalpintar.ai Bridge v3.3',
          quiz_id: 'demo-' + Date.now().toString().slice(-5),
          guru_name: nameInput.trim() || 'Guru',
          folder_name: nameInput.trim() || 'Guru',
          shuffle_questions: shuffleQ,
          shuffle_options: shuffleO,
          questions: [
            {
              type: 'choice',
              question: 'Planet apakah yang memiliki julukan Planet Merah dalam tata surya kita?',
              options: ['Merkurius', 'Venus', 'Mars', 'Jupiter'],
              answer: 2, // Mars (index 2)
            },
            {
              type: 'choice',
              question: 'Organel sel yang berfungsi sebagai tempat terjadinya respirasi seluler adalah...',
              options: ['Mitokondria', 'Ribosom', 'Kloroplas', 'Badan Golgi'],
              answer: 0, // Mitokondria
            },
            {
              type: 'essay',
              question: 'Jelaskan perbedaan mendasar antara sel tumbuhan dan sel hewan beserta fungsinya!',
              options: [],
              answer: 0,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.success && data.form_url) {
        setDemoCreatedResult({
          form_url: data.form_url,
          edit_url: data.edit_url,
          form_id: data.form_id,
        });
        showToast('Form demo Google Forms berhasil dibuat!');
      } else {
        showToast('Gagal membuat demo form: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setIsCreatingDemo(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(EXACT_CODE_GS);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([EXACT_CODE_GS], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
            GOOGLE APPS SCRIPT BRIDGE v3.2
          </span>
          <span className="text-xs text-slate-400">· Full Automation & Live Grading</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Pengaturan URL Web App & Script Code.gs
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Hubungkan Web App Google Apps Script ke dashboard Soalpintar.ai untuk membuat formulir kuis otomatis di Google Drive Anda dan menarik hasil nilai siswa secara real-time.
        </p>
      </div>

      {/* Grid: Settings Left, Instructions & Code Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Settings Configuration */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Konfigurasi URL Web App</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Versi 3.3</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL Web App Google Apps Script:
                </label>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Dapatkan URL ini setelah melakukan <em>Deploy &gt; New deployment &gt; Web app</em> di script.google.com
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Guru / Folder Penyimpanan di Drive:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Nama Guru atau Mapel"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block flex items-center gap-1">
                  <Folder className="w-3 h-3 text-emerald-600 inline" />
                  Disimpan ke folder Google Drive: <code className="text-emerald-600 font-mono">v2-soalpintar.ai / {nameInput || 'Guru'}</code>
                </span>
              </div>

              {/* Shuffling Options */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Opsi Pengacakan Soal (Anti-Contek)</span>
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQ}
                    onChange={(e) => setShuffleQ(e.target.checked)}
                    className="mt-0.5 rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block">Acak Urutan Soal (setShuffleQuestions)</span>
                    <span className="text-[11px] text-slate-400">
                      Setiap siswa menerima urutan nomor soal yang berbeda di Google Form.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  <input
                    type="checkbox"
                    checked={shuffleO}
                    onChange={(e) => setShuffleO(e.target.checked)}
                    className="mt-0.5 rounded-sm text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-semibold block">Acak Urutan Pilihan Jawaban (A/B/C/D)</span>
                    <span className="text-[11px] text-slate-400">
                      Memerlukan layanan <em>Google Forms API</em> diaktifkan di menu Services (+) Apps Script.
                    </span>
                  </div>
                </label>
              </div>

              {/* Test Connection Button */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Mengecek...' : 'Uji Koneksi Web App'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan Pengaturan
                </button>
              </div>

              {/* Test Status Banner */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testResult.success ? 'Web App Terhubung Aktif!' : 'Koneksi Gagal'}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed">{testResult.message}</p>
                  {testResult.version && (
                    <div className="mt-1 font-mono text-[10px] opacity-80">
                      Versi Script: {testResult.version} · Siap untuk pembuatan kuis otomatis & live grading.
                    </div>
                  )}
                </div>
              )}

              {/* Action: Test Create Demo Form in Drive */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Uji Langsung Pembuatan Form ke Google Drive:
                </div>
                <button
                  type="button"
                  onClick={handleCreateDemoQuiz}
                  disabled={isCreatingDemo}
                  className="w-full py-2.5 px-3 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Play className={`w-3.5 h-3.5 ${isCreatingDemo ? 'animate-spin' : ''}`} />
                  {isCreatingDemo ? 'Sedang Membuat Form di Google Drive...' : 'Buat Form Uji Coba ke Google Drive'}
                </button>

                {demoCreatedResult && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                    <div className="font-bold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Form Berhasil Dibuat di Google Drive!</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div>
                        <strong>Tautan Siswa:</strong>{' '}
                        <a
                          href={demoCreatedResult.form_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 underline font-mono break-all"
                        >
                          {demoCreatedResult.form_url}
                        </a>
                      </div>
                      <div>
                        <strong>Editor Guru:</strong>{' '}
                        <a
                          href={demoCreatedResult.edit_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 underline font-mono break-all"
                        >
                          {demoCreatedResult.edit_url}
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code.gs Viewer & 10-Step Setup Guide */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step by step guide */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Petunjuk Setup Google Apps Script (Hanya 1x Saja)</span>
            </div>

            <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
              <li>
                Buka tab baru ke{' '}
                <a
                  href="https://script.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 underline font-semibold"
                >
                  https://script.google.com
                </a>
              </li>
              <li>
                Klik tombol <strong className="text-slate-900 dark:text-slate-100">"New Project"</strong> (Project Baru).
              </li>
              <li>
                Hapus seluruh isi file default, lalu tempelkan (<em className="text-emerald-600">Paste</em>) seluruh kode script di bawah ini.
              </li>
              <li>
                Klik menu <strong className="text-slate-900 dark:text-slate-100">Deploy &gt; New deployment</strong>.
              </li>
              <li>
                Pilih jenis type: <strong className="text-slate-900 dark:text-slate-100">Web app</strong>.
              </li>
              <li>
                Atur <strong>Execute as:</strong> <span className="font-semibold text-emerald-600">Me (akun Anda)</span>.
              </li>
              <li>
                Atur <strong>Who has access:</strong> <span className="font-semibold text-emerald-600">Anyone</span> (Siapa saja, agar dashboard dapat mengirimkan soal).
              </li>
              <li>
                Klik tombol <strong className="text-slate-900 dark:text-slate-100">Deploy</strong> dan berikan izin akses Google Drive saat diminta.
              </li>
              <li>
                Salin (<em className="text-emerald-600">Copy</em>) URL Web App yang muncul (berakhiran <code className="font-mono text-emerald-600">/exec</code>).
              </li>
              <li>
                Tempelkan URL tersebut ke kolom <strong>URL Web App</strong> di sebelah kiri, lalu klik <strong>Simpan Pengaturan</strong>.
              </li>
            </ol>
          </div>

          {/* Script Code Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Kode Script Lengkap: Code.gs (Versi 3.3 - Tanpa Nomor Soal)
                </span>
                <p className="text-[11px] text-slate-400">
                  Mendukung pembuatan formulir kuis, kunci jawaban, 100 poin otomatis, acak soal, dan penarikan nilai siswa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  title="Unduh file Code.gs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh .gs
                </button>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Kode Script'}
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono max-h-96 overflow-y-auto leading-relaxed border border-slate-800 select-all">
                {EXACT_CODE_GS}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white shadow-2xl text-xs font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
};
