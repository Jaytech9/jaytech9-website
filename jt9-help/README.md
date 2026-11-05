# Jay Tech 9 help widget

The signature icon (the J mark wearing a headset in a chat bubble), the floating help menu and the chat bot.
Everything is in this folder and it needs no database or Composer, so it can be copied into any PHP project.

| File | What it does |
| --- | --- |
| `help-widget.php` | The icon and the menu HTML |
| `help-widget.css` | Look and animation |
| `help-widget.js` | Opens and closes the menu, shows the greeting, runs the chat screen |
| `help-bot.php` | The bot's brain: finds answers, calls Claude, limits use |

## Use it in another project

1. Copy the `jt9-help` folder into the project, for example to `modules/jt9-help`.
2. Load the PHP file before the page uses it, and add the CSS in the `<head>`:

```php
<?php require_once __DIR__ . '/modules/jt9-help/help-widget.php'; ?>
<link rel="stylesheet" href="modules/jt9-help/help-widget.css">
```

3. Add this before `</body>`:

```php
<?= jt9_help_widget([
    'title'    => 'Acme Help',
    'status'   => 'Fast, Reliable Support',
    'greeting' => 'Hi, how can we help?',
    'intro'    => 'Choose how you’d like to reach us.',
    'options'  => [
        ['icon' => 'whatsapp', 'label' => 'Chat on WhatsApp', 'note' => 'Talk to us now', 'href' => 'https://wa.me/233000000000', 'new_tab' => true],
        ['icon' => 'phone', 'label' => 'Call us', 'note' => '+233 00 000 0000', 'href' => 'tel:+233000000000'],
        ['icon' => 'mail', 'label' => 'Send an enquiry', 'note' => 'We’ll reply soon', 'href' => 'contact.php'],
        ['icon' => 'bot', 'label' => 'Ask our assistant', 'note' => 'Coming soon'],
    ],
]) ?>
<script src="modules/jt9-help/help-widget.js" defer></script>
```

## Options

Each row takes `icon` (`whatsapp`, `phone`, `mail`, `faq`, `app`, `bot`), `label` and `note`, plus one of:

- `href`: a link. Add `'new_tab' => true` to open it in a new tab.
- `'chat' => true`: opens the chat bot (see below).
- `'install' => true`: the "install our app" button. This needs the host site's own install script, which handles `[data-install]` buttons.
- Neither: a greyed-out "coming soon" row.

`credit` changes the line at the bottom of the menu (default "Assistant by Jay Tech 9"). Set it to `''` to hide it.

To show just the icon anywhere on a page: `<?= jt9_help_icon(64) ?>`. The page still needs the CSS.

## In the SAHE site

SAHE's wording and options are in `site_help_config()` in `includes/site.php`. Keep project-specific text there, not in this folder.

## The chat bot

The bot answers from a list of questions and answers. It works with no API key and costs nothing. Add a Claude API key and Claude writes the answers from the same list. If Claude fails, or reaches the daily limit, the bot goes back to the list by itself.

To add it to another project:

1. Make a small endpoint file, for example `help-chat.php`:

```php
<?php
require __DIR__ . '/modules/jt9-help/help-bot.php';
jt9_bot_handle([
    'name'        => 'Acme Ltd',
    'faq'         => [['What do you do?', 'We build websites.'], ['How much does it cost?', 'Prices start at ...']],
    'handoff'     => [['label' => 'Send an enquiry', 'href' => 'contact.php']],
    'storage_dir' => __DIR__ . '/logs',   // must be writable and not open to the web
    'api_key'     => '',                  // optional: Claude API key. Keep it out of Git.
]);
```

2. Add the row and the chat screen to the `jt9_help_widget()` call:

```php
'options' => [['icon' => 'bot', 'label' => 'Ask our assistant', 'note' => 'Instant answers', 'chat' => true]],
'bot'     => ['endpoint' => 'help-chat.php', 'welcome' => 'Hi! What would you like to know?', 'suggestions' => ['How much does it cost?']],
```

Other endpoint settings: `model` (default `claude-opus-5-5`), `daily_limit` (Claude requests per day, default 300) and `visitor_limit` (messages per visitor in 10 minutes, default 20).

With an API key set, visitors' messages are sent to Anthropic to be answered, so mention this in the site's privacy policy. The bot doesn't save conversations on the server. They stay in the visitor's browser tab.

In SAHE, the key goes in `config/config.php` (see `help_bot` in `config.sample.php`), the bot's knowledge is built in `help-chat.php` from the FAQ, services and contact settings, and its first message and suggested questions are under Developer → Website text.
