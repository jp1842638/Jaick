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
    ]) || /\bstory\b/.test(t);
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
        || /\btime\s+(now|right\s+now)\b/.test(t);
  }
  function isAskingDate(t) {
    return /\b(what(\s+is|'s|s)?\s+(the\s+)?date|today's\s+date|current\s+date)\b/.test(t)
        || /\bwhat\s+is\s+today\b/.test(t)
        || /\bwhat'?s\s+today\b/.test(t);
  }
  function isAskingDay(t) {
    return /\bwhat\s+day\s+(is\s+it|of\s+the\s+week)\b/.test(t)
        || /\bwhich\s+day\b/.test(t);
  }

  // --- Coin / Dice ---
  function isCoinFlip(t) {
    return /\b(flip\s+a\s+coin|coin\s+flip|toss\s+a\s+coin|heads\s+or\s+tails)\b/.test(t);
  }
  function isDiceRoll(t) {
    return /\b(roll\s+a\s+(dice|die)|dice\s+roll|throw\s+a\s+(dice|die)|roll\s+the\s+(dice|die))\b/.test(t);
  }

  // --- Joke / Fact ---
  function isAskingJoke(t) {
    return /\b(tell\s+me\s+a\s+joke|a\s+joke|joke\s+please|make\s+me\s+laugh|something\s+funny)\b/.test(t)
        || /^joke\b/.test(t.trim());
  }
  function isAskingFact(t) {
    return /\b(fun\s+fact|random\s+fact|tell\s+me\s+a\s+fact|interesting\s+fact|did\s+you\s+know)\b/.test(t)
        || /^fact\b/.test(t.trim());
  }

  // --- Rock Paper Scissors ---
  function isStartingRPS(t) {
    return /\b(rock\s+paper\s+scissors|rps|play\s+rps|let'?s\s+play\s+(rps|rock\s+paper\s+scissors))\b/.test(t);
  }
  function parseRPSChoice(t) {
    if (/\brock\b/.test(t))      return 'rock';
    if (/\bpaper\b/.test(t))     return 'paper';
    if (/\bscissors?\b/.test(t)) return 'scissors';
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
    return null;
  }

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
        || /\bfreezing\b/.test(t);
  }
  function isSayingSnowing(t) {
    return /\b(it'?s|it\s+is)\s+snowing\b/.test(t)
        || /\bsnowing\b/.test(t)
        || /\b(it'?s|it\s+is)\s+snowy\b/.test(t);
  }
  function isSayingHot(t) {
    return /\b(it'?s|it\s+is)\s+(so\s+|really\s+|very\s+)?hot\b/.test(t)
        || /\bso\s+hot\b/.test(t)
        || /\b(boiling|scorching)\b/.test(t);
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
    return /\breverse\b/.test(t) || /\bbackwards?\b/.test(t);
  }
  function getReverseTarget(raw) {
    let m = raw.match(/reverse\s*:?\s*(.+)/i);
    if (m) return m[1].trim();
    m = raw.match(/spell\s+(.+?)\s+backwards?/i);
    if (m) return m[1].trim();
    m = raw.match(/(.+?)\s+backwards?/i);
    if (m) return m[1].replace(/^(say|spell)\s+/i, '').trim();
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
        || /^tod\b/.test(t.trim());
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
        || /\brofl\b/i.test(t);
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
        || /\bhmm+m*\b/i.test(t);    // (redundant safety)
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
        || /\bi\s+brought\s+(you\s+)?a\s+battery\b/i.test(t);
  }
  function isExitBoth(t) {
    return /\bexit\s+(both|all)\b/i.test(t)
        || /\b(stop|disable|end|quit)\s+(both|all)\b/i.test(t);
  }
  function isCatchingFish(t) {
    return /\bcatch\s+(a\s+|some\s+)?fish(es)?\b/i.test(t)
        || /\bgo\s+fishing\b/i.test(t);
  }
  function isMakingWish(t) {
    return /\bmy\s+wish\s+is\b/i.test(t)
        || /\bi\s+wish\s+(for|to)\b/i.test(t)
        || /\bi\s+want\s+to\s+wish\s+for\b/i.test(t)
        || /\bmake\s+a\s+wish\b/i.test(t);
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
        || /\bfml\b/i.test(t);
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

    // 8 fish (random emoji, random size, random direction)
    for (let i = 0; i < 8; i++) {
      const emoji = FISH_EMOJIS[Math.floor(Math.random() * FISH_EMOJIS.length)];
      const top   = 10 + Math.random() * 80;
      const dur   = 12 + Math.random() * 18;
      const delay = Math.random() * dur;
      const size  = 22 + Math.random() * 28;
      const reverse = Math.random() < 0.5;
      const fish = document.createElement('div');
      fish.className = `fish${reverse ? ' fish-reverse' : ''}`;
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
  // Main Response Engine
  // ============================================================
  function getAIResponse(rawInput) {
    // 1. Language check FIRST
    if (!isEnglishOnly(rawInput)) {
      return { text: 'Sorry, I only support English.', type: 'error' };
    }

    const text = rawInput.toLowerCase().trim();

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

    // 9. Favorites
    const favKind = detectFavorite(text);
    if (favKind) {
      return { text: favoriteResponse(favKind), type: 'bot' };
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