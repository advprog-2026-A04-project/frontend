import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="page">
      <div className="empty-state">
        <h1>That page does not exist.</h1>
        <p>Stay inside the milestone demo flow and return to the home page.</p>
        <Link className="button" to="/">
          Back home
        </Link>
      </div>
    </section>
  );
}
