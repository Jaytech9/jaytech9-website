<?php
/**
 * Jay Tech 9 chat bot. Answers from the host site's question list, and uses Claude when an API key is set.
 * If Claude is off, fails or is over its daily limit, the bot still answers from the question list.
 * See README.md in this folder for how to use it.
 */
declare(strict_types=1);

const JT9_BOT_MAX_MESSAGE = 500;
const JT9_BOT_MAX_HISTORY = 6;

/** Handles one chat request: checks it, answers, prints JSON. Call it from a small endpoint file in the host site. */
function jt9_bot_handle(array $cfg): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    $fail = function (int $code, string $text) use ($cfg): void {
        http_response_code($code);
        echo json_encode(['reply' => $text, 'actions' => $cfg['handoff'] ?? []], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    };
    // A JSON body and this check stop other websites from sending messages through a visitor's browser.
    $type = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    $site = (string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '');
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !str_starts_with($type, 'application/json') || $site === 'cross-site') {
        $fail(405, 'Sorry, that request is not allowed.');
        return;
    }
    $in = json_decode((string) file_get_contents('php://input', false, null, 0, 20000), true);
    $message = is_array($in) && is_string($in['message'] ?? null) ? trim($in['message']) : '';
    if ($message === '') {
        $fail(400, 'Please type a question.');
        return;
    }
    if (!jt9_bot_allow_visitor($cfg)) {
        $fail(429, 'You’re sending messages very quickly. Please wait a few minutes, or contact the office directly.');
        return;
    }
    $history = is_array($in['history'] ?? null) ? $in['history'] : [];
    echo json_encode(jt9_bot_reply($cfg, mb_substr($message, 0, JT9_BOT_MAX_MESSAGE), $history), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

/** Returns ['reply' => text, 'actions' => links, 'source' => 'claude' or 'local']. */
function jt9_bot_reply(array $cfg, string $message, array $history = []): array
{
    if (trim((string) ($cfg['api_key'] ?? '')) !== '' && jt9_bot_allow_claude($cfg)) {
        $text = jt9_bot_claude($cfg, $message, $history);
        if ($text !== null) {
            $handoff = str_contains($text, '[HANDOFF]');
            return [
                'reply'   => trim(str_replace('[HANDOFF]', '', $text)),
                'actions' => $handoff ? ($cfg['handoff'] ?? []) : [],
                'source'  => 'claude',
            ];
        }
    }
    return jt9_bot_local($cfg, $message) + ['source' => 'local'];
}

/** Answers without AI: greetings, the closest question in the list, or a hand-over to the office. */
function jt9_bot_local(array $cfg, string $message): array
{
    $handoff = $cfg['handoff'] ?? [];
    $plain = mb_strtolower(trim($message));
    if (preg_match('/^(hi|hello|hey|hiya|good (morning|afternoon|evening))\b[\s!.,]*(there|sahe)?[\s!.]*$/u', $plain)) {
        return ['reply' => 'Hello! What would you like to know?', 'actions' => []];
    }
    if (preg_match('/^(ok(ay)?[,\s]*)?(thanks|thank you|thx|great|perfect)\b.{0,20}$/u', $plain)) {
        return ['reply' => 'You’re welcome! Is there anything else I can help with?', 'actions' => []];
    }
    $best = jt9_bot_best_match($cfg['faq'] ?? [], $message);
    if ($best !== null) {
        return ['reply' => $best, 'actions' => []];
    }
    if (preg_match('/\b(human|person|agent|someone|staff|call|phone|whatsapp|talk|speak|contact|number|email)\b/u', $plain)) {
        return ['reply' => 'Of course. You can reach our team here:', 'actions' => $handoff];
    }
    return ['reply' => 'I’m not sure about that one, but our team can help you directly:', 'actions' => $handoff];
}

/** The answer whose question best fits the message, or null when nothing fits well enough. */
function jt9_bot_best_match(array $faq, string $message): ?string
{
    $asked = array_unique(jt9_bot_words($message));
    if (!$asked) {
        return null;
    }
    $bestScore = 0.0;
    $best = null;
    foreach ($faq as $row) {
        [$q, $a] = [(string) ($row[0] ?? ''), (string) ($row[1] ?? '')];
        $inQuestion = array_intersect($asked, jt9_bot_words($q));
        if (!$inQuestion || $a === '') {
            continue;
        }
        $inAnswer = array_diff(array_intersect($asked, jt9_bot_words($a)), $inQuestion);
        $score = (count($inQuestion) + 0.5 * count($inAnswer)) / count($asked);
        if ($score > $bestScore) {
            [$bestScore, $best] = [$score, $a];
        }
    }
    return $bestScore >= 0.5 ? $best : null;
}

/** Lowercase keywords with common words removed and similar words merged. */
function jt9_bot_words(string $text): array
{
    static $skip = ['a', 'an', 'the', 'is', 'are', 'am', 'was', 'do', 'does', 'did', 'how', 'what', 'whats', 'when', 'where', 'why', 'who', 'which',
        'can', 'could', 'i', 'im', 'you', 'we', 'your', 'our', 'my', 'me', 'us', 'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'it', 'its', 'this', 'that',
        'with', 'be', 'will', 'would', 'should', 'have', 'has', 'please', 'tell', 'about', 'much', 'there', 'any', 'some', 'if', 'from', 'by', 'so', 'need', 'want', 'get'];
    static $same = ['price' => 'cost', 'pricing' => 'cost', 'fee' => 'cost', 'charge' => 'cost', 'rate' => 'cost', 'expensive' => 'cost', 'amount' => 'cost',
        'time' => 'long', 'timeline' => 'long', 'duration' => 'long', 'overseas' => 'abroad', 'diaspora' => 'abroad', 'outside' => 'abroad',
        'drawing' => 'plan', 'design' => 'plan', 'blueprint' => 'plan', 'located' => 'location', 'address' => 'location', 'hour' => 'open', 'opening' => 'open'];
    $clean = preg_replace('/[^\p{L}\p{N}\s]+/u', '', mb_strtolower($text)) ?? '';
    $out = [];
    foreach (preg_split('/\s+/u', $clean, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $w) {
        if (in_array($w, $skip, true)) {
            continue;
        }
        if (!isset($same[$w]) && mb_strlen($w) > 3 && str_ends_with($w, 's') && !str_ends_with($w, 'ss')) {
            $w = mb_substr($w, 0, -1);
        }
        $out[] = $same[$w] ?? $w;
    }
    return $out;
}

/** Asks Claude. Returns its text, or null so the bot can answer from the question list instead. */
function jt9_bot_claude(array $cfg, string $message, array $history): ?string
{
    $model = (string) ($cfg['model'] ?? 'claude-opus-5-5');
    $body = [
        'model'         => $model,
        'max_tokens'    => 2000,
        'output_config' => ['effort' => 'low'],
        'system'        => [['type' => 'text', 'text' => jt9_bot_prompt($cfg), 'cache_control' => ['type' => 'ephemeral']]],
        'messages'      => jt9_bot_messages($history, $message),
    ];
    $headers = ['Content-Type: application/json', 'x-api-key: ' . trim((string) $cfg['api_key']), 'anthropic-version: 2026-10-21'];
    if (preg_match('/^claude-(opus-5|fable-5|sonnet-5-5)/', $model)) {
        // If a safety check declines a harmless question, Anthropic retries it on another model.
        $body['fallbacks'] = 'default';
        $headers[] = 'anthropic-beta: server-side-fallback-2026-07-01';
    }
    $ch = curl_init((string) ($cfg['api_url'] ?? 'https://api.anthropic.com/v1/messages'));
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => $headers,
        CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT        => 25,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    if ($status !== 200 || !is_array($data)) {
        error_log('[jt9 bot] Claude request failed: HTTP ' . $status . ' ' . (string) ($data['error']['type'] ?? curl_error($ch)));
        return null;
    }
    if (($data['stop_reason'] ?? '') === 'refusal') {
        return null;
    }
    $text = '';
    foreach ($data['content'] ?? [] as $block) {
        if (($block['type'] ?? '') === 'text') {
            $text .= (string) ($block['text'] ?? '');
        }
    }
    return trim($text) !== '' ? trim($text) : null;
}

function jt9_bot_prompt(array $cfg): string
{
    $name = (string) ($cfg['name'] ?? 'this company');
    $facts = '';
    foreach ($cfg['faq'] ?? [] as $row) {
        $facts .= 'Q: ' . ($row[0] ?? '') . "\nA: " . ($row[1] ?? '') . "\n\n";
    }
    return "You are the automated help assistant on the {$name} website. Visitors ask you about the company and its services.\n\n"
        . "Answer only from the company information below. If it doesn't cover the question, say you aren't sure and don't guess, "
        . "especially about prices, dates, legal requirements or anything that could cost a visitor money. "
        . "Keep to topics related to {$name}, and politely steer other requests back to how you can help.\n\n"
        . "Write one to three short, friendly sentences of plain text, with no markdown, because the chat window shows text exactly as written.\n\n"
        . "When a visitor needs a person, such as for a quote, a booking or a question you can't answer, end your reply with the exact text [HANDOFF]. "
        . "The website then shows buttons for contacting the office, so don't write out contact links yourself.\n\n"
        . "<company_information>\n{$facts}</company_information>";
}

/** Cleans the history sent by the browser into alternating turns that end with the new message. */
function jt9_bot_messages(array $history, string $message): array
{
    $turns = [];
    foreach (array_slice($history, -JT9_BOT_MAX_HISTORY) as $h) {
        $role = is_array($h) ? ($h['role'] ?? '') : '';
        $text = is_array($h) && is_string($h['content'] ?? null) ? trim(mb_substr($h['content'], 0, 1000)) : '';
        $last = $turns ? $turns[count($turns) - 1]['role'] : 'assistant';
        if ($text !== '' && in_array($role, ['user', 'assistant'], true) && $role !== $last) {
            $turns[] = ['role' => $role, 'content' => $text];
        }
    }
    if ($turns && $turns[count($turns) - 1]['role'] === 'user') {
        array_pop($turns);
    }
    $turns[] = ['role' => 'user', 'content' => $message];
    return $turns;
}

/** Limits how many messages one visitor can send. Default: 20 in 10 minutes. */
function jt9_bot_allow_visitor(array $cfg): bool
{
    $limit = (int) ($cfg['visitor_limit'] ?? 20);
    $ip = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? ''));
    $ok = jt9_bot_counters($cfg, function (array &$c) use ($ip, $limit): bool {
        $from = time() - 600;
        foreach ($c['visitors'] ?? [] as $k => $times) {
            $c['visitors'][$k] = array_values(array_filter($times, fn ($t) => $t > $from));
            if (!$c['visitors'][$k]) {
                unset($c['visitors'][$k]);
            }
        }
        if (count($c['visitors'][$ip] ?? []) >= $limit) {
            return false;
        }
        $c['visitors'][$ip][] = time();
        return true;
    });
    return $ok ?? true;
}

/** Limits Claude requests per day, which caps the bill. Default: 300 a day. */
function jt9_bot_allow_claude(array $cfg): bool
{
    $limit = (int) ($cfg['daily_limit'] ?? 300);
    $ok = jt9_bot_counters($cfg, function (array &$c) use ($limit): bool {
        $today = date('Y-m-d');
        if (($c['day'] ?? '') !== $today) {
            $c['day'] = $today;
            $c['claude'] = 0;
        }
        if (($c['claude'] ?? 0) >= $limit) {
            return false;
        }
        $c['claude'] = ($c['claude'] ?? 0) + 1;
        return true;
    });
    return $ok ?? false;
}

/** Runs $change on the saved counters with the file locked. Returns null if the file can't be used. */
function jt9_bot_counters(array $cfg, callable $change): ?bool
{
    $dir = rtrim((string) ($cfg['storage_dir'] ?? sys_get_temp_dir()), '/');
    $fh = @fopen($dir . '/jt9-bot-counters.json', 'c+');
    if (!$fh) {
        error_log('[jt9 bot] Cannot write counters in ' . $dir);
        return null;
    }
    flock($fh, LOCK_EX);
    $counters = json_decode((string) stream_get_contents($fh), true);
    $counters = is_array($counters) ? $counters : [];
    $result = $change($counters);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, (string) json_encode($counters));
    flock($fh, LOCK_UN);
    fclose($fh);
    return $result;
}
