/* Royal Sales HR - bilingual (Bengali + English) A4 payslip drawing and PDF.
 * Drawn on a canvas (so Bengali shapes correctly) and placed into jsPDF, one page per slip. Needs: jsPDF (global `jspdf`). */
(function () {
  const W = 794, H = 1123, S = 2;                       // A4 at 96 dpi, drawn at 2x
  const NAVY = '#0F1F4D', BLUE = '#283891', ORANGE = '#F15A29', INK = '#0F172A', MUTE = '#5B6577', LINE = '#D9DFEA', SOFT = '#F4F6FB';
  const BN = '"Noto Sans Bengali","Inter",sans-serif', EN = '"Inter","Noto Sans Bengali",sans-serif';
  const DIG = '০১২৩৪৫৬৭৮৯';
  const BN_MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const EN_MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const toBn = s => String(s).replace(/\d/g, d => DIG[d]);
  const tk = n => '৳ ' + toBn(Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }));
  const dBn = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? toBn(+m[3]) + ' ' + BN_MON[+m[2] - 1] + ' ' + toBn(m[1]) : '—'; };
  const STAT = { Finalized: ['পরিশোধ বাকি', 'Unpaid'], Partly: ['আংশিক পরিশোধ', 'Partly paid'], Paid: ['পরিশোধিত', 'Paid in full'] };

  function loadImg(src) { return new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
  async function fonts() {
    if (!document.fonts) return;
    await Promise.all(['400 14px "Noto Sans Bengali"', '600 14px "Noto Sans Bengali"', '700 14px "Noto Sans Bengali"', '400 14px "Inter"', '600 14px "Inter"', '700 14px "Inter"'].map(f => document.fonts.load(f, 'আ A')));
  }
  const font = (x, w, px, en) => { x.font = w + ' ' + px + 'px ' + (en ? EN : BN); };
  function fit(x, str, w, px, min, maxW, en) { let p = px; font(x, w, p, en); while (x.measureText(str).width > maxW && p > min) { p -= 0.5; font(x, w, p, en); } return p; }
  function txt(x, s, px, py, o) { o = o || {}; x.fillStyle = o.color || INK; x.textAlign = o.align || 'left'; x.textBaseline = 'middle'; x.fillText(s, px, py); }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  function wrapLines(x, str, maxW, maxLines) {
    const words = String(str).split(/\s+/), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + ' …'; }
    return lines;
  }
  // bilingual label: Bengali on top, English small underneath
  function label(x, bn, en, px, py) { font(x, 600, 15, false); txt(x, bn, px, py, { color: INK }); font(x, 400, 11, true); txt(x, en, px, py + 16, { color: MUTE }); }

  async function render(slip, company, logoUrl) {
    await fonts();
    const logo = await loadImg(logoUrl);
    const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const x = c.getContext('2d'); x.scale(S, S);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    // header
    x.fillStyle = NAVY; x.fillRect(0, 0, W, 132);
    x.fillStyle = ORANGE; x.fillRect(0, 132, W, 5);
    x.fillStyle = '#fff'; rr(x, 40, 26, 80, 80, 14); x.fill();
    if (logo) { const r = Math.min(68 / logo.width, 68 / logo.height); x.drawImage(logo, 46 + (68 - logo.width * r) / 2, 32 + (68 - logo.height * r) / 2, logo.width * r, logo.height * r); }
    fit(x, company.name_bn || '', 700, 26, 16, 600, false); txt(x, company.name_bn || '', 142, 48, { color: '#fff' });
    fit(x, company.name_en || '', 600, 15, 11, 600, true); txt(x, company.name_en || '', 142, 76, { color: '#C8D2F0' });
    const contact = [company.address_bn, [company.phone_1, company.phone_2].filter(Boolean).map(toBn).join(', ')].filter(Boolean).join('  ·  ');
    fit(x, contact, 400, 12, 9, 610, false); txt(x, contact, 142, 104, { color: '#C8D2F0' });
    // title
    const mi = +slip.month.slice(5, 7) - 1;
    font(x, 700, 28, false); txt(x, 'বেতন স্লিপ', 40, 178, { color: BLUE });
    font(x, 600, 14, true); txt(x, 'PAYSLIP', 40, 206, { color: MUTE });
    font(x, 700, 22, false); txt(x, BN_MON[mi] + ' ' + toBn(slip.month.slice(0, 4)), W - 40, 178, { align: 'right', color: INK });
    font(x, 600, 14, true); txt(x, EN_MON[mi] + ' ' + slip.month.slice(0, 4), W - 40, 206, { align: 'right', color: MUTE });
    // employee card
    x.fillStyle = SOFT; rr(x, 40, 232, W - 80, 138, 12); x.fill();
    const col = [64, 420];
    const cell = (cx, cy, bn, en, val, valEn) => {
      font(x, 400, 11, false); txt(x, bn + ' · ' + en, cx, cy, { color: MUTE });
      fit(x, val, 700, 17, 11, 320, false); txt(x, val, cx, cy + 22, { color: INK });
      if (valEn) { fit(x, valEn, 400, 12, 9, 320, true); txt(x, valEn, cx, cy + 41, { color: MUTE }); }
    };
    cell(col[0], 254, 'নাম', 'Name', slip.name_bn, slip.name_en);
    cell(col[1], 254, 'আইডি নং', 'ID No', slip.employee_id, '');
    cell(col[1], 322, 'পদবী', 'Designation', slip.designation_bn || '—', slip.designation_en);
    cell(col[0], 322, 'যোগদানের তারিখ', 'Joining date', dBn(slip.joining_date), '');
    // salary section
    let y = 398;
    const heading = (bn, en) => { x.fillStyle = BLUE; rr(x, 40, y, W - 80, 30, 8); x.fill(); font(x, 700, 15, false); txt(x, bn, 56, y + 15, { color: '#fff' }); font(x, 600, 12, true); txt(x, en, W - 56, y + 15, { align: 'right', color: '#C8D2F0' }); y += 38; };
    heading('বেতনের হিসাব', 'Salary calculation');
    const row = (bn, en, val, note, bold) => {
      const lines = note ? wrapLines((font(x, 400, 12, false), x), note, 470, 2) : [];
      const h = lines.length ? 54 + lines.length * 16 : 46;
      label(x, bn, en, 56, y + 14);
      font(x, bold ? 700 : 600, bold ? 19 : 17, false); txt(x, val, W - 56, y + 18, { align: 'right', color: INK });
      if (lines.length) { font(x, 400, 12, false); lines.forEach((l, i) => txt(x, l, 56, y + 54 + i * 16, { color: MUTE })); }
      y += h; x.strokeStyle = LINE; x.lineWidth = 1; x.beginPath(); x.moveTo(40, y); x.lineTo(W - 40, y); x.stroke();
    };
    let salNote = '';
    if (slip.salary_changes && slip.salary_changes.length) {
      const how = { split: 'দিন ভাগ করে হিসাব', old: 'পুরো মাস পুরনো হারে', new: 'পুরো মাস নতুন হারে' }[slip.mode] || '';
      salNote = 'মাসের মাঝে বেতন বদলেছে (' + slip.salary_changes.map(c => dBn(c.from) + ' থেকে ' + tk(c.amount)).join(', ') + ')' + (how ? ' — ' + how : '');
    }
    row('মাসিক বেতন', 'Monthly salary', slip.monthly_salary === null ? 'মিশ্র হার' : tk(slip.monthly_salary), salNote);
    const denom = slip.partial ? slip.employed_days : (slip.monthly_salary === null ? slip.month_days : 30);
    row('হিসাবের দিন', 'Days counted', toBn(slip.days_worked) + ' / ' + toBn(denom) + ' দিন',
      slip.partial ? 'আংশিক মাস: মাসিক বেতন ÷ ৩০ × ' + toBn(slip.employed_days) + ' দিন (যোগদান বা চাকরি ছাড়ার কারণে)' : 'পুরো মাস কর্মরত ছিলেন, তাই পূর্ণ মাসিক বেতন');
    row('মোট বেতন', 'Gross pay', tk(slip.gross), '');
    const ded = slip.deductions || [];
    row('অনুপস্থিতির কর্তন', 'Absence deduction', slip.deduction ? '− ' + tk(slip.deduction) : '—',
      ded.length ? toBn(ded.length) + ' দিন: ' + ded.map(d => toBn(+d.date.slice(8)) + ' তারিখ' + (d.note ? ' (' + d.note + ')' : '')).join(', ') : 'কোনো কর্তন নেই');
    // net band
    y += 8; x.fillStyle = NAVY; rr(x, 40, y, W - 80, 62, 12); x.fill();
    font(x, 700, 18, false); txt(x, 'প্রদেয় বেতন', 60, y + 24, { color: '#fff' }); font(x, 600, 12, true); txt(x, 'Net payable', 60, y + 44, { color: '#C8D2F0' });
    font(x, 700, 28, false); txt(x, tk(slip.net), W - 60, y + 31, { align: 'right', color: '#fff' });
    x.fillStyle = ORANGE; x.fillRect(40, y + 62, W - 80, 4); y += 90;
    // payments
    heading('পরিশোধের বিবরণ', 'Payment details');
    const pays = slip.payments || [];
    if (!pays.length) { font(x, 400, 14, false); txt(x, 'এখনও কোনো পরিশোধ নথিভুক্ত হয়নি · No payment recorded yet', 56, y + 12, { color: MUTE }); y += 34; }
    else {
      font(x, 600, 11, true); txt(x, 'তারিখ · Date', 56, y + 6, { color: MUTE }); txt(x, 'নোট · Note', 300, y + 6, { color: MUTE }); txt(x, 'টাকা · Amount', W - 56, y + 6, { align: 'right', color: MUTE }); y += 20;
      pays.slice(0, 7).forEach(p => {
        font(x, 400, 14, false); txt(x, dBn(p.date), 56, y + 10, { color: INK });
        fit(x, p.note || '', 400, 13, 9, 260, false); txt(x, p.note || '', 300, y + 10, { color: MUTE });
        font(x, 600, 14, false); txt(x, tk(p.amount), W - 56, y + 10, { align: 'right', color: INK });
        y += 26; x.strokeStyle = LINE; x.beginPath(); x.moveTo(40, y); x.lineTo(W - 40, y); x.stroke();
      });
      if (pays.length > 7) { font(x, 400, 12, false); txt(x, '… আরও ' + toBn(pays.length - 7) + 'টি পরিশোধ আছে', 56, y + 10, { color: MUTE }); y += 24; }
      y += 8;
    }
    const st = STAT[slip.pay_status] || ['', ''];
    const tot = (bn, en, val, px, color) => { label(x, bn, en, px, y + 12); font(x, 700, 18, false); txt(x, val, px, y + 52, { color: color || INK }); };
    tot('পরিশোধিত', 'Paid', tk(slip.paid), 56);
    tot('বাকি', 'Due', slip.due ? tk(slip.due) : '—', 300, slip.due ? '#B42318' : INK);
    x.textAlign = 'right'; font(x, 700, 15, false); x.fillStyle = slip.pay_status === 'Paid' ? '#067647' : '#B54708';
    x.fillText(st[0], W - 56, y + 18); font(x, 600, 11, true); x.fillStyle = MUTE; x.fillText(st[1], W - 56, y + 38);
    y += 84;
    // signatures
    const sy = Math.max(y + 40, 960);
    x.strokeStyle = MUTE; x.lineWidth = 1;
    [[56, 'গ্রহীতার স্বাক্ষর', "Receiver's signature"], [W - 56 - 230, 'অনুমোদনকারীর স্বাক্ষর', 'Authorized signature']].forEach(s => {
      x.beginPath(); x.moveTo(s[0], sy); x.lineTo(s[0] + 230, sy); x.stroke();
      font(x, 600, 13, false); txt(x, s[1], s[0] + 115, sy + 16, { align: 'center', color: INK }); font(x, 400, 11, true); txt(x, s[2], s[0] + 115, sy + 33, { align: 'center', color: MUTE });
    });
    font(x, 400, 11, false); txt(x, 'কম্পিউটারে তৈরি পে স্লিপ · Computer-generated payslip', W / 2, H - 38, { align: 'center', color: MUTE });
    x.fillStyle = ORANGE; x.fillRect(0, H - 14, W, 4); x.fillStyle = BLUE; x.fillRect(0, H - 10, W, 10);
    return c;
  }

  // Eid bonus receipt (same look as the payslip)
  async function renderBonus(b, company, logoUrl) {
    await fonts();
    const logo = await loadImg(logoUrl);
    const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const x = c.getContext('2d'); x.scale(S, S);
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.fillStyle = NAVY; x.fillRect(0, 0, W, 132);
    x.fillStyle = ORANGE; x.fillRect(0, 132, W, 5);
    x.fillStyle = '#fff'; rr(x, 40, 26, 80, 80, 14); x.fill();
    if (logo) { const r = Math.min(68 / logo.width, 68 / logo.height); x.drawImage(logo, 46 + (68 - logo.width * r) / 2, 32 + (68 - logo.height * r) / 2, logo.width * r, logo.height * r); }
    fit(x, company.name_bn || '', 700, 26, 16, 600, false); txt(x, company.name_bn || '', 142, 48, { color: '#fff' });
    fit(x, company.name_en || '', 600, 15, 11, 600, true); txt(x, company.name_en || '', 142, 76, { color: '#C8D2F0' });
    const contact = [company.address_bn, [company.phone_1, company.phone_2].filter(Boolean).map(toBn).join(', ')].filter(Boolean).join('  ·  ');
    fit(x, contact, 400, 12, 9, 610, false); txt(x, contact, 142, 104, { color: '#C8D2F0' });
    font(x, 700, 28, false); txt(x, 'ঈদ বোনাস রসিদ', 40, 178, { color: BLUE });
    font(x, 600, 14, true); txt(x, 'EID BONUS RECEIPT', 40, 206, { color: MUTE });
    fit(x, b.eid_name + ' ' + toBn(b.eid_date.slice(0, 4)), 700, 22, 14, 330, false); txt(x, b.eid_name + ' ' + toBn(b.eid_date.slice(0, 4)), W - 40, 178, { align: 'right', color: INK });
    font(x, 600, 14, false); txt(x, 'ঈদের তারিখ · ' + dBn(b.eid_date), W - 40, 206, { align: 'right', color: MUTE });
    x.fillStyle = SOFT; rr(x, 40, 232, W - 80, 138, 12); x.fill();
    const col = [64, 420];
    const cell = (cx, cy, bn, en, val, valEn) => {
      font(x, 400, 11, false); txt(x, bn + ' · ' + en, cx, cy, { color: MUTE });
      fit(x, val, 700, 17, 11, 320, false); txt(x, val, cx, cy + 22, { color: INK });
      if (valEn) { fit(x, valEn, 400, 12, 9, 320, true); txt(x, valEn, cx, cy + 41, { color: MUTE }); }
    };
    cell(col[0], 254, 'নাম', 'Name', b.name_bn, b.name_en);
    cell(col[1], 254, 'আইডি নং', 'ID No', b.employee_id, '');
    cell(col[1], 322, 'পদবী', 'Designation', b.designation_bn || '—', b.designation_en);
    cell(col[0], 322, 'যোগদানের তারিখ', 'Joining date', dBn(b.joining_date), '');
    let y = 398;
    x.fillStyle = BLUE; rr(x, 40, y, W - 80, 30, 8); x.fill(); font(x, 700, 15, false); txt(x, 'বোনাসের হিসাব', 56, y + 15, { color: '#fff' }); font(x, 600, 12, true); txt(x, 'Bonus calculation', W - 56, y + 15, { align: 'right', color: '#C8D2F0' }); y += 38;
    const row = (bn, en, val, note) => {
      const lines = note ? wrapLines((font(x, 400, 12, false), x), note, 470, 2) : [];
      const h = lines.length ? 54 + lines.length * 16 : 46;
      label(x, bn, en, 56, y + 14);
      font(x, 600, 17, false); txt(x, val, W - 56, y + 18, { align: 'right', color: INK });
      lines.forEach((l, i) => { font(x, 400, 12, false); txt(x, l, 56, y + 54 + i * 16, { color: MUTE }); });
      y += h; x.strokeStyle = LINE; x.lineWidth = 1; x.beginPath(); x.moveTo(40, y); x.lineTo(W - 40, y); x.stroke();
    };
    const rule = b.source === 'rule';
    if (rule) {
      row('মাসিক বেতন', 'Monthly salary', tk(b.salary), 'বোনাস তৈরির দিনের সর্বশেষ পূর্ণ মাসিক বেতন');
      row('বোনাসের হার', 'Bonus rate', toBn(b.percent) + '%', 'কর্তন বা অনুপস্থিতির কারণে বোনাস কমে না');
      row('সেবার সময়', 'Service up to Eid', b.service_days === null || b.service_days === '' ? '—' : toBn(Math.floor(b.service_days / 365)) + ' বছর ' + toBn(b.service_days % 365) + ' দিন', 'ঈদের দিন পর্যন্ত; ন্যূনতম ১ বছর সেবা প্রয়োজন');
    } else {
      row('বোনাসের ধরন', 'Bonus type', 'বিশেষ সিদ্ধান্তে', 'মালিকপক্ষের সিদ্ধান্ত অনুযায়ী নির্ধারিত অঙ্ক');
    }
    y += 8; x.fillStyle = NAVY; rr(x, 40, y, W - 80, 62, 12); x.fill();
    font(x, 700, 18, false); txt(x, 'ঈদ বোনাস', 60, y + 24, { color: '#fff' }); font(x, 600, 12, true); txt(x, 'Eid bonus amount', 60, y + 44, { color: '#C8D2F0' });
    font(x, 700, 28, false); txt(x, tk(b.amount), W - 60, y + 31, { align: 'right', color: '#fff' });
    x.fillStyle = ORANGE; x.fillRect(40, y + 62, W - 80, 4); y += 90;
    x.fillStyle = BLUE; rr(x, 40, y, W - 80, 30, 8); x.fill(); font(x, 700, 15, false); txt(x, 'পরিশোধের তথ্য', 56, y + 15, { color: '#fff' }); font(x, 600, 12, true); txt(x, 'Payment', W - 56, y + 15, { align: 'right', color: '#C8D2F0' }); y += 44;
    label(x, 'পরিশোধের নির্ধারিত তারিখ', 'Scheduled pay date', 56, y + 12); font(x, 700, 16, false); txt(x, dBn(b.pay_due_date), 56, y + 52, { color: INK });
    label(x, 'পরিশোধের তারিখ', 'Paid on', 330, y + 12); font(x, 700, 16, false); txt(x, b.status === 'Paid' ? dBn(b.paid_date) : '—', 330, y + 52, { color: INK });
    const paid = b.status === 'Paid';
    x.textAlign = 'right'; font(x, 700, 15, false); x.fillStyle = paid ? '#067647' : '#B54708'; x.fillText(paid ? 'নগদে পরিশোধিত' : 'পরিশোধ বাকি', W - 56, y + 18);
    font(x, 600, 11, true); x.fillStyle = MUTE; x.fillText(paid ? 'Paid in cash' : 'Unpaid', W - 56, y + 38);
    y += 84;
    const sy = Math.max(y + 40, 960);
    x.strokeStyle = MUTE; x.lineWidth = 1;
    [[56, 'গ্রহীতার স্বাক্ষর', "Receiver's signature"], [W - 56 - 230, 'অনুমোদনকারীর স্বাক্ষর', 'Authorized signature']].forEach(s => {
      x.beginPath(); x.moveTo(s[0], sy); x.lineTo(s[0] + 230, sy); x.stroke();
      font(x, 600, 13, false); txt(x, s[1], s[0] + 115, sy + 16, { align: 'center', color: INK }); font(x, 400, 11, true); txt(x, s[2], s[0] + 115, sy + 33, { align: 'center', color: MUTE });
    });
    font(x, 400, 11, false); txt(x, 'কম্পিউটারে তৈরি রসিদ · Computer-generated receipt', W / 2, H - 38, { align: 'center', color: MUTE });
    x.fillStyle = ORANGE; x.fillRect(0, H - 14, W, 4); x.fillStyle = BLUE; x.fillRect(0, H - 10, W, 10);
    return c;
  }

  function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function pdf(canvases, name) {
    const doc = new jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    canvases.forEach((c, i) => { if (i) doc.addPage('a4', 'portrait'); doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297); });
    saveBlob(doc.output('blob'), name);
  }
  // Puts the slips onto A4 pages: 1 per page, or 4 per page (2 x 2, each at exactly half size) with cut lines
  function layout(cans, per) {
    if (per !== 4) return cans;
    const PW = W * S, PH = H * S, pages = [];
    for (let i = 0; i < cans.length; i += 4) {
      const pg = document.createElement('canvas'); pg.width = PW; pg.height = PH;
      const x = pg.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
      const cw = PW / 2, ch = PH / 2, m = 0.02 * PW / 2;           // 2% margin inside each cell for printers
      cans.slice(i, i + 4).forEach((c, k) => { const col = k % 2, row = Math.floor(k / 2); x.drawImage(c, col * cw + m, row * ch + m * (PH / PW), cw - 2 * m, (cw - 2 * m) * (PH / PW)); });
      x.strokeStyle = '#B8C0D0'; x.lineWidth = 2; x.setLineDash([14, 10]);
      x.beginPath(); x.moveTo(cw, 0); x.lineTo(cw, PH); x.moveTo(0, ch); x.lineTo(PW, ch); x.stroke();
      pages.push(pg);
    }
    return pages;
  }
  window.PAYSLIP = { render, renderBonus, pdf, layout };
})();
