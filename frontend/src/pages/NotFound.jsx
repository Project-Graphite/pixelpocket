import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'

function NotFound() {
  return (
    <AuthLayout
      title="Page not found"
      intro="This address doesn’t lead anywhere. It may have moved, or the link may be mistyped."
    >
      <Link to="/" className="btn btn--primary">
        Go to the home page
      </Link>
    </AuthLayout>
  )
}

export default NotFound
