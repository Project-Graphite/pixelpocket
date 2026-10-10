import PixelFace from './PixelFace'
import './Lcd.css'

function Lcd() {
  return (
    <div className="lcd" aria-hidden="true">
      <div className="lcd__screen">
        <span className="lcd__title">PixelPocket</span>
        <PixelFace />
      </div>
    </div>
  )
}

export default Lcd
