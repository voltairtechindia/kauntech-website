/**
 * Route-level loading UI for the AR editor. Shown while the card + gallery load
 * after the user taps "Set up AR" / "Edit", so the heavy 3D editor doesn't open
 * on a blank screen.
 */
export default function ArEditorLoading() {
  return (
    <div className="ar-editor-loading" aria-busy="true" aria-label="Opening the AR studio">
      <div className="ar-spinner" />
      <p className="ar-muted">Opening the AR studio…</p>
    </div>
  );
}
