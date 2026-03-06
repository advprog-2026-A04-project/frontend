// Wallet feature pages
// Person in charge: Badi
// Backend repo: Wallet

function MarkTopUpSuccess() {
  return (
    <div>
      <h1>Mark top-up request as successful</h1>
      <form>
        <label htmlFor="request-id">Top-up request id:</label>
        <input type='number' id='request-id' required /><br />
        <input type='submit' />
      </form>
    </div>
  )
}

function MarkTopUpFailed() {
  return (
    <div>
      <h1>Mark top-up request as failed</h1>
      <form>
        <label htmlFor="request-id">Top-up request id:</label>
        <input type='number' id='request-id' required /><br />
        <input type='submit' />
      </form>
    </div>
  )
}

function WalletPage() {
  return (
      <nav>
        <MarkTopUpSuccess />
        <MarkTopUpFailed />
      </nav>
  );
}

export default WalletPage;
