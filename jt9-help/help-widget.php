<?php
/**
 * Jay Tech 9 help widget: the signature icon and the floating help menu.
 * This folder stands alone (no database, no site code), so it can be copied into any PHP project.
 * See README.md in this folder for how to use it.
 */
declare(strict_types=1);

/** Jay Tech 9 signature help icon: the J mark wearing a support headset, in a chat bubble. */
function jt9_help_icon(int $size = 72): string
{
    static $n = 0;
    $i = ++$n;
    return '<svg class="jt9-help-icon" viewBox="0 0 100 100" width="' . $size . '" height="' . $size . '" aria-hidden="true" focusable="false">'
        . '<defs><linearGradient id="hk' . $i . '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5FD6FF"/><stop offset="1" stop-color="#1F86DA"/></linearGradient>'
        . '<linearGradient id="st' . $i . '" x1=".6" y1="0" x2=".2" y2="1"><stop offset="0" stop-color="#9BF04A"/><stop offset=".45" stop-color="#3CC64A"/><stop offset=".75" stop-color="#2AA7E0"/><stop offset="1" stop-color="#1A74CF"/></linearGradient>'
        . '<linearGradient id="wg' . $i . '" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#A6F24F"/><stop offset="1" stop-color="#2DB33E"/></linearGradient></defs>'
        . '<g class="jt9-hi-float">'
        . '<path d="M26 8h48a18 18 0 0 1 18 18v40a18 18 0 0 1-18 18H38L18 96l5-13A18 18 0 0 1 8 66V26A18 18 0 0 1 26 8z" fill="#0E1C27" stroke="#2C4558" stroke-width="1.6"/>'
        . '<g transform="translate(50 50) scale(.62) translate(-50 -51)">'
        . '<path d="M33 23H58Q71 23 71 36V41" fill="none" stroke="url(#hk' . $i . ')" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>'
        . '<path d="M57 34V61Q57 79 42 79Q28 79 28 65V61" fill="none" stroke="url(#st' . $i . ')" stroke-width="10" stroke-linecap="round"/>'
        . '<g fill="none" stroke="url(#wg' . $i . ')" stroke-linecap="round" stroke-width="4.5"><path class="jt9-hi-wv" d="M65.5 60.6A7 7 0 0 1 65.5 71.4"/><path class="jt9-hi-wv jt9-hi-wv2" d="M69.4 56A13 13 0 0 1 69.4 76"/><path class="jt9-hi-wv jt9-hi-wv3" d="M73.2 51.4A19 19 0 0 1 73.2 80.6"/></g></g>'
        . '<path d="M22 50a28 28 0 0 1 56 0" fill="none" stroke="#FDB71D" stroke-width="5.5" stroke-linecap="round"/>'
        . '<rect x="16" y="44" width="11" height="20" rx="5.5" fill="#FDB71D"/><rect x="73" y="44" width="11" height="20" rx="5.5" fill="#FDB71D"/>'
        . '<path d="M21.5 63c0 8 5 12 13 12h4" fill="none" stroke="#FDB71D" stroke-width="3" stroke-linecap="round"/>'
        . '<circle class="jt9-hi-mic" cx="40" cy="75" r="3.6" fill="none" stroke="#E8590C" stroke-width="1.4"/><circle cx="40" cy="75" r="3.6" fill="#E8590C"/>'
        . '<circle class="jt9-hi-live" cx="84" cy="15" r="6" fill="#3DDC6A" stroke="#0E1C27" stroke-width="2.5"/>'
        . '</g></svg>';
}

/** Small icons for the menu options: whatsapp, phone, mail, faq, app, bot. */
function jt9_help_glyph(string $name, int $size = 20): string
{
    if ($name === 'whatsapp') {
        return '<svg viewBox="0 0 24 24" width="' . $size . '" height="' . $size . '" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.1 1.4z"/></svg>';
    }
    $shapes = [
        'phone' => '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
        'mail'  => '<path d="M4 4h16v16H4z"/><path d="m4 6 8 7 8-7"/>',
        'faq'   => '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><path d="M12 17.2v.1"/>',
        'app'   => '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M12 7v7M9 11l3 3 3-3"/>',
        'bot'   => '<rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 4v4M9 14h.01M15 14h.01"/>',
    ];
    return '<svg viewBox="0 0 24 24" width="' . $size . '" height="' . $size . '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($shapes[$name] ?? '') . '</svg>';
}

function jt9_help_e(?string $text): string
{
    return htmlspecialchars((string) $text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * One menu row. Keys: label, note, icon, and one of:
 *   href (a link; add 'new_tab' => true to open a new tab), 'chat' => true (opens the chat bot), 'install' => true (app install button),
 *   or none of these ("coming soon" row).
 */
function jt9_help_option(array $o): string
{
    $icon = (string) ($o['icon'] ?? 'faq');
    $inner = '<span class="jt9-help-ic jt9-hi-' . jt9_help_e($icon) . '">' . jt9_help_glyph($icon, $icon === 'whatsapp' ? 22 : 20) . '</span>'
        . '<span>' . jt9_help_e($o['label'] ?? '') . '<small>' . jt9_help_e($o['note'] ?? '') . '</small></span>';
    if (!empty($o['href'])) {
        $tab = !empty($o['new_tab']) ? ' target="_blank" rel="noopener"' : '';
        return '<a class="jt9-help-opt" href="' . jt9_help_e($o['href']) . '"' . $tab . '>' . $inner . '</a>';
    }
    if (!empty($o['chat'])) {
        return '<button type="button" class="jt9-help-opt" data-jt9-chat>' . $inner . '</button>';
    }
    if (!empty($o['install'])) {
        return '<button type="button" class="jt9-help-opt" data-install hidden>' . $inner . '</button>';
    }
    return '<span class="jt9-help-opt is-soon" aria-disabled="true">' . $inner . '</span>';
}

/** The chat screen inside the menu. Keys: endpoint, welcome, suggestions (list of questions), notice. */
function jt9_help_chat(array $bot): string
{
    $chips = '';
    foreach ($bot['suggestions'] ?? [] as $q) {
        $chips .= '<button type="button" class="jt9-chat-chip">' . jt9_help_e($q) . '</button>';
    }
    return '<div class="jt9-chat" id="jt9-chat" data-endpoint="' . jt9_help_e($bot['endpoint'] ?? '') . '" data-welcome="' . jt9_help_e($bot['welcome'] ?? 'Hi! What would you like to know?') . '" hidden>
      <button type="button" class="jt9-chat-back">← Back to menu</button>
      <div class="jt9-chat-log" id="jt9-chat-log" role="log" aria-live="polite" aria-label="Chat messages"></div>
      <div class="jt9-chat-chips" id="jt9-chat-chips">' . $chips . '</div>
      <form class="jt9-chat-form" id="jt9-chat-form">
        <input type="text" id="jt9-chat-input" maxlength="500" autocomplete="off" placeholder="Type your question…" aria-label="Type your question">
        <button type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </form>
      <p class="jt9-chat-note">' . jt9_help_e($bot['notice'] ?? 'Automated assistant. Please don’t share private details.') . '</p>
    </div>';
}

/**
 * The floating help button and its menu.
 * Keys: title, status, greeting, intro, options (rows for jt9_help_option), credit (optional), bot (optional, see jt9_help_chat).
 */
function jt9_help_widget(array $o): string
{
    $title = jt9_help_e($o['title'] ?? 'Help');
    $options = array_filter($o['options'] ?? [], fn ($row) => empty($row['chat']) || !empty($o['bot']));
    $rows = implode("\n      ", array_map('jt9_help_option', $options));
    $credit = $o['credit'] ?? 'Assistant by Jay Tech 9';
    return '<div class="jt9-help" id="jt9-help">
  <p class="jt9-help-hello" id="jt9-help-hello" hidden>' . jt9_help_e($o['greeting'] ?? 'Hi, how can we help?') . ' <span aria-hidden="true">👋</span><button type="button" class="jt9-help-hello-x" aria-label="Hide message">×</button></p>
  <div class="jt9-help-panel" id="jt9-help-panel" role="dialog" aria-label="' . $title . '" hidden>
    <div class="jt9-help-head">' . jt9_help_icon(42) . '<div><strong>' . $title . '</strong><small>' . jt9_help_e($o['status'] ?? '') . '</small></div></div>
    <div class="jt9-help-body">
      <p>' . jt9_help_e($o['intro'] ?? '') . '</p>
      ' . $rows . '
    </div>
    ' . (!empty($o['bot']) ? jt9_help_chat($o['bot']) : '') . '
    ' . ($credit !== '' ? '<p class="jt9-help-foot">' . jt9_help_e($credit) . '</p>' : '') . '
  </div>
  <button class="jt9-help-btn" id="jt9-help-btn" type="button" aria-expanded="false" aria-controls="jt9-help-panel" aria-label="Open help menu">
    <span class="jt9-help-ping" aria-hidden="true"></span>
    <span class="jt9-help-mark">' . jt9_help_icon(72) . '</span>
    <span class="jt9-help-x" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></span>
  </button>
</div>
';
}
