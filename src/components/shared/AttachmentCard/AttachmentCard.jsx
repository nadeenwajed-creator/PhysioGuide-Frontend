import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFile,
  faFileImage,
  faFilePdf,
  faFileWord,
  faXmark,
  faArrowUpRightFromSquare,
  faDownload,
  faBan,
} from '@fortawesome/free-solid-svg-icons';

import Button from '../Button/Button.jsx';
import { useLanguage } from '../../../context/LanguageContext.jsx';

import './AttachmentCard.css';

// Identify the file type for display, not upload validation.
function getFileType(file) {
  const name = typeof file?.name === 'string'
    ? file.name
    : '';

  const extension = name.includes('.')
    ? name.split('.').pop().toLowerCase()
    : typeof file?.extension === 'string'
      ? file.extension.replace(/^\./, '').toLowerCase()
      : '';

  if (extension === 'jpg' || extension === 'jpeg') {
    return 'jpg';
  }

  if (['png', 'pdf', 'doc', 'docx'].includes(extension)) {
    return extension;
  }

  const mimeType = typeof file?.type === 'string'
    ? file.type.toLowerCase()
    : '';

  const mimeTypes = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };

  return mimeTypes[mimeType] || 'unknown';
}

// Convert a byte count into a readable size.
function formatFileSize(size, language) {
  if (!Number.isFinite(size) || size < 0) {
    return '';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const formattedValue = new Intl.NumberFormat(language, {
    maximumFractionDigits: unitIndex === 0 ? 0 : 1,
  }).format(value);

  return `${formattedValue} ${units[unitIndex]}`;
}

function AttachmentCard({
  file,
  variant = 'preview',
  onRemove,
  onOpen,
  onDownload,
  disabled = false,
  className = '',
}) {
  const { language, t } = useLanguage();

  const isSent = variant === 'sent';
  const fileType = getFileType(file);

  const fileName = typeof file?.name === 'string' && file.name.trim()
    ? file.name.trim()
    : t('attachmentCard.file');

  const fileSize = formatFileSize(file?.size, language);

  const isImage = fileType === 'jpg' || fileType === 'png';
  const isPdf = fileType === 'pdf';
  const isWord = fileType === 'doc' || fileType === 'docx';

  let fileIcon = faFile;

  if (isImage) {
    fileIcon = faFileImage;
  } else if (isPdf) {
    fileIcon = faFilePdf;
  } else if (isWord) {
    fileIcon = faFileWord;
  }

  let actionIcon = faXmark;
  let actionLabel = t('attachmentCard.remove');
  let actionCallback = onRemove;

  if (isSent) {
    if (isImage || isPdf) {
      actionIcon = faArrowUpRightFromSquare;
      actionLabel = t('attachmentCard.open');
      actionCallback = onOpen;
    } else if (isWord) {
      actionIcon = faDownload;
      actionLabel = t('attachmentCard.download');
      actionCallback = onDownload;
    } else {
      actionIcon = faBan;
      actionLabel = t('attachmentCard.unavailable');
      actionCallback = undefined;
    }
  }

  const actionDisabled = disabled || typeof actionCallback !== 'function';

  const accessibleActionLabel = actionDisabled && isSent
    ? `${t('attachmentCard.unavailable')}: ${fileName}`
    : `${actionLabel}: ${fileName}`;

  function handleAction() {
    if (!actionDisabled) {
      actionCallback(file);
    }
  }

  const cardClasses = [
    'pg-attachment-card',
    isSent
      ? 'pg-attachment-card--sent'
      : 'pg-attachment-card--preview',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={cardClasses}>
      <span className="pg-attachment-card__icon" aria-hidden="true">
        <FontAwesomeIcon icon={fileIcon} />
      </span>

      <div className="pg-attachment-card__details">
        <bdi
          className="pg-attachment-card__name"
          dir="auto"
          title={fileName}
        >
          {fileName}
        </bdi>

        <div className="pg-attachment-card__meta">
          <bdi className="pg-attachment-card__type" dir="ltr">
            {fileType === 'unknown'
              ? t('attachmentCard.file')
              : fileType.toUpperCase()}
          </bdi>

          {fileSize && (
            <>
              <span aria-hidden="true">·</span>
              <bdi className="pg-attachment-card__size" dir="auto">
                {fileSize}
              </bdi>
            </>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        icon={actionIcon}
        iconOnly
        className="pg-attachment-card__action"
        aria-label={accessibleActionLabel}
        title={accessibleActionLabel}
        onClick={handleAction}
        disabled={actionDisabled}
      />
    </div>
  );
}

export default AttachmentCard;