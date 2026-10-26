import { useEffect, useRef, useState } from 'react';
import { faPaperclip, faPaperPlane, faFaceSmile } from '@fortawesome/free-solid-svg-icons';

import AttachmentCard from '../AttachmentCard/AttachmentCard.jsx';
import Button from '../Button/Button.jsx';
import { useLanguage } from '../../../context/LanguageContext.jsx';

import './MessageInput.css';

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB per file.
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|pdf|docx?)$/i;
const FILE_ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx';

function MessageInput({ onSend, disabled = false, className = '', enableEmoji = false }) {
  const { dir, t } = useLanguage();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const fileInputRef = useRef(null);
  const textAreaRef = useRef(null);
  const nextFileIdRef = useRef(1);
  const sendingRef = useRef(false);

  const canSend = Boolean(text.trim()) || attachments.length > 0;
  const isDisabled = disabled || sending;

  // Keep a short input for one line, growing up to 144px for long messages.
  useEffect(() => {
    const field = textAreaRef.current;
    if (!field) return;

    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 144)}px`;
  }, [text]);

  function handleFileSelection(event) {
    const selectedFiles = Array.from(event.target.files || []);
    // Allow choosing the same file again after removing it.
    event.target.value = '';
    if (isDisabled || selectedFiles.length === 0) return;

    const availableSlots = MAX_ATTACHMENTS - attachments.length;
    const accepted = [];
    const problems = new Set();

    for (const file of selectedFiles) {
      if (!ALLOWED_EXTENSIONS.test(file.name)) {
        problems.add(t('messageInput.invalidType'));
      } else if (file.size > MAX_FILE_SIZE) {
        problems.add(t('messageInput.tooLarge'));
      } else if (accepted.length >= availableSlots) {
        problems.add(t('messageInput.tooMany'));
      } else {
        accepted.push({
          id: `local-attachment-${nextFileIdRef.current++}`,
          name: file.name,
          size: file.size,
          type: file.type,
          sourceFile: file,
        });
      }
    }

    if (accepted.length > 0) {
      setAttachments((current) => [...current, ...accepted]);
    }
    setError([...problems].join(' '));
  }

  function removeAttachment(attachment) {
    if (isDisabled) return;
    setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isDisabled || sendingRef.current || !canSend || typeof onSend !== 'function') {
      return;
    }

    const payload = { text: text.trim(), attachments: [...attachments], clientId: crypto.randomUUID() };
    sendingRef.current = true;
    setSending(true);
    setError('');

    try {
      const result = await onSend(payload);
      if (result === false) {
        setError(t('messageInput.sendFailed'));
      } else {
        setText('');
        setAttachments([]);
        setEmojiOpen(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch {
      setError(t('messageInput.sendFailed'));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') setEmojiOpen(false);
    if (event.key !== 'Enter' || event.shiftKey) return;
    // Do not submit while composing Arabic text with an IME.
    if (event.nativeEvent?.isComposing || event.keyCode === 229) return;
    event.preventDefault();
    if (canSend && !isDisabled) event.currentTarget.form?.requestSubmit();
  }

  const classes = ['pg-message-input', className].filter(Boolean).join(' ');

  return (
    <form className={classes} dir={dir} onSubmit={handleSubmit}>
      {enableEmoji && emojiOpen && <div className="pg-message-input__emoji-picker" role="group" aria-label={t('messaging.emoji')}>
        {['😊', '👋', '👍', '🙏', '💪', '❤️'].map(emoji => <button type="button" key={emoji} disabled={isDisabled} onClick={() => {
          const field = textAreaRef.current;
          const start = field?.selectionStart ?? text.length;
          const end = field?.selectionEnd ?? start;
          setText(previous => previous.slice(0, start) + emoji + previous.slice(end));
          setEmojiOpen(false);
          requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + emoji.length, start + emoji.length); });
        }}>{emoji}</button>)}
      </div>}
      {attachments.length > 0 && (
        <div className="pg-message-input__previews">
          <div className="pg-message-input__previews-heading">
            <span>{t('messageInput.selectedAttachments')}</span>
            <span aria-label={t('messageInput.attachmentCount', { count: attachments.length })}>
              {attachments.length}/{MAX_ATTACHMENTS}
            </span>
          </div>
          <ul className="pg-message-input__attachment-list" role="list">
            {attachments.map((attachment) => (
              <li className="pg-message-input__attachment" key={attachment.id}>
                <AttachmentCard
                  variant="preview"
                  file={attachment}
                  onRemove={removeAttachment}
                  disabled={isDisabled}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pg-message-input__controls">
        <label className="pg-message-input__field">
          <span className="pg-message-input__sr-only">{t('messageInput.label')}</span>
          <textarea
            ref={textAreaRef}
            className="pg-message-input__textarea"
            rows={1}
            maxLength={10000}
            dir="auto"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('messageInput.placeholder')}
            disabled={isDisabled}
          />
        </label>

        <input
          ref={fileInputRef}
          className="pg-message-input__file-input"
          type="file"
          accept={FILE_ACCEPT}
          multiple
          tabIndex={-1}
          aria-hidden="true"
          onChange={handleFileSelection}
          disabled={isDisabled || attachments.length >= MAX_ATTACHMENTS}
        />

        <Button
          variant="ghost"
          icon={faPaperclip}
          iconOnly
          className="pg-message-input__attach-button"
          aria-label={attachments.length >= MAX_ATTACHMENTS
            ? t('messageInput.limitReached')
            : t('messageInput.attach')}
          title={attachments.length >= MAX_ATTACHMENTS
            ? t('messageInput.limitReached')
            : t('messageInput.attach')}
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled || attachments.length >= MAX_ATTACHMENTS}
        />

        {enableEmoji && <Button variant="ghost" icon={faFaceSmile} iconOnly className="pg-message-input__emoji-button"
          aria-label={t('messaging.emoji')} aria-expanded={emojiOpen} disabled={isDisabled} onClick={() => setEmojiOpen(value => !value)} />}
        <Button
          type="submit"
          variant="primary"
          icon={faPaperPlane}
          iconOnly
          loading={sending}
          className="pg-message-input__send-button"
          aria-label={sending ? t('messageInput.sending') : t('messageInput.send')}
          title={sending ? t('messageInput.sending') : t('messageInput.send')}
          disabled={isDisabled || !canSend || typeof onSend !== 'function'}
        />
      </div>

      {error && <p className="pg-message-input__error" role="alert">{error}</p>}
    </form>
  );
}

export default MessageInput;
