import { Link } from "react-router-dom";
import Seo from "../components/Seo";

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" description="The page you were looking for doesn't exist." path="/404" noIndex />
      <section className="container-x py-28 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-4xl font-bold text-ink">This page didn't make the trip.</h1>
        <p className="lead mx-auto mt-4 max-w-md">The link may be old or mistyped. Head back home or explore our services.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn-primary">
            Go home
          </Link>
          <Link to="/services" className="btn-secondary">
            Services
          </Link>
        </div>
      </section>
    </>
  );
}
