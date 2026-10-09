
import './Pagination.css';

function Pagination({
  currentPage = 1,
  totalPages = 0,
  onPageChange,
  className = '',
  dir,
  'aria-label': ariaLabel = 'Pagination',
  previousLabel = 'Previous page',
  nextLabel = 'Next page',
  getPageLabel = (page) => `Page ${page}`,
  getMobileLabel = (page, total) => `Page ${page} of ${total}`,
}) {
  if (!Number.isSafeInteger(totalPages) || totalPages <= 1) {
    return null;
  }

  const activePage = Number.isSafeInteger(currentPage)
    ? Math.min(totalPages, Math.max(1, currentPage))
    : 1;

  const visibleCount = Math.min(3, totalPages);

  // Keep the current page centered whenever possible.
  const startPage = Math.max(
    1,
    Math.min(
      activePage - 1,
      totalPages - visibleCount + 1
    )
  );

  const pages = Array.from(
    { length: visibleCount },
    (_, index) => startPage + index
  );

  const canGoPrevious = activePage > 1;
  const canGoNext = activePage < totalPages;

  const changePage = (page) => {
    if (
      Number.isSafeInteger(page) &&
      page >= 1 &&
      page <= totalPages &&
      page !== activePage &&
      typeof onPageChange === 'function'
    ) {
      onPageChange(page);
    }
  };

  return (
    <nav
      className={[
        'pg-pagination',
        className,
      ].filter(Boolean).join(' ')}
      dir={dir}
      aria-label={ariaLabel}
    >
      <div className="pg-pagination__controls">
        <button
          type="button"
          className="pg-pagination__button pg-pagination__arrow"
          aria-label={previousLabel}
          disabled={!canGoPrevious}
          onClick={() => changePage(activePage - 1)}
        >
          <svg
            className="pg-pagination__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <div className="pg-pagination__pages">
          {pages.map((page) => {
            const isCurrent = page === activePage;

            return (
              <button
                key={page}
                type="button"
                className={[
                  'pg-pagination__button',
                  'pg-pagination__page',
                  isCurrent && 'pg-pagination__page--active',
                ].filter(Boolean).join(' ')}
                aria-label={getPageLabel(page)}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={() => changePage(page)}
              >
                {page}
              </button>
            );
          })}
        </div>

        <span
          className="pg-pagination__mobile"
          role="status"
          aria-atomic="true"
        >
          <bdi
            className="pg-pagination__counter"
            dir="ltr"
            aria-hidden="true"
          >
            {activePage} / {totalPages}
          </bdi>

          {/* Announce translated text instead of the visual fraction. */}
          <span className="pg-pagination__sr-only">
            {getMobileLabel(activePage, totalPages)}
          </span>
        </span>

        <button
          type="button"
          className="pg-pagination__button pg-pagination__arrow"
          aria-label={nextLabel}
          disabled={!canGoNext}
          onClick={() => changePage(activePage + 1)}
        >
          <svg
            className="pg-pagination__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
