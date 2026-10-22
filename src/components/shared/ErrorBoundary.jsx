import React from "react";
import { RotateCcw } from "lucide-react";

// Keeps one crashing screen from blanking the whole app. The error and component stack go to
// the console so the cause can be found; the student gets a calm way to try again.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error(`${this.props.name || "Screen"} crashed:`, error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { t, onClose } = this.props;
    return (
      <section className="error-boundary-card" role="alert">
        <h2>{t("eb_title")}</h2>
        <p>{t("eb_copy")}</p>
        <div>
          <button type="button" className="primary-btn" onClick={() => this.setState({ failed: false })}><RotateCcw size={17} /> {t("tryAgain")}</button>
          {onClose && <button type="button" className="secondary-btn" onClick={onClose}>{t("home")}</button>}
        </div>
      </section>
    );
  }
}
