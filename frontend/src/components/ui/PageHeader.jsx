export default function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        {eyebrow ? <p className="page-head__eyebrow">{eyebrow}</p> : null}
        <h1 className="page-head__title">{title}</h1>
        {description ? <p className="page-head__desc">{description}</p> : null}
        {children}
      </div>
      {actions ? <div className="page-head__actions">{actions}</div> : null}
    </header>
  )
}
