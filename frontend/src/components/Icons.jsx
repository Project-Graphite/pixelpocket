// Phosphor icons under the names the app uses. Size, weight and aria-hidden come from the
// IconContext in main.jsx; every button that shows one has its own label.
export {
  ArrowCounterClockwise as RestartIcon,
  CornersIn as ShrinkIcon,
  CornersOut as ExpandIcon,
  GameController as TouchIcon,
  List as MenuIcon,
  MagnifyingGlass as SearchIcon,
  Moon as MoonIcon,
  Pause as PauseIcon,
  Play as PlayIcon,
  SpeakerHigh as VolumeIcon,
  SpeakerSlash as MuteIcon,
  Sun as SunIcon,
  UploadSimple as UploadIcon,
  X as CloseIcon,
} from '@phosphor-icons/react'

// A blank game box, shown where a game has no cover image
export const CartridgeArt = () => (
  <svg viewBox="0 0 40 46" aria-hidden="true" focusable="false" className="cartridge-art">
    <path
      d="M4 2h26l6 6v34a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <rect
      x="9"
      y="10"
      width="22"
      height="18"
      rx="1.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    <path d="M10 38h3M15 38h3M20 38h3M25 38h3" stroke="currentColor" strokeWidth="2.5" />
  </svg>
)
