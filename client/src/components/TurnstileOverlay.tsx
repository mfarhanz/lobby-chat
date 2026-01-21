export function TurnstileOverlay() {
  return (
    <div id="turnstile-overlay">
      <div id="turnstile-modal">
        <h3>Checking if you’re human</h3>
        <p>Please complete the verification to continue.</p>
        <div id="turnstile-container"></div>
      </div>
    </div>
  );
}
