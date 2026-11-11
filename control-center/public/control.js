/* PROMPTROOM — Local Control Center client
   Polling + SSE, log viewer, preflight, activity history.
   Plain browser JS. No build step. */

(function () {
  'use strict';

  var $ = function (id) {
    return document.getElementById(id);
  };

  var els = {
    statusHero: $('statusHero'),
    statusDot: $('statusDot'),
    statusLabel: $('statusLabel'),
    statusMode: $('statusMode'),
    sseStatus: $('sseStatus'),
    statusTitle: $('statusTitle'),
    statusDesc: $('statusDesc'),
    uptime: $('uptime'),
    appUrl: $('appUrl'),
    pid: $('pid'),
    memory: $('memory'),
    port: $('port'),
    startBtn: $('startBtn'),
    stopBtn: $('stopBtn'),
    restartBtn: $('restartBtn'),
    forceBtn: $('forceBtn'),
    autoRestart: $('autoRestart'),
    appLink: $('appLink'),
    apiHealth: $('apiHealth'),
    apiHealthNote: $('apiHealthNote'),
    apiSignal: $('apiSignal'),
    memMetric: $('memMetric'),
    portMetric: $('portMetric'),
    portNote: $('portNote'),
    buildMetric: $('buildMetric'),
    buildNote: $('buildNote'),
    logStream: $('logStream'),
    logFilter: $('logFilter'),
    autoscrollBtn: $('autoscrollBtn'),
    clearLogsBtn: $('clearLogsBtn'),
    logCount: $('logCount'),
    checks: $('checks'),
    checksScore: $('checksScore'),
    refreshChecks: $('refreshChecks'),
    buildBtn: $('buildBtn'),
    killPortBtn: $('killPortBtn'),
    appCardLink: $('appCardLink'),
    appCardUrl: $('appCardUrl'),
    history: $('history'),
    lastAction: $('lastAction'),
    toasts: $('toasts'),
    clock: $('clock')
  };

  var state = null;
  var logs = [];
  var seenLogIds = new Set();
  var autoscroll = true;
  var filter = '';
  var busy = false;
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-mode]'));

  var STATUS_LABEL = {
    stopped: 'STOPPED',
    starting: 'STARTING',
    running: 'RUNNING',
    external: 'EXTERNAL',
    stopping: 'STOPPING',
    building: 'BUILDING',
    error: 'ERROR'
  };

  var STATUS_COPY = {
    stopped: {
      title: 'เซิร์ฟเวอร์หยุดอยู่',
      desc: 'กด Start เพื่อรันเซิร์ฟเวอร์บนเครื่องนี้ แล้วเปิดเว็บไซต์เพื่อทดสอบก่อนขึ้นโฮสต์จริง'
    },
    starting: {
      title: 'กำลังสตาร์ทเซิร์ฟเวอร์…',
      desc: 'กำลังรอให้ API ตอบสนองที่ /api/health โดยปกติใช้เวลา 2–5 วินาที'
    },
    running: {
      title: 'เซิร์ฟเวอร์ทำงานอยู่',
      desc: 'ทุกอย่างพร้อมทดสอบบนเครื่องนี้ เปิดเว็บไซต์แล้วตรวจหน้า Studio, Library และ Brands ได้เลย'
    },
    external: {
      title: 'พบเซิร์ฟเวอร์ที่ไม่ได้เปิดจากที่นี่',
      desc: 'มีโปรเซสตอบสนองบนพอร์ตนี้อยู่ แต่ Control Center ไม่ได้เป็นคนเปิด — กด Stop เพื่อปิด หรือ Kill port owner เพื่อเคลียร์พอร์ต'
    },
    stopping: {
      title: 'กำลังหยุดเซิร์ฟเวอร์…',
      desc: 'กำลังส่งสัญญาณปิดและรอให้ process tree ออกอย่างเรียบร้อย'
    },
    building: {
      title: 'กำลัง build production…',
      desc: 'กำลังสร้าง dist/ ใหม่ ระหว่างนี้ยังสตาร์ทโหมด Production ไม่ได้'
    },
    error: {
      title: 'เซิร์ฟเวอร์มีปัญหา',
      desc: 'ขาดการติดต่อกับ API หรือโปรเซสออกผิดปกติ ตรวจ log ด้านล่างแล้วกด Restart อีกครั้ง'
    }
  };

  /* ---------------- helpers ---------------- */

  function api(path, options) {
    var opts = options || {};
    opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(path, opts).then(function (response) {
      return response
        .json()
        .catch(function () {
          return {};
        })
        .then(function (body) {
          if (!response.ok) {
            throw new Error(body.error || 'คำขอไม่สำเร็จ (' + response.status + ')');
          }
          return body;
        });
    });
  }

  function formatUptime(seconds) {
    var total = Math.max(0, Math.round(Number(seconds) || 0));
    if (total < 60) return total + 's';
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
    return String(m).padStart(2, '0') + 'm ' + String(s).padStart(2, '0') + 's';
  }

  function formatClock(iso) {
    var date = iso ? new Date(iso) : new Date();
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  function toast(message, kind) {
    if (!els.toasts) return;
    var node = document.createElement('div');
    node.className = 'toast' + (kind === 'error' ? ' error' : '');
    var text = document.createElement('span');
    text.textContent = message;
    node.appendChild(text);
    els.toasts.appendChild(node);
    window.setTimeout(function () {
      node.style.opacity = '0';
      node.style.transform = 'translateY(6px)';
      node.style.transition = 'all .2s ease';
      window.setTimeout(function () {
        node.remove();
      }, 220);
    }, kind === 'error' ? 5200 : 3200);
  }

  function setBusy(next) {
    busy = next;
    [els.startBtn, els.stopBtn, els.restartBtn, els.forceBtn, els.buildBtn, els.killPortBtn].forEach(function (btn) {
      if (!btn) return;
      if (next) btn.classList.add('is-busy');
      else btn.classList.remove('is-busy');
    });
    if (next) {
      [els.startBtn, els.stopBtn, els.restartBtn, els.forceBtn, els.buildBtn, els.killPortBtn].forEach(function (btn) {
        if (btn) btn.disabled = true;
      });
      return;
    }
    if (state) render(state);
  }

  function isUp(status) {
    return status === 'running' || status === 'external';
  }

  /* ---------------- actions ---------------- */

  function act(path, options) {
    if (busy) return Promise.resolve();
    setBusy(true);
    return api(path, options)
      .then(function (body) {
        if (body && body.state) {
          state = body.state;
          render(state);
        }
        toast('ดำเนินการแล้ว');
        return refresh();
      })
      .catch(function (error) {
        toast(error.message, 'error');
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function refresh() {
    return api('/api/state')
      .then(function (body) {
        state = body;
        render(body);
      })
      .catch(function () {
        els.sseStatus.textContent = 'LOG STREAM: OFFLINE';
      });
  }

  function confirmThen(message, fn) {
    if (window.confirm(message)) fn();
  }

  /* ---------------- render ---------------- */

  function render(next) {
    state = next;

    var status = next.status || 'stopped';
    var mode = next.mode || 'prod';
    var up = isUp(status);

    els.statusHero.setAttribute('data-status', status);
    els.statusLabel.textContent = STATUS_LABEL[status] || String(status).toUpperCase();
    els.statusMode.textContent = mode === 'dev' ? 'DEVELOPMENT · 5173' : 'PRODUCTION · ' + next.appPort;

    var copy = STATUS_COPY[status] || STATUS_COPY.stopped;
    els.statusTitle.textContent = copy.title;
    els.statusDesc.textContent = copy.desc;

    els.uptime.textContent = status === 'running' ? formatUptime(next.uptimeSeconds) : '—';
    els.appUrl.textContent = next.appUrl;
    els.pid.textContent = next.pid || next.portPid || '—';
    els.memory.textContent = next.memoryMB ? next.memoryMB + ' MB' : '—';
    els.port.textContent = next.appPort;

    if (els.appCardUrl) els.appCardUrl.textContent = next.appUrl;
    if (els.appLink) {
      els.appLink.href = next.appUrl;
      els.appLink.classList.toggle('disabled', !up);
    }
    if (els.appCardLink) {
      els.appCardLink.href = next.appUrl;
      els.appCardLink.style.opacity = up ? '' : '0.45';
      els.appCardLink.style.pointerEvents = up ? '' : 'none';
    }

    /* buttons */
    var running =
      status === 'external' ||
      (Boolean(next.pid) && (status === 'running' || status === 'starting'));
    if (els.startBtn) els.startBtn.disabled = busy || running || next.building;
    if (els.stopBtn) els.stopBtn.disabled = busy || status === 'stopped' || status === 'error' || next.building;
    if (els.restartBtn) els.restartBtn.disabled = busy || next.building;
    if (els.forceBtn) els.forceBtn.disabled = busy || status === 'stopped' || next.building;
    if (els.buildBtn) els.buildBtn.disabled = busy || next.building;
    if (els.killPortBtn) els.killPortBtn.disabled = busy || !next.portPid;

    /* mode + auto restart */
    modeButtons.forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-mode') === mode);
      btn.disabled = busy || Boolean(next.pid);
    });
    if (els.autoRestart) els.autoRestart.checked = Boolean(next.autoRestart);

    /* metrics */
    var health = next.health;
    els.apiHealth.textContent = health ? 'ONLINE' : status === 'starting' ? 'WAITING' : 'OFFLINE';
    els.apiHealthNote.textContent = health
      ? 'uptime ' + formatUptime(health.uptimeSeconds) + ' · AI ' + (health.aiEnabled ? 'เปิด' : 'ปิด')
      : 'ยังไม่ตอบสนองที่ /api/health';
    els.apiSignal.className = 'metric-signal ' + (health ? 'is-ok' : status === 'error' ? 'is-bad' : '');

    els.memMetric.textContent = next.memoryMB ? String(next.memoryMB) : '—';
    els.portMetric.textContent = next.portPid || '—';
    els.portNote.textContent = next.portPid
      ? 'โปรเซส PID ' + next.portPid + ' กำลังฟังพอร์ต ' + next.appPort
      : 'ไม่พบโปรเซสบนพอร์ต ' + next.appPort;

    els.buildMetric.textContent = next.building ? 'BUILDING' : next.distExists ? 'READY' : 'MISSING';
    els.buildNote.textContent = next.building
      ? 'กำลังคอมไพล์…'
      : next.distExists
        ? 'dist/index.html พร้อมเสิร์ฟ'
        : 'ยังไม่มี dist — กด Build ก่อน';

    els.lastAction.textContent = next.lastAction
      ? 'LAST: ' + String(next.lastAction.action).toUpperCase() + ' · ' + formatClock(next.lastAction.time)
      : '—';

    renderHistory(next.history || []);
  }

  function renderHistory(history) {
    els.history.textContent = '';
    if (!history.length) {
      var empty = document.createElement('div');
      empty.className = 'check-skeleton';
      empty.textContent = 'ยังไม่มีคำสั่ง';
      els.history.appendChild(empty);
      return;
    }
    history.forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'history-item ' + (item.ok ? 'ok' : 'bad');

      var tag = document.createElement('span');
      tag.className = 'history-tag';
      tag.textContent = String(item.action || '—').toUpperCase();

      var copy = document.createElement('div');
      copy.className = 'history-copy';

      var line = document.createElement('p');
      line.textContent = item.message || '—';

      var time = document.createElement('time');
      time.textContent = formatClock(item.time);

      copy.appendChild(line);
      copy.appendChild(time);
      row.appendChild(tag);
      row.appendChild(copy);
      els.history.appendChild(row);
    });
  }

  /* ---------------- logs ---------------- */

  function logMatches(entry) {
    if (!filter) return true;
    var needle = filter.toLowerCase();
    return (
      String(entry.text || '').toLowerCase().indexOf(needle) !== -1 ||
      String(entry.stream || '').toLowerCase().indexOf(needle) !== -1
    );
  }

  function makeLogRow(entry) {
    var row = document.createElement('div');
    row.className = 'log-row stream-' + (entry.stream === 'err' ? 'err' : entry.stream === 'system' ? 'system' : 'out');

    var time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = formatClock(entry.time);

    var tag = document.createElement('span');
    tag.className = 'log-stream-tag';
    tag.textContent = String(entry.stream || 'out').toUpperCase();

    var text = document.createElement('span');
    text.className = 'log-text';
    text.textContent = entry.text;

    row.appendChild(time);
    row.appendChild(tag);
    row.appendChild(text);
    return row;
  }

  function renderLogs() {
    var stream = els.logStream;
    stream.textContent = '';
    var visible = logs.filter(logMatches);
    if (!visible.length) {
      var empty = document.createElement('div');
      empty.className = 'log-empty';
      empty.textContent = logs.length ? 'ไม่พบ log ที่ตรงกับตัวกรอง' : 'ยังไม่มี log — กด Start เพื่อเริ่มเซิร์ฟเวอร์';
      stream.appendChild(empty);
    } else {
      var frag = document.createDocumentFragment();
      visible.forEach(function (entry) {
        frag.appendChild(makeLogRow(entry));
      });
      stream.appendChild(frag);
    }
    els.logCount.textContent = String(visible.length);
    if (autoscroll) stream.scrollTop = stream.scrollHeight;
  }

  function appendLog(entry) {
    if (!entry || seenLogIds.has(entry.id)) return;
    seenLogIds.add(entry.id);
    logs.push(entry);
    if (logs.length > 900) {
      logs.splice(0, logs.length - 900);
      if (seenLogIds.size > 1800) {
        seenLogIds = new Set(logs.map(function (item) {
          return item.id;
        }));
      }
    }
    if (!logMatches(entry)) return;

    var stream = els.logStream;
    var placeholder = stream.querySelector('.log-empty');
    if (placeholder) stream.textContent = '';
    stream.appendChild(makeLogRow(entry));

    while (stream.childElementCount > 900) stream.removeChild(stream.firstElementChild);
    els.logCount.textContent = String(stream.childElementCount);
    if (autoscroll) stream.scrollTop = stream.scrollHeight;
  }

  /* ---------------- preflight ---------------- */

  function renderChecks(data) {
    els.checks.textContent = '';
    var list = data.checks || [];
    list.forEach(function (check) {
      var row = document.createElement('div');
      row.className = 'check-item' + (check.ok ? '' : check.optional ? ' is-optional' : ' is-bad');

      var icon = document.createElement('span');
      icon.className = 'check-icon';
      icon.textContent = check.ok ? '✓' : check.optional ? '·' : '✕';

      var copy = document.createElement('div');
      copy.className = 'check-copy';

      var label = document.createElement('strong');
      label.textContent = check.label;

      var detail = document.createElement('em');
      detail.textContent = check.detail || '';

      copy.appendChild(label);
      copy.appendChild(detail);
      row.appendChild(icon);
      row.appendChild(copy);
      els.checks.appendChild(row);
    });
    els.checksScore.textContent = data.passed + '/' + data.total + ' ผ่าน';
  }

  function loadChecks() {
    if (els.checksScore) els.checksScore.textContent = 'กำลังตรวจสอบ…';
    return api('/api/checks')
      .then(renderChecks)
      .catch(function (error) {
        els.checksScore.textContent = 'ตรวจสอบไม่สำเร็จ';
        toast(error.message, 'error');
      });
  }

  /* ---------------- events ---------------- */

  function bind() {
    if (els.startBtn) {
      els.startBtn.addEventListener('click', function () {
        act('/api/start', { method: 'POST' });
      });
    }

    if (els.stopBtn) {
      els.stopBtn.addEventListener('click', function () {
        act('/api/stop', { method: 'POST' });
      });
    }

    if (els.restartBtn) {
      els.restartBtn.addEventListener('click', function () {
        act('/api/restart', { method: 'POST' });
      });
    }

    if (els.forceBtn) {
      els.forceBtn.addEventListener('click', function () {
        confirmThen('บังคับปิดทั้ง process tree ทันที? งานที่กำลังรันจะถูกตัดทิ้ง', function () {
          act('/api/force-stop', { method: 'POST' });
        });
      });
    }

    if (els.buildBtn) {
      els.buildBtn.addEventListener('click', function () {
        act('/api/build', { method: 'POST' });
      });
    }

    if (els.killPortBtn) {
      els.killPortBtn.addEventListener('click', function () {
        confirmThen('บังคับปิดโปรเซสที่ยึดพอร์ตอยู่?', function () {
          act('/api/kill-port', { method: 'POST' });
        });
      });
    }

    if (els.refreshChecks) {
      els.refreshChecks.addEventListener('click', function () {
        loadChecks();
      });
    }

    if (els.clearLogsBtn) {
      els.clearLogsBtn.addEventListener('click', function () {
        api('/api/logs/clear', { method: 'POST' })
          .then(function () {
            logs = [];
            seenLogIds.clear();
            renderLogs();
            toast('ล้าง log แล้ว');
          })
          .catch(function (error) {
            toast(error.message, 'error');
          });
      });
    }

    if (els.autoscrollBtn) {
      els.autoscrollBtn.addEventListener('click', function () {
        autoscroll = !autoscroll;
        els.autoscrollBtn.classList.toggle('is-active', autoscroll);
        if (autoscroll) els.logStream.scrollTop = els.logStream.scrollHeight;
      });
    }

    if (els.logFilter) {
      els.logFilter.addEventListener('input', function () {
        filter = els.logFilter.value.trim();
        renderLogs();
      });
    }

    modeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-mode');
        if (!state || state.mode === mode) return;
        act('/api/settings', {
          method: 'POST',
          body: JSON.stringify({ mode: mode })
        });
      });
    });

    if (els.autoRestart) {
      els.autoRestart.addEventListener('change', function () {
        act('/api/settings', {
          method: 'POST',
          body: JSON.stringify({ autoRestart: els.autoRestart.checked })
        });
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && document.activeElement === els.logFilter) {
        els.logFilter.value = '';
        filter = '';
        renderLogs();
        els.logFilter.blur();
      }
    });
  }

  function connectStream() {
    if (typeof window.EventSource === 'undefined') {
      els.sseStatus.textContent = 'LOG STREAM: UNSUPPORTED';
      return;
    }

    var source = new window.EventSource('/api/logs/stream');

    source.addEventListener('hello', function () {
      els.sseStatus.textContent = 'LOG STREAM: LIVE';
      els.sseStatus.classList.add('is-live');
    });

    source.onmessage = function (event) {
      try {
        var entry = JSON.parse(event.data);
        if (entry && entry.id) appendLog(entry);
      } catch (error) {
        /* ignore malformed frame */
      }
    };

    source.addEventListener('state', function (event) {
      try {
        var next = JSON.parse(event.data);
        if (next && next.status) render(next);
      } catch (error) {
        /* ignore malformed frame */
      }
    });

    source.onopen = function () {
      els.sseStatus.textContent = 'LOG STREAM: LIVE';
      els.sseStatus.classList.add('is-live');
    };

    source.onerror = function () {
      els.sseStatus.textContent = 'LOG STREAM: RECONNECTING';
      els.sseStatus.classList.remove('is-live');
    };
  }

  function startClock() {
    var tick = function () {
      els.clock.textContent = formatClock();
    };
    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------------- boot ---------------- */

  bind();
  startClock();
  renderLogs();

  api('/api/logs?limit=400')
    .then(function (body) {
      var byId = new Map();
      logs.concat(body.logs || []).forEach(function (entry) {
        byId.set(entry.id, entry);
      });
      logs = Array.from(byId.values())
        .sort(function (a, b) {
          return a.id - b.id;
        })
        .slice(-900);
      seenLogIds = new Set(logs.map(function (entry) {
        return entry.id;
      }));
      renderLogs();
    })
    .catch(function () {
      /* stream will fill in */
    });

  refresh();
  loadChecks();
  connectStream();

  window.setInterval(function () {
    if (!busy) refresh();
  }, 3000);
})();
