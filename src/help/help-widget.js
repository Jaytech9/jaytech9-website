/* Jay Tech 9 help widget: opens and closes the menu, shows the greeting once per visit, and runs the chat bot screen. */
import { answer, saveUnanswered } from './bot';

(function () {
  'use strict';
  var helpBtn = document.getElementById('jt9-help-btn');
  if (helpBtn) {
    var helpPanel = document.getElementById('jt9-help-panel'), hello = document.getElementById('jt9-help-hello');
    var seen = false;
    try { seen = sessionStorage.getItem('jt9_help_seen') === '1'; } catch (e) {}
    var hideHello = function () { if (hello) { hello.hidden = true; } try { sessionStorage.setItem('jt9_help_seen', '1'); } catch (e) {} };
    // Greeting: once per visit, after 20 seconds, and it tucks itself away after 12 seconds.
    if (hello && !seen) {
      setTimeout(function () {
        if (!helpPanel.hidden) { return; }
        hello.hidden = false;
        try { sessionStorage.setItem('jt9_help_seen', '1'); } catch (e) {}
        setTimeout(function () {
          if (hello.hidden) { return; }
          hello.classList.add('is-leaving');
          setTimeout(function () { hello.hidden = true; hello.classList.remove('is-leaving'); }, 320);
        }, 12000);
      }, 20000);
    }
    if (hello) { hello.querySelector('.jt9-help-hello-x').addEventListener('click', hideHello); }
    var chatOpen = false, chatInput = null;
    var setOpen = function (open) {
      helpPanel.hidden = !open;
      helpBtn.setAttribute('aria-expanded', String(open));
      helpBtn.setAttribute('aria-label', open ? 'Close help menu' : 'Open help menu');
      if (open) { hideHello(); var first = chatOpen ? chatInput : helpPanel.querySelector('a.jt9-help-opt'); if (first) { first.focus({ preventScroll: true }); } }
    };
    helpBtn.addEventListener('click', function () { setOpen(helpPanel.hidden); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !helpPanel.hidden) { setOpen(false); helpBtn.focus(); } });
    document.addEventListener('click', function (e) { if (!helpPanel.hidden && !e.target.closest('#jt9-help')) { setOpen(false); } });

    // Chat bot screen
    var chat = document.getElementById('jt9-chat');
    if (chat) {
      var menu = helpPanel.querySelector('.jt9-help-body'), log = document.getElementById('jt9-chat-log');
      var chips = document.getElementById('jt9-chat-chips'), form = document.getElementById('jt9-chat-form');
      var sendBtn = form.querySelector('button');
      var turns = [], busy = false;
      chatInput = document.getElementById('jt9-chat-input');
      try { turns = JSON.parse(sessionStorage.getItem('jt9_chat_turns')) || []; } catch (e) { turns = []; }

      var bubble = function (text, who) {
        var p = document.createElement('p');
        p.className = 'jt9-chat-msg jt9-chat-' + who;
        p.textContent = text;
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
        return p;
      };
      var links = function (actions) {
        if (!actions || !actions.length) { return; }
        var box = document.createElement('div');
        box.className = 'jt9-chat-acts';
        actions.forEach(function (a) {
          var link = document.createElement('a');
          link.href = a.href;
          link.textContent = a.label;
          if (a.new_tab) { link.target = '_blank'; link.rel = 'noopener'; }
          box.appendChild(link);
        });
        log.appendChild(box);
        log.scrollTop = log.scrollHeight;
      };
      var remember = function (role, content) {
        turns.push({ role: role, content: content });
        turns = turns.slice(-20);
        try { sessionStorage.setItem('jt9_chat_turns', JSON.stringify(turns)); } catch (e) {}
      };
      var ask = function (text) {
        if (busy) { return; }
        busy = true;
        sendBtn.disabled = true;
        chips.hidden = true;
        bubble(text, 'me');
        remember('user', text);
        var typing = document.createElement('div');
        typing.className = 'jt9-chat-msg jt9-chat-bot jt9-chat-typing';
        typing.setAttribute('aria-label', 'Assistant is typing');
        typing.innerHTML = '<i></i><i></i><i></i>';
        log.appendChild(typing);
        log.scrollTop = log.scrollHeight;
        // A short pause so the typing dots read as a reply, not a glitch.
        setTimeout(function () {
          var data = answer(text);
          if (data.unknown) { saveUnanswered(text); }
          typing.remove();
          bubble(data.reply, 'bot');
          links(data.actions);
          remember('assistant', data.reply);
          busy = false;
          sendBtn.disabled = false;
          chatInput.focus({ preventScroll: true });
        }, 500);
      };
      var showChat = function (on) {
        chatOpen = on;
        chat.hidden = !on;
        menu.hidden = on;
        if (on) { log.scrollTop = log.scrollHeight; chatInput.focus({ preventScroll: true }); }
      };

      bubble(chat.getAttribute('data-welcome'), 'bot');
      turns.forEach(function (t) { bubble(t.content, t.role === 'user' ? 'me' : 'bot'); });
      if (turns.length) { chips.hidden = true; }
      helpPanel.querySelectorAll('[data-jt9-chat]').forEach(function (b) { b.addEventListener('click', function () { showChat(true); }); });
      chat.querySelector('.jt9-chat-back').addEventListener('click', function () { showChat(false); });
      chips.addEventListener('click', function (e) { var c = e.target.closest('.jt9-chat-chip'); if (c) { ask(c.textContent.trim()); } });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = chatInput.value.trim();
        if (text && !busy) { chatInput.value = ''; ask(text); }
      });
    }
  }
})();
