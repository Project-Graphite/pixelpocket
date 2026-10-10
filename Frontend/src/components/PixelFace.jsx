import './Lcd.css'

// The face from the logo, animated in Lcd.css
function PixelFace({ className = '' }) {
  return (
    <svg
      className={`face ${className}`}
      viewBox="0 0 8 6"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <g className="face__eyes">
        <rect className="face__eye face__eye--left" x="1" y="0" width="1" height="2" />
        <rect className="face__eye face__eye--right" x="6" y="0" width="1" height="2" />
      </g>
      <g className="face__mouth">
        <rect x="1" y="4" width="1" height="1" />
        <rect x="6" y="4" width="1" height="1" />
        <rect x="2" y="5" width="4" height="1" />
      </g>
    </svg>
  )
}

export default PixelFace
