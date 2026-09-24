import { useSearchParams, useNavigate } from 'react-router';

export const RUN_PARAM = 'run-details-modal';
export const BACK_BUTTON_PARAM = 'back-button';

/**
 * Hook for managing run details modal state via URL query parameters.
 * Provides deep linking, browser navigation support, and consistent modal behavior.
 *
 * @example
 * ```tsx
 * const { runId, isOpen, openRunDetails, closeRunDetails } = useRunDetailsModal();
 *
 * // Open modal
 * openRunDetails('run-123');
 *
 * // Render modal
 * <RunDetailsModal runId={runId} opened={isOpen} onClose={closeRunDetails} />
 * ```
 */
export function useRunDetailsModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get current run ID from URL
  const runId = searchParams.get(RUN_PARAM);
  const isOpen = !!runId;
  const showBackButton = searchParams.get(BACK_BUTTON_PARAM) === 'true';

  /**
   * Open run details modal for the specified run ID.
   * Adds ?run=<id> to URL, enabling deep linking and browser navigation.
   */
  const openRunDetails = (id: string) => {
    setSearchParams({ [RUN_PARAM]: id });
  };

  /**
   * Close the run details modal.
   * Removes the run query parameter from URL.
   */
  const closeRunDetails = () => {
    setSearchParams({});
  };

  /**
   * Navigate back using browser history.
   * Used when the back button is shown.
   */
  const goBack = () => {
    navigate(-1);
  };

  return {
    /** Current run ID from URL (null if modal closed) */
    runId,
    /** Whether the modal is open */
    isOpen,
    /** Whether to show the back button */
    showBackButton,
    /** Open modal with specified run ID */
    openRunDetails,
    /** Close the modal */
    closeRunDetails,
    /** Navigate back in history */
    goBack,
  };
}
