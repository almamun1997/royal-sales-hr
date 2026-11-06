/* Royal Sales HR - ID card drawing, PDF and ID-range helpers.
 * Needs: qrcode-generator (global `qrcode`) and jsPDF (global `jspdf`). */
(function () {
  const CW = 324, CH = 516, S = 2;                 // design size and pixel scale (about 300 dpi for 54 x 86 mm)
  const NAVY = '#0F1F4D', BLUE = '#283891', ORANGE = '#F15A29', INK = '#0F172A', MUTE = '#5B6577';
  const BN_FONT = '"Noto Sans Bengali","Inter",sans-serif', EN_FONT = '"Inter","Noto Sans Bengali",sans-serif';
  const BN_DIG = '০১২৩৪৫৬৭৮৯';
  const BN_MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const EN_MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const toBn = s => String(s).replace(/\d/g, d => BN_DIG[d]);
  function fmtDate(s, lang) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
    if (!m) return '—';
    return lang === 'bn' ? toBn(m[3]) + ' ' + BN_MON[+m[2] - 1] + ' ' + toBn(m[1]) : m[3] + ' ' + EN_MON[+m[2] - 1] + ' ' + m[1];
  }
  const T = {
    bn: { title: 'আইডি কার্ড', id: 'আইডি নং', joined: 'যোগদানের তারিখ', scan: 'স্ক্যান করে হাজিরা দিন', lost: 'এই কার্ড হারিয়ে পেলে অনুগ্রহ করে ফেরত দিন' },
    en: { title: 'ID CARD', id: 'ID No', joined: 'Joining Date', scan: 'Scan for attendance', lost: 'If found, please return this card' }
  };

  function loadImg(src) {
    return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  }
  async function fonts() {
    if (!document.fonts) return;
    await Promise.all(['400 14px "Noto Sans Bengali"', '600 14px "Noto Sans Bengali"', '700 14px "Noto Sans Bengali"',
      '400 14px "Inter"', '600 14px "Inter"', '700 14px "Inter"'].map(f => document.fonts.load(f, 'আ A')));
  }

  function rr(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }
  function setFont(x, lang, weight, px) { x.font = weight + ' ' + px + 'px ' + (lang === 'bn' ? BN_FONT : EN_FONT); }
  // draws text, shrinking the size until it fits maxW
  function fit(x, str, lang, weight, px, minPx, maxW) {
    let p = px; setFont(x, lang, weight, p);
    while (x.measureText(str).width > maxW && p > minPx) { p -= 0.5; setFont(x, lang, weight, p); }
    return p;
  }
  function text(x, str, px, py, o) {
    o = o || {};
    x.fillStyle = o.color || INK; x.textAlign = o.align || 'left'; x.textBaseline = 'middle';
    if ('letterSpacing' in x) x.letterSpacing = (o.spacing || 0) + 'px';
    x.fillText(str, px, py);
    if ('letterSpacing' in x) x.letterSpacing = '0px';
  }
  function wrap(x, str, maxW) {
    const words = String(str).split(/\s+/), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function newCanvas() {
    const c = document.createElement('canvas'); c.width = CW * S; c.height = CH * S;
    const x = c.getContext('2d'); x.scale(S, S); x.clearRect(0, 0, CW, CH);
    rr(x, 0, 0, CW, CH, 18); x.save(); x.clip(); x.fillStyle = '#fff'; x.fillRect(0, 0, CW, CH);
    return [c, x];
  }
  function footer(x) { x.fillStyle = ORANGE; x.fillRect(0, 502, CW, 4); x.fillStyle = BLUE; x.fillRect(0, 506, CW, 10); }
  function contain(x, img, a, b, w, h) {
    const r = Math.min(w / img.width, h / img.height), dw = img.width * r, dh = img.height * r;
    x.drawImage(img, a + (w - dw) / 2, b + (h - dh) / 2, dw, dh);
  }
  function header(x, lang, company, logo, small) {
    const h = small ? 72 : 112, tile = small ? 50 : 80, pad = small ? 16 : 20, inner = small ? 42 : 68;
    x.fillStyle = NAVY; x.fillRect(0, 0, CW, h);
    const ty = (h - tile) / 2;
    rr(x, pad, ty, tile, tile, small ? 10 : 14); x.fillStyle = '#fff'; x.fill();
    if (logo) contain(x, logo, pad + (tile - inner) / 2, ty + (tile - inner) / 2, inner, inner);
    const name = lang === 'bn' ? company.name_bn : String(company.name_en).toUpperCase();
    const tx = pad + tile + (small ? 10 : 14);
    const px = fit(x, name, lang, 700, lang === 'bn' ? (small ? 16 : 21) : (small ? 14 : 17), 11, CW - tx - 12);
    text(x, name, tx, h / 2, { color: '#fff', spacing: lang === 'en' ? 0.8 : 0 });
    x.fillStyle = ORANGE; x.fillRect(0, h, CW, 6);
  }

  function drawFront(d, company, lang, assets) {
    const [c, x] = newCanvas(); const t = T[lang];
    header(x, lang, company, assets.logo, false);
    setFont(x, lang, 700, 13); text(x, t.title, 162, 146, { color: ORANGE, align: 'center', spacing: lang === 'en' ? 3 : 0 });
    // photo
    const cx = 162, cy = 236, R = 74;
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fillStyle = ORANGE; x.fill();
    x.save(); x.beginPath(); x.arc(cx, cy, R - 5, 0, Math.PI * 2); x.clip();
    x.fillStyle = '#E3E7F5'; x.fillRect(cx - R, cy - R, R * 2, R * 2);
    if (assets.photo) {
      const im = assets.photo, s = Math.max((R * 2) / im.width, (R * 2) / im.height), w = im.width * s, h = im.height * s;
      x.drawImage(im, cx - w / 2, cy - h / 2, w, h);
    } else {
      const ch = (d.name_en || d.name_bn || '?').trim().charAt(0).toUpperCase();
      setFont(x, 'en', 700, 56); text(x, ch, cx, cy + 2, { color: '#8893C4', align: 'center' });
    }
    x.restore();
    // name and designation
    const nm = lang === 'bn' ? (d.name_bn || d.name_en) : (d.name_en || d.name_bn);
    fit(x, nm, lang, 700, 27, 15, 284); text(x, nm, cx, 340, { color: NAVY, align: 'center' });
    const des = lang === 'bn' ? d.designation_bn : (d.designation_en || d.designation_bn);
    fit(x, des, lang, 600, 14, 10, 250);
    const w = Math.min(284, x.measureText(des).width + 32);
    rr(x, cx - w / 2, 358, w, 28, 14); x.fillStyle = '#FFE8D1'; x.fill();
    text(x, des, cx, 372.5, { color: '#9A3412', align: 'center' });
    // rows
    const rows = [[t.id, d.employee_id, true], [t.joined, fmtDate(d.joining_date, lang), false]];
    rows.forEach((r, i) => {
      const y = 420 + i * 28;
      setFont(x, lang, 400, 13.5); text(x, r[0], 20, y, { color: MUTE });
      setFont(x, r[2] ? 'en' : lang, 700, 13.5); text(x, r[1], 304, y, { color: INK, align: 'right' });
      x.fillStyle = '#E3E7EF'; x.fillRect(20, y + 8, 284, 1);
    });
    footer(x); x.restore(); return c;
  }

  function drawBack(d, company, lang, assets) {
    const [c, x] = newCanvas(); const t = T[lang];
    header(x, lang, company, assets.logo, true);
    // QR with a generous white margin so it scans reliably
    const bx = 58, by = 90, bs = 208;
    rr(x, bx, by, bs, bs, 12); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 2; x.strokeStyle = NAVY; x.stroke();
    const qr = qrcode(0, 'M'); qr.addData(String(d.qr_code_value)); qr.make();
    const n = qr.getModuleCount(), area = 152, m = area / n, ox = bx + (bs - area) / 2, oy = by + (bs - area) / 2;
    x.fillStyle = NAVY;
    for (let r = 0; r < n; r++) for (let q = 0; q < n; q++) if (qr.isDark(r, q)) x.fillRect(ox + q * m - 0.15, oy + r * m - 0.15, m + 0.3, m + 0.3);
    setFont(x, lang, 400, 12.5); text(x, t.scan, 162, 314, { color: MUTE, align: 'center' });
    const ph = [company.phone_1, company.phone_2].filter(Boolean).map(p => lang === 'bn' ? toBn(p) : p);
    setFont(x, lang, 700, 16); ph.forEach((p, i) => text(x, p, 162, 344 + i * 23, { color: BLUE, align: 'center' }));
    const addr = lang === 'bn' ? company.address_bn : company.address_en;
    setFont(x, lang, 400, 13.5);
    wrap(x, addr || '', 280).slice(0, 3).forEach((l, i) => text(x, l, 162, 392 + i * 20, { color: INK, align: 'center' }));
    x.fillStyle = '#CBD3E1'; for (let i = 20; i < 304; i += 6) x.fillRect(i, 452, 3, 1);
    fit(x, t.lost, lang, 400, 11.5, 8, 284); text(x, t.lost, 162, 472, { color: MUTE, align: 'center' });
    footer(x); x.restore(); return c;
  }

  async function prepare(card, logoUrl) {
    await fonts();
    return { logo: await loadImg(logoUrl), photo: await loadImg(card.photo) };
  }
  async function renderCard(card, company, lang, logoUrl) {
    const a = await prepare(card, logoUrl);
    return { front: drawFront(card, company, lang, a), back: drawBack(card, company, lang, a) };
  }

  /* ---------- downloads ---------- */
  function saveBlob(blob, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function savePng(canvas, name) { canvas.toBlob(b => saveBlob(b, name), 'image/png'); }
  // One card, two pages (front, back), exact card size
  function pdfSingle(front, back, name) {
    const doc = new jspdf.jsPDF({ unit: 'mm', format: [54, 86], orientation: 'portrait' });
    doc.addImage(front.toDataURL('image/png'), 'PNG', 0, 0, 54, 86);
    doc.addPage([54, 86], 'portrait'); doc.addImage(back.toDataURL('image/png'), 'PNG', 0, 0, 54, 86);
    saveBlob(doc.output('blob'), name);
  }
  // A4 print sheets: fronts page(s), then backs page(s) mirrored for double-sided printing (flip on long edge)
  function pdfSheet(cards, name) {
    const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const cols = 3, rows = 3, w = 54, h = 86, gap = 8, left = (210 - (cols * w + (cols - 1) * gap)) / 2, top = (297 - (rows * h + (rows - 1) * gap)) / 2;
    const per = cols * rows; let first = true;
    for (let p = 0; p < cards.length; p += per) {
      const chunk = cards.slice(p, p + per);
      ['front', 'back'].forEach(side => {
        if (!first) doc.addPage('a4', 'portrait'); first = false;
        chunk.forEach((c, i) => {
          let col = i % cols; const row = Math.floor(i / cols);
          if (side === 'back') col = cols - 1 - col;
          const x = left + col * (w + gap), y = top + row * (h + gap);
          doc.addImage(c[side].toDataURL('image/png'), 'PNG', x, y, w, h);
          doc.setDrawColor(190); doc.setLineWidth(0.15); doc.roundedRect(x, y, w, h, 3, 3, 'S');
        });
        doc.setFontSize(7); doc.setTextColor(150);
        doc.text(side === 'front' ? 'Front' : 'Back (mirrored for double-sided printing)', 105, 290, { align: 'center' });
      });
    }
    saveBlob(doc.output('blob'), name);
  }

  /* ---------- "EMP-001, EMP-004" and "EMP-001 থেকে EMP-006" ---------- */
  function parseIds(input) {
    let s = String(input || '').replace(/[০-৯]/g, ch => BN_DIG.indexOf(ch)).toUpperCase();
    const out = [];
    s = s.replace(/([A-Z]+)-(\d+)\s*(?:থেকে|TO|–|—|-|~)\s*(?:[A-Z]+-)?(\d+)/g, (all, pre, a, b) => {
      const w = a.length, lo = +a, hi = +b;
      if (hi >= lo && hi - lo < 100) for (let i = lo; i <= hi; i++) out.push(pre + '-' + String(i).padStart(w, '0'));
      return ' ';
    });
    (s.match(/[A-Z]+-\d+/g) || []).forEach(t => out.push(t));
    return Array.from(new Set(out));
  }

  window.IDCARD = { renderCard, savePng, pdfSingle, pdfSheet, parseIds, fmtDate, toBn };
})();
