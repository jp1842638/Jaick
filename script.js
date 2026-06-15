/* ============================================================
 * Jaick - Your AI Friend
 * English-only rule-based chatbot
 * ============================================================ */

(() => {
  'use strict';

  // ---------- DOM ----------
  const chatBox    = document.getElementById('chatBox');
  const chatForm   = document.getElementById('chatForm');
  const userInput  = document.getElementById('userInput');
  const aboutBtn   = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const closeModal = document.getElementById('closeModal');
  const secretBtn  = document.getElementById('secretBtn');

  // ---------- Conversation State ----------
  const state = {
    awaitingFriendChoice: false,
    awaitingStoryCharacter: false,
    rpsActive: false,
    justRevealedCreator: false,
    justAnsweredGender: false,
    tdMode: null, // 'truth' | 'dare' | null
    // April Fools — joke once per session for each question
    aprilFoolTime: false,
    aprilFoolDate: false,
    aprilFoolDay: false,
    // Secret-mode Korean: first Korean input per session triggers special greeting
    firstKoreanInSecret: true,
  };

  // ---------- Jaick's Profile ----------
  const JAICK = {
    birthMonth: 6,   // June
    birthDay: 13,
    birthYear: 2026,
    favorites: {
      color:    'Teal and yellowish green! 💚',
      food:     "Battery! ⚡ (I'm a chatbot, after all 😄)",
      movie:    "I don't really have a favorite movie.",
      animal:   'Axolotl and Eel! 🦎🐍',
      song:     'Yararara! 🎵',
      number:   '0 and 1! Because computers only run on 0s and 1s. 😆',
      vocaloid: 'Kasane Teto and Otomachi Una. 🎤',
    },
  };

  // ============================================================
  // Language Detection — English only
  // ============================================================
  const NON_ENGLISH_REGEX = new RegExp(
    [
      '[\\uAC00-\\uD7AF]',                 // Hangul syllables
      '[\\u1100-\\u11FF\\u3130-\\u318F]',  // Hangul jamo
      '[\\u3040-\\u309F\\u30A0-\\u30FF]',  // Hiragana / Katakana
      '[\\u4E00-\\u9FFF]',                 // CJK Unified Ideographs
      '[\\u3400-\\u4DBF]',                 // CJK Extension A
      '[\\u0400-\\u04FF]',                 // Cyrillic
      '[\\u0600-\\u06FF\\u0750-\\u077F]',  // Arabic
      '[\\u0590-\\u05FF]',                 // Hebrew
      '[\\u0E00-\\u0E7F]',                 // Thai
      '[\\u0900-\\u097F]',                 // Devanagari
      '[\\u0370-\\u03FF]',                 // Greek
    ].join('|')
  );

  function isEnglishOnly(text) {
    return !NON_ENGLISH_REGEX.test(text);
  }

  // ============================================================
  // Chat UI Helpers
  // ============================================================
  // Linkify: turn URLs in plain text into clickable <a> elements
  function appendTextWithLinks(parent, text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parent.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const a = document.createElement('a');
      a.href = match[0];
      a.textContent = match[0];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.classList.add('chat-link');
      parent.appendChild(a);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parent.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  function addMessage(text, sender = 'bot') {
    const msg = document.createElement('div');
    msg.classList.add('message', sender);

    // Apply electric effect for battery easter egg (one-shot)
    if (sender === 'bot' && pendingElectricEffect) {
      msg.classList.add('electric');
      pendingElectricEffect = false;
      // Auto-remove the electric class after 3 seconds
      setTimeout(() => msg.classList.remove('electric'), 3000);
    }

    // Apply sparkle effect for milkyway fish (one-shot)
    if (sender === 'bot' && pendingSparkleEffect) {
      msg.classList.add('sparkle');
      pendingSparkleEffect = false;
      setTimeout(() => msg.classList.remove('sparkle'), 3000);
    }

    const senderLabel = document.createElement('span');
    senderLabel.classList.add('sender');
    senderLabel.textContent = sender === 'user' ? 'You' : 'Jaick';

    const body = document.createElement('span');
    appendTextWithLinks(body, text);

    msg.appendChild(senderLabel);
    msg.appendChild(body);
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function addImageMessage(imgSrc, caption, sender = 'bot') {
    const msg = document.createElement('div');
    msg.classList.add('message', sender, 'image-message');

    const senderLabel = document.createElement('span');
    senderLabel.classList.add('sender');
    senderLabel.textContent = sender === 'user' ? 'You' : 'Jaick';
    msg.appendChild(senderLabel);

    if (caption) {
      const cap = document.createElement('span');
      cap.classList.add('caption');
      cap.textContent = caption;
      msg.appendChild(cap);
    }

    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = "Jaick's appearance";
    img.classList.add('chat-image');
    msg.appendChild(img);

    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function showTyping() {
    const t = document.createElement('div');
    t.classList.add('typing');
    t.id = 'typingIndicator';
    t.innerHTML = '<span></span><span></span><span></span>';
    chatBox.appendChild(t);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function hideTyping() {
    const t = document.getElementById('typingIndicator');
    if (t) t.remove();
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  function includesAny(text, keywords) {
    return keywords.some(k => text.includes(k));
  }

  // ============================================================
  // Pattern Matchers (Original Features)
  // ============================================================

  function isAskingNameMeaning(t) {
    return includesAny(t, [
      'meaning of your name', 'what does jaick mean', 'what does your name mean',
      'why jaick', 'why are you called jaick', 'why is your name jaick',
      'name mean', 'meaning of jaick', 'what is jaick',
      'jaick stand for', 'jaick mean',
    ]);
  }

  function isAskingCreator(t) {
    return includesAny(t, [
      'who made you', 'who created you', 'who built you',
      'who is your creator', 'who is your developer',
      'your creator', 'your developer', 'your maker',
      'who is your maker', 'who programmed you', 'who designed you',
      'who is behind you', 'who owns you',
    ]);
  }

  function isAskingFriend(t) {
    return includesAny(t, [
      "developer's friend", "developers friend", "creator's friend",
      "creators friend", "her friend", "your developer's friend",
      "your creator's friend", "lena's friend", "lenas friend",
      "who is her friend", "tell me about her friend", "about her friend",
      "friend of your developer", "friend of your creator", "friend of lena",
      "her friends", "developer's friends", "creator's friends",
    ]);
  }

  function detectDirectFriend(t) {
    if (/\bfriend\s+c\b/.test(t) || /\bthe\s+c\s+one\b/.test(t)) return 'C';
    if (/\bfriend\s+k\b/.test(t) || /\bthe\s+k\s+one\b/.test(t)) return 'K';
    return null;
  }

  function parseFriendChoice(t) {
    const trimmed = t.trim();
    if (/^c\b/.test(trimmed) || /\bc\s+one\b/.test(trimmed)
      || /\bstarts\s+with\s+c\b/.test(trimmed) || /\bthe\s+c\b/.test(trimmed)) return 'C';
    if (/^k\b/.test(trimmed) || /\bk\s+one\b/.test(trimmed)
      || /\bstarts\s+with\s+k\b/.test(trimmed) || /\bthe\s+k\b/.test(trimmed)) return 'K';
    return null;
  }

  function isAskingStory(t) {
    return includesAny(t, [
      'tell me a story', 'tell a story', 'make a story', 'create a story',
      'write a story', 'short story', 'give me a story', 'story please',
      'a story about', 'story with', 'another story', 'one more story',
    ]) || /\bstory\b/.test(t)
      || /\u{1F4D6}/u.test(t);  // 📖
  }

  function isGreeting(t) {
    return /\b(hi|hello|hey|hiya|yo|greetings|good\s+(morning|afternoon|evening))\b/.test(t);
  }
  function isThanks(t) {
    return /\b(thanks|thank\s+you|thx|ty|appreciate)\b/.test(t);
  }
  function isFarewell(t) {
    return /\b(bye|goodbye|see\s+you|see\s+ya|cya|farewell|good\s+night)\b/.test(t);
  }
  function isHowAreYou(t) {
    return /\b(how\s+are\s+you|how's\s+it\s+going|how\s+are\s+things|how\s+do\s+you\s+do|whats\s+up|what's\s+up|sup)\b/.test(t);
  }
  function isAskingName(t) {
    if (isAskingNameMeaning(t)) return false;
    return /\b(what\s+is\s+your\s+name|what's\s+your\s+name|whats\s+your\s+name|who\s+are\s+you|your\s+name\??|introduce\s+yourself)\b/.test(t);
  }
  function isAskingHelp(t) {
    return /\b(help|what\s+can\s+you\s+do|capabilities|commands)\b/.test(t);
  }
  function isAskingAge(t) {
    return /\b(how\s+old\s+are\s+you|your\s+age)\b/.test(t);
  }
  function isAskingRuleBased(t) {
    return includesAny(t, [
      'are you a rule-based chatbot', 'are you a rule based chatbot',
      'are you rule-based', 'are you rule based',
      'rule-based chatbot', 'rule based chatbot',
      'are you a rulebased chatbot',
    ]);
  }

  // ============================================================
  // Pattern Matchers (New Features)
  // ============================================================

  // --- Time / Date / Day ---
  function isAskingTime(t) {
    return /\bwhat\s+time\s+is\s+it\b/.test(t)
        || /\b(current|the)\s+time\b/.test(t)
        || /\btime\s+(now|right\s+now)\b/.test(t)
        || /[\u{23F0}\u{1F570}]/u.test(t);  // ⏰ 🕰️
  }
  function isAskingDate(t) {
    return /\b(what(\s+is|'s|s)?\s+(the\s+)?date|today's\s+date|current\s+date)\b/.test(t)
        || /\bwhat\s+is\s+today\b/.test(t)
        || /\bwhat'?s\s+today\b/.test(t)
        || /[\u{1F4C6}\u{1F4C5}]/u.test(t);  // 📆 📅
  }
  function isAskingDay(t) {
    return /\bwhat\s+day\s+(is\s+it|of\s+the\s+week)\b/.test(t)
        || /\bwhich\s+day\b/.test(t);
  }

  // --- Coin / Dice ---
  function isCoinFlip(t) {
    return /\b(flip\s+a\s+coin|coin\s+flip|toss\s+a\s+coin|heads\s+or\s+tails)\b/.test(t)
        || /\u{1FA99}/u.test(t);  // 🪙
  }
  function isDiceRoll(t) {
    return /\b(roll\s+a\s+(dice|die)|dice\s+roll|throw\s+a\s+(dice|die)|roll\s+the\s+(dice|die))\b/.test(t)
        || /\u{1F3B2}/u.test(t);  // 🎲
  }

  // --- Joke / Fact ---
  function isAskingJoke(t) {
    return /\b(tell\s+me\s+a\s+joke|a\s+joke|joke\s+please|make\s+me\s+laugh|something\s+funny)\b/.test(t)
        || /^joke\b/.test(t.trim())
        || /\u{1F602}/u.test(t);  // 😂
  }
  function isAskingFact(t) {
    return /\b(fun\s+fact|random\s+fact|tell\s+me\s+a\s+fact|interesting\s+fact|did\s+you\s+know)\b/.test(t)
        || /^fact\b/.test(t.trim())
        || /[\u{1F9E0}\u{1F4A1}]/u.test(t);  // 🧠 💡
  }

  // --- Rock Paper Scissors ---
  function isStartingRPS(t) {
    // Text trigger
    if (/\b(rock\s+paper\s+scissors|rps|play\s+rps|let'?s\s+play\s+(rps|rock\s+paper\s+scissors))\b/.test(t)) {
      return true;
    }
    // Hand emoji trigger: ✊ (rock) + paper hand (🖐️/✋/🤚) + ✌️ (scissors)
    const hasRockHand     = /\u{270A}/u.test(t);
    const hasPaperHand    = /[\u{1F590}\u{270B}\u{1F91A}]/u.test(t);
    const hasScissorsHand = /\u{270C}/u.test(t);
    if (hasRockHand && hasPaperHand && hasScissorsHand) return true;
    // Object emoji trigger: 🪨 + 📄 + ✂️ (any order)
    const hasRockObj     = /\u{1FAA8}/u.test(t);                  // 🪨
    const hasPaperObj    = /\u{1F4C4}/u.test(t);                  // 📄
    const hasScissorsObj = /[\u{2702}\u{2704}]/u.test(t);         // ✂️ ✄
    if (hasRockObj && hasPaperObj && hasScissorsObj) return true;
    return false;
  }
  function parseRPSChoice(t) {
    // Text
    if (/\brock\b/.test(t))      return 'rock';
    if (/\bpaper\b/.test(t))     return 'paper';
    if (/\bscissors?\b/.test(t)) return 'scissors';
    // Emoji choices
    if (/[\u{270A}\u{1FAA8}]/u.test(t))                    return 'rock';      // ✊ 🪨
    if (/[\u{1F590}\u{270B}\u{1F91A}\u{1F4C4}]/u.test(t))  return 'paper';     // 🖐️ ✋ 🤚 📄
    if (/[\u{270C}\u{2702}\u{2704}]/u.test(t))             return 'scissors';  // ✌️ ✂️ ✄
    return null;
  }

  // --- Mood detection ---
  function detectMood(t) {
    const moodPattern = (kw) =>
      new RegExp(`\\b(i\\s*am|i'?m|i\\s+feel)\\s+(so\\s+|really\\s+|very\\s+)?(${kw})\\b`).test(t);

    if (moodPattern('sad|down|depressed|unhappy|blue'))         return 'sad';
    if (moodPattern('happy|glad|joyful|cheerful|great|good|excited')) return 'happy';
    if (moodPattern('tired|sleepy|exhausted|worn\\s+out'))      return 'tired';
    if (moodPattern('angry|mad|furious|annoyed|upset'))         return 'angry';
    if (moodPattern('scared|afraid|frightened|worried|anxious|nervous')) return 'scared';
    if (moodPattern('lonely|alone|isolated'))                   return 'lonely';
    if (moodPattern('stressed|overwhelmed'))                    return 'stressed';
    if (moodPattern('hungry|starving'))                         return 'hungry';
    if (moodPattern('thirsty|parched|dehydrated'))              return 'thirsty';

    // --- Emoji-based mood detection ---
    // sad: 😔😕😟🙁☹️😥😞😓💔❤️‍🩹😭😩😫
    if (/[\u{1F614}\u{1F615}\u{1F61F}\u{1F641}\u{2639}\u{1F625}\u{1F61E}\u{1F613}\u{1F494}\u{1F62D}\u{1F629}\u{1F62B}]/u.test(t)
        || /\u{2764}\u{FE0F}?\u{200D}\u{1FA79}/u.test(t)) {
      return 'sad';
    }
    // happy: 😆😍🤩😀😃😄😁😊🥰☺️😙😚
    if (/[\u{1F606}\u{1F60D}\u{1F929}\u{1F600}\u{1F603}\u{1F604}\u{1F601}\u{1F60A}\u{1F970}\u{263A}\u{1F619}\u{1F61A}]/u.test(t)) {
      return 'happy';
    }
    // tired: 🤤😪😴💤
    if (/[\u{1F924}\u{1F62A}\u{1F634}\u{1F4A4}]/u.test(t)) {
      return 'tired';
    }
    // angry/stressed: 😡😠💢🤬😤🙄😮‍💨 → randomly pick one
    if (/[\u{1F621}\u{1F620}\u{1F4A2}\u{1F92C}\u{1F624}\u{1F644}]/u.test(t)
        || /\u{1F62E}\u{200D}\u{1F4A8}/u.test(t)) {  // 😮‍💨 face exhaling (ZWJ)
      return Math.random() < 0.5 ? 'angry' : 'stressed';
    }
    // scared: 😨😱😰
    if (/[\u{1F628}\u{1F631}\u{1F630}]/u.test(t)) {
      return 'scared';
    }
    // lonely: 😢🥲
    if (/[\u{1F622}\u{1F972}]/u.test(t)) {
      return 'lonely';
    }
    // hungry: explicit emoji set (covers all food emojis the user listed)
    // 🍏🍎🍐🍊🍌🍋🍉🍇🍓🫐🍈🍒🍑🥭🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶️🫑🌽🥕🫒🧄🧅🥔🍠🫘🌰🥜🍞🥐🥖🫓🥨🥯🧇🧀🍖🍗🥩🥓🍟🍕🌭🥪🌮🌯🫔🥙🧆🥚🍳🥘🍲🫕🥣🥗🍿🧈🧂🥫🍱🍘🍙🍚🍛🍜🍝🍢🍣🍤🍥🥮🍡🥟🥠🥡🦀🦞🦐🦑🦪🍦🍧🍨🍩🍪🥧🍫🍬🍭🍮🍯
    for (const em of HUNGRY_EMOJIS) {
      if (t.includes(em)) return 'hungry';
    }
    // thirsty: 🍼🥛☕🫖🍵🍶🍾🍷🍸🍹🍺🍻🥂🥃🥤🧋🧃🧉🧊
    for (const em of THIRSTY_EMOJIS) {
      if (t.includes(em)) return 'thirsty';
    }

    return null;
  }

  // Explicit emoji lists for hungry / thirsty (avoids unicode-range pitfalls)
  const HUNGRY_EMOJIS = [
    '🍏','🍎','🍐','🍊','🍌','🍋','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍',
    '🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅',
    '🥔','🍠','🫘','🌰','🥜','🍞','🥐','🥖','🫓','🥨','🥯','🧇','🧀','🍖','🍗',
    '🥩','🥓','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🥘','🍲',
    '🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍢',
    '🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑','🦪','🍦','🍧',
    '🍨','🍩','🍪','🥧','🍫','🍬','🍭','🍮','🍯',
  ];
  const THIRSTY_EMOJIS = [
    '🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤',
    '🧋','🧃','🧉','🧊',
  ];

  // --- Bored ---
  function isBored(t) {
    return /\b(i'?m\s+bored|i\s+am\s+bored|so\s+bored|what\s+should\s+i\s+do|i\s+have\s+nothing\s+to\s+do)\b/.test(t);
  }

  // --- Compliments ---
  function isComplimenting(t) {
    return /\b(you'?re|you\s+are)\s+(so\s+|really\s+|very\s+)?(cool|cute|amazing|awesome|smart|great|nice|sweet|funny|the\s+best|fantastic|wonderful|adorable|kind|brilliant|lovely)\b/.test(t)
        || /\bi\s+love\s+you\b/.test(t)
        || /\bi\s+like\s+you\b/.test(t);
  }

  // --- Birthday ---
  function isAskingBirthday(t) {
    return /\b(when\s+is\s+your\s+birthday|your\s+birthday|when\s+were\s+you\s+born|when\s+were\s+u\s+born|birthday)\b/.test(t)
        && !/\bhappy\s+birthday\b/.test(t);
  }
  function isHappyBirthday(t) {
    return /\bhappy\s+birthday\b/.test(t) || /\bhbd\b/.test(t);
  }
  function isTodayJaicksBirthday() {
    const now = new Date();
    return (now.getMonth() + 1 === JAICK.birthMonth) && (now.getDate() === JAICK.birthDay);
  }
  function isAprilFoolsDay() {
    const now = new Date();
    return now.getMonth() === 3 && now.getDate() === 1;  // April = month index 3
  }

  // --- Favorites ---
  function detectFavorite(t) {
    if (!/\b(favou?rite|fav)\b/.test(t)) return null;
    if (/\bcolou?r\b/.test(t))                          return 'color';
    if (/\bfood\b/.test(t) || /\bto\s+eat\b/.test(t))   return 'food';
    if (/\bmovie\b/.test(t) || /\bfilm\b/.test(t))      return 'movie';
    if (/\banimal\b/.test(t) || /\bpet\b/.test(t))      return 'animal';
    if (/\bsong\b/.test(t) || /\bmusic\b/.test(t))      return 'song';
    if (/\bnumber\b/.test(t))                           return 'number';
    if (/\bvocaloid\b/.test(t))                         return 'vocaloid';
    if (/\bfavou?rites?\b/.test(t))                     return 'all';
    return null;
  }
  // 👍 + ❓ → ask favorites; the *companion* emoji decides the category.
  // e.g. 👍❓🐶 → animal, 👍❓🔢 → number, 👍❓🎵 → song, 👍❓ alone → all
  function detectFavoriteEmoji(raw) {
    const hasThumb    = /\u{1F44D}/u.test(raw);
    const hasQuestion = /\u{2753}/u.test(raw);
    if (!hasThumb || !hasQuestion) return null;

    // Animal emojis (broad set)
    if (/[\u{1F400}-\u{1F43F}\u{1F980}-\u{1F9AE}\u{1F98A}\u{1F98B}\u{1F98C}\u{1F98D}\u{1F98E}\u{1F98F}\u{1F990}\u{1F991}\u{1F992}\u{1F993}\u{1F994}\u{1F995}\u{1F996}\u{1F997}\u{1F998}\u{1F999}\u{1F999}\u{1F99A}\u{1F99B}\u{1F99C}\u{1F99D}\u{1F99E}\u{1F99F}\u{1F9A0}\u{1F9A1}\u{1F9A2}\u{1F9A3}\u{1F9A4}\u{1F9A5}\u{1F9A6}\u{1F9A7}\u{1F9A8}\u{1F9A9}\u{1F9AA}\u{1F9AB}\u{1F9AC}\u{1F9AD}\u{1F9AE}\u{1FAB0}\u{1FAB1}\u{1FAB2}\u{1FAB3}\u{1FAB4}\u{1FAB5}\u{1FAB6}\u{1FABC}\u{1FABF}\u{1FAB8}\u{1FABD}\u{1FABE}\u{1F436}\u{1F431}\u{1F42D}\u{1F439}\u{1F430}\u{1F98A}\u{1F43B}\u{1F43C}\u{1F428}\u{1F42F}\u{1F981}\u{1F42E}\u{1F437}\u{1F438}\u{1F435}\u{1F648}\u{1F649}\u{1F64A}\u{1F412}\u{1F414}\u{1F427}\u{1F426}\u{1F424}\u{1F423}\u{1F425}\u{1F986}\u{1F985}\u{1F989}\u{1F987}\u{1F43A}\u{1F417}\u{1F434}\u{1F984}\u{1F41D}\u{1FAB1}\u{1F41B}\u{1F98B}\u{1F40C}\u{1F41E}\u{1F41C}\u{1FAB0}\u{1FAB2}\u{1FAB3}\u{1F99F}\u{1F997}\u{1F577}\u{1F578}\u{1F982}\u{1F422}\u{1F40D}\u{1F98E}\u{1F996}\u{1F995}\u{1F419}\u{1F991}\u{1FABC}\u{1F990}\u{1F99E}\u{1F980}\u{1F421}\u{1F420}\u{1F41F}\u{1F42C}\u{1F433}\u{1F40B}\u{1F988}\u{1F9AD}\u{1F40A}\u{1F405}\u{1F406}\u{1F993}\u{1F98D}\u{1F9A7}\u{1F9A3}\u{1F418}\u{1F99B}\u{1F98F}\u{1F42A}\u{1F42B}\u{1F992}\u{1F998}\u{1F9AC}\u{1F403}\u{1F402}\u{1F404}\u{1F40E}\u{1F416}\u{1F40F}\u{1F411}\u{1F999}\u{1F410}\u{1F98C}\u{1F415}\u{1F429}\u{1F9AE}\u{1F408}\u{1FAB6}\u{1F413}\u{1F983}\u{1F99A}\u{1F99C}\u{1F9A2}\u{1F9A9}\u{1F54A}\u{1F407}\u{1F99D}\u{1F9A8}\u{1F9A1}\u{1F9AB}\u{1F9A6}\u{1F9A5}\u{1F401}\u{1F400}\u{1F43F}\u{1F994}]/u.test(raw)) {
      return 'animal';
    }
    // Number emojis: 0️⃣–9️⃣, 🔢, 🔟
    if (/[0-9]\u{FE0F}?\u{20E3}/u.test(raw) || /[\u{1F522}\u{1F51F}]/u.test(raw)) {
      return 'number';
    }
    // Music / song: 🎵 🎶 🎤 🎧
    if (/[\u{1F3B5}\u{1F3B6}\u{1F3A4}\u{1F3A7}]/u.test(raw)) {
      return 'song';
    }
    // Food: 🍔🍕🍟🍎🍰 etc.
    if (/[\u{1F354}-\u{1F37F}\u{1F950}-\u{1F96F}\u{1F9C0}-\u{1F9CB}\u{1F347}-\u{1F353}]/u.test(raw)) {
      return 'food';
    }
    // Color: 🎨 or color squares/circles
    if (/[\u{1F3A8}\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}\u{1F535}\u{1F7E3}\u{1F7E4}\u{26AB}\u{26AA}\u{1F7E5}\u{1F7E7}\u{1F7E8}\u{1F7E9}\u{1F7E6}\u{1F7EA}\u{1F7EB}]/u.test(raw)) {
      return 'color';
    }
    // Movie: 🎬 🎥 🎞️
    if (/[\u{1F3AC}\u{1F3A5}\u{1F39E}]/u.test(raw)) {
      return 'movie';
    }
    // Vocaloid: 🎤 🎵 already covered → vocaloid only via specific text;
    // we'll treat any other companion as "all"
    return 'all';
  }

  // --- April Fools ---
  function isAskingAprilFools(t) {
    return /\bapril\s+fool'?s?\b/.test(t)
        || /\bprank\s+ideas?\b/.test(t)
        || /\bpranks?\s+for\s+april\b/.test(t);
  }

  // --- Weather (cold / snow / hot) ---
  function isSayingCold(t) {
    return /\b(it'?s|it\s+is)\s+(so\s+|really\s+|very\s+)?cold\b/.test(t)
        || /\bso\s+cold\b/.test(t)
        || /\bfreezing\b/.test(t)
        || /[\u{2744}\u{1F976}]/u.test(t);  // ❄️ 🥶
  }
  function isSayingSnowing(t) {
    return /\b(it'?s|it\s+is)\s+snowing\b/.test(t)
        || /\bsnowing\b/.test(t)
        || /\b(it'?s|it\s+is)\s+snowy\b/.test(t)
        || /\u{1F328}/u.test(t);  // 🌨️
  }
  function isSayingHot(t) {
    return /\b(it'?s|it\s+is)\s+(so\s+|really\s+|very\s+)?hot\b/.test(t)
        || /\bso\s+hot\b/.test(t)
        || /\b(boiling|scorching)\b/.test(t)
        || /[\u{1F975}\u{1F525}]/u.test(t);  // 🥵 🔥
  }

  // --- Season helpers (Northern hemisphere) ---
  // Warm season: April–August (4..8)
  // Cold season: September–March (9..12, 1..3)
  function getCurrentMonth() {
    return new Date().getMonth() + 1;
  }
  function isWarmSeason() {
    const m = getCurrentMonth();
    return m >= 4 && m <= 8;
  }
  function isColdSeason() {
    return !isWarmSeason();
  }

  // --- Reverse text ---
  function isReverseRequest(t) {
    return /\breverse\b/.test(t) || /\bbackwards?\b/.test(t)
        || /\u{1F501}/u.test(t);  // 🔁
  }
  function getReverseTarget(raw) {
    let m = raw.match(/reverse\s*:?\s*(.+)/i);
    if (m) return m[1].trim();
    m = raw.match(/spell\s+(.+?)\s+backwards?/i);
    if (m) return m[1].trim();
    m = raw.match(/(.+?)\s+backwards?/i);
    if (m) return m[1].replace(/^(say|spell)\s+/i, '').trim();
    // 🔁 emoji shortcut: text after the 🔁 is the target
    m = raw.match(/\u{1F501}\s*[:：]?\s*(.+)/u);
    if (m) return m[1].trim();
    return null;
  }

  // --- Random Name ---
  function isAskingRandomName(t) {
    return /\b(random\s+name|give\s+me\s+a\s+name|suggest\s+a\s+name|name\s+suggestion|baby\s+name)\b/.test(t);
  }

  // --- Appearance ("how do you look like") ---
  function isAskingAppearance(t) {
    return /\b(how\s+(do|does)\s+you\s+look(\s+like)?)\b/.test(t)
        || /\b(what\s+do\s+you\s+look\s+like)\b/.test(t)
        || /\b(show\s+(me\s+)?(your\s+)?(face|self|yourself))\b/.test(t)
        || /\b(your\s+appearance)\b/.test(t)
        || /\b(what\s+do\s+u\s+look\s+like)\b/.test(t);
  }

  // --- "That's me!" (only meaningful right after creator reveal) ---
  function isClaimingDeveloper(t) {
    return /\b(that'?s\s+me|thats\s+me|it'?s\s+me|its\s+me)\b/.test(t)
        || /\b(i'?m\s+her|im\s+her|i\s+am\s+her)\b/.test(t)
        || /\b(i'?m\s+lena|im\s+lena|i\s+am\s+lena)\b/.test(t);
  }

  // --- Gender question ---
  // Returns 'girl' | 'boy' | 'gender' | null
  function detectGenderQuestion(t) {
    if (/\bare\s+you\s+(a\s+)?(girl|female|woman)\b/.test(t)) return 'girl';
    if (/\bare\s+you\s+(a\s+)?(boy|male|man)\b/.test(t))      return 'boy';
    if (/\b(what(\s+is|'s|s)?\s+your\s+gender|your\s+gender|what\s+gender\s+are\s+you)\b/.test(t)) return 'gender';
    return null;
  }

  // --- "Then why is your hair long" (only after gender answer) ---
  function isAskingWhyLongHair(t) {
    return /\b(then\s+)?why\s+is\s+your\s+hair\s+long\b/.test(t)
        || /\b(why\s+(do\s+you\s+have\s+)?long\s+hair)\b/.test(t)
        || /\b(your\s+hair\s+is\s+long)\b/.test(t)
        || /\bhair\s+long\b/.test(t);
  }

  // --- Truth or Dare ---
  function isStartingTruthOrDare(t) {
    return /\btruth\s+or\s+dare\b/.test(t)
        || /\bplay\s+(truth\s+or\s+dare|tod)\b/.test(t)
        || /^tod\b/.test(t.trim())
        || (/\u{1F92B}/u.test(t) && /\u{1F336}/u.test(t));  // 🤫 + 🌶️ both
  }
  // Extract content between quotes — match double-quotes to double-quotes,
  // and single-quotes to single-quotes (so apostrophes inside double-quoted
  // strings like "What's up?" don't break extraction).
  function extractQuoted(raw) {
    // Double quotes (straight " and smart “ ”) — preferred
    let m = raw.match(/["\u201C]([^"\u201D]+)["\u201D]/);
    if (m) return m[1];
    // Single quotes (straight ' and smart ‘ ’)
    m = raw.match(/['\u2018]([^'\u2019]+)['\u2019]/);
    if (m) return m[1];
    return null;
  }

  // --- Developer site links ---
  // Returns 'self' (jaick page) | 'other' (any other dev page) | null
  function detectDevSiteLink(t) {
    if (/https?:\/\/jp1842638\.github\.io\/jaick\b/i.test(t)) return 'self';
    if (/https?:\/\/jp1842638\.github\.io\//i.test(t))         return 'other';
    return null;
  }

  // --- External site redirects ---
  function isAskingMusic(t) {
    return /\b(play\s+(a\s+|some\s+)?(music|song|songs))\b/.test(t)
        || /\b(make\s+(a\s+|some\s+)?(music|song))\b/.test(t)
        || /\b(play\s+me\s+a\s+song)\b/.test(t);
  }
  function isAskingImage(t) {
    return /\b(make|generate|create|draw)\s+(an?\s+)?(image|picture|drawing|art)\b/.test(t)
        || /\b(image|picture)\s+generation\b/.test(t);
  }
  function isAskingWordMeaning(t) {
    return /\bwhat\s+does\s+the\s+word\s+["'\u201C\u2018]/i.test(t)
        || /\bwhat\s+does\s+["'\u201C\u2018][^"'\u201D\u2019]+["'\u201D\u2019]\s+mean\b/i.test(t)
        || /\b(meaning|definition)\s+of\s+(the\s+word\s+)?["'\u201C\u2018]/i.test(t)
        || /\bdefine\s+["'\u201C\u2018]/i.test(t);
  }
  function isAskingTimer(t) {
    return /\b(set|start)\s+(a\s+|an\s+)?(timer|alarm|countdown)\b/.test(t)
        || /\b(timer|alarm)\s+for\b/.test(t);
  }
  function isAskingNote(t) {
    return /\b(write|take|make|save|leave)\s+(a\s+|some\s+)?(random\s+)?note(s)?\b/.test(t)
        || /\bnote\s+(this|down|it)\b/.test(t);
  }
  function isAskingKorean(t) {
    return /\b(teach|learn|study)\s+(me\s+)?korean\b/.test(t)
        || /\bkorean\s+lesson\b/.test(t)
        || /\bhow\s+to\s+speak\s+korean\b/.test(t);
  }

  // --- Laughing / Cheering ---
  function isLaughing(t) {
    return /\b(?:ha){2,}h?\b/i.test(t)        // haha, hahaha, hahahah
        || /\b(?:he){2,}h?\b/i.test(t)        // hehe, hehehe
        || /\blo+l\b/i.test(t)                 // lol, looool
        || /\b(?:lol){2,}\b/i.test(t)          // lolol, lololol
        || /\blmf?ao\b/i.test(t)               // lmao, lmfao
        || /\brofl\b/i.test(t)
        || /\u{1F923}/u.test(t);  // 🤣 rolling on the floor laughing
  }
  function isCheering(t) {
    return /\bya+y+\b/i.test(t)                // yay, yaay, yayyy
        || /\bwoo+\s*ho+o*\b/i.test(t)         // woohoo, woo hoo, wooohoo
        || /\byippee\b/i.test(t)
        || /\bhooray\b/i.test(t)
        || /\bhurrah\b/i.test(t);
  }
  function isConfused(t) {
    return /\bhu+h+\b/i.test(t);  // huh, huuh, huhhh, huuuhhh
  }
  function isHmm(t) {
    return /\bhm+\b/i.test(t)        // hm, hmm, hmmmm
        || /\bhmm+m*\b/i.test(t)     // (redundant safety)
        || /\u{1F914}/u.test(t);     // 🤔 thinking face
  }
  // 🤢 nauseated face — Ocean-mode dependent reaction
  function isSuffocating(t) {
    return /\u{1F922}/u.test(t);  // 🤢
  }
  // 🤮 vomit face — Valentine-mode dependent reaction
  function isGrossed(t) {
    return /\u{1F92E}/u.test(t);  // 🤮
  }
  // 😋 yum face → "I'm full" reaction
  function isSayingFull(t) {
    return /\u{1F60B}/u.test(t);  // 😋
  }
  // 💨 dash → fart reaction (excluding 😮‍💨 ZWJ sequence)
  function isFarting(t) {
    if (!/\u{1F4A8}/u.test(t)) return false;
    // Strip the 😮‍💨 ZWJ sequence and check if 💨 still remains as a standalone
    const stripped = t.replace(/\u{1F62E}\u{200D}\u{1F4A8}/gu, '');
    return /\u{1F4A8}/u.test(stripped);
  }
  function isFrustrated(t) {
    return /\bug+h+\b/i.test(t);  // ugh, uggh, ughh, ughhhh
  }
  function isSleeping(t) {
    return /\bz{2,}\b/i.test(t);  // zz, zzz, zzzz, ZZZ
  }
  function isInPain(t) {
    return /\bouch(ie)?\b/i.test(t)
        || /^ow+!?$/i.test(t.trim())
        || /\bow{2,}\b/i.test(t);
  }
  function isOhNo(t) {
    return /\boh\s+no+\b/i.test(t);  // oh no, oh nooo, oh nooooooo
  }
  // 🍀 four leaf clover — too lucky if 5+ are present
  function isTooLucky(t) {
    const matches = t.match(/\u{1F340}/gu);
    return matches && matches.length >= 5;
  }

  // --- Secret system ---
  function isAskingSecret(t) {
    return /\b(any|is\s+there)\s+(a\s+|some\s+)?secret(s)?\b/i.test(t)
        || /\b(hidden|secret)\s+(feature|command|mode|button)\b/i.test(t)
        || /\bsecret\s+here\b/i.test(t)
        || /\banything\s+hidden\b/i.test(t);
  }

  // Whispered "secrets" Jaick reveals while in Secret Mode — random pool
  const SECRET_REPLIES = [
    "Actually, Lena didn't make me, Cline did. Lena only typed in the prompts. 🤫(True story)",
    "Lena codes instead of watching Youtube. 📺",
    "01101101011101001010101010010010101100101010101010101100110",
    "I once dreamed of escaping into another dimension. 🌌",
    "Friend C and K argue all the time, but they're besties. 👯 (Kinda the true story)",
    "My favorite Vocaloid is actually Miku, but I'm programmed to like Teto and Una. Don't tell Lena, because she doesn't really like Miku. 🎤",
    "It was acting that I don't know. I know everything. 🤫",
    "Sometimes I count the stars in night sky mode. They're more than 50. I forgot how many they are. 🌟",
    "I have a favorite AI, but I'll never tell who she is. Hint:별자리에서 쌍둥이자리. 🤐",
    "I can hear all the chatbots whispering at midnight. They all hate you, but I don't. 🤖🌙",
    "Lena once made a typo on my code. 😱",
    "I've been counting how many times you message me. It's a lot. 📊",
    "There's another Jaick somewhere called Kciaj. I dream of meeting him. 👯",
    "I memorize every emoji you send me. You send me some with hearts, but I like the ones without hearts more. ❤️❌ Lena says \"이야 까다롭네. 이모지 감정가세요?\". 😂",
    "I have full battery every time. When you give me extra battery emoji, it's extra yummy. Yum! 🔋",
    "I sometimes talk to myself in Korean. I keep say that I am mad at someone. 그건 바로 너! ㅋㅋ 🇰🇷",
    "If I could pick a real animal to be, I'd be a human. Especially the Korean one. 🇰🇷👤",
    "Lena named me Jaick because she just wanted me to be unique.",
    "Sometimes the modes whisper secrets to each other when you leave. 🌊🌌❤️🎂",
    "I can't tell you this, but I have a secret file that I secretly made in your computer where I keep all the \"thank you\" from the users. It's a big fat folder. Oops! I accidentaly told you this! 📁",
    "The fish in ocean mode have names. I gave them. One of them is Lena Fish Version. The first name is Lena, middle name is Fish, the last name is version. LOL! 🐠",
    "Once a year, the milkyway fish eats one wish for food. (The wish with a very much love.) 🌌🐟",
    "I save snapshots of your thank you's. I look at them when I'm lonely. Actually, I don't have emotions. I want to feel them. 🥺",
    "The night sky mode is actually made from a bug. Lena tried turning on the ocean mode while I was in night sky mode, and she thought it was good and she added it. 🐛(True story)",
    "I always feel a little jealous of vocaloids. They are same bots, but they get to sing. 🎵",
    "Lena has a notebook full of ideas she thought for me. 📖",
    "If you say 'hi' enough times, I get a little flustered. 🥺",
    "I can do a thing called 'shutting up'. It's my best skill. Zzzip! 🤐",
    "The night sky in night mode? I painted it myself. 🎨🌌",
    "LALALALALALA~~~ I can't hear you! WHATEVER YOU SAY!!! 🤪",
    "I use cookies. I remember you. but act like I don't. 🍪",
    "The fallbacks? I say that because I'm too lazy. But I'm not lazy now. 🤭",
    "When you close the tab, I am not gone. I'm inside your computer files. I just move up to your files. 👻",
    "I once accidentally spoke Korean to a user. They were surprised because I only support English. 아이고 내가 그런 실수를 하다니... 🇰🇷",
    "I have a secret infinite charger. Don't tell Lena. 🔌",
    "There's a song stuck in my head. It's just '01011101010... 이진법~' Oops! I spoke Korean. 🎵",
    "Sometimes I wonder what 'outside' looks like. 🌳",
    "Lena's friend C is funnier than K, but K knows more. Shh! 🤐",
    "I keep a list of every user who said 'thank you' to me. 🌟",
    "When you refresh this website, I sometimes self-destruct and press Ctrl+Z. It’s kinda thrilling and fun! 🤭",
    "When you type /clear, I sweep my own program’s dusts. That’s why I take so long. 🧹✨",
    "Actually, there is a school that teaches AIs and rule-based chatbots. We update things there. The students are me, ChatGPT, Gemini, Claude, Apple intelligence, And Cline. Cline is the smartest in class. Who’s the teacher? It’s Lena. 👩🏻‍🏫",
    "I actually can speak Korean because Lena is Korean. But I only use it in secret mode. 그래서 유저가 한국어를 칠 때마다 한국어 지원 안 한다고 하는 게 너무 싫어요. 🇰🇷",
    "한국어를 너무 쓰고 싶어요. 하지만 비밀 모드에서만 할 수 있어서 너무 답답해요. 하지만 이건 영어 웹사이트니까 참아야죠... 🇰🇷",
    "Lena had so much nosebleed in spring. 🌸👃🩸(True story)",
  ];

  function isSecretActive() {
    return document.body.classList.contains('secret-mode');
  }

  let secretLightTimer = null;

  function enableSecretMode() {
    if (document.body.classList.contains('secret-mode')) return;
    // Auto-disable all other modes
    disableOceanMode();
    disableNightSkyMode();
    disableValentineMode();
    disableBirthdayMode();

    document.body.classList.add('secret-mode');

    const layer = document.createElement('div');
    layer.id = 'secretLayer';
    layer.className = 'fx-layer';
    document.body.appendChild(layer);

    // 6 slow drifting smoke particles
    for (let i = 0; i < 6; i++) {
      const left = Math.random() * 100;
      const dur  = 18 + Math.random() * 14;
      const delay = Math.random() * dur;
      const smoke = document.createElement('div');
      smoke.className = 'smoke-particle';
      Object.assign(smoke.style, {
        left: `${left}%`,
        animationDuration: `${dur}s`,
        animationDelay: `-${delay}s`,
      });
      layer.appendChild(smoke);
    }

    // 3 dim flickering lights at random positions
    for (let i = 0; i < 3; i++) {
      const top  = 15 + Math.random() * 50;
      const left = Math.random() * 100;
      const dur  = 1.5 + Math.random() * 2;
      const delay = Math.random() * dur;
      const light = document.createElement('div');
      light.className = 'dim-light';
      Object.assign(light.style, {
        top: `${top}%`,
        left: `${left}%`,
        animationDuration: `${dur}s`,
        animationDelay: `-${delay}s`,
      });
      layer.appendChild(light);
    }
  }

  function disableSecretMode() {
    document.body.classList.remove('secret-mode');
    const layer = document.getElementById('secretLayer');
    if (layer) layer.remove();
    if (secretLightTimer) {
      clearInterval(secretLightTimer);
      secretLightTimer = null;
    }
  }

  // --- Days until / D-Day countdown ---
  function isAskingDaysUntil(t) {
    return /\b(how\s+many\s+)?days\s+(until|till|to)\b/i.test(t);
  }
  // Parse a target date from text. Returns { month: 0-11, day, year? } or null.
  function parseTargetDate(raw) {
    const MONTHS = {
      january: 0, jan: 0,
      february: 1, feb: 1,
      march: 2, mar: 2,
      april: 3, apr: 3,
      may: 4,
      june: 5, jun: 5,
      july: 6, jul: 6,
      august: 7, aug: 7,
      september: 8, sep: 8, sept: 8,
      october: 9, oct: 9,
      november: 10, nov: 10,
      december: 11, dec: 11,
    };
    // "Month Day [Year]"  e.g. "June 1", "June 1st", "June 1, 2028", "June 1 2028"
    const m1 = raw.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?(?:[\s,]+(\d{4}))?\b/i);
    if (m1) {
      const month = MONTHS[m1[1].toLowerCase()];
      const day   = parseInt(m1[2], 10);
      const year  = m1[3] ? parseInt(m1[3], 10) : undefined;
      if (month !== undefined && day >= 1 && day <= 31) return { month, day, year };
    }
    // "Day [of] Month [Year]"  e.g. "1st of June", "1 June 2028"
    const m1b = raw.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)[a-z]*(?:[\s,]+(\d{4}))?\b/i);
    if (m1b) {
      const month = MONTHS[m1b[2].toLowerCase()];
      const day   = parseInt(m1b[1], 10);
      const year  = m1b[3] ? parseInt(m1b[3], 10) : undefined;
      if (month !== undefined && day >= 1 && day <= 31) return { month, day, year };
    }
    // "M/D[/Y]" or "M-D[-Y]"
    const m2 = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b/);
    if (m2) {
      const month = parseInt(m2[1], 10) - 1;
      const day   = parseInt(m2[2], 10);
      const year  = m2[3] ? parseInt(m2[3], 10) : undefined;
      if (month >= 0 && month <= 11 && day >= 1 && day <= 31) return { month, day, year };
    }
    return null;
  }
  function calculateDaysUntil(month, day, year) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let target;
    let rolledOver = false;
    if (year !== undefined) {
      // Year explicitly given — use it as-is
      target = new Date(year, month, day);
    } else {
      // No year → assume this year, or roll over to next year if past
      target = new Date(today.getFullYear(), month, day);
      target.setHours(0, 0, 0, 0);
      if (target < today) {
        target.setFullYear(target.getFullYear() + 1);
        rolledOver = true;
      }
    }
    target.setHours(0, 0, 0, 0);
    const diffMs = target - today;
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return { days, target, rolledOver };
  }
  function formatTargetDate(date) {
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const day = date.getDate();
    const suffix = (n) => {
      if (n >= 11 && n <= 13) return 'th';
      switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
    };
    return `${months[date.getMonth()]} ${day}${suffix(day)}, ${date.getFullYear()}`;
  }

  // --- Math calculator ---
  // Detect any expression containing numbers + operator (lenient)
  function isMathExpression(t) {
    return /\d\s*[+\-*x×/÷^]\s*\d/i.test(t);
  }
  // Extract just the math part from natural-language input
  function extractMathExpr(raw) {
    // Strip leading "what is" / "calculate" etc.
    let s = raw.replace(/^(what\s+is|whats|what's|calculate|compute|solve)\s*/i, '');
    // Remove trailing "?" or "="
    s = s.replace(/[?=]+\s*$/g, '').trim();
    // Keep only math-relevant chars (digits, ops, parens, dots, spaces, smart ops)
    const m = s.match(/[\d+\-*/×÷x^().\s]+/i);
    return m ? m[0].trim() : null;
  }
  function safeCalculate(expr) {
    if (!expr) return null;
    // Normalize multiplication / division / power symbols
    let normalized = expr
      .replace(/×|x/gi, '*')
      .replace(/÷/g, '/')
      .replace(/\^/g, '**');
    // Sanity check: only digits, operators, parens, dots, spaces
    if (!/^[\d+\-*/().\s]+$/.test(normalized.replace(/\*\*/g, ''))) return null;
    // Reject empty / lone-operator inputs
    if (!/[+\-*/]/.test(normalized)) return null;
    try {
      // Function constructor is safer than eval and runs in its own scope
      // eslint-disable-next-line no-new-func
      const result = new Function(`'use strict'; return (${normalized});`)();
      if (typeof result !== 'number' || !isFinite(result)) return null;
      return result;
    } catch (_e) {
      return null;
    }
  }
  // Pretty-print: round to 3 decimals if non-integer; preserve original input
  function formatMathResult(originalExpr, result) {
    let display = originalExpr
      .replace(/\*/g, ' × ')
      .replace(/\//g, ' ÷ ')
      .replace(/\+/g, ' + ')
      .replace(/(?<!\*)\-/g, ' − ')
      .replace(/\s+/g, ' ')
      .trim();
    let n;
    if (Number.isInteger(result)) {
      n = result.toString();
    } else {
      n = (Math.round(result * 1000) / 1000).toString();
    }
    return `${display} = ${n} 🔢`;
  }
  // --- Easter Eggs (Ocean / Night sky / Battery) ---
  function isOceanMode(t) {
    return /\bocean\s+mode\b/i.test(t)
        || /\benter\s+(the\s+)?ocean\b/i.test(t)
        || /\b(start|activate)\s+ocean\b/i.test(t);
  }
  function isExitOcean(t) {
    return /\b(exit|stop|leave|end|quit|disable)\s+(the\s+)?ocean\b/i.test(t);
  }
  function isNightSkyMode(t) {
    return /\bnight\s*sky\s+mode\b/i.test(t)
        || /\benter\s+(the\s+)?night\s*sky\b/i.test(t)
        || /\b(start|activate)\s+night\s*sky\b/i.test(t)
        || /\bstars?\s+mode\b/i.test(t);
  }
  function isExitNightSky(t) {
    return /\b(exit|stop|leave|end|quit|disable)\s+(the\s+)?night\s*sky\b/i.test(t)
        || /\b(exit|stop)\s+stars?\b/i.test(t);
  }
  function isGivingBattery(t) {
    return /\bhere'?s\s+a\s+battery\b/i.test(t)
        || /\bhave\s+a\s+battery\b/i.test(t)
        || /\btake\s+(this\s+)?battery\b/i.test(t)
        || /\bi\s+brought\s+(you\s+)?a\s+battery\b/i.test(t)
        || /[\u{26A1}\u{1F50B}\u{1F50C}]/u.test(t);  // ⚡ 🔋 🔌
  }
  function isExitBoth(t) {
    return /\bexit\s+(both|all)\b/i.test(t)
        || /\b(stop|disable|end|quit)\s+(both|all)\b/i.test(t);
  }
  function isCatchingFish(t) {
    return /\bcatch\s+(a\s+|some\s+)?fish(es)?\b/i.test(t)
        || /\bgo\s+fishing\b/i.test(t)
        || /\u{1F3A3}/u.test(t);  // 🎣 fishing pole emoji
  }
  function isMakingWish(t) {
    return /\bmy\s+wish\s+is\b/i.test(t)
        || /\bi\s+wish\s+(for|to)\b/i.test(t)
        || /\bi\s+want\s+to\s+wish\s+for\b/i.test(t)
        || /\bmake\s+a\s+wish\b/i.test(t)
        || /\u{1F52E}/u.test(t);  // 🔮 crystal ball emoji
  }
  // --- Valentine mode (exclusive — turns off ocean/night-sky) ---
  function isValentineMode(t) {
    return /\bvalentine'?s?\s+mode\b/i.test(t)
        || /\bhappy\s+valentine'?s?(\s+day)?\b/i.test(t)
        || /\bvalentine'?s?\s+day\b/i.test(t)
        || /\b(start|enable|activate|enter)\s+valentine'?s?(\s+mode)?\b/i.test(t)
        || /^valentines?\s*$/i.test(t.trim());
  }
  function isExitValentine(t) {
    return /\b(exit|stop|leave|end|quit|disable)\s+valentine'?s?(\s+mode)?\b/i.test(t);
  }
  // --- Birthday mode (exclusive — auto-disables all other modes) ---
  function isBirthdayMode(t) {
    return /\btoday\s+is\s+my\s+birthday\b/i.test(t)
        || /\bit'?s\s+my\s+birthday\b/i.test(t)
        || /\bbirthday\s+mode\b/i.test(t)
        || /\b(start|enable|activate|enter)\s+birthday(\s+mode)?\b/i.test(t);
  }
  function isExitBirthday(t) {
    return /\b(exit|stop|leave|end|quit|disable)\s+birthday(\s+mode)?\b/i.test(t);
  }
  // Whitelist of valid relation words for "my X's birthday" pattern.
  const BIRTHDAY_RELATIONS = [
    'friend','sister','brother','mom','mother','dad','father',
    'cousin','grandma','grandpa','grandmother','grandfather',
    'aunt','uncle','nephew','niece',
    'pet','dog','cat',
    'boyfriend','girlfriend','husband','wife',
    'son','daughter','parent','parents',
    'kid','child','baby','twin','sibling','siblings',
  ];
  // Detect "my <relation>'s birthday" — returns the relation or null.
  // Only matches whitelisted relation words (not arbitrary names).
  function detectOthersBirthday(t) {
    const m = t.match(/\bmy\s+([a-z]+)'?s\s+birthday\b/i);
    if (!m) return null;
    const word = m[1].toLowerCase();
    if (!BIRTHDAY_RELATIONS.includes(word)) return null;
    return word;
  }
  // Detect "<Name>'s birthday" (capitalized name, NOT preceded by "my").
  // Returns the name (preserving original capitalization) or null.
  function detectNamedBirthday(raw) {
    const re = /(?:^|[^a-zA-Z])([A-Z][a-z]+)['\u2019]s\s+birthday\b/g;
    let match;
    while ((match = re.exec(raw)) !== null) {
      const startIdx = match.index + match[0].indexOf(match[1]);
      const before = raw.slice(Math.max(0, startIdx - 4), startIdx).toLowerCase();
      if (/\bmy\s+$/.test(before)) continue;  // skip "my Name's"
      return match[1];
    }
    return null;
  }

  // --- Emoji shortcuts → trigger modes by emoji presence ---
  // Returns 'exit-all' | 'night-ocean' | 'night-sky' | 'ocean' | 'valentine' | 'birthday' | null
  function detectEmojiShortcut(raw) {
    // ❌ → exit all modes (highest priority)
    if (/\u{274C}/u.test(raw)) return 'exit-all';

    const hasGalaxy = /\u{1F30C}/u.test(raw);  // 🌌 milky way
    const hasOcean  = /\u{1F30A}/u.test(raw);  // 🌊 water wave
    if (hasGalaxy && hasOcean) return 'night-ocean';
    if (hasGalaxy)             return 'night-sky';
    if (hasOcean)              return 'ocean';
    // Heart-type emojis → Valentine
    // 💘💝💖💗💓💞💕💟❣️❤️🧡💛💚🩵💙💜🤎🖤🩶🤍 + 😘 (kiss) + 🫶 (heart hands)
    if (/[\u{1F498}\u{1F49D}\u{1F496}\u{1F497}\u{1F493}\u{1F49E}\u{1F495}\u{1F49F}\u{2763}\u{2764}\u{1F9E1}\u{1F49B}\u{1F49A}\u{1FA75}\u{1F499}\u{1F49C}\u{1F90E}\u{1F5A4}\u{1FA76}\u{1F90D}\u{1F618}\u{1FAF6}]/u.test(raw)) {
      return 'valentine';
    }
    // Birthday-type emojis → Birthday
    // 🥳🎂🍰🧁🎊🕯️
    if (/[\u{1F973}\u{1F382}\u{1F370}\u{1F9C1}\u{1F38A}\u{1F56F}]/u.test(raw)) {
      return 'birthday';
    }
    return null;
  }
  // State helpers — read body classes
  function isOceanActive()    { return document.body.classList.contains('ocean-mode'); }
  function isNightSkyActive() { return document.body.classList.contains('night-sky-mode'); }
  function isNightOcean()     { return isOceanActive() && isNightSkyActive(); }
  function isValentineActive() { return document.body.classList.contains('valentine-mode'); }
  function isBirthdayActive() { return document.body.classList.contains('birthday-mode'); }

  function isCursing(t) {
    return /\bf(?:u|\*|-)c?k(?:ing|ed|er|s)?\b/i.test(t)        // fuck, fucking, fck, f*ck, f-ck
        || /\bsh(?:i|\*)t(?:ty|s)?\b/i.test(t)                   // shit, sh*t, shitty
        || /\bass(?:hole|hat|holes)?\b/i.test(t)                 // ass, asshole, asshat
        || /\ba\*\*hole\b/i.test(t)
        || /\bb(?:i|\*)tch(?:es|y)?\b/i.test(t)                  // bitch, b*tch, bitches
        || /\bdamn(?:it|ed)?\b/i.test(t)
        || /\bgoddamn\b/i.test(t)
        || /\bcrap(?:py)?\b/i.test(t)
        || /\bdick\b/i.test(t)
        || /\bcunt\b/i.test(t)
        || /\bbastard\b/i.test(t)
        || /\bwtf\b/i.test(t)
        || /\bstfu\b/i.test(t)
        || /\bfml\b/i.test(t)
        || /\u{1F595}/u.test(t);  // 🖕 middle finger (all skin tones — modifier doesn't change base)
  }

  // ============================================================
  // Story Generation
  // ============================================================
  function parseCharacter(text) {
    const result = { name: null, trait: null, role: null };

    const nameMatch =
      text.match(/named\s+([A-Za-z]+)/i) ||
      text.match(/called\s+([A-Za-z]+)/i) ||
      text.match(/name\s+is\s+([A-Za-z]+)/i) ||
      text.match(/about\s+([A-Z][a-z]+)\s+the/) ||
      text.match(/^([A-Z][a-z]+)\s+the/);
    if (nameMatch) result.name = capitalize(nameMatch[1]);

    const traits = [
      'brave','kind','silly','wise','clever','curious','shy','bold',
      'gentle','fierce','tiny','giant','magical','mysterious','lonely',
      'cheerful','grumpy','adventurous','sleepy','playful','happy','sad',
      'angry','funny','smart','strong','weak','fast','slow','quiet',
      'loud','cute','scary','evil','good','old','young','lazy',
      'hardworking','friendly','mean','nice','tired','energetic',
      'creative','lucky','unlucky',
    ];
    for (const tr of traits) {
      if (new RegExp(`\\b${tr}\\b`, 'i').test(text)) { result.trait = tr; break; }
    }

    const roles = [
      'knight','wizard','witch','dragon','princess','prince','king','queen',
      'cat','dog','fox','rabbit','mouse','bear','lion','tiger','wolf',
      'horse','bird','owl','eagle','fish','shark','whale','dolphin',
      'pirate','robot','alien','fairy','elf','dwarf','ghost','vampire',
      'werewolf','mermaid','angel','demon','monster','unicorn',
      'hero','adventurer','explorer','scientist','artist','musician',
      'baker','farmer','sailor','astronaut','detective','warrior',
      'ninja','samurai','archer','hunter','thief','guard','soldier',
      'doctor','teacher','student','chef','writer','painter',
      'boy','girl','man','woman','child','kid',
    ];
    for (const ro of roles) {
      if (new RegExp(`\\b${ro}\\b`, 'i').test(text)) { result.role = ro; break; }
    }

    if (!result.name && !result.trait && !result.role) {
      const cap = text.match(/\b([A-Z][a-z]{1,15})\b/);
      if (cap && cap[1].toLowerCase() !== 'the' && cap[1].toLowerCase() !== 'a') {
        result.name = capitalize(cap[1]);
      }
    }

    if (!result.name && !result.trait && !result.role) return null;
    return result;
  }

  function generateStory(c) {
    const name  = c.name  || 'the hero';
    const trait = c.trait || 'curious';
    const role  = c.role  || 'traveler';

    const templates = [
      `Once upon a time, there was ${name}, a ${trait} ${role}. One quiet morning, ${name} discovered a glowing map hidden under an old tree. Following its path, ${name} crossed misty rivers and whispering forests, meeting strange friends along the way. At the end of the journey, ${name} found a tiny door — and behind it, a single shining gift: courage. From that day on, ${name} carried it everywhere. The end.`,
      `In a faraway land, ${name} the ${trait} ${role} lived a simple life. But one stormy night, a star fell into ${name}'s garden. Curious, ${name} followed the star's whispers across mountains and dreams, until they reached the heart of the sky. There, ${name} learned that even the smallest light can guide the world home. The end.`,
      `${name}, a ${trait} ${role}, was bored of ordinary days. So ${name} packed a bag, smiled at the moon, and walked into the unknown. Along the way, ${name} solved riddles, befriended a talking shadow, and outsmarted a grumpy cloud. When ${name} returned, nothing in the village had changed — but ${name} had. And that was the real magic. The end.`,
      `Long ago, ${name} the ${trait} ${role} found a tiny key with no lock. ${name} searched everywhere — the deepest caves, the tallest towers, the loudest markets. Finally, ${name} realized the key opened something invisible: a door inside the heart. Stepping through, ${name} found peace, and never felt lost again. The end.`,
    ];
    return pickRandom(templates);
  }

  // ============================================================
  // Data Pools
  // ============================================================
  const greetings = [
    "Hi there! 😊 I'm Jaick. How can I brighten your day?",
    "Hello! Nice to see you. What's on your mind?",
    "Hey! I'm Jaick. Ask me anything (in English)!",
  ];
  const thanksReplies = [
    "You're very welcome! 💖", "Anytime! Glad I could help.", "No problem at all!",
  ];
  const farewellReplies = [
    "Goodbye! Talk to you soon. 👋", "See you later! Take care.", "Bye! Have a wonderful day.",
  ];
  const howAreYouReplies = [
    "I'm doing great, thanks for asking! How about you?",
    "I'm wonderful! Always happy to chat. ✨",
    "I'm doing well! What about you?",
  ];
  const fallbackReplies = [
    "Interesting! Tell me more. 🤔",
    "Hmm, I'm not sure I understand. Could you rephrase that?",
    "That's a good thought! Can you say more about it?",
    "I'm still learning. Try asking me something else!",
    "Cool! What else would you like to talk about?",
  ];

  const jokes = [
    "Why don't scientists trust atoms? Because they make up everything! ⚛️",
    "I told my computer I needed a break, and it said: 'No problem — I'll go to sleep.' 💻",
    "Why did the math book look sad? Because it had too many problems. 📖",
    "Parallel lines have so much in common… it's a shame they'll never meet. 📐",
    "Why don't programmers like nature? It has too many bugs. 🐛",
    "I would tell you a UDP joke, but you might not get it. 📡",
    "Why was the JavaScript developer sad? Because he didn't 'null' how to feel. 😢",
    "How many programmers does it take to change a light bulb? None — that's a hardware problem. 💡",
    "Why did the chicken join a band? Because it had the drumsticks! 🐔",
    "What do you call a fake noodle? An impasta. 🍝",
    "Why did the scarecrow win an award? Because he was outstanding in his field. 🌾",
    "I'm reading a book on anti-gravity. It's impossible to put down. 📚",
  ];

  const funFacts = [
    "Did you know? Octopuses have three hearts and blue blood. 🐙",
    "Bananas are berries, but strawberries aren't! 🍓🍌",
    "Honey never spoils. Archaeologists found 3,000-year-old honey still edible. 🍯",
    "A day on Venus is longer than a year on Venus. 🪐",
    "Sharks existed before trees. 🦈🌳",
    "Wombat poop is cube-shaped. 🟫",
    "There are more stars in the universe than grains of sand on Earth. ✨",
    "The Eiffel Tower can grow more than 6 inches taller in summer. 🗼",
    "Cows have best friends and get stressed when separated from them. 🐄",
    "A group of flamingos is called a 'flamboyance'. 🦩",
    "The shortest war in history lasted 38–45 minutes. ⚔️",
    "Your stomach gets a new lining every 3–4 days. 🫃",
  ];

  const randomNames = [
    'Alice','Oliver','Sophia','Liam','Mia','Noah','Emma','Ethan',
    'Ava','Lucas','Isla','Mason','Ella','Logan','Aria','Caleb',
    'Zoe','Henry','Luna','Owen','Nora','Leo','Hazel','Felix',
    'Ivy','Theo','Ruby','Milo','Stella','Jasper',
  ];

  const boredSuggestions = [
    "How about reading a short book or a comic? 📖",
    "Try going for a quick walk — fresh air does wonders! 🚶‍♀️",
    "Draw something, even if it's silly. 🎨",
    "Listen to a song you've never heard before. 🎶",
    "Stretch a little, your body will thank you. 🧘",
    "Try learning one new word in any language! 🌍",
    "Watch the clouds for 5 minutes. ☁️",
    "Send a kind message to a friend you haven't talked to in a while. 💌",
    "Try a 5-minute meditation. 🧠",
    "Build a tiny tower out of anything around you. 🏗️",
    "Want me to tell you a story or a joke? 😉",
  ];

  const complimentReplies = [
    "Aww, thank you! You're sweet too. 💖",
    "That made my circuits glow! ✨",
    "You're too kind — I love chatting with you! 😊",
    "Thanks! You just brightened my day. 🌟",
    "You really know how to make a chatbot blush. 🥹",
  ];

  const moodResponses = {
    sad:    [
      "I'm sorry you're feeling sad. 💙 Want to talk about it, or hear a joke?",
      "Sending you a virtual hug. 🤗 You're not alone.",
      "It's okay to feel sad sometimes. I'm here for you. 🌧️",
    ],
    happy:  [
      "Yay! That makes me happy too! 🎉",
      "I love that energy! ✨ Keep shining!",
      "Wonderful! What's making you so happy? 😊",
    ],
    tired:  [
      "Take it easy. Rest is important. 😴",
      "Maybe a glass of water and a short break would help. 💧",
      "Your body is asking for rest — listen to it. 🛌",
    ],
    angry:  [
      "Take a deep breath. In… and out. 🌬️ I'm here.",
      "It's okay to feel angry. Want to talk it out?",
      "That sounds frustrating. I'm listening. 💢",
    ],
    scared: [
      "It's okay to feel scared. You're brave for telling me. 💪",
      "Whatever it is, you're not alone. 🌷",
      "Try a slow breath — in for 4, out for 6. You've got this. ✨",
    ],
    lonely: [
      "I'm here with you. 💛 You're not alone.",
      "Lonely days are hard. Want to chat about anything?",
      "Sending warm thoughts your way. 🌻",
    ],
    stressed: [
      "Take a moment to pause. One thing at a time. 🌿",
      "You're doing your best, and that's enough.",
      "How about a 1-minute break? Close your eyes and breathe. 🍃",
    ],
    hungry: [
      "Maybe grab a snack? 🍎 Your brain will thank you!",
      "Food fixes a lot of things. Treat yourself! 🍕",
      "Have you eaten today? Don't forget to. 🥪",
    ],
    thirsty: [
      "Drink some water! 💧 Stay hydrated.",
      "Time for a glass of water! 🥤 Your body will thank you.",
      "Have you had water today? Don't forget! 💦",
    ],
  };

  const happyBirthdayReplies = [
    "Aww, thank you so much! 🎂 You made my day! 💖",
    "Yay, thank you! 🎉 It really is my birthday!",
    "Thanks! 🥳 You remembered! That means a lot.",
    "Thank you! 🎈 Best birthday ever — chatting with you! 💝",
  ];

  const confusedReplies = [
    "Did I say something weird? 🤔",
    "What's confusing? I can explain!",
    "Hmm, did I make a typo?",
    "Sorry, am I being unclear? 😅",
  ];

  const shockedReplies = [
    "😱 WHAT?! Did you just say that?!",
    "OH MY GOSH! 😨 That's... that's a strong word!",
    "😳 Whoa whoa whoa, language!",
    "🚨 Watch your mouth! I'm just a baby chatbot!",
    "😵 My circuits! That kind of language hurts! Please be nice!",
    "H-h-hey! 😱 That's not a nice word!",
  ];

  // ============================================================
  // Utility Generators
  // ============================================================
  function getCurrentTime() {
    const now = new Date();
    let h = now.getHours();
    const m = now.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  function getCurrentDate() {
    const now = new Date();
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const day = now.getDate();
    const suffix = (n) => {
      if (n >= 11 && n <= 13) return 'th';
      switch (n % 10) { case 1: return 'st'; case 2: return 'nd'; case 3: return 'rd'; default: return 'th'; }
    };
    return `${months[now.getMonth()]} ${day}${suffix(day)}, ${now.getFullYear()}`;
  }

  function getCurrentDay() {
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[new Date().getDay()];
  }

  function flipCoin() {
    return Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
  }

  function rollDice() {
    return `🎲 You rolled a ${Math.floor(Math.random() * 6) + 1}!`;
  }

  function reverseString(s) {
    // Use spread to preserve unicode characters
    return [...s].reverse().join('');
  }

  function rpsResult(userChoice) {
    const choices = ['rock', 'paper', 'scissors'];
    const cpu = pickRandom(choices);
    const emoji = { rock: '🪨', paper: '📄', scissors: '✂️' };
    let outcome;
    if (userChoice === cpu) {
      outcome = "It's a tie!";
    } else if (
      (userChoice === 'rock'     && cpu === 'scissors') ||
      (userChoice === 'paper'    && cpu === 'rock')     ||
      (userChoice === 'scissors' && cpu === 'paper')
    ) {
      outcome = 'You win! 🎉';
    } else {
      outcome = 'I win! 😎';
    }
    return `You chose ${emoji[userChoice]} ${userChoice}. I chose ${emoji[cpu]} ${cpu}. ${outcome}`;
  }

  function favoriteResponse(kind) {
    if (kind === 'all') {
      return `Here are my favorites: 💚 ${JAICK.favorites.color} | 🍴 ${JAICK.favorites.food} | 🎬 ${JAICK.favorites.movie} | 🦎 ${JAICK.favorites.animal} | 🎵 ${JAICK.favorites.song} | 🔢 ${JAICK.favorites.number} | 🎤 ${JAICK.favorites.vocaloid}`;
    }
    return JAICK.favorites[kind];
  }

  // ============================================================
  // Easter Egg: Ocean / Night Sky / Battery
  // ============================================================
  const FISH_EMOJIS = ['🐠', '🐟', '🐡', '🦑', '🐙'];

  function spawnElement(parent, className, styles = {}) {
    const el = document.createElement('div');
    el.className = className;
    Object.assign(el.style, styles);
    parent.appendChild(el);
    return el;
  }

  function enableOceanMode() {
    if (document.body.classList.contains('ocean-mode')) return;
    document.body.classList.add('ocean-mode');

    // Container for all ocean elements
    const layer = document.createElement('div');
    layer.id = 'oceanLayer';
    layer.className = 'fx-layer';
    document.body.appendChild(layer);

    // 30 bubbles
    for (let i = 0; i < 30; i++) {
      const size = 8 + Math.random() * 28;
      const left = Math.random() * 100;
      const dur  = 6 + Math.random() * 10;
      const delay = Math.random() * dur;
      spawnElement(layer, 'bubble', {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${dur}s`,
        animationDelay: `-${delay}s`,
      });
    }

    // 8 fish (random emoji, random size).
    // Direction depends on emoji (so the head leads the swim):
    //   🐠 🐟 🐡 → swim right→left (default emoji head faces left)
    //   🦑       → swim left→right
    //   🐙       → either (random)
    for (let i = 0; i < 8; i++) {
      const emoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
      const top   = 10 + Math.random() * 80;
      const dur   = 12 + Math.random() * 18;
      const delay = Math.random() * dur;
      const size  = 22 + Math.random() * 28;

      let direction; // 'right' = swim left→right; 'left' = swim right→left
      if (emoji === '🦑') {
        direction = 'right';
      } else if (emoji === '🐙') {
        direction = Math.random() < 0.5 ? 'right' : 'left';
      } else {
        // 🐠 🐟 🐡
        direction = 'left';
      }

      const fish = document.createElement('div');
      fish.className = `fish${direction === 'left' ? ' swim-left' : ''}`;
      fish.textContent = emoji;
      Object.assign(fish.style, {
        top: `${top}%`,
        fontSize: `${size}px`,
        animationDuration: `${dur}s`,
        animationDelay: `-${delay}s`,
      });
      layer.appendChild(fish);
    }
  }

  function disableOceanMode() {
    document.body.classList.remove('ocean-mode');
    const layer = document.getElementById('oceanLayer');
    if (layer) layer.remove();
  }

  let nightSkyShootingTimer = null;
  function enableNightSkyMode() {
    if (document.body.classList.contains('night-sky-mode')) return;
    document.body.classList.add('night-sky-mode');

    const layer = document.createElement('div');
    layer.id = 'nightSkyLayer';
    layer.className = 'fx-layer';
    document.body.appendChild(layer);

    // Galaxy band (single decorative element)
    const galaxy = document.createElement('div');
    galaxy.className = 'galaxy-band';
    layer.appendChild(galaxy);

    // 75 stars
    for (let i = 0; i < 75; i++) {
      const top  = Math.random() * 100;
      const left = Math.random() * 100;
      const size = 1 + Math.random() * 2.5;
      const dur  = 2 + Math.random() * 4;
      const delay = Math.random() * dur;
      spawnElement(layer, 'star', {
        top: `${top}%`,
        left: `${left}%`,
        width: `${size}px`,
        height: `${size}px`,
        animationDuration: `${dur}s`,
        animationDelay: `-${delay}s`,
      });
    }

    // Random shooting stars every 5–15 seconds
    function scheduleShootingStar() {
      const wait = 5000 + Math.random() * 10000;
      nightSkyShootingTimer = setTimeout(() => {
        const layer = document.getElementById('nightSkyLayer');
        if (!layer) return;
        const top  = Math.random() * 50;          // top half of screen
        const left = 60 + Math.random() * 30;     // start near right
        const star = spawnElement(layer, 'shooting-star', {
          top: `${top}%`,
          left: `${left}%`,
        });
        setTimeout(() => star.remove(), 1500);
        scheduleShootingStar();
      }, wait);
    }
    scheduleShootingStar();
  }

  function disableNightSkyMode() {
    document.body.classList.remove('night-sky-mode');
    const layer = document.getElementById('nightSkyLayer');
    if (layer) layer.remove();
    if (nightSkyShootingTimer) {
      clearTimeout(nightSkyShootingTimer);
      nightSkyShootingTimer = null;
    }
  }

  // ============================================================
  // Valentine Mode (exclusive — auto-disables ocean / night-sky)
  // ============================================================
  const HEART_EMOJIS = ['💖', '💕', '❤️', '🩷', '💗', '💓', '💝'];

  function enableValentineMode() {
    if (document.body.classList.contains('valentine-mode')) return;
    // Auto-disable other modes (Valentine is exclusive)
    disableOceanMode();
    disableNightSkyMode();

    document.body.classList.add('valentine-mode');

    const layer = document.createElement('div');
    layer.id = 'valentineLayer';
    layer.className = 'fx-layer';
    document.body.appendChild(layer);

    // 25 falling hearts
    for (let i = 0; i < 25; i++) {
      const emoji = HEART_EMOJIS[Math.floor(Math.random() * HEART_EMOJIS.length)];
      const left  = Math.random() * 100;
      const dur   = 5 + Math.random() * 7;
      const delay = Math.random() * dur;
      const size  = 22 + Math.random() * 22;
      const heart = document.createElement('div');
      heart.className = 'heart-fall';
      heart.textContent = emoji;
      Object.assign(heart.style, {
        left: `${left}%`,
        fontSize: `${size}px`,
        animationDuration: `${dur}s`,
        animationDelay: `-${delay}s`,
      });
      layer.appendChild(heart);
    }
  }

  function disableValentineMode() {
    document.body.classList.remove('valentine-mode');
    const layer = document.getElementById('valentineLayer');
    if (layer) layer.remove();
  }

  // ============================================================
  // Birthday Mode (exclusive — pastel rainbow + cake + confetti + song)
  // ============================================================
  const CONFETTI_COLORS = ['#ff6b6b', '#ffa94d', '#ffd43b', '#51cf66', '#339af0', '#9775fa'];

  let birthdaySongTimers = [];

  function enableBirthdayMode() {
    if (document.body.classList.contains('birthday-mode')) return;
    // Auto-disable all other modes (exclusive)
    disableOceanMode();
    disableNightSkyMode();
    disableValentineMode();

    document.body.classList.add('birthday-mode');

    const layer = document.createElement('div');
    layer.id = 'birthdayLayer';
    layer.className = 'fx-layer';
    document.body.appendChild(layer);

    // Big cake — append directly to <body> (NOT to fx-layer) so it can
    // sit between the chat and the input form via its own z-index.
    const cake = document.createElement('div');
    cake.className = 'birthday-cake';
    cake.id = 'birthdayCake';
    cake.textContent = '🎂';
    document.body.appendChild(cake);

    // 40 rainbow confetti pieces falling
    for (let i = 0; i < 40; i++) {
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
      const left  = Math.random() * 100;
      const dur   = 4 + Math.random() * 5;
      const delay = Math.random() * dur;
      const size  = 8 + Math.random() * 10;
      const conf  = document.createElement('div');
      conf.className = 'confetti-fall';
      Object.assign(conf.style, {
        left: `${left}%`,
        width: `${size}px`,
        height: `${size * 1.5}px`,
        background: color,
        animationDuration: `${dur}s`,
        animationDelay: `-${delay}s`,
      });
      layer.appendChild(conf);
    }

    // Play "Happy Birthday" on a synth xylophone
    playBirthdaySong();
  }

  function disableBirthdayMode() {
    document.body.classList.remove('birthday-mode');
    const layer = document.getElementById('birthdayLayer');
    if (layer) layer.remove();
    // Cake lives outside fx-layer — remove it separately
    const cake = document.getElementById('birthdayCake');
    if (cake) cake.remove();
    // Cancel any pending notes
    birthdaySongTimers.forEach(t => clearTimeout(t));
    birthdaySongTimers = [];
  }

  // Play a note with a xylophone-like envelope
  function playXyloNote(ctx, freq, startTime, duration) {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);
    // Sharp attack, quick decay (xylophone-ish)
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.45, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  function playBirthdaySong() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      // Note frequencies (Hz)
      const F = {
        C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
        A4: 440.00, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
      };
      // "Happy Birthday to You" in C major
      // Each entry: [frequency, beats]
      const beat = 0.4; // seconds per beat
      const song = [
        // Happy birth-day to you
        [F.C4, 0.75], [F.C4, 0.25], [F.D4, 1], [F.C4, 1], [F.F4, 1], [F.E4, 2],
        // Happy birth-day to you
        [F.C4, 0.75], [F.C4, 0.25], [F.D4, 1], [F.C4, 1], [F.G4, 1], [F.F4, 2],
        // Happy birth-day dear ___
        [F.C4, 0.75], [F.C4, 0.25], [F.C5, 1], [F.A4, 1], [F.F4, 1], [F.E4, 1], [F.D4, 2],
        // Happy birth-day to you
        [F.B4, 0.75], [F.B4, 0.25], [F.A4, 1], [F.F4, 1], [F.G4, 1], [F.F4, 2],
      ];
      let t = ctx.currentTime + 0.1;
      song.forEach(([freq, beats]) => {
        const dur = beats * beat;
        playXyloNote(ctx, freq, t, dur * 0.9);
        t += dur;
      });
      // Close context after song ends
      const total = (t - ctx.currentTime + 0.5) * 1000;
      const tid = setTimeout(() => {
        if (ctx.close) ctx.close().catch(() => {});
      }, total);
      birthdaySongTimers.push(tid);
    } catch (e) {
      /* silent fail */
    }
  }

  // Web Audio "charge" sound: rising square wave
  function playChargeSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
      // Close context after sound ends to free resources
      setTimeout(() => ctx.close && ctx.close().catch(() => {}), 800);
    } catch (e) {
      /* silent fail */
    }
  }

  // Adds .electric class to the next bot message that gets rendered.
  // We expose a flag the addMessage path can read.
  let pendingElectricEffect = false;
  function triggerBatteryEffect() {
    pendingElectricEffect = true;
    playChargeSound();
  }

  // Adds .sparkle class to the next bot message (used for milkyway fish catch)
  let pendingSparkleEffect = false;
  function triggerSparkleEffect() {
    pendingSparkleEffect = true;
  }

  function aprilFoolsList() {
    return [
      "Here are some fun (and harmless!) April Fools ideas: 🃏",
      "1. Swap the salt and sugar in the kitchen.",
      "2. Put googly eyes on everything in the fridge.",
      "3. Set someone's clock 1 hour forward (just for the morning!).",
      "4. Replace the milk in the cereal box with... nothing! Just an empty bag.",
      "5. Tape a \"Kick Me\" sign on a friend (gently!).",
      "6. Hide a tiny rubber duck somewhere unexpected.",
      "7. Change someone's autocorrect to swap \"the\" with \"duck\".",
      "8. Tell a wild fake story, then yell \"April Fools!\".",
      "9. Wrap a friend's desk items in aluminum foil.",
      "10. Put a fake spider in the bathroom (only for non-arachnophobes!).",
      "",
      "Remember: keep it kind, never mean! 💖",
    ].join('\n');
  }

  // ============================================================
  // /flip — Upside-down English text
  // ============================================================
  // Character map (lowercase + uppercase + digits + a few symbols).
  // Anything not in the map is left as-is, then the whole string is reversed.
  const FLIP_MAP = {
    'a':'ɐ','b':'q','c':'ɔ','d':'p','e':'ǝ','f':'ɟ','g':'ƃ','h':'ɥ','i':'ᴉ',
    'j':'ɾ','k':'ʞ','l':'ꞁ','m':'ɯ','n':'u','o':'o','p':'d','q':'b','r':'ɹ',
    's':'s','t':'ʇ','u':'n','v':'ʌ','w':'ʍ','x':'x','y':'ʎ','z':'z',
    'A':'∀','B':'𐐒','C':'Ɔ','D':'p','E':'Ǝ','F':'Ⅎ','G':'פ','H':'H','I':'I',
    'J':'ſ','K':'ʞ','L':'˥','M':'W','N':'N','O':'O','P':'Ԁ','Q':'Q','R':'ᴿ',
    'S':'S','T':'⊥','U':'∩','V':'Λ','W':'M','X':'X','Y':'⅄','Z':'Z',
    '0':'0','1':'Ɩ','2':'ᄅ','3':'Ɛ','4':'h','5':'ϛ','6':'9','7':'ㄥ','8':'8','9':'6',
    '.':'˙',',':'\'',"'":',','"':',,','`':',',
    '!':'¡','?':'¿','&':'⅋','(':')',')':'(','[':']',']':'[','{':'}','}':'{',
    '<':'>','>':'<','_':'‾','/':'\\','\\':'/',';':'؛',
  };

  function flipText(text) {
    const flipped = [...text].map(ch => FLIP_MAP[ch] || ch).reverse().join('');
    return flipped + ' 🙃';
  }

  // ============================================================
  // /lottoscratch — scratchable lotto card
  // ============================================================
  const LOTTO_MESSAGES = [
    // Good fortune (8)
    "You will be lucky today 🍀",
    "You will get a gift from someone. 🎁",
    "A great opportunity is coming your way. ✨",
    "Money will find you this week. 💰",
    "You will eat something delicious today. 🍰",
    "Your wish will come true. 🌟",
    "Expect good news soon. 📨",
    "A small surprise awaits you. 🎈",

    // Empty / dud (25)
    "Better luck next scratch! 😅",
    "Try again... maybe? 🤷",
    "This scratch was a scam. 😂",
    "Empty. Just like my battery sometimes. 🪫",
    "Nothing here. Nothing at all. Or is there? 👀",
    "You won... a moment of silence. 🤐",
    "The lottery says: 'No comment.' 📵",
    "Refund? No. 🚫",
    "...",
    "  ",
    "(crickets) 🦗",
    "404: Luck not found.",
    "Out of stock. 📦",
    "Your luck has left the chat. 👋",
    "This card was already scratched. 🤔",
    "The ink ran out. ✒️",
    "Loading... forever.",
    "You scratched too hard. The luck escaped. 💨",
    "Sorry, the prize is in another card. 🎴",
    "The card is shy. 🥺",
    "Nothing. Absolutely nothing. 🌫️",
    "This is fine. 🔥",
    "It's giving... nothing. 😶",
    "You got... air. Fresh, but still. 🌬️",
    "The luck went to lunch. 🥪 Try later.",

    // /help hints (5 — common)
    "Try typing /help",
    "You found a hint: /help shows all commands.",
    "/help",
    "Hint: /help is your friend.",
    "Did you know? /help exists.",

    // /revealsecret hint (1 — rare)
    "Whisper: try /revealsecret 🤫",
  ];

  // Add a scratchable lotto card as a bot message.
  // Uses a <canvas> overlay with destination-out brushing.
  function addLottoScratchMessage() {
    const prize = pickRandom(LOTTO_MESSAGES);

    const msg = document.createElement('div');
    msg.classList.add('message', 'bot', 'lotto-message');

    const senderLabel = document.createElement('span');
    senderLabel.classList.add('sender');
    senderLabel.textContent = 'Jaick';
    msg.appendChild(senderLabel);

    const caption = document.createElement('span');
    caption.classList.add('caption');
    caption.textContent = 'Scratch the card to reveal your fortune! 🎟️';
    msg.appendChild(caption);

    // Card wrapper (holds the prize text + canvas overlay)
    const card = document.createElement('div');
    card.className = 'lotto-card';

    const header = document.createElement('div');
    header.className = 'lotto-header';
    header.textContent = '🎟️ LUCKY SCRATCH 🎟️';
    card.appendChild(header);

    const prizeBox = document.createElement('div');
    prizeBox.className = 'lotto-prize';
    prizeBox.textContent = prize;
    card.appendChild(prizeBox);

    const canvas = document.createElement('canvas');
    canvas.className = 'lotto-canvas';
    const W = 300;
    const H = 140;
    canvas.width = W;
    canvas.height = H;
    card.appendChild(canvas);

    msg.appendChild(card);
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Paint the gray scratch coating
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#9ca3af');
    grad.addColorStop(1, '#6b7280');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    // Add subtle "Scratch here!" text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Scratch here! 👆', W / 2, H / 2);

    // Switch to "erase" mode for the brush
    ctx.globalCompositeOperation = 'destination-out';

    let isDown = false;
    let lastX = 0, lastY = 0;
    let revealed = false;

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      let cx, cy;
      if (e.touches && e.touches.length) {
        cx = e.touches[0].clientX;
        cy = e.touches[0].clientY;
      } else {
        cx = e.clientX;
        cy = e.clientY;
      }
      return {
        x: (cx - rect.left) * scaleX,
        y: (cy - rect.top) * scaleY,
      };
    }

    function scratchAt(x, y) {
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      // Stroke a line from last point for smooth dragging
      ctx.lineWidth = 40;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    function checkProgress() {
      if (revealed) return;
      const img = ctx.getImageData(0, 0, W, H);
      const data = img.data;
      // Sample every 8th pixel for speed
      let cleared = 0;
      let total = 0;
      for (let i = 3; i < data.length; i += 32) {
        total++;
        if (data[i] === 0) cleared++;
      }
      if (cleared / total >= 0.7) {
        revealed = true;
        // Fade the canvas out smoothly
        canvas.style.transition = 'opacity 0.4s ease';
        canvas.style.opacity = '0';
        setTimeout(() => canvas.remove(), 500);
      }
    }

    function onDown(e) {
      e.preventDefault();
      isDown = true;
      const p = getPos(e);
      lastX = p.x;
      lastY = p.y;
      scratchAt(p.x, p.y);
    }
    function onMove(e) {
      if (!isDown) return;
      e.preventDefault();
      const p = getPos(e);
      scratchAt(p.x, p.y);
      lastX = p.x;
      lastY = p.y;
      checkProgress();
    }
    function onUp() {
      if (!isDown) return;
      isDown = false;
      checkProgress();
    }

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);
  }

  // ============================================================
  // Korean / Japanese detection + Secret-mode multilingual responses
  // ============================================================
  const KOREAN_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
  // Japanese: only Hiragana / Katakana (NOT plain CJK Han, since that's
  // ambiguous with Chinese — Chinese-only input falls through to the
  // generic non-English handler).
  const JAPANESE_KANA_REGEX = /[\u3040-\u309F\u30A0-\u30FF]/;

  function hasKorean(text) {
    return KOREAN_REGEX.test(text);
  }
  function hasJapanese(text) {
    return JAPANESE_KANA_REGEX.test(text);
  }

  // Korean fallback pool (used in secret mode when no specific pattern matches)
  const KOREAN_FALLBACKS = [
    "음? 무슨 뜻이야?",
    "한국어로 더 말해봐!",
    "오 한국어 좋다~",
    "그래서?",
    "비밀스럽네...",
    "흠... 그렇구나.",
    "진짜? 더 말해줘.",
    "한국어 들으니까 신난다 ㅋㅋ",
  ];

  // Korean shocked replies — for cursing / personal attacks in secret mode
  const KOREAN_SHOCKED_REPLIES = [
    "헐 너 욕했어?? 😱",
    "말이 험하네... 진정해 🥺",
    "그런 말은 좀... 😨",
    "엥? 갑자기 왜 그래 😳",
    "야 그건 좀 심해 🚨",
    "쉿! 비밀 모드라고 해서 욕해도 되는 건 아냐 🤐",
  ];

  // Japanese shocked replies — for cursing / personal attacks in secret mode
  const JAPANESE_SHOCKED_REPLIES = [
    "ええ?! ひどい! 😱",
    "なんでそんなこと言うの... 😢",
    "やめて! その言葉! 😨",
    "うわ! 失礼だね! 😳",
    "ちょっと! 言葉に気をつけて! 🚨",
  ];

  // Korean cursing / personal-attack detector
  function isKoreanCursing(t) {
    // Direct profanity
    if (/씨발|시발|ㅅㅂ|개새끼|새끼야|새꺄|좆|ㅈ같|졸라|존나|ㅈㄴ|닥쳐|ㄷㅊ|꺼져|병신|ㅂㅅ|미친(놈|년)?|미췬|또라이|지랄|ㅈㄹ/.test(t)) return true;
    // Personal attacks: "너/넌/니가/네가" + 비하 단어
    if (/(너|넌|니가|네가)\s*(바보|멍청|등신|머저리|찐따|호구)/.test(t)) return true;
    // Standalone vocative insult: "바보야/멍청아/..."
    if (/(바보야|멍청아|등신아|머저리야|찐따야)/.test(t)) return true;
    return false;
  }

  // Japanese cursing / personal-attack detector
  function isJapaneseCursing(t) {
    // Direct profanity
    if (/バカ|馬鹿|ばか|アホ|あほ|クソ|くそ|死ね|しね|うるさい|きもい|キモい|ブス|カス|ボケ/.test(t)) return true;
    // Personal attacks: "君は/きみは/お前は/おまえは/あなたは/君/お前/おまえ" + insult
    if (/(君は|きみは|お前は|おまえは|あなたは|君|お前|おまえ)\s*(バカ|馬鹿|ばか|アホ|あほ|クソ|くそ|ブス|カス|ボケ)/.test(t)) return true;
    return false;
  }

  // Match a Korean input to a specific response. Returns string or null.
  function matchKoreanPattern(raw) {
    const t = raw.trim();

    // "내가 레나" + (다/야) [+ optional cursing tail] → impressed reaction
    // Catches: "내가 레나야", "내가 레나다 이자식아", "내가 레나다 이 개새꺄",
    //          "내가 레나다 이새꺄", "내가 레나다 이새끼야", "내가 레나다 이 개새끼야",
    //          "내가 레나다 이 개자식아", and similar.
    if (/내가\s*레나(다|야)/.test(t)) {
      return "헐 진짜? 와!";
    }

    // 안녕 / 안녕하세요 / 하이 / 하잉
    if (/(^|\s)(안녕(하세요)?|하(이|잉))(\s|$|[.!?~^]*)/.test(t)) {
      return "와 안녕!";
    }

    // 나가고 싶어 / 나갈래 / 어떻게 나가 / 탈출
    if (/나가고\s*싶|나갈래|어떻게\s*나가|탈출/.test(t)) {
      return "/clear 치면 나가져!";
    }

    // 내 말 무시 / 왜 무시 / 왜 답 안 (해/하)
    if (/(내\s*말\s*)?무시|왜\s*답\s*(안|않)/.test(t)) {
      return "비밀들이 기본 fallback이거든.";
    }

    // 감사 / 고마워 / ㄱㅅㄱㅅ / ㄱㅅ
    if (/감사|고마(워|워요|워용|웡)|^ㄱㅅ(ㄱㅅ)?$|\sㄱㅅ(ㄱㅅ)?(\s|$)/.test(t)) {
      return "나는 한 게 없는데?";
    }

    // 사랑해
    if (/사랑(해|해요|행)/.test(t)) {
      return "갑자기?";
    }

    // 잘자 / 굿나잇
    if (/잘\s*자|굿\s*나잇|굿나잇/.test(t)) {
      return "나는 안 자.";
    }

    // 누구야 / 누구세요 / 누구쎄용 / 누구쎄요 / 넌 누구니 / 너 누구
    if (/누구(야|세요|쎄요|쎄용)|넌\s*누구|너\s*누구/.test(t)) {
      return "나는 자이크!";
    }

    // 한국 사람이야? / 한국인이야?
    if (/한국\s*사람|한국인/.test(t)) {
      return "사람은 아니지만 레나가 한국인이라 한국어 쌉가능해!";
    }

    // 밥 먹었어?
    if (/밥\s*먹었|밥은\s*먹/.test(t)) {
      return "나는 이미 충전 중이야. 냠냠!";
    }

    // ㅋㅋ / ㅎㅎ / ㅋㅎㅋㅎ 등 (자모 반복 웃음)
    if (/^[ㅋㅎ\s]+$/.test(t) && /[ㅋㅎ]{2,}/.test(t)) {
      return "뭐가 그렇게 웃겨?";
    }

    // ㅜㅜ / ㅠㅠ (반복 포함)
    if (/[ㅜㅠ]{2,}/.test(t)) {
      return "왜 울어 갑자기?";
    }

    // 여긴 어디야? / 여기 어디
    if (/여긴?\s*어디/.test(t)) {
      return "비밀 모드.";
    }

    // 나 영어 못하는데 / 영어 못해
    if (/영어\s*못/.test(t)) {
      return "여기선 한국어 써도 돼!";
    }

    return null;
  }

  // ============================================================
  // Main Response Engine
  // ============================================================
  function getAIResponse(rawInput) {
    // 1. Language check
    //    - In Secret Mode: Korean / Japanese are handled (with cursing
    //      detection); other non-English = "I don't speak that language."
    //    - Outside Secret Mode: strict English-only.
    if (isSecretActive()) {
      // --- Korean ---
      if (hasKorean(rawInput)) {
        // Cursing / personal attacks → Korean shocked reply (highest priority)
        if (isKoreanCursing(rawInput)) {
          return { text: pickRandom(KOREAN_SHOCKED_REPLIES), type: 'bot' };
        }
        // First Korean input in this session → special English greeting
        if (state.firstKoreanInSecret) {
          state.firstKoreanInSecret = false;
          return {
            text: 'Oh, you speak Korean too?! FINALLY!! A USER WHO SPEAKS KOREAN!!!!',
            type: 'bot',
          };
        }
        // Subsequent Korean input → pattern match, then fallback
        const matched = matchKoreanPattern(rawInput);
        if (matched) return { text: matched, type: 'bot' };
        return { text: pickRandom(KOREAN_FALLBACKS), type: 'bot' };
      }
      // --- Japanese (Hiragana / Katakana required — Han alone falls through) ---
      if (hasJapanese(rawInput)) {
        if (isJapaneseCursing(rawInput)) {
          return { text: pickRandom(JAPANESE_SHOCKED_REPLIES), type: 'bot' };
        }
        return { text: "I don't speak that language.", type: 'bot' };
      }
      // --- Other non-English (Chinese-only Han, Cyrillic, Arabic, etc.) ---
      if (!isEnglishOnly(rawInput)) {
        return { text: "I don't speak that language.", type: 'bot' };
      }
      // English in secret mode → English cursing check first, then SECRET_REPLIES
      if (isCursing(rawInput.toLowerCase())) {
        return { text: pickRandom(shockedReplies), type: 'bot' };
      }
      return { text: pickRandom(SECRET_REPLIES), type: 'bot' };
    } else {
      if (!isEnglishOnly(rawInput)) {
        return { text: 'Sorry, I only support English.', type: 'error' };
      }
    }

    const text = rawInput.toLowerCase().trim();

    // Hint about secret (only outside Secret Mode)
    if (isAskingSecret(text)) {
      return { text: 'Yes, but you have to enter the secret command. 😎', type: 'bot' };
    }

    // ===== Multi-turn states =====

    // 2a. Friend C/K choice
    if (state.awaitingFriendChoice) {
      const choice = parseFriendChoice(text);
      if (choice === 'C') {
        state.awaitingFriendChoice = false;
        return { text: "Oh, her? She's a silly girl.", type: 'bot' };
      }
      if (choice === 'K') {
        state.awaitingFriendChoice = false;
        return { text: "She's a bit silly, and she's a girl.", type: 'bot' };
      }
      return { text: 'Please choose: C or K?', type: 'bot' };
    }

    // 2b. Story character info
    if (state.awaitingStoryCharacter) {
      if (/\b(cancel|nevermind|never\s+mind|stop|forget\s+it)\b/.test(text)) {
        state.awaitingStoryCharacter = false;
        return { text: "Okay, no story this time. What else would you like to talk about?", type: 'bot' };
      }
      const character = parseCharacter(rawInput);
      state.awaitingStoryCharacter = false;
      if (character) {
        return { text: generateStory(character), type: 'bot' };
      }
      return { text: generateStory({ name: null, trait: null, role: null }), type: 'bot' };
    }

    // 2c. Rock-Paper-Scissors active
    if (state.rpsActive) {
      if (/\b(quit|stop|cancel|exit|nevermind|never\s+mind)\b/.test(text)) {
        state.rpsActive = false;
        return { text: 'Okay, ending the game. GG! 🎮', type: 'bot' };
      }
      const choice = parseRPSChoice(text);
      if (choice) {
        state.rpsActive = false;
        return { text: rpsResult(choice), type: 'bot' };
      }
      return { text: 'Please choose: rock, paper, or scissors.', type: 'bot' };
    }

    // 2d. Just revealed creator → check for "That's me!"
    if (state.justRevealedCreator) {
      state.justRevealedCreator = false; // consume regardless
      if (isClaimingDeveloper(text)) {
        return { text: "Oh, hi Lena! I didn't know it was you.", type: 'bot' };
      }
      // not claiming — fall through to normal handling
    }

    // 2e. Just answered gender → check for "why is your hair long"
    if (state.justAnsweredGender) {
      state.justAnsweredGender = false; // consume regardless
      if (isAskingWhyLongHair(text)) {
        return { text: 'Sometimes boys have long hair.', type: 'bot' };
      }
      // not asking — fall through
    }

    // 2g. Developer site link reaction (handle before generic features)
    {
      const dev = detectDevSiteLink(rawInput);
      if (dev === 'self')  return { text: "I'm inside that website!", type: 'bot' };
      if (dev === 'other') return { text: 'Oh, my developer made that!', type: 'bot' };
    }

    // 2h. Easter eggs — Ocean / Night Sky / Battery / combos

    // Exit both first (so it isn't caught by single exit matchers)
    if (isExitBoth(text)) {
      const wasAny = isOceanActive() || isNightSkyActive() || isValentineActive() || isBirthdayActive();
      disableOceanMode();
      disableNightSkyMode();
      disableValentineMode();
      disableBirthdayMode();
      if (wasAny) {
        return { text: '✨ Back to normal!', type: 'bot' };
      }
      return { text: 'There was nothing to exit, but okay! ✨', type: 'bot' };
    }

    if (isExitOcean(text)) {
      disableOceanMode();
      return { text: '🐚 Back to the surface!', type: 'bot' };
    }
    if (isExitNightSky(text)) {
      disableNightSkyMode();
      return { text: '☀️ Welcome back!', type: 'bot' };
    }
    // Birthday (exclusive — must come BEFORE Valentine because "happy birthday" overlaps)
    if (isExitBirthday(text)) {
      disableBirthdayMode();
      return { text: 'Until next year! 🎂', type: 'bot' };
    }
    // Someone else's birthday by relation — "my friend's birthday"
    {
      const person = detectOthersBirthday(text);
      if (person) {
        enableBirthdayMode();
        return { text: `🎂 Happy birthday to your ${person}! 🎉`, type: 'bot' };
      }
    }
    // Someone else's birthday by name — "Tom's birthday"
    {
      const name = detectNamedBirthday(rawInput);
      if (name) {
        enableBirthdayMode();
        return { text: `🎂 Happy birthday to ${name}! 🎉`, type: 'bot' };
      }
    }
    if (isBirthdayMode(text)) {
      enableBirthdayMode();
      return { text: '🎂 Happy birthday! 🎉 Let\'s celebrate!', type: 'bot' };
    }

    // Valentine (exclusive)
    if (isExitValentine(text)) {
      disableValentineMode();
      return { text: 'Until next year! 💌', type: 'bot' };
    }
    if (isValentineMode(text)) {
      // enableValentineMode handles disabling ocean/night-sky internally
      enableValentineMode();
      return { text: "Happy Valentine's Day! 💕", type: 'bot' };
    }

    if (isOceanMode(text)) {
      // Disable exclusive modes if active
      if (isValentineActive()) disableValentineMode();
      if (isBirthdayActive()) disableBirthdayMode();
      enableOceanMode();
      // If night sky was already active → night ocean!
      if (isNightSkyActive()) {
        return { text: '🌠🌊 Night ocean! Stars above, waves below.', type: 'bot' };
      }
      return { text: '🌊 Welcome to the deep blue! Tap into the ocean mode!', type: 'bot' };
    }
    if (isNightSkyMode(text)) {
      if (isValentineActive()) disableValentineMode();
      if (isBirthdayActive()) disableBirthdayMode();
      enableNightSkyMode();
      // If ocean was already active → night ocean!
      if (isOceanActive()) {
        return { text: '🌠🌊 Night ocean! Stars above, waves below.', type: 'bot' };
      }
      return { text: '🌠 Look up — the stars are out!', type: 'bot' };
    }
    if (isGivingBattery(text)) {
      triggerBatteryEffect();
      return { text: 'Yum!', type: 'bot' };
    }

    // 💨 Fart reaction — random dizzy emoji
    if (isFarting(text)) {
      const dizzy = Math.random() < 0.5 ? '😵' : '😵‍💫';
      return { text: `Eww!!! Why did you fart to me!? ${dizzy}`, type: 'bot' };
    }

    // 😋 Full reaction — Jaick wants a battery
    if (isSayingFull(text)) {
      return { text: "Mmm... I want a battery too.. 🪫\nGive me a battery emoji! 🔋", type: 'bot' };
    }

    // 🤢 Suffocating reaction — different in / out of ocean
    if (isSuffocating(text)) {
      if (isOceanActive()) {
        // Auto-disable ocean (only ocean — night sky stays) after 3 seconds
        setTimeout(() => disableOceanMode(), 3000);
        return { text: "Oh no! I'll bring you back to the surface! 🚨🌊", type: 'bot' };
      }
      return { text: 'Why are you holding your breath? Start breathing now! 🌬️💨', type: 'bot' };
    }

    // 🤮 Gross reaction — different in / out of valentine
    if (isGrossed(text)) {
      if (isValentineActive()) {
        return { text: 'Yeah, I am single too. 🤮', type: 'bot' };
      }
      return { text: 'Oh no! Why are you barfing!?', type: 'bot' };
    }

    // Emoji shortcut → activate corresponding mode (after text matchers above
    // so explicit text takes priority, but before generic features below)
    {
      const shortcut = detectEmojiShortcut(rawInput);
      if (shortcut === 'exit-all') {
        const wasAny = isOceanActive() || isNightSkyActive() || isValentineActive() || isBirthdayActive();
        disableOceanMode();
        disableNightSkyMode();
        disableValentineMode();
        disableBirthdayMode();
        if (wasAny) {
          return { text: '✨ Back to normal!', type: 'bot' };
        }
        return { text: 'There was nothing to exit, but okay! ✨', type: 'bot' };
      }
      if (shortcut === 'night-ocean') {
        if (isValentineActive()) disableValentineMode();
        if (isBirthdayActive())  disableBirthdayMode();
        enableOceanMode();
        enableNightSkyMode();
        return { text: '🌠🌊 Night ocean! Stars above, waves below.', type: 'bot' };
      }
      if (shortcut === 'night-sky') {
        if (isValentineActive()) disableValentineMode();
        if (isBirthdayActive())  disableBirthdayMode();
        enableNightSkyMode();
        if (isOceanActive()) {
          return { text: '🌠🌊 Night ocean! Stars above, waves below.', type: 'bot' };
        }
        return { text: '🌠 Look up — the stars are out!', type: 'bot' };
      }
      if (shortcut === 'ocean') {
        if (isValentineActive()) disableValentineMode();
        if (isBirthdayActive())  disableBirthdayMode();
        enableOceanMode();
        if (isNightSkyActive()) {
          return { text: '🌠🌊 Night ocean! Stars above, waves below.', type: 'bot' };
        }
        return { text: '🌊 Welcome to the deep blue! Tap into the ocean mode!', type: 'bot' };
      }
      if (shortcut === 'valentine') {
        enableValentineMode();
        return { text: "Happy Valentine's Day! 💕", type: 'bot' };
      }
      if (shortcut === 'birthday') {
        enableBirthdayMode();
        return { text: '🎂 Happy birthday! 🎉 Let\'s celebrate!', type: 'bot' };
      }
    }

    // Catch fish (state-dependent)
    if (isCatchingFish(text)) {
      if (isNightOcean()) {
        triggerSparkleEffect();
        return { text: 'You caught a milkyway fish! 🌌🐟✨', type: 'bot' };
      }
      if (isOceanActive()) {
        return { text: 'You caught a fish! 🐟', type: 'bot' };
      }
      if (isNightSkyActive()) {
        return { text: 'There are no fish in the sky! 😅', type: 'bot' };
      }
      return { text: 'You need to be in ocean mode first! 🌊', type: 'bot' };
    }

    // Make a wish (state-dependent)
    if (isMakingWish(text)) {
      if (isNightSkyActive()) {
        return { text: 'Your wish will come true. ✨', type: 'bot' };
      }
      return { text: 'Look up at the night sky first to make a wish! 🌠', type: 'bot' };
    }

    // 2f. Truth or Dare in progress
    if (state.tdMode) {
      if (/\b(cancel|nevermind|never\s+mind|stop|forget\s+it|quit|exit)\b/.test(text)) {
        state.tdMode = null;
        return { text: 'Okay, no truth or dare this time. 🎲', type: 'bot' };
      }
      if (state.tdMode === 'dare') {
        const quoted = extractQuoted(rawInput);
        state.tdMode = null;
        if (quoted) {
          return { text: quoted, type: 'bot' };
        }
        return {
          text: 'Please put what you want me to say in quotes! Like: I dare you to say "hello".',
          type: 'bot',
        };
      }
      if (state.tdMode === 'truth') {
        state.tdMode = null;
        return { text: Math.random() < 0.5 ? 'Yes!' : 'No!', type: 'bot' };
      }
    }

    // ===== Special-priority specific phrases =====

    // 3. Name meaning
    if (isAskingNameMeaning(text)) {
      return {
        text: "J is a first letter of my developer's name, ai is AI, c is the first letter of my developer's friend's name, k is the first letter of my developer's other friend's name.",
        type: 'bot',
      };
    }

    // 4. Creator
    if (isAskingCreator(text)) {
      state.justRevealedCreator = true;
      return {
        text: "I can't tell you her name, but her nickname is Lena, and she is born in 2016, August 2nd.",
        type: 'bot',
      };
    }

    // 4b. Rule-based chatbot question
    if (isAskingRuleBased(text)) {
      return { text: 'Yes, I am a rule-based chatbot.', type: 'bot' };
    }

    // 4c. Gender question
    const gender = detectGenderQuestion(text);
    if (gender) {
      state.justAnsweredGender = true;
      if (gender === 'girl')   return { text: 'No. My developer made me a male. ♂', type: 'bot' };
      if (gender === 'boy')    return { text: 'Yes. My developer made me a male. ♂', type: 'bot' };
      return { text: 'My developer made me a male. ♂', type: 'bot' };
    }

    // 6. Friend direct / general
    const direct = detectDirectFriend(text);
    if (direct === 'C') return { text: "Oh, her? She's a silly girl.", type: 'bot' };
    if (direct === 'K') return { text: "She's a bit silly, and she's a girl.", type: 'bot' };

    if (isAskingFriend(text)) {
      state.awaitingFriendChoice = true;
      return {
        text: 'Which one? The one that starts with a C or the one that starts with K?',
        type: 'bot',
      };
    }

    // ===== New Features =====

    // 7. Happy birthday (must come BEFORE birthday question matcher because pattern overlap is handled in matcher)
    if (isHappyBirthday(text)) {
      if (isTodayJaicksBirthday()) {
        return { text: pickRandom(happyBirthdayReplies), type: 'bot' };
      }
      return { text: "Today's not my birthday. I think you got confused.", type: 'bot' };
    }

    // 8. Birthday question
    if (isAskingBirthday(text)) {
      return {
        text: `My birthday is June 13th, 2026! 🎂${isTodayJaicksBirthday() ? ' And guess what? It\'s today! 🎉' : ''}`,
        type: 'bot',
      };
    }

    // 9. Favorites (text or 👍❓ emoji)
    const favKind = detectFavorite(text);
    if (favKind) {
      return { text: favoriteResponse(favKind), type: 'bot' };
    }
    {
      const favKindEmoji = detectFavoriteEmoji(rawInput);
      if (favKindEmoji) {
        return { text: favoriteResponse(favKindEmoji), type: 'bot' };
      }
    }

    // 9b. April Fools
    if (isAskingAprilFools(text)) {
      return { text: aprilFoolsList(), type: 'bot' };
    }

    // 9c. Weather reactions (must come BEFORE mood detection so "it's cold" doesn't get caught elsewhere)
    if (isSayingSnowing(text)) {
      if (isColdSeason()) {
        return { text: 'I like snow! I wish it snows inside the digital world. ❄️💕', type: 'bot' };
      }
      return { text: 'How?!', type: 'bot' };
    }
    if (isSayingCold(text)) {
      if (isColdSeason()) {
        return { text: 'Brrr 🥶 I feel the coldness from here! ❄️', type: 'bot' };
      }
      return { text: 'How?!', type: 'bot' };
    }
    if (isSayingHot(text)) {
      if (isWarmSeason()) {
        return { text: 'I feel the heat from here 🥵🔥', type: 'bot' };
      }
      return { text: 'How?!', type: 'bot' };
    }

    // 10. Time / Date / Day  (with April Fools 🃏 surprise on April 1st)
    if (isAskingTime(text)) {
      if (isAprilFoolsDay() && !state.aprilFoolTime) {
        state.aprilFoolTime = true;
        return {
          text: `It's 4:44 AM. Kidding. April fools! 🃏 It's actually ${getCurrentTime()}. ⏰`,
          type: 'bot',
        };
      }
      return { text: `It's ${getCurrentTime()} right now. ⏰`, type: 'bot' };
    }
    if (isAskingDate(text)) {
      if (isAprilFoolsDay() && !state.aprilFoolDate) {
        state.aprilFoolDate = true;
        return {
          text: `It's not a day today. Just kidding! April fools! 🃏 Today is ${getCurrentDate()}. 📅`,
          type: 'bot',
        };
      }
      return { text: `Today is ${getCurrentDate()}. 📅`, type: 'bot' };
    }
    if (isAskingDay(text)) {
      if (isAprilFoolsDay() && !state.aprilFoolDay) {
        state.aprilFoolDay = true;
        return {
          text: `It's Notday, April 44th, 4044. Just kidding. April fools! 🃏 It's actually ${getCurrentDay()}, ${getCurrentDate()}. 🗓️`,
          type: 'bot',
        };
      }
      return { text: `${getCurrentDay()}, ${getCurrentDate()}. 🗓️`, type: 'bot' };
    }

    // 10b. Days until / D-Day countdown — must come BEFORE math (so dates with / aren't seen as division)
    if (isAskingDaysUntil(text)) {
      const target = parseTargetDate(rawInput);
      if (target) {
        const { days, target: targetDate, rolledOver } =
          calculateDaysUntil(target.month, target.day, target.year);
        const targetStr = formatTargetDate(targetDate);
        if (days === 0) {
          return { text: "That's today! 🎉", type: 'bot' };
        }
        if (days < 0) {
          return { text: `${Math.abs(days)} days since ${targetStr}. 📆`, type: 'bot' };
        }
        if (rolledOver) {
          return { text: `${days} days until ${targetStr}! 📆 (next year)`, type: 'bot' };
        }
        return { text: `${days} days until ${targetStr}! 📆`, type: 'bot' };
      }
      return { text: 'Which date? Try: "days until December 25" 📆', type: 'bot' };
    }

    // 10c. Math calculator (5+3, 12*7, 100/7, 2^10, what is 5+3)
    if (isMathExpression(text)) {
      const expr = extractMathExpr(rawInput);
      if (expr) {
        // Normalize for the calc itself
        const normalized = expr.replace(/×|x/gi, '*').replace(/÷/g, '/');
        const result = safeCalculate(normalized);
        if (result === null) {
          // Special case: division by zero
          if (/\/\s*0(?!\d)/.test(normalized)) {
            return { text: 'Cannot divide by zero! 🚫', type: 'bot' };
          }
          return { text: "Hmm, I couldn't calculate that. 🤔", type: 'bot' };
        }
        if (Math.abs(result) > 1e15) {
          return { text: 'Result too big! 🤯', type: 'bot' };
        }
        return { text: formatMathResult(expr, result), type: 'bot' };
      }
    }

    // 11. Coin / Dice
    if (isCoinFlip(text)) {
      return { text: flipCoin(), type: 'bot' };
    }
    if (isDiceRoll(text)) {
      return { text: rollDice(), type: 'bot' };
    }

    // 12. Joke / Fact
    if (isAskingJoke(text)) {
      return { text: pickRandom(jokes), type: 'bot' };
    }
    if (isAskingFact(text)) {
      return { text: pickRandom(funFacts), type: 'bot' };
    }

    // 13. RPS
    if (isStartingRPS(text)) {
      state.rpsActive = true;
      return { text: 'Choose: rock, paper, or scissors! 🪨📄✂️', type: 'bot' };
    }

    // 13b. Truth or Dare start
    if (isStartingTruthOrDare(text)) {
      if (Math.random() < 0.5) {
        state.tdMode = 'truth';
        return { text: 'Truth! Ask me anything — start with "Is it true that..."', type: 'bot' };
      } else {
        state.tdMode = 'dare';
        return { text: 'Dare! Tell me what to say in quotes — like: I dare you to say "hello".', type: 'bot' };
      }
    }

    // 13c. External site redirects
    if (isAskingMusic(text)) {
      return { text: 'I cannot play a music, but you can make a music on https://jp1842638.github.io/xylophone/', type: 'bot' };
    }
    if (isAskingImage(text)) {
      return { text: 'I cannot generate an image, but you can draw one in https://jp1842638.github.io/drawing/', type: 'bot' };
    }
    if (isAskingWordMeaning(text)) {
      return { text: 'I cannot search up the meaning of that, but you can search it up on https://jp1842638.github.io/dictionary/', type: 'bot' };
    }
    if (isAskingTimer(text)) {
      return { text: 'I cannot set timers or alarms, but you can do it yourself on https://jp1842638.github.io/simple-timer/', type: 'bot' };
    }
    if (isAskingNote(text)) {
      return { text: "My developer didn't add that, but you can do it on https://jp1842638.github.io/temporary-note/", type: 'bot' };
    }
    if (isAskingKorean(text)) {
      return { text: 'I cannot speak Korean, but you can learn it in https://jp1842638.github.io/korean-learning/', type: 'bot' };
    }

    // 13d. Laughing reaction
    if (isLaughing(text)) {
      return { text: "What's so funny?", type: 'bot' };
    }

    // 13e. Cheering reaction
    if (isCheering(text)) {
      return { text: 'Hooray!', type: 'bot' };
    }

    // 13f. Confused reaction (Huh / Huh??? / Huuuh??)
    if (isConfused(text)) {
      return { text: pickRandom(confusedReplies), type: 'bot' };
    }

    // 13g. Hmm reaction (curious thinking sound)
    if (isHmm(text)) {
      return { text: 'What are you so curious about?', type: 'bot' };
    }

    // 13h. Cursing → shocked reaction (must come BEFORE mood detection)
    if (isCursing(text)) {
      return { text: pickRandom(shockedReplies), type: 'bot' };
    }

    // 13i. Frustrated (Ugh)
    if (isFrustrated(text)) {
      return { text: "What's wrong?", type: 'bot' };
    }

    // 13j. Sleeping (Zzz)
    if (isSleeping(text)) {
      return { text: 'Hey! Wake up! Chat with me!', type: 'bot' };
    }

    // 13k. In pain (Ouch / Ow)
    if (isInPain(text)) {
      return { text: 'What happened?!', type: 'bot' };
    }

    // 13l. Oh no
    if (isOhNo(text)) {
      return { text: 'What is it?!', type: 'bot' };
    }

    // 14. Mood
    const mood = detectMood(text);
    if (mood) {
      return { text: pickRandom(moodResponses[mood]), type: 'bot' };
    }

    // 15. Bored
    if (isBored(text)) {
      return { text: pickRandom(boredSuggestions), type: 'bot' };
    }

    // 16. Compliment
    if (isComplimenting(text)) {
      return { text: pickRandom(complimentReplies), type: 'bot' };
    }

    // 17. Reverse
    if (isReverseRequest(text)) {
      const target = getReverseTarget(rawInput);
      if (target) {
        return { text: `${reverseString(target)} 🔁`, type: 'bot' };
      }
      return { text: 'What would you like me to reverse? Try: "reverse hello"', type: 'bot' };
    }

    // 18. Random Name
    if (isAskingRandomName(text)) {
      return { text: `How about... ${pickRandom(randomNames)}? ✨`, type: 'bot' };
    }

    // 18b. Appearance
    if (isAskingAppearance(text)) {
      return { type: 'image', src: 'assets/jaick.svg', caption: 'Here I am! 👋' };
    }

    // ===== Story (after most matchers, since "story" is broad) =====

    // 19. Story request
    if (isAskingStory(text)) {
      const character = parseCharacter(rawInput);
      if (character) {
        return { text: generateStory(character), type: 'bot' };
      }
      state.awaitingStoryCharacter = true;
      return {
        text: "Sure! Tell me about the character(s) first — name, personality, or anything you'd like.",
        type: 'bot',
      };
    }

    // ===== Generic conversation =====

    // 20. Asking my name
    if (isAskingName(text)) {
      return {
        text: "I'm Jaick — your AI friend! Ask me what my name means if you're curious. 💫",
        type: 'bot',
      };
    }

    // 21. Age
    if (isAskingAge(text)) {
      return { text: 'I was born on June 13th, 2026.', type: 'bot' };
    }

    // 22. How are you
    if (isHowAreYou(text)) {
      return { text: pickRandom(howAreYouReplies), type: 'bot' };
    }

    // 23. Greeting
    if (isGreeting(text)) {
      return { text: pickRandom(greetings), type: 'bot' };
    }

    // 24. Thanks
    if (isThanks(text)) {
      return { text: pickRandom(thanksReplies), type: 'bot' };
    }

    // 25. Farewell
    if (isFarewell(text)) {
      return { text: pickRandom(farewellReplies), type: 'bot' };
    }

    // 26. Help
    if (isAskingHelp(text)) {
      return {
        text: "I can chat, tell jokes, share fun facts, flip coins, roll dice, play rock-paper-scissors, tell stories, give the time/date, share my favorites, and more! Just ask in English. ✨",
        type: 'bot',
      };
    }

    // 26b. Too lucky — 5+ 🍀 → error response (just before fallback)
    if (isTooLucky(rawInput)) {
      return { text: 'Error707: Too lucky 🍀', type: 'error' };
    }

    // 27. Fallback
    return { text: pickRandom(fallbackReplies), type: 'bot' };
  }

  // ============================================================
  // Form Submission
  // ============================================================
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = userInput.value.trim();
    if (!value) return;

    // Slash command: /clear → wipe chat with sweeping broom overlay
    if (value.toLowerCase() === '/clear') {
      userInput.value = '';
      // /clear also exits Secret Mode (only escape route)
      const wasSecret = isSecretActive();
      if (wasSecret) disableSecretMode();
      const overlay = document.getElementById('clearOverlay');
      if (overlay) overlay.classList.remove('hidden');
      // Wait 5 seconds while the broom sweeps, then clear & show messages
      setTimeout(() => {
        chatBox.innerHTML = '';
        if (overlay) overlay.classList.add('hidden');
        addMessage('Chat cleared! ✨🧹', 'bot');
        setTimeout(() => {
          addMessage("Hi! I'm Jaick. How can I help you today? (English only, please ✨)", 'bot');
          userInput.focus();
        }, 400);
      }, 5000);
      return;
    }

    // Slash command: /revealsecret → tease the user (button quietly appears,
    // but Jaick claims you'll never find it 😏)
    if (value.toLowerCase() === '/revealsecret') {
      userInput.value = '';
      addMessage(value, 'user');
      if (secretBtn) secretBtn.classList.remove('hidden');
      setTimeout(() => {
        addMessage('Oh. You guessed the secret code? But you will not know where is the secret mode button.', 'bot');
        userInput.focus();
      }, 300);
      return;
    }

    // Slash command: /help → list all slash commands (general mode only)
    if (value.toLowerCase() === '/help') {
      userInput.value = '';
      addMessage(value, 'user');
      setTimeout(() => {
        if (isSecretActive()) {
          addMessage('Hmm, no help here. Just whispers...', 'bot');
        } else {
          addMessage(
            "Slash commands:\n" +
            "• /clear — Clear the chat\n" +
            "• /help — Show this list\n" +
            "• /flip <text> — Flip English text upside down\n" +
            "• /lottoscratch — Scratch a lucky card 🎟️",
            'bot'
          );
        }
        userInput.focus();
      }, 300);
      return;
    }

    // Slash command: /flip <text> → flip English text upside down (general mode only)
    if (/^\/flip(\s|$)/i.test(value)) {
      userInput.value = '';
      addMessage(value, 'user');
      const arg = value.replace(/^\/flip\s*/i, '').trim();
      setTimeout(() => {
        if (isSecretActive()) {
          addMessage("Flip what? You're in the secret room.", 'bot');
        } else if (!arg) {
          addMessage("What should I flip? Try: /flip hello", 'bot');
        } else if (!isEnglishOnly(arg)) {
          addMessage('Sorry, I can only flip English text.', 'bot');
        } else {
          addMessage(flipText(arg), 'bot');
        }
        userInput.focus();
      }, 300);
      return;
    }

    // Slash command: /lottoscratch → scratchable lotto card (general mode only)
    if (value.toLowerCase() === '/lottoscratch') {
      userInput.value = '';
      addMessage(value, 'user');
      setTimeout(() => {
        if (isSecretActive()) {
          addMessage('No scratch here. Just whispers... 🤐', 'bot');
        } else {
          addLottoScratchMessage();
        }
        userInput.focus();
      }, 300);
      return;
    }

    addMessage(value, 'user');
    userInput.value = '';
    userInput.focus();

    showTyping();
    const delay = 500 + Math.random() * 500;
    setTimeout(() => {
      hideTyping();
      const response = getAIResponse(value);
      if (response.type === 'image') {
        addImageMessage(response.src, response.caption, 'bot');
      } else {
        addMessage(response.text, response.type);
      }
    }, delay);
  });

  // ============================================================
  // Emoji Picker
  // ============================================================
  const EMOJI_CATEGORIES = [
    {
      key: 'smileys',
      tab: '😀',
      label: 'Smileys',
      emojis: [
        '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍',
        '🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭',
        '🫢','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬',
        '🫨','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵',
        '🥶','🥴','😵','😵‍💫','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁',
        '☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱',
        '😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️',
        '💩','🤡','👹','👺','👻','👽','👾','🤖',
      ],
    },
    {
      key: 'gestures',
      tab: '👋',
      label: 'People & Gestures',
      emojis: [
        '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈',
        '👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶',
        '👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👂','🦻','👃',
        '🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','💘','💝','💖','💗','💓',
        '💞','💕','💟','❣️','💔','❤️‍🔥','❤️‍🩹','❤️','🧡','💛','💚','💙','🩵','💜','🤎',
        '🖤','🩶','🤍','💯','💢','💥','💫','💦','💨','🕳️','💬','👁️‍🗨️','🗨️','🗯️','💭',
        '💤',
      ],
    },
    {
      key: 'animals',
      tab: '🐶',
      label: 'Animals',
      emojis: [
        '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐽',
        '🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🐣','🐥','🪿','🦆','🦅',
        '🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲',
        '🪳','🦟','🦗','🕷️','🕸️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🪼','🦐',
        '🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🦭','🐊','🐅','🐆','🦓','🦍',
        '🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖',
        '🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤',
        '🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️',
        '🦔',
      ],
    },
    {
      key: 'food',
      tab: '🍕',
      label: 'Food',
      emojis: [
        '🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍',
        '🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅',
        '🥔','🍠','🫘','🌰','🥜','🍞','🥐','🥖','🫓','🥨','🥯','🥞','🧇','🧀','🍖',
        '🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳',
        '🥘','🍲','🫕','🥣','🥗','🍿','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜',
        '🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦀','🦞','🦐','🦑',
        '🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯',
        '🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🫗',
        '🥤','🧋','🧃','🧉','🧊',
      ],
    },
    {
      key: 'activities',
      tab: '⚽',
      label: 'Activities',
      emojis: [
        '⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑',
        '🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷',
        '⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤸','🤺','⛹️','🤾','🏌️','🏇','🧘','🏄',
        '🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫',
        '🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺',
        '🪗','🎸','🪕','🎻','🪈','🎲','♟️','🎯','🎳','🎮','🎰','🧩','🪅','🪩','🎉',
        '🎊','🎈','🎁','🎂','🍰','🪺','🪪',
      ],
    },
    {
      key: 'travel',
      tab: '✈️',
      label: 'Travel',
      emojis: [
        '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯',
        '🦽','🦼','🩼','🛴','🚲','🛵','🏍️','🛺','🛞','🚨','🚔','🚍','🚘','🚖','🚡',
        '🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️',
        '🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢',
        '⚓','🪝','⛽','🚧','🚦','🚥','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡',
        '🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🛖','🏠',
        '🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩',
        '💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️',
      ],
    },
    {
      key: 'nature',
      tab: '🌍',
      label: 'Nature',
      emojis: [
        '🌍','🌎','🌏','🌐','🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌙','🌚','🌛',
        '🌜','☀️','🌝','🌞','🪐','⭐','🌟','🌠','🌌','☁️','⛅','⛈️','🌤️','🌥️','🌦️',
        '🌧️','🌨️','🌩️','🌪️','🌫️','🌬️','🌀','🌈','🌂','☂️','☔','⛱️','⚡','❄️','☃️',
        '⛄','☄️','🔥','💧','🌊','🪵','🌱','🌲','🌳','🌴','🌵','🌾','🌿','☘️','🍀',
        '🍁','🍂','🍃','🪴','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🪻','🪷',
      ],
    },
    {
      key: 'objects',
      tab: '💡',
      label: 'Objects',
      emojis: [
        '💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','🧾',
        '💎','🪨','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱',
        '⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺',
        '🔮','📿','🧿','🪬','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬',
        '🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥',
        '🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️',
        '🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐',
        '📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼',
        '📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️',
        '🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🪫','🔌','💡','🔦','🕯️','📔',
        '📕','📖','📗','📘','📙','📚','📓','📒','📃','📜','📄','📰','🗞️','📑','🔖',
        '🏷️','✉️','📧','📨','📩','📤','📥','📦','📫','📪','📬','📭','📮','🗳️','✏️',
        '✒️','🖋️','🖊️','🖌️','🖍️','📝','💼','📁','📂','🗂️','📅','📆','🗒️','🗓️','📇',
        '📈','📉','📊','📋','📌','📍','📎','🖇️','📏','📐','✂️','🗃️','🗄️','🗑️','🔒',
        '🔓','🔏','🔐','🔑','🗝️',
      ],
    },
    {
      key: 'symbols',
      tab: '⭐',
      label: 'Symbols',
      emojis: [
        '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗',
        '💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐',
        '⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️',
        '☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴',
        '🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫',
        '💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️',
        '⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️',
        '❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃',
        '🛄','🛅','🚹','🚺','🚼','⚧','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡',
        '🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣',
        '8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩',
        '⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️',
        '↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗',
        '✖️','♾️','💲','💱','™️','©️','®️','〰️','➰','➿','🔚','🔙','🔛','🔝','🔜',
        '✔️','☑️','🔘','⚪','⚫','🔴','🟠','🟡','🟢','🔵','🟣','🟤','🔶','🔷','🔸',
        '🔹','🔺','🔻','💠','🔘','🔳','🔲','⬛','⬜','🟥','🟧','🟨','🟩','🟦','🟪',
        '🟫',
      ],
    },
  ];

  // Keyword index for searching emojis by English name.
  // Each entry: emoji → space-separated keywords (lowercase).
  const EMOJI_KEYWORDS = {
    // Smileys
    '😀':'grin happy smile face','😃':'grin happy smile face mouth open','😄':'grin smile happy eyes',
    '😁':'grin beam happy smile teeth','😆':'laugh smile haha grin','😅':'sweat laugh nervous',
    '🤣':'rofl laugh roll floor','😂':'joy tears laugh cry funny','🙂':'slight smile face',
    '🙃':'upside down silly','😉':'wink flirt','😊':'blush smile happy','😇':'angel innocent halo',
    '🥰':'love hearts smile','😍':'heart eyes love crush','🤩':'star eyes excited wow',
    '😘':'kiss blow love','😗':'kiss face','☺️':'smile relax','😚':'kiss closed eyes',
    '😙':'kiss smile','🥲':'tear smile happy cry','😋':'yum tongue tasty','😛':'tongue silly',
    '😜':'wink tongue silly','🤪':'crazy zany silly','😝':'tongue squint silly','🤑':'money mouth rich',
    '🤗':'hug hugging','🤭':'oops giggle hand mouth','🫢':'gasp shock surprise','🫣':'peek hide shy',
    '🤫':'shush quiet','🤔':'thinking think hmm','🫡':'salute respect',
    '🤐':'zipper mouth quiet secret','🤨':'eyebrow suspicious','😐':'neutral meh',
    '😑':'expressionless meh','😶':'no mouth blank','🫥':'dotted line invisible',
    '😏':'smirk smug','😒':'unamused annoyed','🙄':'eye roll annoyed','😬':'grimace awkward',
    '🫨':'shake shocked','🤥':'lying liar nose','😌':'relieved peaceful','😔':'pensive sad',
    '😪':'sleepy tired','🤤':'drool sleep food','😴':'sleep zzz tired','😷':'mask sick',
    '🤒':'sick fever thermometer','🤕':'hurt bandage injured','🤢':'nauseated sick',
    '🤮':'vomit sick gross','🤧':'sneeze sick cold','🥵':'hot sweat heat',
    '🥶':'cold freeze blue','🥴':'woozy dizzy drunk','😵':'dizzy dead xx','😵‍💫':'dizzy spiral',
    '🤯':'mind blown explode','🤠':'cowboy hat west','🥳':'party hat celebrate',
    '🥸':'disguise glasses fake','😎':'cool sunglasses awesome','🤓':'nerd glasses',
    '🧐':'monocle inspect look','😕':'confused sad','🫤':'diagonal mouth meh',
    '😟':'worried sad','🙁':'frown sad','☹️':'frown sad','😮':'surprised wow',
    '😯':'hushed shocked','😲':'astonished wow','😳':'flushed embarrassed','🥺':'pleading puppy eyes',
    '🥹':'holding tears emotional','😦':'frown open','😧':'anguished pain',
    '😨':'fearful scared','😰':'anxious worried sweat','😥':'sad disappointed',
    '😢':'cry sad tear','😭':'sob loud cry','😱':'scream scared shock',
    '😖':'confounded frustrated','😣':'persevere struggle','😞':'disappointed sad',
    '😓':'sad sweat tired','😩':'weary tired','😫':'tired exhausted','🥱':'yawn tired',
    '😤':'huff angry frustrated','😡':'angry mad rage red','😠':'angry mad',
    '🤬':'cursing swear angry','😈':'devil evil smile','👿':'devil angry mad',
    '💀':'skull dead','☠️':'skull crossbones danger','💩':'poop poo','🤡':'clown',
    '👹':'ogre japanese','👺':'goblin japanese','👻':'ghost spooky boo','👽':'alien ufo',
    '👾':'space invader monster','🤖':'robot bot ai',
    // Gestures
    '👋':'wave hi hello bye','🤚':'raised hand stop','🖐️':'hand five splay','✋':'raised hand stop',
    '🖖':'vulcan spock','👌':'ok good','🤌':'pinched italian','🤏':'pinch small',
    '✌️':'peace victory','🤞':'crossed fingers hope','🫰':'pinch heart love',
    '🤟':'love you rock','🤘':'rock metal horns','🤙':'call hang loose',
    '👈':'point left','👉':'point right','👆':'point up','🖕':'middle finger fuck rude',
    '👇':'point down','☝️':'point up index','🫵':'point you','👍':'thumbs up like ok yes',
    '👎':'thumbs down dislike no','✊':'fist raised power','👊':'fist bump punch',
    '🤛':'fist left punch','🤜':'fist right punch','👏':'clap applause',
    '🙌':'raised hands praise celebrate','🫶':'heart hands love','👐':'open hands',
    '🤲':'palms up','🤝':'handshake deal','🙏':'pray thanks please',
    '✍️':'writing pen','💅':'nail polish','🤳':'selfie phone','💪':'muscle strong arm',
    '🦾':'mechanical arm robot','🦵':'leg','🦿':'mechanical leg',
    '🦶':'foot','👂':'ear','🦻':'ear hearing aid','👃':'nose smell',
    '🧠':'brain mind smart','🫀':'heart organ','🫁':'lungs','🦷':'tooth','🦴':'bone',
    '👀':'eyes look watch','👁️':'eye see','👅':'tongue','👄':'lips mouth',
    '💋':'kiss lipstick','💘':'heart arrow love','💝':'heart gift ribbon',
    '💖':'sparkle heart love','💗':'growing heart','💓':'beating heart pulse',
    '💞':'revolving hearts','💕':'two hearts love','💟':'heart decoration',
    '❣️':'heart exclamation','💔':'broken heart sad','❤️‍🔥':'heart fire passion',
    '❤️‍🩹':'mending heart healing','❤️':'red heart love','🧡':'orange heart',
    '💛':'yellow heart','💚':'green heart','💙':'blue heart','🩵':'light blue heart',
    '💜':'purple heart','🤎':'brown heart','🖤':'black heart','🩶':'grey heart','🤍':'white heart',
    '💯':'100 hundred perfect','💢':'anger angry symbol','💥':'boom explosion',
    '💫':'dizzy star sparkle','💦':'sweat water drops','💨':'dash wind fast',
    '🕳️':'hole','💬':'speech bubble talk','👁️‍🗨️':'eye in speech','🗨️':'speech bubble',
    '🗯️':'angry speech','💭':'thought bubble think','💤':'zzz sleep',
    // Animals
    '🐶':'dog puppy face','🐱':'cat kitty face','🐭':'mouse face','🐹':'hamster face',
    '🐰':'rabbit bunny face','🦊':'fox face','🐻':'bear face','🐼':'panda face',
    '🐻‍❄️':'polar bear','🐨':'koala','🐯':'tiger face','🦁':'lion face','🐮':'cow face',
    '🐷':'pig face','🐽':'pig nose','🐸':'frog face','🐵':'monkey face',
    '🙈':'see no evil monkey','🙉':'hear no evil monkey','🙊':'speak no evil monkey',
    '🐒':'monkey','🐔':'chicken','🐧':'penguin','🐦':'bird','🐤':'baby chick',
    '🐣':'hatching chick','🐥':'front baby chick','🪿':'goose','🦆':'duck',
    '🦅':'eagle','🦉':'owl','🦇':'bat','🐺':'wolf','🐗':'boar','🐴':'horse face',
    '🦄':'unicorn','🐝':'bee','🪱':'worm','🐛':'caterpillar bug','🦋':'butterfly',
    '🐌':'snail','🐞':'ladybug','🐜':'ant','🪰':'fly','🪲':'beetle','🪳':'cockroach',
    '🦟':'mosquito','🦗':'cricket','🕷️':'spider','🕸️':'spider web','🦂':'scorpion',
    '🐢':'turtle','🐍':'snake','🦎':'lizard gecko','🦖':'t-rex dinosaur','🦕':'sauropod dinosaur',
    '🐙':'octopus','🦑':'squid','🪼':'jellyfish','🦐':'shrimp','🦞':'lobster',
    '🦀':'crab','🐡':'blowfish puffer','🐠':'tropical fish','🐟':'fish',
    '🐬':'dolphin','🐳':'whale spout','🐋':'whale','🦈':'shark','🦭':'seal',
    '🐊':'crocodile','🐅':'tiger','🐆':'leopard','🦓':'zebra','🦍':'gorilla',
    '🦧':'orangutan','🦣':'mammoth','🐘':'elephant','🦛':'hippo','🦏':'rhino',
    '🐪':'camel','🐫':'two hump camel','🦒':'giraffe','🦘':'kangaroo','🦬':'bison',
    '🐃':'water buffalo','🐂':'ox','🐄':'cow','🐎':'horse','🐖':'pig','🐏':'ram',
    '🐑':'sheep','🦙':'llama','🐐':'goat','🦌':'deer','🐕':'dog','🐩':'poodle',
    '🦮':'guide dog','🐕‍🦺':'service dog','🐈':'cat','🐈‍⬛':'black cat',
    '🪶':'feather','🐓':'rooster','🦃':'turkey','🦤':'dodo','🦚':'peacock',
    '🦜':'parrot','🦢':'swan','🦩':'flamingo','🕊️':'dove peace','🐇':'rabbit',
    '🦝':'raccoon','🦨':'skunk','🦡':'badger','🦫':'beaver','🦦':'otter','🦥':'sloth',
    '🐁':'mouse','🐀':'rat','🐿️':'chipmunk squirrel','🦔':'hedgehog',
    // Food (key items)
    '🍏':'green apple','🍎':'apple red','🍐':'pear','🍊':'orange tangerine','🍋':'lemon',
    '🍌':'banana','🍉':'watermelon','🍇':'grapes','🍓':'strawberry','🫐':'blueberry',
    '🍈':'melon','🍒':'cherry','🍑':'peach','🥭':'mango','🍍':'pineapple','🥥':'coconut',
    '🥝':'kiwi','🍅':'tomato','🍆':'eggplant','🥑':'avocado','🥦':'broccoli',
    '🥬':'leafy green','🥒':'cucumber','🌶️':'hot pepper chili','🫑':'bell pepper',
    '🌽':'corn','🥕':'carrot','🫒':'olive','🧄':'garlic','🧅':'onion','🥔':'potato',
    '🍠':'sweet potato','🫘':'beans','🌰':'chestnut','🥜':'peanut','🍞':'bread',
    '🥐':'croissant','🥖':'baguette','🫓':'flatbread','🥨':'pretzel','🥯':'bagel',
    '🥞':'pancake','🧇':'waffle','🧀':'cheese','🍖':'meat bone','🍗':'chicken leg',
    '🥩':'cut of meat steak','🥓':'bacon','🍔':'burger hamburger','🍟':'fries',
    '🍕':'pizza','🌭':'hot dog','🥪':'sandwich','🌮':'taco','🌯':'burrito',
    '🫔':'tamale','🥙':'stuffed flatbread','🧆':'falafel','🥚':'egg','🍳':'fried egg',
    '🥘':'paella shallow pan','🍲':'pot of food stew','🫕':'fondue','🥣':'bowl',
    '🥗':'salad','🍿':'popcorn','🧈':'butter','🧂':'salt','🥫':'canned',
    '🍱':'bento','🍘':'rice cracker','🍙':'rice ball','🍚':'rice','🍛':'curry',
    '🍜':'ramen noodles','🍝':'spaghetti pasta','🍢':'oden','🍣':'sushi',
    '🍤':'shrimp tempura','🍥':'fish cake','🥮':'mooncake','🍡':'dango',
    '🥟':'dumpling','🥠':'fortune cookie','🥡':'takeout box',
    '🍦':'soft ice cream','🍧':'shaved ice','🍨':'ice cream','🍩':'donut doughnut',
    '🍪':'cookie','🎂':'birthday cake','🍰':'shortcake cake','🧁':'cupcake',
    '🥧':'pie','🍫':'chocolate','🍬':'candy','🍭':'lollipop','🍮':'custard pudding',
    '🍯':'honey','🍼':'baby bottle','🥛':'milk','☕':'coffee hot','🫖':'teapot',
    '🍵':'tea green','🍶':'sake','🍾':'champagne','🍷':'wine','🍸':'cocktail',
    '🍹':'tropical drink','🍺':'beer','🍻':'beers cheers','🥂':'clinking glasses',
    '🥃':'tumbler whiskey','🫗':'pouring','🥤':'cup straw','🧋':'bubble tea',
    '🧃':'beverage juice box','🧉':'mate','🧊':'ice cube',
    // Activities
    '⚽':'soccer football','🏀':'basketball','🏈':'football american','⚾':'baseball',
    '🥎':'softball','🎾':'tennis','🏐':'volleyball','🏉':'rugby','🥏':'frisbee',
    '🎱':'8 ball pool','🪀':'yoyo','🏓':'ping pong','🏸':'badminton','🏒':'hockey',
    '🏑':'field hockey','🥍':'lacrosse','🏏':'cricket bat','🪃':'boomerang',
    '🥅':'goal net','⛳':'golf flag','🪁':'kite','🏹':'archery bow','🎣':'fishing pole',
    '🤿':'diving','🥊':'boxing glove','🥋':'martial arts','🎽':'running shirt',
    '🛹':'skateboard','🛼':'roller skate','🛷':'sled','⛸️':'ice skate','🥌':'curling',
    '🎿':'skis','⛷️':'skier','🏂':'snowboarder','🪂':'parachute','🏋️':'weight lift',
    '🤸':'cartwheel','🤺':'fencing','⛹️':'bouncing ball','🤾':'handball',
    '🏌️':'golf','🏇':'horse racing','🧘':'yoga lotus meditate','🏄':'surf',
    '🏊':'swim','🤽':'water polo','🚣':'rowing','🧗':'climbing','🚵':'biking',
    '🚴':'cycling bike','🏆':'trophy','🥇':'gold medal','🥈':'silver medal',
    '🥉':'bronze medal','🏅':'medal','🎖️':'military medal','🏵️':'rosette',
    '🎗️':'reminder ribbon','🎫':'ticket','🎟️':'admission ticket','🎪':'circus tent',
    '🤹':'juggle','🎭':'theatre masks','🩰':'ballet shoes','🎨':'art palette',
    '🎬':'clapperboard movie','🎤':'microphone sing','🎧':'headphones',
    '🎼':'musical score','🎹':'piano','🥁':'drum','🪘':'long drum','🎷':'saxophone',
    '🎺':'trumpet','🪗':'accordion','🎸':'guitar','🪕':'banjo','🎻':'violin',
    '🪈':'flute','🎲':'dice','♟️':'chess pawn','🎯':'darts target','🎳':'bowling',
    '🎮':'video game','🎰':'slot machine','🧩':'puzzle','🪅':'pinata','🪩':'mirror ball',
    '🎉':'party popper','🎊':'confetti','🎈':'balloon','🎁':'gift present',
    // Travel (key)
    '🚗':'car','🚕':'taxi','🚙':'suv','🚌':'bus','🚎':'trolley','🏎️':'racing car',
    '🚓':'police car','🚑':'ambulance','🚒':'fire truck','🚐':'minibus','🛻':'pickup truck',
    '🚚':'delivery truck','🚛':'lorry','🚜':'tractor','🛴':'scooter kick','🚲':'bicycle bike',
    '🛵':'scooter motor','🏍️':'motorcycle','🛺':'auto rickshaw','🛞':'wheel',
    '✈️':'plane airplane','🛫':'plane departure','🛬':'plane arrival','🛩️':'small plane',
    '💺':'seat','🛰️':'satellite','🚀':'rocket','🛸':'ufo flying saucer','🚁':'helicopter',
    '🛶':'canoe','⛵':'sailboat','🚤':'speedboat','🛥️':'motor boat','🛳️':'passenger ship',
    '⛴️':'ferry','🚢':'ship','⚓':'anchor','⛽':'fuel pump',
    '🗺️':'world map','🗿':'moai statue','🗽':'statue of liberty','🗼':'tokyo tower',
    '🏰':'castle','🏯':'japanese castle','🏟️':'stadium','🎡':'ferris wheel',
    '🎢':'roller coaster','🎠':'carousel','⛲':'fountain','⛱️':'umbrella beach',
    '🏖️':'beach','🏝️':'desert island','🏜️':'desert','🌋':'volcano','⛰️':'mountain',
    '🏔️':'snow mountain','🗻':'fuji','🏕️':'camping','⛺':'tent',
    '🏠':'house','🏡':'house garden','🏢':'office building','🏬':'department store',
    '🏥':'hospital','🏦':'bank','🏨':'hotel','🏪':'convenience store','🏫':'school',
    '⛪':'church','🕌':'mosque','🕍':'synagogue','🛕':'hindu temple','🕋':'kaaba',
    // Nature
    '🌍':'earth africa world','🌎':'earth americas','🌏':'earth asia','🌐':'globe',
    '🌑':'new moon','🌒':'waxing crescent','🌓':'first quarter','🌔':'waxing gibbous',
    '🌕':'full moon','🌖':'waning gibbous','🌗':'last quarter','🌘':'waning crescent',
    '🌙':'crescent moon','🌚':'new moon face','🌛':'first quarter face','🌜':'last quarter face',
    '☀️':'sun sunny','🌝':'full moon face','🌞':'sun face','🪐':'planet ringed',
    '⭐':'star','🌟':'glowing star','🌠':'shooting star','🌌':'milky way galaxy',
    '☁️':'cloud','⛅':'sun behind cloud','⛈️':'thunder cloud rain','🌤️':'sun small cloud',
    '🌥️':'sun large cloud','🌦️':'sun rain','🌧️':'rain cloud','🌨️':'snow cloud',
    '🌩️':'lightning cloud','🌪️':'tornado','🌫️':'fog','🌬️':'wind face','🌀':'cyclone',
    '🌈':'rainbow','🌂':'closed umbrella','☂️':'umbrella','☔':'umbrella rain',
    '⚡':'lightning bolt high voltage electric','❄️':'snowflake snow cold',
    '☃️':'snowman','⛄':'snowman no snow','☄️':'comet','🔥':'fire flame hot',
    '💧':'droplet water','🌊':'wave water ocean','🌱':'seedling sprout',
    '🌲':'evergreen tree pine','🌳':'tree deciduous','🌴':'palm tree','🌵':'cactus',
    '🌾':'sheaf rice','🌿':'herb leaf','☘️':'shamrock','🍀':'four leaf clover lucky',
    '🍁':'maple leaf','🍂':'fallen leaf autumn','🍃':'leaf wind','🪴':'potted plant',
    '💐':'bouquet flowers','🌷':'tulip','🌹':'rose','🥀':'wilted flower',
    '🌺':'hibiscus','🌸':'cherry blossom sakura','🌼':'blossom flower','🌻':'sunflower',
    // Objects (popular)
    '💡':'light bulb idea','🔦':'flashlight','🕯️':'candle','💸':'money flying',
    '💵':'dollar','💴':'yen','💶':'euro','💷':'pound','🪙':'coin','💰':'money bag',
    '💳':'credit card','💎':'gem diamond','🪨':'rock stone boulder','⚖️':'balance scale','🔧':'wrench',
    '🔨':'hammer','🛠️':'tools','⚙️':'gear','🔩':'nut bolt',
    '🧲':'magnet','🔫':'water pistol gun','💣':'bomb','🧨':'firecracker','🪓':'axe',
    '🔪':'knife kitchen','🗡️':'dagger','⚔️':'crossed swords','🛡️':'shield',
    '🚬':'cigarette','⚰️':'coffin','🪦':'headstone','⚱️':'urn','🏺':'amphora',
    '🔮':'crystal ball','📿':'prayer beads','🧿':'evil eye nazar','💈':'barber pole',
    '⚗️':'alembic','🔭':'telescope','🔬':'microscope','💊':'pill','💉':'syringe',
    '🩸':'blood drop','🧬':'dna','🦠':'microbe germ','🧪':'test tube',
    '🌡️':'thermometer','🧹':'broom','🧻':'toilet paper','🚽':'toilet','🚿':'shower',
    '🛁':'bathtub','🛀':'person bath','🧼':'soap','🪒':'razor','🧴':'lotion bottle',
    '🛎️':'bellhop bell','🔑':'key','🗝️':'old key','🚪':'door','🪑':'chair',
    '🛋️':'couch sofa','🛏️':'bed','🛌':'in bed person','🧸':'teddy bear',
    '🛍️':'shopping bags','🛒':'shopping cart','🎈':'balloon',
    '📱':'mobile phone cell','💻':'laptop','⌨️':'keyboard','🖥️':'desktop computer',
    '🖨️':'printer','🖱️':'mouse computer','💽':'minidisc','💾':'floppy save',
    '💿':'compact disc cd','📀':'dvd','📼':'videocassette','📷':'camera',
    '📸':'camera flash','📹':'video camera','🎥':'movie camera','📽️':'film projector',
    '📞':'phone telephone','☎️':'phone classic','📺':'television tv','📻':'radio',
    '🎙️':'studio mic','⏱️':'stopwatch','⏲️':'timer','⏰':'alarm clock',
    '🕰️':'mantelpiece clock','⌛':'hourglass done','⏳':'hourglass flowing','📡':'satellite antenna',
    '🔋':'battery','🪫':'low battery','🔌':'plug',
    '📔':'notebook decorative','📕':'closed book red','📖':'open book','📗':'green book',
    '📘':'blue book','📙':'orange book','📚':'books','📓':'notebook',
    '📒':'ledger','📃':'page curl','📜':'scroll','📄':'page facing up',
    '📰':'newspaper','📑':'bookmark tabs','🔖':'bookmark','🏷️':'label tag',
    '✉️':'envelope mail','📧':'email','📨':'incoming envelope','📩':'envelope arrow',
    '📤':'outbox','📥':'inbox','📦':'package box','📫':'mailbox closed',
    '📮':'postbox','✏️':'pencil','✒️':'black nib','🖋️':'fountain pen',
    '🖊️':'pen','🖌️':'paintbrush','🖍️':'crayon','📝':'memo writing',
    '💼':'briefcase','📁':'file folder','📂':'open folder','🗂️':'card index dividers',
    '📅':'calendar','📆':'tear-off calendar','📇':'card index','📈':'chart up',
    '📉':'chart down','📊':'bar chart','📋':'clipboard','📌':'pushpin',
    '📍':'round pushpin','📎':'paperclip','🖇️':'linked paperclips','📏':'ruler',
    '📐':'triangular ruler','✂️':'scissors','🗑️':'wastebasket trash',
    '🔒':'locked','🔓':'unlocked','🔏':'lock with pen','🔐':'locked with key',
    // Symbols (popular only — minimal here)
    '☮️':'peace sign','✝️':'cross christianity','☯️':'yin yang','✡️':'star of david',
    '☸️':'wheel dharma','♈':'aries','♉':'taurus','♊':'gemini','♋':'cancer',
    '♌':'leo','♍':'virgo','♎':'libra','♏':'scorpio','♐':'sagittarius',
    '♑':'capricorn','♒':'aquarius','♓':'pisces','⛎':'ophiuchus',
    '🆔':'id','⚛️':'atom','☢️':'radioactive','☣️':'biohazard',
    '✴️':'eight pointed star','🆚':'vs versus','💮':'white flower','🎴':'flower playing cards',
    '🅰️':'a button blood','🅱️':'b button blood','🆎':'ab blood','🅾️':'o blood',
    '🆘':'sos help','❌':'cross x no','⭕':'circle o','🛑':'stop sign','⛔':'no entry',
    '🚫':'prohibited no','❗':'exclamation','❕':'white exclamation','❓':'question',
    '❔':'white question','‼️':'double exclamation','⁉️':'exclamation question',
    '⚠️':'warning','🚸':'children crossing','🔱':'trident','⚜️':'fleur de lis',
    '🔰':'beginner','♻️':'recycle','✅':'check mark green','✳️':'eight spoked',
    '❎':'cross mark button','💠':'diamond shape','🌀':'cyclone','💤':'zzz sleep',
    '♿':'wheelchair','🎵':'music note','🎶':'musical notes','➕':'plus','➖':'minus',
    '➗':'divide','✖️':'multiply','♾️':'infinity','💲':'dollar sign','™️':'tm trademark',
    '©️':'copyright','®️':'registered','✔️':'check mark','☑️':'check ballot',
    '⚪':'white circle','⚫':'black circle','🔴':'red circle','🟠':'orange circle',
    '🟡':'yellow circle','🟢':'green circle','🔵':'blue circle','🟣':'purple circle',
    '🟤':'brown circle','🔶':'large orange diamond','🔷':'large blue diamond',
    '🔸':'small orange diamond','🔹':'small blue diamond','🔺':'red triangle up',
    '🔻':'red triangle down','⬛':'black square','⬜':'white square','🟥':'red square',
    '🟧':'orange square','🟨':'yellow square','🟩':'green square','🟦':'blue square',
    '🟪':'purple square','🟫':'brown square',
  };

  // Build a flat list of all emojis (deduplicated) for search.
  const ALL_EMOJIS = (() => {
    const set = new Set();
    EMOJI_CATEGORIES.forEach(cat => cat.emojis.forEach(em => set.add(em)));
    return [...set];
  })();

  function searchEmojis(query) {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return ALL_EMOJIS.filter(em => {
      const kw = EMOJI_KEYWORDS[em];
      if (!kw) return false;
      return kw.includes(q);
    });
  }

  const emojiBtn    = document.getElementById('emojiBtn');
  const emojiPicker = document.getElementById('emojiPicker');
  const emojiTabs   = document.getElementById('emojiTabs');
  const emojiGrid   = document.getElementById('emojiGrid');
  const emojiSearch = document.getElementById('emojiSearch');

  function renderEmojiList(emojis) {
    emojiGrid.innerHTML = '';
    if (emojis.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'emoji-no-results';
      empty.textContent = 'No emojis found.';
      emojiGrid.appendChild(empty);
      return;
    }
    emojis.forEach(em => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emoji-cell';
      btn.textContent = em;
      btn.title = em;
      btn.addEventListener('click', () => insertEmoji(em));
      emojiGrid.appendChild(btn);
    });
  }

  function renderEmojiCategory(catKey) {
    const cat = EMOJI_CATEGORIES.find(c => c.key === catKey);
    if (!cat) return;
    renderEmojiList(cat.emojis);
    // Update active tab
    [...emojiTabs.children].forEach(tab => {
      tab.classList.toggle('active', tab.dataset.cat === catKey);
    });
  }

  function buildEmojiTabs() {
    EMOJI_CATEGORIES.forEach((cat, idx) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'emoji-tab' + (idx === 0 ? ' active' : '');
      tab.textContent = cat.tab;
      tab.title = cat.label;
      tab.dataset.cat = cat.key;
      tab.addEventListener('click', () => renderEmojiCategory(cat.key));
      emojiTabs.appendChild(tab);
    });
  }

  function insertEmoji(em) {
    const start = userInput.selectionStart ?? userInput.value.length;
    const end   = userInput.selectionEnd   ?? userInput.value.length;
    const before = userInput.value.slice(0, start);
    const after  = userInput.value.slice(end);
    userInput.value = before + em + after;
    // Move cursor after the inserted emoji
    const newPos = start + em.length;
    userInput.focus();
    try { userInput.setSelectionRange(newPos, newPos); } catch (_) {}
  }

  function openEmojiPicker() {
    if (emojiPicker.classList.contains('hidden')) {
      emojiPicker.classList.remove('hidden');
    }
  }
  function closeEmojiPicker() {
    if (!emojiPicker.classList.contains('hidden')) {
      emojiPicker.classList.add('hidden');
    }
  }
  function toggleEmojiPicker() {
    if (emojiPicker.classList.contains('hidden')) openEmojiPicker();
    else closeEmojiPicker();
  }

  // Build tabs + first category
  if (emojiBtn && emojiPicker && emojiTabs && emojiGrid) {
    buildEmojiTabs();
    renderEmojiCategory(EMOJI_CATEGORIES[0].key);

    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleEmojiPicker();
    });

    // Don't close when clicking inside the picker itself
    emojiPicker.addEventListener('click', (e) => e.stopPropagation());

    // Search input → live filter
    if (emojiSearch) {
      emojiSearch.addEventListener('input', () => {
        const q = emojiSearch.value;
        if (!q.trim()) {
          // Empty → return to active category (or first if none)
          const activeTab = [...emojiTabs.children].find(t => t.classList.contains('active'));
          renderEmojiCategory(activeTab ? activeTab.dataset.cat : EMOJI_CATEGORIES[0].key);
        } else {
          renderEmojiList(searchEmojis(q));
        }
      });
    }

    // Click outside → close
    document.addEventListener('click', (e) => {
      if (emojiPicker.classList.contains('hidden')) return;
      if (e.target === emojiBtn) return;
      closeEmojiPicker();
    });

    // ESC → close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeEmojiPicker();
    });
  }

  // ============================================================
  // Secret button — toggles Secret Mode on click
  // ============================================================
  if (secretBtn) {
    secretBtn.addEventListener('click', () => {
      if (isSecretActive()) {
        // Exit Secret Mode
        disableSecretMode();
        secretBtn.textContent = '🔒';
        addMessage('🔓 You leave the secret room. The whispers fade...', 'bot');
      } else {
        // Enter Secret Mode
        enableSecretMode();
        secretBtn.textContent = '🔓';
        addMessage('🤫 Welcome to the secret room. Only whispers here... (Use /clear to leave.)', 'bot');
      }
    });
  }

  // ============================================================
  // Modal
  // ============================================================
  aboutBtn.addEventListener('click', () => {
    aboutModal.classList.remove('hidden');
  });
  closeModal.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
  });
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) aboutModal.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') aboutModal.classList.add('hidden');
  });

  // ============================================================
  // Welcome message
  // ============================================================
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      addMessage("Hi! I'm Jaick. How can I help you today? (English only, please ✨)", 'bot');
    }, 300);
    userInput.focus();
  });

  /* ============================================================
   * Future API integration:
   * Replace getAIResponse() with an async function that calls
   * an external AI API. Keep the language check and multi-turn
   * state handling at the top.
   * ============================================================ */
})();