export default function RouteInfo({ pickup, destination, note }) {
  return (
    <div className="route-info">
      <span className="route-info__line" aria-hidden="true">
        <span className="route-info__dot" />
        <span className="route-info__bar" />
        <span className="route-info__dot route-info__dot--end" />
      </span>
      <div className="route-info__places">
        <div className="route-info__place">
          <span className="route-info__caption">Jemput</span>
          <p className="route-info__name">{pickup}</p>
        </div>
        <div className="route-info__place">
          <span className="route-info__caption">Tujuan</span>
          <p className="route-info__name">{destination}</p>
        </div>
      </div>
      {note ? <p className="route-info__note">{note}</p> : null}
    </div>
  )
}
