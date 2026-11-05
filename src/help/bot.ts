// The chat bot's brain, moved from jt9-help/help-bot.php so it runs in the visitor's browser on a static site.
// It answers from the question list only, with no server or API key. Questions it can't answer are saved
// through Netlify Forms so the team can add them to src/data/help.ts. Everything else stays in the browser.
import { helpFaq, helpHandoff } from '../data/help';

const SKIP = new Set(
  'a an the is are am was do does did how what whats when where why who which can could i im you we your our my me us to of in on at for and or it its this that with be will would should have has please tell about much there any some if from by so need want get'.split(
    ' ',
  ),
);
const SAME: Record<string, string> = {
  price: 'cost',
  pricing: 'cost',
  fee: 'cost',
  charge: 'cost',
  rate: 'cost',
  expensive: 'cost',
  amount: 'cost',
  time: 'long',
  timeline: 'long',
  duration: 'long',
  located: 'location',
  address: 'location',
  based: 'location',
  job: 'vacancy',
  career: 'vacancy',
  hiring: 'vacancy',
  cv: 'vacancy',
  donation: 'donate',
  give: 'donate',
  momo: 'mobile',
  founder: 'founded',
  owner: 'own',
};

function words(text: string): string[] {
  const clean = text.toLowerCase().replace(/[^\p{L}\p{N}\s]+/gu, '');
  const out: string[] = [];
  for (let word of clean.split(/\s+/u).filter(Boolean)) {
    if (SKIP.has(word)) continue;
    if (!SAME[word] && word.length > 3 && word.endsWith('s') && !word.endsWith('ss'))
      word = word.slice(0, -1);
    out.push(SAME[word] ?? word);
  }
  return out;
}

/** The answer whose question best fits the message and how well it fits, or null when nothing fits well enough. */
function bestMatch(message: string): { text: string; score: number } | null {
  const asked = [...new Set(words(message.replace(/\bhow much\b/giu, 'cost')))];
  if (!asked.length) return null;
  let bestScore = 0;
  let best: string | null = null;
  for (const [question, answer] of helpFaq) {
    const questionWords = new Set(words(question));
    const answerWords = new Set(words(answer));
    const inQuestion = asked.filter((w) => questionWords.has(w));
    if (!inQuestion.length) continue;
    const inAnswer = asked.filter((w) => answerWords.has(w) && !questionWords.has(w));
    const score = (inQuestion.length + 0.5 * inAnswer.length) / asked.length;
    if (score > bestScore) [bestScore, best] = [score, answer];
  }
  return best && bestScore >= 0.5 ? { text: best, score: bestScore } : null;
}

/** Greetings, the closest question in the list, or a hand-over to the team. */
export function answer(message: string): { reply: string; actions: typeof helpHandoff; unknown?: boolean } {
  const plain = message.trim().toLowerCase();
  if (
    /^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b[\s!.,]*(there|jaytech9)?[\s!.]*$/u.test(plain)
  ) {
    return { reply: 'Hello! What would you like to know?', actions: [] };
  }
  if (/^(ok(ay)?[,\s]*)?(thanks|thank you|thx|great|perfect)\b.{0,20}$/u.test(plain)) {
    return { reply: 'You’re welcome! Is there anything else I can help with?', actions: [] };
  }
  const best = bestMatch(message);
  // A weak match still gets an answer, but is saved too: the list may be missing a better one.
  if (best) return { reply: best.text, actions: [], unknown: best.score < 0.6 };
  if (
    /\b(human|person|agent|someone|staff|call|phone|whatsapp|talk|speak|contact|number|email)\b/u.test(plain)
  ) {
    // "Talk to a human" is a plain request. Anything longer is a real question that happens to use one of these words.
    return {
      reply: 'Of course. You can reach our team here:',
      actions: helpHandoff,
      unknown: words(message).length >= 3,
    };
  }
  return {
    reply: 'I’m not sure about that one, but our team can help you directly:',
    actions: helpHandoff,
    unknown: true,
  };
}

// Each visitor can save a few questions per visit, so one person can't use up the form allowance the contact form shares.
const MAX_SAVED = 5;

/** Saves a question the bot couldn't answer, with emails and phone numbers removed. Only runs on the live site. */
export function saveUnanswered(message: string): void {
  if (!import.meta.env.PROD || !words(message).length) return;
  const question = message
    .replace(/\S+@\S+\.\S+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{6,}\d/g, '[number]')
    .trim();
  let saved: string[] = [];
  try {
    saved = JSON.parse(sessionStorage.getItem('jt9_help_saved') ?? '[]');
  } catch {}
  if (saved.length >= MAX_SAVED || saved.includes(question)) return;
  try {
    sessionStorage.setItem('jt9_help_saved', JSON.stringify([...saved, question]));
  } catch {}
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      'form-name': 'help-questions',
      question,
      page: location.pathname,
    }).toString(),
  }).catch(() => {});
}
