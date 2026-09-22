// Guide page mini quiz: 6 connective questions comparing -아서/-(으)니까/-는데/-지만
(function () {
  const box = document.getElementById('quiz-connectives');
  if (!box) return;
  const LANG = ['ja', 'vi'].includes(box.dataset.lang) ? box.dataset.lang : 'en';
  const L = {
    ok: (LANG === 'ja' ? '正解' : LANG === 'vi' ? 'Đúng' : 'Natural'),
    no: (LANG === 'ja' ? '不正解' : LANG === 'vi' ? 'Chưa đúng' : 'Not quite')
  };

  const Q = [
    {
      lead: '비가 ',
      blank: '______',
      rest: ' 우산을 가져가세요.',
      opts: [
        { lab: '오니까', sub: '-(으)니까', grade: 'ok',
          why: {
            en: 'Natural! -(으)니까 introduces a reason followed by a request or command (-세요). -아서/어서 cannot be used with commands.',
            ja: '正解！後ろに命令・依頼（-세요）が続くときは、理由・前提に -(으)니까 を使います。-아서/어서 は命令文に使えません。',
            vi: 'Đúng! Khi vế sau là câu mệnh lệnh hoặc yêu cầu (-세요), phải dùng -(으)니까 để chỉ lý do. -아서/어서 không được đi với câu mệnh lệnh.'
          }
        },
        { lab: '와서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Not quite. -아서/어서 cannot be followed by commands or requests (-세요). Use -(으)니까 instead.',
            ja: '惜しい！-아서/어서 の後ろには命令文・依頼文（-세요）を使うことができません。この場合は -(으)니까 を使います。',
            vi: 'Chưa đúng. -아서/어서 không thể đi với câu mệnh lệnh hay đề nghị (-세요). Phải dùng -(으)니까.'
          }
        },
        { lab: '오지만', sub: '-지만', grade: 'no',
          why: {
            en: 'Not quite. -지만 expresses contrast ("although"), but here rain is the reason to take an umbrella.',
            ja: '違います。-지만 は「〜けれど」という逆接を表しますが、ここでは傘を持って行く理由を表す文です。',
            vi: 'Chưa đúng. -지만 biểu thị tương phản (nhưng), trong khi ở đây trời mưa là lý do để mang ô.'
          }
        }
      ]
    },
    {
      lead: '배가 ',
      blank: '______',
      rest: ' 밥을 먹어요.',
      opts: [
        { lab: '고파서', sub: '-아서/어서', grade: 'ok',
          why: {
            en: 'Natural! -아서/어서 expresses natural, physiological cause and effect (hungry → eat meal).',
            ja: '正解！お腹が空いたからご飯を食べるという自然な原因・結果には -아서/어서 が最も自然です。',
            vi: 'Đúng! -아서/어서 diễn tả nguyên nhân - kết quả tự nhiên, trực tiếp (đói bụng nên ăn cơm).'
          }
        },
        { lab: '고프지만', sub: '-지만', grade: 'no',
          why: {
            en: 'Not quite. -지만 means "although/but". Hunger is the reason you eat, not a contradiction.',
            ja: '違います。-지만（〜けれど）だと「お腹が空いているのに食べる」という不自然な矛盾になってしまいます。',
            vi: 'Chưa đúng. -지만 mang nghĩa tương phản (nhưng), làm câu trở nên mâu thuẫn không hợp lý.'
          }
        },
        { lab: '고픈데', sub: '-(으)ㄴ데', grade: 'no',
          why: {
            en: 'Not quite. -(으)ㄴ데 sets up conversational background or mild contrast, whereas -아서/어서 is the direct cause for eating when hungry.',
            ja: '惜しい！-(으)ㄴ데 は前置きや軽い対比を表すため、単なる直接の理由・因果関係には -아서/어서 を使います。',
            vi: 'Chưa đúng. -(으)ㄴ데 dùng để mở đầu bối cảnh, còn nguyên nhân trực tiếp dẫn tới hành động ăn cơm là -아서/어서.'
          }
        }
      ]
    },
    {
      lead: '저는 ',
      blank: '______',
      rest: ' 친구를 만나요.',
      opts: [
        { lab: '바쁜데', sub: '-(으)ㄴ데', grade: 'ok',
          why: {
            en: 'Natural! -(으)ㄴ데 provides background / mild contrast ("I am busy, but I am meeting a friend"). Adjectives take -(으)ㄴ데.',
            ja: '正解！「忙しいけれど・忙しいのですが」という前置き・背景には -(으)ㄴ데 を使います。形容詞には -(으)ㄴ데 がつきます。',
            vi: 'Đúng! -(으)ㄴ데 tạo bối cảnh / tương phản nhẹ ("tôi bận nhưng gặp bạn"). Tính từ đi với -(으)ㄴ데.'
          }
        },
        { lab: '바빠서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Contradiction! -아서/어서 marks direct cause, but being busy is not the reason why you meet a friend.',
            ja: '意味が不自然！-아서/어서 を使うと「忙しいから（それが理由で）友達に会う」というおかしな因果関係になってしまいます。',
            vi: 'Mâu thuẫn! -아서/어서 chỉ nguyên nhân trực tiếp, bận rộn không thể là lý do để đi gặp bạn.'
          }
        },
        { lab: '바쁘고', sub: '-고', grade: 'no',
          why: {
            en: 'Not quite. -고 lists non-contrasting states or actions, without the contrast needed here.',
            ja: '違います。-고 は単純な並列（〜で、〜くて）なので、逆接・対比のニュアンスが出ません。',
            vi: 'Chưa đúng. -고 chỉ dùng để liệt kê thuần túy, không thể hiện được ý tương phản.'
          }
        }
      ]
    },
    {
      lead: '한국어가 ',
      blank: '______',
      rest: ' 재미있어요.',
      opts: [
        { lab: '어렵지만', sub: '-지만', grade: 'ok',
          why: {
            en: 'Natural! -지만 marks a clear, direct contrast between two opposite facts (difficult, but fun).',
            ja: '正解！「難しいけれど面白い」という2つの事実の明確な対比・逆接には -지만 を使います。',
            vi: 'Đúng! -지만 biểu thị tương phản rõ ràng giữa hai đặc điểm đối lập (khó nhưng thú vị).'
          }
        },
        { lab: '어려워서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Not quite. -아서/어서 would state that difficulty caused the fun ("Because it is difficult, it is fun").',
            ja: '意味が不自然！-아서/어서 だと「韓国語は難しいから面白い」という因果関係になってしまいます。',
            vi: 'Chưa đúng. -아서/어서 biến câu thành "vì khó nên thú vị" (nguyên nhân - kết quả), không phải ý tương phản.'
          }
        },
        { lab: '어려우니까', sub: '-(으)니까', grade: 'no',
          why: {
            en: 'Not quite. -(으)니까 gives a reason or justification, not a contrast between difficulty and fun.',
            ja: '違います。-(으)니까 は理由・判断の根拠を表す語尾なので、対比には使えません。',
            vi: 'Chưa đúng. -(으)니까 chỉ căn cứ/lý do, không dùng để đối lập hai tính chất trái ngược.'
          }
        }
      ]
    },
    {
      lead: '저는 밥을 ',
      blank: '______',
      rest: ' 커피를 마셔요.',
      opts: [
        { lab: '먹고', sub: '-고', grade: 'ok',
          why: {
            en: 'Natural! -고 connects two chronological actions in a row (eat meal, and then drink coffee).',
            ja: '正解！「ご飯を食べて（それから）コーヒーを飲む」という動作の順序並列には -고 を使います。',
            vi: 'Đúng! -고 dùng để nối hai hành động diễn ra nối tiếp nhau theo thời gian (ăn cơm rồi uống cà phê).'
          }
        },
        { lab: '먹어서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Incorrect! -아서/어서 implies eating was the cause or prerequisite reason for drinking coffee.',
            ja: '不自然！-아서/어서 だと「ご飯を食べたことが原因・前提でコーヒーを飲む」という因果関係になってしまいます。',
            vi: 'Không đúng! -아서/어서 biến hành động ăn cơm thành nguyên nhân dẫn đến việc uống cà phê.'
          }
        },
        { lab: '먹으면', sub: '-(으)면', grade: 'no',
          why: {
            en: 'Not quite. -(으)면 makes a conditional clause ("if/when I eat"), not a statement of routine actions.',
            ja: '違います。-(으)면 は仮定・条件（〜したら、〜すれば）になるため、日常の動作の並列には適しません。',
            vi: 'Chưa đúng. -(으)면 là câu điều kiện (nếu ăn cơm), không phù hợp để kể các hành động nối tiếp thông thường.'
          }
        }
      ]
    },
    {
      lead: '어제 비가 ',
      blank: '______',
      rest: ' 집에 있었어요.',
      opts: [
        { lab: '와서', sub: '-아서/어서 (현재형)', grade: 'ok',
          why: {
            en: 'Correct! Past tense (-았/었-) can NEVER attach to -아서/어서. Even for yesterday’s events, keep the connective in the present stem (와서) and mark the past tense on the final verb (있었어요).',
            ja: '正解！-아서/어서 には過去形 -았/었- を付けることができません。昨日の出来事でも接続部は現在語幹（와서）のままで、文全体の過去は末尾の動詞（있었어요）で表します。',
            vi: 'Chính xác! Đuôi -아서/어서 TUYỆT ĐỐI KHÔNG chia thì quá khứ (-았/었-). Dù kể chuyện hôm qua, đuôi liên kết vẫn giữ nguyên (와서) và thì quá khứ chỉ chia ở động từ cuối câu (있었어요).'
          }
        },
        { lab: '왔어서', sub: '과거형 결합 오류 ✗', grade: 'no',
          why: {
            en: 'Common mistake! -았/었- can NEVER attach before -아서/어서 (*왔어서 is ungrammatical). Always use 와서.',
            ja: 'よくある大間違い！-아서/어서 の前に過去形 -았/었- は絶対に付けられません（×왔어서 → ○와서）。',
            vi: 'Lỗi rất phổ biến! Không bao giờ ghép -았/었- trước -아서/어서 (sai: 왔어서 → đúng: 와서).'
          }
        },
        { lab: '오고', sub: '-고', grade: 'no',
          why: {
            en: 'Not quite. The rain was the reason for staying home, not just an unrelated simultaneous action.',
            ja: '違います。雨が降ったことが家にいた理由なので、並列の -고 では因果関係が伝わりません。',
            vi: 'Chưa đúng. Trời mưa là lý do ở nhà, dùng -고 (liệt kê) không diễn đạt được quan hệ nguyên nhân.'
          }
        }
      ]
    }
  ];

  Q.forEach(q => {
    const d = document.createElement('div');
    d.className = 'qz';
    d.innerHTML = `<p class="qz-s" lang="ko">${q.lead}<b><u>${q.blank}</u></b>${q.rest}</p>` +
      `<div class="p-opts conn">${q.opts.map((o, idx) => `<button type="button" class="p-opt" data-idx="${idx}"><span lang="ko">${o.lab}</span><small>${o.sub}</small></button>`).join('')}</div>` +
      `<p class="qz-why" hidden></p>`;
    const whyEl = d.querySelector('.qz-why');
    d.querySelectorAll('.p-opt').forEach(btn => {
      btn.onclick = () => {
        const idx = +btn.dataset.idx;
        const opt = q.opts[idx];
        d.querySelectorAll('.p-opt').forEach(b => {
          b.classList.remove('on', 'ok', 'no');
        });
        btn.classList.add('on', opt.grade);
        whyEl.hidden = false;
        whyEl.className = 'qz-why ' + opt.grade;
        whyEl.innerHTML = `<span class="tag">${L[opt.grade]}</span> ${opt.why[LANG] || opt.why.en}`;
      };
    });
    box.appendChild(d);
  });
})();
