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
 * VERSI 3.5.2 (Auto-Fallback FormApp & Bebas Error 403)
 */

var SCRIPT_VERSION = '3.5.2';

/**
 * SHIM GOOGLE FORMS API v1 (via UrlFetchApp - Opsional)
 * Otomatis fallback ke FormApp jika Google Forms REST API belum diaktifkan di GCP.
 */
var Forms = {
  Form: {
    get: function (formId) {
      return formsApi_('get', 'https://forms.googleapis.com/v1/forms/' + formId);
    },
    batchUpdate: function (requestBody, formId) {
      return formsApi_(
        'post',
        'https://forms.googleapis.com/v1/forms/' + formId + ':batchUpdate',
        requestBody
      );
    },
    Responses: {
      list: function (formId, opts) {
        opts = opts || {};
        var qs = [];
        if (opts.pageSize) qs.push('pageSize=' + opts.pageSize);
        if (opts.pageToken) qs.push('pageToken=' + encodeURIComponent(opts.pageToken));
        if (opts.filter) qs.push('filter=' + encodeURIComponent(opts.filter));
        var url = 'https://forms.googleapis.com/v1/forms/' + formId + '/responses' +
          (qs.length ? '?' + qs.join('&') : '');
        return formsApi_('get', url);
      }
    }
  }
};

function formsApi_(method, url, body) {
  var cache = CacheService.getScriptCache();
  if (cache.get('FORMS_REST_DISABLED') === '1') {
    throw new Error('FORMS_REST_DISABLED');
  }

  var options = {
    method: method,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };
  if (body) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(body);
  }
  var res = UrlFetchApp.fetch(url, options);
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    var text = res.getContentText();
    if (code === 403 && text.indexOf('SERVICE_DISABLED') !== -1) {
      // Simpan status selama 10 menit agar tidak mengulang request 403
      cache.put('FORMS_REST_DISABLED', '1', 600);
    }
    throw new Error('Forms API ' + code + ': ' + text);
  }
  return JSON.parse(res.getContentText());
}

/**
 * Validasi token rahasia jika properti API_SECRET diatur di Script Properties.
 */
function isAuthorized(tokenFromRequest) {
  var expectedSecret = PropertiesService.getScriptProperties().getProperty('API_SECRET');
  if (!expectedSecret) return true;
  return String(tokenFromRequest || '') === String(expectedSecret);
}

/**
 * Membersihkan awalan "undefined.", tanda titik berlebih,
 * serta nomor urut soal (1–3 digit diikuti tanda baca + spasi wajib).
 */
function cleanQuestionTitle(str) {
  return String(str || '')
    .replace(/^[\\s\\u00A0]*(?:undefined\\s*\\.?\\s*|\\.+\\s+|(?:no\\.?\\s*)?\\d{1,3}[\\.\\)\\-:]\\s+)+/i, '')
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

/**
 * Menyimpan cache pemetaan published_id -> form_id di ScriptProperties.
 */
function cacheFormMapping(form) {
  try {
    var pubUrl = form.getPublishedUrl() || '';
    var match = pubUrl.match(/\\/forms\\/d\\/e\\/([^\\/]+)/);
    if (match && match[1]) {
      PropertiesService.getScriptProperties().setProperty('PUB_MAP_' + match[1], form.getId());
    }
  } catch (e) {
    // Abaikan jika gagal menyimpan cache
  }
}

/**
 * Sanitasi daftar pilihan ganda agar tidak kosong dan tidak duplikat.
 */
function sanitizeChoices(rawOptions, correctIndex) {
  var list = Array.isArray(rawOptions) ? rawOptions : [];
  var seen = {};
  var cleaned = [];

  for (var j = 0; j < list.length; j++) {
    var text = String(list[j] === null || list[j] === undefined ? '' : list[j]).trim();
    if (!text) text = 'Opsi ' + (j + 1);

    while (seen[text]) {
      text += '\\u200B';
    }
    seen[text] = true;
    cleaned.push({
      text: text,
      isCorrect: (j === correctIndex)
    });
  }

  if (cleaned.length === 0) {
    cleaned.push({ text: 'Pilihan A', isCorrect: true });
  }
  return cleaned;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonOut({ status: 'error', version: SCRIPT_VERSION, message: 'Payload kosong.' });
    }

    var data = JSON.parse(e.postData.contents);
    var urlToken = (e.parameter && e.parameter.token) || data.token;
    if (!isAuthorized(urlToken)) {
      return jsonOut({ status: 'error', code: 'unauthorized', version: SCRIPT_VERSION, message: 'Token API tidak valid.' });
    }

    hasLock = lock.tryLock(15000);

    var quizId = data.quiz_id || '';
    var title = data.title || 'Quiz soalpintar.ai';
    var guruName = data.guru_name || 'Guru';
    var questions = Array.isArray(data.questions) ? data.questions : [];
    var folderName = data.folder_name || guruName;
    var totalQuestions = questions.length;

    // 0. Cek folder & form yang sudah pernah dibuat untuk Quiz ID ini
    var parentFolderName = 'v2-soalpintar.ai';
    var folders = DriveApp.getFoldersByName(parentFolderName);
    var parentFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(parentFolderName);

    var guruFolders = parentFolder.getFoldersByName(folderName);
    var guruFolder = guruFolders.hasNext() ? guruFolders.next() : parentFolder.createFolder(folderName);

    if (quizId) {
      var searchName = 'Quiz: ' + title + ' [ID-' + quizId + ']';
      var files = guruFolder.getFilesByName(searchName);
      if (files.hasNext()) {
        var file = files.next();
        try {
          var existingForm = FormApp.openById(file.getId());
          cleanExistingFormTitles(existingForm);
          cacheFormMapping(existingForm);
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
          // Lanjut buat baru jika file lama korup/tidak bisa dibuka
        }
      }
    }

    // Hitung poin per soal agar total = 100
    var pointsPerQuestion = totalQuestions > 0 ? Math.floor(100 / totalQuestions) : 1;
    var remainder = totalQuestions > 0 ? 100 - (pointsPerQuestion * totalQuestions) : 0;

    // Buat Google Form baru
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
    var namaItem = form.addTextItem();
    namaItem.setTitle('Nama Lengkap');
    namaItem.setRequired(true);
    namaItem.setHelpText('Masukkan nama lengkap Anda');

    var absenItem = form.addTextItem();
    absenItem.setTitle('Nomor Absen');
    absenItem.setRequired(true);
    absenItem.setHelpText('Masukkan nomor absen Anda');

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

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i] || {};
      var pts = pointsPerQuestion + (i < remainder ? 1 : 0);
      var cleanTitle = cleanQuestionTitle(q.question) || ('Pertanyaan ' + (i + 1));

      if (q.type === 'essay') {
        var essayItem = form.addParagraphTextItem();
        essayItem.setTitle(cleanTitle);
        essayItem.setRequired(true);
        essayItem.setPoints(pts);
      } else {
        var mcItem = form.addMultipleChoiceItem();
        mcItem.setTitle(cleanTitle);
        mcItem.setRequired(true);
        mcItem.setPoints(pts);

        var safeChoices = sanitizeChoices(q.options, q.answer);
        var choices = [];
        for (var j = 0; j < safeChoices.length; j++) {
          choices.push(mcItem.createChoice(safeChoices[j].text, safeChoices[j].isCorrect));
        }
        mcItem.setChoices(choices);
      }
    }

    // Acak urutan soal / pilihan jawaban (opsional)
    var shuffleInfo = applyShuffle(form, !!data.shuffle_questions, !!data.shuffle_options);

    // Pindahkan file form ke folder guru
    var formFile = DriveApp.getFileById(form.getId());
    if (quizId) {
      formFile.setName('Quiz: ' + title + ' [ID-' + quizId + ']');
    }
    formFile.moveTo(guruFolder);

    cacheFormMapping(form);

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
      shuffle_options: shuffleInfo.options,
      shuffle_note: shuffleInfo.message
    });

  } catch (error) {
    return jsonOut({
      status: 'error',
      version: SCRIPT_VERSION,
      message: error.toString()
    });
  } finally {
    if (hasLock) {
      lock.releaseLock();
    }
  }
}

/**
 * doGet: aksi BACA & PEMELIHARAAN.
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'version') {
      return jsonOut({ status: 'ok', version: SCRIPT_VERSION, script_version: SCRIPT_VERSION });
    }

    if (!isAuthorized(p.token)) {
      return jsonOut({ status: 'error', code: 'unauthorized', version: SCRIPT_VERSION, message: 'Token API tidak valid.' });
    }

    if (p.action === 'responses') {
      return jsonOut(
        getFormResponses(
          p.form_id,
          p.since,
          p.offset,
          p.limit,
          p.summary_only === '1',
          p.nocache === '1'
        )
      );
    }
    if (p.action === 'find_form') return jsonOut(findFormByPublishedId(p.published_id));
    if (p.action === 'set_shuffle') {
      var target = FormApp.openById(p.form_id);
      var info = applyShuffle(target, p.questions === '1', p.options === '1');
      return jsonOut({
        status: 'success',
        version: SCRIPT_VERSION,
        shuffle_questions: info.questions,
        shuffle_options: info.options,
        options_message: info.message
      });
    }
    if (p.action === 'clean_titles' && p.form_id) {
      var formToClean = FormApp.openById(p.form_id);
      cleanExistingFormTitles(formToClean);
      return jsonOut({
        status: 'success',
        version: SCRIPT_VERSION,
        form_id: p.form_id,
        message: 'Judul soal berhasil dibersihkan.'
      });
    }

    return jsonOut({
      status: 'ok',
      message: 'soalpintar.ai Form Creator is running!',
      version: SCRIPT_VERSION,
      script_version: SCRIPT_VERSION
    });
  } catch (error) {
    return jsonOut({ status: 'error', message: error.toString(), version: SCRIPT_VERSION });
  }
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ambil respons form beserta skor kuis.
 */
function getFormResponses(formId, sinceMs, offsetParam, limitParam, summaryOnly, noCache) {
  if (!formId) return { status: 'error', message: 'form_id wajib diisi', version: SCRIPT_VERSION };

  var offset = Math.max(0, parseInt(offsetParam, 10) || 0);
  var limit = Math.min(2000, Math.max(1, parseInt(limitParam, 10) || 1000));
  var cacheKey = 'RESP_' + formId + '_' + (sinceMs || '0') + '_' + offset + '_' + limit + '_' + (summaryOnly ? '1' : '0');

  var cache = CacheService.getScriptCache();
  if (!noCache) {
    var cached = cache.get(cacheKey);
    if (cached) {
      try {
        var parsedCache = JSON.parse(cached);
        parsedCache.from_cache = true;
        return parsedCache;
      } catch (e) {}
    }
  }

  // 2. Jalur Cepat: Google Forms REST API v1 (hanya dicoba jika belum ditandai disabled)
  if (typeof Forms !== 'undefined' && cache.get('FORMS_REST_DISABLED') !== '1') {
    try {
      var fastResult = getResponsesViaFormsApi(formId, sinceMs, offset, limit, summaryOnly);
      if (fastResult) {
        try {
          var serialized = JSON.stringify(fastResult);
          if (serialized.length < 95000) cache.put(cacheKey, serialized, 60);
        } catch (e) {}
        return fastResult;
      }
    } catch (apiErr) {
      // Otomatis lanjut ke fallback FormApp tanpa error
    }
  }

  // 3. Jalur Utama / Fallback: FormApp teroptimasi (100% kompatibel tanpa GCP setup)
  var form;
  try {
    form = FormApp.openById(formId);
  } catch (err) {
    return {
      status: 'error',
      code: 'no_access',
      message: 'Form tidak bisa dibuka oleh akun Google ini. Pastikan form ada di akun yang sama dengan Apps Script.',
      version: SCRIPT_VERSION
    };
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
      if (!idItems.name && title.indexOf('nama') !== -1) idItems.name = it;
      else if (!idItems.absen && title.indexOf('absen') !== -1) idItems.absen = it;
      else if (!idItems.kelas && title.indexOf('kelas') !== -1) idItems.kelas = it;
    }

    if (isQuiz && offset === 0) {
      var pts = itemPoints(it);
      maxScore += pts;
      if (pts > 0) itemMeta.push(describeItem(it, pts));
    }
  }

  var responses = sinceMs ? form.getResponses(new Date(Number(sinceMs))) : form.getResponses();
  var total = responses.length;
  var end = Math.min(total, offset + limit);
  var rows = [];

  for (var r = offset; r < end; r++) {
    var resp = responses[r];
    var rName = idItems.name ? resp.getResponseForItem(idItems.name) : null;
    var rAbsen = idItems.absen ? resp.getResponseForItem(idItems.absen) : null;
    var rKelas = idItems.kelas ? resp.getResponseForItem(idItems.kelas) : null;

    var row = {
      id: resp.getId(),
      submitted_at: resp.getTimestamp().toISOString(),
      email: resp.getRespondentEmail() || null,
      name: rName ? String(rName.getResponse() || '') : null,
      absen: rAbsen ? String(rAbsen.getResponse() || '') : null,
      kelas: rKelas ? String(rKelas.getResponse() || '') : null,
      score: null
    };

    if (isQuiz) {
      var score = 0;
      var graded = resp.getGradableItemResponses();
      if (!summaryOnly) row.answers = {};

      for (var g = 0; g < graded.length; g++) {
        var gScore = Number(graded[g].getScore() || 0);
        score += gScore;

        if (!summaryOnly) {
          var raw = graded[g].getResponse();
          row.answers[String(graded[g].getItem().getId())] = {
            r: Array.isArray(raw) ? raw.join(' | ') : (raw === null || raw === undefined ? '' : String(raw)),
            s: gScore
          };
        }
      }
      row.score = score;
    }
    rows.push(row);
  }

  var output = {
    status: 'success',
    version: SCRIPT_VERSION,
    engine: 'formapp_fast',
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

  try {
    var outStr = JSON.stringify(output);
    if (outStr.length < 95000) cache.put(cacheKey, outStr, 60);
  } catch (e) {}

  return output;
}

/**
 * Helper Jalur Cepat: Mengambil ribuan respons via Google Forms API v1.
 */
function getResponsesViaFormsApi(formId, sinceMs, offset, limit, summaryOnly) {
  var formMeta = Forms.Form.get(formId);
  var isQuiz = Boolean(formMeta.settings && formMeta.settings.quizSettings && formMeta.settings.quizSettings.isQuiz);
  var maxScore = 0;
  var itemMeta = [];
  var qIdToItemId = {};
  var idQIds = { name: null, absen: null, kelas: null };

  (formMeta.items || []).forEach(function (item) {
    var q = item.questionItem && item.questionItem.question;
    if (!q) return;

    var qId = q.questionId;
    var decItemId = String(parseInt(item.itemId, 16));
    qIdToItemId[qId] = decItemId;

    var lowerTitle = (item.title || '').toLowerCase();
    if (q.textQuestion && !q.textQuestion.paragraph) {
      if (!idQIds.name && lowerTitle.indexOf('nama') !== -1) idQIds.name = qId;
      else if (!idQIds.absen && lowerTitle.indexOf('absen') !== -1) idQIds.absen = qId;
      else if (!idQIds.kelas && lowerTitle.indexOf('kelas') !== -1) idQIds.kelas = qId;
    }

    if (isQuiz && offset === 0) {
      var pts = Number((q.grading && q.grading.pointValue) || 0);
      maxScore += pts;
      if (pts > 0) {
        var choices = [];
        var correctVals = {};
        if (q.grading && q.grading.correctAnswers && q.grading.correctAnswers.answers) {
          q.grading.correctAnswers.answers.forEach(function (a) { correctVals[a.value] = true; });
        }
        if (q.choiceQuestion && q.choiceQuestion.options) {
          q.choiceQuestion.options.forEach(function (opt) {
            choices.push({ value: opt.value, correct: Boolean(correctVals[opt.value]) });
          });
        }
        itemMeta.push({
          id: decItemId,
          title: item.title || '',
          type: q.choiceQuestion ? 'MULTIPLE_CHOICE' : 'PARAGRAPH_TEXT',
          points: pts,
          choices: choices
        });
      }
    }
  });

  var allResponses = [];
  var pageToken = null;
  do {
    var listOpts = { pageSize: 5000 };
    if (sinceMs) listOpts.filter = 'timestamp >= ' + new Date(Number(sinceMs)).toISOString();
    if (pageToken) listOpts.pageToken = pageToken;

    var apiRes = Forms.Form.Responses.list(formId, listOpts);
    if (apiRes.responses && apiRes.responses.length) {
      allResponses = allResponses.concat(apiRes.responses);
    }
    pageToken = apiRes.nextPageToken || null;
  } while (pageToken && allResponses.length < offset + limit);

  var total = allResponses.length;
  var end = Math.min(total, offset + limit);
  var rows = [];

  for (var r = offset; r < end; r++) {
    var resp = allResponses[r];
    var ansMap = resp.answers || {};

    function extractText(qId) {
      if (!qId || !ansMap[qId] || !ansMap[qId].textAnswers || !ansMap[qId].textAnswers.answers) return null;
      return ansMap[qId].textAnswers.answers.map(function (a) { return a.value || ''; }).join(' | ');
    }

    var row = {
      id: resp.responseId,
      submitted_at: resp.lastSubmittedTime || resp.createTime,
      email: resp.respondentEmail || null,
      name: extractText(idQIds.name),
      absen: extractText(idQIds.absen),
      kelas: extractText(idQIds.kelas),
      score: isQuiz ? Number(resp.totalScore || 0) : null
    };

    if (isQuiz && !summaryOnly) {
      row.answers = {};
      Object.keys(ansMap).forEach(function (qId) {
        var decId = qIdToItemId[qId];
        if (!decId) return;
        var aObj = ansMap[qId];
        var valStr = (aObj.textAnswers && aObj.textAnswers.answers)
          ? aObj.textAnswers.answers.map(function (x) { return x.value || ''; }).join(' | ')
          : '';
        row.answers[decId] = {
          r: valStr,
          s: Number((aObj.grade && aObj.grade.score) || 0)
        };
      });
    }

    rows.push(row);
  }

  var formObj = FormApp.openById(formId);
  return {
    status: 'success',
    version: SCRIPT_VERSION,
    engine: 'forms_api_v1',
    form_id: formId,
    title: (formMeta.info && formMeta.info.title) || formObj.getTitle(),
    is_quiz: isQuiz,
    max_score: isQuiz ? maxScore : null,
    items: offset === 0 ? itemMeta : [],
    total: total,
    offset: offset,
    has_more: Boolean(pageToken) || end < total,
    next_offset: (Boolean(pageToken) || end < total) ? end : null,
    accepting_responses: formObj.isAcceptingResponses(),
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
 * Acak urutan soal & pilihan jawaban.
 * Hanya memanggil Forms REST API jika shuffleOptions === true.
 */
function applyShuffle(form, shuffleQuestions, shuffleOptions) {
  var messages = [];
  var result = { questions: shuffleQuestions, options: false, message: '' };
  form.setShuffleQuestions(shuffleQuestions);

  if (shuffleQuestions) {
    messages.push('Catatan: Google Forms juga mengacak urutan isian identitas siswa (Nama/Absen/Kelas) saat acak soal aktif.');
  }

  // Jika tidak diminta mengacak pilihan jawaban, langsung selesai tanpa memanggil REST API
  if (!shuffleOptions) {
    result.message = messages.join(' ');
    return result;
  }

  try {
    var full = Forms.Form.get(form.getId());
    var requests = [];
    (full.items || []).forEach(function (item, index) {
      var q = item.questionItem && item.questionItem.question;
      if (q && q.choiceQuestion) {
        requests.push({
          updateItem: {
            item: { questionItem: { question: { choiceQuestion: { shuffle: true } } } },
            location: { index: index },
            updateMask: 'questionItem.question.choiceQuestion.shuffle'
          }
        });
      }
    });
    if (requests.length) Forms.Form.batchUpdate({ requests: requests }, form.getId());
    result.options = true;
  } catch (err) {
    messages.push('Acak pilihan jawaban dilewati (Google Forms REST API tidak aktif di GCP).');
  }

  result.message = messages.join(' ');
  return result;
}

/**
 * Cari form berdasarkan published_id.
 */
function findFormByPublishedId(publishedId) {
  if (!publishedId) return { status: 'error', message: 'published_id wajib diisi', version: SCRIPT_VERSION };

  var props = PropertiesService.getScriptProperties();
  var cachedId = props.getProperty('PUB_MAP_' + publishedId);

  if (cachedId) {
    try {
      var cachedForm = FormApp.openById(cachedId);
      return {
        status: 'success',
        version: SCRIPT_VERSION,
        form_id: cachedForm.getId(),
        title: cachedForm.getTitle(),
        is_quiz: cachedForm.isQuiz(),
        from_cache: true
      };
    } catch (e) {
      props.deleteProperty('PUB_MAP_' + publishedId);
    }
  }

  var files = DriveApp.getFilesByType(MimeType.GOOGLE_FORMS);
  var checked = 0;
  while (files.hasNext() && checked < 250) {
    var file = files.next();
    checked++;
    try {
      var f = FormApp.openById(file.getId());
      cacheFormMapping(f);
      if ((f.getPublishedUrl() || '').indexOf(publishedId) !== -1) {
        return {
          status: 'success',
          version: SCRIPT_VERSION,
          form_id: f.getId(),
          title: f.getTitle(),
          is_quiz: f.isQuiz()
        };
      }
    } catch (err) {
      // Lewati form yang tidak bisa dibuka
    }
  }

  return {
    status: 'error',
    code: 'not_found',
    message: 'Form tidak ditemukan di Google Drive akun ini (dicek ' + checked + ' form).',
    version: SCRIPT_VERSION
  };
}

/**
 * Fungsi pengujian koneksi (aman dijalankan tanpa error meskipun REST API v1 tidak aktif).
 */
function testFormsApi() {
  var formId = '1FnQiCEnVvCqXG4OsP6UlcV_U7o4DSFEv-RwjOmvGZqQ';

  // 1. Uji jalur utama FormApp (wajib berjalan)
  var form = FormApp.openById(formId);
  Logger.log('[OK] FormApp berhasil terhubung. Judul Form: ' + form.getTitle());

  // 2. Uji jalur opsional Google Forms REST API v1
  try {
    CacheService.getScriptCache().remove('FORMS_REST_DISABLED');
    var f = Forms.Form.get(formId);
    Logger.log('[OK] Google Forms REST API v1 aktif. Judul: ' + f.info.title);
  } catch (err) {
    Logger.log('[INFO] Google Forms REST API v1 tidak aktif di project GCP ini. Script otomatis berjalan normal menggunakan FormApp.');
  }
}`;

interface GasSettingsViewProps {
  webAppUrl: string;
  onSaveWebAppUrl: (url: string) => void;
  gasApiSecret?: string;
  onSaveGasApiSecret?: (secret: string) => void;
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
  gasApiSecret = '',
  onSaveGasApiSecret,
  guruName,
  onSaveGuruName,
  shuffleQuestions,
  onSaveShuffleQuestions,
  shuffleOptions,
  onSaveShuffleOptions,
}) => {
  const [urlInput, setUrlInput] = useState(webAppUrl);
  const [secretInput, setSecretInput] = useState(gasApiSecret);
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

  useEffect(() => {
    setSecretInput(gasApiSecret);
  }, [gasApiSecret]);

  const handleSaveSettings = () => {
    onSaveWebAppUrl(urlInput.trim());
    if (onSaveGasApiSecret) {
      onSaveGasApiSecret(secretInput.trim());
    }
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
        body: JSON.stringify({
          webAppUrl: urlInput.trim(),
          apiSecret: secretInput.trim() || undefined,
        }),
      });
      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText && !rawText.trim().startsWith('<') ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }
      if (!data) {
        setTestResult({
          success: false,
          message: `Respons Web App bukan JSON valid (HTTP ${res.status}). Pastikan Web App sudah di-Deploy ulang sebagai New version dengan akses "Anyone".`,
        });
        return;
      }
      setTestResult({
        success: Boolean(res.ok && data.success),
        message: data.message || 'Respons diterima dari Web App.',
        version: data.version || '3.5.2',
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
          apiSecret: secretInput.trim() || undefined,
          title: 'Tes Kuis Soalpintar.ai Bridge v3.5.2',
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

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText && !rawText.trim().startsWith('<') ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }
      if (res.ok && data?.success && data.form_url) {
        setDemoCreatedResult({
          form_url: data.form_url,
          edit_url: data.edit_url || '',
          form_id: data.form_id || '',
        });
        showToast('Form demo Google Forms berhasil dibuat!');
      } else {
        showToast('Gagal membuat demo form: ' + (data?.message || `HTTP ${res.status}`));
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
            GOOGLE APPS SCRIPT BRIDGE v3.5.2
          </span>
          <span className="text-xs text-slate-400">· Auto-Fallback FormApp, Bebas Error 403 &amp; Live Grading</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
          Pengaturan URL Web App & Script Code.gs
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Hubungkan Web App Google Apps Script ke dashboard Soalpintar.ai untuk membuat formulir kuis otomatis di Google Drive Anda dan menarik ribuan hasil nilai siswa secara cepat.
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
              <span className="text-[11px] font-mono text-slate-400">Versi 3.5.2</span>
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>API_SECRET (Opsional — Keamanan Web App):</span>
                </label>
                <input
                  type="password"
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="Kosongkan jika API_SECRET tidak diatur di Apps Script"
                  className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Isi sesuai Script Property <code className="font-mono text-emerald-600">API_SECRET</code> jika Anda mengaktifkan proteksi token di Apps Script.
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
                      Menggunakan Google Forms REST API v1 jika aktif di GCP (otomatis dilewati dengan aman jika belum aktif).
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
                      Versi Script: {testResult.version} · Siap untuk pembuatan kuis otomatis &amp; live grading.
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
                  Kode Script Lengkap: Code.gs (Versi 3.5.2 - Auto-Fallback FormApp &amp; Bebas Error 403)
                </span>
                <p className="text-[11px] text-slate-400">
                  Mendukung shim Google Forms API v1 (UrlFetchApp) dengan auto-fallback aman ke FormApp tanpa error 403, API_SECRET opsional, LockService, cache find_form, &amp; testFormsApi().
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
