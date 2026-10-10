import { Link } from 'react-router-dom'
import { coverUrl } from '../services/api'
import { CartridgeArt } from './Icons'
import DeleteGameButton from './DeleteGameButton'
import Sticker from './Sticker'
import './GameCard.css'

// Games from the last week get a New sticker
const NEW_SINCE = Date.now() - 7 * 24 * 60 * 60 * 1000

function GameCard({ game, onDeleted, index = 0 }) {
  const cover = coverUrl(game)
  const isNew = Date.parse(game.createdAt) > NEW_SINCE

  return (
    <article className="game-card">
      <div className="game-card__hang">
        <span className="game-card__tab" aria-hidden="true" />
        <Link to={`/games/${game.id}`} className="game-card__link">
          <span className="game-card__art-wrap">
            <span className={`game-card__art${cover ? '' : ' game-card__art--blank'}`}>
              {cover ? (
                <img src={cover} alt="" loading="lazy" decoding="async" />
              ) : (
                <CartridgeArt />
              )}
            </span>
            {game.battery && (
              <Sticker
                kind="tag"
                tilt={-4}
                slap
                delay={index * 60 + 90}
                className="game-card__saves"
              >
                Saves progress
              </Sticker>
            )}
          </span>
          <span className="game-card__title">{game.title}</span>
          {isNew && (
            <Sticker kind="round" tilt={-12} slap delay={index * 60} className="game-card__new">
              New
            </Sticker>
          )}
        </Link>
      </div>
      {game.canManage && (
        <div className="game-card__actions">
          <Link
            to={`/games/${game.id}/edit`}
            className="link-btn"
            aria-label={`Edit ${game.title}`}
          >
            Edit
          </Link>
          <DeleteGameButton game={game} onDeleted={onDeleted} compact />
        </div>
      )}
    </article>
  )
}

export default GameCard
