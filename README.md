# ✨ Jaick — Rule-based chatbot

A colorful, English-only rule-based chatbot built with pure HTML, CSS, and JavaScript.

## 💡 The Meaning Behind the Name

| Letter | Meaning |
|:------:|---------|
| **J**  | Developer's first letter |
| **ai** | AI |
| **c**  | Developer's friend's first letter |
| **k**  | Developer's other friend's first letter |

## 🌍 Language Support

Jaick **only supports English**.
If a non-English message is detected (Korean, Japanese, Chinese, Cyrillic, Arabic, etc.), Jaick replies:

> Sorry, I only support English.

## 🎂 About Jaick

- **Birthday:** June 13th, 2026
- **Type:** Rule-based chatbot
- **Favorites:**
  - 💚 Color: Teal and yellowish green
  - ⚡ Food: Battery
  - 🦎 Animal: Axolotl and Eel
  - 🎵 Song: Yararara
  - 🎤 Vocaloid: Kasane Teto and Otomachi Una
  - 🔢 Numbers: 0 and 1 (computers run on them!)

## 🎨 Features

### 🧠 Identity & Lore
- Asks about Jaick's name meaning
- Asks about the creator (nickname: **Lena**)
- Asks about Lena's friends — pick **C** or **K** for different answers
- Confirms it is a rule-based chatbot

### 📅 Utilities
- Current **time** — "what time is it"
- Current **date** — "what's the date"
- Current **day** — "what day is it"
- 🪙 **Coin flip** — "flip a coin"
- 🎲 **Dice roll** — "roll a dice"

### 🎮 Fun
- 😂 **Jokes** — "tell me a joke"
- 🌟 **Fun facts** — "tell me a fact"
- ✊✋✌️ **Rock-paper-scissors** — "play rps" (multi-turn game)
- 📖 **Short stories** — give Jaick a character and she'll write you a story

### 💬 Conversation & Emotion
- Mood reactions — say "I'm sad / happy / tired / lonely / scared / angry / hungry / stressed"
- 😴 Bored? — "I'm bored" → activity suggestions
- 💖 Compliment Jaick — "you're cool" / "I love you"
- 🎂 **Birthday handling**:
  - "When is your birthday?" → June 13th, 2026
  - "Happy birthday!" on June 13th → grateful reply
  - "Happy birthday!" on any other day → *"Today's not my birthday. I think you got confused."*
- 💎 Favorites — "what's your favorite color/food/animal/song/number?" or just "favorites"

### 🎨 Text & Play
- 🔁 **Reverse text** — "reverse hello"
- 🆔 **Random name** — "give me a random name"

### 🌦️ Weather Reactions (season-aware!)
- "It's cold" / "it's snowing"
  - **Sep–Mar (cold season):** "Brrr 🥶 I feel the coldness from here!" / "I like snow! I wish it snows inside the digital world."
  - **Apr–Aug (warm season):** "How?!"
- "It's hot"
  - **Apr–Aug (warm season):** "I feel the heat from here 🥵🔥"
  - **Sep–Mar (cold season):** "How?!"

### 🃏 Holidays / Pranks
- "What should I do for April Fools?" → list of harmless prank ideas

### 💛 Casual
- Greetings, thanks, farewell, "how are you?", help, age, etc.

## 🚀 How to Run

Just open `index.html` in any modern web browser.

```bash
open index.html
```

No installation, no dependencies, no build step.

## 📁 Project Structure

```
Jaick/
├── index.html      # Chat UI
├── style.css       # Colorful gradient + glassmorphism styles
├── script.js       # Language detection + chatbot logic
└── README.md       # You are here
```

## 💬 Try Asking Jaick

**Lore:**
- "What does your name mean?"
- "Who created you?"
- "Tell me about your developer's friend."
- "Are you a rule-based chatbot?"

**Utilities:**
- "What time is it?"
- "What's today's date?"
- "Flip a coin."
- "Roll a dice."

**Fun:**
- "Tell me a joke."
- "Tell me a fact."
- "Let's play rock paper scissors."
- "Make a story about a brave knight named Tom."

**Conversation:**
- "I'm bored."
- "I'm sad."
- "You're amazing!"
- "What's your favorite animal?"
- "What's your favorite vocaloid?"
- "Happy birthday!"

**Weather (season-aware):**
- "It's cold!"
- "It's snowing!"
- "It's hot!"

**Holidays:**
- "What should I do for April Fools?"

**Text play:**
- "Reverse hello."
- "Give me a random name."

**Korean (rejected):**
- "안녕" → *Sorry, I only support English.*

## 🔮 Future Plans

The `getAIResponse()` function in `script.js` is structured to be easily replaceable with a real AI API (e.g., OpenAI) in the future. The English-only language check and multi-turn conversational state (friend C/K choice, story character, RPS game) sit cleanly at the top so they keep working with any backend.

---

Made with 💖 by Lena.