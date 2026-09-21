// Guide-page mini quiz: five particle questions judged by the same engine as the builder.
(function () {
  const M = window.Munjang, D = window.MJ_DATA, box = document.getElementById('quiz');
  if (!box) return;
  const LANG = ['ja', 'vi'].includes(box.dataset.lang) ? box.dataset.lang : 'en';
  const WHY = Object.assign({ _lang: LANG }, D.templates.why[LANG]);
  const noun = h => D.words.nouns.find(n => n.h === h), verb = h => D.words.verbs.find(v => v.h === h), tpl = id => D.templates.templates.find(t => t.id === id);
  const Q = [
    { t: tpl('act'), kind: 'SP', w: noun('저'), rest: ' 커피를 마셔요' },
    { t: tpl('is'), kind: 'SP', w: noun('김치'), rest: ' 맛있어요' },
    { t: tpl('go'), kind: 'OP', expect: 'dest', w: noun('학교'), v: verb('가다'), lead: '저는 ', rest: ' 가요' },
    { t: tpl('at'), kind: 'OP', expect: 'loc', w: noun('카페'), v: verb('마시다'), lead: '친구는 ', rest: ' 커피를 마셔요' },
    { t: tpl('act'), kind: 'OP', expect: 'obj', w: noun('책'), v: verb('읽다'), lead: '저는 ', rest: ' 읽어요' },
    { t: tpl('exist'), kind: 'SP', w: noun('고양이'), rest: ' 집에 있어요' },
  ];
  const U = window.MJ_UI || {}; const L = { ok: U.correct || 'Natural', soft: U.soft || 'Also possible', no: U.wrong || 'Not quite' };
  Q.forEach((q, i) => {
    const d = document.createElement('div'); d.className = 'qz';
    const opts = q.kind === 'SP' ? M.SP_OPTIONS : M.OP_OPTIONS;
    d.innerHTML = `<p class="qz-s" lang="ko">${q.lead || ''}<b>${q.w.h}<u>__</u></b>${q.rest}</p><div class="p-opts">${opts.map(p => `<button type="button" class="p-opt">${p}</button>`).join('')}</div><p class="qz-why" hidden></p>`;
    d.querySelectorAll('.p-opt').forEach(b => b.onclick = () => {
      const j = q.kind === 'SP' ? M.judgeSP(q.t, q.w, b.textContent, WHY) : M.judgeOP(q.t, q.expect, q.w, q.v, b.textContent, WHY);
      d.querySelectorAll('.p-opt').forEach(x => x.className = 'p-opt'); b.classList.add('on', j.grade);
      const w = d.querySelector('.qz-why'); w.hidden = false; w.className = 'qz-why ' + j.grade; w.innerHTML = `<span class="tag">${L[j.grade]}</span> ${j.why}`;
    });
    box.appendChild(d);
  });
})();
