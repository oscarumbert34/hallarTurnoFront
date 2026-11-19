export const customerAuthStyles = `
  :host {
    display: block;
  }

  .auth-shell {
    display: grid;
    min-height: calc(100dvh - 180px);
    padding: 24px 16px;
    place-items: center;
  }

  .auth-card {
    width: min(100%, 420px);
  }

  form {
    display: grid;
    gap: 16px;
    padding-top: 16px;
  }

  .form-error {
    margin: 0;
    color: var(--mat-sys-error);
  }

  .submit-button {
    --mat-button-filled-container-color: #0866f5;
    --mat-button-filled-label-text-color: white;
  }
`;
