import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="workspace-empty-page">
      <div className="card-surface max-w-md p-8 text-center">
        <p className="eyebrow mb-4">DecisionTwin</p>
        <h1 className="workspace-title mb-4">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">{t("notFound.title")}</p>
        <a href="/dashboard" className="focus-ring text-sm font-medium text-brand-deep underline underline-offset-4 hover:text-ink">
          {t("notFound.actions.backHome")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
