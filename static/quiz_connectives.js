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
      hint: {
        en: 'Intended meaning: "It is raining, so please take an umbrella."',
        ja: '意図する意味：「雨が降っているから、傘を持って行ってください。」',
        vi: 'Ý định diễn đạt: "Trời đang mưa nên hãy mang theo ô nhé."'
      },
      opts: [
        { lab: '오니까', sub: '-(으)니까', grade: 'ok',
          why: {
            en: 'Natural! -(으)니까 introduces a reason followed by a request or command (-(으)세요). Causal -아서/어서 cannot be used with commands.',
            ja: '正解！後ろに命令・依頼（-(으)세요）が続くときは、理由・根拠に -(으)니까 を使います。理由の -아서/어서 は命令文に使えません。',
            vi: 'Đúng! Khi vế sau là câu mệnh lệnh hoặc yêu cầu (-(으)세요), dùng -(으)니까 để đưa ra căn cứ. Đuôi -아서/어서 chỉ lý do không đi với câu mệnh lệnh.'
          }
        },
        { lab: '와서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Not quite! Causal -아서/어서 cannot be followed by commands or requests (-(으)세요). Use -(으)니까 for commands.',
            ja: '文脈に合いません。理由を表す -아서/어서 の後ろには命令・依頼（-(으)세요）を続けられません。この場合は -(으)니까 を使います。',
            vi: 'Chưa đúng ngữ cảnh. Khi chỉ lý do, -아서/어서 không thể đi cùng câu mệnh lệnh hay đề nghị (-(으)세요). Hãy dùng -(으)니까.'
          }
        },
        { lab: '오지만', sub: '-지만', grade: 'no',
          why: {
            en: 'Changes the meaning! -지만 expresses contrast ("although"), which does not match giving a reason to take an umbrella.',
            ja: '意味が変わってしまいます。-지만 は「〜けれど」という対比・逆接を表すため、傘を持って行く理由の文脈には合いません。',
            vi: 'Nghĩa bị thay đổi! -지만 mang nghĩa tương phản (nhưng), không phù hợp với ngữ cảnh đưa ra lý do để mang theo ô.'
          }
        }
      ]
    },
    {
      lead: '배가 ',
      blank: '______',
      rest: ' 밥을 먹어요.',
      hint: {
        en: 'Intended meaning: "I am hungry, so I eat a meal."',
        ja: '意図する意味：「お腹が空いたのでご飯を食べます。」',
        vi: 'Ý định diễn đạt: "Vì đói bụng nên tôi ăn cơm."'
      },
      opts: [
        { lab: '고파서', sub: '-아서/어서', grade: 'ok',
          why: {
            en: 'Natural! -아서/어서 expresses direct cause and effect ("hungry, so I eat").',
            ja: '正解！お腹が空いたから食べるという直接の因果関係には -아서/어서 が最も自然です。',
            vi: 'Đúng! -아서/어서 diễn tả quan hệ nguyên nhân - kết quả trực tiếp (đói bụng nên ăn cơm).'
          }
        },
        { lab: '고프지만', sub: '-지만', grade: 'no',
          why: {
            en: 'Changes the meaning! -지만 means "although I am hungry", turning the sentence into a contradiction ("Although hungry, I eat").',
            ja: '意味が変わってしまいます。-지만 だと「お腹が空いているけれど食べる」という不自然な対立になってしまいます。',
            vi: 'Nghĩa bị thay đổi! Dùng -지만 sẽ thành "tuy đói nhưng lại ăn", tạo sự mâu thuẫn trái với ý định nói lý do ăn cơm.'
          }
        },
        { lab: '고픈데', sub: '-(으)ㄴ데', grade: 'no',
          why: {
            en: 'Different nuance! 배가 고픈데 밥을 먹어요 is grammatically possible when setting background context, but for a direct reason-and-action statement, -아서/어서 is the intended connective.',
            ja: 'ニュアンスが異なります。배가 고픈데 밥을 먹어요 も前置きとしては文法的にあり得ますが、直接の理由と行動を表すには -아서/어서 が最適です。',
            vi: 'Sắc thái khác! 배가 고픈데 밥을 먹어요 có thể dùng để mở đầu bối cảnh, nhưng để diễn đạt trực tiếp lý do dẫn tới hành động thì -아서/어서 phù hợp nhất.'
          }
        }
      ]
    },
    {
      lead: '저는 ',
      blank: '______',
      rest: ' 친구를 만나요.',
      hint: {
        en: 'Intended meaning: "I am busy, but I am meeting a friend."',
        ja: '意図する意味：「私は忙しいのですが、友達に会います。」',
        vi: 'Ý định diễn đạt: "Tôi tuy bận nhưng lại gặp bạn."'
      },
      opts: [
        { lab: '바쁜데', sub: '-(으)ㄴ데', grade: 'ok',
          why: {
            en: 'Natural! -(으)ㄴ데 provides background circumstance and mild contrast ("I am busy, but meeting a friend"). Adjectives take -(으)ㄴ데.',
            ja: '正解！「忙しいのですが・忙しいけれど」と背景や前置きを提示しつつ対比する文脈には -(으)ㄴ데 を使います。形容詞には -(으)ㄴ데 がつきます。',
            vi: 'Đúng! -(으)ㄴ데 dùng để mở đầu bối cảnh và tương phản nhẹ ("tôi bận nhưng gặp bạn"). Tính từ kết hợp với -(으)ㄴ데.'
          }
        },
        { lab: '바빠서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Changes the meaning! -아서/어서 marks direct cause, sounding as if being busy is the reason why you meet your friend.',
            ja: '意味が変わってしまいます。-아서/어서 だと「忙しいから（それが理由で）友達に会う」というおかしな因果関係になってしまいます。',
            vi: 'Nghĩa bị thay đổi! -아서/어서 chỉ nguyên nhân trực tiếp, làm câu có nghĩa "vì bận nên mới đi gặp bạn".'
          }
        },
        { lab: '바쁘고', sub: '-고', grade: 'no',
          why: {
            en: 'Different nuance! 바쁘고 친구를 만나요 is grammatically valid as a simple list ("I am busy and I meet a friend"), but does not convey the intended background contrast.',
            ja: 'ニュアンスが異なります。바쁘고 친구를 만나요 も単純な並列としては文法的に成立しますが、「忙しいのに」という背景・対比のニュアンスが出ません。',
            vi: 'Sắc thái khác! Câu 바쁘고 친구를 만나요 vẫn đúng ngữ pháp khi liệt kê thuần túy ("tôi bận và tôi gặp bạn"), nhưng không thể hiện được bối cảnh đối lập mong muốn.'
          }
        }
      ]
    },
    {
      lead: '한국어가 ',
      blank: '______',
      rest: ' 재미있어요.',
      hint: {
        en: 'Intended meaning: "Korean is difficult, but it is fun."',
        ja: '意図する意味：「韓国語は難しいですが、面白いです。」',
        vi: 'Ý định diễn đạt: "Tiếng Hàn khó nhưng mà thú vị."'
      },
      opts: [
        { lab: '어렵지만', sub: '-지만', grade: 'ok',
          why: {
            en: 'Natural! -지만 marks a clear, direct contrast between two opposite qualities (difficult, but fun).',
            ja: '正解！「難しいけれど面白い」という2つの事実の明確な対比・逆接には -지만 を使います。',
            vi: 'Đúng! -지만 biểu thị tương phản rõ ràng giữa hai đặc tính trái ngược (khó nhưng thú vị).'
          }
        },
        { lab: '어려워서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Changes the meaning! 어려워서 재미있어요 is possible if you mean "it is fun precisely because it is challenging", but it turns the sentence into cause-and-effect instead of contrast.',
            ja: '意味が変わってしまいます。어려워서 재미있어요 も「難しいからこそ面白い」という意味では成立しますが、ここでは2つの特徴を対比させる文脈です。',
            vi: 'Nghĩa bị thay đổi! 어려워서 재미있어요 vẫn có thể nói với nghĩa "vì khó nên mới thú vị", nhưng nó biến câu thành quan hệ nhân quả thay vì tương phản.'
          }
        },
        { lab: '어려우니까', sub: '-(으)니까', grade: 'no',
          why: {
            en: 'Changes the meaning! -(으)니까 gives subjective justification for a judgment ("since it is difficult, it is fun"), which shifts away from contrasting two qualities.',
            ja: '意味が変わってしまいます。-(으)니까 も話し手の判断の根拠としてはあり得ますが、事実の直接的な対比には適しません。',
            vi: 'Nghĩa bị thay đổi! -(으)니까 chỉ căn cứ đánh giá chủ quan ("bởi vì khó nên thú vị"), không phải là sự đối lập trực tiếp giữa hai đặc tính.'
          }
        }
      ]
    },
    {
      lead: '저는 밥을 ',
      blank: '______',
      rest: ' 커피를 마셔요.',
      hint: {
        en: 'Intended meaning: "I eat a meal and then drink coffee."',
        ja: '意図する意味：「私はご飯を食べてからコーヒーを飲みます。」',
        vi: 'Ý định diễn đạt: "Tôi ăn cơm rồi uống cà phê."'
      },
      opts: [
        { lab: '먹고', sub: '-고', grade: 'ok',
          why: {
            en: 'Natural! -고 connects two chronological actions in sequence (eat meal, and then drink coffee).',
            ja: '正解！「ご飯を食べて（それから）コーヒーを飲む」という動作の順序並列には -고 が最も自然です。',
            vi: 'Đúng! -고 dùng để nối hai hành động diễn ra theo trình tự thời gian (ăn cơm rồi uống cà phê).'
          }
        },
        { lab: '먹어서', sub: '-아서/어서', grade: 'no',
          why: {
            en: 'Changes the nuance! Causal -아서/어서 would make eating the prerequisite cause for drinking coffee.',
            ja: 'ニュアンスが変わります。理由の -아서/어서 を使うと「ご飯を食べたことが原因・前提でコーヒーを飲む」という因果関係に偏ってしまいます。',
            vi: 'Sắc thái bị đổi! -아서/어서 khiến việc ăn cơm trở thành nguyên nhân bắt buộc dẫn đến việc uống cà phê.'
          }
        },
        { lab: '먹으면', sub: '-(으)면', grade: 'no',
          why: {
            en: 'Different nuance! 먹으면 커피를 마셔요 is grammatically natural as a conditional habit ("Whenever I eat, I drink coffee"), but here we are simply expressing the sequential order of actions.',
            ja: 'ニュアンスが異なります。먹으면 커피를 마셔요 も「ご飯を食べたら（いつも）コーヒーを飲む」という習慣・条件としては自然ですが、単純な動作の順序並列には -고 を使います。',
            vi: 'Sắc thái khác! Câu 먹으면 커피를 마셔요 hoàn toàn đúng ngữ pháp để chỉ thói quen có điều kiện ("cứ ăn cơm xong là uống cà phê"), nhưng để kể trình tự tuần tự đơn thuần thì -고 tự nhiên hơn.'
          }
        }
      ]
    },
    {
      lead: '어제 비가 ',
      blank: '______',
      rest: ' 집에 있었어요.',
      hint: {
        en: 'Intended meaning: "Yesterday it rained, so I stayed home."',
        ja: '意図する意味：「昨日雨が降ったので、家にいました。」',
        vi: 'Ý định diễn đạt: "Hôm qua trời mưa nên tôi ở nhà."'
      },
      opts: [
        { lab: '와서', sub: {
            en: '-아서/어서 (without past marker)',
            ja: '-아서/어서（過去標識なし）',
            vi: '-아서/어서 (không chia quá khứ)'
          }, grade: 'ok',
          why: {
            en: 'Natural! In standard grammar, causal -아서/어서 usually does not take the past tense pre-final marker (-았/었-). Even for yesterday\'s events, keep the connective without a past marker (와서) and mark the past tense on the final verb (있었어요).',
            ja: '正解！初級の理由の -아서/어서 には通常、過去標識（-았/었-）を付けません。昨日の出来事でも接続部は過去標識のない形（와서）のままで、文全体の過去は末尾の動詞（있었어요）で表します。',
            vi: 'Chính xác! Đuôi chỉ lý do -아서/어서 thông thường không ghép vĩ tố quá khứ (-았/었-). Dù kể chuyện hôm qua, đuôi liên kết vẫn dùng dạng không chia quá khứ (와서) và quá khứ chỉ đặt ở động từ cuối câu (있었어요).'
          }
        },
        { lab: '왔어서', sub: {
            en: 'Past marker attached',
            ja: '過去標識の結合',
            vi: 'Ghép thì quá khứ'
          }, grade: 'no',
          why: {
            en: 'Avoid in standard usage! While colloquial Korean sometimes uses -았/었어서, standard grammar avoids attaching past markers before -아서/어서 (use 와서 instead).',
            ja: '避けるべき形です。現代口語で -았/었어서 が使われることもありますが、標準的な文法では -아서/어서 の前に過去標識を付けず 와서 を使います。',
            vi: 'Cần tránh trong văn chuẩn! Dù khẩu ngữ đôi khi dùng -았/었어서, nhưng ngữ pháp chuẩn tránh ghép thì quá khứ trước -아서/어서 (nên dùng 와서).'
          }
        },
        { lab: '오고', sub: '-고', grade: 'no',
          why: {
            en: 'Changes the meaning! 비가 오고 집에 있었어요 is grammatically valid as a simple sequence or list of facts, but it does not convey the rain being the cause for staying home.',
            ja: '意味が変わってしまいます。비가 오고 집에 있었어요 も「雨が降り、家にいました」という事実の単純並列としては文法的に成立しますが、雨が家にいた理由であるという因果関係が伝わりません。',
            vi: 'Nghĩa bị thay đổi! Câu 비가 오고 집에 있었어요 vẫn đúng ngữ pháp khi liệt kê các sự việc độc lập, nhưng không diễn đạt được trời mưa là lý do ở nhà.'
          }
        }
      ]
    }
  ];

  Q.forEach(q => {
    const d = document.createElement('div');
    d.className = 'qz';
    const hintText = q.hint ? (q.hint[LANG] || q.hint.en) : '';
    d.innerHTML = `<p class="qz-s" lang="ko">${q.lead}<b><u>${q.blank}</u></b>${q.rest}</p>` +
      (hintText ? `<p class="qz-hint">${hintText}</p>` : '') +
      `<div class="p-opts conn">${q.opts.map((o, idx) => {
        const sub = typeof o.sub === 'object' ? (o.sub[LANG] || o.sub.en) : o.sub;
        return `<button type="button" class="p-opt" data-idx="${idx}"><span lang="ko">${o.lab}</span><small>${sub}</small></button>`;
      }).join('')}</div>` +
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
